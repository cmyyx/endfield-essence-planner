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

const orderMatch = mainSource.match(/const initExecutionOrder = \[([\s\S]*?)\];/);
assert.ok(orderMatch, "app.main should define a centralized init execution order list");

const initOrder = Array.from(orderMatch[1].matchAll(/"([^"]+)"/g)).map((match) => match[1]);
assert.deepEqual(
  initOrder,
  [
    "initState",
    "initI18n",
    "initContent",
    "initSearch",
    "initUi",
    "initUpSchedule",
    "initRerunRanking",
    "initStorage",
    "initAnalytics",
    "initEmbed",
    "initPerf",
    "initBackground",
    "initWeapons",
    "initWeaponMatch",
    "initRecommendations",
    "initTutorial",
    "initRecommendationDisplay",
    "initModals",
    "initUpdate",
    "initMedia",
    "initStrategy",
    "initGearRefining",
  ],
  "app.main should keep the startup init order stable while enforcing module contracts"
);

assert.match(
  mainSource,
  /initExecutionOrder\.forEach\(\(name\)\s*=>\s*{\s*runInitWithContract\(name\);\s*}\);/s,
  "app.main should execute startup modules through a single contract-aware runner"
);
assert.match(
  mainSource,
  /markProvidedCapabilities\(/,
  "app.main should track provided capabilities after successful module init"
);
assert.match(
  mainSource,
  /missingOptionalProviders/,
  "app.main should track optional provider dependencies in contract checks"
);

assert.match(
  uiSource,
  /modules\.initUi\.provides\s*=\s*\[[^\]]*reportRuntimeWarning[^\]]*\]/s,
  "initUi should declare runtime warning provider capability"
);
assert.match(
  upScheduleSource,
  /modules\.initUpSchedule\.requiredProviders\s*=\s*\[[^\]]*reportRuntimeWarning[^\]]*\]/s,
  "initUpSchedule should require reportRuntimeWarning provider capability"
);
assert.match(
  i18nSource,
  /modules\.initI18n\.optional\s*=/,
  "initI18n should declare optional dependency metadata"
);
assert.match(
  updateSource,
  /modules\.initUpdate\.optional\s*=/,
  "initUpdate should declare optional dependency metadata"
);

console.log("task2-init-order-contract: ok");
