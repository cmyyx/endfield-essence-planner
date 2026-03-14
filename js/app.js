(function () {

  const readBootProtocol = (protocolName) => {
    if (typeof window === "undefined") return undefined;
    const appBoot = window.__APP_BOOT__;
    if (!appBoot || typeof appBoot.readProtocol !== "function") {
      return undefined;
    }
    return appBoot.readProtocol(protocolName);
  };

  const publishBootProtocol = (protocolName, value) => {
    if (typeof window === "undefined") return value;
    const appBoot = window.__APP_BOOT__;
    if (appBoot && typeof appBoot.publishProtocol === "function") {
      appBoot.publishProtocol(protocolName, value);
    }
    return value;
  };

  const renderBootError = (payload) => {
    const renderError = readBootProtocol("renderBootError");
    if (typeof renderError === "function") {
      renderError(payload);
      return;
    }
    const fallback = document.createElement("div");
    fallback.style.cssText = "padding:24px;color:#f36c6c;font-family:Microsoft YaHei UI;";
    fallback.textContent = "页面加载失败，请刷新后重试。";
    document.body.textContent = "";
    document.body.appendChild(fallback);
  };

  const fallbackLoadScript = (src) =>
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load: " + src));
      document.body.appendChild(script);
    });

  const loadScript = readBootProtocol("loadScript") || publishBootProtocol("loadScript", fallbackLoadScript);
  const appScriptChain = readBootProtocol("appScriptChain");

  const normalizeScriptSrc = (src) => {
    if (!src || typeof window === "undefined") return String(src || "");
    try {
      return new URL(String(src || ""), window.location.href).href;
    } catch (error) {
      return String(src || "");
    }
  };
  const preloadRegistry = new Set();
  const seedPreloadRegistry = () => {
    if (typeof document === "undefined") return;
    Array.from(document.querySelectorAll('link[rel="preload"][as="script"]') || []).forEach((link) => {
      const href = normalizeScriptSrc(link.getAttribute("href") || link.href || "");
      if (href) preloadRegistry.add(href);
    });
  };
  const isDataSaverMode = () => {
    try {
      const conn = navigator && (navigator.connection || navigator.mozConnection || navigator.webkitConnection);
      if (!conn) return false;
      if (conn.saveData) return true;
      const type = String(conn.effectiveType || "").toLowerCase();
      return type === "slow-2g" || type === "2g";
    } catch (error) {
      return false;
    }
  };
  const isScriptLoaded = (src) => {
    if (typeof document === "undefined") return false;
    const key = normalizeScriptSrc(src);
    if (!key) return false;
    return Array.from(document.scripts || []).some((script) => {
      if (!script || !script.dataset || script.dataset.loaded !== "true") return false;
      const scriptSrc = normalizeScriptSrc(script.getAttribute("src") || script.src || "");
      return scriptSrc === key;
    });
  };
  const preloadScript = (src) => {
    if (!src || typeof document === "undefined" || !document.head) return;
    if (isDataSaverMode()) return;
    const key = normalizeScriptSrc(src);
    if (!key || preloadRegistry.has(key)) return;
    if (isScriptLoaded(key)) {
      preloadRegistry.add(key);
      return;
    }
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "script";
    link.href = src;
    document.head.appendChild(link);
    preloadRegistry.add(key);
  };
  seedPreloadRegistry();

  const scripts =
    Array.isArray(appScriptChain) &&
    appScriptChain.length
      ? appScriptChain
      : [];

  if (!scripts.length) {
    if (typeof window !== "undefined" && typeof window.__reportScriptChainMissing === "function") {
      window.__reportScriptChainMissing();
    } else {
      renderBootError({
        title: "页面资源加载失败",
        summary: "脚本加载清单缺失，应用暂时无法启动。",
      });
    }
    return;
  }

  scripts.forEach((src) => {
    preloadScript(src);
  });

  scripts
    .reduce((promise, src) => promise.then(() => loadScript(src)), Promise.resolve())
    .catch((error) => {
      const failedMessage = String((error && error.message) || "");
      const failedScript = failedMessage.replace(/^Failed to load:\s*/i, "");
      if (typeof window !== "undefined" && typeof window.__reportScriptLoadFailure === "function") {
        window.__reportScriptLoadFailure(failedScript);
      } else {
        renderBootError({
          title: "页面资源加载失败",
          summary: "核心脚本未能完整加载，应用暂时无法启动。",
          details: [failedScript ? `失败资源：${failedScript}` : "失败资源：未知"],
        });
      }
    });
})();
