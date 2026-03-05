const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const diagnosticsFile = path.join(root, "js/app.diagnostics.js");

(() => {
  assert.ok(fs.existsSync(diagnosticsFile), "js/app.diagnostics.js should exist");

  const diagnosticsSource = fs.readFileSync(diagnosticsFile, "utf8");
  const context = {
    window: {},
    Date,
    Math,
    console,
  };

  vm.runInNewContext(diagnosticsSource, context, { filename: diagnosticsFile });

  const diagnosticsApi = context.window.__APP_DIAGNOSTICS__;
  assert.ok(diagnosticsApi && typeof diagnosticsApi === "object", "__APP_DIAGNOSTICS__ should be exposed");
  assert.equal(
    typeof diagnosticsApi.createDiagnosticsReporter,
    "function",
    "__APP_DIAGNOSTICS__.createDiagnosticsReporter should be a function"
  );

  const sinkEvents = [];
  const reporter = diagnosticsApi.createDiagnosticsReporter({
    sink: (entry) => sinkEvents.push(entry),
    sampleRate: 1,
    random: () => 0.25,
  });
  assert.equal(typeof reporter.report, "function", "createDiagnosticsReporter should return reporter.report");

  const reportResult = reporter.report({
    module: "app.update",
    operation: "update.check",
    kind: "fetch-failed",
    resource: "./data/version.json",
  });
  assert.equal(reportResult && reportResult.recorded, true, "valid event should be recorded when enabled");
  assert.equal(sinkEvents.length, 1, "sink should receive exactly one event");

  const event = sinkEvents[0];
  ["module", "operation", "kind", "resource", "timestamp"].forEach((field) => {
    assert.ok(
      typeof event[field] === "string" && event[field].trim().length > 0,
      `recorded event should include non-empty field: ${field}`
    );
  });
  assert.ok(!Number.isNaN(Date.parse(event.timestamp)), "timestamp should be parseable ISO text");

  const disabledEvents = [];
  const disabledReporter = diagnosticsApi.createDiagnosticsReporter({
    enabled: false,
    sink: (entry) => disabledEvents.push(entry),
  });
  const disabledResult = disabledReporter.report({
    module: "app.embed",
    operation: "content.prefetch",
    kind: "non-fatal",
    resource: "content",
  });
  assert.equal(disabledResult && disabledResult.recorded, false, "disabled diagnostics should skip recording");
  assert.equal(disabledEvents.length, 0, "disabled diagnostics should not write to sink");

  const sampledEvents = [];
  const sampledReporter = diagnosticsApi.createDiagnosticsReporter({
    sampleRate: 0,
    random: () => 0.99,
    sink: (entry) => sampledEvents.push(entry),
  });
  const sampledResult = sampledReporter.report({
    module: "bootstrap.resources",
    operation: "resource.load",
    kind: "script-error",
    resource: "./js/app.js",
  });
  assert.equal(sampledResult && sampledResult.recorded, false, "sampled-out diagnostics should skip recording");
  assert.equal(sampledEvents.length, 0, "sampled-out diagnostics should not write to sink");

  console.log("task1-diagnostic-schema-and-toggle: ok");
})();
