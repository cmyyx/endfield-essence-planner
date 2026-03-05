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
    weaponUpByWeapon: ref({
      ValidOne: {
        weaponName: "ValidOne",
        primaryCharacter: "CharA",
        avatarSrc: "./image/characters/CharA.png",
        windows: [
          {
            startMs: nowMs - 9 * oneDayMs,
            endMs: nowMs - 4 * oneDayMs,
          },
        ],
      },
      ValidTwo: {
        weaponName: "ValidTwo",
        primaryCharacter: "CharB",
        avatarSrc: "./image/characters/CharB.png",
        windows: [
          {
            startMs: nowMs - 6 * oneDayMs,
            endMs: nowMs - oneDayMs,
          },
        ],
      },
      MissingWindows: {
        weaponName: "MissingWindows",
        primaryCharacter: "CharC",
      },
      InvalidWindowShape: {
        weaponName: "InvalidWindowShape",
        primaryCharacter: "CharD",
        windows: [{}],
      },
      ActiveOnly: {
        weaponName: "ActiveOnly",
        primaryCharacter: "CharE",
        windows: [
          {
            startMs: nowMs - oneDayMs,
            endMs: nowMs + oneDayMs,
          },
        ],
      },
      FutureOnly: {
        weaponName: "FutureOnly",
        primaryCharacter: "CharF",
        windows: [
          {
            startMs: nowMs + 2 * oneDayMs,
            endMs: nowMs + 6 * oneDayMs,
          },
        ],
      },
    }),
    getWeaponUpWindowAt: () => ({
      ActiveOnly: { weaponName: "ActiveOnly" },
    }),
  };

  initRerunRanking({ ref }, state, { nowMs });

  assert.equal(state.hasRerunRankingRows.value, true, "should expose hasRerunRankingRows");
  assert.equal(Array.isArray(state.rerunRankingRows.value), true, "should expose rerun rows array");
  assert.equal(
    state.rerunRankingRows.value.length,
    4,
    "historical rows, active rows and future rows should be included"
  );

  const byWeapon = new Map(
    state.rerunRankingRows.value.map((row) => [String(row.weaponName || ""), row])
  );

  assert.equal(byWeapon.has("ValidOne"), true, "ValidOne should be included");
  assert.equal(byWeapon.has("ValidTwo"), true, "ValidTwo should be included");
  assert.equal(byWeapon.has("MissingWindows"), false, "record without windows should be filtered");
  assert.equal(byWeapon.has("InvalidWindowShape"), false, "invalid window record should be filtered");
  assert.equal(byWeapon.has("ActiveOnly"), true, "active-only row should be retained");
  assert.equal(byWeapon.has("FutureOnly"), true, "future-only row should be retained");

  const rowOne = byWeapon.get("ValidOne");
  const rowTwo = byWeapon.get("ValidTwo");
  assert.equal(rowOne.lastEndMs, nowMs - 4 * oneDayMs, "lastEndMs should be latest ended window");
  assert.equal(rowTwo.lastEndMs, nowMs - oneDayMs, "lastEndMs should use ended window");
  assert.equal(rowOne.gapMs, 4 * oneDayMs, "gapMs should equal nowMs - lastEndMs");
  assert.equal(rowTwo.gapMs, oneDayMs, "gapMs should equal nowMs - lastEndMs");
  assert.equal(rowOne.gapDays, 4, "gapDays should be derived from gapMs");
  assert.equal(rowTwo.gapDays, 1, "gapDays should be derived from gapMs");
  assert.equal(rowOne.rerunCount, 1, "rerunCount should count ended windows");
  assert.equal(rowTwo.rerunCount, 1, "rerunCount should count ended windows");

  const activeOnlyRow = byWeapon.get("ActiveOnly");
  assert.equal(activeOnlyRow.isActive, true, "active-only row should be marked active");
  assert.equal(activeOnlyRow.hasEndedHistory, false, "active-only row should be marked as no ended history");
  assert.equal(activeOnlyRow.gapDays, null, "active-only row should keep gapDays empty when no ended history");
  assert.equal(activeOnlyRow.lastEndMs, null, "active-only row should not fake lastEndMs");
  assert.equal(activeOnlyRow.rerunCount, 0, "active-only row should expose zero ended reruns");

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
