/**
 * 全面 UI 测试 - 检查页面交互、视觉和功能完整性
 */
import { test, expect, Page } from '@playwright/test'

const TEST_USER = {
  email: 'test@thinkus.ai',
  password: 'Test123456!',
}

// 测试报告
interface TestReport {
  page: string
  issues: string[]
  warnings: string[]
  screenshots: string[]
}

const reports: TestReport[] = []

// 登录并关闭弹窗
async function loginAndSetup(page: Page) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('input[type="email"]', { timeout: 10000 })

  await page.locator('input[type="email"]').fill(TEST_USER.email)
  await page.locator('input[type="password"]').fill(TEST_USER.password)
  await page.click('button[type="submit"]')

  try {
    await page.waitForURL(/\/(dashboard|create|projects)/, { timeout: 30000 })
  } catch {
    throw new Error('登录失败')
  }

  // 关闭欢迎弹窗
  await page.waitForTimeout(1000)
  const skipButton = page.locator('button:has-text("跳过引导"), button:has-text("跳过")')
  if (await skipButton.count() > 0) {
    await skipButton.first().click()
    await page.waitForTimeout(500)
  }
}

// 检查页面基础元素
async function checkPageBasics(page: Page, pageName: string): Promise<string[]> {
  const issues: string[] = []

  // 检查页面标题
  const title = await page.title()
  if (!title || title === 'Error' || title.includes('500')) {
    issues.push(`页面标题异常: "${title}"`)
  }

  // 检查是否有错误状态
  const errorElements = page.locator('[class*="error"], [class*="Error"], .text-destructive, [role="alert"]')
  const errorCount = await errorElements.count()
  if (errorCount > 0) {
    const errorTexts = await errorElements.allTextContents()
    const actualErrors = errorTexts.filter(t => t.trim() && !t.includes('必填'))
    if (actualErrors.length > 0) {
      issues.push(`发现错误元素: ${actualErrors.slice(0, 3).join(', ')}`)
    }
  }

  // 检查控制台错误
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      issues.push(`控制台错误: ${msg.text().slice(0, 100)}`)
    }
  })

  // 检查页面是否有内容
  const bodyContent = await page.locator('body').textContent()
  if (!bodyContent || bodyContent.trim().length < 50) {
    issues.push('页面内容过少或为空')
  }

  return issues
}

// 检查颜色对比度和可访问性
async function checkVisualAccessibility(page: Page): Promise<string[]> {
  const warnings: string[] = []

  // 检查是否有 focus 样式
  const focusableElements = page.locator('button, a, input, select, textarea')
  const focusableCount = await focusableElements.count()

  if (focusableCount > 0) {
    const firstFocusable = focusableElements.first()
    await firstFocusable.focus()
    // 检查是否有 focus 样式
    const focusStyle = await firstFocusable.evaluate(el => {
      const style = window.getComputedStyle(el)
      return {
        outline: style.outline,
        boxShadow: style.boxShadow,
        border: style.border,
      }
    })

    if (focusStyle.outline === 'none' && !focusStyle.boxShadow && !focusStyle.border) {
      warnings.push('可能缺少 focus 样式指示器')
    }
  }

  // 检查图片是否有 alt 属性
  const images = page.locator('img')
  const imgCount = await images.count()
  for (let i = 0; i < Math.min(imgCount, 5); i++) {
    const alt = await images.nth(i).getAttribute('alt')
    if (!alt) {
      warnings.push(`图片 ${i + 1} 缺少 alt 属性`)
    }
  }

  return warnings
}

// 检查按钮和链接是否可点击
async function checkInteractiveElements(page: Page): Promise<string[]> {
  const issues: string[] = []

  // 检查所有按钮
  const buttons = page.locator('button:visible')
  const buttonCount = await buttons.count()

  for (let i = 0; i < Math.min(buttonCount, 10); i++) {
    const button = buttons.nth(i)
    const isDisabled = await button.isDisabled()
    const isVisible = await button.isVisible()

    if (!isDisabled && isVisible) {
      const buttonText = await button.textContent()
      // 检查按钮是否可以获得焦点
      try {
        await button.focus({ timeout: 1000 })
      } catch {
        issues.push(`按钮 "${buttonText?.slice(0, 20)}" 无法获得焦点`)
      }
    }
  }

  // 检查所有链接
  const links = page.locator('a[href]:visible')
  const linkCount = await links.count()

  for (let i = 0; i < Math.min(linkCount, 10); i++) {
    const link = links.nth(i)
    const href = await link.getAttribute('href')

    if (href && !href.startsWith('#') && !href.startsWith('javascript')) {
      // 检查链接是否有有效的 href
      if (!href.startsWith('/') && !href.startsWith('http')) {
        issues.push(`链接 href 格式异常: ${href}`)
      }
    }
  }

  return issues
}

