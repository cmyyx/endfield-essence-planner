const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const upScheduleModulePath = path.join(root, "js/app.up-schedule.js");
assert.equal(fs.existsSync(upScheduleModulePath), true, "js/app.up-schedule.js should exist");

const upScheduleModuleSource = read("js/app.up-schedule.js");
const moduleContext = {
  window: { AppModules: {} },
  Date,
  Math,
};
vm.runInNewContext(upScheduleModuleSource, moduleContext, { filename: upScheduleModulePath });
assert.equal(
  typeof moduleContext.window.AppModules.initUpSchedule,
  "function",
  "app.up-schedule.js should register AppModules.initUpSchedule"
);

const manifestPath = path.join(root, "js/app.resource-manifest.js");
assert.equal(fs.existsSync(manifestPath), true, "js/app.resource-manifest.js should exist");
const manifest = require(manifestPath);
const scriptChain = Array.isArray(manifest && manifest.app && manifest.app.scriptChain)
  ? manifest.app.scriptChain
  : [];
assert.equal(
  scriptChain.includes("./js/app.up-schedule.js"),
  true,
  "manifest app.scriptChain should include ./js/app.up-schedule.js"
);

const appMainSource = read("js/app.main.js");
const initExecutionOrderMatch = appMainSource.match(
  /const\s+initExecutionOrder\s*=\s*\[([\s\S]*?)\]/
);
assert.ok(initExecutionOrderMatch, "app.main.js should define initExecutionOrder");

const initExecutionOrder = Array.from(
  initExecutionOrderMatch[1].matchAll(/["']([^"']+)["']/g),
  (match) => match[1]
);

const indexInitUi = initExecutionOrder.indexOf("initUi");
const indexInitUpSchedule = initExecutionOrder.indexOf("initUpSchedule");
const indexInitWeapons = initExecutionOrder.indexOf("initWeapons");
assert.ok(indexInitUi >= 0, "initUi should exist in initExecutionOrder");
assert.ok(indexInitUpSchedule >= 0, "initUpSchedule should exist in initExecutionOrder");
assert.ok(indexInitWeapons >= 0, "initWeapons should exist in initExecutionOrder");
assert.ok(indexInitUi < indexInitUpSchedule, "initUpSchedule should run after initUi");
assert.ok(indexInitUpSchedule < indexInitWeapons, "initUpSchedule should run before initWeapons");

console.log("task3-init-up-schedule-wiring: ok");
