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

const makeWeapon = (name) => ({
  name,
  short: name,
  type: "测试",
  rarity: 6,
  s1: "炎",
  s2: "单体",
  s3: "爆发",
});

const createHarness = ({ baseSortedNames, activeNames, searchQuery = "", scoreByName = {} }) => {
  const allWeapons = baseSortedNames.map((name) => makeWeapon(name));
  const weaponMap = new Map(allWeapons.map((weapon) => [weapon.name, weapon]));
  const activeSet = new Set(activeNames);

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
    weapons: allWeapons,
    dungeons: [],
    getWeaponMarkFromMap: (name, marks) => (marks && marks[name]) || {},
    compactWeaponMark: (mark) => mark || null,
    createSearchQueryMeta: (query) => {
      const normalized = String(query || "").trim();
      return {
        active: normalized.length > 0,
      };
    },
    scoreSearchEntry: (entry, queryMeta) => {
      if (!queryMeta || !queryMeta.active) return 1;
      return Number(entry && entry.score) || 0;
    },
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
    searchQuery: createRef(searchQuery),
    weaponSearchIndex: createRef(
      new Map(
        baseSortedNames.map((name) => [
          name,
          {
            score: scoreByName[name] || 0,
          },
        ])
      )
    ),
    recommendationConfig: createRef({}),
    selectedNames: createRef([]),
    schemeBaseSelections: createRef({}),
    currentView: createRef("home"),
    weaponGridTopSpacer: createRef(0),
    weaponGridBottomSpacer: createRef(0),
    baseSortedWeapons: baseSortedNames.map((name) => weaponMap.get(name)).filter(Boolean),
    t: (key, params) => {
      if (!params) return key;
      return String(key).replace(/\{(\w+)\}/g, (all, token) =>
        Object.prototype.hasOwnProperty.call(params, token) ? String(params[token]) : all
      );
    },
    tTerm: (_category, value) => value,
    getWeaponUpWindowAt: () => {
      const result = {};
      activeSet.forEach((name) => {
        result[name] = { weaponName: name };
      });
      return result;
    },
  };

  const ctx = {
    computed: createComputed,
    ref: createRef,
    watch: (_source, callback, options) => {
      if (options && options.immediate && typeof callback === "function") {
        callback();
      }
    },
    onMounted: () => {},
    onBeforeUnmount: () => {},
    nextTick: (fn) => {
      if (typeof fn === "function") fn();
    },
  };

  context.window.AppModules.initWeapons(ctx, state);
  return state;
};

const run = () => {
  const state = createHarness({
    baseSortedNames: ["非UP-1", "UP-2", "非UP-3", "UP-4", "非UP-5"],
    activeNames: ["UP-2", "UP-4"],
    searchQuery: "up",
    scoreByName: {
      "非UP-1": 100,
      "UP-2": 30,
      "非UP-3": 80,
      "UP-4": 90,
      "非UP-5": 70,
    },
  });

  const actual = Array.from(state.filteredWeapons.value, (weapon) => weapon.name);
  assert.deepEqual(
    actual,
    ["UP-4", "UP-2", "非UP-1", "非UP-3", "非UP-5"],
    "search path should keep score ordering first, then apply stable UP-first partition"
  );

  const nonUpInResult = Array.from(actual).filter((name) => !name.startsWith("UP-"));
  assert.deepEqual(
    nonUpInResult,
    ["非UP-1", "非UP-3", "非UP-5"],
    "non-UP relative order should stay aligned with pre-partition fallback order"
  );

  const tieState = createHarness({
    baseSortedNames: ["非UP-A", "UP-B", "非UP-C", "UP-D", "非UP-E"],
    activeNames: ["UP-B", "UP-D"],
    searchQuery: "up",
    scoreByName: {
      "非UP-A": 100,
      "UP-B": 100,
      "非UP-C": 100,
      "UP-D": 100,
      "非UP-E": 100,
    },
  });
  const tieActual = Array.from(tieState.filteredWeapons.value, (weapon) => weapon.name);
  assert.deepEqual(
    tieActual,
    ["UP-B", "UP-D", "非UP-A", "非UP-C", "非UP-E"],
    "when scores tie, UP-first partition should keep original stable fallback order inside each group"
  );
};

run();
console.log("task2-stable-fallback-order: ok");
