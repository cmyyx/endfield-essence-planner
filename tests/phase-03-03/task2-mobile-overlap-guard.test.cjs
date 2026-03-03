const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const cssFile = path.join(root, "css/styles.weapons.css");
const cssSource = fs.readFileSync(cssFile, "utf8");

assert.match(
  cssSource,
  /@media\s*\(max-width:\s*430px\)\s*\{[\s\S]*?\.weapon-corner-stack\s*\{[\s\S]*?gap:\s*2px;[\s\S]*?max-width:\s*48%;[\s\S]*?\}[\s\S]*?\.weapon-up-chip\s*\{[\s\S]*?padding:\s*1px\s+3px;[\s\S]*?\}[\s\S]*?\.weapon-hidden-chip\s*\{[\s\S]*?font-size:\s*7px;[\s\S]*?\}/,
  "<=430px breakpoint should scale corner stack and both chips for non-overlap readability"
);

assert.match(
  cssSource,
  /@media\s*\(max-width:\s*360px\)\s*\{[\s\S]*?\.weapon-corner-stack\s*\{[\s\S]*?max-width:\s*46%;[\s\S]*?\}[\s\S]*?\.weapon-up-chip-fallback\s*\{[\s\S]*?font-size:\s*6px;[\s\S]*?\}[\s\S]*?\.weapon-hidden-chip\s*\{[\s\S]*?font-size:\s*6px;[\s\S]*?\}/,
  "<=360px breakpoint should add an ultra-narrow fallback to keep both chips readable"
);

assert.doesNotMatch(
  cssSource,
  /@media\s*\(max-width:\s*430px\)[\s\S]*?\.weapon-up-chip\s*\{[\s\S]*?display:\s*none;[\s\S]*?\}/,
  "mobile rules must not hide the UP chip to avoid overlap"
);

assert.doesNotMatch(
  cssSource,
  /@media\s*\(max-width:\s*430px\)[\s\S]*?\.weapon-hidden-chip\s*\{[\s\S]*?display:\s*none;[\s\S]*?\}/,
  "mobile rules must not hide the hidden chip to avoid overlap"
);

console.log("task2-mobile-overlap-guard: ok");
