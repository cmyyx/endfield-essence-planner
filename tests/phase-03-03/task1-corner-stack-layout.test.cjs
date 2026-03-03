const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const cssFile = path.join(root, "css/styles.weapons.css");
const cssSource = fs.readFileSync(cssFile, "utf8");

assert.match(
  cssSource,
  /\.weapon-corner-stack\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?align-items:\s*flex-end;/,
  "corner stack should anchor at the top-right and manage chips with a vertical flex layout"
);

assert.match(
  cssSource,
  /\.weapon-up-chip\s*\{[\s\S]*?z-index:\s*2;[\s\S]*?order:\s*1;/,
  "UP chip should be the first (top) layer in the corner stack"
);

assert.match(
  cssSource,
  /\.weapon-hidden-chip\s*\{[\s\S]*?position:\s*static;[\s\S]*?z-index:\s*1;[\s\S]*?order:\s*2;/,
  "hidden chip should become a stacked sibling below UP chip instead of absolute overlap"
);

assert.match(
  cssSource,
  /\.weapon-item\s+\.weapon-avatars\s*\{[\s\S]*?top:\s*clamp\([^)]+\);[\s\S]*?left:\s*clamp\([^)]+\);/,
  "top-left avatar anchor should remain intact"
);

console.log("task1-corner-stack-layout: ok");
