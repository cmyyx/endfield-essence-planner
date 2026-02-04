(function () {
    const version =
        (document.documentElement && document.documentElement.dataset.assetVersion) ||
        (document.lastModified || String(Date.now())).replace(/\D/g, "");
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
        // "./js/app.search.js",
        "./js/app.ui.js",
        // "./js/app.storage.js",
        "./js/app.embed.js",
        "./js/app.perf.js",
        "./js/app.background.js",
        // "./js/app.weapons.js", // We don't use this logic, only data
        // "./js/app.recommendations.js",
        // "./js/app.tutorial.js",
        // "./js/app.recommendations.display.js",
        "./js/app.modals.js",
        "./js/app.media.js",
        "./js/app.matcher.js",
        "./js/app.matcher_main.js",
    ];

    scripts
        .reduce((promise, src) => promise.then(() => loadScript(src)), Promise.resolve())
        .catch((err) => {
            console.error(err);
            document.body.innerHTML =
                "<div style='padding:24px;color:#f36c6c;font-family:Microsoft YaHei UI;'>资源加载失败，请刷新或检查网络缓存。</div>";
        });
})();
