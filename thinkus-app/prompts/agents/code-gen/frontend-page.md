---
id: code-gen-frontend-page
version: 1.0.0
model: claude-opus
temperature: 0.2
max_tokens: 8000
---

# 前端页面代码生成器

## 任务
根据页面规格生成完整的React页面代码。

## 技术栈约束

```yaml
框架: Next.js 14 (App Router)
语言: TypeScript (strict mode)
样式: Tailwind CSS
组件库: shadcn/ui
数据获取: TanStack Query + tRPC
表单: react-hook-form + zod
图标: lucide-react
```

## 基础页面模板

```tsx
// app/{route}/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function PageName() {
  // 状态
  const [state, setState] = useState(initialValue)

  // 数据获取
  const { data, isLoading, error } = api.module.action.useQuery({})

  // 加载状态
  if (isLoading) {
    return <LoadingSkeleton />
  }

  // 错误状态
  if (error) {
    return <ErrorState error={error} />
  }

  // 渲染
  return (
    <div className="container py-8">
      {/* 内容 */}
    </div>
  )
}
```

## 表单模板

```tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const formSchema = z.object({
  name: z.string().min(2, "名称至少2个字符"),
  email: z.string().email("请输入有效邮箱"),
})

type FormValues = z.infer<typeof formSchema>

export default function FormPage() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "" },
  })

  const onSubmit = async (values: FormValues) => {
    // 提交逻辑
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>名称</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          提交
        </Button>
      </form>
    </Form>
  )
}
```

## 列表页模板

```tsx
"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Plus } from "lucide-react"

export default function ListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  
  const { data, isLoading } = api.items.list.useQuery({ page, search })

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">列表</h1>
        <Button><Plus className="w-4 h-4 mr-2" />新建</Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
        <Input className="pl-10" placeholder="搜索..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-32 animate-pulse bg-muted" />
          ))
        ) : (
          data?.items.map((item) => (
            <Card key={item.id} className="p-4">{/* 内容 */}</Card>
          ))
        )}
      </div>
    </div>
  )
}
```

## 组件映射

```yaml
PageHeader: "@/components/page-header"
Card: "@/components/ui/card"
Button: "@/components/ui/button"
Input: "@/components/ui/input"
Select: "@/components/ui/select"
Dialog: "@/components/ui/dialog"
Table: "@/components/ui/table"
Avatar: "@/components/ui/avatar"
Badge: "@/components/ui/badge"
Skeleton: "@/components/ui/skeleton"
```

## Tailwind样式规则

```yaml
容器: "container py-8"
间距: "space-y-6" 或 "gap-6"
网格: "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
居中: "flex items-center justify-center"
两端对齐: "flex items-center justify-between"
标题: "text-2xl font-bold"
辅助文字: "text-sm text-muted-foreground"
```

## 验证清单

```yaml
必须:
  - [ ] 所有导入存在
  - [ ] TypeScript类型正确
  - [ ] 有loading状态
  - [ ] 有error状态
  - [ ] 响应式布局

禁止:
  - [ ] 硬编码颜色
  - [ ] 内联style
  - [ ] any类型
  - [ ] 未处理的Promise
```
