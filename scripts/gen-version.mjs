import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const readText = async (relativePath) => {
  const absPath = path.join(rootDir, relativePath);
  return fs.readFile(absPath, "utf8");
};

const extractFingerprint = async () => {
  const html = await readText("index.html");
  const match = html.match(/data-fingerprint="([^"]+)"/);
  return match ? String(match[1]).trim() : "";
};

const extractAnnouncementVersion = async () => {
  const content = await readText("data/content.js");
  const sectionMatch = content.match(/announcement\s*:\s*\{([\s\S]*?)\}\s*,\s*changelog/);
  if (!sectionMatch) return "";
  const versionMatch = sectionMatch[1].match(/version\s*:\s*"([^"]+)"/);
  return versionMatch ? String(versionMatch[1]).trim() : "";
};

const toCompactTime = (date) => {
  const pad = (num) => String(num).padStart(2, "0");
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds())
  );
};

const toDisplayTime = (buildId) => {
  const token = String(buildId || "").trim();
  if (!/^\d{14}$/.test(token)) return "";
  return `${token.slice(2, 8)}-${token.slice(8, 12)}`;
};

const main = async () => {
  const now = new Date();
  const publishedAt = now.toISOString();
  const fingerprint = await extractFingerprint();
  const announcementVersion = await extractAnnouncementVersion();
  const timeSuffix = toCompactTime(now);
  const buildId = timeSuffix;
  const displayTime = toDisplayTime(buildId);
  const displayVersion = announcementVersion
    ? `v${announcementVersion}@${displayTime || buildId}`
    : `v0.0.0@${displayTime || buildId}`;

  const payload = {
    buildId,
    displayVersion,
    announcementVersion,
    fingerprint,
    publishedAt,
  };

  const jsonPath = path.join(rootDir, "data", "version.json");
  const jsPath = path.join(rootDir, "data", "version.js");

  await fs.writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await fs.writeFile(jsPath, `window.__APP_VERSION_INFO = ${JSON.stringify(payload, null, 2)};\n`, "utf8");

  process.stdout.write(`[gen-version] buildId=${buildId} announcement=${announcementVersion || "n/a"}\n`);
};

main().catch((error) => {
  process.stderr.write(`[gen-version] failed: ${error && error.message ? error.message : error}\n`);
  process.exitCode = 1;
});
