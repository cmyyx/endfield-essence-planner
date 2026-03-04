const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const protocolPath = path.join(root, "js/app.protocol.js");
assert.equal(fs.existsSync(protocolPath), true, "js/app.protocol.js should exist");

const protocolSource = read("js/app.protocol.js");
const bootstrapEntrySource = read("js/bootstrap.entry.js");

assert.match(
  protocolSource,
  /window\.__APP_BOOT__\s*=\s*window\.__APP_BOOT__\s*\|\|\s*\{/,
  "app.protocol should expose controlled startup namespace window.__APP_BOOT__"
);
assert.match(
  protocolSource,
  /legacyAccessMode|setLegacyAccessMode|resolveLegacyAccessMode/,
  "app.protocol should define legacy access mode controls for phased cleanup"
);
assert.match(
  protocolSource,
  /throw new Error\(\s*`\[app-protocol\]/,
  "app.protocol should support strict fail mode for deprecated legacy access in dev/test"
);
assert.match(
  protocolSource,
  /console\.warn\(\s*`\[app-protocol\]/,
  "app.protocol should warn when deprecated legacy protocol entry is accessed in production"
);

["__loadScript", "__renderBootError", "__startBootstrapEntry", "__APP_SCRIPT_CHAIN"].forEach(
  (legacyName) => {
    assert.match(
      protocolSource,
      new RegExp(legacyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `app.protocol should bridge ${legacyName} into controlled protocol namespace`
    );
  }
);

assert.match(
  bootstrapEntrySource,
  /"\.\/js\/app\.protocol\.js"/,
  "bootstrap.entry should include app.protocol.js in bootstrap helper module loading list"
);
assert.match(
  bootstrapEntrySource,
  /window\.__startBootstrapEntry\s*=\s*startBootstrap/,
  "bootstrap.entry should keep legacy __startBootstrapEntry assignment for compatibility"
);
assert.match(
  bootstrapEntrySource,
  /resolveBootProtocolValue\("appScriptChain", "__APP_SCRIPT_CHAIN"\)/,
  "bootstrap.entry should consume script-chain protocol through controlled namespace bridge"
);

console.log("task3-global-protocol-bridge: ok");
