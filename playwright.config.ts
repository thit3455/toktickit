import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',

  timeout: 30 * 1000,

  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'tablet',
      use: { ...devices['iPad Mini'] },
    },

    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
});