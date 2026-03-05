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

const createVueLikeRef = (initialValue) => {
  let current = initialValue;
  const proto = {};
  Object.defineProperty(proto, "value", {
    enumerable: true,
    get: () => current,
    set: (nextValue) => {
      current = nextValue;
    },
  });
  const refObject = Object.create(proto);
  Object.defineProperty(refObject, "__v_isRef", {
    enumerable: true,
    value: true,
  });
  return refObject;
};

const run = () => {
  const source = fs.readFileSync(appWeaponsFile, "utf8");
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
    weapons: [
      {
        name: "前瞻武器",
        short: "前瞻武器",
        rarity: 6,
        type: "单手剑",
        isPreview: true,
        s1: "",
        s2: "",
        s3: "",
      },
      {
        name: "常规武器",
        short: "常规武器",
        rarity: 6,
        type: "单手剑",
        s1: "敏捷提升",
        s2: "攻击提升",
        s3: "附术",
      },
    ],
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

  const existingOverridesRef = createVueLikeRef({});
  const state = {
    weaponMarks: createRef({}),
    weaponAttrOverrides: existingOverridesRef,
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
    baseSortedWeapons: context.weapons.slice(),
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

  assert.equal(
    state.weaponAttrOverrides,
    existingOverridesRef,
    "initWeapons should reuse existing Vue-like state ref instead of replacing it"
  );

  state.setWeaponAttrOverride("前瞻武器", "s1", "敏捷提升");
  assert.equal(
    JSON.stringify(existingOverridesRef.value),
    JSON.stringify({ 前瞻武器: { s1: "敏捷提升" } }),
    "setWeaponAttrOverride should write into the original ref instance"
  );
};

run();
console.log("task4-preserve-existing-ref: ok");
