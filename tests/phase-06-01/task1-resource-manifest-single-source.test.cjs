const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const manifestPath = path.join(root, "js/app.resource-manifest.js");
assert.equal(fs.existsSync(manifestPath), true, "js/app.resource-manifest.js should exist");

const manifestSource = read("js/app.resource-manifest.js");
const bootstrapSource = read("js/bootstrap.entry.js");
const appScriptChainSource = read("js/app.script-chain.js");

const requiredManifestContracts = [
  /boot\s*:\s*\{[\s\S]*?\bcss\s*:/,
  /boot\s*:\s*\{[\s\S]*?\bdata\s*:/,
  /boot\s*:\s*\{[\s\S]*?\bruntime\s*:/,
  /boot\s*:\s*\{[\s\S]*?\boptional\s*:/,
  /app\s*:\s*\{[\s\S]*?\bscriptChain\s*:/,
];

requiredManifestContracts.forEach((contractPattern) => {
  assert.match(
    manifestSource,
    contractPattern,
    `resource manifest should define ${contractPattern}`
  );
});

assert.match(
  bootstrapSource,
  /__APP_RESOURCE_MANIFEST/,
  "bootstrap should consume window.__APP_RESOURCE_MANIFEST"
);

assert.doesNotMatch(
  bootstrapSource,
  /var\s+cssFiles\s*=\s*\[/,
  "bootstrap should no longer maintain a top-level cssFiles source array"
);

assert.doesNotMatch(
  bootstrapSource,
  /var\s+startupScripts\s*=\s*\[/,
  "bootstrap should no longer maintain a top-level startupScripts source array"
);

assert.match(
  appScriptChainSource,
  /__APP_RESOURCE_MANIFEST/,
  "app.script-chain should derive script chain from window.__APP_RESOURCE_MANIFEST"
);

console.log("task1-resource-manifest-single-source: ok");
