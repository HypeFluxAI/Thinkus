/**
 * UI Tester Service
 * 使用 Claude Vision 像人一样测试 UI
 * - 验证 UI 是否符合需求
 * - 评估界面美观度
 * - 发现交互错误
 * - 生成测试报告
 */

import Anthropic from '@anthropic-ai/sdk'
import * as sandbox from '@/lib/grpc/sandbox'

const anthropic = new Anthropic()

// ============ 类型定义 ============

export interface UITestCase {
  id: string
  name: string
  description: string  // 功能描述
  uiDescription: string  // UI 应该是什么样子
  route: string  // 页面路径
  interactions?: UIInteraction[]  // 需要执行的交互
}

export interface UIInteraction {
  action: 'click' | 'type' | 'hover' | 'scroll' | 'wait'
  selector?: string  // CSS 选择器或文本
  value?: string  // 输入的值
  description: string  // 这个操作应该发生什么
}

export interface UITestResult {
  testId: string
  testName: string
  passed: boolean
  screenshotPath?: string
  issues: UIIssue[]
  score: {
    requirementMatch: number  // 0-100 需求匹配度
    aesthetics: number  // 0-100 美观度
    usability: number  // 0-100 可用性
    overall: number  // 0-100 综合评分
  }
  suggestions: string[]
  errorLogs: string[]
}

export interface UIIssue {
  type: 'requirement_mismatch' | 'design_issue' | 'interaction_error' | 'accessibility' | 'performance'
  severity: 'critical' | 'major' | 'minor' | 'suggestion'
  description: string
  location?: string  // 问题位置描述
  expected?: string  // 期望的行为/外观
  actual?: string  // 实际的行为/外观
  suggestion?: string  // 修复建议
}

// ============ UI 测试服务 ============

class UITesterService {

  /**
   * 生成 Playwright 测试脚本 - 带截图和交互
   */
  generateTestScript(testCases: UITestCase[]): string {
    return `
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = '__screenshots__';

// 确保截图目录存在
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// 收集控制台错误
async function collectErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
  });
  return errors;
}

// 截图并保存
async function takeScreenshot(page: Page, name: string): Promise<string> {
  const screenshotPath = path.join(SCREENSHOT_DIR, \`\${name}.png\`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

${testCases.map(tc => this.generateSingleTest(tc)).join('\n\n')}
`
  }

  /**
   * 生成单个测试用例
   */
  private generateSingleTest(testCase: UITestCase): string {
    const interactions = testCase.interactions || []

    return `
test('${testCase.name}', async ({ page }) => {
  const errors = await collectErrors(page);

  // 1. 访问页面
  await page.goto('${testCase.route}');
  await page.waitForLoadState('networkidle');

  // 2. 初始截图
  const initialScreenshot = await takeScreenshot(page, '${testCase.id}-initial');

  // 3. 执行交互操作
  ${interactions.map((interaction, i) => this.generateInteraction(interaction, testCase.id, i)).join('\n  ')}

  // 4. 最终截图
  const finalScreenshot = await takeScreenshot(page, '${testCase.id}-final');

  // 5. 保存测试元数据
  const metadata = {
    testId: '${testCase.id}',
    testName: '${testCase.name}',
    description: \`${testCase.description}\`,
    uiDescription: \`${testCase.uiDescription}\`,
    route: '${testCase.route}',
    screenshots: [initialScreenshot, finalScreenshot],
    errors: errors,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, '${testCase.id}-metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  // 基本断言：页面应该没有严重错误
  const criticalErrors = errors.filter(e =>
    e.includes('TypeError') ||
    e.includes('ReferenceError') ||
    e.includes('Uncaught')
  );

  if (criticalErrors.length > 0) {
    console.error('Critical errors found:', criticalErrors);
  }
});
`
  }

  /**
   * 生成交互代码
   */
  private generateInteraction(interaction: UIInteraction, testId: string, index: number): string {
    switch (interaction.action) {
      case 'click':
        return `
  // 交互 ${index + 1}: ${interaction.description}
  try {
    await page.click('${interaction.selector}');
    await page.waitForTimeout(500);
    await takeScreenshot(page, '${testId}-interaction-${index}');
  } catch (e) {
    errors.push(\`点击失败 [${interaction.selector}]: \${e.message}\`);
    await takeScreenshot(page, '${testId}-error-${index}');
  }
`
      case 'type':
        return `
  // 交互 ${index + 1}: ${interaction.description}
  try {
    await page.fill('${interaction.selector}', '${interaction.value || ''}');
    await takeScreenshot(page, '${testId}-interaction-${index}');
  } catch (e) {
    errors.push(\`输入失败 [${interaction.selector}]: \${e.message}\`);
  }
`
      case 'hover':
        return `
  // 交互 ${index + 1}: ${interaction.description}
  await page.hover('${interaction.selector}');
  await page.waitForTimeout(300);
  await takeScreenshot(page, '${testId}-interaction-${index}');
`
      case 'scroll':
        return `
  // 交互 ${index + 1}: ${interaction.description}
  await page.evaluate(() => window.scrollBy(0, ${interaction.value || 500}));
  await page.waitForTimeout(300);
  await takeScreenshot(page, '${testId}-interaction-${index}');
`
      case 'wait':
        return `
  // 交互 ${index + 1}: ${interaction.description}
  await page.waitForTimeout(${interaction.value || 1000});
`
      default:
        return ''
    }
  }

