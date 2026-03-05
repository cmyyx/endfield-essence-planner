const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { startStaticServer } = require("../helpers/static-server.cjs");

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const RETRY_TEXT = /重试加载|重試載入|Retry|再試行/i;

const createServer = (options = {}) =>
  startStaticServer({
    rootDir: PROJECT_ROOT,
    ...options,
  });

test("boots planner app on normal static startup", async ({ page }) => {
  const server = await createServer();
  try {
    await page.goto(`${server.url}/index.html`, { waitUntil: "domcontentloaded" });
    await expect(
      page.locator(".main-nav"),
      "startup success path should render the main nav in #app"
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("button", { name: RETRY_TEXT }),
      "success path should not show fallback retry control"
    ).toHaveCount(0);
  } finally {
    await server.close();
  }
});

test("shows fallback retry page when critical script-chain fails", async ({ page }) => {
  const server = await createServer({
    failPaths: ["/js/app.script-chain.js"],
  });
  try {
    await page.goto(`${server.url}/index.html`, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("button", { name: RETRY_TEXT }),
      "critical resource failure should render retry action on fallback page"
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator(".main-nav"),
      "fallback path should not report main app ready"
    ).toHaveCount(0);
  } finally {
    await server.close();
  }
});
