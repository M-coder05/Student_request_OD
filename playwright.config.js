const crypto = require('node:crypto');
const { defineConfig, devices } = require('@playwright/test');
const { getTestEnvironment } = require('./e2e/helpers/test-environment');

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  globalSetup: require.resolve('./e2e/global-setup'),
  globalTeardown: require.resolve('./e2e/global-teardown'),
  reporter: 'list',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:5055',
    ...devices['Desktop Chrome'],
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node e2e/start-server.js',
    url: 'http://127.0.0.1:5055/api/health',
    timeout: 120_000,
    reuseExistingServer: false,
    env: getTestEnvironment(crypto.randomBytes(32).toString('hex')),
  },
});
