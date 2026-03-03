const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const appMainFile = path.join(root, "js/app.main.js");
const templateFile = path.join(root, "js/templates.main.01.js");

assert.equal(fs.existsSync(appMainFile), true, "js/app.main.js should exist");
assert.equal(fs.existsSync(templateFile), true, "js/templates.main.01.js should exist");

const appMainSource = fs.readFileSync(appMainFile, "utf8");
const templateSource = fs.readFileSync(templateFile, "utf8");

assert.match(
  appMainSource,
  /if\s*\(view\s*===\s*"rerun-ranking"\)\s*\{\s*return\s*\{\s*view:\s*"rerun-ranking"\s*\};\s*\}/,
  "parseRoute should recognize ?view=rerun-ranking and keep rerun-ranking as current view"
);

assert.match(
  appMainSource,
  /if\s*\(view\s*===\s*"rerun-ranking"\)\s*\{\s*return\s*"\/rerun-ranking";\s*\}/,
  "buildAnalyticsPath should emit /rerun-ranking for rerun ranking page"
);

assert.match(
  appMainSource,
  /legacyScrollbarHiddenViews\s*=\s*new\s+Set\(\[[\s\S]*"rerun-ranking"[\s\S]*\]\)/,
  "legacyScrollbarHiddenViews should include rerun-ranking for route/popstate parity"
);

assert.match(
  appMainSource,
  /const\s+onPopState\s*=\s*\(\)\s*=>\s*\{\s*applyRoute\(parseRoute\(\)\);\s*syncLegacyScrollbarMode\(\);\s*trackPageview\(\);\s*\};/,
  "onPopState should keep applyRoute/sync/track order for browser back-forward consistency"
);

assert.match(
  templateSource,
  /:class="\{\s*active:\s*currentView\s*===\s*'rerun-ranking'\s*\}"/,
  "main nav should expose active binding for rerun-ranking view"
);

assert.match(
  templateSource,
  /@click="setView\('rerun-ranking'\)"/,
  "main nav should provide setView('rerun-ranking') entry point"
);

console.log("task1-route-nav-rerun-view: ok");
