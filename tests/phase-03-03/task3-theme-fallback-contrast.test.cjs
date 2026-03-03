const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const cssFile = path.join(root, "css/styles.theme.modes.css");
const cssSource = fs.readFileSync(cssFile, "utf8");

assert.match(
  cssSource,
  /\[data-theme="light"\]\s+\.weapon-up-chip\s*\{[\s\S]*?color:/,
  "light theme should provide a scoped style override for the UP chip container"
);

assert.match(
  cssSource,
  /\[data-theme="light"\]\s+\.weapon-up-chip-fallback\s*\{[\s\S]*?border-color:[\s\S]*?background:[\s\S]*?color:[\s\S]*?text-shadow:/,
  "light theme should provide readable fallback text styling for UP chip text"
);

assert.doesNotMatch(
  cssSource,
  /(^|\n)\s*\.weapon-up-chip-fallback\s*\{/,
  "fallback text override must remain scoped to the UP chip theme selector"
);

console.log("task3-theme-fallback-contrast: ok");
