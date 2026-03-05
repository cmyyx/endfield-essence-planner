const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const reportCallPattern =
  /reportNonFatalDiagnostic\s*\(|__reportNonFatalDiagnostic\s*\(|state\.reportNonFatalDiagnostic\s*\(/;

const assertStructuredDiagnosticHook = (relativePath, moduleName) => {
  const filePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(filePath), `${relativePath} should exist`);

  const source = fs.readFileSync(filePath, "utf8");
  assert.match(
    source,
    reportCallPattern,
    `${relativePath} should call unified non-fatal diagnostics reporter`
  );
  assert.match(
    source,
    new RegExp(`module\\s*:\\s*["']${escapeRegex(moduleName)}["']`),
    `${relativePath} should report diagnostic module=${moduleName}`
  );
  ["operation", "kind", "resource"].forEach((field) => {
    assert.match(
      source,
      new RegExp(`${field}\\s*:`),
      `${relativePath} should report diagnostic field: ${field}`
    );
  });
};

(() => {
  const coverageTargets = [
    { file: "js/app.update.js", module: "app.update" },
    { file: "js/app.embed.js", module: "app.embed" },
    { file: "js/bootstrap.entry.js", module: "bootstrap.entry" },
    { file: "js/bootstrap.resources.js", module: "bootstrap.resources" },
    { file: "js/bootstrap.optional.js", module: "bootstrap.optional" },
  ];

  coverageTargets.forEach((target) => {
    assertStructuredDiagnosticHook(target.file, target.module);
  });

  console.log("task2-nonfatal-path-coverage: ok");
})();
