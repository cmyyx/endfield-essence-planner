(function () {
  const utils = (window.AppUtils = window.AppUtils || {});

  utils.getAppFingerprint = function getAppFingerprint() {
    if (typeof document === "undefined") return "";
    const appEl = document.getElementById("app");
    if (appEl && appEl.dataset && appEl.dataset.fingerprint) {
      return String(appEl.dataset.fingerprint);
    }
    const meta = document.querySelector('meta[name="fingerprint"]');
    const metaValue = meta && meta.getAttribute ? meta.getAttribute("content") : "";
    return metaValue ? String(metaValue) : "";
  };

  utils.triggerJsonDownload = function triggerJsonDownload(filename, payload) {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  };
})();
