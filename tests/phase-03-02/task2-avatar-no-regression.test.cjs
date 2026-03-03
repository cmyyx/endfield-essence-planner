const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const templateFile = path.join(root, "js/templates.main.01.js");
const source = fs.readFileSync(templateFile, "utf8");

const avatarBlockPattern =
  /<div v-if="weaponCharacters\(weapon\)\.length" class="weapon-avatars">[\s\S]*?@error="handleCharacterImageError"[\s\S]*?<\/div>/;
const avatarMatch = source.match(avatarBlockPattern);

assert.ok(avatarMatch, "main card should keep avatar block driven by weaponCharacters(weapon)");
assert.ok(
  !/isWeaponUpActive\(weapon\.name\)/.test(avatarMatch[0]),
  "avatar block should not depend on UP badge state"
);

const avatarIndex = source.indexOf('class="weapon-avatars"');
const cornerStackIndex = source.indexOf('class="weapon-corner-stack"');

assert.ok(avatarIndex >= 0, "weapon-avatars node should exist on main card");
assert.ok(cornerStackIndex >= 0, "weapon-corner-stack should exist on main card");
assert.ok(
  avatarIndex < cornerStackIndex,
  "avatar anchor block should remain before corner stack to preserve top-left avatar positioning"
);

console.log("task2-avatar-no-regression: ok");
