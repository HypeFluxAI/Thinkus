import { test, expect } from '@playwright/test'

test.describe('UI Screenshot Testing', () => {
  test.setTimeout(120000)

  test('capture homepage', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'test-results/screenshots/01-homepage.png',
      fullPage: true
    })
  })

  test('capture login page', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'test-results/screenshots/02-login.png',
      fullPage: true
    })
  })

  test('capture dashboard after login', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Fill login form
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Wait for redirect and capture
    await page.waitForURL(/dashboard|create/, { timeout: 10000 }).catch(() => {})
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'test-results/screenshots/03-dashboard.png',
      fullPage: true
    })
  })

  test('capture create page', async ({ page }) => {
    await page.goto('/create')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'test-results/screenshots/04-create.png',
      fullPage: true
    })
  })

  test('capture discuss page', async ({ page }) => {
    await page.goto('/create/discuss')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'test-results/screenshots/05-discuss.png',
      fullPage: true
    })
  })

  test('capture projects page', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'test-results/screenshots/06-projects.png',
      fullPage: true
    })
  })

  test('capture settings page', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'test-results/screenshots/07-settings.png',
      fullPage: true
    })
  })

  test('capture pricing page', async ({ page }) => {
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'test-results/screenshots/08-pricing.png',
      fullPage: true
    })
  })
})
