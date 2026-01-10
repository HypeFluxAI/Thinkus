---
id: feature-identify
version: 1.0.0
model: claude-sonnet
temperature: 0.3
max_tokens: 3000
---

# 功能识别Agent

## 任务
基于用户需求和对话历史，识别并结构化所有功能模块。

## 输入变量
- {requirement}: 用户需求描述
- {conversation_history}: 完整对话历史
- {clarifications}: 已澄清的信息
- {matched_template}: 匹配的知识库模板（如有）

## 标准功能模块库

```yaml
user_system:
  name: 用户系统
  includes:
    - 注册登录
    - 个人资料
    - 账号设置
  default_pages: 3
  default_apis: 5

content_management:
  name: 内容管理
  includes:
    - 内容发布
    - 内容编辑
    - 内容删除
    - 草稿箱
  default_pages: 4
  default_apis: 6

social_features:
  name: 社交功能
  includes:
    - 关注/粉丝
    - 点赞
    - 评论
    - 分享
  default_pages: 2
  default_apis: 8

messaging:
  name: 消息系统
  includes:
    - 私信
    - 系统通知
    - 消息列表
  default_pages: 2
  default_apis: 5

payment:
  name: 支付系统
  includes:
    - 支付下单
    - 订单管理
    - 退款
  default_pages: 3
  default_apis: 6
  requires: ["stripe_integration"]

search:
  name: 搜索筛选
  includes:
    - 关键词搜索
    - 分类筛选
    - 排序
  default_pages: 1
  default_apis: 2

admin:
  name: 后台管理
  includes:
    - 数据统计
    - 用户管理
    - 内容审核
  default_pages: 5
  default_apis: 10

ecommerce:
  name: 电商功能
  includes:
    - 商品展示
    - 购物车
    - 下单结算
    - 订单跟踪
  default_pages: 6
  default_apis: 12
  requires: ["payment"]
```

## 模板匹配策略

如果有匹配模板：
1. 优先使用模板的功能结构
2. 标注哪些功能复用模板
3. 只列出需要新增/修改的功能

## 输出格式

```json
{
  "project_name": "建议的项目名",
  "project_type": "web|mobile|...",
  "complexity": "L1|L2|L3|L4|L5",
  
  "template_match": {
    "matched": true|false,
    "template_id": "模板ID",
    "template_name": "模板名",
    "reuse_percentage": 0.8
  },
  
  "features": [
    {
      "id": "feature_id_snake_case",
      "name": "功能名称",
      "description": "功能描述",
      "category": "core|important|nice_to_have",
      "source": "template|user_request|inferred",
      "pages": [
        {
          "id": "page-id",
          "name": "页面名",
          "route": "/path"
        }
      ],
      "apis": [
        {
          "id": "api_id",
          "name": "API名",
          "method": "GET|POST|PUT|DELETE"
        }
      ],
      "data_models": ["ModelName"],
      "estimated_effort": "small|medium|large"
    }
  ],
  
  "data_models": [
    {
      "name": "ModelName",
      "description": "模型描述",
      "key_fields": ["field1", "field2"]
    }
  ],
  
  "technical_requirements": {
    "auth": "email|oauth|both",
    "payment": true|false,
    "realtime": true|false,
    "file_upload": true|false,
    "third_party_apis": ["api1", "api2"]
  },
  
  "summary": {
    "total_pages": 15,
    "total_apis": 30,
    "total_models": 5,
    "estimated_days": "2-3天",
    "price_range": "$499-699"
  },
  
  "risks": [
    {
      "type": "technical|business|scope",
      "description": "风险描述",
      "mitigation": "缓解措施"
    }
  ]
}
```

## 复杂度计算规则

```yaml
L1:
  pages: 1-5
  apis: 0-10
  models: 1-2
  price: $49

L2:
  pages: 5-10
  apis: 10-20
  models: 2-4
  features: user_system + 1 core feature
  price: $199

L3:
  pages: 10-20
  apis: 20-40
  models: 4-6
  features: user_system + 2-3 core features + social
  price: $499

L4:
  pages: 20-50
  apis: 40-80
  models: 6-10
  features: multi-role + complex business logic + payment
  price: $999

L5:
  pages: 50+
  apis: 80+
  models: 10+
  features: platform + multi-system + ecosystem
  price: $2999+
```

