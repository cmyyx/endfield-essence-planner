const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const bootstrapFile = path.join(root, "js/bootstrap.entry.js");
const manifestFile = path.join(root, "js/app.resource-manifest.js");
const i18nFile = path.join(root, "js/app.i18n.js");
const zhCnFile = path.join(root, "data/i18n/zh-CN.js");

assert.equal(fs.existsSync(bootstrapFile), true, "js/bootstrap.entry.js should exist");
assert.equal(fs.existsSync(manifestFile), true, "js/app.resource-manifest.js should exist");
assert.equal(fs.existsSync(i18nFile), true, "js/app.i18n.js should exist");

const bootstrapSource = fs.readFileSync(bootstrapFile, "utf8");
const bootstrapResourcesSource = fs.readFileSync(
  path.join(root, "js/bootstrap.resources.js"),
  "utf8"
);
const appI18nSource = fs.readFileSync(i18nFile, "utf8");
const manifest = require(manifestFile);

const normalizeSet = (items) => Array.from(new Set(items)).sort();
const expectedLocalePaths = normalizeSet(
  ["zh-CN", "zh-TW", "en", "ja"].map((locale) => `./data/i18n/${locale}.js`)
);
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

assert.equal(
  Array.isArray(manifest.boot && manifest.boot.data),
  true,
  "manifest boot.data should be defined"
);
const manifestI18nPaths = normalizeSet(
  manifest.boot.data.filter((value) => /^\.\/data\/i18n\/[^"']+\.js$/.test(value))
);

assert.match(
  bootstrapSource,
  /__BOOTSTRAP_RESOURCES__/,
  "bootstrap should consume bootstrap.resources as i18n startup source boundary"
);
assert.match(
  bootstrapResourcesSource,
  /__APP_RESOURCE_MANIFEST/,
  "bootstrap.resources should consume window.__APP_RESOURCE_MANIFEST as i18n startup source"
);
assert.match(
  bootstrapSource,
  /startupDataScripts\.map\(\s*function\s*\(src\)\s*\{\s*return\s+loadScript\(src\);\s*\}\s*\)/,
  "bootstrap should load startup data scripts from manifest-driven startupDataScripts"
);

assert.deepEqual(
  manifestI18nPaths,
  expectedLocalePaths,
  "manifest boot.data should preload the full data/i18n/*.js locale set"
);

const localeScriptMapMatch = appI18nSource.match(
  /const\s+localeScriptMap\s*=\s*\{([\s\S]*?)\};/
);
assert.ok(localeScriptMapMatch, "localeScriptMap should exist in js/app.i18n.js");
const localeScriptMapPaths = normalizeSet(
  Array.from(localeScriptMapMatch[1].matchAll(/:\s*["']([^"']+)["']/g)).map(
    (match) => match[1]
  )
);

assert.deepEqual(
  localeScriptMapPaths,
  expectedLocalePaths,
  "localeScriptMap should only reference the new data/i18n/*.js files"
);
assert.deepEqual(
  localeScriptMapPaths,
  manifestI18nPaths,
  "localeScriptMap and manifest i18n path sets should be fully aligned"
);

const requiredBootKeys = [
  "preload_title",
  "preload_note",
  "preload_status_prepare",
  "action_retry",
  "action_refresh",
  "action_feedback",
];

requiredBootKeys.forEach((key) => {
  assert.match(
    bootstrapSource,
    new RegExp(`["']?${escapeRegExp(key)}["']?\\s*:`),
    `boot i18n table should define key: ${key}`
  );
});

assert.equal(fs.existsSync(zhCnFile), true, "data/i18n/zh-CN.js should exist");
const zhCnSource = fs.readFileSync(zhCnFile, "utf8");
requiredBootKeys.forEach((key) => {
  assert.match(
    zhCnSource,
    new RegExp(`["']?${escapeRegExp(key)}["']?\\s*:`),
    `data/i18n/zh-CN.js strings should define boot key: ${key}`
  );
});

console.log("task1-i18n-path-sync: ok");
