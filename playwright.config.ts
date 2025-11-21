import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E API testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: false, // Run tests serially to avoid database conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to prevent race conditions

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list']
  ],

  // Global test settings
  use: {
    baseURL: process.env.API_URL || 'http://localhost:45000',
    trace: 'on-first-retry',
    extraHTTPHeaders: {
      'Content-Type': 'application/json'
    }
  },

  // Configure projects for different test scenarios
  projects: [
    {
      name: 'api-e2e',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run API server before tests (optional - can be started separately)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:45000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});
