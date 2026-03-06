const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

const migrationScopeFiles = [
  "js/templates.plan-config.js",
  "js/templates.main.01.js",
  "js/templates.main.02.js",
  "js/templates.main.03.js",
  "js/templates.main.04.js",
  "js/app.main.js",
  "js/app.ui.js",
  "js/app.update.js",
  "js/app.embed.js",
];

const literalCallPattern = /(?<![\w$.])(?:state\.)?t\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g;
const hasCjk = /[\u3040-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;

const violations = [];

for (const relativePath of migrationScopeFiles) {
  const filePath = path.join(root, relativePath);
  assert.equal(fs.existsSync(filePath), true, `${relativePath} should exist`);

  const source = fs.readFileSync(filePath, "utf8");
  const matches = source.matchAll(literalCallPattern);
  for (const match of matches) {
    const quote = match[1];
    const rawLiteral = match[2];
    const looksDynamicTemplate = quote === "`" && rawLiteral.includes("${");
    if (looksDynamicTemplate) continue;

    if (hasCjk.test(rawLiteral)) {
      violations.push(
        `${relativePath}: literal CJK key is forbidden in t()/state.t() -> ${JSON.stringify(rawLiteral)}`
      );
    }
  }
}

assert.equal(
  violations.length,
  0,
  `Semantic key migration violations found:\n${violations.join("\n")}`
);

console.log("task1-semantic-key-migration: ok");
