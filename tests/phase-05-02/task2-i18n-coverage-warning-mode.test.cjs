const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");

const scopeFiles = [
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

const requiredDomains = new Set([
  "nav",
  "button",
  "error",
  "rerun",
  "tutorial",
  "storage",
  "update",
  "warning",
  "optional",
  "plan_config",
  "filter",
  "plan",
  "guide",
  "label",
  "badge",
  "gear_refining",
  "version",
  "embed",
]);

const translationCallPattern = /(?<![\w$.])(?:state\.)?t\(\s*(['"])([^'"]+)\1/g;

function loadLocaleStrings(locale) {
  const filePath = path.join(root, "data/i18n", `${locale}.js`);
  assert.equal(fs.existsSync(filePath), true, `Missing locale file: ${path.relative(root, filePath)}`);
  const source = fs.readFileSync(filePath, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const table =
    sandbox.window &&
    sandbox.window.I18N &&
    sandbox.window.I18N[locale] &&
    sandbox.window.I18N[locale].strings;
  assert.ok(table && typeof table === "object", `${locale} should expose strings table`);
  return table;
}

function collectRequiredKeys() {
  const keySet = new Set();
  for (const relativePath of scopeFiles) {
    const filePath = path.join(root, relativePath);
    assert.equal(fs.existsSync(filePath), true, `${relativePath} should exist`);
    const source = fs.readFileSync(filePath, "utf8");
    for (const match of source.matchAll(translationCallPattern)) {
      const key = match[2];
      if (!key.includes(".")) continue;
      const domain = key.split(".")[0];
      if (!requiredDomains.has(domain)) continue;
      keySet.add(key);
    }
  }
  return Array.from(keySet).sort();
}

function runCoverageWarningMode(baseStrings, localeStrings, locale, requiredKeys) {
  const missing = requiredKeys.filter((key) => !Object.prototype.hasOwnProperty.call(localeStrings, key));
  const warnings = missing.map((key) => `[i18n-warning] locale=${locale} missing-key=${key}`);
  return {
    missing,
    warnings,
    exitCode: 0,
    summary: `${locale}: ${requiredKeys.length - missing.length}/${requiredKeys.length} covered`,
    fallbackSample: missing[0] ? baseStrings[missing[0]] : null,
  };
}

const zhCnStrings = loadLocaleStrings("zh-CN");
const requiredKeys = collectRequiredKeys();
assert.ok(requiredKeys.length > 0, "required key set should not be empty");
const zhCnMissingKeys = requiredKeys.filter((key) => !Object.prototype.hasOwnProperty.call(zhCnStrings, key));
assert.deepEqual(
  zhCnMissingKeys,
  [],
  `zh-CN should fully cover required keys:\n${zhCnMissingKeys.join("\n")}`
);

// warning-only contract: when keys are missing, checker should still report success exit code.
const warningModeProbe = runCoverageWarningMode(
  zhCnStrings,
  {},
  "probe-locale",
  requiredKeys.slice(0, 2)
);
assert.equal(warningModeProbe.exitCode, 0, "warning-mode checker must stay non-blocking");
assert.ok(
  warningModeProbe.warnings.length > 0,
  "warning-mode checker should emit warnings for missing keys"
);

const localesToCover = ["zh-TW", "en", "ja"];
const allWarnings = [];

for (const locale of localesToCover) {
  const localeStrings = loadLocaleStrings(locale);
  const result = runCoverageWarningMode(zhCnStrings, localeStrings, locale, requiredKeys);
  allWarnings.push(...result.warnings);
}

assert.equal(
  allWarnings.length,
  0,
  `Locale coverage warnings:\n${allWarnings.join("\n")}`
);

console.log("task2-i18n-coverage-warning-mode: ok");
