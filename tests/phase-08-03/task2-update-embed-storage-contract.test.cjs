const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const embedFile = path.join(root, "js/app.embed.js");
const updateFile = path.join(root, "js/app.update.js");
const storageModuleFiles = [
  "js/app.storage.schema.js",
  "js/app.storage.persistence.js",
  "js/app.storage.recovery.js",
  "js/app.storage.diagnostic.js",
];

const readUtf8 = (filePath) => fs.readFileSync(filePath, "utf8");
const flushAsync = async (times = 6) => {
  await new Promise((resolve) => setImmediate(resolve));
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
};
const createRef = (value) => ({ value });
const createStorageMock = () => {
  const map = new Map();
  const mismatchKeys = new Set();
  return {
    markMismatch: (key) => mismatchKeys.add(String(key)),
    getItem: (key) => {
      const normalized = String(key);
      if (!map.has(normalized)) return null;
      const value = map.get(normalized);
      if (!mismatchKeys.has(normalized)) return value;
      return `${value}__round_trip_mismatch`;
    },
    setItem: (key, value) => {
      map.set(String(key), String(value));
    },
    removeItem: (key) => {
      map.delete(String(key));
    },
    key: (index) => Array.from(map.keys())[index] || null,
    get length() {
      return map.size;
    },
  };
};
const createStorageState = () => ({
  marksStorageKey: "weapon-marks:v2",
  legacyMarksStorageKey: "weapon-marks:v1",
  legacyExcludedKey: "excluded-notes:v1",
  migrationStorageKey: "weapon-marks-migration:v1",
  tutorialStorageKey: "planner-tutorial:v1",
  uiStateStorageKey: "planner-ui-state:v1",
  attrHintStorageKey: "planner-attr-hint:v1",
  noticeSkipKey: "announcement:skip",
  legacyNoticePrefix: "announcement:skip:",
  perfModeStorageKey: "planner-perf-mode:v1",
  themeModeStorageKey: "planner-theme-mode:v1",
  langStorageKey: "planner-lang",
  backgroundStorageKey: "planner-bg-image:v1",
  backgroundApiStorageKey: "planner-bg-api:v1",
  backgroundDisplayStorageKey: "planner-bg-display:v1",
  planConfigHintStorageKey: "planner-plan-config-hint:v1",
  gearRefiningNavHintStorageKey: "planner-gear-refining-nav-hint:v1",
  rerunRankingNavHintStorageKey: "planner-rerun-ranking-nav-hint:v1",
  recommendationConfig: createRef({
    hideEssenceOwnedWeapons: false,
    hideEssenceOwnedOwnedOnly: false,
    hideEssenceOwnedWeaponsInSelector: false,
    hideUnownedWeapons: false,
    hideUnownedWeaponsInSelector: false,
    hideFourStarWeapons: false,
    hideFourStarWeaponsInSelector: false,
    attributeFilterAffectsHiddenWeapons: false,
    preferredRegion1: "",
    preferredRegion2: "",
    regionPriorityMode: "ignore",
    ownershipPriorityMode: "ignore",
    strictPriorityOrder: "ownershipFirst",
  }),
  isPortrait: createRef(false),
  storageErrorCurrent: createRef(null),
  storageErrorLogs: createRef([]),
  storageErrorPreviewText: createRef(""),
  showStorageErrorModal: createRef(false),
  storageErrorIgnored: createRef(false),
  storageErrorClearTargetKeys: createRef([]),
  storageErrorClearCountdown: createRef(0),
  showStorageClearConfirmModal: createRef(false),
  showStorageIgnoreConfirmModal: createRef(false),
  pendingStorageIssues: [],
  weaponMarks: createRef({}),
  storageFeedbackUrl: "",
});
const createStorageHarness = () => {
  const localStorage = createStorageMock();
  const sessionStorage = createStorageMock();
  const downloads = [];
  const context = {
    window: {
      AppModules: {},
      AppUtils: {
        getAppFingerprint: () => "test-fingerprint",
        triggerJsonDownload: (name, payload) => downloads.push({ name, payload }),
      },
      location: { href: "https://example.com/planner/index.html", replace: () => {} },
      __APP_DIAGNOSTICS__: {
        readDiagnosticsHistory: () => [{ module: "test", operation: "noop" }],
      },
      __APP_DIAGNOSTICS_CONFIG__: {
        enabled: true,
        sampleRate: 1,
        dedupWindowMs: 4000,
        historyLimit: 50,
        storageKey: "planner-nonfatal-diagnostics:v1",
      },
      setInterval: (fn) => {
        fn();
        return 1;
      },
      clearInterval: () => {},
    },
    navigator: {
      userAgent: "test-agent",
      onLine: true,
      storage: {
        estimate: async () => ({ quota: 10000, usage: 256 }),
      },
    },
    localStorage,
    sessionStorage,
    weapons: [{ name: "测试武器A", s1: "炎", s2: "单体", s3: "爆发" }],
    dungeons: [{ name: "测试副本A" }],
    getDungeonRegion: () => "测试地区",
    normalizeWeaponMarksMap: (raw, weaponNameSet) => {
      const source = raw && typeof raw === "object" ? raw : {};
      const result = {};
      Object.keys(source).forEach((name) => {
        if (!weaponNameSet.has(name)) return;
        const entry = source[name];
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          result[name] = {
            weaponOwned: Boolean(entry.weaponOwned),
            essenceOwned: Boolean(entry.essenceOwned),
            excluded: Boolean(entry.excluded),
            note: typeof entry.note === "string" ? entry.note : "",
          };
          if (!result[name].note) delete result[name].note;
          if (!result[name].weaponOwned) delete result[name].weaponOwned;
          if (!result[name].essenceOwned) delete result[name].essenceOwned;
          if (!result[name].excluded) delete result[name].excluded;
        }
      });
      return result;
    },
    normalizeLegacyExcludedMarksMap: () => ({}),
    Date,
    Math,
    JSON,
    URL,
    console,
  };
  storageModuleFiles.forEach((relativePath) => {
    const absolutePath = path.join(root, relativePath);
    assert.equal(
      fs.existsSync(absolutePath),
      true,
      `[storage] ${relativePath} should exist for phase-08-03 contract coverage`
    );
    vm.runInNewContext(readUtf8(absolutePath), context, { filename: absolutePath });
  });
  return {
    modules: context.window.AppModules,
    localStorage,
    sessionStorage,
    downloads,
  };
};

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
    setInterval: () => 1,
    clearInterval: () => {},
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

