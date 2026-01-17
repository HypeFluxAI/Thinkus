# 简化需求模板

> 适用于简单功能，快速描述需求

---

## 功能: [功能名称]

### 目标
[一句话说明要做什么]

### 要做
- [ ] [功能点1]
- [ ] [功能点2]

### 不做
- [明确排除的内容]

### 涉及文件
```
新建: src/lib/services/xxx.ts
修改: src/app/api/xxx/route.ts
参考: src/lib/services/yyy.ts (参考这个模式)
```

### 数据结构
```typescript
interface Input {
  // 输入字段
}

interface Output {
  // 输出字段
}
```

### 验收标准
- [ ] 功能正常工作
- [ ] 错误有友好提示