// 检查表单功能
async function checkFormFunctionality(page: Page): Promise<string[]> {
  const issues: string[] = []

  // 查找所有表单
  const forms = page.locator('form')
  const formCount = await forms.count()

  for (let i = 0; i < formCount; i++) {
    const form = forms.nth(i)

    // 检查是否有提交按钮
    const submitButton = form.locator('button[type="submit"], input[type="submit"]')
    if (await submitButton.count() === 0) {
      // 检查是否有其他按钮
      const anyButton = form.locator('button')
      if (await anyButton.count() === 0) {
        issues.push(`表单 ${i + 1} 缺少提交按钮`)
      }
    }

    // 检查必填字段是否有标识
    const requiredInputs = form.locator('input[required], textarea[required], select[required]')
    const requiredCount = await requiredInputs.count()

    if (requiredCount > 0) {
      // 检查是否有必填标识
      const requiredMarkers = form.locator('[class*="required"], .text-destructive, :text("*")')
      if (await requiredMarkers.count() === 0) {
        issues.push(`表单 ${i + 1} 必填字段缺少视觉标识`)
      }
    }
  }

  return issues
}

// 检查加载状态
async function checkLoadingStates(page: Page): Promise<string[]> {
  const issues: string[] = []

  // 检查是否有无限加载状态
  const loadingElements = page.locator('[class*="loading"], [class*="spinner"], [class*="animate-spin"]')
  const loadingCount = await loadingElements.count()

  if (loadingCount > 0) {
    // 等待加载完成
    await page.waitForTimeout(3000)
    const stillLoading = await loadingElements.count()
    if (stillLoading > 0) {
      issues.push('页面存在长时间加载状态')
    }
  }

  return issues
}

test.describe('Dashboard 页面完整性测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSetup(page)
  })

  test('Dashboard 主页面检查', async ({ page }) => {
    const report: TestReport = {
      page: 'Dashboard',
      issues: [],
      warnings: [],
      screenshots: [],
    }

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // 关闭可能的弹窗
    const modal = page.locator('[data-state="open"]')
    if (await modal.count() > 0) {
      const closeBtn = page.locator('button:has-text("跳过引导"), button:has-text("跳过"), [aria-label*="close"]')
      if (await closeBtn.count() > 0) {
        await closeBtn.first().click()
        await page.waitForTimeout(500)
      }
    }

    await page.screenshot({ path: 'test-results/screenshots/dashboard-full.png', fullPage: true })
    report.screenshots.push('dashboard-full.png')

    // 基础检查
    report.issues.push(...await checkPageBasics(page, 'Dashboard'))

    // 检查关键元素
    const header = page.locator('header, nav, [role="banner"]')
    if (await header.count() === 0) {
      report.issues.push('缺少页面头部/导航')
    }

    // 检查用户欢迎信息
    const welcomeText = page.locator(':text("你好"), :text("欢迎"), :text("Hello")')
    if (await welcomeText.count() === 0) {
      report.warnings.push('未显示用户欢迎信息')
    }

    // 检查快捷操作卡片
    const cards = page.locator('[class*="card"], [class*="Card"]')
    const cardCount = await cards.count()
    if (cardCount < 2) {
      report.warnings.push(`Dashboard 卡片数量较少: ${cardCount}`)
    }

    // 检查创建项目入口
    const createBtn = page.locator('a[href*="create"], button:has-text("创建"), button:has-text("新建")')
    if (await createBtn.count() === 0) {
      report.issues.push('未找到创建项目入口')
    }

    // 交互检查
    report.issues.push(...await checkInteractiveElements(page))

    // 可访问性检查
    report.warnings.push(...await checkVisualAccessibility(page))

    reports.push(report)

    // 输出报告
    if (report.issues.length > 0) {
      console.log(`\n❌ Dashboard 问题:\n${report.issues.map(i => `  - ${i}`).join('\n')}`)
    }
    if (report.warnings.length > 0) {
      console.log(`\n⚠️ Dashboard 警告:\n${report.warnings.map(w => `  - ${w}`).join('\n')}`)
    }

    expect(report.issues.filter(i => !i.includes('控制台'))).toHaveLength(0)
  })
})