const runStorageRegressionLink = async () => {
  const harness = createStorageHarness();
  const state = createStorageState();
  const modules = harness.modules;

  const schemaApi = modules.createStorageSchemaApi(state);
  const persistenceApi = modules.createStoragePersistenceApi(state);
  const recoveryApi = modules.createStorageRecoveryApi(state, persistenceApi, {
    storageFeedbackUrl: "https://example.com/issues",
  });
  const diagnosticApi = modules.createStorageDiagnosticApi(state, persistenceApi);
  persistenceApi.setIssueReporter(recoveryApi.reportStorageIssue);

  const dirtyMarks = {
    测试武器A: {
      weaponOwned: "yes",
      essenceOwned: 1,
      excluded: 0,
      note: 3,
      injected: true,
    },
  };
  const schemaIssues = schemaApi.inspectWeaponMarksSchemaIssues(dirtyMarks);
  assert.equal(
    schemaIssues.length > 0,
    true,
    "[storage] dirty marks should be detected by schema inspection"
  );
  assert.deepEqual(
    schemaApi.normalizeWeaponMarks(dirtyMarks),
    { 测试武器A: { weaponOwned: true, essenceOwned: true } },
    "[storage] dirty marks should normalize to v2-compatible data shape"
  );

  harness.localStorage.markMismatch(state.marksStorageKey);
  persistenceApi.writeJsonStorageWithVerify(
    state.marksStorageKey,
    { 测试武器A: { weaponOwned: true } },
    { scope: "persist-weapon-marks-verify" }
  );
  assert.equal(
    state.storageErrorCurrent.value && state.storageErrorCurrent.value.operation,
    "storage.verify",
    "[storage] round-trip mismatch should trigger storage.verify issue"
  );

  harness.localStorage.setItem(state.uiStateStorageKey, '{"selectedNames":["测试武器A"]}');
  harness.sessionStorage.setItem(state.uiStateStorageKey, '{"selectedNames":["测试武器A"]}');
  state.storageErrorCurrent.value = {
    key: `${state.uiStateStorageKey}|${state.marksStorageKey}`,
    operation: "storage.read",
    errorName: "Error",
    errorMessage: "broken",
  };
  const clearedKeys = recoveryApi.clearProblematicStorageKeys();
  assert.equal(
    clearedKeys.includes(state.uiStateStorageKey),
    true,
    "[storage] clearProblematicStorageKeys should remove known problematic keys"
  );
  assert.equal(
    harness.localStorage.getItem(state.uiStateStorageKey),
    null,
    "[storage] localStorage problematic key should be removed"
  );
  assert.equal(
    harness.sessionStorage.getItem(state.uiStateStorageKey),
    null,
    "[storage] sessionStorage problematic key should be removed"
  );

  await diagnosticApi.exportStorageDiagnosticBundle();
  assert.equal(
    harness.downloads.length > 0,
    true,
    "[storage] diagnostic export should remain available"
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

  await runStorageRegressionLink();

  console.log("task2-update-embed-storage-contract: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
