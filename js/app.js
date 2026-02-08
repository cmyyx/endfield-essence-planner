(function () {
  const version =
    (document.documentElement && document.documentElement.dataset.assetVersion) ||
    (document.lastModified || String(Date.now())).replace(/\D/g, "");

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const renderBootError = ({ title, summary, details, suggestions }) => {
    const safeTitle = escapeHtml(title || "页面加载失败");
    const safeSummary = escapeHtml(summary || "出现未知错误，请稍后重试。");
    const detailList = Array.isArray(details) ? details.filter(Boolean) : [];
    const suggestionList = Array.isArray(suggestions) ? suggestions.filter(Boolean) : [];
    const detailHtml = detailList.length
      ? `<ul style="margin:8px 0 0 18px;padding:0;line-height:1.65;">${detailList
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("")}</ul>`
      : "";
    const suggestionHtml = suggestionList.length
      ? `<ol style="margin:8px 0 0 18px;padding:0;line-height:1.65;">${suggestionList
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("")}</ol>`
      : "";

    document.body.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0b0f14;color:#e6e9ef;font-family:'Microsoft YaHei UI','PingFang SC',sans-serif;">
        <div style="width:min(680px,92vw);border:1px solid rgba(243,108,108,0.42);border-radius:14px;padding:18px 18px 16px;background:rgba(26,14,18,0.84);box-shadow:0 14px 34px rgba(0,0,0,0.38);">
          <div style="font-size:16px;font-weight:700;letter-spacing:0.03em;color:#ff9e9e;">${safeTitle}</div>
          <div style="margin-top:8px;line-height:1.7;color:#ffd7d7;">${safeSummary}</div>
          ${
            detailHtml
              ? `<div style="margin-top:12px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);"><div style="font-weight:600;color:#ffd1d1;">错误详情</div>${detailHtml}</div>`
              : ""
          }
          ${
            suggestionHtml
              ? `<div style="margin-top:12px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);"><div style="font-weight:600;color:#f2e5c9;">建议处理</div>${suggestionHtml}</div>`
              : ""
          }
          <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
            <button onclick="location.reload()" style="cursor:pointer;border:1px solid rgba(255,255,255,0.45);border-radius:999px;padding:6px 14px;background:rgba(12,18,28,0.9);color:#fff;">刷新页面</button>
            <a href="https://github.com/cmyyx/endfield-essence-planner/issues" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;text-decoration:none;border:1px solid rgba(77,214,201,0.45);border-radius:999px;padding:6px 14px;background:rgba(12,18,28,0.85);color:#c9fff7;">反馈问题</a>
          </div>
        </div>
      </div>`;
  };

  if (typeof window !== "undefined") {
    window.__renderBootError = renderBootError;
  }

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src + "?v=" + version;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load: " + src));
      document.body.appendChild(script);
    });

  const scripts = [
    "./js/app.core.js",
    "./js/app.state.js",
    "./js/app.i18n.js",
    "./js/app.content.js",
    "./js/app.search.js",
    "./js/app.ui.js",
    "./js/app.storage.js",
    "./js/app.analytics.js",
    "./js/app.embed.js",
    "./js/app.perf.js",
    "./js/app.background.js",
    "./js/app.weapons.js",
    "./js/app.recommendations.js",
    "./js/app.tutorial.js",
    "./js/app.recommendations.display.js",
    "./js/app.modals.js",
    "./js/app.media.js",
    "./js/app.strategy.js",
    "./js/app.reforging.js",
    "./js/app.main.js",
  ];

  scripts
    .reduce((promise, src) => promise.then(() => loadScript(src)), Promise.resolve())
    .catch((error) => {
      const failedMessage = String((error && error.message) || "");
      const failedScript = failedMessage.replace(/^Failed to load:\s*/i, "");
      renderBootError({
        title: "页面资源加载失败",
        summary: "核心脚本未能完整加载，应用暂时无法启动。",
        details: [
          failedScript ? `失败资源：${failedScript}` : "失败资源：未知",
          `网络状态：${navigator.onLine ? "在线" : "离线"}`,
          "可能原因：网络波动、缓存损坏、CDN 同步延迟或拦截插件阻止脚本请求",
        ],
        suggestions: [
          "按 Ctrl + F5 强制刷新后重试",
          "检查代理、DNS、广告拦截/脚本拦截插件是否影响静态资源加载",
          "若问题持续，请在 GitHub Issues 附上控制台报错截图",
        ],
      });
    });
})();
