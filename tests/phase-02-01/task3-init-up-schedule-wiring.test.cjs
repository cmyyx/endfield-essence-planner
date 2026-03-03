const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const upScheduleModulePath = path.join(root, "js/app.up-schedule.js");
assert.equal(fs.existsSync(upScheduleModulePath), true, "js/app.up-schedule.js should exist");

const upScheduleModuleSource = read("js/app.up-schedule.js");
assert.match(
  upScheduleModuleSource,
  /modules\.initUpSchedule\s*=\s*function\s+initUpSchedule/,
  "app.up-schedule.js should export modules.initUpSchedule"
);

const scriptChainSource = read("js/app.script-chain.js");
assert.match(
  scriptChainSource,
  /"\.\/js\/app\.up-schedule\.js"/,
  "app.script-chain.js should include ./js/app.up-schedule.js"
);

const appMainSource = read("js/app.main.js");
assert.match(
  appMainSource,
  /init\("initUpSchedule"\)/,
  "app.main.js should call init(\"initUpSchedule\")"
);

const indexInitUi = appMainSource.indexOf('init("initUi")');
const indexInitUpSchedule = appMainSource.indexOf('init("initUpSchedule")');
const indexInitWeapons = appMainSource.indexOf('init("initWeapons")');
assert.ok(indexInitUi >= 0, "initUi should exist");
assert.ok(indexInitUpSchedule >= 0, "initUpSchedule should exist");
assert.ok(indexInitWeapons >= 0, "initWeapons should exist");
assert.ok(indexInitUi < indexInitUpSchedule, "initUpSchedule should run after initUi");
assert.ok(indexInitUpSchedule < indexInitWeapons, "initUpSchedule should run before initWeapons");

console.log("task3-init-up-schedule-wiring: ok");
