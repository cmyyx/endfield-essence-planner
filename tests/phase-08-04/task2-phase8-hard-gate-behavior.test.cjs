const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const gateScript = path.join(root, "scripts/phase-08-gate.mjs");

if (process.env.PHASE08_GATE_RUNNING === "1") {
  const source = fs.readFileSync(gateScript, "utf8");
  assert.match(
    source,
    /if\s*\(\s*status\s*!==\s*0\s*\)\s*\{/,
    "[hard-gate] gate script should stop on first failing command"
  );
  console.log("task2-phase8-hard-gate-behavior: ok (in-gate static check)");
  process.exit(0);
}

const result = spawnSync("node", [gateScript], {
  cwd: root,
  stdio: "pipe",
  encoding: "utf8",
  env: {
    ...process.env,
    PHASE08_GATE_LIMIT: "1",
    PHASE08_GATE_SELFTEST_FAIL_STEP: "1",
  },
});

assert.notEqual(
  result.status,
  0,
  "[hard-gate] gate should return non-zero when any sub-command fails"
);

console.log("task2-phase8-hard-gate-behavior: ok");
