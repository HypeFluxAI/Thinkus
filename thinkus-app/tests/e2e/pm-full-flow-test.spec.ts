/**
 * 产品经理完整流程测试
 * 模拟真实用户从需求阶段到项目完成的完整流程
 * 包含前进、后退、反复操作
 */
import { test, expect, Page } from '@playwright/test'

const TEST_USER = {
  email: 'test@thinkus.ai',
  password: 'Test123456!',
}

// 测试结果记录
const issues: string[] = []

function recordIssue(issue: string) {
  issues.push(`[${new Date().toISOString()}] ${issue}`)
  console.log(`❌ 问题: ${issue}`)
}

async function login(page: Page) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  const emailInput = page.locator('input[type="email"]')
  const passwordInput = page.locator('input[type="password"]')

  await emailInput.fill(TEST_USER.email)
  await passwordInput.fill(TEST_USER.password)
  await page.click('button[type="submit"]')

  await page.waitForURL(/\/(dashboard|create|projects)/, { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(2000)
}

async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/pm-flow-${name}.png`,
    fullPage: true
  })
}

test.describe('产品经理完整流程测试', () => {
  test.setTimeout(300000) // 5分钟超时

  test('完整用户旅程测试', async ({ page }) => {
    console.log('========== 开始产品经理测试 ==========')

    // ========== 1. 登录测试 ==========
    console.log('\n📍 步骤1: 登录')
    await login(page)
    await takeScreenshot(page, '01-after-login')

    const currentUrl = page.url()
    if (!currentUrl.includes('dashboard') && !currentUrl.includes('create') && !currentUrl.includes('projects')) {
      recordIssue('登录后未正确跳转到主页面')
    }

    // ========== 2. Dashboard 检查 ==========
    console.log('\n📍 步骤2: 检查Dashboard')
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)
    await takeScreenshot(page, '02-dashboard')

    // 检查关键元素
    const welcomeText = page.locator('text=你好')
    if (await welcomeText.count() === 0) {
      recordIssue('Dashboard缺少欢迎语')
    }

    // 检查创建项目按钮
    const createBtn = page.locator('a[href="/create"], button:has-text("创建"), a:has-text("创建")')
    if (await createBtn.count() === 0) {
      recordIssue('Dashboard缺少创建项目入口')
    }

    // ========== 3. 进入创建流程 ==========
    console.log('\n📍 步骤3: 进入创建流程')
    await page.goto('/create')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)
    await takeScreenshot(page, '03-create-step1')

    // 检查阶段选择
    const stageOptions = page.locator('[class*="card"], [class*="Card"]')
    const stageCount = await stageOptions.count()
    console.log(`  发现 ${stageCount} 个阶段选项`)

    if (stageCount === 0) {
      recordIssue('创建页面缺少阶段选择卡片')
    }

    // ========== 4. 选择阶段并下一步 ==========
    console.log('\n📍 步骤4: 选择阶段')
    // 点击第一个阶段卡片
    const firstStage = page.locator('[class*="card"], [class*="Card"]').first()
    if (await firstStage.count() > 0) {
      await firstStage.click()
      await page.waitForTimeout(500)
    }

    // 点击下一步
    const nextBtn = page.locator('button:has-text("下一步")')
    if (await nextBtn.count() > 0) {
      await nextBtn.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500)
    } else {
      recordIssue('创建页面缺少"下一步"按钮')
    }
    await takeScreenshot(page, '04-create-step2')

    // ========== 5. 测试返回功能 ==========
    console.log('\n📍 步骤5: 测试返回功能')
    // 返回按钮可能是图标按钮或文字按钮
    const backBtn = page.locator('button:has-text("返回"), button:has-text("上一步"), a:has-text("返回"), header button svg').first()
    if (await backBtn.count() > 0) {
      // 点击header中的第一个按钮（通常是返回按钮）
      const headerBackBtn = page.locator('header button').first()
      if (await headerBackBtn.count() > 0) {
        await headerBackBtn.click()
        await page.waitForTimeout(1000)
        await takeScreenshot(page, '05-back-test')

        // 再次前进
        const nextBtn2 = page.locator('button:has-text("下一步")')
        if (await nextBtn2.count() > 0) {
          await nextBtn2.click()
          await page.waitForTimeout(1000)
        }
      }
    } else {
      recordIssue('创建流程缺少返回按钮')
    }

    // ========== 6. 输入需求描述 ==========
    console.log('\n📍 步骤6: 输入需求描述')
    const textarea = page.locator('textarea').first()
    if (await textarea.count() > 0) {
      // 使用 type 代替 fill 以确保触发 React 的 onChange
      await textarea.click()
      await textarea.type('我想做一个健身APP，包括运动记录、训练计划、饮食管理', { delay: 10 })
      await page.waitForTimeout(500)
      await takeScreenshot(page, '06-input-requirement')
    } else {
      recordIssue('需求输入页面缺少文本框')
    }

    // ========== 7. 提交需求，等待AI响应 ==========
    console.log('\n📍 步骤7: 提交需求')
    // 等待发送按钮可用
    await page.waitForTimeout(500)

    // 优先使用键盘 Enter 发送，更可靠
    if (await textarea.count() > 0) {
      await textarea.press('Enter')
      console.log('  使用Enter键发送')
    }

    await page.waitForTimeout(3000)
    await takeScreenshot(page, '07-ai-responding')

    // 等待AI响应完成
    console.log('  等待AI响应...')
    await page.waitForTimeout(15000)
    await takeScreenshot(page, '08-ai-response')

    // 检查是否有AI回复 - 通过检查是否有小T的回复内容
    const aiContent = page.locator('text=小T, text=你好, text=很高兴')
    const hasAiResponse = await aiContent.count() > 0
    if (!hasAiResponse) {
      // 再检查页面上是否有任何新内容
      const pageContent = await page.content()
      if (!pageContent.includes('小T') && !pageContent.includes('很高兴')) {
        recordIssue('未检测到AI响应消息')
      }
    } else {
      console.log('  ✓ AI响应正常')
    }

    // ========== 8. 继续对话 ==========
    console.log('\n📍 步骤8: 继续对话')
    const chatInput = page.locator('textarea, input[type="text"]').first()
    if (await chatInput.count() > 0) {
      await chatInput.fill('请帮我分析一下技术选型')
      await page.waitForTimeout(500)

      const sendBtn = page.locator('button[type="submit"], button:has-text("发送")').first()
      if (await sendBtn.count() > 0) {
        await sendBtn.click()
      } else {
        await chatInput.press('Enter')
      }

      await page.waitForTimeout(10000)
      await takeScreenshot(page, '09-continued-chat')
    }

    // ========== 9. 查看项目列表 ==========
    console.log('\n📍 步骤9: 查看项目列表')
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)
    await takeScreenshot(page, '10-projects-list')

    const projectCards = page.locator('a[href*="/projects/"]')
    const projectCount = await projectCards.count()
    console.log(`  发现 ${projectCount} 个项目`)

    if (projectCount === 0) {
      recordIssue('项目列表为空或未正确加载')
    }

    // ========== 10. 进入项目详情 ==========
    console.log('\n📍 步骤10: 进入项目详情')
    if (projectCount > 0) {
      await projectCards.first().click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500)
      await takeScreenshot(page, '11-project-detail')

      // 检查项目详情页关键元素
      const projectTitle = page.locator('h1, h2').first()
      if (await projectTitle.count() === 0) {
        recordIssue('项目详情页缺少标题')
      }
    }

    // ========== 11. 测试讨论功能 ==========
    console.log('\n📍 步骤11: 测试讨论功能')
    const discussTab = page.locator('a:has-text("讨论"), button:has-text("讨论"), [href*="discuss"]')
    if (await discussTab.count() > 0) {
      await discussTab.first().click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500)
      await takeScreenshot(page, '12-discussion-page')

      // 尝试发起讨论 - 需要填写"讨论主题"字段
      const topicInput = page.locator('input[placeholder*="例如"], input[placeholder*="主题"]').first()
      if (await topicInput.count() > 0) {
        await topicInput.click()
        await topicInput.type('核心功能优先级讨论', { delay: 10 })
        await page.waitForTimeout(500)
        await takeScreenshot(page, '12b-topic-filled')

        // 查找并点击开始按钮
        const startBtn = page.locator('button:has-text("开始")').first()
        if (await startBtn.count() > 0) {
          // 等待按钮变为可用
          await page.waitForTimeout(500)
          try {
            await startBtn.click({ timeout: 5000 })
            await page.waitForTimeout(20000) // 等待专家讨论
            await takeScreenshot(page, '13-discussion-in-progress')
          } catch {
            console.log('  开始讨论按钮可能被禁用')
            await takeScreenshot(page, '13-discussion-button-issue')
          }
        }
      } else {
        console.log('  未找到讨论主题输入框')
      }
    } else {
      recordIssue('项目详情页缺少讨论入口')
    }

    // ========== 12. 测试模板市场 ==========
    console.log('\n📍 步骤12: 测试模板市场')
    await page.goto('/templates')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)
    await takeScreenshot(page, '14-templates')

    const templateCards = page.locator('[class*="card"], [class*="Card"]')
    const templateCount = await templateCards.count()
    console.log(`  发现 ${templateCount} 个模板卡片`)

    if (templateCount === 0) {
      recordIssue('模板市场为空')
    }

    // 点击一个模板查看详情
    if (templateCount > 0) {
      await templateCards.first().click()
      await page.waitForTimeout(1500)
      await takeScreenshot(page, '15-template-detail')
    }

    // ========== 13. 测试设置页面 ==========
    console.log('\n📍 步骤13: 测试设置页面')
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await takeScreenshot(page, '16-settings')

    // 测试各设置子页面
    const settingsLinks = ['profile', 'notifications', 'appearance']
    for (const link of settingsLinks) {
      await page.goto(`/settings/${link}`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(800)
      await takeScreenshot(page, `17-settings-${link}`)
    }

    // ========== 14. 测试高管/专家页面 ==========
    console.log('\n📍 步骤14: 测试高管页面')
    await page.goto('/executives')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await takeScreenshot(page, '18-executives')

    const executiveCards = page.locator('[class*="card"], [class*="Card"]')
    if (await executiveCards.count() === 0) {
      recordIssue('高管页面缺少高管卡片')
    }

    // ========== 15. 测试CEO工作台 ==========
    console.log('\n📍 步骤15: 测试CEO工作台')
    await page.goto('/ceo')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await takeScreenshot(page, '19-ceo-workbench')

    // ========== 16. 移动端适配测试 ==========
    console.log('\n📍 步骤16: 移动端适配测试')
    await page.setViewportSize({ width: 375, height: 812 })

    // 测试关键页面的移动端显示
    const mobilePages = ['/dashboard', '/create', '/projects', '/templates']
    for (let i = 0; i < mobilePages.length; i++) {
      await page.goto(mobilePages[i])
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(800)
      await takeScreenshot(page, `20-mobile-${mobilePages[i].replace('/', '')}`)
    }

    // 恢复桌面视口
    await page.setViewportSize({ width: 1280, height: 720 })

    // ========== 测试总结 ==========
    console.log('\n========== 测试完成 ==========')
    console.log(`发现问题数量: ${issues.length}`)
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`)
    })

    // 将问题写入文件
    if (issues.length > 0) {
      const fs = require('fs')
      fs.writeFileSync('test-results/pm-test-issues.txt', issues.join('\n'))
    }
  })
})
