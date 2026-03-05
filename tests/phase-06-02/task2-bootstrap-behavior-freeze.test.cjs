const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const entrySource = read("js/bootstrap.entry.js");
const resourcesModulePath = path.join(root, "js/bootstrap.resources.js");
const optionalModulePath = path.join(root, "js/bootstrap.optional.js");
const errorModulePath = path.join(root, "js/bootstrap.error.js");

assert.equal(
  fs.existsSync(resourcesModulePath),
  true,
  "bootstrap.resources module should exist to freeze resource-loading behavior"
);
assert.equal(
  fs.existsSync(optionalModulePath),
  true,
  "bootstrap.optional module should exist to freeze optional retry/dedupe behavior"
);
assert.equal(
  fs.existsSync(errorModulePath),
  true,
  "bootstrap.error module should exist to freeze boot error rendering behavior"
);

const resourcesSource = read("js/bootstrap.resources.js");
const optionalSource = read("js/bootstrap.optional.js");
const errorSource = read("js/bootstrap.error.js");

const frozenPreloadKeys = [
  "preload_status_prepare",
  "preload_status_failed",
  "preload_status_ready",
  "action_retry",
  "action_refresh",
  "action_feedback",
];

frozenPreloadKeys.forEach((key) => {
  assert.match(
    entrySource,
    new RegExp(`${key.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`),
    `bootstrap entry should keep preload/error i18n key: ${key}`
  );
});

assert.match(
  resourcesSource,
  /function\s+loadScript|var\s+loadScript\s*=\s*function/,
  "bootstrap.resources should own loadScript behavior"
);
assert.match(
  resourcesSource,
  /function\s+loadStyle|var\s+loadStyle\s*=\s*function/,
  "bootstrap.resources should own loadStyle behavior"
);
assert.match(
  resourcesSource,
  /resourceState/,
  "bootstrap.resources should own preload resourceState and progress calculation"
);

assert.match(
  optionalSource,
  /planner:optional-resource-failed/,
  "bootstrap.optional should keep optional failure event channel"
);
assert.match(
  optionalSource,
  /__bootOptionalLoadFailures/,
  "bootstrap.optional should keep optional failure queue key"
);
assert.match(
  optionalSource,
  /signature/,
  "bootstrap.optional should preserve optional failure dedupe signature semantics"
);

assert.match(
  errorSource,
  /boot-error-overlay/,
  "bootstrap.error should keep boot error overlay behavior"
);

const entryLineCount = entrySource.split(/\r?\n/).length;
// User-approved waiver: bootstrap.entry.js may exceed the previous 1080 budget.
const entryLineBudget = 1200;
assert.ok(
  entryLineCount <= entryLineBudget,
  `bootstrap.entry should stay within orchestrator complexity budget (<=${entryLineBudget} lines), got ${entryLineCount}`
);

const protocolMatches = Array.from(entrySource.matchAll(/window\.__([A-Za-z0-9_]+)\s*=(?!=)/g)).map((match) => match[1]);
const uniqueProtocols = Array.from(new Set(protocolMatches));
const allowedProtocols = new Set([
  "bootI18n",
  "bootStorageProbe",
  "bootCacheBustToken",
  "bootstrapEntryRunning",
  "finishPreload",
  "startBootstrapEntry",
]);
const unexpectedProtocols = uniqueProtocols.filter((name) => !allowedProtocols.has(name));
assert.deepEqual(
  unexpectedProtocols,
  [],
  `bootstrap.entry should not introduce new top-level window protocol assignments: ${unexpectedProtocols.join(", ")}`
);

console.log("task2-bootstrap-behavior-freeze: ok");
