const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const upScheduleFile = path.join(root, "data/up-schedules.js");

const SHANGHAI_OFFSET_MINUTES = 8 * 60;

const parseExpectedMs = (value) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map((item) => Number(item));
    return Date.UTC(year, month - 1, day, 12, 0, 0) - SHANGHAI_OFFSET_MINUTES * 60 * 1000;
  }
  const parsed = Date.parse(value);
  assert.equal(Number.isFinite(parsed), true, `expected valid datetime: ${value}`);
  return parsed;
};

const run = () => {
  const source = fs.readFileSync(upScheduleFile, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: upScheduleFile });

  const schedules = context.window.WEAPON_UP_SCHEDULES;
  assert.ok(schedules && typeof schedules === "object", "WEAPON_UP_SCHEDULES should be an object");

  const weaponNames = Object.keys(schedules).sort();
  assert.deepEqual(
    weaponNames,
    ["使命必达", "艺术暴君", "熔铸火焰"],
    "seed data must contain only DATA-06 required weapons"
  );

  const expectedWindows = {
    熔铸火焰: [{ start: "2026-01-22T12:00:00+08:00", end: "2026-02-07T12:00:00+08:00" }],
    使命必达: [{ start: "2026-02-07", end: "2026-02-24T12:00:00+08:00" }],
    艺术暴君: [{ start: "2026-02-24T12:00:00+08:00", end: "2026-03-12T12:00:00+08:00" }],
  };

  Object.keys(expectedWindows).forEach((weaponName) => {
    const entry = schedules[weaponName];
    assert.ok(entry && typeof entry === "object", `${weaponName} entry should exist`);
    assert.deepEqual(Object.keys(entry), ["windows"], `${weaponName} only allows windows key`);

    const actualWindows = entry.windows;
    const expected = expectedWindows[weaponName];
    assert.equal(Array.isArray(actualWindows), true, `${weaponName} windows must be array`);
    assert.equal(actualWindows.length, expected.length, `${weaponName} should have expected window count`);

    actualWindows.forEach((windowItem, index) => {
      assert.equal(typeof windowItem.start, "string", `${weaponName}[${index}] start should be string`);
      assert.equal(typeof windowItem.end, "string", `${weaponName}[${index}] end should be string`);
      const startMs = parseExpectedMs(windowItem.start);
      const endMs = parseExpectedMs(windowItem.end);
      assert.equal(startMs < endMs, true, `${weaponName}[${index}] should satisfy [start, end)`);
    });
  });
};

run();
console.log("task1-seed-data-contract: ok");
