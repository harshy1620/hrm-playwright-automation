const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',

  retries: process.env.CI ? 2 : 0,
  fullyParallel: true,
  timeout: 120 * 1000,

  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list']
  ],

  use: {
    baseURL: 'https://opensource-demo.orangehrmlive.com',
    actionTimeout: 15 * 1000,
    // Fail fast when the shared demo site does not respond, instead of using the whole test timeout
    navigationTimeout: 30 * 1000,

    video: 'on',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chrome',
      // Uses the installed Google Chrome instead of Playwright's downloaded Chromium
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});
