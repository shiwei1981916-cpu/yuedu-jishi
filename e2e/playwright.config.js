const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 30000,
  use: {
    headless: true,
    baseURL: process.env.BASE_URL || 'http://localhost:8123',
  },
  reporter: [
    ['list'],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ['html', { open: 'never', outputFolder: 'reports' }],
  ],
});
