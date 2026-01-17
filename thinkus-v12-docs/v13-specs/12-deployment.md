# Thinkus v13 - 部署与运维

> Docker + Kubernetes + Vercel混合部署方案

---

## 基本信息

| 字段 | 值 |
|------|-----|
| 功能名称 | 部署与运维 |
| 优先级 | P1 |
| 预估复杂度 | 复杂 |
| 关联模块 | 全平台 |

---

## 1. 部署架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                              Cloudflare CDN                                  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          Vercel (前端)                               │   │
│  │                     Next.js + tRPC + WebSocket                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    │ gRPC / HTTP                            │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Kubernetes Cluster (后端)                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  Go编排层    │  │  Python AI层 │  │  Worker节点  │              │   │
│  │  │  (3 pods)    │  │  (5 pods)    │  │  (auto-scale)│              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          数据层                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  PostgreSQL  │  │    Redis     │  │   Pinecone   │              │   │
│  │  │  (主数据库)  │  │  (缓存/队列) │  │  (向量存储)  │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 服务分布

```yaml
前端 (Vercel):
  - Next.js应用
  - Edge Functions
  - WebSocket (通过Vercel Functions)

后端 (Kubernetes):
  - Go编排服务
  - Python AI服务
  - Worker服务 (任务执行)

数据层 (托管服务):
  - PostgreSQL: Supabase / Neon
  - Redis: Upstash / Redis Cloud
  - 向量库: Pinecone
  - 文件存储: Cloudflare R2

外部服务:
  - Anthropic API (Claude)
  - Google AI (Gemini)
  - E2B (沙盒环境)
```

---

## 2. Docker配置

### 2.1 Go编排层

```dockerfile
# services/go-orchestrator/Dockerfile
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /orchestrator ./cmd/main.go

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /orchestrator .
COPY config/ ./config/

EXPOSE 8080 50051

CMD ["./orchestrator"]
```

### 2.2 Python AI层

```dockerfile
# services/py-ai-engine/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 安装Python依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000 50052

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2.3 Docker Compose (开发环境)

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Node.js前端层 (开发时用npm run dev)
  frontend:
    build: ./thinkus-app
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8080
    volumes:
      - ./thinkus-app:/app
      - /app/node_modules
    depends_on:
      - orchestrator
      - redis

  # Go编排层
  orchestrator:
    build: ./services/go-orchestrator
    ports:
      - "8080:8080"   # HTTP
      - "50051:50051" # gRPC
    environment:
      - DB_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - AI_SERVICE_URL=ai-engine:50052
    depends_on:
      - postgres
      - redis
      - ai-engine

  # Python AI执行层
  ai-engine:
    build: ./services/py-ai-engine
    ports:
      - "8000:8000"   # HTTP
      - "50052:50052" # gRPC
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - PINECONE_API_KEY=${PINECONE_API_KEY}
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./services/py-ai-engine:/app

  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=thinkus
      - POSTGRES_PASSWORD=thinkus_dev
      - POSTGRES_DB=thinkus
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 3. Kubernetes配置

### 3.1 Go编排层部署

```yaml
# k8s/go-orchestrator/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-orchestrator
  namespace: thinkus
spec:
  replicas: 3
  selector:
    matchLabels:
      app: go-orchestrator
  template:
    metadata:
      labels:
        app: go-orchestrator
    spec:
      containers:
      - name: orchestrator
        image: thinkus/go-orchestrator:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 50051
          name: grpc
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
        env:
        - name: DB_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: go-orchestrator
  namespace: thinkus
spec:
  selector:
    app: go-orchestrator
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  - name: grpc
    port: 50051
    targetPort: 50051
```

### 3.2 Python AI层部署

```yaml
# k8s/py-ai-engine/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: py-ai-engine
  namespace: thinkus
spec:
  replicas: 5
  selector:
    matchLabels:
      app: py-ai-engine
  template:
    metadata:
      labels:
        app: py-ai-engine
    spec:
      containers:
      - name: ai-engine
        image: thinkus/py-ai-engine:latest
        ports:
        - containerPort: 8000
          name: http
        - containerPort: 50052
          name: grpc
        resources:
          requests:
            cpu: "1000m"
            memory: "2Gi"
          limits:
            cpu: "4000m"
            memory: "8Gi"
        env:
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-credentials
              key: anthropic-key
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-credentials
              key: openai-key
        - name: PINECONE_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-credentials
              key: pinecone-key
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: py-ai-engine-hpa
  namespace: thinkus
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: py-ai-engine
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### 3.3 Ingress配置

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: thinkus-ingress
  namespace: thinkus
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  tls:
  - hosts:
    - api.thinkus.ai
    secretName: thinkus-tls
  rules:
  - host: api.thinkus.ai
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: go-orchestrator
            port:
              number: 8080
