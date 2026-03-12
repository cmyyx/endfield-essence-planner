const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { startStaticServer } = require("../helpers/static-server.cjs");

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const RETRY_TEXT = /重试加载|重試載入|Retry|再試行/i;
const EXPORT_DIAG_TEXT = /导出诊断|匯出診斷|Export Diagnostics|診断をエクスポート/i;
const MANIFEST_PATH = path.join(PROJECT_ROOT, "js/app.resource-manifest.js");
const MANIFEST_SOURCE = fs.readFileSync(MANIFEST_PATH, "utf8");
const INVALID_MANIFEST_SOURCE = MANIFEST_SOURCE.replace(/scriptChain:\s*\[[\s\S]*?\n\s*\],/, "scriptChain: [],");
if (INVALID_MANIFEST_SOURCE === MANIFEST_SOURCE) {
  throw new Error("Failed to create invalid manifest source - regex may need update");
}

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

test("exports boot diagnostics bundle from fallback page", async ({ page }) => {
  const server = await createServer({
    failPaths: ["/js/app.script-chain.js"],
  });
  try {
    await page.goto(`${server.url}/index.html`, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("button", { name: RETRY_TEXT }),
      "diagnostic export should be exercised from a real startup fallback page"
    ).toBeVisible({ timeout: 20_000 });
    const exportButton = page.getByRole("button", { name: EXPORT_DIAG_TEXT });
    await expect(
      exportButton,
      "fallback page should expose boot diagnostic export action"
    ).toBeVisible({ timeout: 20_000 });
    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;
    expect(
      download.suggestedFilename(),
      "boot diagnostic export should use a deterministic diagnostic filename"
    ).toMatch(/^planner-boot-diagnostic-\d{14}\.json$/);
    const downloadPath = await download.path();
    const payload = JSON.parse(fs.readFileSync(downloadPath, "utf8"));
    expect(
      payload && typeof payload === "object",
      "diagnostic export should download a JSON object"
    ).toBeTruthy();
    expect(
      payload.errorContext && typeof payload.errorContext === "object",
      "diagnostic export should include current error context"
    ).toBeTruthy();
    expect(
      Array.isArray(payload.consoleEntries),
      "diagnostic export should include captured console history"
    ).toBeTruthy();
    expect(
      Array.isArray(payload.eventEntries),
      "diagnostic export should include captured error events"
    ).toBeTruthy();
    expect(
      Array.isArray(payload.performanceResources),
      "diagnostic export should include performance resource entries"
    ).toBeTruthy();
    expect(
      Array.isArray(payload.resourceState) && payload.resourceState.length > 0,
      "diagnostic export should include tracked resource state"
    ).toBeTruthy();
    expect(
      payload.resourceState.some((entry) => /app\.script-chain\.js/i.test(String(entry && entry.src))),
      "diagnostic export should include the failed script-chain resource"
    ).toBeTruthy();
  } finally {
    await server.close();
  }
});

test("recovers when the first app.resource-manifest request fails once", async ({ page }) => {
  const server = await createServer({
    failCounts: {
      "/js/app.resource-manifest.js": 1,
    },
  });
  try {
    await page.goto(`${server.url}/index.html`, { waitUntil: "domcontentloaded" });
    await expect(
      page.locator(".main-nav"),
      "bootstrap should recover after replaying app.resource-manifest.js during startup"
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("button", { name: RETRY_TEXT }),
      "manifest recovery path should not end on fallback retry UI"
    ).toHaveCount(0);
    expect(
      server.requestLog.filter((entry) => entry === "/js/app.resource-manifest.js").length,
      "startup should request app.resource-manifest.js again after the initial failure"
    ).toBeGreaterThanOrEqual(2);
  } finally {
    await server.close();
  }
});

test("shows manifest-specific fallback when app.resource-manifest scriptChain is invalid", async ({ page }) => {
  const server = await createServer({
    responseOverrides: {
      "/js/app.resource-manifest.js": {
        body: INVALID_MANIFEST_SOURCE,
      },
    },
  });
  try {
    await page.goto(`${server.url}/index.html`, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("button", { name: RETRY_TEXT }),
      "invalid manifest should still render retry-capable fallback UI"
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/app\.resource-manifest\.js/i),
      "fallback details should point at the manifest file rather than app.script-chain.js"
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/window\.__APP_RESOURCE_MANIFEST\.app\.scriptChain/),
      "fallback details should point at the manifest scriptChain key"
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator(".main-nav"),
      "invalid manifest must block app startup"
    ).toHaveCount(0);
  } finally {
    await server.close();
  }
});
