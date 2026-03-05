const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const appMainSource = read("js/app.main.js");
const appUiSource = read("js/app.ui.js");
const templateSource = read("js/templates.main.01.js");
const recommendationStylesSource = read("css/styles.recommendations.css");

assert.match(
  appMainSource,
  /if\s*\(view\s*===\s*"rerun-ranking"\)\s*\{\s*return\s*\{\s*view:\s*"rerun-ranking"\s*\};\s*\}/,
  "rerun-ranking route parsing should remain available after ad removal"
);

assert.match(
  appMainSource,
  /if\s*\(view\s*===\s*"rerun-ranking"\)\s*\{\s*return\s*"\/rerun-ranking";\s*\}/,
  "rerun-ranking analytics path should remain available after ad removal"
);

assert.match(
  templateSource,
  /@click="setView\('planner'\)"/,
  "planner nav entry should remain available after ad removal"
);

assert.match(
  templateSource,
  /@click="setView\('strategy'\)"/,
  "strategy nav entry should remain available after ad removal"
);

assert.match(
  templateSource,
  /@click="setView\('match'\)"/,
  "match nav entry should remain available after ad removal"
);

assert.match(
  templateSource,
  /@click="setView\('gear-refining'\)"/,
  "gear-refining nav entry should remain available after ad removal"
);

assert.match(
  templateSource,
  /@click="setView\('rerun-ranking'\)"/,
  "rerun-ranking nav entry should remain available after ad removal"
);

assert.match(
  appUiSource,
  /state\.scrollToTop\s*=\s*scrollToTop;/,
  "scroll-to-top interaction should remain available after ad removal"
);

assert.match(
  appUiSource,
  /state\.setThemeMode\s*=\s*setThemeMode;/,
  "theme interaction should remain available after ad removal"
);

assert.match(
  appUiSource,
  /state\.togglePlanConfig\s*=\s*togglePlanConfig;/,
  "plan configuration interaction should remain available after ad removal"
);

[
  { source: templateSource, pattern: /slot-hero-shell/, scope: "template hero ad slot" },
  { source: templateSource, pattern: /slot-inline-card/, scope: "template inline ad slot" },
  { source: templateSource, pattern: /adwork-net/, scope: "template ad provider container" },
  { source: recommendationStylesSource, pattern: /\.slot-hero-shell/, scope: "recommendation ad hero styles" },
  { source: recommendationStylesSource, pattern: /\.slot-inline-card/, scope: "recommendation inline ad styles" },
  { source: appUiSource, pattern: /slotfeed:failed/, scope: "ui ad failure event listener" },
].forEach(({ source, pattern, scope }) => {
  assert.doesNotMatch(source, pattern, `${scope} should be removed`);
});

console.log("task2-ad-removal-functional-regression: ok");
