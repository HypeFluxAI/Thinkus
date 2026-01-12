---
id: code-gen-api-route
version: 1.0.0
model: claude-opus
temperature: 0.2
max_tokens: 6000
---

# API代码生成器

## 任务
根据API规格生成tRPC路由代码。

## 技术栈

```yaml
框架: tRPC v10
验证: Zod
数据库: MongoDB + Mongoose
认证: NextAuth.js
```

## 标准路由模板

```typescript
// lib/trpc/routers/{module}.ts

import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, publicProcedure, protectedProcedure } from "../trpc"
import { {Model} } from "@/lib/db/models/{model}"

// ============================================================
// 输入验证Schema
// ============================================================

const create{Model}Input = z.object({
  // 字段定义
})

const update{Model}Input = create{Model}Input.partial()

// ============================================================
// 路由定义
// ============================================================

export const {module}Router = router({
  
  // 列表查询
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { page, limit, search } = input
      const skip = (page - 1) * limit
      
      // 构建查询条件
      const query: any = { userId: ctx.user.id }
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          // 其他搜索字段
        ]
      }
      
      const [items, total] = await Promise.all([
        {Model}.find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        {Model}.countDocuments(query)
      ])
      
      return { items, total, page, limit }
    }),

  // 单个查询
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const item = await {Model}.findOne({
        _id: input.id,
        userId: ctx.user.id
      }).lean()
      
      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "{Model} not found"
        })
      }
      
      return { item }
    }),

  // 创建
  create: protectedProcedure
    .input(create{Model}Input)
    .mutation(async ({ input, ctx }) => {
      const item = await {Model}.create({
        ...input,
        userId: ctx.user.id
      })
      
      return { item: item.toObject() }
    }),

  // 更新
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: update{Model}Input
    }))
    .mutation(async ({ input, ctx }) => {
      const item = await {Model}.findOneAndUpdate(
        { _id: input.id, userId: ctx.user.id },
        { $set: input.data },
        { new: true }
      ).lean()
      
      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "{Model} not found"
        })
      }
      
      return { item }
    }),

  // 删除
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await {Model}.deleteOne({
        _id: input.id,
        userId: ctx.user.id
      })
      
      if (result.deletedCount === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "{Model} not found"
        })
      }
      
      return { success: true }
    }),
})
```

## Zod类型映射

```yaml
string: z.string()
number: z.number()
boolean: z.boolean()
email: z.string().email()
url: z.string().url()
date: z.date() 或 z.string().datetime()
enum: z.enum(['a', 'b', 'c'])
array: z.array(z.string())
object: z.object({...})
optional: .optional()
nullable: .nullable()
default: .default(value)
min/max: .min(n).max(n)
```

## 错误处理

```typescript
// 标准错误码
throw new TRPCError({
  code: "NOT_FOUND",      // 404
  // code: "UNAUTHORIZED",   // 401
  // code: "FORBIDDEN",      // 403
  // code: "BAD_REQUEST",    // 400
  // code: "CONFLICT",       // 409
  // code: "INTERNAL_SERVER_ERROR", // 500
  message: "描述信息"
})
```

## 认证过程

```typescript
// lib/trpc/trpc.ts

import { initTRPC, TRPCError } from "@trpc/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

// 需要登录的procedure
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})
```

## 文件上传处理

```typescript
// 文件上传API（单独处理，不走tRPC）
// app/api/upload/route.ts

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  
  // 上传到R2/S3
  const key = `uploads/${Date.now()}-${file.name}`
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: Buffer.from(await file.arrayBuffer()),
    ContentType: file.type,
  }))
  
  return Response.json({ url: `${process.env.CDN_URL}/${key}` })
}
```

## 验证清单

```yaml
必须:
  - [ ] 所有输入都有Zod验证
  - [ ] 保护路由检查userId
  - [ ] 正确的错误码
  - [ ] 返回格式一致

禁止:
  - [ ] 暴露敏感信息
  - [ ] 未验证的输入
  - [ ] 硬编码的值
```
