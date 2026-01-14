/**
 * 检查 create 页面
 */
import { chromium } from 'playwright'

const TEST_USER = {
  email: 'test@thinkus.ai',
  password: 'Test123456!',
}

async function checkCreatePage() {
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
    console.log('✓ 登录成功')
  } catch {
    console.log('✗ 登录失败')
    await browser.close()
    return
  }

  // 关闭欢迎弹窗
  await page.waitForTimeout(1000)
  const skipBtn = page.locator('button:has-text("跳过引导"), button:has-text("跳过")')
  if (await skipBtn.count() > 0) {
    await skipBtn.first().click()
    await page.waitForTimeout(500)
  }

  console.log('\n2. 访问 /create 页面...')
  await page.goto('http://localhost:3000/create')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // 截图
  await page.screenshot({ path: 'test-results/screenshots/create-logged-in.png', fullPage: true })
  console.log('✓ 截图保存: create-logged-in.png')

  // 检查页面内容
  const pageContent = await page.content()
  const url = page.url()
  console.log(`\n当前 URL: ${url}`)

  // 检查是否有错误
  const errorElements = await page.locator('[class*="error"], .text-destructive').count()
  if (errorElements > 0) {
    console.log(`⚠️ 发现 ${errorElements} 个错误元素`)
  }

  // 检查控制台错误
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ 控制台错误: ${msg.text()}`)
    }
  })

  // 等待可能的错误
  await page.waitForTimeout(2000)

  // 检查页面结构
  console.log('\n3. 页面结构检查:')

  const stageCards = await page.locator('[class*="card"]').count()
  console.log(`   - 卡片数量: ${stageCards}`)

  const buttons = await page.locator('button').count()
  console.log(`   - 按钮数量: ${buttons}`)

  const nextBtn = await page.locator('button:has-text("下一步")').count()
  console.log(`   - 下一步按钮: ${nextBtn > 0 ? '✓' : '✗'}`)

  // 尝试点击下一步
  if (nextBtn > 0) {
    console.log('\n4. 点击下一步...')
    await page.locator('button:has-text("下一步")').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'test-results/screenshots/create-step2-logged-in.png', fullPage: true })
    console.log('✓ 截图保存: create-step2-logged-in.png')
    console.log(`   当前 URL: ${page.url()}`)
  }

  await browser.close()
  console.log('\n✓ 检查完成')
}

checkCreatePage().catch(console.error)
