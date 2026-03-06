const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const moduleFiles = [
  "js/app.storage.schema.js",
  "js/app.storage.persistence.js",
  "js/app.storage.recovery.js",
  "js/app.storage.diagnostic.js",
];

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

const createState = () => ({
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

const createHarness = () => {
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

  moduleFiles.forEach((relativePath) => {
    const absolutePath = path.join(root, relativePath);
    assert.equal(
      fs.existsSync(absolutePath),
      true,
      `[recovery] ${relativePath} should exist before running regression coverage`
    );
    const source = fs.readFileSync(absolutePath, "utf8");
    vm.runInNewContext(source, context, { filename: absolutePath });
  });

  return {
    modules: context.window.AppModules,
    localStorage,
    sessionStorage,
    downloads,
  };
};

(async () => {
  const harness = createHarness();
  const state = createState();
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
  assert.ok(
    schemaIssues.length > 0,
    "[schema] dirty v2 marks should be flagged by schema inspection"
  );
  const normalizedMarks = schemaApi.normalizeWeaponMarks(dirtyMarks);
  assert.deepEqual(
    normalizedMarks,
    { 测试武器A: { weaponOwned: true, essenceOwned: true } },
    "[schema] dirty marks should be auto-normalized to v2-compatible shape"
  );

  harness.localStorage.markMismatch(state.marksStorageKey);
  persistenceApi.writeJsonStorageWithVerify(
    state.marksStorageKey,
    { 测试武器A: { weaponOwned: true } },
    { scope: "persist-weapon-marks-verify" }
  );
  assert.ok(
    state.storageErrorCurrent.value &&
      state.storageErrorCurrent.value.operation === "storage.verify",
    "[persist] round-trip mismatch should emit storage.verify issue"
  );
  assert.equal(
    state.showStorageErrorModal.value,
    true,
    "[persist] round-trip mismatch should be non-blocking but visible"
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
  assert.ok(
    clearedKeys.includes(state.uiStateStorageKey),
    "[recovery] clearProblematicStorageKeys should include ui state key from issue logs"
  );
  assert.equal(
    harness.localStorage.getItem(state.uiStateStorageKey),
    null,
    "[recovery] problematic localStorage keys should be removed"
  );
  assert.equal(
    harness.sessionStorage.getItem(state.uiStateStorageKey),
    null,
    "[recovery] problematic sessionStorage keys should be removed"
  );

  await diagnosticApi.exportStorageDiagnosticBundle();
  assert.ok(
    harness.downloads.length > 0,
    "[recovery] diagnostic export should remain available after recovery refactor"
  );
  assert.match(
    harness.downloads[0].name,
    /^planner-storage-diagnostic-/,
    "[recovery] diagnostic export filename should keep storage diagnostic prefix"
  );

  console.log("task2-storage-recovery-regression: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
