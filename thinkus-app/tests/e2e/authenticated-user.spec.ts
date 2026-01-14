/**
 * 登录用户模拟测试
 * 模拟真实用户登录后的完整操作流程
 */
import { test, expect, Page } from '@playwright/test'

const TEST_USER = {
  email: 'test@thinkus.ai',
  password: 'Test123456!',
}

// 存储已发现的问题
const issues: string[] = []

// 关闭欢迎弹窗
async function dismissWelcomeModal(page: Page) {
  // 等待可能的弹窗出现
  await page.waitForTimeout(1000)

  // 检查是否有欢迎弹窗
  const skipButton = page.locator('button:has-text("跳过引导"), button:has-text("跳过"), button:has-text("Skip")')
  const closeButton = page.locator('[data-state="open"] button[aria-label*="close"], [data-state="open"] button:has(svg)')

  if (await skipButton.count() > 0) {
    await skipButton.first().click()
    await page.waitForTimeout(500)
  } else if (await closeButton.count() > 0) {
    await closeButton.first().click()
    await page.waitForTimeout(500)
  }
}

// 登录辅助函数
async function login(page: Page) {
  await page.goto('/login')

  // 等待页面加载
  await page.waitForLoadState('networkidle')

  // 等待登录表单出现
  await page.waitForSelector('input[type="email"]', { timeout: 10000 })

  // 填写登录表单 - 先清空再填入
  const emailInput = page.locator('input[type="email"]')
  const passwordInput = page.locator('input[type="password"]')

  await emailInput.click()
  await emailInput.fill(TEST_USER.email)

  await passwordInput.click()
  await passwordInput.fill(TEST_USER.password)

  // 截图调试
  await page.screenshot({ path: 'test-results/screenshots/login-form-filled.png' })

  // 点击登录按钮
  await page.click('button[type="submit"]')

  // 等待登录按钮恢复或页面跳转
  try {
    await page.waitForURL(/\/(dashboard|create|projects)/, { timeout: 30000 })
  } catch {
    // 如果没有跳转，等待按钮状态恢复并检查错误
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/screenshots/login-result.png' })

    // 检查是否有 toast 错误消息
    const toastError = page.locator('[data-sonner-toast], .sonner-toast, [role="status"]')
    if (await toastError.count() > 0) {
      const errorText = await toastError.first().textContent()
      throw new Error(`登录失败，错误消息: ${errorText}`)
    }

    // 检查是否仍在登录页面
    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      throw new Error(`登录失败，仍在登录页面: ${currentUrl}`)
    }
  }

  // 登录成功后关闭欢迎弹窗
  await dismissWelcomeModal(page)
}

