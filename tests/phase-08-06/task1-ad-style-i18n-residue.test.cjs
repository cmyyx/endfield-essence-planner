const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const themeSource = read("css/styles.theme.modes.css");
[
  { pattern: /\.slot-inline-card/, scope: "theme ad inline slot styles" },
  { pattern: /\.slot-hero-shell/, scope: "theme ad hero slot styles" },
].forEach(({ pattern, scope }) => {
  assert.doesNotMatch(themeSource, pattern, `${scope} should be removed`);
});

const i18nFiles = [
  "data/i18n/zh-CN.js",
  "data/i18n/zh-TW.js",
  "data/i18n/en.js",
  "data/i18n/ja.js",
];

const bannedI18nPatterns = [
  { pattern: /"关闭广告"\s*:/, scope: "legacy ad close key" },
  { pattern: /"广告位（移动端）"\s*:/, scope: "legacy ad mobile slot key" },
  { pattern: /"广告位（桌面端）"\s*:/, scope: "legacy ad desktop slot key" },
  { pattern: /"广告预览模式（本地）"\s*:/, scope: "legacy ad preview key" },
  { pattern: /"预览广告位"\s*:/, scope: "legacy ad preview action key" },
  { pattern: /"迁移预览"\s*:/, scope: "legacy migration preview key" },
  { pattern: /"迁移预览详情"\s*:/, scope: "legacy migration preview detail key" },
  { pattern: /"迁移映射方案"\s*:/, scope: "legacy migration mapping key" },
  { pattern: /"开始迁移"\s*:/, scope: "legacy migration start key" },
  { pattern: /"放弃旧数据"\s*:/, scope: "legacy migration discard key" },
  { pattern: /"确认迁移"\s*:/, scope: "legacy migration confirm key" },
  { pattern: /"badge\.legacy_entries"\s*:/, scope: "legacy migration badge key" },
  { pattern: /"button\.discard_legacy_data"\s*:/, scope: "legacy migration button key" },
  { pattern: /"error\.migration_mapping"\s*:/, scope: "legacy migration error key" },
  { pattern: /"error\.start_migration"\s*:/, scope: "legacy migration start error key" },
  { pattern: /"error\.confirm_migration"\s*:/, scope: "legacy migration confirm error key" },
  { pattern: /"warning\.ad_preview_mode_local"\s*:/, scope: "legacy ad warning key" },
  { pattern: /"warning\.ad_slot_desktop"\s*:/, scope: "legacy ad desktop warning key" },
  { pattern: /"warning\.ad_slot_mobile"\s*:/, scope: "legacy ad mobile warning key" },
  { pattern: /"warning\.close_ad"\s*:/, scope: "legacy ad close warning key" },
  { pattern: /"warning\.item"\s*:/, scope: "legacy ad item warning key" },
];

i18nFiles.forEach((filePath) => {
  const source = read(filePath);
  bannedI18nPatterns.forEach(({ pattern, scope }) => {
    assert.doesNotMatch(source, pattern, `${scope} should be removed from ${filePath}`);
  });
});

console.log("task1-ad-style-i18n-residue: ok");
