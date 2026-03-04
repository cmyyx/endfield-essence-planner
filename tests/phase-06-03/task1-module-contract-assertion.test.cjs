const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const mainSource = read("js/app.main.js");
const uiSource = read("js/app.ui.js");
const upScheduleSource = read("js/app.up-schedule.js");
const i18nSource = read("js/app.i18n.js");
const updateSource = read("js/app.update.js");

assert.match(
  mainSource,
  /strictInitContractEnvs\s*=\s*new Set\(\s*\[\s*"development"\s*,\s*"test"\s*\]\s*\)/,
  "app.main should define strict init contract envs for development/test"
);
assert.match(
  mainSource,
  /if\s*\(strictInitContractEnvs\.has\(runtimeEnv\)\)\s*\{\s*throw new Error\(/s,
  "app.main should hard fail in strict envs when required dependencies are missing"
);
assert.match(
  mainSource,
  /state\.reportRuntimeWarning\(/,
  "app.main should report missing required dependencies through runtime warning bridge"
);
assert.match(
  mainSource,
  /return\s*"degraded";/,
  "app.main should degrade module init in production when required dependencies are missing"
);

assert.match(
  uiSource,
  /modules\.initUi\.required\s*=/,
  "app.ui should declare initUi required dependencies"
);
assert.match(
  uiSource,
  /modules\.initUi\.optional\s*=/,
  "app.ui should declare initUi optional dependencies"
);
assert.match(
  uiSource,
  /modules\.initUi\.provides\s*=/,
  "app.ui should declare initUi provided capabilities metadata"
);
assert.match(
  upScheduleSource,
  /modules\.initUpSchedule\.required\s*=/,
  "app.up-schedule should declare initUpSchedule required dependencies"
);
assert.match(
  upScheduleSource,
  /modules\.initUpSchedule\.requiredProviders\s*=/,
  "app.up-schedule should declare provider-level dependency metadata"
);
assert.match(
  i18nSource,
  /modules\.initI18n\.required\s*=/,
  "app.i18n should declare initI18n required dependencies"
);
assert.match(
  updateSource,
  /modules\.initUpdate\.required\s*=/,
  "app.update should declare initUpdate required dependencies"
);

console.log("task1-module-contract-assertion: ok");
