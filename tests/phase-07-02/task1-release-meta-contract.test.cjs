const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const scriptPath = path.join(root, "scripts/gen-version.mjs");
const requiredCoreFields = ["buildId", "displayVersion", "announcementVersion", "fingerprint", "publishedAt"];

(async () => {
  const mod = await import(`${pathToFileURL(scriptPath).href}?ts=${Date.now()}`);

  assert.equal(
    typeof mod.validateReleaseMeta,
    "function",
    "gen-version should export validateReleaseMeta for contract validation"
  );
  assert.equal(
    typeof mod.buildVersionPayload,
    "function",
    "gen-version should export buildVersionPayload for deterministic payload generation"
  );

  assert.throws(
    () => mod.validateReleaseMeta({ announcementVersion: "1.5.0" }),
    /required|missing|fingerprint/i,
    "release-meta missing required fields must fail contract validation"
  );

  assert.doesNotThrow(
    () =>
      mod.validateReleaseMeta({
        announcementVersion: "1.5.0",
        fingerprint: "cmty-ep-2026-02-07",
      }),
    "release-meta with required fields should pass validation"
  );

  const payload = mod.buildVersionPayload(
    {
      announcementVersion: "1.5.0",
      fingerprint: "cmty-ep-2026-02-07",
    },
    new Date("2026-03-01T14:38:40.644Z")
  );

  requiredCoreFields.forEach((field) => {
    assert.ok(
      typeof payload[field] === "string" && payload[field].trim().length > 0,
      `version payload must include non-empty core field: ${field}`
    );
  });

  console.log("task1-release-meta-contract: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
