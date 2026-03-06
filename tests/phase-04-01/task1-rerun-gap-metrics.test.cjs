const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const targetFile = path.join(root, "js/app.rerun-ranking.js");

const run = () => {
  assert.equal(fs.existsSync(targetFile), true, "js/app.rerun-ranking.js should exist");
  const source = fs.readFileSync(targetFile, "utf8");

  const context = {
    window: { AppModules: {} },
    compareText: (a, b) => String(a || "").localeCompare(String(b || ""), "zh-Hans-CN"),
    Date,
    Math,
  };
  vm.runInNewContext(source, context, { filename: targetFile });

  const initRerunRanking = context.window.AppModules.initRerunRanking;
  assert.equal(typeof initRerunRanking, "function", "initRerunRanking should exist");

  const ref = (value) => ({ value });
  const nowMs = Date.UTC(2026, 2, 3, 0, 0, 0);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const state = {
    characterUpByCharacter: ref({
      CharA: {
        characterName: "CharA",
        primaryWeaponName: "ValidOne",
        weaponNames: ["ValidOne"],
        avatarSrc: "./image/characters/CharA.png",
        windows: [
          {
            startMs: nowMs - 9 * oneDayMs,
            endMs: nowMs - 4 * oneDayMs,
          },
        ],
      },
      CharB: {
        characterName: "CharB",
        primaryWeaponName: "ValidTwo",
        weaponNames: ["ValidTwo"],
        avatarSrc: "./image/characters/CharB.png",
        windows: [
          {
            startMs: nowMs - 6 * oneDayMs,
            endMs: nowMs - oneDayMs,
          },
        ],
      },
      CharFirstActive: {
        characterName: "CharFirstActive",
        primaryWeaponName: "FirstActive",
        weaponNames: ["FirstActive"],
        windows: [
          {
            startMs: nowMs - oneDayMs,
            endMs: nowMs + oneDayMs,
          },
        ],
      },
      CharSecondActive: {
        characterName: "CharSecondActive",
        primaryWeaponName: "SecondActive",
        weaponNames: ["SecondActive"],
        windows: [
          {
            startMs: nowMs - 8 * oneDayMs,
            endMs: nowMs - 5 * oneDayMs,
          },
          {
            startMs: nowMs - oneDayMs,
            endMs: nowMs + oneDayMs,
          },
        ],
      },
      CharBeforeThird: {
        characterName: "CharBeforeThird",
        primaryWeaponName: "BeforeThird",
        weaponNames: ["BeforeThird"],
        windows: [
          {
            startMs: nowMs - 10 * oneDayMs,
            endMs: nowMs - 7 * oneDayMs,
          },
          {
            startMs: nowMs - 5 * oneDayMs,
            endMs: nowMs - 2 * oneDayMs,
          },
          {
            startMs: nowMs + 2 * oneDayMs,
            endMs: nowMs + 4 * oneDayMs,
          },
        ],
      },
      CharFutureOnly: {
        characterName: "CharFutureOnly",
        primaryWeaponName: "FutureOnly",
        weaponNames: ["FutureOnly"],
        windows: [
          {
            startMs: nowMs + 2 * oneDayMs,
            endMs: nowMs + 6 * oneDayMs,
          },
        ],
      },
    }),
    weaponUpByWeapon: ref({
      LegacyOnly: {
        weaponName: "LegacyOnly",
        primaryCharacter: "LegacyChar",
        windows: [{ startMs: nowMs - 12 * oneDayMs, endMs: nowMs - 9 * oneDayMs }],
      },
    }),
    getWeaponUpWindowAt: () => ({
      FirstActive: { weaponName: "FirstActive" },
      SecondActive: { weaponName: "SecondActive" },
    }),
  };

  initRerunRanking({ ref }, state, { nowMs });

  assert.equal(state.hasRerunRankingRows.value, true, "should expose hasRerunRankingRows");
  assert.equal(Array.isArray(state.rerunRankingRows.value), true, "should expose rerun rows array");
  assert.equal(
    state.rerunRankingRows.value.length,
    6,
    "historical rows, active rows and future rows should be included"
  );

  const byWeapon = new Map(
    state.rerunRankingRows.value.map((row) => [String(row.weaponName || ""), row])
  );

  assert.equal(byWeapon.has("ValidOne"), true, "ValidOne should be included");
  assert.equal(byWeapon.has("ValidTwo"), true, "ValidTwo should be included");
  assert.equal(byWeapon.has("FirstActive"), true, "first active row should be retained");
  assert.equal(byWeapon.has("SecondActive"), true, "second active row should be retained");
  assert.equal(byWeapon.has("BeforeThird"), true, "before-third row should be retained");
  assert.equal(byWeapon.has("FutureOnly"), true, "future-only row should be retained");
  assert.equal(byWeapon.has("LegacyOnly"), false, "character source should be preferred over legacy weapon source");

  const rowOne = byWeapon.get("ValidOne");
  const rowTwo = byWeapon.get("ValidTwo");
  assert.equal(rowOne.lastEndMs, nowMs - 4 * oneDayMs, "lastEndMs should be latest ended window");
  assert.equal(rowTwo.lastEndMs, nowMs - oneDayMs, "lastEndMs should use ended window");
  assert.equal(rowOne.gapMs, 4 * oneDayMs, "gapMs should equal nowMs - lastEndMs");
  assert.equal(rowTwo.gapMs, oneDayMs, "gapMs should equal nowMs - lastEndMs");
  assert.equal(rowOne.gapDays, 4, "gapDays should be derived from gapMs");
  assert.equal(rowTwo.gapDays, 1, "gapDays should be derived from gapMs");
  assert.equal(rowOne.rerunCount, 1, "rerunCount should count started windows");
  assert.equal(rowTwo.rerunCount, 1, "rerunCount should count started windows");

  const firstActiveRow = byWeapon.get("FirstActive");
  assert.equal(firstActiveRow.isActive, true, "first active row should be marked active");
  assert.equal(firstActiveRow.hasEndedHistory, false, "first active row should be marked as no ended history");
  assert.equal(firstActiveRow.gapDays, null, "first active row should keep gapDays empty when no ended history");
  assert.equal(firstActiveRow.lastEndMs, null, "first active row should not fake lastEndMs");
  assert.equal(firstActiveRow.rerunCount, 1, "first active row should show rerun count as 1");

  const secondActiveRow = byWeapon.get("SecondActive");
  assert.equal(secondActiveRow.isActive, true, "second active row should be marked active");
  assert.equal(secondActiveRow.rerunCount, 2, "second active row should show rerun count as 2");

  const beforeThirdRow = byWeapon.get("BeforeThird");
  assert.equal(beforeThirdRow.isActive, false, "before-third row should not be marked active");
  assert.equal(beforeThirdRow.hasEndedHistory, true, "before-third row should keep ended history");
  assert.equal(beforeThirdRow.rerunCount, 2, "before third rerun starts, rerun count should stay at 2");

  const futureOnlyRow = byWeapon.get("FutureOnly");
  assert.equal(futureOnlyRow.isActive, false, "future-only row should not be marked active");
  assert.equal(futureOnlyRow.isUpcoming, true, "future-only row should be marked upcoming");
  assert.equal(futureOnlyRow.hasEndedHistory, false, "future-only row should have no ended history");
  assert.equal(
    futureOnlyRow.nextStartMs,
    nowMs + 2 * oneDayMs,
    "future-only row should expose nearest upcoming start time"
  );

  assert.equal(
    Number.isFinite(state.rerunRankingGeneratedAt.value),
    true,
    "generated timestamp should be exposed"
  );

  console.log("task1-rerun-gap-metrics: ok");
};

run();
