const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const embedFile = path.join(root, "js/app.embed.js");
const updateFile = path.join(root, "js/app.update.js");

const readUtf8 = (filePath) => fs.readFileSync(filePath, "utf8");
const flushAsync = async (times = 6) => {
  await new Promise((resolve) => setImmediate(resolve));
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
};
const createRef = (value) => ({ value });

const runEmbedScenario = async ({ fetchImpl, host = "mirror.example.com" }) => {
  const mounted = [];
  const fetchCalls = [];
  const context = {
    window: {
      AppModules: {},
      location: {
        href: `https://${host}/planner/index.html`,
        hostname: host,
        protocol: "https:",
      },
      self: null,
      top: null,
      setInterval: () => 1,
      clearInterval: () => {},
    },
    document: {
      referrer: "",
    },
    URL,
    console,
    fetch: async (url, options) => {
      fetchCalls.push({ url: String(url), options: options || {} });
      return fetchImpl(url, options || {});
    },
  };
  context.window.self = context.window;
  context.window.top = context.window;

  vm.runInNewContext(readUtf8(embedFile), context, { filename: embedFile });

  const state = {
    content: {
      value: {
        embed: {
          officialHosts: ["end.canmoe.com"],
          allowedHosts: ["end.canmoe.com"],
          icpHosts: ["end.canmoe.com"],
        },
      },
    },
    t: (key) => key,
    ensureContentLoaded: async () => {},
  };
  const lifecycle = {
    ref: createRef,
    onMounted: (handler) => mounted.push(handler),
    onBeforeUnmount: () => {},
  };

  context.window.AppModules.initEmbed(lifecycle, state);
  for (const handler of mounted) {
    await handler();
  }
  await flushAsync();

  return { state, fetchCalls };
};

const runUpdateScenario = async ({ remotePayload }) => {
  const mounted = [];
  const warnings = [];
  const context = {
    window: {
      AppModules: {},
      location: {
        href: "https://end.canmoe.com/planner/index.html",
        reload: () => {},
      },
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
      createElement: () => ({
        style: {},
        setAttribute: () => {},
        select: () => {},
        setSelectionRange: () => {},
      }),
      body: { appendChild: () => {}, removeChild: () => {} },
      queryCommandSupported: () => false,
      execCommand: () => false,
    },
    navigator: {},
    fetch: async () => ({
      ok: true,
      json: async () => remotePayload,
    }),
    Intl,
    URL,
    Date,
    Math,
    console,
  };

  vm.runInNewContext(readUtf8(updateFile), context, { filename: updateFile });

  const state = {
    locale: createRef("zh-CN"),
    content: createRef({ gameCompat: {} }),
    contentLoaded: createRef(false),
    announcement: createRef({ version: "1.5.0" }),
    t: (key) => key,
    ensureContentLoaded: async () => {},
    reportRuntimeWarning: (error, details) => {
      warnings.push({
        errorName: error && error.name ? error.name : "Error",
        details,
      });
    },
  };

  const lifecycle = {
    ref: createRef,
    watch: () => {},
    onMounted: (handler) => mounted.push(handler),
    onBeforeUnmount: () => {},
  };

  context.window.AppModules.initUpdate(lifecycle, state);
  for (const handler of mounted) {
    handler();
  }
  await flushAsync();

  return { state, warnings };
};

const runStorageRegressionLink = () => {
  const script = path.join(root, "tests/phase-08-01/task2-storage-recovery-regression.test.cjs");
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    0,
    `[storage] phase-08-01 recovery regression should pass\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
};

(async () => {
  const official = await runEmbedScenario({
    fetchImpl: async () => ({
      status: 200,
      headers: { get: () => "1" },
    }),
  });
  assert.equal(
    official.state.isOfficialDeployment.value,
    true,
    "[embed] official marker header=1 should enable official mode"
  );
  assert.equal(
    official.state.showDomainWarning.value,
    true,
    "[embed] untrusted mirror host should trigger official domain warning when marker=1"
  );
  assert.equal(
    official.fetchCalls[0].options.method,
    "HEAD",
    "[embed] official probe should prefer HEAD request first"
  );
  assert.equal(
    official.fetchCalls[0].options.credentials,
    "same-origin",
    "[embed] official probe should use same-origin credentials for deterministic header visibility"
  );

  const nonOfficial = await runEmbedScenario({
    fetchImpl: async () => ({
      status: 200,
      headers: { get: () => "0" },
    }),
  });
  assert.equal(
    nonOfficial.state.isOfficialDeployment.value,
    false,
    "[embed] marker!=1 should keep non-official mode"
  );
  assert.equal(
    nonOfficial.state.showDomainWarning.value,
    false,
    "[embed] warning should stay disabled when official marker is absent"
  );

  const headFallback = await runEmbedScenario({
    fetchImpl: async (_url, options) => {
      if (options.method === "HEAD") {
        return { status: 405, headers: { get: () => "" } };
      }
      return { status: 200, headers: { get: () => "1" } };
    },
  });
  assert.equal(
    headFallback.fetchCalls.length >= 2,
    true,
    "[embed] should fallback to GET when HEAD is not allowed"
  );
  assert.equal(
    headFallback.fetchCalls[1].options.method,
    "GET",
    "[embed] HEAD 405 fallback should retry with GET"
  );

  const fetchFailure = await runEmbedScenario({
    fetchImpl: async () => {
      throw new Error("network down");
    },
  });
  assert.equal(
    fetchFailure.state.isOfficialDeployment.value,
    false,
    "[embed] fetch failure should degrade to non-official mode"
  );

  const validUpdate = await runUpdateScenario({
    remotePayload: {
      buildId: "20260305120000",
      displayVersion: "v1.5.1@260305-1200",
      announcementVersion: "1.5.1",
      fingerprint: "cmty-ep-2026-03-05",
      publishedAt: "2026-03-05T12:00:00.000Z",
    },
  });
  assert.equal(
    validUpdate.state.showUpdatePrompt.value,
    true,
    "[update] valid remote payload with changed signature should trigger update prompt"
  );

  const invalidUpdate = await runUpdateScenario({
    remotePayload: {
      buildId: "20260305120000",
    },
  });
  assert.equal(
    invalidUpdate.state.showUpdatePrompt.value,
    false,
    "[update] invalid payload missing core fields should be rejected"
  );
  assert.equal(
    invalidUpdate.warnings.length > 0,
    true,
    "[update] rejected payload should report runtime warning diagnostics"
  );

  runStorageRegressionLink();

  console.log("task2-update-embed-storage-contract: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
