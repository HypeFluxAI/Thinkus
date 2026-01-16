/**
 * UI美观度和交互体验测试
 * 模拟产品经理视角测试界面美观度和交互易用性
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

test.describe('UI美观度测试 - 对话气泡和聊天界面', () => {
  test.setTimeout(120000)

  test('1. 创建项目流程 - 小T对话界面', async ({ page }) => {
    await login(page)

    // 进入创建流程
    await page.goto('/create')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 截图：阶段选择页面
    await page.screenshot({
      path: 'test-results/screenshots/ux-01-create-stage-select.png',
      fullPage: true
    })

    // 点击下一步进入需求描述
    const nextButton = page.locator('button:has-text("下一步")')
    if (await nextButton.count() > 0) {
      await nextButton.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500)

      // 截图：需求描述页面
      await page.screenshot({
        path: 'test-results/screenshots/ux-02-create-describe.png',
        fullPage: true
      })

      // 查找输入框并输入测试需求
      const textarea = page.locator('textarea').first()
      if (await textarea.count() > 0) {
        await textarea.fill('我想做一个在线教育平台，支持视频课程、直播教学、学生管理和支付功能')
        await page.waitForTimeout(500)

        // 截图：输入后的状态
        await page.screenshot({
          path: 'test-results/screenshots/ux-03-create-input-filled.png',
          fullPage: true
        })

        // 提交需求
        const submitBtn = page.locator('button[type="submit"], button:has-text("开始"), button:has-text("继续")').first()
        if (await submitBtn.count() > 0) {
          await submitBtn.click()
          await page.waitForTimeout(3000)

          // 截图：AI响应中
          await page.screenshot({
            path: 'test-results/screenshots/ux-04-ai-responding.png',
            fullPage: true
          })

          // 等待更长时间让AI完成响应
          await page.waitForTimeout(8000)

          // 截图：AI响应完成后的对话气泡
          await page.screenshot({
            path: 'test-results/screenshots/ux-05-chat-bubbles.png',
            fullPage: true
          })
        }
      }
    }
  })

  test('2. 专家讨论界面 - 多人对话气泡', async ({ page }) => {
    await login(page)

    // 直接访问讨论页面（如果有进行中的讨论）
    await page.goto('/create/discuss')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 截图：专家讨论页面初始状态
    await page.screenshot({
      path: 'test-results/screenshots/ux-06-discuss-initial.png',
      fullPage: true
    })

    // 检查是否有专家头像
    const expertAvatars = page.locator('[class*="avatar"], [class*="Avatar"]')
    const avatarCount = await expertAvatars.count()

    // 等待讨论开始
    await page.waitForTimeout(5000)

    // 截图：讨论进行中
    await page.screenshot({
      path: 'test-results/screenshots/ux-07-discuss-in-progress.png',
      fullPage: true
    })

    // 继续等待更多消息
    await page.waitForTimeout(10000)

    // 截图：更多专家发言
    await page.screenshot({
      path: 'test-results/screenshots/ux-08-discuss-messages.png',
      fullPage: true
    })
  })

  test('3. 项目详情页面对话历史', async ({ page }) => {
    await login(page)

    // 访问项目列表
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 点击第一个项目
    const firstProject = page.locator('a[href*="/projects/"]').first()
    if (await firstProject.count() > 0) {
      await firstProject.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500)

      // 截图：项目详情页
      await page.screenshot({
        path: 'test-results/screenshots/ux-09-project-detail.png',
        fullPage: true
      })

      // 查找讨论标签并点击
      const discussTab = page.locator('a:has-text("讨论"), button:has-text("讨论"), [href*="discuss"]')
      if (await discussTab.count() > 0) {
        await discussTab.first().click()
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1500)

        // 截图：讨论历史
        await page.screenshot({
          path: 'test-results/screenshots/ux-10-project-discussions.png',
          fullPage: true
        })
      }
    }
  })
})

test.describe('交互易用性测试', () => {
  test.setTimeout(60000)

  test('4. 按钮hover和点击效果', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // 截图：默认状态
    await page.screenshot({
      path: 'test-results/screenshots/ux-11-dashboard-default.png',
      fullPage: true
    })

    // 悬停在创建按钮上
    const createButton = page.locator('button:has-text("创建项目"), a:has-text("创建项目")').first()
    if (await createButton.count() > 0) {
      await createButton.hover()
      await page.waitForTimeout(500)

      // 截图：hover状态
      await page.screenshot({
        path: 'test-results/screenshots/ux-12-button-hover.png',
        fullPage: true
      })
    }

    // 悬停在卡片上
    const card = page.locator('[class*="Card"], [class*="card"]').first()
    if (await card.count() > 0) {
      await card.hover()
      await page.waitForTimeout(500)

      // 截图：卡片hover状态
      await page.screenshot({
        path: 'test-results/screenshots/ux-13-card-hover.png',
        fullPage: true
      })
    }
  })

  test('5. 表单交互和验证', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // 截图：登录表单初始状态
    await page.screenshot({
      path: 'test-results/screenshots/ux-14-form-initial.png',
      fullPage: true
    })

    // 聚焦邮箱输入框
    const emailInput = page.locator('input[type="email"]')
    await emailInput.focus()
    await page.waitForTimeout(300)

    // 截图：输入框聚焦状态
    await page.screenshot({
      path: 'test-results/screenshots/ux-15-form-focused.png',
      fullPage: true
    })

    // 输入无效邮箱测试验证
    await emailInput.fill('invalid-email')
    await emailInput.blur()
    await page.waitForTimeout(500)

    // 截图：验证错误状态
    await page.screenshot({
      path: 'test-results/screenshots/ux-16-form-error.png',
      fullPage: true
    })

    // 输入有效邮箱
    await emailInput.fill('test@example.com')
    await page.waitForTimeout(300)

    // 截图：有效输入状态
    await page.screenshot({
      path: 'test-results/screenshots/ux-17-form-valid.png',
      fullPage: true
    })
  })

  test('6. 导航流畅度测试', async ({ page }) => {
    await login(page)

    // 从dashboard开始
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 导航到projects
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'test-results/screenshots/ux-18-nav-projects.png',
      fullPage: true
    })

    // 导航到settings
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'test-results/screenshots/ux-19-nav-settings.png',
      fullPage: true
    })

    // 导航到templates
    await page.goto('/templates')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'test-results/screenshots/ux-20-nav-templates.png',
      fullPage: true
    })

    // 导航到pricing
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'test-results/screenshots/ux-21-nav-pricing.png',
      fullPage: true
    })
  })

  test('7. 响应式布局测试', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // 桌面视图
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(500)
    await page.screenshot({
      path: 'test-results/screenshots/ux-22-responsive-desktop.png',
      fullPage: true
    })

    // 平板视图
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)
    await page.screenshot({
      path: 'test-results/screenshots/ux-23-responsive-tablet.png',
      fullPage: true
    })

    // 手机视图
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(500)
    await page.screenshot({
      path: 'test-results/screenshots/ux-24-responsive-mobile.png',
      fullPage: true
    })
  })
})
