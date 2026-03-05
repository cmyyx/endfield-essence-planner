const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const sanitizerFile = path.join(root, "js/app.sanitizer.js");
const contentFile = path.join(root, "js/app.content.js");
const manifestFile = path.join(root, "js/app.resource-manifest.js");
const scriptChainFile = path.join(root, "js/app.script-chain.js");

assert.ok(fs.existsSync(sanitizerFile), "js/app.sanitizer.js must exist as the single sanitizer entry");

const sanitizerSource = fs.readFileSync(sanitizerFile, "utf8");
const contentSource = fs.readFileSync(contentFile, "utf8");
const manifestSource = fs.readFileSync(manifestFile, "utf8");
const scriptChainSource = fs.readFileSync(scriptChainFile, "utf8");

const context = {
  window: {},
  console,
  URL,
};
vm.runInNewContext(sanitizerSource, context, { filename: sanitizerFile });

assert.ok(context.window.__APP_SANITIZER__, "app.sanitizer.js must expose window.__APP_SANITIZER__");
assert.equal(
  typeof context.window.__APP_SANITIZER__.tokenizeNoticeItem,
  "function",
  "window.__APP_SANITIZER__.tokenizeNoticeItem must be defined"
);

assert.match(
  contentSource,
  /window\.__APP_SANITIZER__/,
  "app.content must consume the shared sanitizer entry instead of standalone HTML sanitizing"
);
assert.doesNotMatch(
  contentSource,
  /const\s+escapeHtml\s*=/,
  "app.content should not keep local HTML escaping logic after sanitizer convergence"
);
assert.doesNotMatch(
  contentSource,
  /const\s+sanitizeUrl\s*=/,
  "app.content should not keep local URL sanitize logic after sanitizer convergence"
);
assert.doesNotMatch(
  contentSource,
  /const\s+formatNoticeItem\s*=/,
  "app.content should not build notice HTML directly after sanitizer convergence"
);

const tokens = context.window.__APP_SANITIZER__.tokenizeNoticeItem(
  "A [safe](https://example.com) and [bad](javascript:alert(1)) ==HL== https://safe.example/path"
);

assert.ok(Array.isArray(tokens) && tokens.length > 0, "tokenizeNoticeItem should return non-empty token list");
assert.ok(
  tokens.some(
    (token) =>
      token &&
      token.type === "link" &&
      typeof token.href === "string" &&
      token.href.startsWith("https://example.com")
  ),
  "https links must be preserved as link tokens"
);
assert.ok(
  tokens.some((token) => token && token.type === "mark" && token.text === "HL"),
  "==highlight== syntax must be rendered as mark token"
);
assert.ok(
  !tokens.some((token) => token && token.type === "link" && /javascript:/i.test(String(token.href || ""))),
  "javascript: links must never survive sanitization"
);

assert.match(
  manifestSource,
  /"\.\/js\/app\.sanitizer\.js"/,
  "manifest script chain should include app.sanitizer.js"
);
assert.match(
  scriptChainSource,
  /"\.\/js\/app\.sanitizer\.js"/,
  "legacy script-chain fallback should include app.sanitizer.js"
);

console.log("task1-sanitizer-single-entry: ok");
