const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const upScheduleModuleFile = path.join(root, "js/app.up-schedule.js");
const checkScriptFile = path.join(root, "scripts/check-up-schedules.mjs");

const run = async () => {
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

  const scriptSource = fs.readFileSync(checkScriptFile, "utf8");
  assert.match(scriptSource, /check-up-schedules: ok/, "script should print stable success marker");

  const scriptUrl = `${pathToFileURL(checkScriptFile).href}?ts=${Date.now()}`;
  await import(scriptUrl);
};

run()
  .then(() => {
    console.log("task2-check-script: ok");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
