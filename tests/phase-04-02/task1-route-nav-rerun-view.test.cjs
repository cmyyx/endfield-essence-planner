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

const extractConstArrowBody = (source, name) => {
  const pattern = new RegExp(`const\\s+${name}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{([\\s\\S]*?)\\n\\s*\\};`);
  const match = source.match(pattern);
  assert.ok(match, `${name} should exist`);
  return match[1];
};

const parseRouteBody = extractConstArrowBody(appMainSource, "parseRoute");
assert.match(
  parseRouteBody,
  /if\s*\(\s*view\s*===\s*['"]rerun-ranking['"]\s*\)\s*\{[\s\S]*?return\s*\{\s*view\s*:\s*['"]rerun-ranking['"]\s*\}/,
  "parseRoute should map ?view=rerun-ranking to rerun-ranking route"
);

const buildAnalyticsPathBody = extractConstArrowBody(appMainSource, "buildAnalyticsPath");
assert.match(
  buildAnalyticsPathBody,
  /if\s*\(\s*view\s*===\s*['"]rerun-ranking['"]\s*\)\s*\{[\s\S]*?return\s*['"]\/rerun-ranking['"];?/,
  "buildAnalyticsPath should emit /rerun-ranking for rerun ranking page"
);

const declarationOrder = ["parseRoute", "buildAnalyticsPath", "legacyScrollbarHiddenViews", "onPopState"].map(
  (name) => {
    const match = new RegExp(`const\\s+${name}\\s*=`).exec(appMainSource);
    assert.ok(match, `${name} declaration should exist`);
    return { name, index: match.index };
  }
);
for (let i = 1; i < declarationOrder.length; i += 1) {
  assert.ok(
    declarationOrder[i - 1].index < declarationOrder[i].index,
    `${declarationOrder[i - 1].name} should be declared before ${declarationOrder[i].name}`
  );
}

const legacyViewsMatch = appMainSource.match(
  /const\s+legacyScrollbarHiddenViews\s*=\s*new\s+Set\s*\(\s*\[([\s\S]*?)\]\s*\)/
);
assert.ok(legacyViewsMatch, "legacyScrollbarHiddenViews should be defined as a Set literal");
const legacyViews = Array.from(legacyViewsMatch[1].matchAll(/['"]([^'"]+)['"]/g), (match) => match[1]);
assert.ok(
  legacyViews.includes("rerun-ranking"),
  "legacyScrollbarHiddenViews should include rerun-ranking for route/popstate parity"
);

const onPopStateBody = extractConstArrowBody(appMainSource, "onPopState");
const onPopStateCallOrder = Array.from(
  onPopStateBody.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*\(/gm),
  (match) => match[1]
);
const applyRouteIndex = onPopStateCallOrder.indexOf("applyRoute");
const syncIndex = onPopStateCallOrder.indexOf("syncLegacyScrollbarMode");
const trackIndex = onPopStateCallOrder.indexOf("trackPageview");
assert.ok(applyRouteIndex >= 0, "onPopState should call applyRoute(...) at top level");
assert.ok(syncIndex >= 0, "onPopState should call syncLegacyScrollbarMode() at top level");
assert.ok(trackIndex >= 0, "onPopState should call trackPageview() at top level");
assert.ok(
  applyRouteIndex < syncIndex && syncIndex < trackIndex,
  "onPopState should keep applyRoute -> sync -> track order for browser back-forward consistency"
);

assert.match(
  templateSource,
  /:class\s*=\s*["']\{\s*active\s*:\s*currentView\s*===\s*['"]rerun-ranking['"]\s*\}["']/,
  "main nav should expose active binding for rerun-ranking view"
);

assert.match(
  templateSource,
  /@click\s*=\s*["']setView\(\s*['"]rerun-ranking['"]\s*\)["']/,
  "main nav should provide setView('rerun-ranking') entry point"
);

console.log("task1-route-nav-rerun-view: ok");
