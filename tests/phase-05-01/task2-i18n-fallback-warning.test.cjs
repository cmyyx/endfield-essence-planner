const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const appI18nFile = path.join(root, "js/app.i18n.js");
const bootstrapFile = path.join(root, "js/bootstrap.entry.js");

assert.equal(fs.existsSync(appI18nFile), true, "js/app.i18n.js should exist");
assert.equal(fs.existsSync(bootstrapFile), true, "js/bootstrap.entry.js should exist");

const appI18nSource = fs.readFileSync(appI18nFile, "utf8");
const bootstrapSource = fs.readFileSync(bootstrapFile, "utf8");

assert.doesNotMatch(
  appI18nSource,
  /\.\/data\/i18n\.[A-Za-z-]+\.js/,
  "localeScriptMap should not use legacy ./data/i18n.{locale}.js paths"
);

assert.doesNotMatch(
  bootstrapSource,
  /\.\/data\/i18n\.[A-Za-z-]+\.js/,
  "bootstrap should not use legacy ./data/i18n.{locale}.js paths"
);

assert.match(
  appI18nSource,
  /const\s+missingI18nPlaceholder\s*=\s*"（文案缺失）";/,
  "t() should use a unified placeholder instead of leaking missing keys"
);

assert.match(
  appI18nSource,
  /const\s+raw\s*=\s*hasLocaleValue[\s\S]*\?\s*fallbackStrings\[key\][\s\S]*:\s*missingI18nPlaceholder;/,
  "t() should resolve with current locale -> zh-CN fallback -> placeholder"
);

assert.match(
  appI18nSource,
  /if\s*\(!hasLocaleValue\s*&&\s*!hasFallbackValue\)\s*\{\s*reportMissingI18nKey\(locale\.value,\s*key\);\s*\}/,
  "t() should report missing key when locale and zh-CN both miss"
);

assert.match(
  appI18nSource,
  /state\.reportRuntimeWarning\(warning,\s*\{[\s\S]*scope:\s*"i18n\.missing-key"[\s\S]*operation:\s*"i18n\.lookup"[\s\S]*key:\s*warningKey[\s\S]*asToast:\s*true[\s\S]*optionalSignature[\s\S]*\}\);/,
  "missing-key report should include scope/operation/key/asToast/optionalSignature metadata"
);

assert.match(
  appI18nSource,
  /const\s+optionalSignature\s*=\s*`i18n-missing-key:\$\{warningKey\}`;/,
  "missing-key warning should carry stable optionalSignature for dedupe"
);

assert.match(
  appI18nSource,
  /return\s+table\[value\]\s*\|\|\s*fallbackTable\[value\]\s*\|\|\s*value;/,
  "tTerm() should keep term fallback track and must not use UI placeholder"
);

console.log("task2-i18n-fallback-warning: ok");
