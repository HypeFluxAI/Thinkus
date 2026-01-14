/**
 * 截图所有主要页面验证样式修复
 */
import { chromium } from 'playwright'

const TEST_USER = {
  email: 'test@thinkus.ai',
  password: 'Test123456!',
}

const PAGES_TO_CHECK = [
  { path: '/create', name: 'create' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/projects', name: 'projects' },
  { path: '/settings/profile', name: 'settings-profile' },
  { path: '/settings/appearance', name: 'settings-appearance' },
  { path: '/settings/credentials', name: 'settings-credentials' },
  { path: '/settings/notifications', name: 'settings-notifications' },
  { path: '/executives', name: 'executives' },
  { path: '/templates', name: 'templates' },
]

async function screenshotAllPages() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  })
  const page = await context.newPage()

  console.log('1. 登录...')
  await page.goto('http://localhost:3000/login')
  await page.waitForLoadState('networkidle')

  await page.locator('input[type="email"]').fill(TEST_USER.email)
  await page.locator('input[type="password"]').fill(TEST_USER.password)
  await page.click('button[type="submit"]')

  try {
    await page.waitForURL(/\/(dashboard|create|projects)/, { timeout: 30000 })
    console.log('✓ 登录成功\n')
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

  console.log('2. 截图各页面...\n')

  for (const pageInfo of PAGES_TO_CHECK) {
    try {
      console.log(`   访问 ${pageInfo.path}...`)
      await page.goto(`http://localhost:3000${pageInfo.path}`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // 关闭可能的弹窗
      const modal = page.locator('[data-state="open"] button:has-text("跳过"), [data-state="open"] [aria-label*="close"]')
      if (await modal.count() > 0) {
        await modal.first().click().catch(() => {})
        await page.waitForTimeout(300)
      }

      await page.screenshot({
        path: `test-results/screenshots/verify-${pageInfo.name}.png`,
        fullPage: true
      })
      console.log(`   ✓ ${pageInfo.name}.png`)
    } catch (error) {
      console.log(`   ✗ ${pageInfo.name} 失败: ${error}`)
    }
  }

  await browser.close()
  console.log('\n✓ 截图完成！查看: test-results/screenshots/verify-*.png')
}

screenshotAllPages().catch(console.error)
