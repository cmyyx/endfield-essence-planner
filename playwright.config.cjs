const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/phase-08-03/e2e",
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    browserName: "chromium",
    headless: true,
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
  },
});
