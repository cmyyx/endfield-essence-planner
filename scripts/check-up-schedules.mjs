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

const checkData06Contract = (normalized) => {
  const { byWeapon, issues } = normalized;
  assert.equal(issues.length, 0, `expected no issues, got ${JSON.stringify(issues, null, 2)}`);
  const weaponNames = Object.keys(byWeapon || {});
  assert.ok(weaponNames.length > 0, "valid mode should output non-empty normalized weapon map");

  weaponNames.forEach((weaponName) => {
    const record = byWeapon[weaponName];
    assert.ok(record, `${weaponName} should exist in normalized byWeapon`);
    assert.ok(
      typeof record.primaryCharacter === "string" && record.primaryCharacter.trim().length > 0,
      `${weaponName} should have primaryCharacter`
    );
    const windows = Array.isArray(record.windows) ? record.windows : [];
    assert.ok(windows.length > 0, `${weaponName} should expose at least one window`);
    windows.forEach((windowItem, index) => {
      assert.ok(
        typeof windowItem.startIso === "string" && typeof windowItem.endIso === "string",
        `${weaponName}[${index}] should expose startIso/endIso`
      );
      assert.equal(
        windowItem.startMs < windowItem.endMs,
        true,
        `${weaponName}[${index}] window should satisfy [start, end)`
      );
    });
  });
};

const checkIssueModeContract = (normalized, expectedCode) => {
  const issues = Array.isArray(normalized && normalized.issues) ? normalized.issues : [];
  assert.ok(issues.length > 0, "invalid mode should produce at least one issue");
  assert.ok(
    issues.some((item) => item && item.code === expectedCode),
    `invalid mode should contain issue code: ${expectedCode}`
  );
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

  if (mode === "valid") {
    checkData06Contract(normalized);
  } else if (mode === "invalid-unknown-weapon") {
    checkIssueModeContract(normalized, "UP_UNKNOWN_WEAPON");
  } else if (mode === "invalid-window-order") {
    checkIssueModeContract(normalized, "UP_WINDOW_ORDER");
  }

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
