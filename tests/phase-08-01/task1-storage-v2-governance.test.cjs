const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const has = (relativePath) => fs.existsSync(path.join(root, relativePath));

const expectedModules = [
  "js/app.storage.schema.js",
  "js/app.storage.persistence.js",
  "js/app.storage.recovery.js",
  "js/app.storage.diagnostic.js",
];

expectedModules.forEach((relativePath) => {
  assert.equal(
    has(relativePath),
    true,
    `[schema] ${relativePath} should exist as an explicit v2 storage responsibility module`
  );
});

const manifestSource = read("js/app.resource-manifest.js");
const scriptChainSource = read("js/app.script-chain.js");
const storageSource = read("js/app.storage.js");

const assertOrderedModules = (source, label) => {
  const ordered = [
    "./js/app.storage.schema.js",
    "./js/app.storage.persistence.js",
    "./js/app.storage.recovery.js",
    "./js/app.storage.diagnostic.js",
    "./js/app.storage.js",
  ];
  let lastIndex = -1;
  ordered.forEach((entry) => {
    const index = source.indexOf(`"${entry}"`);
    assert.ok(index >= 0, `${label} should include ${entry}`);
    assert.ok(index > lastIndex, `${label} should load ${entry} before later storage chain modules`);
    lastIndex = index;
  });
};

assertOrderedModules(
  manifestSource,
  "[schema] app.resource-manifest app.scriptChain"
);
assertOrderedModules(
  scriptChainSource,
  "[schema] app.script-chain fallback output"
);

[
  "createStorageSchemaApi",
  "createStoragePersistenceApi",
  "createStorageRecoveryApi",
  "createStorageDiagnosticApi",
].forEach((symbol) => {
  assert.match(
    storageSource,
    new RegExp(`\\b${symbol}\\b`),
    `[schema] app.storage orchestrator should delegate to ${symbol}`
  );
});

[
  /localStorage\.getItem\(state\.legacyMarksStorageKey\)/,
  /localStorage\.getItem\(state\.legacyExcludedKey\)/,
  /readLegacyMarks\s*\(/,
  /legacyFromV1/,
  /legacyFromExcluded/,
].forEach((pattern) => {
  assert.doesNotMatch(
    storageSource,
    pattern,
    `[schema] app.storage should be v2-only and must not read legacy v1 marks as migration input`
  );
});

console.log("task1-storage-v2-governance: ok");
