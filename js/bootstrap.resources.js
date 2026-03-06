(function (globalObject) {
  var cloneArray = function (value) {
    return Array.isArray(value) ? value.slice() : [];
  };

  var cloneOptionalConfigMap = function (value) {
    if (!value || typeof value !== "object") return {};
    var map = {};
    Object.keys(value).forEach(function (key) {
      var entry = value[key];
      map[key] = entry && typeof entry === "object" ? Object.assign({}, entry) : {};
    });
    return map;
  };

  var reportNonFatalDiagnostic = function (payload) {
    var source = payload && typeof payload === "object" ? payload : {};
    var reporter =
      typeof globalObject.__reportNonFatalDiagnostic === "function"
        ? globalObject.__reportNonFatalDiagnostic
        : globalObject.__APP_DIAGNOSTICS__ &&
          typeof globalObject.__APP_DIAGNOSTICS__.reportNonFatalDiagnostic === "function"
          ? globalObject.__APP_DIAGNOSTICS__.reportNonFatalDiagnostic
          : null;
    if (typeof reporter !== "function") return;
    try {
      reporter({
        module: "bootstrap.resources",
        operation: String(source.operation || "resource.unknown"),
        kind: String(source.kind || "non-fatal"),
        resource: String(source.resource || "bootstrap.resources"),
        timestamp: source.timestamp,
        errorName: String(source.errorName || ""),
        errorMessage: String(source.errorMessage || ""),
        note: String(source.note || ""),
        optionalSignature: String(source.optionalSignature || ""),
      });
    } catch (error) {
      // diagnostic reporter must stay non-blocking
    }
  };

  var createLegacyBootManifest = function () {
    return {
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
    };
  };

  var resolveBootResourceConfig = function (options) {
    var warnOnce = options && typeof options.warnOnce === "function" ? options.warnOnce : function () {};
    var manifest =
      typeof window !== "undefined" &&
      window.__APP_RESOURCE_MANIFEST &&
      typeof window.__APP_RESOURCE_MANIFEST === "object"
        ? window.__APP_RESOURCE_MANIFEST
        : null;
    var legacyManifest = createLegacyBootManifest();
    if (!manifest) {
      warnOnce(
        "resource-manifest-fallback",
        "[bootstrap] window.__APP_RESOURCE_MANIFEST is missing, using legacy fallback resources."
      );
      manifest = legacyManifest;
      if (typeof window !== "undefined") {
        window.__APP_RESOURCE_MANIFEST = manifest;
      }
    }
    var boot = manifest && manifest.boot && typeof manifest.boot === "object" ? manifest.boot : {};
    var cssFiles = cloneArray(boot.css);
    if (!cssFiles.length) {
      warnOnce("resource-manifest-css-fallback", "[bootstrap] manifest boot.css is empty, using legacy fallback CSS.");
      cssFiles = cloneArray(legacyManifest.boot.css);
    }
    var startupDataScripts = cloneArray(boot.data);
    if (!startupDataScripts.length) {
      warnOnce(
        "resource-manifest-data-fallback",
        "[bootstrap] manifest boot.data is empty, using legacy fallback startup data scripts."
      );
      startupDataScripts = cloneArray(legacyManifest.boot.data);
    }
    var startupRuntimeScripts = cloneArray(boot.runtime);
    if (!startupRuntimeScripts.length) {
      warnOnce(
        "resource-manifest-runtime-fallback",
        "[bootstrap] manifest boot.runtime is empty, using legacy fallback runtime scripts."
      );
      startupRuntimeScripts = cloneArray(legacyManifest.boot.runtime);
    }
    var optionalScriptConfigs = cloneOptionalConfigMap(boot.optional);
    if (!Object.keys(optionalScriptConfigs).length) {
      optionalScriptConfigs = cloneOptionalConfigMap(legacyManifest.boot.optional);
    }
    var appEntryScript = startupRuntimeScripts.includes("./js/app.js")
      ? "./js/app.js"
      : startupRuntimeScripts[startupRuntimeScripts.length - 1] || "./js/app.js";
    var runtimePreludeScripts = startupRuntimeScripts.filter(function (src) {
      return src !== appEntryScript;
    });
    var startupScripts = startupDataScripts.concat(startupRuntimeScripts);
    return {
      cssFiles: cssFiles,
      startupDataScripts: startupDataScripts,
      startupRuntimeScripts: startupRuntimeScripts,
      runtimePreludeScripts: runtimePreludeScripts,
      appEntryScript: appEntryScript,
      startupScripts: startupScripts,
      optionalScriptConfigs: optionalScriptConfigs,
    };
  };

  var createResourceRuntime = function (options) {
    var bt = options.bt;
    var cssFiles = options.cssFiles;
    var startupScripts = options.startupScripts;
    var declaredAppScriptChain = options.declaredAppScriptChain;
    var optionalScriptConfigs = options.optionalScriptConfigs || {};
    var runId = options.runId;
    var getRunSerial = options.getRunSerial;
    var ensurePreloadAssist = options.ensurePreloadAssist;
    var getPreloadRefs = options.getPreloadRefs;
    var normalizeResourceKey = options.normalizeResourceKey;
    var applyBootCacheBust = options.applyBootCacheBust;
    var probeResourceStatus = options.probeResourceStatus;
    var isFatalHttpStatus = options.isFatalHttpStatus;
    var createLoadError = options.createLoadError;
    var reportOptionalResourceFailure = options.reportOptionalResourceFailure;
    var bootCacheBustToken = options.bootCacheBustToken;

    var toResourceLabel = function (src) {
      var value = String(src || "");
      if (!value) return bt("unknown_resource");
      if (/^https?:\/\//i.test(value)) return value;
      return value;
    };

    var resourceState = new Map();
    var progressMeta = {
      startedAt: Date.now(),
      lastCompleted: -1,
      lastCompletedAt: Date.now(),
    };
    var preloadAssistStallMs = 30000;
    var preloadFailStallMs = 60000;
    var preloadLongHelpStallMs = 45000;
    var triggerStallTimeout = null;
    var progressPulseTimer = null;

    var ensureResource = function (src, kind, ensureOptions) {
      var normalizedOptions = ensureOptions && typeof ensureOptions === "object" ? ensureOptions : {};
      var optionalConfig = optionalScriptConfigs[src] || null;
      var key = normalizeResourceKey(src);
      if (!resourceState.has(key)) {
        resourceState.set(key, {
          key: key,
          src: src,
          kind: kind || "resource",
          label: toResourceLabel(src),
          status: "pending",
          statusAt: 0,
          optional: Boolean(normalizedOptions.optional || optionalConfig),
          featureKey: normalizedOptions.featureKey || (optionalConfig ? optionalConfig.featureKey : ""),
        });
      } else if (normalizedOptions.optional || optionalConfig) {
        var existing = resourceState.get(key);
        if (existing) {
          existing.optional = true;
          if (!existing.featureKey) {
            existing.featureKey = normalizedOptions.featureKey || (optionalConfig ? optionalConfig.featureKey : "");
          }
        }
      }
      return key;
    };

    var renderProgress = function () {
      if (runId !== getRunSerial()) return;
      ensurePreloadAssist();
      var refs = getPreloadRefs();
      if (!refs.overlay) return;
      var entries = Array.from(resourceState.values());
      var total = entries.length;
      var loaded = entries.filter(function (entry) {
        return entry.status === "loaded";
      }).length;
      var criticalFailedItem = entries.find(function (entry) {
        return entry.status === "failed" && !entry.optional;
      });
      var optionalFailedItems = entries.filter(function (entry) {
        return entry.status === "failed" && entry.optional;
      });
      var completedCount = loaded + optionalFailedItems.length;
      var loadingItems = entries.filter(function (entry) {
        return entry.status === "loading";
      });
      var loadingItem = loadingItems.length ? loadingItems[0] : null;
      var loadingCount = loadingItems.length;
      var loadingPreview =
        loadingCount > 0
          ? loadingItems
              .slice(0, 3)
              .map(function (entry) {
                return entry.label;
              })
              .join(bt("list_sep"))
          : "";
      var recentLoadedPreview = entries
        .filter(function (entry) {
          return entry.status === "loaded" && entry.statusAt > 0;
        })
        .sort(function (a, b) {
          return b.statusAt - a.statusAt;
        })
        .slice(0, 2)
        .map(function (entry) {
          return entry.label;
        })
        .join(bt("list_sep"));
      if (completedCount !== progressMeta.lastCompleted) {
        progressMeta.lastCompleted = completedCount;
        progressMeta.lastCompletedAt = Date.now();
      }
      var stagnantMs = Date.now() - progressMeta.lastCompletedAt;
      var shouldShowAssist = !criticalFailedItem && completedCount < total && stagnantMs >= preloadAssistStallMs;
      var shouldForceTimeout = !criticalFailedItem && completedCount < total && stagnantMs >= preloadFailStallMs;
      var hasStagingGap = !criticalFailedItem && !loadingItem && completedCount < total;
      if (refs.count) {
        refs.count.textContent = completedCount + "/" + total;
      }
      if (refs.progressFill) {
        var percent = total > 0 ? Math.min(100, Math.round((completedCount / total) * 100)) : 0;
        refs.progressFill.style.width = percent + "%";
        refs.progressFill.setAttribute("aria-valuenow", String(percent));
      }
      if (refs.status) {
        if (criticalFailedItem) {
          refs.status.textContent = bt("preload_status_failed");
        } else if (total === 0) {
          refs.status.textContent = bt("preload_status_prepare");
        } else if (completedCount >= total) {
          refs.status.textContent = bt("preload_status_ready");
        } else if (hasStagingGap) {
          refs.status.textContent = bt("preload_status_staging");
        } else if (loadingCount > 1) {
          refs.status.textContent = bt("preload_status_parallel");
        } else {
          refs.status.textContent = bt("preload_status_loading");
        }
      }
      if (refs.current) {
        var currentText = "";
        if (criticalFailedItem) {
          currentText = bt("preload_current_failed", { label: criticalFailedItem.label });
        } else if (loadingCount > 1) {
          var parallelText = bt("preload_current_parallel", {
            labels: loadingPreview,
            more: loadingCount > 3 ? bt("preload_current_parallel_more", { count: loadingCount }) : "",
          });
          currentText = recentLoadedPreview
            ? parallelText + " | " + bt("preload_current_done", { labels: recentLoadedPreview })
            : parallelText;
        } else if (loadingItem) {
          currentText = bt("preload_current_now", { label: loadingItem.label });
        } else if (hasStagingGap) {
          currentText = recentLoadedPreview
            ? bt("preload_current_wait_stage", { labels: recentLoadedPreview })
            : bt("preload_current_wait_core");
        } else if (completedCount >= total && total > 0) {
          currentText = bt("preload_current_wait_mount");
        }
        if (!criticalFailedItem && optionalFailedItems.length) {
          var optionalFailedPreview = optionalFailedItems
            .slice(0, 2)
            .map(function (entry) {
              return entry.label;
            })
            .join(bt("list_sep"));
          var optionalFailedText = bt("preload_current_optional_failed", {
            label: optionalFailedPreview,
          });
          currentText = currentText ? currentText + " | " + optionalFailedText : optionalFailedText;
        }
        refs.current.textContent = currentText;
      }
      if (refs.help) {
        if (criticalFailedItem) {
          refs.help.textContent = "";
        } else if (completedCount < total && stagnantMs >= preloadLongHelpStallMs) {
          refs.help.textContent = bt("preload_help_long");
        } else if (shouldShowAssist) {
          refs.help.textContent = bt("preload_help_short");
        } else {
          refs.help.textContent = "";
        }
      }
      if (refs.actions) {
        refs.actions.style.display = shouldShowAssist ? "flex" : "none";
      }
      if (shouldForceTimeout && typeof triggerStallTimeout === "function") {
        triggerStallTimeout();
      }
    };

    var setResourceStatus = function (key, status) {
      var item = resourceState.get(key);
      if (!item) return;
      item.status = status;
      item.statusAt = Date.now();
      renderProgress();
    };

    var initialize = function () {
      cssFiles.forEach(function (href) {
        ensureResource(href, "style");
      });
      startupScripts.forEach(function (src) {
        ensureResource(src, "script");
      });
      declaredAppScriptChain.forEach(function (src) {
        ensureResource(src, "script");
      });
      renderProgress();

      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          function () {
            ensurePreloadAssist();
            renderProgress();
          },
          { once: true }
        );
      }
      progressPulseTimer = setInterval(function () {
        if (runId !== getRunSerial()) {
          clearInterval(progressPulseTimer);
          progressPulseTimer = null;
          return;
        }
        renderProgress();
      }, 1000);
    };

    var cleanup = function () {
      if (progressPulseTimer) {
        clearInterval(progressPulseTimer);
        progressPulseTimer = null;
      }
    };

    var scriptLoadRegistry = new Map();
    var loadScript = function (src, loadOptions) {
      var requestSrc = applyBootCacheBust(src);
      var key = ensureResource(src, "script", loadOptions);
      if (scriptLoadRegistry.has(key)) {
        return scriptLoadRegistry.get(key);
      }
      var task = new Promise(function (resolve, reject) {
        var existingLoaded = false;
        if (!bootCacheBustToken) {
          existingLoaded = Array.from(document.scripts || []).some(function (script) {
            var s = script.getAttribute("src") || script.src || "";
            var same = normalizeResourceKey(s) === key;
            return same && script.dataset && script.dataset.loaded === "true";
          });
        }
        if (existingLoaded) {
          setResourceStatus(key, "loaded");
          resolve();
          return;
        }
        var script = document.createElement("script");
        script.src = requestSrc;
        setResourceStatus(key, "loading");
        script.onload = function () {
          script.dataset.loaded = "true";
          setResourceStatus(key, "loaded");
          resolve();
        };
        script.onerror = function () {
          setResourceStatus(key, "failed");
          var failedEntry = resourceState.get(key);
          reportNonFatalDiagnostic({
            operation: "resource.load-script",
            kind: "script-load-failed",
            resource: src,
            errorName: "ScriptLoadError",
            errorMessage: "Failed to load script resource",
            optionalSignature: "resource.load-script:" + key,
          });
          if (failedEntry && failedEntry.optional) {
            reportOptionalResourceFailure(failedEntry);
          }
          scriptLoadRegistry.delete(key);
          probeResourceStatus(requestSrc)
            .then(function (probe) {
              reject(createLoadError("script", src, "error", probe));
            })
            .catch(function (error) {
              reject(createLoadError("script", src, "error", error || null));
            });
        };
        var target = document.body || document.head || document.documentElement;
        target.appendChild(script);
      });
      scriptLoadRegistry.set(key, task);
      return task;
    };
    window.__loadScript = loadScript;

    var styleLoadRegistry = new Map();
    var resolveCssStallLimitMs = function () {
      var base = 60000;
      try {
        var conn = navigator && (navigator.connection || navigator.mozConnection || navigator.webkitConnection);
        if (conn) {
          if (conn.saveData) return 75000;
          var type = String(conn.effectiveType || "").toLowerCase();
          if (type === "slow-2g" || type === "2g") return 75000;
          if (type === "3g") return 65000;
        }
      } catch (error) {
        // ignore
      }
      return base;
    };
    var cssStallLimitMs = resolveCssStallLimitMs();
    var cssStatePollIntervalMs = 900;
    var cssProbeIntervalMs = 5000;
    var isStylesheetReady = function (key, link) {
      if (!link) return false;
      try {
        if (link.sheet && !link.disabled) {
          return true;
        }
      } catch (error) {
        // ignore cross-origin/parse errors and continue with fallback scan
      }
      try {
        var sheets = Array.from(document.styleSheets || []);
        return sheets.some(function (sheet) {
          var href = "";
          try {
            href = sheet && sheet.href ? normalizeResourceKey(sheet.href) : "";
          } catch (error) {
            href = "";
          }
          return href === key;
        });
      } catch (error) {
        return false;
      }
    };
    var loadStyle = function (href) {
      var requestHref = applyBootCacheBust(href);
      var key = ensureResource(href, "style");
      if (styleLoadRegistry.has(key)) {
        return styleLoadRegistry.get(key);
      }
      var task = new Promise(function (resolve, reject) {
        var settled = false;
        var probeInFlight = false;
        var lastProbe = null;
        var errorSettleTimer = null;
        var nextProbeAt = Date.now();
        var link =
          bootCacheBustToken
            ? null
            : document.querySelector('link[rel="stylesheet"][href="' + href + '"]');
        if (!link) {
          link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = requestHref;
          document.head.appendChild(link);
        }
        setResourceStatus(key, "loading");
        var pollTimer = null;
        var stallTimer = null;
        var cleanupLoad = function () {
          clearInterval(pollTimer);
          clearTimeout(stallTimer);
          clearTimeout(errorSettleTimer);
          link.removeEventListener("load", onLoad);
          link.removeEventListener("error", onError);
        };
        var onLoad = function () {
          if (settled) return;
          settled = true;
          if (link.dataset) {
            link.dataset.loaded = "true";
          }
          cleanupLoad();
          setResourceStatus(key, "loaded");
          resolve();
        };
        var onFailure = function (reason, probe) {
          if (settled) return;
          settled = true;
          cleanupLoad();
          setResourceStatus(key, "failed");
          reportNonFatalDiagnostic({
            operation: "resource.load-style",
            kind: "style-load-failed",
            resource: href,
            errorName: "StyleLoadError",
            errorMessage: String(reason || "style load failed"),
            note: probe && probe.status ? "status=" + probe.status : "",
            optionalSignature: "resource.load-style:" + key + ":" + String(reason || "unknown"),
          });
          styleLoadRegistry.delete(key);
          reject(createLoadError("style", href, reason, probe));
        };
        var runProbe = function () {
          if (settled || probeInFlight) return;
          probeInFlight = true;
          probeResourceStatus(requestHref)
            .then(function (probe) {
              if (settled) return;
              lastProbe = probe || null;
              if (isStylesheetReady(key, link)) {
                onLoad();
                return;
              }
              var status = probe && probe.status ? Number(probe.status) : 0;
              if (status && isFatalHttpStatus(status)) {
                onFailure("http", probe);
              }
            })
            .catch(function (error) {
              onFailure("http", error || null);
            })
            .finally(function () {
              probeInFlight = false;
            });
        };
        var schedulePoll = function () {
          clearInterval(pollTimer);
          pollTimer = setInterval(function () {
            if (settled) return;
            if (isStylesheetReady(key, link)) {
              onLoad();
              return;
            }
            if (Date.now() >= nextProbeAt) {
              nextProbeAt = Date.now() + cssProbeIntervalMs;
              runProbe();
            }
          }, cssStatePollIntervalMs);
        };
        var scheduleStallWatchdog = function () {
          clearTimeout(stallTimer);
          stallTimer = setTimeout(function () {
            if (settled) return;
            if (isStylesheetReady(key, link)) {
              onLoad();
              return;
            }
            probeResourceStatus(requestHref)
              .then(function (probe) {
                if (settled) return;
                if (isStylesheetReady(key, link)) {
                  onLoad();
                  return;
                }
                var status = probe && probe.status ? Number(probe.status) : 0;
                if (status && isFatalHttpStatus(status)) {
                  onFailure("http", probe);
                  return;
                }
                onFailure("stalled", probe);
              })
              .catch(function (error) {
                onFailure("http", error || null);
              });
          }, cssStallLimitMs);
        };
        schedulePoll();
        scheduleStallWatchdog();
        link.addEventListener("load", onLoad);
        var onError = function () {
          if (settled) return;
          runProbe();
          clearTimeout(errorSettleTimer);
          errorSettleTimer = setTimeout(function () {
            if (settled) return;
            if (isStylesheetReady(key, link)) {
              onLoad();
              return;
            }
            onFailure("error", lastProbe);
          }, 1600);
        };
        link.addEventListener("error", onError);
        try {
          if (isStylesheetReady(key, link)) {
            onLoad();
            return;
          }
          runProbe();
        } catch (error) {
          // ignore and wait load/error
        }
      });
      styleLoadRegistry.set(key, task);
      return task;
    };

    return {
      resourceState: resourceState,
      ensureResource: ensureResource,
      setResourceStatus: setResourceStatus,
      renderProgress: renderProgress,
      loadScript: loadScript,
      loadStyle: loadStyle,
      initialize: initialize,
      cleanup: cleanup,
      setStallTimeoutTrigger: function (fn) {
        triggerStallTimeout = typeof fn === "function" ? fn : null;
      },
    };
  };

  var api = {
    resolveBootResourceConfig: resolveBootResourceConfig,
    createResourceRuntime: createResourceRuntime,
  };

  globalObject.__BOOTSTRAP_RESOURCES__ = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
      ? window
      : this
);
