const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const gatePath = path.join(root, "scripts/phase-08-gate.mjs");

(async () => {
  const moduleRef = await import(pathToFileURL(gatePath).href);
  const commands = moduleRef.PHASE_08_GATE_COMMANDS;

  assert.ok(Array.isArray(commands), "[manifest] PHASE_08_GATE_COMMANDS should be an array");
  assert.ok(commands.length >= 12, "[manifest] gate should include full phase-08 + baseline checks");

  const required = [
    "node scripts/verify-doc-manifest-consistency.mjs",
    "node tests/phase-07-01/task1-doc-manifest-sync.test.cjs",
    "node tests/phase-07-01/task2-phase6-guardrail-doc-coverage.test.cjs",
    "node tests/phase-06-02/task1-bootstrap-protocol-compat.test.cjs",
    "node tests/phase-06-03/task2-init-order-contract.test.cjs",
    "node tests/phase-07-02/task2-version-payload-runtime-contract.test.cjs",
    "node tests/phase-08-01/task1-storage-v2-governance.test.cjs",
    "node tests/phase-08-02/task1-ad-subsystem-removal.test.cjs",
    "node tests/phase-08-03/task1-browser-smoke-gate.test.cjs",
    "node tests/phase-08-03/task2-update-embed-storage-contract.test.cjs",
    "node tests/phase-08-03/task3-up-rerun-critical-path.test.cjs",
    "node tests/phase-08-06/task1-ad-style-i18n-residue.test.cjs",
    "node tests/phase-03-01/task1-up-priority-partition.test.cjs",
    "node tests/phase-04-01/task1-rerun-gap-metrics.test.cjs",
    "node tests/phase-04-02/task1-route-nav-rerun-view.test.cjs",
  ];

  required.forEach((entry) => {
    assert.ok(
      commands.includes(entry),
      `[manifest] gate command list should include: ${entry}`
    );
  });

  console.log("task1-phase8-gate-manifest: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
