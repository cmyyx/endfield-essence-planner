const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const appStateFile = path.join(root, "js/app.state.js");
const appStorageFile = path.join(root, "js/app.storage.js");
const appUiFile = path.join(root, "js/app.ui.js");
const appMainFile = path.join(root, "js/app.main.js");
const templateFile = path.join(root, "js/templates.main.01.js");
const storagePersistenceFile = path.join(root, "js/app.storage.persistence.js");

[
  appStateFile,
  appStorageFile,
  appUiFile,
  appMainFile,
  templateFile,
  storagePersistenceFile,
].forEach((file) => {
  assert.equal(fs.existsSync(file), true, `${path.relative(root, file)} should exist`);
});

const appStateSource = fs.readFileSync(appStateFile, "utf8");
const appStorageSource = fs.readFileSync(appStorageFile, "utf8");
const appUiSource = fs.readFileSync(appUiFile, "utf8");
const appMainSource = fs.readFileSync(appMainFile, "utf8");
const templateSource = fs.readFileSync(templateFile, "utf8");
const storagePersistenceSource = fs.readFileSync(storagePersistenceFile, "utf8");

assert.match(
  appStateSource,
  /state\.rerunRankingNavHintStorageKey\s*=\s*"planner-rerun-ranking-nav-hint:v1";/,
  "state should declare rerun-ranking nav hint storage key"
);
assert.match(
  appStateSource,
  /state\.rerunRankingNavHintVersion\s*=\s*"1";/,
  "state should declare rerun-ranking nav hint version"
);
assert.match(
  appStateSource,
  /state\.showRerunRankingNavHintDot\s*=\s*ref\(false\);/,
  "state should expose showRerunRankingNavHintDot ref"
);

assert.match(
  appStorageSource,
  /localStorage\.getItem\(\s*state\.rerunRankingNavHintStorageKey\s*\)/,
  "storage restore should read rerun-ranking nav hint storage key"
);
assert.match(
  appStorageSource,
  /state\.showRerunRankingNavHintDot\.value\s*=\s*storedRerunRankingNavHintVersion\s*!==\s*state\.rerunRankingNavHintVersion;/,
  "storage restore should compare rerun-ranking nav hint version and toggle dot"
);
assert.match(
  appStorageSource,
  /reportStorageIssue\("storage\.read",\s*state\.rerunRankingNavHintStorageKey,\s*error,\s*\{\s*scope:\s*"restore-rerun-ranking-nav-hint"/,
  "storage restore read failure should report rerun-ranking nav hint scope"
);

assert.match(
  appUiSource,
  /const\s+showRerunRankingNavHintDot\s*=\s*state\.showRerunRankingNavHintDot;/,
  "ui module should capture rerun-ranking nav hint dot ref"
);

const markRerunRankingNavHintSeenMatch = appUiSource.match(
  /const\s+markRerunRankingNavHintSeen\s*=\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\};/
);
assert.ok(markRerunRankingNavHintSeenMatch, "ui module should define markRerunRankingNavHintSeen");

const markRerunRankingNavHintSeenBody = markRerunRankingNavHintSeenMatch[1];
assert.match(
  markRerunRankingNavHintSeenBody,
  /showRerunRankingNavHintDot\.value\s*=\s*false;/,
  "ui module should clear rerun-ranking nav hint dot after click"
);
assert.match(
  markRerunRankingNavHintSeenBody,
  /localStorage\.setItem\(\s*state\.rerunRankingNavHintStorageKey\s*,\s*state\.rerunRankingNavHintVersion\s*\);?/,
  "ui module should persist rerun-ranking nav hint seen version after click"
);

assert.match(
  appUiSource,
  /reportStorageIssue\("storage\.write",\s*state\.rerunRankingNavHintStorageKey,\s*error,\s*\{\s*scope:\s*"ui\.rerun-ranking-nav-hint-write"/,
  "ui module should report rerun-ranking nav hint write failures"
);
assert.match(
  appUiSource,
  /state\.markRerunRankingNavHintSeen\s*=\s*markRerunRankingNavHintSeen;/,
  "ui module should expose markRerunRankingNavHintSeen to main app"
);

assert.match(
  appMainSource,
  /if\s*\(\s*view\s*===\s*['"]rerun-ranking['"]\s*&&\s*typeof\s+state\.markRerunRankingNavHintSeen\s*===\s*['"]function['"]\s*\)\s*\{\s*state\.markRerunRankingNavHintSeen\s*\(\s*\)\s*;?\s*\}/,
  "setView should mark rerun-ranking nav hint seen when entering rerun-ranking view"
);
assert.match(
  appMainSource,
  /showRerunRankingNavHintDot:\s*state\.showRerunRankingNavHintDot,/,
  "main setup return should expose showRerunRankingNavHintDot for template binding"
);

assert.match(
  templateSource,
  /@click="setView\('rerun-ranking'\)"/,
  "rerun-ranking nav entry should bind setView('rerun-ranking')"
);
assert.match(
  templateSource,
  /v-if="showRerunRankingNavHintDot"/,
  "rerun-ranking nav entry should conditionally render NEW badge from showRerunRankingNavHintDot"
);
assert.match(
  templateSource,
  /class="nav-hint-dot"/,
  "rerun-ranking nav entry should use nav-hint-dot style class"
);
assert.match(
  templateSource,
  />NEW<\/span>/,
  "rerun-ranking nav entry should render NEW badge text"
);
assert.match(
  templateSource,
  /\{\{\s*t\("nav\.rerun_ranking"\)\s*\}\}/,
  "rerun-ranking nav entry should render localized nav label"
);

assert.match(
  storagePersistenceSource,
  /state\.rerunRankingNavHintStorageKey/,
  "storage persistence managed key list should include rerun-ranking nav hint key"
);

console.log("task3-rerun-nav-new-dot: ok");