test.describe('Create 项目流程测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSetup(page)
  })

  test('创建项目 - 阶段选择页', async ({ page }) => {
    const report: TestReport = {
      page: 'Create - Stage Selection',
      issues: [],
      warnings: [],
      screenshots: [],
    }

    await page.goto('/create')
    await page.waitForLoadState('networkidle')

    await page.screenshot({ path: 'test-results/screenshots/create-stage.png', fullPage: true })
    report.screenshots.push('create-stage.png')

    // 检查阶段选项
    const stageCards = page.locator('[class*="card"]').filter({ hasText: /想法|需求|设计|开发|Ideation/i })
    const stageCount = await stageCards.count()

    if (stageCount === 0) {
      report.issues.push('未找到阶段选择卡片')
    } else {
      console.log(`✓ 找到 ${stageCount} 个阶段选项`)
    }

    // 检查是否有选中状态
    const selectedStage = page.locator('[class*="selected"], [data-state="checked"], [aria-selected="true"], [class*="border-primary"]')
    if (await selectedStage.count() === 0) {
      report.warnings.push('没有默认选中的阶段')
    }

    // 检查下一步按钮
    const nextBtn = page.locator('button:has-text("下一步"), button:has-text("Next")')
    if (await nextBtn.count() === 0) {
      report.issues.push('未找到下一步按钮')
    } else {
      // 测试点击下一步
      await nextBtn.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      await page.screenshot({ path: 'test-results/screenshots/create-step2.png', fullPage: true })
      report.screenshots.push('create-step2.png')

      // 检查是否进入下一步
      const step2Elements = page.locator('textarea, input[type="text"], [contenteditable]')
      if (await step2Elements.count() > 0) {
        console.log('✓ 成功进入描述需求页面')
      }
    }

    reports.push(report)

    if (report.issues.length > 0) {
      console.log(`\n❌ Create 问题:\n${report.issues.map(i => `  - ${i}`).join('\n')}`)
    }
  })

  test('创建项目 - 输入需求页', async ({ page }) => {
    const report: TestReport = {
      page: 'Create - Input Requirement',
      issues: [],
      warnings: [],
      screenshots: [],
    }

    await page.goto('/create')
    await page.waitForLoadState('networkidle')

    // 点击下一步进入需求输入页
    const nextBtn = page.locator('button:has-text("下一步")')
    if (await nextBtn.count() > 0) {
      await nextBtn.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
    }

    // 检查是否有输入区域
    const inputArea = page.locator('textarea, input[type="text"], [contenteditable="true"]')
    const inputCount = await inputArea.count()

    if (inputCount > 0) {
      // 尝试输入内容
      const textarea = inputArea.first()
      await textarea.fill('我想创建一个在线待办事项应用，支持用户注册登录、创建任务、设置截止日期、标记完成状态。')

      await page.screenshot({ path: 'test-results/screenshots/create-input-filled.png', fullPage: true })
      report.screenshots.push('create-input-filled.png')

      // 检查字数统计
      const charCount = page.locator('[class*="count"], :text(/\\d+.*字/)')
      if (await charCount.count() > 0) {
        console.log('✓ 有字数统计功能')
      }
    } else {
      report.warnings.push('未找到需求输入区域')
    }

    reports.push(report)
  })
})

