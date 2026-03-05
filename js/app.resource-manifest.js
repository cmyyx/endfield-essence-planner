(function (globalObject) {
  var manifest = {
    boot: {
      css: [
        "./css/styles.theme.css",
        "./css/styles.layout.css",
        "./css/styles.overlays.css",
        "./css/styles.filters.css",
        "./css/styles.weapons.css",
        "./css/styles.recommendations.css",
        "./css/styles.gear-refining.css",
        "./css/styles.theme.modes.css",
      ],
      data: [
        "./js/app.resource-manifest.js",
        "./data/version.js",
        "./data/dungeons.js",
        "./data/weapons.js",
        "./data/up-schedules.js",
        "./data/gears.js",
        "./data/weapon-images.js",
        "./data/i18n/zh-CN.js",
        "./data/i18n/zh-TW.js",
        "./data/i18n/en.js",
        "./data/i18n/ja.js",
      ],
      runtime: ["./vendor/vue.global.prod.js", "./js/app.script-chain.js", "./js/app.js"],
      optional: {
        "./vendor/pinyin-pro.min.js": {
          featureKey: "pinyin",
          retryDelayMs: 1200,
          maxRetries: 1,
        },
      },
    },
    app: {
      scriptChain: [
        "./js/app.core.js",
        "./js/app.utils.js",
        "./js/app.state.js",
        "./js/app.diagnostics.js",
        "./js/app.i18n.js",
        "./js/app.sanitizer.js",
        "./js/app.content.js",
        "./js/app.search.js",
        "./js/app.ui.js",
        "./js/app.up-schedule.js",
        "./js/app.rerun-ranking.js",
        "./js/app.storage.schema.js",
        "./js/app.storage.persistence.js",
        "./js/app.storage.recovery.js",
        "./js/app.storage.diagnostic.js",
        "./js/app.storage.js",
        "./js/app.analytics.js",
        "./js/app.embed.js",
        "./js/app.perf.js",
        "./js/app.background.js",
        "./js/app.weapons.js",
        "./js/app.weapon.match.js",
        "./js/app.recommendations.js",
        "./js/app.tutorial.js",
        "./js/app.recommendations.display.js",
        "./js/app.modals.js",
        "./js/app.update.js",
        "./js/app.media.js",
        "./js/app.strategy.js",
        "./js/app.gear-refining.js",
        "./js/templates.plan-config.js",
        "./js/templates.gear-refining.js",
        "./js/templates.main.01.js",
        "./js/templates.main.02.js",
        "./js/templates.main.03.js",
        "./js/templates.main.04.js",
        "./js/app.main.js",
      ],
    },
  };

  globalObject.__APP_RESOURCE_MANIFEST = manifest;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = manifest;
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
      ? window
      : this
);
