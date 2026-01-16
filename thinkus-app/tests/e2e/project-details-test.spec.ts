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

test.describe('Project Details Page Testing', () => {
  test.setTimeout(60000)

  test('should display project details page correctly', async ({ page }) => {
    await login(page)

    // Go to projects list
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: 'test-results/screenshots/project-details-01-list.png',
      fullPage: true
    })

    // Click on the first project
    const firstProject = page.locator('a[href*="/projects/"]').first()
    if (await firstProject.count() > 0) {
      await firstProject.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500)

      await page.screenshot({
        path: 'test-results/screenshots/project-details-02-details.png',
        fullPage: true
      })

      // Check for key elements
      const pageTitle = page.locator('h1, h2').first()
      const hasTitles = await pageTitle.count() > 0

      expect(hasTitles).toBeTruthy()
    }
  })

  test('should capture templates page', async ({ page }) => {
    await login(page)

    await page.goto('/templates')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: 'test-results/screenshots/project-details-03-templates.png',
      fullPage: true
    })
  })

  test('should capture executives/experts page', async ({ page }) => {
    await login(page)

    await page.goto('/executives')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: 'test-results/screenshots/project-details-04-executives.png',
      fullPage: true
    })

    // Also check experts page
    await page.goto('/experts')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: 'test-results/screenshots/project-details-05-experts.png',
      fullPage: true
    })
  })

  test('should capture CEO workbench page', async ({ page }) => {
    await login(page)

    await page.goto('/ceo')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: 'test-results/screenshots/project-details-06-ceo.png',
      fullPage: true
    })
  })
})
