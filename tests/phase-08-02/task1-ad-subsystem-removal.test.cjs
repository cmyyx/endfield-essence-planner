const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const assertNoMatch = (source, checks, scope) => {
  checks.forEach(({ label, pattern }) => {
    assert.doesNotMatch(
      source,
      pattern,
      `${scope} should not contain ad subsystem residue: ${label}`
    );
  });
};

const appUiSource = read("js/app.ui.js");
const templateSource = read("js/templates.main.01.js");
const appMainSource = read("js/app.main.js");
const appStateSource = read("js/app.state.js");

assertNoMatch(
  appUiSource,
  [
    { label: "adPreview query handling", pattern: /\badPreview\b/ },
    { label: "ad provider domain", pattern: /adwork/i },
    { label: "slotfeed failed event", pattern: /slotfeed:failed/ },
    { label: "ad visibility state", pattern: /\bcanShowAds\b/ },
    { label: "ad portrait state", pattern: /\bisAdPortrait\b/ },
    { label: "ad dismiss action", pattern: /dismissAdsForSession/ },
  ],
  "js/app.ui.js"
);

assertNoMatch(
  templateSource,
  [
    { label: "hero ad shell", pattern: /slot-hero-shell/ },
    { label: "inline ad card", pattern: /slot-inline-card/ },
    { label: "provider container", pattern: /slot-provider-net/ },
    { label: "ad provider class", pattern: /adwork-net/ },
    { label: "ad runtime binding", pattern: /\bcanShowAds\b/ },
    { label: "ad preview binding", pattern: /adPreviewMode/ },
    { label: "ad dismiss binding", pattern: /dismissAdsForSession/ },
  ],
  "js/templates.main.01.js"
);

assertNoMatch(
  appMainSource,
  [
    { label: "ad state exposure canShowAds", pattern: /canShowAds:\s*state\.canShowAds/ },
    { label: "ad state exposure adPreviewMode", pattern: /adPreviewMode:\s*state\.adPreviewMode/ },
    { label: "ad action exposure dismissAdsForSession", pattern: /dismissAdsForSession:\s*state\.dismissAdsForSession/ },
    { label: "ad state exposure isAdPortrait", pattern: /isAdPortrait:\s*state\.isAdPortrait/ },
  ],
  "js/app.main.js"
);

assertNoMatch(
  appStateSource,
  [
    { label: "ad state key canShowAds", pattern: /state\.canShowAds\s*=\s*ref\(/ },
    { label: "ad state key isAdPortrait", pattern: /state\.isAdPortrait\s*=\s*ref\(/ },
  ],
  "js/app.state.js"
);

console.log("task1-ad-subsystem-removal: ok");
