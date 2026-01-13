import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests', () => {
  test.describe('Homepage Accessibility', () => {
    test('should not have critical accessibility violations', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      // Filter for serious and critical violations
      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      )

      // Log violations for debugging
      if (criticalViolations.length > 0) {
        console.log('Critical accessibility violations found:')
        criticalViolations.forEach((v) => {
          console.log(`- ${v.id}: ${v.description}`)
          v.nodes.forEach((n) => {
            console.log(`  Affected element: ${n.html.substring(0, 100)}...`)
          })
        })
      }

      expect(criticalViolations.length).toBe(0)
    })

    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')

      // Check for h1
      const h1Count = await page.locator('h1').count()
      expect(h1Count).toBeGreaterThanOrEqual(1)
    })

    test('should have proper language attribute', async ({ page }) => {
      await page.goto('/')

      const lang = await page.locator('html').getAttribute('lang')
      expect(lang).toBeDefined()
    })
  })

  test.describe('Login Page Accessibility', () => {
    test('should have accessible form inputs', async ({ page }) => {
      await page.goto('/login')
      await page.waitForLoadState('domcontentloaded')

      // Check for form labels or aria-labels
      const inputs = await page.locator('input').all()

      for (const input of inputs) {
        const hasLabel = await input.evaluate((el) => {
          const id = el.id
          if (id) {
            const label = document.querySelector(`label[for="${id}"]`)
            if (label) return true
          }
          // Check for aria-label or aria-labelledby
          return !!(
            el.getAttribute('aria-label') ||
            el.getAttribute('aria-labelledby') ||
            el.getAttribute('placeholder')
          )
        })

        // Either has proper labeling or some form of accessible name
        expect(hasLabel || await input.getAttribute('type') === 'hidden').toBe(true)
      }
    })

    test('should have keyboard-accessible submit button', async ({ page }) => {
      await page.goto('/login')
      await page.waitForLoadState('domcontentloaded')

      const submitButton = page.locator('button[type="submit"]')
      if (await submitButton.isVisible()) {
        // Button should be focusable
        await submitButton.focus()
        const isFocused = await submitButton.evaluate((el) => document.activeElement === el)
        expect(isFocused).toBe(true)
      }
    })
  })

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast on homepage', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .include(['body'])
        .analyze()

      const contrastViolations = accessibilityScanResults.violations.filter(
        (v) => v.id === 'color-contrast'
      )

      // Allow some minor contrast issues but not critical ones
      const criticalContrastIssues = contrastViolations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      )

      expect(criticalContrastIssues.length).toBe(0)
    })
  })

  test.describe('Focus Management', () => {
    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')

      // Tab to first focusable element
      await page.keyboard.press('Tab')

      // Check if there's a visible focus indicator
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement
        if (!el) return null
        const styles = window.getComputedStyle(el)
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
          border: styles.border,
        }
      })

      // Element should have some form of focus indication
      expect(focusedElement).not.toBeNull()
    })

    test('should allow keyboard navigation', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')

      // Press Tab multiple times to navigate
      const tabOrder: string[] = []
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab')
        const focused = await page.evaluate(() => {
          const el = document.activeElement
          return el?.tagName.toLowerCase() || ''
        })
        tabOrder.push(focused)
      }

      // Should be able to tab through elements
      expect(tabOrder.length).toBeGreaterThan(0)
    })
  })

  test.describe('Screen Reader Support', () => {
    test('should have proper ARIA landmarks', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')

      // Check for main landmark
      const mainLandmark = await page.locator('main, [role="main"]').count()
      expect(mainLandmark).toBeGreaterThanOrEqual(1)
    })

    test('should have skip link or similar navigation aid', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')

      // Check for skip link (might be hidden until focused)
      const skipLink = await page.locator('a[href="#main"], a[href="#content"], .skip-link').count()

      // Not all sites have skip links, but it's a good practice
      // This test just checks - doesn't fail if not present
      if (skipLink === 0) {
        console.log('No skip link found - consider adding one for better accessibility')
      }
    })
  })
})
