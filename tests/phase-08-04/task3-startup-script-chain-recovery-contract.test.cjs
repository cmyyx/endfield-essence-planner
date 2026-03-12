const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const scriptChainSource = read("js/app.script-chain.js");
const bootstrapEntrySource = read("js/bootstrap.entry.js");
const bootstrapErrorSource = read("js/bootstrap.error.js");

const evaluateScriptChain = (windowState) => {
  const warnings = [];
  const context = {
    window: windowState,
    console: {
      warn: (message) => warnings.push(String(message || "")),
    },
  };
  vm.createContext(context);
  vm.runInContext(scriptChainSource, context);
  return {
    window: context.window,
    warnings,
  };
};

const missingManifest = evaluateScriptChain({});
assert.equal(
  Object.prototype.hasOwnProperty.call(missingManifest.window, "__APP_SCRIPT_CHAIN"),
  false,
  "[recovery] app.script-chain should not publish an empty fallback array when manifest is missing"
);
assert.ok(
  missingManifest.warnings.some((message) => message.includes("waiting for bootstrap")),
  "[recovery] app.script-chain should warn that bootstrap will publish the compatibility bridge output"
);

const validManifest = evaluateScriptChain({
  __APP_RESOURCE_MANIFEST: {
    app: {
      scriptChain: ["./js/app.core.js", "./js/app.main.js"],
    },
  },
});
assert.deepEqual(
  validManifest.window.__APP_SCRIPT_CHAIN,
  ["./js/app.core.js", "./js/app.main.js"],
  "[recovery] app.script-chain should still mirror a valid manifest-provided script chain"
);

const prepopulated = evaluateScriptChain({ __APP_SCRIPT_CHAIN: ["./js/app.core.js"] });
assert.deepEqual(
  prepopulated.window.__APP_SCRIPT_CHAIN,
  ["./js/app.core.js"],
  "[recovery] app.script-chain should preserve a pre-populated script chain when manifest is missing"
);

assert.match(
  bootstrapEntrySource,
  /resolveManifestAppScriptChain/,
  "[recovery] bootstrap.entry should define a manifest script-chain resolver"
);
assert.match(
  bootstrapEntrySource,
  /publishBootProtocolValue\("appScriptChain", "__APP_SCRIPT_CHAIN"/,
  "[recovery] bootstrap.entry should publish appScriptChain through the protocol bridge"
);
assert.match(
  bootstrapEntrySource,
  /createManifestScriptChainError/,
  "[recovery] bootstrap.entry should create structured manifest errors when app\.scriptChain is unavailable"
);
assert.match(
  bootstrapErrorSource,
  /resourceMeta && resourceMeta\.kind === "manifest"/,
  "[recovery] bootstrap.error should render manifest-specific fallback details"
);

console.log("task3-startup-script-chain-recovery-contract: ok");
