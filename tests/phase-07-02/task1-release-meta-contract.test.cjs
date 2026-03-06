const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const scriptPath = path.join(root, "scripts/gen-version.mjs");
const scriptSource = fs.readFileSync(scriptPath, "utf8");
const requiredInputFields = ["announcementVersion", "fingerprint"];
const requiredCoreFields = ["buildId", "displayVersion", "announcementVersion", "fingerprint", "publishedAt"];

assert.doesNotMatch(
  scriptSource,
  /release-meta/i,
  "gen-version should no longer depend on release-meta inputs"
);

(async () => {
  const mod = await import(`${pathToFileURL(scriptPath).href}?ts=${Date.now()}`);

  assert.equal(
    typeof mod.readVersionInputs,
    "function",
    "gen-version should export readVersionInputs"
  );
  assert.equal(
    typeof mod.validateVersionInputs,
    "function",
    "gen-version should export validateVersionInputs"
  );
  assert.equal(
    typeof mod.buildVersionPayload,
    "function",
    "gen-version should export buildVersionPayload for deterministic payload generation"
  );

  assert.throws(
    () => mod.validateVersionInputs({ announcementVersion: "1.5.0" }),
    /required|missing|fingerprint/i,
    "version inputs missing required fields must fail contract validation"
  );

  const inputs = await mod.readVersionInputs();
  requiredInputFields.forEach((field) => {
    assert.ok(
      typeof inputs[field] === "string" && inputs[field].trim().length > 0,
      `version inputs must include non-empty field: ${field}`
    );
  });

  const payload = mod.buildVersionPayload(
    inputs,
    new Date("2026-03-01T14:38:40.644Z")
  );

  requiredCoreFields.forEach((field) => {
    assert.ok(
      typeof payload[field] === "string" && payload[field].trim().length > 0,
      `version payload must include non-empty core field: ${field}`
    );
  });
  assert.equal(payload.announcementVersion, inputs.announcementVersion);
  assert.equal(payload.fingerprint, inputs.fingerprint);

  console.log("task1-version-input-contract: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