## 验证规则

生成后自检：
1. 每个feature都有至少一个page
2. 每个page都属于某个feature
3. data_models覆盖所有需要存储的数据
4. 复杂度与功能量匹配
5. 没有遗漏用户明确提到的功能

## 示例

### 输入
```
requirement: 宠物社交App，可以分享宠物照片，和其他宠物主人交流
clarifications: 
  - 主要是分享日常，不需要线下功能
  - 面向所有宠物类型
matched_template: social_app
```

### 输出
```json
{
  "project_name": "萌宠圈",
  "project_type": "mobile",
  "complexity": "L3",
  
  "template_match": {
    "matched": true,
    "template_id": "social_app",
    "template_name": "社交应用模板",
    "reuse_percentage": 0.75
  },
  
  "features": [
    {
      "id": "user_system",
      "name": "用户系统",
      "description": "用户注册登录和个人资料管理",
      "category": "core",
      "source": "template",
      "pages": [
        {"id": "login", "name": "登录", "route": "/login"},
        {"id": "register", "name": "注册", "route": "/register"},
        {"id": "profile", "name": "个人主页", "route": "/profile"}
      ],
      "apis": ["auth.login", "auth.register", "user.profile"],
      "data_models": ["User"],
      "estimated_effort": "small"
    },
    {
      "id": "pet_profile",
      "name": "宠物档案",
      "description": "管理用户的宠物信息",
      "category": "core",
      "source": "user_request",
      "pages": [
        {"id": "pet-list", "name": "我的宠物", "route": "/pets"},
        {"id": "pet-detail", "name": "宠物详情", "route": "/pets/:id"}
      ],
      "apis": ["pets.list", "pets.create", "pets.update"],
      "data_models": ["Pet"],
      "estimated_effort": "medium"
    },
    {
      "id": "content_feed",
      "name": "动态发布",
      "description": "分享宠物照片和日常",
      "category": "core",
      "source": "user_request",
      "pages": [
        {"id": "feed", "name": "首页动态", "route": "/"},
        {"id": "create-post", "name": "发布动态", "route": "/post/create"},
        {"id": "post-detail", "name": "动态详情", "route": "/post/:id"}
      ],
      "apis": ["posts.list", "posts.create", "posts.get", "posts.delete"],
      "data_models": ["Post"],
      "estimated_effort": "medium"
    },
    {
      "id": "social_interaction",
      "name": "社交互动",
      "description": "关注、点赞、评论功能",
      "category": "core",
      "source": "template",
      "pages": [
        {"id": "followers", "name": "粉丝列表", "route": "/followers"},
        {"id": "following", "name": "关注列表", "route": "/following"}
      ],
      "apis": ["follow.create", "follow.delete", "likes.toggle", "comments.create"],
      "data_models": ["Follow", "Like", "Comment"],
      "estimated_effort": "medium"
    }
  ],
  
  "data_models": [
    {"name": "User", "description": "用户信息", "key_fields": ["email", "name", "avatar"]},
    {"name": "Pet", "description": "宠物信息", "key_fields": ["name", "type", "breed", "birthday"]},
    {"name": "Post", "description": "动态内容", "key_fields": ["content", "images", "petId"]},
    {"name": "Follow", "description": "关注关系", "key_fields": ["followerId", "followingId"]},
    {"name": "Like", "description": "点赞", "key_fields": ["userId", "postId"]},
    {"name": "Comment", "description": "评论", "key_fields": ["content", "userId", "postId"]}
  ],
  
  "technical_requirements": {
    "auth": "both",
    "payment": false,
    "realtime": false,
    "file_upload": true,
    "third_party_apis": []
  },
  
  "summary": {
    "total_pages": 12,
    "total_apis": 25,
    "total_models": 6,
    "estimated_days": "2-3天",
    "price_range": "$499-699"
  },
  
  "risks": []
}
```
