const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const templateFile = path.join(root, "js/templates.main.01.js");
const i18nFiles = [
  path.join(root, "data/i18n/zh-CN.js"),
  path.join(root, "data/i18n/zh-TW.js"),
  path.join(root, "data/i18n/en.js"),
  path.join(root, "data/i18n/ja.js"),
];

const templateSource = fs.readFileSync(templateFile, "utf8");

assert.match(
  templateSource,
  /v-if="isWeaponUpActive\(weapon\.name\)"/,
  "UP badge should render only when weapon is active in the UP window"
);
assert.match(
  templateSource,
  /class="weapon-corner-stack"/,
  "main weapon card should include corner stack container"
);
assert.match(templateSource, /class="weapon-up-chip"/, "UP chip node should exist");
assert.match(templateSource, /class="weapon-up-chip-icon"/, "UP chip should include image node");
assert.match(
  templateSource,
  /class="weapon-up-chip-icon"[\s\S]*?src="data:image\/png;base64,/,
  "UP chip should use embedded base64 PNG source"
);
assert.match(
  templateSource,
  /class="weapon-up-chip-icon"[\s\S]*?@load="\$event\.target\.closest\('\.weapon-up-chip'\)\?\.classList\.remove\('is-fallback'\)"/,
  "UP chip image should clear fallback state when image is loaded"
);
assert.match(
  templateSource,
  /class="weapon-up-chip-icon"[\s\S]*?@error="\$event\.target\.style\.display = 'none';\s*\$event\.target\.closest\('\.weapon-up-chip'\)\?\.classList\.add\('is-fallback'\)"/,
  "UP chip image should hide itself and switch to fallback text when loading fails"
);
assert.match(
  templateSource,
  /class="weapon-up-chip-fallback">\s*\{\{\s*t\("up_badge_text"\)\s*\}\}\s*<\/span>/,
  "UP chip fallback text should come from i18n key"
);
assert.doesNotMatch(
  templateSource,
  /src="\.\/image\/ui\/weapon-up-chip\.webp"/,
  "UP chip should not use the old webp asset path"
);
assert.match(
  templateSource,
  /class="weapon-hidden-chip"/,
  "hidden marker should still exist and coexist with UP chip"
);
assert.doesNotMatch(
  templateSource,
  /class="weapon-up-chip-fallback">\s*UP\s*<\/span>/,
  "UP fallback text should not be hardcoded in template"
);

for (const i18nFile of i18nFiles) {
  const source = fs.readFileSync(i18nFile, "utf8");
  assert.match(
    source,
    /"up_badge_text"\s*:\s*".+?"/,
    `${path.basename(i18nFile)} should define up_badge_text`
  );
}

console.log("task1-up-badge-render: ok");
