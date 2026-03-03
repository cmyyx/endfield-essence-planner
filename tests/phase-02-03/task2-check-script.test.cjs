const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const upScheduleModuleFile = path.join(root, "js/app.up-schedule.js");
const checkScriptFile = path.join(root, "scripts/check-up-schedules.mjs");

const run = () => {
  assert.equal(fs.existsSync(checkScriptFile), true, "check-up-schedules.mjs should exist");

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
  assert.equal(
    typeof context.window.AppModules.normalizeAndBindWeaponUpSchedule,
    "function",
    "app.up-schedule should expose normalizeAndBindWeaponUpSchedule helper"
  );

  const result = spawnSync(process.execPath, [checkScriptFile], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.error) throw result.error;

  assert.equal(result.status, 0, `script should pass with current DATA-06 seed data, got: ${result.stderr}`);
  assert.match(result.stdout, /check-up-schedules: ok/, "script should print stable success marker");
};

run();
console.log("task2-check-script: ok");