test.describe('Settings 页面完整性测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSetup(page)
  })

  test('个人资料设置页', async ({ page }) => {
    const report: TestReport = {
      page: 'Settings - Profile',
      issues: [],
      warnings: [],
      screenshots: [],
    }

    await page.goto('/settings/profile')
    await page.waitForLoadState('networkidle')

    await page.screenshot({ path: 'test-results/screenshots/settings-profile-full.png', fullPage: true })
    report.screenshots.push('settings-profile-full.png')

    // 检查表单字段
    const nameInput = page.locator('input[name="name"], input[placeholder*="名"]')
    if (await nameInput.count() === 0) {
      report.issues.push('未找到姓名输入框')
    } else {
      // 检查是否有值
      const nameValue = await nameInput.first().inputValue()
      if (!nameValue) {
        report.warnings.push('姓名字段为空')
      } else {
        console.log(`✓ 姓名字段有值: ${nameValue}`)
      }
    }

    // 检查头像上传
    const avatarUpload = page.locator('input[type="file"], [class*="avatar"], [class*="Avatar"]')
    if (await avatarUpload.count() === 0) {
      report.warnings.push('未找到头像上传功能')
    }

    // 检查保存按钮
    const saveBtn = page.locator('button[type="submit"], button:has-text("保存"), button:has-text("Save")')
    if (await saveBtn.count() === 0) {
      report.issues.push('未找到保存按钮')
    }

    // 表单功能检查
    report.issues.push(...await checkFormFunctionality(page))

    reports.push(report)

    if (report.issues.length > 0) {
      console.log(`\n❌ Settings/Profile 问题:\n${report.issues.map(i => `  - ${i}`).join('\n')}`)
    }
  })

  test('外观设置页', async ({ page }) => {
    const report: TestReport = {
      page: 'Settings - Appearance',
      issues: [],
      warnings: [],
      screenshots: [],
    }

    await page.goto('/settings/appearance')
    await page.waitForLoadState('networkidle')

    await page.screenshot({ path: 'test-results/screenshots/settings-appearance.png', fullPage: true })

    // 检查主题选项
    const themeOptions = page.locator('button, [role="radio"], [role="tab"]').filter({
      hasText: /浅色|深色|系统|Light|Dark|System/i
    })
    const themeCount = await themeOptions.count()

    if (themeCount < 2) {
      report.issues.push('主题选项不足')
    } else {
      console.log(`✓ 找到 ${themeCount} 个主题选项`)

      // 尝试切换主题
      const darkOption = page.locator('button:has-text("深色"), button:has-text("Dark")')
      if (await darkOption.count() > 0) {
        await darkOption.first().click()
        await page.waitForTimeout(500)

        // 检查是否切换成功
        const html = page.locator('html')
        const classList = await html.getAttribute('class')
        const isDark = classList?.includes('dark') || false

        await page.screenshot({ path: 'test-results/screenshots/settings-dark-mode.png', fullPage: true })
        report.screenshots.push('settings-dark-mode.png')

        if (isDark) {
          console.log('✓ 深色模式切换成功')
        } else {
          report.warnings.push('深色模式切换可能未生效')
        }

        // 切回浅色
        const lightOption = page.locator('button:has-text("浅色"), button:has-text("Light")')
        if (await lightOption.count() > 0) {
          await lightOption.first().click()
          await page.waitForTimeout(500)
        }
      }
    }

    // 检查语言选项
    const langOptions = page.locator('select, [role="listbox"]').filter({ hasText: /中文|English|语言/i })
    if (await langOptions.count() > 0) {
      console.log('✓ 找到语言选项')
    }

    reports.push(report)
  })

  test('通知设置页', async ({ page }) => {
    const report: TestReport = {
      page: 'Settings - Notifications',
      issues: [],
      warnings: [],
      screenshots: [],
    }

    await page.goto('/settings/notifications')
    await page.waitForLoadState('networkidle')

    await page.screenshot({ path: 'test-results/screenshots/settings-notifications.png', fullPage: true })

    // 检查开关
    const toggles = page.locator('[role="switch"], input[type="checkbox"]')
    const toggleCount = await toggles.count()

    if (toggleCount === 0) {
      report.issues.push('未找到通知开关')
    } else {
      console.log(`✓ 找到 ${toggleCount} 个通知开关`)

      // 尝试切换一个开关
      const firstToggle = toggles.first()
      const initialState = await firstToggle.getAttribute('aria-checked') || await firstToggle.isChecked()

      await firstToggle.click()
      await page.waitForTimeout(500)

      const newState = await firstToggle.getAttribute('aria-checked') || await firstToggle.isChecked()

      if (initialState !== newState) {
        console.log('✓ 开关交互正常')
      } else {
        report.warnings.push('开关状态未变化')
      }

      // 恢复原状
      await firstToggle.click()
    }

    reports.push(report)
  })

  test('凭证管理页', async ({ page }) => {
    const report: TestReport = {
      page: 'Settings - Credentials',
      issues: [],
      warnings: [],
      screenshots: [],
    }

    await page.goto('/settings/credentials')
    await page.waitForLoadState('networkidle')

    await page.screenshot({ path: 'test-results/screenshots/settings-credentials.png', fullPage: true })

    // 检查添加按钮
    const addBtn = page.locator('button:has-text("添加"), button:has-text("新增"), button:has-text("Add")')
    if (await addBtn.count() === 0) {
      report.issues.push('未找到添加凭证按钮')
    } else {
      // 测试点击添加按钮
      await addBtn.first().click()
      await page.waitForTimeout(500)

      // 检查是否弹出表单
      const modal = page.locator('[role="dialog"], [data-state="open"], .modal')
      if (await modal.count() > 0) {
        console.log('✓ 添加凭证弹窗正常显示')

        await page.screenshot({ path: 'test-results/screenshots/credentials-add-modal.png' })
        report.screenshots.push('credentials-add-modal.png')

        // 关闭弹窗
        const closeBtn = page.locator('button:has-text("取消"), button:has-text("Cancel"), [aria-label*="close"]')
        if (await closeBtn.count() > 0) {
          await closeBtn.first().click()
        } else {
          await page.keyboard.press('Escape')
        }
      } else {
        report.warnings.push('点击添加按钮后未显示弹窗')
      }
    }

    reports.push(report)
  })
})

