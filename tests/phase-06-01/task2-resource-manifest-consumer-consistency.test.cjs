const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const manifestPath = path.join(root, "js/app.resource-manifest.js");
assert.equal(fs.existsSync(manifestPath), true, "resource manifest file should exist");

const manifestSource = read("js/app.resource-manifest.js");
const bootstrapSource = read("js/bootstrap.entry.js");
const appScriptChainSource = read("js/app.script-chain.js");

const expectedMarkers = [
  "./vendor/vue.global.prod.js",
  "./data/version.js",
  "./data/up-schedules.js",
  "./js/app.script-chain.js",
  "./js/app.js",
  "./js/app.main.js",
];

expectedMarkers.forEach((marker) => {
  assert.match(
    manifestSource,
    new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `manifest should keep critical startup marker: ${marker}`
  );
});

assert.match(
  bootstrapSource,
  /boot\s*\.\s*css|boot\.css/,
  "bootstrap should read boot.css from manifest"
);
assert.match(
  bootstrapSource,
  /boot\s*\.\s*data|boot\.data/,
  "bootstrap should read boot.data from manifest"
);
assert.match(
  bootstrapSource,
  /boot\s*\.\s*runtime|boot\.runtime/,
  "bootstrap should read boot.runtime from manifest"
);
assert.match(
  bootstrapSource,
  /boot\s*\.\s*optional|boot\.optional/,
  "bootstrap should read boot.optional from manifest"
);

assert.match(
  appScriptChainSource,
  /app\s*\.\s*scriptChain|app\.scriptChain/,
  "app.script-chain should read app.scriptChain from manifest"
);

console.log("task2-resource-manifest-consumer-consistency: ok");
