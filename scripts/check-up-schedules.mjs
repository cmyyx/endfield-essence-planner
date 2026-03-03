import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const upScheduleDataFile = path.join(root, "data/up-schedules.js");
const weaponsDataFile = path.join(root, "data/weapons.js");
const upScheduleModuleFile = path.join(root, "js/app.up-schedule.js");

const EXPECTED_WINDOWS = {
  熔铸火焰: {
    startIso: "2026-01-22T04:00:00.000Z",
    endIso: "2026-02-07T04:00:00.000Z",
    primaryCharacter: "莱万汀",
  },
  使命必达: {
    startIso: "2026-02-07T04:00:00.000Z",
    endIso: "2026-02-24T04:00:00.000Z",
    primaryCharacter: "洁尔佩塔",
  },
  艺术暴君: {
    startIso: "2026-02-24T04:00:00.000Z",
    endIso: "2026-03-12T04:00:00.000Z",
    primaryCharacter: "伊冯",
  },
};

const loadWindowVariable = (filePath, variableName) => {
  const source = fs.readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.window[variableName];
};

const loadUpScheduleHelper = () => {
  const moduleSource = fs.readFileSync(upScheduleModuleFile, "utf8");
  const context = {
    window: { AppModules: {} },
    weaponUpSchedules: {},
    weapons: [],
    encodeURI,
    Date,
    Math,
  };
  vm.runInNewContext(moduleSource, context, { filename: upScheduleModuleFile });
  const helper = context.window.AppModules.normalizeAndBindWeaponUpSchedule;
  assert.equal(typeof helper, "function", "normalizeAndBindWeaponUpSchedule helper is required");
  return helper;
};

const createDataset = (mode, baseSchedules) => {
  if (mode === "invalid-unknown-weapon") {
    return {
      ...baseSchedules,
      未收录武器: {
        windows: [{ start: "2026-01-22T12:00:00+08:00", end: "2026-02-07T12:00:00+08:00" }],
      },
    };
  }
  if (mode === "invalid-window-order") {
    return {
      ...baseSchedules,
      使命必达: {
        windows: [{ start: "2026-02-24T12:00:00+08:00", end: "2026-02-07T12:00:00+08:00" }],
      },
    };
  }
  return baseSchedules;
};

const checkData06Contract = (normalized, mode) => {
  const { byWeapon, issues } = normalized;
  const weaponNames = Object.keys(byWeapon).sort();
  const expectedWeaponNames = Object.keys(EXPECTED_WINDOWS).sort();
  assert.deepEqual(weaponNames, expectedWeaponNames, "normalized weapon keys should match DATA-06");

  if (mode === "valid") {
    assert.equal(issues.length, 0, `expected no issues, got ${JSON.stringify(issues, null, 2)}`);
  } else {
    assert.ok(issues.length >= 1, "invalid sample should produce at least one issue");
    const issueCodes = new Set(issues.map((issue) => issue.code));
    if (mode === "invalid-unknown-weapon") {
      assert.equal(issueCodes.has("UP_UNKNOWN_WEAPON"), true, "invalid sample should report unknown weapon");
    }
    if (mode === "invalid-window-order") {
      assert.equal(issueCodes.has("UP_WINDOW_ORDER"), true, "invalid sample should report window order");
    }
  }

  expectedWeaponNames.forEach((weaponName) => {
    const record = byWeapon[weaponName];
    assert.ok(record, `${weaponName} should exist in normalized byWeapon`);
    assert.equal(record.primaryCharacter, EXPECTED_WINDOWS[weaponName].primaryCharacter);
    const windows = Array.isArray(record.windows) ? record.windows : [];
    assert.equal(windows.length, 1, `${weaponName} should expose a single window`);
    assert.equal(windows[0].startIso, EXPECTED_WINDOWS[weaponName].startIso);
    assert.equal(windows[0].endIso, EXPECTED_WINDOWS[weaponName].endIso);
    assert.equal(windows[0].startMs < windows[0].endMs, true, `${weaponName} window should satisfy [start, end)`);
  });
};

const main = () => {
  const modeArg = process.argv.slice(2).find((arg) => arg.startsWith("--mode="));
  const mode = modeArg ? modeArg.slice("--mode=".length) : "valid";
  const allowedModes = new Set(["valid", "invalid-unknown-weapon", "invalid-window-order"]);
  assert.equal(allowedModes.has(mode), true, `unsupported mode: ${mode}`);

  const schedules = loadWindowVariable(upScheduleDataFile, "WEAPON_UP_SCHEDULES");
  const weapons = loadWindowVariable(weaponsDataFile, "WEAPONS");
  assert.equal(Array.isArray(weapons), true, "WEAPONS should be an array");

  const helper = loadUpScheduleHelper();
  const dataset = createDataset(mode, schedules);
  const normalized = helper(dataset, weapons);
  checkData06Contract(normalized, mode);

  console.log(`check-up-schedules: ok (${mode})`);
};

try {
  main();
} catch (error) {
  const message = error && error.stack ? error.stack : String(error);
  console.error("check-up-schedules: failed");
  console.error(message);
  process.exit(1);
}
