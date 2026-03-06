const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const manifestPath = path.join(root, "js/app.resource-manifest.js");
assert.equal(fs.existsSync(manifestPath), true, "js/app.resource-manifest.js should exist");

const manifest = require(manifestPath);
const bootstrapSource = read("js/bootstrap.entry.js");
const bootstrapResourcesSource = read("js/bootstrap.resources.js");
const appScriptChainSource = read("js/app.script-chain.js");

assert.ok(manifest && typeof manifest === "object", "resource manifest should export an object");
assert.ok(manifest.boot && typeof manifest.boot === "object", "resource manifest should export boot section");
assert.ok(Array.isArray(manifest.boot.css), "manifest.boot.css should be an array");
assert.ok(Array.isArray(manifest.boot.data), "manifest.boot.data should be an array");
assert.ok(Array.isArray(manifest.boot.runtime), "manifest.boot.runtime should be an array");
assert.ok(manifest.boot.optional && typeof manifest.boot.optional === "object", "manifest.boot.optional should be an object");
assert.ok(manifest.app && typeof manifest.app === "object", "resource manifest should export app section");
assert.ok(Array.isArray(manifest.app.scriptChain), "manifest.app.scriptChain should be an array");

assert.match(
  bootstrapSource,
  /__BOOTSTRAP_RESOURCES__/,
  "bootstrap entry should consume bootstrap.resources module as manifest access boundary"
);

assert.match(
  bootstrapResourcesSource,
  /__APP_RESOURCE_MANIFEST/,
  "bootstrap.resources should consume window.__APP_RESOURCE_MANIFEST"
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
assert.doesNotMatch(
  bootstrapSource,
  /^\s*(?:var|let|const)\s+(?:cssFiles|startupScripts|startupDataScripts|runtimePreludeScripts)\s*=\s*\[/m,
  "bootstrap should not maintain top-level resource array literals as secondary sources"
);

assert.match(
  appScriptChainSource,
  /__APP_RESOURCE_MANIFEST/,
  "app.script-chain should derive script chain from window.__APP_RESOURCE_MANIFEST"
);
assert.doesNotMatch(
  appScriptChainSource,
  /window\.__APP_SCRIPT_CHAIN\s*=\s*\[\s*["']\.\/js\/app\./,
  "app.script-chain should not assign a hardcoded script-chain array as a second source of truth"
);

console.log("task1-resource-manifest-single-source: ok");
