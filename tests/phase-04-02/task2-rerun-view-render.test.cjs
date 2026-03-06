const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const templateFile = path.join(root, "js/templates.main.03.js");
const styleFile = path.join(root, "css/styles.layout.css");
const localeFiles = [
  path.join(root, "data/i18n/zh-CN.js"),
  path.join(root, "data/i18n/zh-TW.js"),
  path.join(root, "data/i18n/en.js"),
  path.join(root, "data/i18n/ja.js"),
];

assert.equal(fs.existsSync(templateFile), true, "js/templates.main.03.js should exist");
assert.equal(fs.existsSync(styleFile), true, "css/styles.layout.css should exist");
localeFiles.forEach((file) => {
  assert.equal(fs.existsSync(file), true, `${path.relative(root, file)} should exist`);
});

const templateSource = fs.readFileSync(templateFile, "utf8");
const styleSource = fs.readFileSync(styleFile, "utf8");
const localeSources = localeFiles.map((file) => ({
  file,
  source: fs.readFileSync(file, "utf8"),
}));

const rerunViewMatch = templateSource.match(
  /<div v-else-if="currentView === 'rerun-ranking'"[\s\S]*?<\/div>\s*<div v-else-if="currentView === 'match'"/
);
assert.ok(rerunViewMatch, "templates.main.03.js should include standalone rerun-ranking view before match view");
const rerunViewBlock = rerunViewMatch[0];

assert.match(
  rerunViewBlock,
  /v-for="row in rerunRankingRows"/,
  "rerun-ranking view should render rows from rerunRankingRows"
);
assert.match(
  rerunViewBlock,
  /row\.characterName/,
  "rerun-ranking card should show character name first"
);
assert.match(
  rerunViewBlock,
  /row\.avatarSrc/,
  "rerun-ranking card should render character avatar"
);
assert.match(
  rerunViewBlock,
  /row\.gapDays/,
  "rerun-ranking card should show rerun gap days"
);
assert.match(
  rerunViewBlock,
  /row\.rerunCount/,
  "rerun-ranking card should show rerun count"
);
assert.match(
  rerunViewBlock,
  /row\.lastEndMs/,
  "rerun-ranking card should show last rerun time"
);
assert.match(
  rerunViewBlock,
  /row\.isActive/,
  "rerun-ranking card should expose active UP status"
);
assert.match(
  rerunViewBlock,
  /row\.rerunCount\s*>\s*0/,
  "rerun-ranking card should use rerunCount>0 guard for placeholder rendering"
);
assert.match(
  rerunViewBlock,
  /class=\"weapon-up-chip rerun-ranking-up-chip\"/,
  "rerun-ranking active tag should reuse weapon UP chip class"
);
assert.match(
  rerunViewBlock,
  /weapon-up-chip-fallback/,
  "rerun-ranking active tag should keep weapon chip fallback text"
);
assert.match(
  rerunViewBlock,
  /v-if="!hasRerunRankingRows"/,
  "rerun-ranking view should provide explicit empty state"
);
assert.doesNotMatch(
  rerunViewBlock,
  /row\.weaponName/,
  "rerun-ranking view should keep pure character-first cards without weapon-name field"
);

assert.match(styleSource, /\.rerun-ranking-view\b/, "layout css should include rerun-ranking view container styles");
assert.match(styleSource, /\.rerun-ranking-list\b/, "layout css should include rerun-ranking list styles");
assert.match(styleSource, /\.rerun-ranking-card\b/, "layout css should include rerun-ranking card styles");
assert.match(styleSource, /\.rerun-ranking-empty\b/, "layout css should include rerun-ranking empty state styles");
assert.match(
  styleSource,
  /\.rerun-ranking-list\s*\{[\s\S]*grid-template-columns:\s*1fr;/,
  "rerun-ranking list should stay single-column on all orientations"
);
assert.match(
  styleSource,
  /\.rerun-ranking-avatar-shell\s*\{[\s\S]*clamp\(/,
  "rerun-ranking avatar should use adaptive clamp sizing"
);

const requiredI18nKeys = [
  "\"复刻排行\"",
  "\"间隔：{days} 天\"",
  "\"次数：{count} 次\"",
  "\"上次：{date}\"",
  "\"当前UP\"",
  "\"暂无复刻排行数据\"",
];

localeSources.forEach(({ file, source }) => {
  requiredI18nKeys.forEach((key) => {
    assert.match(
      source,
      new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `${path.relative(root, file)} should define i18n key ${key}`
    );
  });
});

console.log("task2-rerun-view-render: ok");
