const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const scriptPath = path.join(root, "scripts/verify-doc-manifest-consistency.mjs");

(async () => {
  const { verifyDocManifestConsistency } = await import(pathToFileURL(scriptPath).href);
  const parsed = await verifyDocManifestConsistency({ rootDir: root });

  assert.equal(parsed.status, "ok", `script status should be ok, got: ${parsed.status}`);
  assert.deepEqual(parsed.missing, [], `missing entries should be empty: ${parsed.missing?.join(", ")}`);
  assert.deepEqual(parsed.extra, [], `extra entries should be empty: ${parsed.extra?.join(", ")}`);

  console.log("task1-doc-manifest-sync: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
