const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const appI18nFile = path.join(root, "js/app.i18n.js");
const bootstrapFile = path.join(root, "js/bootstrap.entry.js");
const templateMain04File = path.join(root, "js/templates.main.04.js");
const appMainFile = path.join(root, "js/app.main.js");

assert.equal(fs.existsSync(appI18nFile), true, "js/app.i18n.js should exist");
assert.equal(fs.existsSync(bootstrapFile), true, "js/bootstrap.entry.js should exist");
assert.equal(fs.existsSync(templateMain04File), true, "js/templates.main.04.js should exist");
assert.equal(fs.existsSync(appMainFile), true, "js/app.main.js should exist");

const appI18nSource = fs.readFileSync(appI18nFile, "utf8");
const bootstrapSource = fs.readFileSync(bootstrapFile, "utf8");
const templateMain04Source = fs.readFileSync(templateMain04File, "utf8");
const appMainSource = fs.readFileSync(appMainFile, "utf8");

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
  /const\s+missingI18nPlaceholder\s*=\s*"文案缺失";/,
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

assert.doesNotMatch(
  templateMain04Source,
  /t\(\(unifiedExceptionCurrent\s*&&\s*unifiedExceptionCurrent\.title\)\s*\|\|/,
  "runtime warning modal title should not treat dynamic title as i18n key"
);

assert.doesNotMatch(
  templateMain04Source,
  /t\(\s*\(unifiedExceptionCurrent\s*&&\s*unifiedExceptionCurrent\.summary\)\s*\|\|/,
  "runtime warning modal summary should not treat dynamic summary as i18n key"
);

assert.match(
  appMainSource,
  /scope\s*===\s*"i18n\.missing-key"/,
  "i18n missing-key warnings should allow direct ignore without secondary confirm"
);

assert.match(
  appI18nSource,
  /const\s+localizedTitle\s*=\s*interpolate\([\s\S]*"warning\.i18n_missing_key_title"[\s\S]*\);/,
  "missing-key warning title should use semantic i18n key and locale interpolation"
);

assert.match(
  appI18nSource,
  /const\s+localizedSummary\s*=\s*interpolate\([\s\S]*"warning\.i18n_missing_key_summary"[\s\S]*\);/,
  "missing-key warning summary should use semantic i18n key and locale interpolation"
);

console.log("task2-i18n-fallback-warning: ok");