test.describe('Projects 页面测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSetup(page)
  })

  test('项目列表页', async ({ page }) => {
    const report: TestReport = {
      page: 'Projects List',
      issues: [],
      warnings: [],
      screenshots: [],
    }

    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    await page.screenshot({ path: 'test-results/screenshots/projects-list.png', fullPage: true })

    // 检查是否有项目列表或空状态
    const projectCards = page.locator('[class*="card"], [class*="project"]')
    const emptyState = page.locator(':text("没有项目"), :text("No projects"), :text("创建第一个")')

    const hasProjects = await projectCards.count() > 0
    const hasEmptyState = await emptyState.count() > 0

    if (!hasProjects && !hasEmptyState) {
      report.warnings.push('页面既无项目列表也无空状态提示')
    } else if (hasEmptyState) {
      console.log('✓ 显示空状态提示')
    } else {
      console.log(`✓ 找到 ${await projectCards.count()} 个项目`)
    }

    // 检查创建按钮
    const createBtn = page.locator('a[href*="create"], button:has-text("创建"), button:has-text("新建")')
    if (await createBtn.count() === 0) {
      report.issues.push('项目列表页缺少创建项目入口')
    }

    reports.push(report)
  })
})

test.describe('Pricing 页面测试', () => {
  test('定价页面检查', async ({ page }) => {
    const report: TestReport = {
      page: 'Pricing',
      issues: [],
      warnings: [],
      screenshots: [],
    }

    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')

    await page.screenshot({ path: 'test-results/screenshots/pricing-full.png', fullPage: true })

    // 检查定价卡片
    const pricingCards = page.locator('[class*="card"], [class*="plan"], [class*="pricing"]')
    const cardCount = await pricingCards.count()

    if (cardCount < 2) {
      report.warnings.push(`定价卡片数量较少: ${cardCount}`)
    } else {
      console.log(`✓ 找到 ${cardCount} 个定价方案`)
    }

    // 检查价格显示
    const prices = page.locator(':text("¥"), :text("$"), :text("/月"), :text("/年")')
    if (await prices.count() === 0) {
      report.issues.push('未找到价格显示')
    }

    // 检查订阅按钮
    const subscribeBtn = page.locator('button:has-text("订阅"), button:has-text("Subscribe"), button:has-text("开始"), button:has-text("升级")')
    if (await subscribeBtn.count() === 0) {
      report.warnings.push('未找到订阅按钮')
    }

    // 检查周期切换
    const cycleSwitcher = page.locator('button:has-text("月付"), button:has-text("年付"), [role="tablist"]')
    if (await cycleSwitcher.count() > 0) {
      console.log('✓ 有计费周期切换')

      // 尝试切换
      const yearlyBtn = page.locator('button:has-text("年付"), button:has-text("Yearly")')
      if (await yearlyBtn.count() > 0) {
        await yearlyBtn.click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: 'test-results/screenshots/pricing-yearly.png' })
        console.log('✓ 年付切换测试完成')
      }
    }

    reports.push(report)
  })
})

