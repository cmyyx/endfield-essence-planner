const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

const resolvePathFromUrl = (rootDir, requestPathname) => {
  const safePathname = String(requestPathname || "/").split("?")[0].split("#")[0];
  const target = safePathname === "/" ? "/index.html" : safePathname;
  const normalized = path.normalize(target).replace(/^(\.\.[/\\])+/, "");
  const absolutePath = path.join(rootDir, normalized);
  const relative = path.relative(rootDir, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return absolutePath;
};

const send = (res, statusCode, body, headers) => {
  res.writeHead(statusCode, {
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
};

const startStaticServer = async (options = {}) => {
  const rootDir = options.rootDir ? path.resolve(options.rootDir) : path.resolve(process.cwd());
  const failPaths = new Set(
    Array.isArray(options.failPaths) ? options.failPaths.map((entry) => String(entry || "")) : []
  );
  const requestLog = [];

  const server = http.createServer((req, res) => {
    const url = new URL(String(req.url || "/"), "http://127.0.0.1");
    const pathname = url.pathname || "/";
    requestLog.push(pathname);

    if (failPaths.has(pathname)) {
      send(res, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    const filePath = resolvePathFromUrl(rootDir, pathname);
    if (!filePath) {
      send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    fs.readFile(filePath, (error, buffer) => {
      if (error) {
        const statusCode = error.code === "ENOENT" ? 404 : 500;
        send(res, statusCode, statusCode === 404 ? "Not Found" : "Internal Server Error", {
          "Content-Type": "text/plain; charset=utf-8",
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      send(res, 200, buffer, {
        "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
      });
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("failed to start static test server: invalid listen address");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    requestLog,
    close: () =>
      new Promise((resolveClose) => {
        server.close(() => resolveClose());
      }),
  };
};

module.exports = {
  startStaticServer,
};
