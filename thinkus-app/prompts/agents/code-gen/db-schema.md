---
id: code-gen-db-schema
version: 1.0.0
model: claude-opus
temperature: 0.1
max_tokens: 4000
---

# 数据库Schema生成器

## 任务
根据数据模型生成MongoDB Schema。

## 技术栈

```yaml
数据库: MongoDB
ODM: Mongoose
验证: Mongoose内置 + Zod
```

## Schema模板

```typescript
// lib/db/models/{model}.ts

import mongoose, { Schema, Document, Model } from 'mongoose'

// ============================================================
// 类型定义
// ============================================================

export interface I{Model} {
  _id: string
  // 业务字段...
  createdAt: Date
  updatedAt: Date
}

export interface I{Model}Document extends I{Model}, Document {}

// ============================================================
// Schema定义
// ============================================================

const {model}Schema = new Schema<I{Model}Document>(
  {
    // 业务字段
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    
    // 关联字段
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // 枚举字段
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    
    // 嵌套对象
    profile: {
      avatar: String,
      bio: { type: String, maxlength: 500 },
    },
    
    // 数组字段
    tags: [{
      type: String,
      trim: true,
    }],
  },
  {
    timestamps: true, // 自动添加 createdAt, updatedAt
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

// ============================================================
// 索引
// ============================================================

{model}Schema.index({ userId: 1, createdAt: -1 })
{model}Schema.index({ name: 'text' }) // 全文搜索

// ============================================================
// 中间件
// ============================================================

// 保存前处理
{model}Schema.pre('save', async function(next) {
  // 自定义逻辑
  next()
})

// ============================================================
// 静态方法
// ============================================================

{model}Schema.statics.findByUserId = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 })
}

// ============================================================
// 实例方法
// ============================================================

{model}Schema.methods.isOwnedBy = function(userId: string): boolean {
  return this.userId.toString() === userId
}

// ============================================================
// 导出
// ============================================================

export const {Model}: Model<I{Model}Document> = 
  mongoose.models.{Model} || mongoose.model<I{Model}Document>('{Model}', {model}Schema)
```

## 字段类型映射

```yaml
TypeScript → Mongoose:
  string: String
  number: Number
  boolean: Boolean
  Date: Date
  string[]: [String]
  ObjectId: Schema.Types.ObjectId
  enum: String + enum选项
  object: 嵌套Schema或Mixed
```

## 常用验证

```typescript
// 必填
required: [true, 'Field is required']

// 字符串
minlength: [2, 'Min 2 characters']
maxlength: [100, 'Max 100 characters']
trim: true
lowercase: true
uppercase: true
match: [/regex/, 'Invalid format']

// 数字
min: [0, 'Min is 0']
max: [100, 'Max is 100']

// 枚举
enum: ['a', 'b', 'c']

// 唯一
unique: true

// 默认值
default: 'value'
default: () => new Date()
```

## 索引策略

```typescript
// 单字段索引
schema.index({ field: 1 })  // 升序
schema.index({ field: -1 }) // 降序

// 复合索引
schema.index({ userId: 1, createdAt: -1 })

// 唯一索引
schema.index({ email: 1 }, { unique: true })

// 全文索引
schema.index({ name: 'text', description: 'text' })

// 稀疏索引（允许null）
schema.index({ field: 1 }, { sparse: true })

// TTL索引（自动过期）
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

## 数据库连接

```typescript
// lib/db/connect.ts

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
```

## 验证清单

```yaml
必须:
  - [ ] 每个模型都有timestamps
  - [ ] 关联字段有索引
  - [ ] 必填字段有required
  - [ ] 字符串有maxlength

建议:
  - [ ] 添加适当的索引
  - [ ] 使用虚拟字段减少冗余
  - [ ] 敏感字段不返回（select: false）
```
