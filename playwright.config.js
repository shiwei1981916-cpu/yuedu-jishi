const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  reporter: [['list'], ['json', { outputFile: 'e2e/reports/result.json' }]],
  webServer: {
    command: 'python3 -m http.server 8123',
    url: 'http://localhost:8123',
    reuseExistingServer: true,
    timeout: 30000,
  },
  use: {
    baseURL: 'http://localhost:8123',
    headless: true,
  },
});
