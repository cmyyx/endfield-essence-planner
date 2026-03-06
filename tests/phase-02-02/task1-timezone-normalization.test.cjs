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
    莱万汀: {
      windows: [
        { start: "2026-01-01", end: "2026-01-02" },
        { start: "2026-01-01T12:00:00", end: "2026-01-01T16:00:00" },
        { start: "2026-01-01T12:00:00", end: "2026-01-01T18:00:00" },
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

  const dateOnlyWindow = windows.find(
    (windowItem) => windowItem.sourceStart === "2026-01-01" && windowItem.sourceEnd === "2026-01-02"
  );
  assert.ok(dateOnlyWindow, "date-only source window should be kept");
  assert.equal(dateOnlyWindow.startIso, "2026-01-01T04:00:00.000Z", "date-only start should map to +08:00 noon");
  assert.equal(dateOnlyWindow.endIso, "2026-01-02T04:00:00.000Z", "date-only end should map to +08:00 noon");

  const noTimezoneWindow = windows.find(
    (windowItem) =>
      windowItem.sourceStart === "2026-01-01T12:00:00" && windowItem.sourceEnd === "2026-01-01T16:00:00"
  );
  assert.ok(noTimezoneWindow, "no-timezone datetime source window should be kept");
  assert.equal(
    noTimezoneWindow.startIso,
    "2026-01-01T04:00:00.000Z",
    "no timezone datetime should use +08:00"
  );
  assert.equal(
    noTimezoneWindow.endIso,
    "2026-01-01T08:00:00.000Z",
    "no timezone datetime end should use +08:00"
  );

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
