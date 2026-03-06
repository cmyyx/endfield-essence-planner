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
const mainSource = read("js/app.main.js");
const stateSource = read("js/app.state.js");
const modalsSource = read("js/app.modals.js");
const mainTemplate03Source = read("js/templates.main.03.js");

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
assert.match(
  scriptChainSource,
  /manifest\.app\.scriptChain/,
  "[schema] app.script-chain should bridge manifest.app.scriptChain"
);
assert.match(
  scriptChainSource,
  /window\.__APP_SCRIPT_CHAIN\s*=\s*manifestScriptChain/,
  "[schema] app.script-chain should expose manifest chain to window.__APP_SCRIPT_CHAIN"
);
[
  "./js/app.storage.schema.js",
  "./js/app.storage.persistence.js",
  "./js/app.storage.recovery.js",
  "./js/app.storage.diagnostic.js",
  "./js/app.storage.js",
].forEach((entry) => {
  assert.doesNotMatch(
    scriptChainSource,
    new RegExp(`["']${entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`),
    "[schema] app.script-chain should not hardcode storage module chain when manifest is source-of-truth"
  );
});

const initOrderMatch = mainSource.match(/const initExecutionOrder = \[([\s\S]*?)\];/);
assert.ok(initOrderMatch, "[cleanup] app.main should define initExecutionOrder for startup contract checks");
const initOrder = Array.from(initOrderMatch[1].matchAll(/"([^"]+)"/g)).map((match) => match[1]);
assert.ok(
  !initOrder.includes("initMigration"),
  "[cleanup] initExecutionOrder should not include initMigration after migration-chain removal"
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

assert.doesNotMatch(
  manifestSource,
  /["']\.\/js\/app\.migration\.js["']/,
  "[cleanup] app.resource-manifest should not load app.migration.js after migration-chain removal"
);
assert.doesNotMatch(
  scriptChainSource,
  /["']\.\/js\/app\.migration\.js["']/,
  "[cleanup] app.script-chain fallback output should not include app.migration.js after migration-chain removal"
);

[
  /\bstate\.showMigrationModal\b/,
  /\bstate\.migrationMappingMode\b/,
  /\bstate\.migrationConflictStrategy\b/,
  /\bstate\.showMigrationConfirmModal\b/,
  /\bstate\.migrationConfirmAction\b/,
  /\bstate\.migrationConfirmCountdown\b/,
  /\bstate\.migrationPreviewExpanded\b/,
  /\bstate\.migrationModalScrollable\b/,
].forEach((pattern) => {
  assert.doesNotMatch(
    stateSource,
    pattern,
    "[cleanup] app.state should not expose migration modal state after migration-chain removal"
  );
});

[
  /\bshowMigrationModal\b/,
  /\bshowMigrationConfirmModal\b/,
  /\bmigrationMappingMode\b/,
  /\bmigrationConflictStrategy\b/,
  /\bmigrationConfirmAction\b/,
  /\bmigrationConfirmCountdown\b/,
  /\bmigrationPreviewExpanded\b/,
  /\bmigrationModalScrollable\b/,
  /\bmigrationPreview\b/,
  /\bmigration-overlay\b/,
].forEach((pattern) => {
  assert.doesNotMatch(
    mainTemplate03Source,
    pattern,
    "[cleanup] templates.main.03 should not retain migration modal/template bindings after migration-chain removal"
  );
});

[
  /\bshowMigrationModal\b/,
  /\bshowMigrationConfirmModal\b/,
].forEach((pattern) => {
  assert.doesNotMatch(
    modalsSource,
    pattern,
    "[cleanup] app.modals should not access removed migration modal refs after migration-chain removal"
  );
});

console.log("task1-storage-v2-governance: ok");
