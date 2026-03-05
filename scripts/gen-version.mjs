import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const releaseMetaPath = path.join(rootDir, "data", "release-meta.json");
const versionJsonPath = path.join(rootDir, "data", "version.json");
const versionJsPath = path.join(rootDir, "data", "version.js");
const requiredReleaseMetaFields = ["announcementVersion", "fingerprint"];

const ensureText = (value) => String(value == null ? "" : value).trim();

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
  const token = ensureText(buildId);
  if (!/^\d{14}$/.test(token)) return "";
  return `${token.slice(2, 8)}-${token.slice(8, 12)}`;
};

const readReleaseMeta = async () => {
  let parsed;
  try {
    parsed = JSON.parse(await fs.readFile(releaseMetaPath, "utf8"));
  } catch (error) {
    throw new Error(`release-meta read failed: ${error && error.message ? error.message : error}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("release-meta must be a JSON object");
  }
  return parsed;
};

export const validateReleaseMeta = (meta) => {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    throw new Error("release-meta must be an object");
  }
  requiredReleaseMetaFields.forEach((field) => {
    if (!ensureText(meta[field])) {
      throw new Error(`release-meta missing required field: ${field}`);
    }
  });
  return {
    announcementVersion: ensureText(meta.announcementVersion),
    fingerprint: ensureText(meta.fingerprint),
  };
};

export const buildVersionPayload = (validatedMeta, now = new Date()) => {
  const meta = validateReleaseMeta(validatedMeta);
  const timeSuffix = toCompactTime(now);
  const buildId = timeSuffix;
  const displayTime = toDisplayTime(buildId);
  const displayVersion = `v${meta.announcementVersion}@${displayTime || buildId}`;
  return {
    buildId,
    displayVersion,
    announcementVersion: meta.announcementVersion,
    fingerprint: meta.fingerprint,
    publishedAt: now.toISOString(),
  };
};

export const generateVersionPayload = async (now = new Date()) => {
  const releaseMeta = await readReleaseMeta();
  return buildVersionPayload(releaseMeta, now);
};

const main = async () => {
  const payload = await generateVersionPayload(new Date());
  await fs.writeFile(versionJsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await fs.writeFile(versionJsPath, `window.__APP_VERSION_INFO = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
  process.stdout.write(
    `[gen-version] buildId=${payload.buildId} announcement=${payload.announcementVersion}\n`
  );
};

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    process.stderr.write(`[gen-version] failed: ${error && error.message ? error.message : error}\n`);
    process.exitCode = 1;
  });
}