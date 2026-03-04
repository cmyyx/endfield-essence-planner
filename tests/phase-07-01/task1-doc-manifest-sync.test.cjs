const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const manifest = require(path.join(root, "js/app.resource-manifest.js"));
const agentsSource = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");

const normalize = (entry) => entry.replace(/^\.\//, "");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const criticalStartupEntries = [
  "./vendor/vue.global.prod.js",
  "./js/app.resource-manifest.js",
  "./js/app.script-chain.js",
  "./js/bootstrap.entry.js",
  "./js/app.js",
  "./js/app.main.js",
];

const manifestTemplateEntries = manifest.app.scriptChain.filter((item) =>
  item.startsWith("./js/templates.")
);
const expectedDocumentedEntries = [...criticalStartupEntries, ...manifestTemplateEntries].map(
  normalize
);

const missingEntries = expectedDocumentedEntries.filter((entry) => {
  const withDotSlash = `./${entry}`;
  const pattern = new RegExp(`\`(?:${escapeRegex(withDotSlash)}|${escapeRegex(entry)})\``);
  return !pattern.test(agentsSource);
});

const documentedTemplateEntries = Array.from(
  agentsSource.matchAll(/`(?:\.\/)?(js\/templates\.[^`]+?\.js)`/g),
  (match) => match[1]
);
const manifestTemplateSet = new Set(manifestTemplateEntries.map(normalize));
const extraTemplateEntries = documentedTemplateEntries.filter((entry) => !manifestTemplateSet.has(entry));

assert.deepEqual(
  missingEntries,
  [],
  `AGENTS.md is missing startup documentation entries: ${missingEntries.join(", ")}`
);
assert.deepEqual(
  extraTemplateEntries,
  [],
  `AGENTS.md has undocumented template entries not found in manifest/script-chain: ${extraTemplateEntries.join(", ")}`
);

console.log("task1-doc-manifest-sync: ok");
