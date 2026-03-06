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

  const characterNames = Object.keys(schedules).sort();
  assert.deepEqual(
    characterNames,
    ["莱万汀", "洁尔佩塔", "伊冯", "汤汤", "洛茜"].sort(),
    "seed data must contain only configured character keys"
  );

  const expectedWindows = {
    莱万汀: [{ start: "2026-01-22T12:00:00+08:00", end: "2026-02-07T11:59:00+08:00" }],
    洁尔佩塔: [{ start: "2026-02-07T12:00:00+08:00", end: "2026-02-24T11:59:00+08:00" }],
    伊冯: [{ start: "2026-02-24T12:00:00+08:00", end: "2026-03-12T11:59:00+08:00" }],
    汤汤: [{ start: "2026-03-12T12:00:00+08:00", end: "2026-03-29T11:59:00+08:00" }],
    洛茜: [{ start: "2026-03-29T12:00:00+08:00", end: "2026-04-15T11:59:00+08:00" }],
  };

  Object.keys(expectedWindows).forEach((characterName) => {
    const entry = schedules[characterName];
    assert.ok(entry && typeof entry === "object", `${characterName} entry should exist`);
    assert.deepEqual(Object.keys(entry), ["windows"], `${characterName} only allows windows key`);

    const actualWindows = entry.windows;
    const expected = expectedWindows[characterName];
    assert.equal(Array.isArray(actualWindows), true, `${characterName} windows must be array`);
    assert.equal(actualWindows.length, expected.length, `${characterName} should have expected window count`);

    actualWindows.forEach((windowItem, index) => {
      assert.equal(typeof windowItem.start, "string", `${characterName}[${index}] start should be string`);
      assert.equal(typeof windowItem.end, "string", `${characterName}[${index}] end should be string`);
      const startMs = parseExpectedMs(windowItem.start);
      const endMs = parseExpectedMs(windowItem.end);
      assert.equal(startMs < endMs, true, `${characterName}[${index}] should satisfy [start, end)`);
    });
  });
};

run();
console.log("task1-seed-data-contract: ok");