  /**
   * 使用 Claude Vision 分析截图
   */
  async analyzeScreenshot(
    screenshotBase64: string,
    testCase: UITestCase,
    errorLogs: string[]
  ): Promise<UITestResult> {

    const prompt = `你是一个专业的 UI/UX 测试专家。请分析这个应用截图，像人类测试员一样评估。

## 功能需求
${testCase.description}

## UI 设计要求
${testCase.uiDescription}

## 控制台错误日志
${errorLogs.length > 0 ? errorLogs.join('\n') : '无错误'}

## 请评估以下方面：

### 1. 需求匹配度 (0-100分)
- UI 是否实现了描述的功能？
- 界面元素是否齐全？
- 流程是否正确？

### 2. 美观度 (0-100分)
- 布局是否合理、对齐？
- 颜色搭配是否协调？
- 间距和留白是否舒适？
- 字体大小和层次是否清晰？
- 整体视觉是否专业？

### 3. 可用性 (0-100分)
- 按钮和链接是否容易识别？
- 表单是否清晰易填？
- 导航是否直观？
- 信息是否易于理解？

### 4. 发现的问题
请列出所有发现的问题，包括：
- 与需求不符的地方
- 设计问题（丑陋、不协调、不专业）
- 可能的交互问题
- 可访问性问题

请以 JSON 格式返回结果：

\`\`\`json
{
  "scores": {
    "requirementMatch": 85,
    "aesthetics": 70,
    "usability": 80,
    "overall": 78
  },
  "issues": [
    {
      "type": "requirement_mismatch | design_issue | interaction_error | accessibility",
      "severity": "critical | major | minor | suggestion",
      "description": "问题描述",
      "location": "问题位置，如：顶部导航栏",
      "expected": "期望的效果",
      "actual": "实际的效果",
      "suggestion": "修复建议"
    }
  ],
  "suggestions": [
    "整体改进建议1",
    "整体改进建议2"
  ],
  "summary": "一句话总结测试结果"
}
\`\`\`
`

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: screenshotBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      })

      // 解析响应
      const content = response.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected response type')
      }

      // 提取 JSON
      const jsonMatch = content.text.match(/```json\n?([\s\S]*?)\n?```/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const result = JSON.parse(jsonMatch[1])

      return {
        testId: testCase.id,
        testName: testCase.name,
        passed: result.scores.overall >= 70 && !result.issues.some((i: UIIssue) => i.severity === 'critical'),
        score: {
          requirementMatch: result.scores.requirementMatch,
          aesthetics: result.scores.aesthetics,
          usability: result.scores.usability,
          overall: result.scores.overall,
        },
        issues: result.issues,
        suggestions: result.suggestions,
        errorLogs,
      }
    } catch (error) {
      console.error('[UITester] Analysis failed:', error)
      return {
        testId: testCase.id,
        testName: testCase.name,
        passed: false,
        score: { requirementMatch: 0, aesthetics: 0, usability: 0, overall: 0 },
        issues: [{
          type: 'interaction_error',
          severity: 'critical',
          description: `分析失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        suggestions: [],
        errorLogs,
      }
    }
  }

  /**
   * 生成完整的 UI 测试流程脚本
   * Claude Code 会执行这个脚本，然后我们分析结果
   */
  generateUITestWorkflow(testCases: UITestCase[]): string {
    return `# UI 自动化测试流程

## 测试用例列表
${testCases.map((tc, i) => `${i + 1}. **${tc.name}** - ${tc.description}`).join('\n')}

## 执行步骤

### Step 1: 安装依赖
\`\`\`bash
npm install -D @playwright/test
npx playwright install chromium
\`\`\`

### Step 2: 创建测试文件
创建 \`tests/ui-test.spec.ts\`:
${this.generateTestScript(testCases)}

### Step 3: 启动应用
\`\`\`bash
npm run dev &
sleep 5  # 等待应用启动
\`\`\`

### Step 4: 运行测试
\`\`\`bash
npx playwright test tests/ui-test.spec.ts
\`\`\`

### Step 5: 分析截图
测试完成后，截图保存在 \`__screenshots__/\` 目录。

对于每个截图，使用以下方式分析：
1. 检查 \`*-metadata.json\` 获取测试信息
2. 查看截图是否符合需求描述
3. 记录发现的问题

## 测试通过标准
- 所有页面可以正常加载
- 无 JavaScript 错误
- UI 布局正确
- 交互功能正常
- 视觉效果符合设计要求

## 问题修复流程
1. 记录发现的问题
2. 定位问题代码
3. 修复问题
4. 重新运行测试验证
5. 循环直到所有测试通过
`
  }

  /**
   * 生成测试报告
   */
  generateTestReport(results: UITestResult[]): string {
    const passed = results.filter(r => r.passed).length
    const failed = results.length - passed
    const avgScore = results.reduce((sum, r) => sum + r.score.overall, 0) / results.length

    const criticalIssues = results.flatMap(r =>
      r.issues.filter(i => i.severity === 'critical')
    )
    const majorIssues = results.flatMap(r =>
      r.issues.filter(i => i.severity === 'major')
    )

    return `# UI 测试报告

## 概览
| 指标 | 值 |
|------|-----|
| 总测试数 | ${results.length} |
| 通过 | ${passed} ✅ |
| 失败 | ${failed} ❌ |
| 平均评分 | ${avgScore.toFixed(1)}/100 |

## 评分详情
| 测试 | 需求匹配 | 美观度 | 可用性 | 总分 | 状态 |
|------|----------|--------|--------|------|------|
${results.map(r => `| ${r.testName} | ${r.score.requirementMatch} | ${r.score.aesthetics} | ${r.score.usability} | ${r.score.overall} | ${r.passed ? '✅' : '❌'} |`).join('\n')}

## 关键问题 (必须修复)
${criticalIssues.length > 0 ? criticalIssues.map((issue, i) => `
### ${i + 1}. ${issue.description}
- **类型**: ${issue.type}
- **位置**: ${issue.location || '未知'}
- **期望**: ${issue.expected || '-'}
- **实际**: ${issue.actual || '-'}
- **建议**: ${issue.suggestion || '-'}
`).join('\n') : '无关键问题 ✅'}

## 主要问题 (应该修复)
${majorIssues.length > 0 ? majorIssues.map((issue, i) => `
${i + 1}. **${issue.description}** - ${issue.suggestion || ''}
`).join('\n') : '无主要问题 ✅'}

## 改进建议
${[...new Set(results.flatMap(r => r.suggestions))].map((s, i) => `${i + 1}. ${s}`).join('\n')}

## 控制台错误
${results.filter(r => r.errorLogs.length > 0).map(r => `
### ${r.testName}
\`\`\`
${r.errorLogs.join('\n')}
\`\`\`
`).join('\n') || '无错误 ✅'}

---
*报告生成时间: ${new Date().toISOString()}*
`
  }
}

export const uiTester = new UITesterService()

// ============ 集成到开发编排器 ============

/**
 * 生成 UI 测试指令 - 供 Claude Code 执行
 */
export function generateUITestInstructions(features: { id: string; name: string; description: string; uiDescription?: string }[]): string {
  const testCases: UITestCase[] = features
    .filter(f => f.uiDescription)
    .map(f => ({
      id: f.id,
      name: f.name,
      description: f.description,
      uiDescription: f.uiDescription!,
      route: `/${f.id}`,
      interactions: [
        { action: 'wait' as const, value: '1000', description: '等待页面加载' },
      ]
    }))

  return `
## 🔍 UI 视觉测试

完成开发后，执行以下 UI 测试流程：

### 测试目标
像人类测试员一样检查每个页面：
1. **需求匹配** - UI 是否实现了需求描述的功能？
2. **美观度** - 界面是否好看、专业、协调？
3. **交互正确性** - 按钮点击、表单提交等是否正常？
4. **错误检测** - 控制台是否有 JS 错误？

### 测试用例

${testCases.map((tc, i) => `
#### ${i + 1}. ${tc.name}
- **页面路径**: ${tc.route}
- **功能要求**: ${tc.description}
- **UI 要求**: ${tc.uiDescription}

**检查清单**:
- [ ] 页面正常加载，无白屏
- [ ] 布局与需求描述一致
- [ ] 颜色、字体、间距协调美观
- [ ] 按钮可点击，无报错
- [ ] 表单可正常输入和提交
- [ ] 响应式适配正常
`).join('\n')}

### 测试方法

1. **启动应用**
\`\`\`bash
npm run dev
\`\`\`

2. **打开浏览器访问每个页面**

3. **对每个页面执行检查**:
   - 目视检查布局和设计
   - 打开开发者工具查看控制台错误
   - 尝试所有交互操作
   - 检查响应式布局

4. **记录问题并修复**

### 问题修复循环

如果发现问题：
1. 记录问题描述
2. 定位相关代码
3. 修复问题
4. 重新测试验证
5. 重复直到所有问题解决

### 测试完成标准

- [ ] 所有页面可正常加载
- [ ] 无控制台错误
- [ ] UI 与需求描述一致
- [ ] 界面美观专业
- [ ] 所有交互正常工作
`
}
