import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: 'npm run dev',
    port: 5173,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  testDir: 'tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
  },
});