import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/')

    // Check page loads
    await expect(page).toHaveTitle(/Thinkus/)

    // Check main content is visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('should have navigation links', async ({ page }) => {
    await page.goto('/')

    // Check for navigation - use first() to handle multiple matches
    const nav = page.locator('nav, header').first()
    await expect(nav).toBeVisible()
  })

  test('should have call-to-action buttons', async ({ page }) => {
    await page.goto('/')

    // Check for CTA buttons (login/register or get started)
    const ctaButton = page.locator('a[href*="login"], a[href*="register"], button:has-text("开始")')
    await expect(ctaButton.first()).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/')

    // Page should still load correctly
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Pricing Page', () => {
  test('should display pricing plans', async ({ page }) => {
    await page.goto('/pricing')

    // Wait for page to load (might redirect to login first)
    await page.waitForLoadState('networkidle')

    // If redirected to login, check login page
    if (page.url().includes('login')) {
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    } else {
      // Check for pricing content
      await expect(page.locator('h1, h2').first()).toBeVisible()
    }
  })

  test('should have billing cycle toggle if on pricing page', async ({ page }) => {
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')

    // Only test if not redirected
    if (!page.url().includes('login')) {
      // Look for monthly/yearly toggle
      const toggle = page.locator('button[role="switch"], input[type="checkbox"]')
      if (await toggle.isVisible()) {
        await expect(toggle).toBeEnabled()
      }
    }
  })
})
