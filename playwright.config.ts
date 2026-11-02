import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: process.env.WEB_URL ?? 'http://localhost:8080', headless: true },
  reporter: 'list',
  timeout: 30000,
});
