FROM node:20-alpine

# 安装必要工具
RUN apk add --no-cache git bash curl

# 安装 Claude Code CLI (全局)
RUN npm install -g @anthropic-ai/claude-code

# 设置工作目录
WORKDIR /workspace

# 环境变量占位 (运行时注入 ANTHROPIC_API_KEY)
ENV ANTHROPIC_API_KEY=""

# 默认命令
CMD ["sh"]
