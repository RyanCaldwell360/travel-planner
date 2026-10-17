import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';
const dir = process.env.E2E_DATA_DIR ?? `/tmp/travel-planner-e2e-${process.pid}`;
process.env.E2E_DATA_DIR = dir;
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    actionTimeout: 10000,
    viewport: { width: 1440, height: 1050 },
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ??
        (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
      args: ['--no-sandbox'],
    },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm start',
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: false,
      env: {
        PORT: '3100',
        DATA_DIR: dir,
        HOST: '127.0.0.1',
        AMADEUS_CLIENT_ID: '',
        AMADEUS_CLIENT_SECRET: '',
      },
      timeout: 30000,
    },
    {
      command: 'tsx tests/cloudflare-browser-server.ts',
      url: 'http://127.0.0.1:3200/healthz',
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
