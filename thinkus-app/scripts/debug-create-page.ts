/**
 * 详细调试 create 页面
 */
import { chromium } from 'playwright'

const TEST_USER = {
  email: 'test@thinkus.ai',
  password: 'Test123456!',
}

async function debugCreatePage() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  })
  const page = await context.newPage()

  // 收集控制台消息
  const consoleLogs: string[] = []
  const consoleErrors: string[] = []

  page.on('console', msg => {
    const text = msg.text()
    if (msg.type() === 'error') {
      consoleErrors.push(text)
    } else if (msg.type() === 'warning') {
      consoleLogs.push(`[WARN] ${text}`)
    }
  })

  // 收集网络错误
  const networkErrors: string[] = []
  page.on('requestfailed', request => {
    networkErrors.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`)
  })

  // 收集页面错误
  const pageErrors: string[] = []
  page.on('pageerror', error => {
    pageErrors.push(error.message)
  })

  console.log('1. 登录...')
  await page.goto('http://localhost:3000/login')
  await page.waitForLoadState('networkidle')

  await page.locator('input[type="email"]').fill(TEST_USER.email)
  await page.locator('input[type="password"]').fill(TEST_USER.password)
  await page.click('button[type="submit"]')

  try {
    await page.waitForURL(/\/(dashboard|create|projects)/, { timeout: 30000 })
  } catch {
    console.log('✗ 登录失败')
    await browser.close()
    return
  }

  // 关闭欢迎弹窗
  await page.waitForTimeout(1500)
  const skipBtn = page.locator('button:has-text("跳过引导"), button:has-text("跳过")')
  if (await skipBtn.count() > 0) {
    await skipBtn.first().click()
    await page.waitForTimeout(500)
  }

  console.log('\n2. 访问 /create 页面...')
  await page.goto('http://localhost:3000/create')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  console.log('\n=== 调试信息 ===\n')

  // 检查 URL
  console.log(`当前 URL: ${page.url()}`)

  // 检查页面标题
  const title = await page.title()
  console.log(`页面标题: ${title}`)

  // 检查可见文本
  const visibleText = await page.locator('body').innerText()
  console.log(`\n页面文本内容 (前500字符):\n${visibleText.slice(0, 500)}`)

  // 输出错误
  if (consoleErrors.length > 0) {
    console.log('\n❌ 控制台错误:')
    consoleErrors.forEach(e => console.log(`   ${e.slice(0, 200)}`))
  } else {
    console.log('\n✓ 无控制台错误')
  }

  if (networkErrors.length > 0) {
    console.log('\n❌ 网络错误:')
    networkErrors.forEach(e => console.log(`   ${e}`))
  } else {
    console.log('✓ 无网络错误')
  }

  if (pageErrors.length > 0) {
    console.log('\n❌ 页面错误:')
    pageErrors.forEach(e => console.log(`   ${e.slice(0, 200)}`))
  } else {
    console.log('✓ 无页面错误')
  }

  // 检查关键元素
  console.log('\n=== 元素检查 ===')

  const checks = [
    { name: '阶段选择卡片', selector: '[class*="card"]' },
    { name: '下一步按钮', selector: 'button:has-text("下一步")' },
    { name: '返回按钮', selector: 'a[href], button:has-text("返回")' },
    { name: '步骤指示器', selector: ':text("选择阶段"), :text("描述需求")' },
    { name: '加载状态', selector: '[class*="loading"], [class*="spinner"], .animate-spin' },
    { name: '错误提示', selector: '[class*="error"], .text-destructive, [role="alert"]' },
  ]

  for (const check of checks) {
    const count = await page.locator(check.selector).count()
    console.log(`   ${check.name}: ${count > 0 ? `✓ (${count}个)` : '✗ 未找到'}`)
  }

  // 截图整个页面
  await page.screenshot({ path: 'test-results/screenshots/create-debug.png', fullPage: true })
  console.log('\n截图已保存: create-debug.png')

  // 检查第二步
  console.log('\n3. 进入第二步...')
  const nextBtn = page.locator('button:has-text("下一步")')
  if (await nextBtn.count() > 0) {
    await nextBtn.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    console.log(`当前 URL: ${page.url()}`)

    // 检查第二步元素
    const step2Checks = [
      { name: '聊天输入框', selector: 'textarea, input[type="text"]' },
      { name: '发送按钮', selector: 'button[type="submit"], button:has(svg)' },
      { name: '小T头像/图标', selector: '[class*="avatar"], svg, img' },
      { name: '功能识别区域', selector: ':text("识别的功能"), :text("功能")' },
      { name: '专家讨论按钮', selector: 'button:has-text("专家讨论"), button:has-text("开始")' },
    ]

    console.log('\n=== 第二步元素检查 ===')
    for (const check of step2Checks) {
      const count = await page.locator(check.selector).count()
      console.log(`   ${check.name}: ${count > 0 ? `✓ (${count}个)` : '✗ 未找到'}`)
    }

    await page.screenshot({ path: 'test-results/screenshots/create-step2-debug.png', fullPage: true })
    console.log('\n截图已保存: create-step2-debug.png')

    // 尝试输入内容
    console.log('\n4. 测试输入功能...')
    const textarea = page.locator('textarea').first()
    if (await textarea.count() > 0) {
      await textarea.fill('我想做一个在线待办事项应用')
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'test-results/screenshots/create-input-test.png' })
      console.log('✓ 输入框功能正常')
    } else {
      console.log('✗ 未找到输入框')
    }
  }

  // 输出最终错误汇总
  if (consoleErrors.length > 0 || networkErrors.length > 0 || pageErrors.length > 0) {
    console.log('\n\n========== 错误汇总 ==========')
    if (consoleErrors.length > 0) {
      console.log(`控制台错误: ${consoleErrors.length} 个`)
      consoleErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e.slice(0, 150)}`))
    }
    if (pageErrors.length > 0) {
      console.log(`页面错误: ${pageErrors.length} 个`)
      pageErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e.slice(0, 150)}`))
    }
  }

  await browser.close()
  console.log('\n✓ 调试完成')
}

debugCreatePage().catch(console.error)
