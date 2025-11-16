import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Directory where your E2E tests will live
  testDir: './e2e',

  // Use 'dot' reporter for CI, 'list' for local
  reporter: process.env.CI ? 'dot' : 'list',

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    // This matches the Flask server's default port.
    baseURL: 'http://localhost:5000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
  },

  // This is the magic!
  // It tells Playwright how to start your backend server.
  webServer: {
    // Command to start the server
    command: 'python server/app.py', //

    // URL to poll to check if the server is ready
    // We use the /health endpoint defined in app.py
    url: 'http://localhost:5000/health', //

    // Wait up to 30 seconds for the server to start
    timeout: 30 * 1000,

    // Don't restart the server if it's already running (good for local dev)
    reuseExistingServer: !process.env.CI,
  },
});
