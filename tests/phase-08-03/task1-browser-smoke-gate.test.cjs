const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const has = (relativePath) => fs.existsSync(path.join(root, relativePath));

const requiredFiles = [
  "playwright.config.cjs",
  "tests/phase-08-03/helpers/static-server.cjs",
  "tests/phase-08-03/e2e/startup-and-fallback.spec.cjs",
];

requiredFiles.forEach((relativePath) => {
  assert.equal(
    has(relativePath),
    true,
    `[task1] ${relativePath} should exist for browser smoke coverage`
  );
});

assert.equal(has("package.json"), true, "[task1] package.json should exist");
const packageJson = JSON.parse(read("package.json"));

assert.equal(
  typeof packageJson.scripts?.["test:phase-08-03:e2e"],
  "string",
  "[task1] package.json should expose test:phase-08-03:e2e script"
);
assert.match(
  packageJson.scripts["test:phase-08-03:e2e"],
  /playwright test .*startup-and-fallback\.spec\.cjs/,
  "[task1] e2e script should execute startup-and-fallback playwright spec"
);

console.log("task1-browser-smoke-gate: ok");
