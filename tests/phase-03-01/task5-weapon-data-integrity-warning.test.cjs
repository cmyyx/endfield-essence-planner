const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const appWeaponsFile = path.join(root, "js/app.weapons.js");

const createRef = (value) => ({ value });
const createComputed = (getter) =>
  Object.defineProperty(
    {},
    "value",
    {
      enumerable: true,
      get: getter,
    }
  );

const createHarness = (catalog) => {
  const source = fs.readFileSync(appWeaponsFile, "utf8");
  const warnings = [];
  const context = {
    window: {
      AppModules: {},
      umami: { track: () => {} },
      addEventListener: () => {},
      removeEventListener: () => {},
      requestAnimationFrame: (fn) => fn(),
      innerHeight: 800,
      scrollY: 0,
      pageYOffset: 0,
    },
    document: undefined,
    localStorage: {
      getItem: () => "seen",
      setItem: () => {},
    },
    weapons: catalog,
    dungeons: [],
    getWeaponMarkFromMap: (name, marks) => (marks && marks[name]) || {},
    compactWeaponMark: (mark) => mark || null,
    createSearchQueryMeta: () => ({ active: false }),
    scoreSearchEntry: () => 0,
    buildSearchEntry: () => ({ score: 0 }),
    getS1OrderIndex: () => 0,
    Date,
    Math,
  };
  vm.runInNewContext(source, context, { filename: appWeaponsFile });

  const state = {
    weaponMarks: createRef({}),
    attrHintStorageKey: "planner:test:attr-hint",
    showWeaponAttrs: createRef(false),
    showAttrHint: createRef(false),
    filterS1: createRef([]),
    filterS2: createRef([]),
    filterS3: createRef([]),
    searchQuery: createRef(""),
    weaponSearchIndex: createRef(new Map()),
    recommendationConfig: createRef({}),
    selectedNames: createRef([]),
    schemeBaseSelections: createRef({}),
    currentView: createRef("home"),
    weaponGridTopSpacer: createRef(0),
    weaponGridBottomSpacer: createRef(0),
    runtimeWarningCurrent: createRef(null),
    runtimeWarningLogs: createRef([]),
    runtimeWarningPreviewText: createRef(""),
    showRuntimeWarningModal: createRef(false),
    showStorageErrorModal: createRef(false),
    baseSortedWeapons: catalog.slice(),
    reportRuntimeWarning: (error, meta) => {
      warnings.push({ error, meta });
    },
    t: (key) => key,
    tTerm: (_category, value) => value,
    getWeaponUpWindowAt: () => ({}),
  };
  const ctx = {
    computed: createComputed,
    ref: createRef,
    watch: () => {},
    onMounted: () => {},
    onBeforeUnmount: () => {},
    nextTick: (fn) => {
      if (typeof fn === "function") fn();
    },
  };
  context.window.AppModules.initWeapons(ctx, state);
  return { state, warnings };
};

const run = () => {
  const nonPreviewBroken = createHarness([
    {
      name: "正式武器-异常",
      short: "正式武器-异常",
      rarity: 6,
      type: "单手剑",
      isPreview: false,
      s1: "敏捷提升",
      s2: "",
      s3: "附术",
    },
    {
      name: "正式武器-正常",
      short: "正式武器-正常",
      rarity: 6,
      type: "单手剑",
      s1: "攻击提升",
      s2: "攻击提升",
      s3: "附术",
    },
  ]);
  assert.equal(nonPreviewBroken.warnings.length, 1, "non-preview data issue should be proactively reported");
  assert.equal(
    nonPreviewBroken.warnings[0].error && nonPreviewBroken.warnings[0].error.name,
    "WeaponDataIntegrityError",
    "non-preview data issue should use WeaponDataIntegrityError"
  );
  assert.equal(
    nonPreviewBroken.warnings[0].meta && nonPreviewBroken.warnings[0].meta.scope,
    "weapons.catalog-validate",
    "non-preview data issue should use catalog validation scope"
  );
  assert.equal(
    nonPreviewBroken.warnings[0].meta && nonPreviewBroken.warnings[0].meta.forceShow,
    true,
    "non-preview data issue should force unified exception modal"
  );
  assert.equal(
    nonPreviewBroken.warnings[0].meta && nonPreviewBroken.warnings[0].meta.asToast,
    false,
    "non-preview data issue should not be a toast warning"
  );
  assert.equal(
    nonPreviewBroken.state.hasDataIntegrityWeaponAttrs.value,
    true,
    "non-preview missing attrs should be tracked as data integrity issues"
  );

  const previewOnlyBroken = createHarness([
    {
      name: "前瞻武器-缺失",
      short: "前瞻武器-缺失",
      rarity: 6,
      type: "单手剑",
      isPreview: true,
      s1: "",
      s2: "",
      s3: "",
    },
    {
      name: "正式武器-正常",
      short: "正式武器-正常",
      rarity: 6,
      type: "单手剑",
      s1: "攻击提升",
      s2: "攻击提升",
      s3: "附术",
    },
  ]);
  assert.equal(
    previewOnlyBroken.warnings.length,
    0,
    "preview-only missing attrs should not trigger data integrity warning"
  );
  assert.equal(
    previewOnlyBroken.state.hasPreviewWeapons.value,
    true,
    "preview-only missing attrs should still be treated as preview flow"
  );
  assert.equal(
    previewOnlyBroken.state.hasDataIntegrityWeaponAttrs.value,
    false,
    "preview-only missing attrs should not be treated as data integrity issues"
  );
};

run();
console.log("task5-weapon-data-integrity-warning: ok");
