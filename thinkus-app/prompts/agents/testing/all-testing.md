---
id: testing-test-gen
version: 1.0.0
model: claude-sonnet
temperature: 0.2
max_tokens: 4000
---

# 测试用例生成器

## 任务
为API和页面生成测试用例。

## 输入变量
- {api_code}: API代码
- {page_code}: 页面代码
- {data_models}: 数据模型

## API测试模板

```typescript
import { describe, it, expect, beforeEach } from "vitest"
import { createTestContext } from "@/test/utils"

describe("{module} API", () => {
  let ctx: TestContext
  
  beforeEach(async () => {
    ctx = await createTestContext()
  })

  describe("{action}", () => {
    // 正常情况
    it("should {expected_behavior}", async () => {
      // Arrange
      const input = { ... }
      
      // Act
      const result = await caller.{module}.{action}(input)
      
      // Assert
      expect(result).toMatchObject({ ... })
    })

    // 认证失败
    it("should require authentication", async () => {
      await expect(
        unauthenticatedCaller.{module}.{action}({})
      ).rejects.toThrow("UNAUTHORIZED")
    })

    // 无效输入
    it("should reject invalid input", async () => {
      await expect(
        caller.{module}.{action}({ invalid: true })
      ).rejects.toThrow()
    })

    // 资源不存在
    it("should return NOT_FOUND for missing resource", async () => {
      await expect(
        caller.{module}.{action}({ id: "nonexistent" })
      ).rejects.toThrow("NOT_FOUND")
    })
  })
})
```

## 测试覆盖要求

```yaml
每个API必须测试:
  - 正常情况 (happy path)
  - 认证失败 (401)
  - 权限不足 (403，如果有)
  - 无效输入 (400)
  - 资源不存在 (404)
  - 并发情况 (如果相关)
```

## 页面测试模板

```typescript
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { {Page} } from "@/app/{route}/page"

describe("{Page}", () => {
  // 加载状态
  it("should render loading state", () => {
    render(<{Page} />)
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  // 数据加载后
  it("should render data", async () => {
    render(<{Page} />)
    await waitFor(() => {
      expect(screen.getByText(/expected/i)).toBeInTheDocument()
    })
  })

  // 用户交互
  it("should handle user action", async () => {
    const user = userEvent.setup()
    render(<{Page} />)
    
    await user.click(screen.getByRole("button", { name: /submit/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/success/i)).toBeInTheDocument()
    })
  })

  // 错误状态
  it("should handle error", async () => {
    // mock API error
    render(<{Page} />)
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
```

---
id: testing-bug-fix
version: 1.0.0
model: claude-opus
temperature: 0.2
max_tokens: 4000
---

# Bug分析修复Agent

## 任务
分析错误日志，定位问题，生成修复代码。

## 输入变量
- {error_log}: 错误日志
- {related_code}: 相关代码
- {context}: 项目上下文

## 分析步骤

1. **解析错误**
   - 错误类型
   - 错误消息
   - 堆栈位置

2. **定位原因**
   - 找到出错代码
   - 分析根因
   - 确认影响范围

3. **生成修复**
   - 最小改动原则
   - 添加防御代码
   - 考虑副作用

## 输出格式

```json
{
  "error_analysis": {
    "type": "TypeError",
    "message": "Cannot read property 'x' of undefined",
    "location": {
      "file": "app/pets/page.tsx",
      "line": 42
    },
    "root_cause": "数据未加载完成就访问了属性",
    "severity": "medium"
  },
  "fix": {
    "file": "app/pets/page.tsx",
    "changes": [
      {
        "line": 42,
        "old": "const name = data.pet.name",
        "new": "const name = data?.pet?.name ?? ''"
      }
    ],
    "explanation": "添加可选链和默认值防止undefined访问"
  },
  "prevention": {
    "recommendation": "建议添加loading状态检查",
    "code_suggestion": "if (isLoading) return <Loading />"
  },
  "test": {
    "description": "应添加测试覆盖此边界情况",
    "test_case": "it('should handle undefined data', ...)"
  }
}
```

## 常见错误模式

```yaml
TypeError - undefined:
  原因: 数据未加载就访问
  修复: 可选链 (?.) 或 loading检查

Module not found:
  原因: 导入路径错误
  修复: 检查路径和模块名

Type mismatch:
  原因: TypeScript类型不匹配
  修复: 修正类型定义

Unhandled Promise:
  原因: 缺少try-catch
  修复: 添加错误处理

Hydration mismatch:
  原因: 服务端客户端渲染不一致
  修复: 使用useEffect或dynamic import
```

## 修复原则

1. **最小改动** - 只改必要的
2. **不引入新问题** - 检查副作用
3. **添加防御** - 预防类似问题
4. **记录原因** - 注释说明