```

---

## 4. CI/CD配置

### 4.1 GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'

    - name: Install dependencies
      run: cd thinkus-app && npm ci

    - name: Run tests
      run: cd thinkus-app && npm test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Login to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Build and push Go Orchestrator
      uses: docker/build-push-action@v5
      with:
        context: ./services/go-orchestrator
        push: true
        tags: thinkus/go-orchestrator:${{ github.sha }},thinkus/go-orchestrator:latest

    - name: Build and push Python AI Engine
      uses: docker/build-push-action@v5
      with:
        context: ./services/py-ai-engine
        push: true
        tags: thinkus/py-ai-engine:${{ github.sha }},thinkus/py-ai-engine:latest

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'

  deploy-backend:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/go-orchestrator \
          orchestrator=thinkus/go-orchestrator:${{ github.sha }} \
          -n thinkus
        kubectl set image deployment/py-ai-engine \
          ai-engine=thinkus/py-ai-engine:${{ github.sha }} \
          -n thinkus
        kubectl rollout status deployment/go-orchestrator -n thinkus
        kubectl rollout status deployment/py-ai-engine -n thinkus
```

---

## 5. 监控和日志

### 5.1 监控配置

```yaml
监控栈:
  指标收集: Prometheus
  可视化: Grafana
  告警: AlertManager

核心指标:
  - 请求延迟 (p50, p95, p99)
  - 错误率
  - CPU/内存使用率
  - API调用量
  - AI Token消耗

告警规则:
  - 错误率 > 1%: Warning
  - 错误率 > 5%: Critical
  - 延迟 p99 > 5s: Warning
  - Pod重启: Warning
```

### 5.2 日志配置

```yaml
日志栈:
  收集: Fluentd / Vector
  存储: Elasticsearch / Loki
  查询: Kibana / Grafana

日志格式:
  - timestamp
  - level
  - service
  - trace_id
  - user_id
  - message
  - extra

保留策略:
  - 生产日志: 30天
  - 错误日志: 90天
  - 审计日志: 1年
```

### 5.3 错误追踪

```typescript
// Sentry配置
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // 过滤敏感信息
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
    }
    return event;
  },
});
```

---

## 6. 环境变量

### 6.1 生产环境

```bash
# 数据库
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# AI服务
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX=thinkus-memories

# 认证
NEXTAUTH_URL=https://thinkus.ai
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_ID=...
GITHUB_SECRET=...

# 支付
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# 存储
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=thinkus-prod

# 监控
SENTRY_DSN=...
```

---

## 7. 备份和恢复

### 7.1 备份策略

```yaml
数据库备份:
  频率: 每日全量 + 每小时增量
  保留: 全量30天, 增量7天
  存储: S3/R2

Redis备份:
  频率: 每6小时RDB快照
  保留: 7天

向量库:
  类型: Pinecone托管
  备份: 自动

文件存储:
  类型: R2跨区域复制
```

### 7.2 恢复流程

```bash
# 数据库恢复
pg_restore -d thinkus backup_20260117.dump

# Redis恢复
redis-cli --rdb backup.rdb

# 验证
./scripts/verify-restore.sh
```

---

## 涉及文件

```yaml
新建:
  - docker-compose.yml
  - services/go-orchestrator/Dockerfile
  - services/py-ai-engine/Dockerfile
  - k8s/go-orchestrator/deployment.yaml
  - k8s/py-ai-engine/deployment.yaml
  - k8s/ingress.yaml
  - k8s/secrets.yaml
  - .github/workflows/deploy.yml
  - scripts/backup.sh
  - scripts/restore.sh

配置文件:
  - vercel.json
  - prometheus.yml
  - alertmanager.yml
```

---

## 验收标准

- [ ] Docker镜像构建成功
- [ ] Kubernetes部署正常
- [ ] CI/CD流水线通过
- [ ] 监控告警正常
- [ ] 备份恢复测试通过
- [ ] 负载测试通过

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-01-17 | v1.0 | 从完整规格文档拆分 | Claude Code |
