const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const upScheduleFile = path.join(root, "js/app.up-schedule.js");

const createRef = (value) => ({ value });

const run = () => {
  const source = fs.readFileSync(upScheduleFile, "utf8");
  const schedules = {
    莱万汀: {
      windows: [{ start: "2026-01-10", end: "2026-01-11" }],
    },
    洁尔佩塔: {
      windows: [{ start: "bad-time", end: "2026-01-11" }],
    },
  };
  const context = {
    window: { AppModules: {} },
    weaponUpSchedules: schedules,
    weapons: [
      { name: "熔铸火焰", chars: ["莱万汀"] },
      { name: "使命必达", chars: ["洁尔佩塔"] },
    ],
    encodeURI,
    Date,
    Math,
  };
  vm.runInNewContext(source, context, { filename: upScheduleFile });

  const state = {
    upScheduleRawSource: schedules,
    reportRuntimeWarning: () => {},
  };
  context.window.AppModules.initUpSchedule({ ref: createRef }, state);

  assert.ok(state.characterUpByCharacter && state.characterUpByCharacter.value, "characterUpByCharacter should exist");
  assert.ok(state.weaponUpByWeapon && state.weaponUpByWeapon.value, "weaponUpByWeapon should exist");
  assert.ok(state.weaponUpIssues && Array.isArray(state.weaponUpIssues.value), "weaponUpIssues should exist");
  assert.ok(
    state.upScheduleNormalized &&
      state.upScheduleNormalized.value &&
      state.upScheduleNormalized.value.byCharacter,
    "upScheduleNormalized.byCharacter should exist"
  );

  const byCharacter = state.characterUpByCharacter.value;
  const byWeapon = state.weaponUpByWeapon.value;
  const issueCount = state.weaponUpIssues.value.length;

  assert.equal(Object.keys(byCharacter).length, 1, "valid character should coexist with rejected character issues");
  assert.equal(Object.keys(byWeapon).length, 1, "valid data should coexist with rejected weapon issues");
  assert.ok(issueCount >= 1, "issues should be preserved for downstream UI/logs");

  const characterRecord = byCharacter["莱万汀"];
  assert.ok(characterRecord, "valid character should be indexed by name");
  assert.deepEqual(
    Array.from(characterRecord.weaponNames || []),
    ["熔铸火焰"],
    "weaponNames should be derived from WEAPONS[] by character mapping"
  );

  const record = byWeapon["熔铸火焰"];
  assert.ok(record, "valid weapon should be indexed by name");
  assert.deepEqual(
    Array.from(record.characters || []),
    ["莱万汀"],
    "characters should derive from WEAPONS[].chars"
  );
  assert.equal(record.primaryCharacter, "莱万汀", "primaryCharacter should derive from chars[0]");
  assert.equal(
    record.avatarSrc,
    encodeURI("./image/characters/莱万汀.png"),
    "avatarSrc should follow character avatar path rule"
  );

  assert.equal(typeof state.getWeaponUpWindowAt, "function", "state should expose getWeaponUpWindowAt helper");
  const activeByWeapon = state.getWeaponUpWindowAt("2026-01-10T06:00:00.000Z");
  assert.ok(activeByWeapon && activeByWeapon["熔铸火焰"], "helper should return active window index");
};

run();
console.log("task3-normalized-contract: ok");
