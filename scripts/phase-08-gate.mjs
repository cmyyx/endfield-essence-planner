import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

export const PHASE_08_GATE_COMMANDS = Object.freeze([
  "node scripts/verify-doc-manifest-consistency.mjs",
  "node tests/phase-07-01/task1-doc-manifest-sync.test.cjs",
  "node tests/phase-07-01/task2-phase6-guardrail-doc-coverage.test.cjs",
  "node tests/phase-06-02/task1-bootstrap-protocol-compat.test.cjs",
  "node tests/phase-06-02/task2-bootstrap-behavior-freeze.test.cjs",
  "node tests/phase-06-03/task2-init-order-contract.test.cjs",
  "node tests/phase-07-02/task2-version-payload-runtime-contract.test.cjs",
  "node tests/phase-03-01/task1-up-priority-partition.test.cjs",
  "node tests/phase-04-01/task1-rerun-gap-metrics.test.cjs",
  "node tests/phase-04-02/task1-route-nav-rerun-view.test.cjs",
  "node tests/phase-08-01/task1-storage-v2-governance.test.cjs",
  "node tests/phase-08-02/task1-ad-subsystem-removal.test.cjs",
  "node tests/phase-08-03/task1-browser-smoke-gate.test.cjs",
  "node tests/phase-08-03/task2-update-embed-storage-contract.test.cjs",
  "node tests/phase-08-03/task3-up-rerun-critical-path.test.cjs",
  "node tests/phase-08-04/task1-phase8-gate-manifest.test.cjs",
  "node tests/phase-08-04/task2-phase8-hard-gate-behavior.test.cjs",
  "node tests/phase-08-04/task3-startup-script-chain-recovery-contract.test.cjs",
  "node tests/phase-08-04/task4-boot-diagnostic-export-contract.test.cjs",
  "node tests/phase-08-06/task1-ad-style-i18n-residue.test.cjs",
]);

const parsePositiveInt = (raw) => {
  const normalized = String(raw == null ? "" : raw).trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
};

const buildRuntimeCommands = () => {
  const limit = parsePositiveInt(process.env.PHASE08_GATE_LIMIT);
  const failStep = parsePositiveInt(process.env.PHASE08_GATE_SELFTEST_FAIL_STEP);

  const commands = [...PHASE_08_GATE_COMMANDS];
  const effective = limit ? commands.slice(0, limit) : commands;

  if (failStep && failStep <= effective.length) {
    effective[failStep - 1] = 'node -e "process.exit(1)"';
  }

  return effective;
};

const runPhase08Gate = () => {
  const commands = buildRuntimeCommands();
  console.log(`phase-08-gate: running ${commands.length} checks`);

  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index];
    const step = index + 1;
    console.log(`\n[${step}/${commands.length}] ${command}`);

    const result = spawnSync(command, {
      cwd: root,
      shell: true,
      stdio: "inherit",
      env: {
        ...process.env,
        PHASE08_GATE_RUNNING: "1",
      },
    });

    if (result.error) {
      const statusFromResult = typeof result.status === "number" ? result.status : 1;
      console.error(`phase-08-gate: failed to spawn step ${step}`);
      console.error(result.error);
      process.exitCode = statusFromResult;
      return;
    }
    const status = typeof result.status === "number" ? result.status : 1;
    if (status !== 0) {
      console.error(`phase-08-gate: failed at step ${step} with exit code ${status}`);
      process.exitCode = status;
      return;
    }
  }

  console.log("\nphase-08-gate: all checks passed");
};

if (path.resolve(process.argv[1] || "") === __filename) {
  runPhase08Gate();
}
