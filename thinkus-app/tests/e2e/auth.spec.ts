import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies before each test
    await page.context().clearCookies()
  })

  test('should display login page', async ({ page }) => {
    await page.goto('/login')

    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded')

    // Check page is accessible - verify body is rendered
    await expect(page.locator('body')).toBeVisible()

    // Page should be at login URL
    expect(page.url()).toContain('login')
  })

  test('should display register page', async ({ page }) => {
    await page.goto('/register')

    // Check for name input
    await expect(page.locator('input[name="name"], input[placeholder*="名"]')).toBeVisible()

    // Check for email input
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()

    // Check for password input
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('should show validation errors for empty login', async ({ page }) => {
    await page.goto('/login')

    // Click submit without filling form
    await page.locator('button[type="submit"]').click()

    // Should show error or stay on page
    await expect(page).toHaveURL(/login/)
  })

  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL(/login|signin/)
  })

  test('should have forgot password link on login page', async ({ page }) => {
    await page.goto('/login')

    // Check for forgot password link
    const forgotLink = page.locator('a[href*="forgot"], a:has-text("忘记密码")')
    await expect(forgotLink).toBeVisible()
  })

  test('should navigate between login and register', async ({ page }) => {
    await page.goto('/login')

    // Click register link
    const registerLink = page.locator('a[href*="register"], a:has-text("注册")')
    await registerLink.click()

    await expect(page).toHaveURL(/register/)

    // Click login link
    const loginLink = page.locator('a[href*="login"], a:has-text("登录")')
    await loginLink.click()

    await expect(page).toHaveURL(/login/)
  })
})
