const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const agentsSource = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
const readmeSource = fs.readFileSync(path.join(root, "README.md"), "utf8");

assert.match(
  agentsSource,
  /Phase 6/i,
  "AGENTS.md must explicitly document Phase 6 inherited constraints"
);
assert.match(
  agentsSource,
  /legacy bridge/i,
  "AGENTS.md must explicitly track legacy bridge constraints from Phase 6"
);
assert.match(
  agentsSource,
  /红灯治理|red[-\s]?flag/i,
  "AGENTS.md must explicitly include red-flag governance constraints for Phase 6 carry-over"
);
assert.match(
  agentsSource,
  /Phase 7/i,
  "AGENTS.md must explicitly describe Phase 7 documentation gate governance"
);

assert.match(
  readmeSource,
  /AGENTS\.md/i,
  "README.md must reference AGENTS.md as the executable maintenance checklist source"
);

console.log("task2-phase6-guardrail-doc-coverage: ok");
