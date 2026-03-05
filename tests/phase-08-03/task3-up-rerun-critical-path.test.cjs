const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const packageJsonPath = path.join(root, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

assert.equal(
  typeof packageJson.scripts?.["test:phase-08-03:task3"],
  "string",
  "[task3] package.json should expose test:phase-08-03:task3 aggregator gate script"
);

const runCriticalPath = (relativePath, label) => {
  const absolutePath = path.join(root, relativePath);
  try {
    delete require.cache[require.resolve(absolutePath)];
    require(absolutePath);
  } catch (error) {
    throw new Error(
      `[task3][${label}] critical path assertion failed in ${relativePath}: ${error && error.message ? error.message : error}`
    );
  }
};

runCriticalPath(
  "tests/phase-03-01/task1-up-priority-partition.test.cjs",
  "up-priority-partition"
);
runCriticalPath(
  "tests/phase-04-01/task1-rerun-gap-metrics.test.cjs",
  "rerun-gap-metrics"
);
runCriticalPath(
  "tests/phase-04-02/task1-route-nav-rerun-view.test.cjs",
  "route-nav-rerun-view"
);

console.log("task3-up-rerun-critical-path: ok");
