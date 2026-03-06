const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const upScheduleFile = path.join(root, "js/app.up-schedule.js");
const uiFile = path.join(root, "js/app.ui.js");
const mainFile = path.join(root, "js/app.main.js");

const createRef = (value) => ({ value });

const runUpScheduleValidation = () => {
  const source = fs.readFileSync(upScheduleFile, "utf8");
  const schedules = {
    莱万汀: {
      windows: [{ start: "2026-01-10", end: "2026-01-11" }],
    },
    洁尔佩塔: {
      windows: [{ start: "not-a-time", end: "2026-01-11" }],
    },
    伊冯: {
      windows: [{ start: "2026-01-12", end: "2026-01-11" }],
    },
    黎风: {
      windows: [{ start: "2026-01-10", end: "2026-01-11" }],
      unknownField: true,
    },
    未收录角色: {
      windows: [{ start: "2026-01-10", end: "2026-01-11" }],
    },
  };
  const runtimeWarnings = [];
  const context = {
    window: { AppModules: {} },
    weaponUpSchedules: schedules,
    weapons: [
      { name: "熔铸火焰", chars: ["莱万汀"] },
      { name: "使命必达", chars: ["洁尔佩塔"] },
      { name: "艺术暴君", chars: ["伊冯"] },
      { name: "负山", chars: ["黎风"] },
    ],
    encodeURI,
    Date,
    Math,
  };
  vm.runInNewContext(source, context, { filename: upScheduleFile });

  const state = {
    upScheduleRawSource: schedules,
    reportRuntimeWarning: (error, meta) => runtimeWarnings.push({ error, meta }),
  };
  context.window.AppModules.initUpSchedule({ ref: createRef }, state);

  const byWeapon = state.weaponUpByWeapon.value;
  assert.deepEqual(Object.keys(byWeapon), ["熔铸火焰"], "invalid character schedules should be rejected independently");

  const issues = state.weaponUpIssues.value;
  assert.ok(Array.isArray(issues) && issues.length >= 4, "issues should be recorded");
  const codes = new Set(issues.map((item) => item.code));
  assert.equal(codes.has("UP_UNKNOWN_CHARACTER"), true, "should report unknown character");
  assert.equal(codes.has("UP_UNKNOWN_KEY"), true, "should report unknown key");
  assert.equal(codes.has("UP_INVALID_TIME"), true, "should report invalid time");
  assert.equal(codes.has("UP_WINDOW_ORDER"), true, "should report reversed window");

  assert.ok(runtimeWarnings.length >= 1, "issues should be visible via runtime warning reporter");
};

const runBridgeChecks = () => {
  const uiSource = fs.readFileSync(uiFile, "utf8");
  assert.match(
    uiSource,
    /state\.reportRuntimeWarning\s*=/,
    "app.ui should expose reusable runtime warning reporter bridge"
  );

  const mainSource = fs.readFileSync(mainFile, "utf8");
  assert.match(
    mainSource,
    /openUnifiedExceptionFromLog/,
    "app.main should keep unified exception compatibility entrypoint"
  );
};

runBridgeChecks();
runUpScheduleValidation();
console.log("task2-strict-validation-warning: ok");
