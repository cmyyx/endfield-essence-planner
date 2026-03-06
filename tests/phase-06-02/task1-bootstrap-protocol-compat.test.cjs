const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const requiredFiles = [
  "index.html",
  "js/bootstrap.resources.js",
  "js/bootstrap.error.js",
  "js/bootstrap.optional.js",
  "js/bootstrap.entry.js",
];

requiredFiles.forEach((relativePath) => {
  assert.equal(
    fs.existsSync(path.join(root, relativePath)),
    true,
    `${relativePath} should exist for bootstrap protocol compatibility`
  );
});

const indexSource = read("index.html");
const entrySource = read("js/bootstrap.entry.js");
const errorModuleSource = read("js/bootstrap.error.js");

assert.match(
  entrySource,
  /__BOOTSTRAP_RESOURCES__/,
  "bootstrap entry should consume bootstrap.resources module"
);
assert.match(
  entrySource,
  /__BOOTSTRAP_ERROR__/,
  "bootstrap entry should consume bootstrap.error module"
);
assert.match(
  entrySource,
  /__BOOTSTRAP_OPTIONAL__/,
  "bootstrap entry should consume bootstrap.optional module"
);

assert.match(
  entrySource,
  /window\.__startBootstrapEntry\s*=\s*startBootstrap/,
  "legacy protocol window.__startBootstrapEntry should remain bound"
);
assert.match(
  entrySource,
  /window\.__startBootstrapEntry\(\{\s*fromRetry:\s*true\s*\}\)/,
  "retry semantic window.__startBootstrapEntry({ fromRetry: true }) should remain callable"
);
assert.match(
  indexSource,
  /<script[\s\S]*src="\.\/js\/bootstrap\.entry\.js"[\s\S]*onerror=/,
  "index.html should keep bootstrap.entry onerror fallback hook"
);
assert.match(
  indexSource,
  /页面初始化失败/,
  "index.html fallback should expose readable bootstrap-entry failure title"
);
assert.match(
  indexSource,
  /关键引导脚本 \.\/js\/bootstrap\.entry\.js 加载失败/,
  "index.html fallback should expose bootstrap.entry load-failure detail"
);

assert.match(
  errorModuleSource,
  /window\.__renderBootError\s*=/,
  "legacy protocol window.__renderBootError should still be provided by error module"
);
assert.match(
  errorModuleSource,
  /window\.__reportScriptLoadFailure\s*=/,
  "legacy protocol window.__reportScriptLoadFailure should still be provided"
);

console.log("task1-bootstrap-protocol-compat: ok");
