const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const bootstrapSource = read("js/bootstrap.entry.js");
const appCoreSource = read("js/app.core.js");
const appStateSource = read("js/app.state.js");

assert.match(
  bootstrapSource,
  /startupScripts\s*=\s*\[[\s\S]*"\.\/data\/up-schedules\.js"/,
  "bootstrap startupScripts should include ./data/up-schedules.js"
);

assert.match(
  bootstrapSource,
  /dataPromise\s*=\s*Promise\.all\(\[[\s\S]*loadScript\("\.\/data\/up-schedules\.js"\)/,
  "bootstrap dataPromise should include loadScript(\"./data/up-schedules.js\")"
);

assert.match(
  appCoreSource,
  /const\s+weaponUpSchedules\s*=\s*/,
  "app.core should expose weaponUpSchedules runtime reference"
);

assert.match(
  appStateSource,
  /state\.upScheduleRawSource\s*=/,
  "app.state should define up schedule raw state slot"
);
assert.match(
  appStateSource,
  /state\.upScheduleNormalized\s*=/,
  "app.state should define up schedule normalized state slot"
);
assert.match(
  appStateSource,
  /state\.upScheduleIssues\s*=/,
  "app.state should define up schedule issues state slot"
);

console.log("task2-up-schedule-bootstrap-state: ok");
