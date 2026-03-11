const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const bootstrapEntrySource = read("js/bootstrap.entry.js");
const bootstrapErrorSource = read("js/bootstrap.error.js");

assert.match(
  bootstrapEntrySource,
  /publishBootProtocolValue\("buildBootDiagnosticBundle", "__buildBootDiagnosticBundle", buildBootDiagnosticBundle\)/,
  "[boot-diagnostic] bootstrap.entry should publish a boot diagnostic bundle builder"
);
assert.match(
  bootstrapEntrySource,
  /publishBootProtocolValue\("exportBootDiagnosticBundle", "__exportBootDiagnosticBundle", exportBootDiagnosticBundle\)/,
  "[boot-diagnostic] bootstrap.entry should publish a boot diagnostic bundle exporter"
);
assert.match(
  bootstrapEntrySource,
  /bootDiagnostics\.setResourceStateReader\(function \(\) \{/,
  "[boot-diagnostic] bootstrap.entry should connect the diagnostic bundle to resourceState"
);
assert.match(
  bootstrapEntrySource,
  /action_export_diag/,
  "[boot-diagnostic] bootstrap.entry boot i18n should define export diagnostics action text"
);
assert.match(
  bootstrapErrorSource,
  /resolveBootDiagnosticBuilder/,
  "[boot-diagnostic] bootstrap.error should resolve a boot diagnostic bundle builder"
);
assert.match(
  bootstrapErrorSource,
  /resolveBootDiagnosticExporter/,
  "[boot-diagnostic] bootstrap.error should resolve a boot diagnostic exporter"
);
assert.match(
  bootstrapErrorSource,
  /exportBootDiagnostics\(/,
  "[boot-diagnostic] bootstrap.error should expose local export behavior for fallback UI"
);
assert.match(
  bootstrapErrorSource,
  /exportButton\.textContent = bt\("action_export_diag"\)/,
  "[boot-diagnostic] bootstrap.error should render an export diagnostics action button"
);

console.log("task4-boot-diagnostic-export-contract: ok");