test.describe('响应式设计测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSetup(page)
  })

  test('移动端视图测试', async ({ page }) => {
    const report: TestReport = {
      page: 'Mobile View',
      issues: [],
      warnings: [],
      screenshots: [],
    }

    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // 关闭弹窗
    const skipBtn = page.locator('button:has-text("跳过")')
    if (await skipBtn.count() > 0) {
      await skipBtn.first().click()
      await page.waitForTimeout(500)
    }

    await page.screenshot({ path: 'test-results/screenshots/mobile-dashboard.png', fullPage: true })

    // 检查是否有汉堡菜单
    const hamburger = page.locator('[aria-label*="menu"], button:has(svg[class*="menu"]), .hamburger')
    const hasHamburger = await hamburger.count() > 0

    // 检查内容是否溢出
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })

    if (hasHorizontalScroll) {
      report.issues.push('移动端存在水平滚动条（内容溢出）')
    }

    // 检查字体大小
    const tinyText = await page.evaluate(() => {
      const elements = document.querySelectorAll('p, span, a, button')
      for (const el of elements) {
        const fontSize = parseFloat(window.getComputedStyle(el).fontSize)
        if (fontSize < 12 && el.textContent?.trim()) {
          return el.textContent?.slice(0, 30)
        }
      }
      return null
    })

    if (tinyText) {
      report.warnings.push(`发现过小字体: "${tinyText}"`)
    }

    // 测试其他页面
    const pages = ['/create', '/settings/profile', '/projects']
    for (const path of pages) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: `test-results/screenshots/mobile${path.replace(/\//g, '-')}.png` })
    }

    reports.push(report)

    if (report.issues.length > 0) {
      console.log(`\n❌ 移动端问题:\n${report.issues.map(i => `  - ${i}`).join('\n')}`)
    }
  })

  test('平板视图测试', async ({ page }) => {
    // 设置平板视口
    await page.setViewportSize({ width: 768, height: 1024 })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const skipBtn = page.locator('button:has-text("跳过")')
    if (await skipBtn.count() > 0) {
      await skipBtn.first().click()
      await page.waitForTimeout(500)
    }

    await page.screenshot({ path: 'test-results/screenshots/tablet-dashboard.png', fullPage: true })

    // 检查布局
    const sidebar = page.locator('[class*="sidebar"], aside, nav')
    const hasSidebar = await sidebar.count() > 0

    console.log(`平板视图 - 侧边栏: ${hasSidebar ? '显示' : '隐藏'}`)
  })
})

// 最终报告
test.afterAll(async () => {
  console.log('\n' + '='.repeat(60))
  console.log('                    测试报告总结')
  console.log('='.repeat(60))

  let totalIssues = 0
  let totalWarnings = 0

  for (const report of reports) {
    if (report.issues.length > 0 || report.warnings.length > 0) {
      console.log(`\n📄 ${report.page}:`)
      if (report.issues.length > 0) {
        console.log(`   ❌ 问题 (${report.issues.length}):`)
        report.issues.forEach(i => console.log(`      - ${i}`))
        totalIssues += report.issues.length
      }
      if (report.warnings.length > 0) {
        console.log(`   ⚠️ 警告 (${report.warnings.length}):`)
        report.warnings.forEach(w => console.log(`      - ${w}`))
        totalWarnings += report.warnings.length
      }
    }
  }

  console.log('\n' + '-'.repeat(60))
  console.log(`总计: ${totalIssues} 个问题, ${totalWarnings} 个警告`)
  console.log('截图保存在: test-results/screenshots/')
  console.log('='.repeat(60) + '\n')
})
