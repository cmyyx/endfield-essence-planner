const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const targetFile = path.resolve(__dirname, "../../data/up-schedules.js");

const run = () => {
  assert.equal(fs.existsSync(targetFile), true, "data/up-schedules.js should exist");

  const source = fs.readFileSync(targetFile, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: targetFile });

  const schedules = context.window.WEAPON_UP_SCHEDULES;
  assert.ok(schedules && typeof schedules === "object", "window.WEAPON_UP_SCHEDULES must be an object");

  for (const [characterName, entry] of Object.entries(schedules)) {
    assert.ok(characterName.trim().length > 0, "character name key must be non-empty");
    const keys = Object.keys(entry);
    assert.deepEqual(keys, ["windows"], "character entry only allows `windows`");
    assert.ok(Array.isArray(entry.windows), "windows must be an array");

    entry.windows.forEach((windowEntry) => {
      const windowKeys = Object.keys(windowEntry).sort();
      assert.deepEqual(windowKeys, ["end", "start"], "window only allows `start` and `end`");
      assert.equal(typeof windowEntry.start, "string", "window.start must be string");
      assert.equal(typeof windowEntry.end, "string", "window.end must be string");
    });
  }
};

run();
console.log("task1-up-schedules: ok");
