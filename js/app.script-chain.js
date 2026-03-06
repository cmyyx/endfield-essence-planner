(function () {
  if (typeof window === "undefined") return;
  var manifest =
    window.__APP_RESOURCE_MANIFEST && typeof window.__APP_RESOURCE_MANIFEST === "object"
      ? window.__APP_RESOURCE_MANIFEST
      : null;
  var manifestScriptChain =
    manifest &&
    manifest.app &&
    typeof manifest.app === "object" &&
    Array.isArray(manifest.app.scriptChain)
      ? manifest.app.scriptChain.slice()
      : [];
  if (manifestScriptChain.length) {
    window.__APP_SCRIPT_CHAIN = manifestScriptChain;
    return;
  }

  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(
      "[app.script-chain] window.__APP_RESOURCE_MANIFEST.app.scriptChain is missing; keeping compatibility bridge output only."
    );
  }
  if (Array.isArray(window.__APP_SCRIPT_CHAIN)) {
    window.__APP_SCRIPT_CHAIN = window.__APP_SCRIPT_CHAIN.slice();
    return;
  }
  window.__APP_SCRIPT_CHAIN = [];
})();
