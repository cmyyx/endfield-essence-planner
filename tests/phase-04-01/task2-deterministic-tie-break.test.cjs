const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const targetFile = path.join(root, "js/app.rerun-ranking.js");

const run = () => {
  assert.equal(fs.existsSync(targetFile), true, "js/app.rerun-ranking.js should exist");
  const source = fs.readFileSync(targetFile, "utf8");

  const context = {
    window: { AppModules: {} },
    compareText: (a, b) => String(a || "").localeCompare(String(b || ""), "zh-Hans-CN"),
    Date,
    Math,
  };
  vm.runInNewContext(source, context, { filename: targetFile });

  const deriveRerunRankingRows = context.window.AppModules.deriveRerunRankingRows;
  assert.equal(typeof deriveRerunRankingRows, "function", "deriveRerunRankingRows should exist");

  const nowMs = Date.UTC(2026, 2, 3, 0, 0, 0);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sourceMap = {
    WeaponZ: {
      weaponName: "WeaponZ",
      primaryCharacter: "Beta",
      windows: [{ startMs: nowMs - 4 * oneDayMs, endMs: nowMs - 2 * oneDayMs }],
    },
    WeaponA: {
      weaponName: "WeaponA",
      primaryCharacter: "Alpha",
      windows: [{ startMs: nowMs - 4 * oneDayMs, endMs: nowMs - 2 * oneDayMs }],
    },
    WeaponB: {
      weaponName: "WeaponB",
      primaryCharacter: "Delta",
      windows: [{ startMs: nowMs - 4 * oneDayMs, endMs: nowMs - 2 * oneDayMs }],
    },
    WeaponOld: {
      weaponName: "WeaponOld",
      primaryCharacter: "Gamma",
      windows: [{ startMs: nowMs - 6 * oneDayMs, endMs: nowMs - 3 * oneDayMs }],
    },
    WeaponTieZ: {
      weaponName: "WeaponTieZ",
      primaryCharacter: "SameCharacter",
      windows: [{ startMs: nowMs - 4 * oneDayMs, endMs: nowMs - 2 * oneDayMs }],
    },
    WeaponTieA: {
      weaponName: "WeaponTieA",
      primaryCharacter: "SameCharacter",
      windows: [{ startMs: nowMs - 4 * oneDayMs, endMs: nowMs - 2 * oneDayMs }],
    },
  };

  const rows = deriveRerunRankingRows(sourceMap, { nowMs });
  const order = Array.from(rows, (row) => row.weaponName);
  assert.deepEqual(
    order,
    ["WeaponOld", "WeaponA", "WeaponZ", "WeaponB", "WeaponTieA"],
    "rows should be deterministic by gap desc then character/weapon tie-break"
  );
  assert.equal(order.includes("WeaponTieZ"), false, "same character + same gap should keep weaponName tie-break winner");

  console.log("task2-deterministic-tie-break: ok");
};

run();
