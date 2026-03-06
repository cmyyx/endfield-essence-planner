const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const targetFile = path.join(root, "js/app.rerun-ranking.js");
const manifestFile = path.join(root, "js/app.resource-manifest.js");
const appMainFile = path.join(root, "js/app.main.js");

const runModuleLevelChecks = () => {
  assert.equal(fs.existsSync(targetFile), true, "js/app.rerun-ranking.js should exist");
  const source = fs.readFileSync(targetFile, "utf8");

  const context = {
    window: { AppModules: {} },
    compareText: (a, b) => String(a || "").localeCompare(String(b || ""), "zh-Hans-CN"),
    Date,
    Math,
  };
  vm.runInNewContext(source, context, { filename: targetFile });

  const initRerunRanking = context.window.AppModules.initRerunRanking;
  assert.equal(typeof initRerunRanking, "function", "initRerunRanking should exist");

  const ref = (value) => ({ value });
  const nowMs = Date.UTC(2026, 2, 3, 0, 0, 0);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const state = {
    weaponUpByWeapon: ref({
      WeaponDupOld: {
        weaponName: "WeaponDupOld",
        primaryCharacter: "SharedChar",
        windows: [{ startMs: nowMs - 12 * oneDayMs, endMs: nowMs - 10 * oneDayMs }],
      },
      WeaponDupNew: {
        weaponName: "WeaponDupNew",
        primaryCharacter: "SharedChar",
        windows: [{ startMs: nowMs - 6 * oneDayMs, endMs: nowMs - 4 * oneDayMs }],
      },
      WeaponInactive: {
        weaponName: "WeaponInactive",
        primaryCharacter: "InactiveChar",
        windows: [{ startMs: nowMs - 10 * oneDayMs, endMs: nowMs - 8 * oneDayMs }],
      },
      WeaponActiveHugeGap: {
        weaponName: "WeaponActiveHugeGap",
        primaryCharacter: "ActiveChar",
        windows: [
          { startMs: nowMs - 40 * oneDayMs, endMs: nowMs - 30 * oneDayMs },
          { startMs: nowMs - oneDayMs, endMs: nowMs + oneDayMs },
        ],
      },
      WeaponToggleInactive: {
        weaponName: "WeaponToggleInactive",
        primaryCharacter: "ToggleChar",
        windows: [{ startMs: nowMs - 18 * oneDayMs, endMs: nowMs - 14 * oneDayMs }],
      },
      WeaponToggleActive: {
        weaponName: "WeaponToggleActive",
        primaryCharacter: "ToggleChar",
        windows: [{ startMs: nowMs - oneDayMs, endMs: nowMs + oneDayMs }],
      },
      WeaponFuture: {
        weaponName: "WeaponFuture",
        primaryCharacter: "FutureChar",
        windows: [{ startMs: nowMs + 3 * oneDayMs, endMs: nowMs + 7 * oneDayMs }],
      },
    }),
    getWeaponUpWindowAt: () => ({
      WeaponActiveHugeGap: { weaponName: "WeaponActiveHugeGap" },
      WeaponToggleActive: { weaponName: "WeaponToggleActive" },
    }),
  };

  initRerunRanking({ ref }, state, { nowMs });

  const rows = state.rerunRankingRows.value;
  assert.equal(rows.length, 5, "rows should be deduped to one row per character");

  const sharedRows = rows.filter((row) => row.characterName === "SharedChar");
  assert.equal(sharedRows.length, 1, "same character should appear only once");
  assert.equal(
    sharedRows[0].weaponName,
    "WeaponDupOld",
    "dedupe should keep deterministic winner for same character"
  );

  const toggleRows = rows.filter((row) => row.characterName === "ToggleChar");
  assert.equal(toggleRows.length, 1, "active/inactive duplicate character should keep a single row");
  assert.equal(
    toggleRows[0].weaponName,
    "WeaponToggleActive",
    "dedupe should prefer active row for character currently in UP"
  );

  const order = Array.from(rows, (row) => row.weaponName);
  assert.deepEqual(
    order,
    ["WeaponDupOld", "WeaponInactive", "WeaponActiveHugeGap", "WeaponToggleActive", "WeaponFuture"],
    "active rows should be near bottom and upcoming rows should always be placed at absolute tail"
  );
};

runModuleLevelChecks();
assert.equal(fs.existsSync(manifestFile), true, "js/app.resource-manifest.js should exist");
const manifest = require(manifestFile);
const scriptChain = Array.isArray(manifest && manifest.app && manifest.app.scriptChain)
  ? manifest.app.scriptChain
  : [];
assert.equal(
  scriptChain.includes("./js/app.rerun-ranking.js"),
  true,
  "manifest app.scriptChain should include ./js/app.rerun-ranking.js"
);

const appMainSource = fs.readFileSync(appMainFile, "utf8");
assert.match(
  appMainSource,
  /initExecutionOrder\s*=\s*\[[\s\S]*"initRerunRanking"/,
  "app.main.js initExecutionOrder should include initRerunRanking"
);
assert.match(
  appMainSource,
  /rerunRankingRows:\s*state\.rerunRankingRows/,
  "app.main.js should expose rerunRankingRows in return bindings"
);
assert.match(
  appMainSource,
  /hasRerunRankingRows:\s*state\.hasRerunRankingRows/,
  "app.main.js should expose hasRerunRankingRows in return bindings"
);
assert.match(
  appMainSource,
  /rerunRankingGeneratedAt:\s*state\.rerunRankingGeneratedAt/,
  "app.main.js should expose rerunRankingGeneratedAt in return bindings"
);

console.log("task3-character-dedupe-active-bottom: ok");
