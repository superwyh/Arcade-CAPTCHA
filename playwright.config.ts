import { existsSync } from 'node:fs';
import { chromium, defineConfig } from '@playwright/test';

const chromePaths = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];
const channel = process.env.PLAYWRIGHT_CHANNEL || (!process.env.CI && !existsSync(chromium.executablePath()) && chromePaths.some(path => existsSync(path)) ? 'chrome' : undefined);

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  outputDir: '.qa/browser-results',
  use: {
    browserName: 'chromium', channel,
    baseURL: 'http://127.0.0.1:4175', locale: 'en-US',
    viewport: { width: 1280, height: 800 }, screenshot: 'only-on-failure', trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175', reuseExistingServer: false,
  },
});
