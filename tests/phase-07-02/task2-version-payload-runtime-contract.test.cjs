const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const updateFile = path.join(root, "js/app.update.js");
const updateSource = fs.readFileSync(updateFile, "utf8");

const flushAsync = async (times = 8) => {
  await new Promise((resolve) => setImmediate(resolve));
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
};

(async () => {
  const mountedHandlers = [];
  const warnings = [];

  const context = {
    window: {
      AppModules: {},
      location: { href: "https://example.com/planner/index.html", reload: () => {} },
      setTimeout: (fn) => {
        fn();
        return 1;
      },
      clearTimeout: () => {},
      setInterval: () => 1,
      clearInterval: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      __APP_VERSION_INFO: {
        buildId: "20260301143840",
        displayVersion: "v1.5.0@260301-1438",
        announcementVersion: "1.5.0",
        fingerprint: "cmty-ep-2026-02-07",
        publishedAt: "2026-03-01T14:38:40.644Z",
      },
    },
    document: {
      visibilityState: "visible",
      getElementById: () => ({ getAttribute: () => "cmty-ep-2026-02-07" }),
      addEventListener: () => {},
      removeEventListener: () => {},
      createElement: () => ({ style: {}, setAttribute: () => {}, select: () => {}, setSelectionRange: () => {} }),
      body: { appendChild: () => {}, removeChild: () => {} },
      queryCommandSupported: () => false,
      execCommand: () => false,
    },
    navigator: {},
    fetch: async () => ({
      ok: true,
      json: async () => ({
        buildId: "20260305120000",
      }),
    }),
    Intl,
    URL,
    Date,
    Math,
    console,
  };

  vm.runInNewContext(updateSource, context, { filename: updateFile });

  const state = {
    locale: { value: "zh-CN" },
    content: { value: { gameCompat: {} } },
    contentLoaded: { value: false },
    announcement: { value: { version: "1.5.0" } },
    t: (key) => key,
    ensureContentLoaded: async () => {},
    reportRuntimeWarning: (error, details) => {
      warnings.push({
        errorName: error && error.name ? error.name : "Error",
        details,
      });
    },
  };

  const ctx = {
    ref: (value) => ({ value }),
    watch: () => {},
    onMounted: (handler) => {
      mountedHandlers.push(handler);
    },
    onBeforeUnmount: () => {},
  };

  context.window.AppModules.initUpdate(ctx, state);
  assert.ok(mountedHandlers.length > 0, "initUpdate should register mounted lifecycle handler");

  for (const handler of mountedHandlers) {
    handler();
  }
  await flushAsync();

  assert.equal(
    state.showUpdatePrompt.value,
    false,
    "invalid version payload missing core fields should be rejected without showing update prompt"
  );
  assert.ok(
    warnings.length > 0,
    "rejecting invalid version payload should report a non-fatal diagnostic warning"
  );

  console.log("task2-version-payload-runtime-contract: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
