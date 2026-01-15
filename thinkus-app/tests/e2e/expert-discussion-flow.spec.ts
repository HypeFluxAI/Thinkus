/**
 * 专家讨论流程完整测试
 * 模拟用户从需求输入到专家讨论到方案确认的全流程
 */
import { test, expect, Page } from '@playwright/test'

const TEST_USER = {
  email: 'test@thinkus.ai',
  password: 'Test123456!',
}

// 测试需求
const TEST_REQUIREMENT = '我想做一个宠物电商平台，用户可以浏览宠物商品、下单购买、查看订单状态。需要支持微信登录和支付。'

// 登录辅助函数
async function login(page: Page) {
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

test.describe('专家讨论完整流程测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('完整流程: 需求 → 讨论 → 确认 → 返回讨论', async ({ page }) => {
    console.log('\n========== 开始专家讨论流程测试 ==========\n')

    // ============ 第1步: 进入创建页面 ============
    console.log('📝 步骤1: 进入创建页面')
    await page.goto('/create')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'test-results/screenshots/flow-1-create-page.png', fullPage: true })

    // 检查阶段选择
    const stageCards = page.locator('[class*="card"]')
    const stageCount = await stageCards.count()
    console.log(`   找到 ${stageCount} 个阶段选项`)

    // 点击下一步
    const nextBtn = page.locator('button:has-text("下一步")')
    if (await nextBtn.count() > 0) {
      await nextBtn.click()
      await page.waitForTimeout(1000)
      console.log('   ✓ 点击下一步进入需求描述页面')
    } else {
      console.log('   ⚠️ 未找到下一步按钮')
    }

    await page.screenshot({ path: 'test-results/screenshots/flow-2-describe-page.png', fullPage: true })

    // ============ 第2步: 输入需求并等待AI识别功能 ============
    console.log('\n📝 步骤2: 输入需求')

    // 找到聊天输入框
    const chatInput = page.locator('textarea, input[placeholder*="描述"]').first()
    if (await chatInput.count() > 0) {
      await chatInput.fill(TEST_REQUIREMENT)
      console.log(`   输入需求: ${TEST_REQUIREMENT.substring(0, 50)}...`)

      // 使用Enter键发送消息 (更可靠)
      await chatInput.press('Enter')
      console.log('   ✓ 按回车发送需求')

      // 等待AI响应 - 需要等待足够长的时间让API响应并解析功能
      console.log('   等待AI响应...')

      // 等待用户消息出现在聊天界面
      await page.waitForSelector('[class*="message"], [class*="bubble"]', { timeout: 10000 }).catch(() => {
        console.log('   ⚠️ 未看到用户消息')
      })

      // 等待更长时间让AI完成响应 (API需要3-6秒，加上UI渲染)
      await page.waitForTimeout(10000)

      await page.screenshot({ path: 'test-results/screenshots/flow-3-ai-response.png', fullPage: true })

      // 检查是否识别到功能 - 查找实际的功能项（带有P0/P1/P2优先级标签的Badge）
      const featureItems = page.locator('div.rounded-lg:has(span:text("P0")), div.rounded-lg:has(span:text("P1")), div.rounded-lg:has(span:text("P2"))')
      const featureCount = await featureItems.count()
      if (featureCount > 0) {
        console.log(`   ✓ AI已识别 ${featureCount} 个功能`)
      } else {
        // 再等待一下，可能功能还在提取中
        console.log('   等待功能提取...')
        await page.waitForTimeout(5000)
        const retryCount = await featureItems.count()
        if (retryCount > 0) {
          console.log(`   ✓ AI已识别 ${retryCount} 个功能`)
        } else {
          console.log('   ⚠️ 未识别到功能项')
        }
      }
    } else {
      console.log('   ⚠️ 未找到输入框')
    }

    // ============ 第3步: 开始专家讨论 ============
    console.log('\n📝 步骤3: 开始专家讨论')

    // 等待更长时间确保功能被识别
    await page.waitForTimeout(3000)

    const discussBtn = page.locator('button:has-text("专家讨论"), button:has-text("开始讨论")')
    if (await discussBtn.count() > 0) {
      const isEnabled = await discussBtn.first().isEnabled()
      console.log(`   专家讨论按钮状态: ${isEnabled ? '可用' : '禁用'}`)

      if (isEnabled) {
        await discussBtn.first().click()
        console.log('   ✓ 点击开始专家讨论')

        // 等待页面跳转
        await page.waitForURL(/\/create\/discuss/, { timeout: 10000 }).catch(() => {
          console.log('   ⚠️ 页面未跳转到讨论页面')
        })
      } else {
        console.log('   ⚠️ 按钮禁用，可能需要先识别功能')

        // 尝试等待更长时间
        await page.waitForTimeout(5000)
        if (await discussBtn.first().isEnabled()) {
          await discussBtn.first().click()
          await page.waitForURL(/\/create\/discuss/, { timeout: 10000 })
        }
      }
    } else {
      console.log('   ⚠️ 未找到专家讨论按钮')
    }

    await page.screenshot({ path: 'test-results/screenshots/flow-4-discuss-page.png', fullPage: true })

    // ============ 第4步: 观察专家讨论 ============
    console.log('\n📝 步骤4: 观察专家讨论')

    // 检查是否在讨论页面
    const currentUrl = page.url()
    if (currentUrl.includes('/discuss')) {
      console.log('   ✓ 已进入讨论页面')

      // 等待专家讨论开始
      await page.waitForTimeout(3000)

      // 检查专家头像
      const expertAvatars = page.locator('[class*="avatar"], [class*="Avatar"]')
      const avatarCount = await expertAvatars.count()
      console.log(`   找到 ${avatarCount} 个专家头像`)

      // 检查讨论消息
      const messages = page.locator('[class*="message"], [class*="Message"]')
      let messageCount = await messages.count()
      console.log(`   当前讨论消息数: ${messageCount}`)

      // 等待讨论进行
      console.log('   等待讨论进行中...')
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(5000)
        const newCount = await messages.count()
        if (newCount > messageCount) {
          console.log(`   → 新增消息: ${newCount - messageCount} 条`)
          messageCount = newCount
        }
        await page.screenshot({ path: `test-results/screenshots/flow-5-discuss-round-${i + 1}.png`, fullPage: true })
      }

      // 检查是否有确认方案按钮
      const confirmBtn = page.locator('button:has-text("确认方案"), button:has-text("确认")')
      const canConfirm = await confirmBtn.count() > 0 && await confirmBtn.first().isEnabled()
      console.log(`   确认方案按钮: ${canConfirm ? '可用' : '等待中'}`)

      // 等待讨论完成
      if (!canConfirm) {
        console.log('   继续等待讨论完成...')
        await page.waitForTimeout(30000) // 等待更长时间
        await page.screenshot({ path: 'test-results/screenshots/flow-6-discuss-waiting.png', fullPage: true })
      }

      // ============ 第5步: 确认方案 ============
      console.log('\n📝 步骤5: 确认方案')

      const confirmBtnFinal = page.locator('button:has-text("确认方案"), button:has-text("确认")')
      if (await confirmBtnFinal.count() > 0 && await confirmBtnFinal.first().isEnabled()) {
        await confirmBtnFinal.first().click()
        console.log('   ✓ 点击确认方案')

        await page.waitForURL(/\/create\/confirm/, { timeout: 10000 }).catch(() => {
          console.log('   ⚠️ 页面未跳转到确认页面')
        })

        await page.screenshot({ path: 'test-results/screenshots/flow-7-confirm-page.png', fullPage: true })

        // ============ 第6步: 检查确认页面 ============
        console.log('\n📝 步骤6: 检查确认页面')

        // 检查项目名称
        const projectName = page.locator('h1, [class*="title"]').first()
        if (await projectName.count() > 0) {
          const name = await projectName.textContent()
          console.log(`   项目名称: ${name}`)
        }

        // 检查功能列表
        const features = page.locator('[class*="feature"], li:has(svg)')
        const featureCount = await features.count()
        console.log(`   功能数量: ${featureCount}`)

        if (featureCount === 0) {
          console.log('   ❌ 未识别到功能！这是一个问题')
        }

        // 检查价格
        const price = page.locator(':text("$"), :text("¥"), :text("预估价格")')
        if (await price.count() > 0) {
          const priceText = await price.first().textContent()
          console.log(`   价格显示: ${priceText}`)
        }

        // ============ 第7步: 返回继续讨论 ============
        console.log('\n📝 步骤7: 测试返回继续讨论')

        const backBtn = page.locator('button:has-text("继续讨论"), button:has-text("返回")')
        if (await backBtn.count() > 0) {
          await backBtn.first().click()
          console.log('   ✓ 点击继续讨论')

          await page.waitForTimeout(2000)
          await page.screenshot({ path: 'test-results/screenshots/flow-8-back-to-discuss.png', fullPage: true })

          // 检查是否恢复了之前的讨论
          const currentUrl = page.url()
          if (currentUrl.includes('/discuss')) {
            console.log('   ✓ 成功返回讨论页面')

            // 检查消息是否保留
            const restoredMessages = page.locator('[class*="message"], [class*="Message"]')
            const restoredCount = await restoredMessages.count()
            console.log(`   恢复的消息数: ${restoredCount}`)

            if (restoredCount === 0) {
              console.log('   ❌ 讨论记录丢失！这是数据隔离问题')
            }
          }
        } else {
          console.log('   ⚠️ 未找到返回按钮')
        }

        // ============ 第8步: 再次确认方案 ============
        console.log('\n📝 步骤8: 再次确认方案')

        const confirmAgain = page.locator('button:has-text("确认方案"), button:has-text("确认")')
        if (await confirmAgain.count() > 0 && await confirmAgain.first().isEnabled()) {
          await confirmAgain.first().click()
          await page.waitForTimeout(2000)
          await page.screenshot({ path: 'test-results/screenshots/flow-9-confirm-again.png', fullPage: true })

          // 检查功能是否还在
          const featuresAgain = page.locator('[class*="feature"], li:has(svg)')
          const featureCountAgain = await featuresAgain.count()
          console.log(`   第二次确认页面功能数: ${featureCountAgain}`)

          if (featureCountAgain !== featureCount) {
            console.log(`   ❌ 功能数量不一致！之前: ${featureCount}, 现在: ${featureCountAgain}`)
          }
        }
      } else {
        console.log('   ⚠️ 讨论未完成，无法确认方案')
      }
    } else {
      console.log(`   ⚠️ 未进入讨论页面，当前URL: ${currentUrl}`)
    }

    console.log('\n========== 测试完成 ==========\n')
  })

  test('测试不同项目数据隔离', async ({ page, context }) => {
    console.log('\n========== 数据隔离测试 ==========\n')

    // 创建第一个项目
    console.log('📝 创建第一个项目')
    await page.goto('/create')
    await page.waitForLoadState('networkidle')

    // 点击下一步
    const nextBtn = page.locator('button:has-text("下一步")')
    if (await nextBtn.count() > 0) {
      await nextBtn.click()
      await page.waitForTimeout(1000)
    }

    // 输入第一个需求
    const chatInput1 = page.locator('textarea, input[placeholder*="描述"]').first()
    if (await chatInput1.count() > 0) {
      await chatInput1.fill('第一个项目：电商平台')
      await chatInput1.press('Enter')
      await page.waitForTimeout(3000)
      console.log('   ✓ 输入第一个项目需求')
    }

    await page.screenshot({ path: 'test-results/screenshots/isolation-1-first-project.png', fullPage: true })

    // 打开新标签页创建第二个项目
    console.log('\n📝 在新标签页创建第二个项目')
    const page2 = await context.newPage()
    await login(page2)
    await page2.goto('/create')
    await page2.waitForLoadState('networkidle')

    const nextBtn2 = page2.locator('button:has-text("下一步")')
    if (await nextBtn2.count() > 0) {
      await nextBtn2.click()
      await page2.waitForTimeout(1000)
    }

    // 输入第二个需求
    const chatInput2 = page2.locator('textarea, input[placeholder*="描述"]').first()
    if (await chatInput2.count() > 0) {
      await chatInput2.fill('第二个项目：社交媒体应用')
      await chatInput2.press('Enter')
      await page2.waitForTimeout(3000)
      console.log('   ✓ 输入第二个项目需求')
    }

    await page2.screenshot({ path: 'test-results/screenshots/isolation-2-second-project.png', fullPage: true })

    // 回到第一个标签页检查
    console.log('\n📝 检查第一个项目是否被覆盖')
    await page.bringToFront()
    await page.reload()
    await page.waitForLoadState('networkidle')

    await page.screenshot({ path: 'test-results/screenshots/isolation-3-check-first.png', fullPage: true })

    // 检查内容是否被覆盖
    const content = await page.content()
    if (content.includes('社交媒体') && !content.includes('电商平台')) {
      console.log('   ❌ 数据被第二个项目覆盖！')
    } else if (content.includes('电商平台')) {
      console.log('   ✓ 第一个项目数据保持独立')
    }

    await page2.close()

    console.log('\n========== 数据隔离测试完成 ==========\n')
  })
})
