import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const normalize = (entry) => String(entry || "").trim().replace(/^\.\//, "");

const collectExpectedEntries = (manifest) => {
  const runtimeEntries = Array.isArray(manifest?.boot?.runtime) ? manifest.boot.runtime : [];
  const dataEntries = Array.isArray(manifest?.boot?.data) ? manifest.boot.data : [];
  const appEntries = Array.isArray(manifest?.app?.scriptChain) ? manifest.app.scriptChain : [];

  const keyDataEntries = dataEntries.filter((entry) => entry === "./js/app.resource-manifest.js");
  const keyAppEntries = appEntries.filter(
    (entry) => entry.startsWith("./js/templates.") || entry === "./js/app.main.js"
  );

  return Array.from(new Set([...runtimeEntries, ...keyDataEntries, ...keyAppEntries].map(normalize))).sort();
};

const extractDocumentedEntries = (source) =>
  Array.from(source.matchAll(/`(?:\.\/)?((?:js|vendor)\/[^`]+?\.js)`/g), (match) => match[1]);

const extractDocumentedTemplates = (source) =>
  Array.from(source.matchAll(/`(?:\.\/)?(js\/templates\.[^`]+?\.js)`/g), (match) => match[1]);

export const verifyDocManifestConsistency = async ({ rootDir = root } = {}) => {
  const manifestPath = path.join(rootDir, "js/app.resource-manifest.js");
  const scriptChainPath = path.join(rootDir, "js/app.script-chain.js");
  const agentsPath = path.join(rootDir, "AGENTS.md");
  const manifest = require(manifestPath);
  const [scriptChainSource, agentsSource] = await Promise.all([
    fs.readFile(scriptChainPath, "utf8"),
    fs.readFile(agentsPath, "utf8"),
  ]);

  if (!scriptChainSource.includes("__APP_RESOURCE_MANIFEST")) {
    throw new Error("app.script-chain.js must derive from window.__APP_RESOURCE_MANIFEST");
  }

  const expectedEntries = collectExpectedEntries(manifest);
  const documentedEntries = new Set(extractDocumentedEntries(agentsSource).map(normalize));
  const missing = expectedEntries.filter((entry) => !documentedEntries.has(entry));

  const manifestTemplateSet = new Set(
    (Array.isArray(manifest?.app?.scriptChain) ? manifest.app.scriptChain : [])
      .filter((entry) => entry.startsWith("./js/templates."))
      .map(normalize)
  );
  const extra = extractDocumentedTemplates(agentsSource)
    .map(normalize)
    .filter((entry) => !manifestTemplateSet.has(entry));

  const result = {
    status: missing.length || extra.length ? "mismatch" : "ok",
    missing,
    extra,
    expectedCount: expectedEntries.length,
  };

  return result;
};

const run = async () => {
  const result = await verifyDocManifestConsistency();
  const output = JSON.stringify(result, null, 2);
  if (result.status === "ok") {
    console.log(output);
    return;
  }

  console.error(output);
  process.exitCode = 1;
};

if (path.resolve(process.argv[1] || "") === __filename) {
  run().catch((error) => {
    console.error(
      JSON.stringify(
        {
          status: "error",
          error: error?.message || String(error),
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  });
}
