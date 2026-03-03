const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const targetFile = path.join(root, "js/app.up-schedule.js");

const createRef = (value) => ({ value });

const run = () => {
  const source = fs.readFileSync(targetFile, "utf8");
  const schedules = {
    熔铸火焰: {
      windows: [
        { start: "2026-01-01", end: "2026-01-01T18:00:00" },
        { start: "2026-01-01T12:00:00", end: "2026-01-01T16:00:00" },
        { start: "2026-01-01T12:00:00", end: "2026-01-01T16:00:00" },
      ],
    },
  };
  const context = {
    window: { AppModules: {} },
    weaponUpSchedules: schedules,
    weapons: [{ name: "熔铸火焰", chars: ["莱万汀"] }],
    encodeURI,
    Date,
    Math,
  };

  vm.runInNewContext(source, context, { filename: targetFile });
  const initUpSchedule = context.window.AppModules.initUpSchedule;
  assert.equal(typeof initUpSchedule, "function", "initUpSchedule should exist");

  const state = {
    upScheduleRawSource: schedules,
    reportRuntimeWarning: () => {},
  };
  initUpSchedule({ ref: createRef }, state);

  assert.ok(
    state.upScheduleNormalized && state.upScheduleNormalized.value,
    "upScheduleNormalized should be initialized"
  );
  const byWeapon = state.upScheduleNormalized.value.byWeapon;
  assert.ok(byWeapon && byWeapon["熔铸火焰"], "normalized byWeapon should contain 熔铸火焰");

  const windows = byWeapon["熔铸火焰"].windows;
  assert.equal(Array.isArray(windows), true, "normalized windows should be an array");
  assert.equal(windows.length, 3, "all windows should be preserved");

  const [first, second, third] = windows;
  assert.equal(first.startIso, "2026-01-01T04:00:00.000Z", "date-only should map to +08:00 noon");
  assert.equal(first.endIso, "2026-01-01T08:00:00.000Z", "no timezone datetime should use +08:00");
  assert.equal(second.startIso, "2026-01-01T04:00:00.000Z", "no timezone datetime should be +08:00");
  assert.equal(third.endIso, "2026-01-01T10:00:00.000Z", "sorting should compare by endMs");

  windows.forEach((windowItem) => {
    assert.equal(typeof windowItem.startMs, "number", "startMs should be number");
    assert.equal(typeof windowItem.endMs, "number", "endMs should be number");
    assert.equal(typeof windowItem.startIso, "string", "startIso should be string");
    assert.equal(typeof windowItem.endIso, "string", "endIso should be string");
    assert.equal(typeof windowItem.sourceStart, "string", "sourceStart should be string");
    assert.equal(typeof windowItem.sourceEnd, "string", "sourceEnd should be string");
  });
};

run();
console.log("task1-timezone-normalization: ok");
