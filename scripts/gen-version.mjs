import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const indexHtmlPath = path.join(rootDir, "index.html");
const contentJsPath = path.join(rootDir, "data", "content.js");
const versionJsonPath = path.join(rootDir, "data", "version.json");
const versionJsPath = path.join(rootDir, "data", "version.js");
const requiredInputFields = ["announcementVersion", "fingerprint"];

const ensureText = (value) => String(value == null ? "" : value).trim();

const readTextFile = async (filePath) => {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`read failed: ${path.relative(rootDir, filePath)} (${error && error.message ? error.message : error})`);
  }
};

const extractHtmlAttribute = (tag, attributeName) => {
  const match = new RegExp(`${attributeName}\\s*=\\s*["']([^"']+)["']`, "i").exec(tag);
  return ensureText(match && match[1]);
};

const extractFingerprintFromIndex = (indexSource) => {
  const metaTags = indexSource.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const name = extractHtmlAttribute(tag, "name").toLowerCase();
    if (name !== "fingerprint") continue;
    const content = extractHtmlAttribute(tag, "content");
    if (content) return content;
  }

  const divTags = indexSource.match(/<div\b[^>]*>/gi) || [];
  for (const tag of divTags) {
    const id = extractHtmlAttribute(tag, "id");
    if (id !== "app") continue;
    const fingerprint = extractHtmlAttribute(tag, "data-fingerprint");
    if (fingerprint) return fingerprint;
  }

  throw new Error("index.html missing required fingerprint source (meta[name='fingerprint'] or #app[data-fingerprint])");
};

const extractAnnouncementVersionFromContent = (contentSource) => {
  const sandbox = { window: {} };
  vm.runInNewContext(contentSource, sandbox, { filename: contentJsPath });
  const content =
    sandbox &&
    sandbox.window &&
    sandbox.window.CONTENT &&
    typeof sandbox.window.CONTENT === "object"
      ? sandbox.window.CONTENT
      : null;
  const version =
    content &&
    content.announcement &&
    typeof content.announcement === "object"
      ? ensureText(content.announcement.version)
      : "";
  if (!version) {
    throw new Error("data/content.js missing required CONTENT.announcement.version");
  }
  return version;
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
  const token = ensureText(buildId);
  if (!/^\d{14}$/.test(token)) return "";
  return `${token.slice(2, 8)}-${token.slice(8, 12)}`;
};

export const readVersionInputs = async () => {
  const [indexSource, contentSource] = await Promise.all([
    readTextFile(indexHtmlPath),
    readTextFile(contentJsPath),
  ]);
  return {
    announcementVersion: extractAnnouncementVersionFromContent(contentSource),
    fingerprint: extractFingerprintFromIndex(indexSource),
  };
};

export const validateVersionInputs = (inputs) => {
  if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) {
    throw new Error("version inputs must be an object");
  }
  requiredInputFields.forEach((field) => {
    if (!ensureText(inputs[field])) {
      throw new Error(`version inputs missing required field: ${field}`);
    }
  });
  return {
    announcementVersion: ensureText(inputs.announcementVersion),
    fingerprint: ensureText(inputs.fingerprint),
  };
};

export const buildVersionPayload = (rawInputs, now = new Date()) => {
  const inputs = validateVersionInputs(rawInputs);
  const timeSuffix = toCompactTime(now);
  const buildId = timeSuffix;
  const displayTime = toDisplayTime(buildId);
  const displayVersion = `v${inputs.announcementVersion}@${displayTime || buildId}`;
  return {
    buildId,
    displayVersion,
    announcementVersion: inputs.announcementVersion,
    fingerprint: inputs.fingerprint,
    publishedAt: now.toISOString(),
  };
};

export const generateVersionPayload = async (now = new Date()) => {
  const inputs = await readVersionInputs();
  return buildVersionPayload(inputs, now);
};

const main = async () => {
  const payload = await generateVersionPayload(new Date());
  await fs.writeFile(versionJsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await fs.writeFile(versionJsPath, `window.__APP_VERSION_INFO = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
  process.stdout.write(
    `[gen-version] buildId=${payload.buildId} announcement=${payload.announcementVersion} fingerprint=${payload.fingerprint}\n`
  );
};

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    process.stderr.write(`[gen-version] failed: ${error && error.message ? error.message : error}\n`);
    process.exitCode = 1;
  });
}
