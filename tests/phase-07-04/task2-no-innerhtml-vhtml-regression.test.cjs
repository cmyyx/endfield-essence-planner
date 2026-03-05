const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const templateFile = path.join(root, "js/templates.main.03.js");
const bootstrapFile = path.join(root, "js/bootstrap.entry.js");

const templateSource = fs.readFileSync(templateFile, "utf8");
const bootstrapSource = fs.readFileSync(bootstrapFile, "utf8");

assert.doesNotMatch(
  templateSource,
  /\bv-html\s*=/,
  "announcement template must not rely on v-html rendering"
);
assert.match(
  templateSource,
  /formatNoticeItem\(/,
  "announcement template should render through structured notice tokens"
);

assert.doesNotMatch(
  bootstrapSource,
  /preload\.innerHTML\s*=/,
  "bootstrap preload shell must not be assembled through preload.innerHTML"
);
assert.doesNotMatch(
  bootstrapSource,
  /\.innerHTML\s*=/,
  "bootstrap entry should avoid direct innerHTML assignment in preload path"
);

console.log("task2-no-innerhtml-vhtml-regression: ok");
