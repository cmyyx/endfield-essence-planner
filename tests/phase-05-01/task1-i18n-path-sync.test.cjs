const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const bootstrapFile = path.join(root, "js/bootstrap.entry.js");
const i18nFile = path.join(root, "js/app.i18n.js");
const zhCnFile = path.join(root, "data/i18n/zh-CN.js");

assert.equal(fs.existsSync(bootstrapFile), true, "js/bootstrap.entry.js should exist");
assert.equal(fs.existsSync(i18nFile), true, "js/app.i18n.js should exist");

const bootstrapSource = fs.readFileSync(bootstrapFile, "utf8");
const appI18nSource = fs.readFileSync(i18nFile, "utf8");

const normalizeSet = (items) => Array.from(new Set(items)).sort();
const expectedLocalePaths = normalizeSet(
  ["zh-CN", "zh-TW", "en", "ja"].map((locale) => `./data/i18n/${locale}.js`)
);
const parseQuotedStrings = (text) =>
  Array.from(text.matchAll(/["']([^"']+)["']/g)).map((match) => match[1]);
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const startupScriptsBlockMatch = bootstrapSource.match(
  /var\s+startupScripts\s*=\s*\[([\s\S]*?)\];/
);
assert.ok(startupScriptsBlockMatch, "bootstrap startupScripts block should exist");
const startupI18nPaths = normalizeSet(
  parseQuotedStrings(startupScriptsBlockMatch[1]).filter((value) =>
    /^\.\/data\/i18n\/[^"']+\.js$/.test(value)
  )
);

const dataPromiseBlockMatch = bootstrapSource.match(
  /var\s+dataPromise\s*=\s*Promise\.all\(\[([\s\S]*?)\]\);/
);
assert.ok(dataPromiseBlockMatch, "bootstrap dataPromise block should exist");
const dataPromiseI18nPaths = normalizeSet(
  Array.from(
    dataPromiseBlockMatch[1].matchAll(/loadScript\(\s*["']([^"']+)["']\s*\)/g)
  )
    .map((match) => match[1])
    .filter((value) => /^\.\/data\/i18n\/[^"']+\.js$/.test(value))
);

assert.deepEqual(
  startupI18nPaths,
  expectedLocalePaths,
  "startupScripts should preload the full new data/i18n/*.js locale set"
);
assert.deepEqual(
  dataPromiseI18nPaths,
  expectedLocalePaths,
  "dataPromise should preload the same full new data/i18n/*.js locale set"
);
assert.deepEqual(
  startupI18nPaths,
  dataPromiseI18nPaths,
  "startupScripts and dataPromise should use the same i18n path group"
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
  startupI18nPaths,
  "localeScriptMap and bootstrap i18n path sets should be fully aligned"
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
