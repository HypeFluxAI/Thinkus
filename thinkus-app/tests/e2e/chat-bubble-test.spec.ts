/**
 * 对话气泡美观度专项测试
 * 测试AI对话和专家讨论中的消息气泡样式
 */
import { test, expect, Page } from '@playwright/test'

const TEST_USER = {
  email: 'test@thinkus.ai',
  password: 'Test123456!',
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

test.describe('对话气泡美观度测试', () => {
  test.setTimeout(180000)

  test('小T对话气泡测试', async ({ page }) => {
    await login(page)

    // 进入创建流程
    await page.goto('/create')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 点击下一步
    const nextButton = page.locator('button:has-text("下一步")')
    if (await nextButton.count() > 0) {
      await nextButton.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
    }

    // 关闭可能的引导弹窗
    const closeButton = page.locator('button:has-text("跳过"), button:has-text("关闭"), [aria-label="Close"]')
    if (await closeButton.count() > 0) {
      await closeButton.first().click()
      await page.waitForTimeout(500)
    }

    // 截图：小T初始界面
    await page.screenshot({
      path: 'test-results/screenshots/chat-01-xiaot-initial.png',
      fullPage: true
    })

    // 输入需求
    const textarea = page.locator('textarea').first()
    if (await textarea.count() > 0) {
      await textarea.fill('我想做一个健身APP，支持运动记录、饮食管理、社区互动')
      await page.waitForTimeout(300)

      // 截图：用户输入状态
      await page.screenshot({
        path: 'test-results/screenshots/chat-02-user-input.png',
        fullPage: true
      })

      // 按Enter发送
      await textarea.press('Enter')
      await page.waitForTimeout(2000)

      // 截图：用户消息气泡
      await page.screenshot({
        path: 'test-results/screenshots/chat-03-user-bubble.png',
        fullPage: true
      })

      // 等待AI响应
      await page.waitForTimeout(10000)

      // 截图：AI响应气泡
      await page.screenshot({
        path: 'test-results/screenshots/chat-04-ai-bubble.png',
        fullPage: true
      })

      // 继续等待更多响应
      await page.waitForTimeout(10000)

      // 截图：完整对话
      await page.screenshot({
        path: 'test-results/screenshots/chat-05-full-conversation.png',
        fullPage: true
      })
    }
  })

  test('专家讨论气泡测试', async ({ page }) => {
    await login(page)

    // 访问现有项目的讨论
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 点击第一个项目
    const projectLink = page.locator('a[href*="/projects/"]').first()
    if (await projectLink.count() > 0) {
      await projectLink.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // 截图：项目页面
      await page.screenshot({
        path: 'test-results/screenshots/chat-06-project-page.png',
        fullPage: true
      })

      // 点击讨论标签
      const discussTab = page.locator('a:has-text("讨论"), button:has-text("讨论")').first()
      if (await discussTab.count() > 0) {
        await discussTab.click()
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1500)

        // 截图：讨论页面
        await page.screenshot({
          path: 'test-results/screenshots/chat-07-discussion-page.png',
          fullPage: true
        })

        // 尝试开始新讨论
        const startDiscussion = page.locator('button:has-text("开始"), button:has-text("发起讨论")').first()
        if (await startDiscussion.count() > 0) {
          // 先填写讨论主题
          const topicInput = page.locator('input[placeholder*="主题"], input[placeholder*="例如"]').first()
          if (await topicInput.count() > 0) {
            await topicInput.fill('APP核心功能优先级讨论')
            await page.waitForTimeout(500)
          }

          await startDiscussion.click()
          await page.waitForTimeout(5000)

          // 截图：专家讨论开始
          await page.screenshot({
            path: 'test-results/screenshots/chat-08-expert-discussion-start.png',
            fullPage: true
          })

          // 等待专家发言
          await page.waitForTimeout(15000)

          // 截图：专家消息气泡
          await page.screenshot({
            path: 'test-results/screenshots/chat-09-expert-bubbles.png',
            fullPage: true
          })

          // 继续等待更多专家发言
          await page.waitForTimeout(15000)

          // 截图：多专家对话
          await page.screenshot({
            path: 'test-results/screenshots/chat-10-multi-expert-chat.png',
            fullPage: true
          })
        }
      }
    }
  })
})