test.describe('Authenticated User Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test.describe('Dashboard Tests', () => {
    test('should display dashboard after login', async ({ page }) => {
      // 验证已登录
      const currentUrl = page.url()
      expect(currentUrl).toMatch(/\/(dashboard|create|projects)/)

      // 截图记录
      await page.screenshot({ path: 'test-results/screenshots/dashboard.png' })
    })

    test('should show user name or avatar in header', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // 检查是否有用户菜单或头像
      const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="用户"], [aria-label*="user"], button:has(img[alt*="avatar"]), .avatar, .user-avatar')
      const userMenuCount = await userMenu.count()

      if (userMenuCount === 0) {
        issues.push('Dashboard: 未找到用户菜单或头像')
      }

      await page.screenshot({ path: 'test-results/screenshots/dashboard-header.png' })
    })

    test('should display quick actions or project list', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // 检查是否有创建项目按钮或项目列表
      const createButton = page.locator('a[href*="create"], button:has-text("创建"), button:has-text("新建"), button:has-text("Create")')
      const hasCreateButton = await createButton.count() > 0

      if (!hasCreateButton) {
        issues.push('Dashboard: 未找到创建项目按钮')
      }

      await page.screenshot({ path: 'test-results/screenshots/dashboard-actions.png' })
    })
  })

  test.describe('Create Project Flow', () => {
    test('should navigate to create page', async ({ page }) => {
      await page.goto('/create')
      await page.waitForLoadState('networkidle')

      // 创建页面是阶段选择页，检查是否有阶段选项
      const stageOptions = page.locator('[class*="card"], [role="button"], button').filter({ hasText: /想法|需求|设计|开发|Ideation/i })
      const hasStageOptions = await stageOptions.count() > 0

      // 或者检查是否有下一步按钮
      const nextButton = page.locator('button:has-text("下一步"), button:has-text("Next")')
      const hasNextButton = await nextButton.count() > 0

      expect(hasStageOptions || hasNextButton).toBeTruthy()

      await page.screenshot({ path: 'test-results/screenshots/create-page.png' })
    })

    test('should accept idea input', async ({ page }) => {
      await page.goto('/create')
      await page.waitForLoadState('networkidle')

      // 点击下一步进入描述需求页面
      const nextButton = page.locator('button:has-text("下一步"), button:has-text("Next")')
      if (await nextButton.count() > 0) {
        await nextButton.click()
        await page.waitForLoadState('networkidle')
      }

      // 检查是否有输入框或提交按钮
      const ideaInput = page.locator('textarea, input[type="text"]')
      const submitButton = page.locator('button[type="submit"], button:has-text("继续"), button:has-text("下一步"), button:has-text("开始")')

      const hasInput = await ideaInput.count() > 0
      const hasSubmit = await submitButton.count() > 0

      if (!hasInput && !hasSubmit) {
        issues.push('Create Page: 未找到输入框或提交按钮')
      }

      await page.screenshot({ path: 'test-results/screenshots/create-with-idea.png' })
    })
  })

  test.describe('Settings Pages', () => {
    test('should access profile settings', async ({ page }) => {
      await page.goto('/settings/profile')
      await page.waitForLoadState('networkidle')

      // 检查是否显示用户信息
      const nameInput = page.locator('input[name="name"], input[placeholder*="名"], input[placeholder*="name"]')
      const emailInput = page.locator('input[name="email"], input[type="email"]')
      const emailText = page.locator(':text("test@thinkus.ai")')

      const hasNameInput = await nameInput.count() > 0
      const hasEmailInput = await emailInput.count() > 0
      const hasEmailText = await emailText.count() > 0

      if (!hasNameInput && !hasEmailInput && !hasEmailText) {
        issues.push('Settings/Profile: 未找到用户信息表单')
      }

      await page.screenshot({ path: 'test-results/screenshots/settings-profile.png' })
    })

    test('should access credentials settings', async ({ page }) => {
      await page.goto('/settings/credentials')
      await page.waitForLoadState('networkidle')

      // 检查是否有添加凭证按钮
      const addButton = page.locator('button:has-text("添加"), button:has-text("新增"), button:has-text("Add")')
      const hasAddButton = await addButton.count() > 0

      if (!hasAddButton) {
        issues.push('Settings/Credentials: 未找到添加凭证按钮')
      }

      await page.screenshot({ path: 'test-results/screenshots/settings-credentials.png' })
    })

    test('should access notification settings', async ({ page }) => {
      await page.goto('/settings/notifications')
      await page.waitForLoadState('networkidle')

      // 检查是否有开关或设置项
      const toggles = page.locator('input[type="checkbox"], [role="switch"], button[role="switch"]')
      const hasToggles = await toggles.count() > 0

      if (!hasToggles) {
        issues.push('Settings/Notifications: 未找到通知开关')
      }

      await page.screenshot({ path: 'test-results/screenshots/settings-notifications.png' })
    })

    test('should access appearance settings', async ({ page }) => {
      await page.goto('/settings/appearance')
      await page.waitForLoadState('networkidle')

      // 检查是否有主题选择
      const themeOptions = page.locator('button:has-text("浅色"), button:has-text("深色"), button:has-text("系统"), [data-theme], input[name="theme"]')
      const hasThemeOptions = await themeOptions.count() > 0

      if (!hasThemeOptions) {
        issues.push('Settings/Appearance: 未找到主题选项')
      }

      await page.screenshot({ path: 'test-results/screenshots/settings-appearance.png' })
    })
  })

  test.describe('Projects Page', () => {
    test('should display projects list', async ({ page }) => {
      await page.goto('/projects')
      await page.waitForLoadState('networkidle')

      // 页面应该加载成功
      const pageTitle = page.locator('h1, h2')
      const hasTitles = await pageTitle.count() > 0

      if (!hasTitles) {
        issues.push('Projects: 页面无标题')
      }

      await page.screenshot({ path: 'test-results/screenshots/projects-list.png' })
    })
  })

  test.describe('Navigation Tests', () => {
    test('should navigate using sidebar or header nav', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // 先关闭可能的弹窗
      await dismissWelcomeModal(page)

      await page.screenshot({ path: 'test-results/screenshots/navigation-before.png' })

      // 尝试直接访问设置页面验证可访问性
      await page.goto('/settings')
      await page.waitForLoadState('networkidle')

      // 验证设置页面加载成功
      const isSettingsPage = page.url().includes('settings')
      expect(isSettingsPage).toBeTruthy()

      await page.screenshot({ path: 'test-results/screenshots/navigation.png' })
    })

    test('should have working logout', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // 查找登出按钮
      const logoutButton = page.locator('button:has-text("退出"), button:has-text("登出"), button:has-text("Logout"), a:has-text("退出")')

      if (await logoutButton.count() === 0) {
        // 可能需要先打开用户菜单
        const userMenu = page.locator('[data-testid="user-menu"], button:has(img), .avatar').first()
        if (await userMenu.count() > 0) {
          await userMenu.click()
          await page.waitForTimeout(500)
        }
      }

      const logoutAfterMenu = page.locator('button:has-text("退出"), button:has-text("登出"), button:has-text("Logout"), a:has-text("退出")')
      const hasLogout = await logoutAfterMenu.count() > 0

      if (!hasLogout) {
        issues.push('Navigation: 未找到退出按钮')
      }

      await page.screenshot({ path: 'test-results/screenshots/logout-menu.png' })
    })
  })

  test.describe('API Integration Tests', () => {
    test('should fetch user data successfully', async ({ page, request }) => {
      // 获取 session cookie
      const cookies = await page.context().cookies()

      // 尝试访问需要认证的 API
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/trpc/user.me')
        return {
          status: res.status,
          ok: res.ok,
        }
      })

      if (!response.ok) {
        issues.push(`API user.me: 返回状态 ${response.status}`)
      }
    })

    test('should handle subscriptions API correctly', async ({ page }) => {
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/subscriptions')
        return {
          status: res.status,
          ok: res.ok,
        }
      })

      // 应该返回 200 或有意义的错误
      if (response.status === 500) {
        issues.push('API subscriptions: 返回 500 服务器错误')
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle 404 pages gracefully', async ({ page }) => {
      const response = await page.goto('/non-existent-page-12345')

      // 应该返回 404 而不是 500
      if (response && response.status() === 500) {
        issues.push('404 处理: 返回 500 而非 404')
      }

      // 检查是否有友好的 404 页面
      const notFoundText = page.locator('text=404, text=找不到, text=Not Found, text=页面不存在')
      const has404Text = await notFoundText.count() > 0

      if (!has404Text && response?.status() === 404) {
        issues.push('404 页面: 缺少友好的 404 提示')
      }

      await page.screenshot({ path: 'test-results/screenshots/404-page.png' })
    })
  })
})

// 测试结束后输出所有发现的问题
test.afterAll(async () => {
  if (issues.length > 0) {
    console.log('\n========== 发现的问题 ==========')
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`)
    })
    console.log('================================\n')
  } else {
    console.log('\n✓ 未发现明显问题\n')
  }
})
