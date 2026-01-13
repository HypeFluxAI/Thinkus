module.exports = {
  ci: {
    collect: {
      // Static hosting / server
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready',
      startServerReadyTimeout: 60000,
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/login',
        'http://localhost:3000/pricing',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        // Skip some audits that don't apply to local testing
        skipAudits: ['uses-http2'],
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance thresholds
        'first-contentful-paint': ['warn', { maxNumericValue: 3000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 500 }],
        'speed-index': ['warn', { maxNumericValue: 4000 }],

        // Accessibility thresholds
        'color-contrast': 'warn',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',

        // Best practices
        'errors-in-console': 'warn',
        'image-alt': 'error',

        // SEO
        'meta-description': 'warn',

        // Categories (scores out of 1)
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['warn', { minScore: 0.8 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
