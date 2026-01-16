import { test, expect, Page } from '@playwright/test'

test.describe('Full UI Testing with Authentication', () => {
  test.setTimeout(180000)

  // Helper function to login
  async function login(page: Page) {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Use the email tab (default)
    const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()

    await emailInput.fill('test@example.com')
    await passwordInput.fill('password123')

    // Click login button
    await page.click('button[type="submit"]')

    // Wait for navigation
    await page.waitForTimeout(3000)
  }

  test('1. Public Pages', async ({ page }) => {
    // Homepage
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'test-results/screenshots/public-01-homepage.png',
      fullPage: true
    })

    // Login page
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'test-results/screenshots/public-02-login.png',
      fullPage: true
    })

    // Register page
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'test-results/screenshots/public-03-register.png',
      fullPage: true
    })
  })

  test('2. Dashboard After Login', async ({ page }) => {
    await login(page)

    // Navigate to dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: 'test-results/screenshots/auth-01-dashboard.png',
      fullPage: true
    })
  })

  test('3. Create Project Flow', async ({ page }) => {
    await login(page)

    // Create page
    await page.goto('/create')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: 'test-results/screenshots/auth-02-create.png',
      fullPage: true
    })
  })

  test('4. Projects List', async ({ page }) => {
    await login(page)

    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: 'test-results/screenshots/auth-03-projects.png',
      fullPage: true
    })
  })

  test('5. Settings Pages', async ({ page }) => {
    await login(page)

    // Profile settings
    await page.goto('/settings/profile')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: 'test-results/screenshots/auth-04-settings-profile.png',
      fullPage: true
    })

    // Appearance settings
    await page.goto('/settings/appearance')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: 'test-results/screenshots/auth-05-settings-appearance.png',
      fullPage: true
    })

    // Credentials settings
    await page.goto('/settings/credentials')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: 'test-results/screenshots/auth-06-settings-credentials.png',
      fullPage: true
    })
  })

  test('6. Templates and Pricing', async ({ page }) => {
    await login(page)

    // Templates
    await page.goto('/templates')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: 'test-results/screenshots/auth-07-templates.png',
      fullPage: true
    })

    // Pricing
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: 'test-results/screenshots/auth-08-pricing.png',
      fullPage: true
    })
  })

  test('7. Executives Page', async ({ page }) => {
    await login(page)

    await page.goto('/executives')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: 'test-results/screenshots/auth-09-executives.png',
      fullPage: true
    })
  })
})
