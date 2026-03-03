const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const cssFile = path.join(root, "css/styles.weapons.css");
const cssSource = fs.readFileSync(cssFile, "utf8");

assert.match(
  cssSource,
  /@media\s*\(max-width:\s*430px\)\s*\{[\s\S]*?\.weapon-corner-stack\s*\{[\s\S]*?gap:\s*2px;[\s\S]*?max-width:\s*54%;[\s\S]*?\}[\s\S]*?\.weapon-up-chip-icon\s*\{[\s\S]*?width:\s*34px;[\s\S]*?height:\s*15px;[\s\S]*?\}[\s\S]*?\.weapon-hidden-chip\s*\{[\s\S]*?font-size:\s*9px;[\s\S]*?\}/,
  "<=430px breakpoint should scale corner stack and both chips for non-overlap readability"
);

assert.match(
  cssSource,
  /@media\s*\(max-width:\s*360px\)\s*\{[\s\S]*?\.weapon-corner-stack\s*\{[\s\S]*?max-width:\s*50%;[\s\S]*?\}[\s\S]*?\.weapon-up-chip-icon\s*\{[\s\S]*?width:\s*30px;[\s\S]*?height:\s*13px;[\s\S]*?\}[\s\S]*?\.weapon-up-chip-fallback\s*\{[\s\S]*?font-size:\s*7px;[\s\S]*?\}[\s\S]*?\.weapon-hidden-chip\s*\{[\s\S]*?font-size:\s*8px;[\s\S]*?\}/,
  "<=360px breakpoint should add an ultra-narrow fallback to keep both chips readable"
);

assert.match(
  cssSource,
  /@media\s*\(max-width:\s*640px\),\s*\(orientation:\s*portrait\)\s*and\s*\(max-width:\s*1024px\)\s*\{[\s\S]*?\.weapon-hidden-chip\s*\{[\s\S]*?font-size:\s*10px;[\s\S]*?\}/,
  "portrait-focused responsive rule should keep hidden chip readable"
);

assert.doesNotMatch(
  cssSource,
  /@media\s*\(max-width:\s*430px\)[\s\S]*?\.weapon-up-chip\s*\{[^}]*display:\s*none;[^}]*\}/,
  "mobile rules must not hide the UP chip to avoid overlap"
);

assert.doesNotMatch(
  cssSource,
  /@media\s*\(max-width:\s*430px\)[\s\S]*?\.weapon-hidden-chip\s*\{[^}]*display:\s*none;[^}]*\}/,
  "mobile rules must not hide the hidden chip to avoid overlap"
);

console.log("task2-mobile-overlap-guard: ok");
