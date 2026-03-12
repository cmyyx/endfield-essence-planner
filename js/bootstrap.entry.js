(function () {
  var root = document.documentElement;
  var themeStorageKey = "planner-theme-mode:v1";
  var runSerial = 0;
  var nowIsoString = function () {
    return new Date().toISOString();
  };
  var normalizeDiagnosticData = function (value, depth, seen) {
    var nextDepth = Number(depth) || 0;
    var stack = Array.isArray(seen) ? seen : [];
    if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (nextDepth >= 3) {
      return String(value);
    }
    if (typeof value === "function") {
      return "[function]";
    }
    if (value && typeof value === "object") {
      if (stack.indexOf(value) !== -1) {
        return "[circular]";
      }
      var nextSeen = stack.concat([value]);
      if (
        Object.prototype.toString.call(value) === "[object Error]" ||
        (typeof value.name === "string" && typeof value.message === "string")
      ) {
        return {
          name: String(value.name || "Error"),
          message: String(value.message || ""),
          stack: typeof value.stack === "string" ? value.stack : "",
        };
      }
      if (Array.isArray(value)) {
        return value.slice(0, 20).map(function (entry) {
          return normalizeDiagnosticData(entry, nextDepth + 1, nextSeen);
        });
      }
      var result = {};
      Object.keys(value)
        .slice(0, 24)
        .forEach(function (key) {
          result[key] = normalizeDiagnosticData(value[key], nextDepth + 1, nextSeen);
        });
      return result;
    }
    return String(value);
  };
  var createBootDiagnosticsStore = function () {
    var consoleEntries = [];
    var eventEntries = [];
    var nonFatalEntries = [];
    var consoleEntryLimit = 200;
    var eventEntryLimit = 200;
    var nonFatalLimit = 200;
    var resourceStateReader = null;
    var consoleInstalled = false;
    var errorListenersInstalled = false;
    var pushBounded = function (target, entry, limit) {
      target.push(entry);
      if (target.length > limit) {
        target.splice(0, target.length - limit);
      }
    };
    var normalizeNonFatalEntry = function (raw) {
      var source = raw && typeof raw === "object" ? raw : {};
      return {
        module: String(source.module || "bootstrap.entry"),
        operation: String(source.operation || "bootstrap.unknown"),
        kind: String(source.kind || "non-fatal"),
        resource: String(source.resource || "bootstrap.entry"),
        timestamp: String(source.timestamp || nowIsoString()),
        errorName: String(source.errorName || ""),
        errorMessage: String(source.errorMessage || ""),
        note: String(source.note || ""),
        optionalSignature: String(source.optionalSignature || ""),
      };
    };
    var recordConsole = function (level, argsLike) {
      var values = Array.prototype.slice.call(argsLike || []).map(function (value) {
        return normalizeDiagnosticData(value, 0, []);
      });
      pushBounded(
        consoleEntries,
        {
          timestamp: nowIsoString(),
          level: String(level || "log"),
          values: values,
        },
        consoleEntryLimit
      );
    };
    var recordEvent = function (kind, payload) {
      pushBounded(
        eventEntries,
        {
          timestamp: nowIsoString(),
          kind: String(kind || "event"),
          payload: normalizeDiagnosticData(payload, 0, []),
        },
        eventEntryLimit
      );
    };
    var reportNonFatal = function (raw) {
      var entry = normalizeNonFatalEntry(raw);
      pushBounded(nonFatalEntries, entry, nonFatalLimit);
      return { recorded: true, reason: "boot-diagnostics", event: entry };
    };
    var installConsoleCapture = function () {
      if (consoleInstalled || typeof console === "undefined") return;
      ["log", "info", "warn", "error", "debug"].forEach(function (level) {
        if (typeof console[level] !== "function") return;
        var original = console[level];
        console[level] = function () {
          recordConsole(level, arguments);
          return original.apply(this, arguments);
        };
      });
      consoleInstalled = true;
    };
    var installErrorListeners = function () {
      if (errorListenersInstalled || typeof window === "undefined" || typeof window.addEventListener !== "function") {
        return;
      }
      window.addEventListener("error", function (event) {
        recordEvent("window.error", {
          message: event && event.message ? event.message : "",
          filename: event && event.filename ? event.filename : "",
          lineno: event && event.lineno ? event.lineno : 0,
          colno: event && event.colno ? event.colno : 0,
          error: event && event.error ? event.error : null,
        });
      });
      window.addEventListener("unhandledrejection", function (event) {
        recordEvent("window.unhandledrejection", {
          reason: event && Object.prototype.hasOwnProperty.call(event, "reason") ? event.reason : null,
        });
      });
      errorListenersInstalled = true;
    };
    var installGlobalShim = function () {
      if (typeof window === "undefined") return;
      try {
        if (!window.__APP_DIAGNOSTICS__ || typeof window.__APP_DIAGNOSTICS__.reportNonFatalDiagnostic !== "function") {
          Object.defineProperty(window, "__APP_DIAGNOSTICS__", {
            configurable: true,
            writable: true,
            value: {
              reportNonFatalDiagnostic: reportNonFatal,
              readDiagnosticsHistory: function () {
                return nonFatalEntries.slice();
              },
            },
          });
        }
        if (typeof window.__reportNonFatalDiagnostic !== "function") {
          Object.defineProperty(window, "__reportNonFatalDiagnostic", {
            configurable: true,
            writable: true,
            value: reportNonFatal,
          });
        }
      } catch (error) {
        recordEvent("diagnostic-shim-failed", { error: error });
      }
    };
    var setResourceStateReader = function (reader) {
      resourceStateReader = typeof reader === "function" ? reader : null;
    };
    var readResourceState = function () {
      if (!resourceStateReader) return [];
      try {
        var entries = resourceStateReader();
        if (!Array.isArray(entries)) {
          return normalizeDiagnosticData(entries, 0, []);
        }
        return entries.map(function (entry) {
          return normalizeDiagnosticData(entry, 0, []);
        });
      } catch (error) {
        return [
          {
            kind: "resource-state-read-failed",
            error: normalizeDiagnosticData(error, 0, []),
          },
        ];
      }
    };
    var readPerformanceResources = function () {
      if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") return [];
      try {
        return performance.getEntriesByType("resource").map(function (entry) {
          return {
            name: String(entry.name || ""),
            initiatorType: String(entry.initiatorType || ""),
            startTime: Number(entry.startTime || 0),
            duration: Number(entry.duration || 0),
            transferSize: Number(entry.transferSize || 0),
            encodedBodySize: Number(entry.encodedBodySize || 0),
            decodedBodySize: Number(entry.decodedBodySize || 0),
            responseStatus: Number(entry.responseStatus || 0),
          };
        });
      } catch (error) {
        return [{ error: normalizeDiagnosticData(error, 0, []) }];
      }
    };
    var readNavigationTiming = function () {
      if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") return null;
      try {
        var entries = performance.getEntriesByType("navigation");
        if (!entries || !entries.length) return null;
        var entry = entries[0];
        return {
          type: String(entry.type || ""),
          startTime: Number(entry.startTime || 0),
          duration: Number(entry.duration || 0),
          domContentLoadedEventEnd: Number(entry.domContentLoadedEventEnd || 0),
          loadEventEnd: Number(entry.loadEventEnd || 0),
          responseStatus: Number(entry.responseStatus || 0),
        };
      } catch (error) {
        return { error: normalizeDiagnosticData(error, 0, []) };
      }
    };
    var readScriptNodes = function () {
      return Array.from(document.scripts || []).map(function (script) {
        return {
          src: String(script.getAttribute("src") || script.src || ""),
          loaded: Boolean(script.dataset && script.dataset.loaded === "true"),
          async: Boolean(script.async),
          defer: Boolean(script.defer),
        };
      });
    };
    var readStylesheetNodes = function () {
      return Array.from(document.querySelectorAll('link[rel="stylesheet"]') || []).map(function (link) {
        return {
          href: String(link.getAttribute("href") || link.href || ""),
          loaded: Boolean(link.dataset && link.dataset.loaded === "true"),
          disabled: Boolean(link.disabled),
        };
      });
    };
    var buildBundle = function (extra) {
      var payload = extra && typeof extra === "object" ? extra : {};
      return {
        exportedAt: nowIsoString(),
        runSerial: runSerial,
        location: typeof window !== "undefined" ? window.location.href : "",
        referrer: typeof document !== "undefined" ? document.referrer || "" : "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        language: typeof navigator !== "undefined" ? navigator.language || "" : "",
        online: typeof navigator !== "undefined" && typeof navigator.onLine === "boolean" ? navigator.onLine : null,
        documentReadyState: typeof document !== "undefined" ? document.readyState : "",
        visibilityState: typeof document !== "undefined" ? document.visibilityState || "" : "",
        bootStorageProbe: typeof window !== "undefined" && window.__bootStorageProbe ? window.__bootStorageProbe : null,
        bootCacheBustToken: typeof window !== "undefined" ? String(window.__bootCacheBustToken || "") : "",
        bootstrapModules: bootstrapModuleScripts.slice(),
        errorContext: normalizeDiagnosticData(payload, 0, []),
        consoleEntries: consoleEntries.slice(),
        eventEntries: eventEntries.slice(),
        nonFatalDiagnostics: nonFatalEntries.slice(),
        resourceState: readResourceState(),
        navigationTiming: readNavigationTiming(),
        performanceResources: readPerformanceResources(),
        scripts: readScriptNodes(),
        stylesheets: readStylesheetNodes(),
      };
    };
    return {
      installConsoleCapture: installConsoleCapture,
      installErrorListeners: installErrorListeners,
      installGlobalShim: installGlobalShim,
      recordEvent: recordEvent,
      reportNonFatalDiagnostic: reportNonFatal,
      setResourceStateReader: setResourceStateReader,
      buildBundle: buildBundle,
    };
  };
  var bootDiagnostics = createBootDiagnosticsStore();
  bootDiagnostics.installConsoleCapture();
  bootDiagnostics.installErrorListeners();
  bootDiagnostics.installGlobalShim();
  var warnFlags = Object.create(null);
  var warnOnce = function (key, message) {
    if (warnFlags[key]) return;
    warnFlags[key] = true;
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn(message);
    }
  };
  var reportNonFatalDiagnostic = function (payload) {
    var source = payload && typeof payload === "object" ? payload : {};
    var reporter =
      typeof window !== "undefined" && typeof window.__reportNonFatalDiagnostic === "function"
        ? window.__reportNonFatalDiagnostic
        : typeof window !== "undefined" &&
          window &&
          window.__APP_DIAGNOSTICS__ &&
          typeof window.__APP_DIAGNOSTICS__.reportNonFatalDiagnostic === "function"
          ? window.__APP_DIAGNOSTICS__.reportNonFatalDiagnostic
          : null;
    if (typeof reporter !== "function") return;
    try {
      reporter({
        module: "bootstrap.entry",
        operation: String(source.operation || "bootstrap.unknown"),
        kind: String(source.kind || "non-fatal"),
        resource: String(source.resource || "bootstrap.entry"),
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
  var bootstrapModuleScripts = [
    "./js/app.protocol.js",
    "./js/bootstrap.resources.js",
    "./js/bootstrap.error.js",
    "./js/bootstrap.optional.js",
  ];
  var bootstrapModulePromises = Object.create(null);
  var normalizeBootstrapScriptUrl = function (src) {
    try {
      return new URL(String(src || ""), window.location.href).href;
    } catch (error) {
      return String(src || "");
    }
  };
  var loadBootstrapModuleScript = function (src) {
    if (bootstrapModulePromises[src]) {
      return bootstrapModulePromises[src];
    }
    bootstrapModulePromises[src] = new Promise(function (resolve, reject) {
      var targetScriptSrc = normalizeBootstrapScriptUrl(src);
      var existing = Array.from(document.scripts || []).find(function (script) {
        var loaded = script && script.dataset && script.dataset.loaded === "true";
        if (!loaded) return false;
        var scriptSrc = String(script.getAttribute("src") || script.src || "");
        return normalizeBootstrapScriptUrl(scriptSrc) === targetScriptSrc;
      });
      if (existing) {
        resolve();
        return;
      }
      var script = document.createElement("script");
      script.src = src;
      script.onload = function () {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = function () {
        delete bootstrapModulePromises[src];
        reject(new Error("Failed to load bootstrap helper: " + src));
      };
      var target = document.head || document.documentElement || document.body;
      target.appendChild(script);
    }).catch(function (error) {
      delete bootstrapModulePromises[src];
      throw error;
    });
    return bootstrapModulePromises[src];
  };
  var ensureBootstrapModulesReady = function () {
    return Promise.all(
      bootstrapModuleScripts.map(function (src) {
        return loadBootstrapModuleScript(src);
      })
    );
  };
  var resolveBootProtocolValue = function (protocolName, legacyName) {
    var appBoot = window.__APP_BOOT__;
    if (appBoot && typeof appBoot.readProtocol === "function") {
      var value = appBoot.readProtocol(protocolName);
      if (typeof value !== "undefined") {
        return value;
      }
    }
    return legacyName ? window[legacyName] : undefined;
  };
  var publishBootProtocolValue = function (protocolName, legacyName, value) {
    var appBoot = window.__APP_BOOT__;
    if (appBoot && typeof appBoot.publishProtocol === "function") {
      appBoot.publishProtocol(protocolName, value);
    }
    if (legacyName) {
      window[legacyName] = value;
    }
    return value;
  };
  var bootDiagnosticExportUtils = {
    nowIsoString: nowIsoString,
    buildFilename: function () {
      var stamp = nowIsoString().replace(/[^\d]/g, "").slice(0, 14) || String(Date.now());
      return "planner-boot-diagnostic-" + stamp + ".json";
    },
    triggerJsonDownload: function (filename, payload) {
      if (typeof document === "undefined" || typeof Blob === "undefined") return false;
      var serialized = JSON.stringify(payload, null, 2);
      var blob = new Blob([serialized], { type: "application/json;charset=utf-8" });
      if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
        return false;
      }
      var objectUrl = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.rel = "noopener";
      link.style.display = "none";
      (document.body || document.documentElement || document.head).appendChild(link);
      link.click();
      setTimeout(function () {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        URL.revokeObjectURL(objectUrl);
      }, 0);
      return true;
    },
  };
  publishBootProtocolValue(
    "bootDiagnosticExportUtils",
    "__BOOT_DIAGNOSTIC_EXPORT_UTILS__",
    bootDiagnosticExportUtils
  );
  var buildBootDiagnosticBundle = function (extra) {
    return bootDiagnostics.buildBundle(extra);
  };
  var exportBootDiagnosticBundle = function (extra) {
    var filename = bootDiagnosticExportUtils.buildFilename();
    var payload = buildBootDiagnosticBundle(extra);
    return {
      filename: filename,
      payload: payload,
      downloaded: bootDiagnosticExportUtils.triggerJsonDownload(filename, payload),
    };
  };
  publishBootProtocolValue("buildBootDiagnosticBundle", "__buildBootDiagnosticBundle", buildBootDiagnosticBundle);
  publishBootProtocolValue("exportBootDiagnosticBundle", "__exportBootDiagnosticBundle", exportBootDiagnosticBundle);
  var langStorageKey = "planner-lang";
  var fallbackBootLocale = "zh-CN";
  var supportedBootLocales = ["zh-CN", "zh-TW", "en", "ja"];
  var bootI18n = {
    "zh-CN": {
      preload_title: "少女祈祷中",
      preload_note: "首次打开或强制刷新可能稍慢",
      preload_status_prepare: "正在准备资源…",
      preload_status_failed: "资源加载失败",
      preload_status_ready: "资源已就绪，正在初始化页面…",
      preload_status_background_prepare: "资源已就绪，正在准备背景…",
      preload_status_staging: "资源已下载，正在启动下一阶段…",
      preload_status_parallel: "正在并行加载资源…",
      preload_status_loading: "正在加载资源…",
      preload_current_failed: "失败项：{label}",
      preload_current_parallel: "并行：{labels}{more}",
      preload_current_parallel_more: " 等 {count} 项",
      preload_current_done: "已完成：{labels}",
      preload_current_now: "当前：{label}",
      preload_current_wait_stage: "最近完成：{labels}；等待下一阶段…",
      preload_current_wait_core: "当前：等待核心模块启动…",
      preload_current_background: "当前：背景",
      preload_current_wait_mount: "等待应用挂载完成…",
      preload_help_short: "加载时间较长通常由网络波动或缓存导致，请稍候。",
      preload_help_long:
        "若长时间无变化，可点击“重试加载”或“刷新页面”；仍未恢复请点击“反馈问题”。",
      action_retry: "重试加载",
      action_refresh: "刷新页面",
      action_export_diag: "导出诊断",
      action_feedback: "反馈问题",
      unknown_resource: "未知资源",
      unknown_item: "未知",
      error_title_page_load: "页面加载失败",
      error_summary_unknown: "出现未知错误，请稍后重试。",
      error_details_title: "错误详情",
      error_suggestions_title: "建议处理",
      error_title_resource: "页面资源加载失败",
      error_summary_script_chain_missing: "脚本加载清单缺失，应用暂时无法启动。",
      error_summary_manifest_invalid: "启动资源清单配置无效，应用暂时无法启动。",
      error_detail_missing_chain: "缺失关键字段：window.__APP_RESOURCE_MANIFEST.app.scriptChain",
      error_detail_manifest_chain_invalid: "无效字段：window.__APP_RESOURCE_MANIFEST.app.scriptChain（需为非空数组）",
      error_detail_confirm_chain: "请确认 ./js/app.resource-manifest.js 已成功部署且包含非空 scriptChain",
      error_summary_core_script: "核心脚本未能完整加载，应用暂时无法启动。",
      error_summary_core_resource: "核心资源未能完整加载，应用暂时无法启动。",
      error_summary_http_404: "检测到资源路径错误（404），请检查部署目录与访问路径。",
      error_summary_http_403: "检测到资源访问被拒绝（403），请检查访问策略或防护规则。",
      error_summary_http_429: "检测到请求过于频繁（429），请稍后重试。",
      error_summary_http_5xx: "检测到服务端异常（5xx），请稍后重试。",
      error_title_style: "页面样式加载失败",
      error_summary_style: "关键样式文件未能完整加载，页面无法正常展示。",
      error_detail_failed_style: "失败样式：{name}",
      error_detail_failed_resource: "失败资源：{name}",
      error_detail_network_state: "网络状态：{state}",
      error_network_online: "在线",
      error_network_offline: "离线",
      error_detail_http_status: "HTTP 状态：{status}{hint}",
      error_detail_failed_reason: "失败原因：{reason}",
      error_hint_flaky:
        "可能原因：网络波动、缓存损坏、CDN 同步延迟或拦截插件阻止脚本请求",
      error_reason_http: "资源请求返回了错误状态",
      error_reason_error: "浏览器触发了资源加载错误事件",
      error_reason_stalled: "资源长时间未进入可用状态（可能连接悬挂或被拦截）",
      error_reason_stalled_with_status:
        "资源请求有响应，但样式未进入就绪状态（可能连接悬挂或被拦截）",
      http_404: "资源不存在或路径错误",
      http_429: "请求过于频繁（可能被限速）",
      http_403: "访问被拒绝（也可能触发了访问频率限制）",
      http_5xx: "服务端异常",
      suggestion_retry: "点击“重试加载”重新请求关键资源",
      suggestion_hard_refresh: "按 Ctrl + F5 强制刷新后重试",
      suggestion_issue_screenshot: "若问题持续，请在 GitHub Issues 附上控制台报错截图",
      list_sep: "、",
      preload_current_optional_failed: "可选失败：{label}",
      optional_modal_title: "可选功能加载失败",
      optional_modal_summary: "部分可选功能未能加载，页面主体仍可继续使用。",
      optional_modal_detail_features: "失败功能：{features}",
      optional_modal_detail_resources: "失败资源：{resources}",
      optional_modal_detail_non_blocking: "影响说明：仅影响可选功能，不影响核心功能。",
      optional_feature_pinyin: "拼音搜索",
      optional_feature_i18n: "扩展语言支持",
      optional_feature_notice_content: "公告与说明内容",
      optional_feature_sponsor_data: "赞助名单展示",
      optional_feature_weapon_images: "武器图片索引",
      optional_feature_version_meta: "版本元数据展示",
      optional_feature_core_data: "核心游戏数据",
      optional_feature_ui_scripts: "界面交互脚本",
      optional_feature_runtime: "页面运行时依赖",
    },
    "zh-TW": {
      preload_title: "少女祈禱中",
      preload_note: "首次開啟或強制重新整理可能稍慢",
      preload_status_prepare: "正在準備資源…",
      preload_status_failed: "資源載入失敗",
      preload_status_ready: "資源已就緒，正在初始化頁面…",
      preload_status_background_prepare: "資源已就緒，正在準備背景…",
      preload_status_staging: "資源已下載，正在啟動下一階段…",
      preload_status_parallel: "正在並行載入資源…",
      preload_status_loading: "正在載入資源…",
      preload_current_failed: "失敗項：{label}",
      preload_current_parallel: "並行：{labels}{more}",
      preload_current_parallel_more: " 等 {count} 項",
      preload_current_done: "已完成：{labels}",
      preload_current_now: "目前：{label}",
      preload_current_wait_stage: "最近完成：{labels}；等待下一階段…",
      preload_current_wait_core: "目前：等待核心模組啟動…",
      preload_current_background: "目前：背景",
      preload_current_wait_mount: "等待應用掛載完成…",
      preload_help_short: "載入較慢通常由網路波動或快取導致，請稍候。",
      preload_help_long:
        "若長時間無變化，可點擊「重試載入」或「重新整理頁面」；仍未恢復請點擊「回報問題」。",
      action_retry: "重試載入",
      action_refresh: "重新整理頁面",
      action_export_diag: "匯出診斷",
      action_feedback: "回報問題",
      unknown_resource: "未知資源",
      unknown_item: "未知",
      error_title_page_load: "頁面載入失敗",
      error_summary_unknown: "發生未知錯誤，請稍後再試。",
      error_details_title: "錯誤詳情",
      error_suggestions_title: "建議處理",
      error_title_resource: "頁面資源載入失敗",
      error_summary_script_chain_missing: "腳本載入清單缺失，應用暫時無法啟動。",
      error_summary_manifest_invalid: "啟動資源清單設定無效，應用暫時無法啟動。",
      error_detail_missing_chain: "缺失關鍵欄位：window.__APP_RESOURCE_MANIFEST.app.scriptChain",
      error_detail_manifest_chain_invalid: "無效欄位：window.__APP_RESOURCE_MANIFEST.app.scriptChain（需為非空陣列）",
      error_detail_confirm_chain: "請確認 ./js/app.resource-manifest.js 已成功部署且包含非空 scriptChain",
      error_summary_core_script: "核心腳本未完整載入，應用暫時無法啟動。",
      error_summary_core_resource: "核心資源未完整載入，應用暫時無法啟動。",
      error_summary_http_404: "偵測到資源路徑錯誤（404），請檢查部署目錄與訪問路徑。",
      error_summary_http_403: "偵測到資源存取被拒（403），請檢查存取策略或防護規則。",
      error_summary_http_429: "偵測到請求過於頻繁（429），請稍後再試。",
      error_summary_http_5xx: "偵測到伺服器異常（5xx），請稍後再試。",
      error_title_style: "頁面樣式載入失敗",
      error_summary_style: "關鍵樣式檔未完整載入，頁面無法正常展示。",
      error_detail_failed_style: "失敗樣式：{name}",
      error_detail_failed_resource: "失敗資源：{name}",
      error_detail_network_state: "網路狀態：{state}",
      error_network_online: "連線中",
      error_network_offline: "離線",
      error_detail_http_status: "HTTP 狀態：{status}{hint}",
      error_detail_failed_reason: "失敗原因：{reason}",
      error_hint_flaky:
        "可能原因：網路波動、快取損壞、CDN 同步延遲或攔截外掛阻止了腳本請求",
      error_reason_http: "資源請求返回了錯誤狀態",
      error_reason_error: "瀏覽器觸發了資源載入錯誤事件",
      error_reason_stalled: "資源長時間未進入可用狀態（可能連線懸掛或被攔截）",
      error_reason_stalled_with_status:
        "資源請求有回應，但樣式未進入就緒狀態（可能連線懸掛或被攔截）",
      http_404: "資源不存在或路徑錯誤",
      http_429: "請求過於頻繁（可能被限速）",
      http_403: "存取被拒絕（也可能觸發了頻率限制）",
      http_5xx: "伺服器異常",
      suggestion_retry: "點擊「重試載入」重新請求關鍵資源",
      suggestion_hard_refresh: "按 Ctrl + F5 強制重新整理後重試",
      suggestion_issue_screenshot: "若問題持續，請在 GitHub Issues 附上控制台錯誤截圖",
      list_sep: "、",
      preload_current_optional_failed: "可選失敗：{label}",
      optional_modal_title: "可選功能載入失敗",
      optional_modal_summary: "部分可選功能未能載入，頁面主體仍可繼續使用。",
      optional_modal_detail_features: "失敗功能：{features}",
      optional_modal_detail_resources: "失敗資源：{resources}",
      optional_modal_detail_non_blocking: "影響說明：僅影響可選功能，不影響核心功能。",
      optional_feature_pinyin: "拼音搜尋",
      optional_feature_i18n: "擴展語言支援",
      optional_feature_notice_content: "公告與說明內容",
      optional_feature_sponsor_data: "贊助名單展示",
      optional_feature_weapon_images: "武器圖片索引",
      optional_feature_version_meta: "版本中繼資料顯示",
      optional_feature_core_data: "核心遊戲資料",
      optional_feature_ui_scripts: "介面互動腳本",
      optional_feature_runtime: "頁面執行時依賴",
    },
    en: {
      preload_title: "少女祈祷中 / A Maiden at Prayer...",
      preload_note: "First load or hard refresh may be a bit slow",
      preload_status_prepare: "Preparing resources...",
      preload_status_failed: "Resource loading failed",
      preload_status_ready: "Resources ready, initializing page...",
      preload_status_background_prepare: "Resources ready, preparing background...",
      preload_status_staging: "Resources downloaded, starting next stage...",
      preload_status_parallel: "Loading resources in parallel...",
      preload_status_loading: "Loading resources...",
      preload_current_failed: "Failed: {label}",
      preload_current_parallel: "Parallel: {labels}{more}",
      preload_current_parallel_more: " and {count} more",
      preload_current_done: "Done: {labels}",
      preload_current_now: "Current: {label}",
      preload_current_wait_stage: "Recently done: {labels}; waiting for next stage...",
      preload_current_wait_core: "Current: waiting for core modules...",
      preload_current_background: "Current: background",
      preload_current_wait_mount: "Waiting for app mount...",
      preload_help_short: "Longer loading is usually caused by network or cache. Please wait.",
      preload_help_long:
        "If progress stalls for long, try Retry or Refresh. If it still fails, use Report Issue.",
      action_retry: "Retry",
      action_refresh: "Refresh",
      action_export_diag: "Export Diagnostics",
      action_feedback: "Report Issue",
      unknown_resource: "Unknown resource",
      unknown_item: "Unknown",
      error_title_page_load: "Page Load Failed",
      error_summary_unknown: "An unknown error occurred. Please try again later.",
      error_details_title: "Error Details",
      error_suggestions_title: "Suggested Actions",
      error_title_resource: "Resource Load Failed",
      error_summary_script_chain_missing: "Script chain is missing. The app cannot start right now.",
      error_summary_manifest_invalid: "Startup manifest is invalid. The app cannot start right now.",
      error_detail_missing_chain: "Missing key: window.__APP_RESOURCE_MANIFEST.app.scriptChain",
      error_detail_manifest_chain_invalid: "Invalid key: window.__APP_RESOURCE_MANIFEST.app.scriptChain (expected a non-empty array)",
      error_detail_confirm_chain: "Please verify ./js/app.resource-manifest.js is deployed and contains a non-empty scriptChain",
      error_summary_core_script: "Core scripts failed to load completely.",
      error_summary_core_resource: "Core resources failed to load completely.",
      error_summary_http_404: "Detected a 404 resource path error. Please verify deployment directory and URL path.",
      error_summary_http_403: "Detected a 403 access denial. Please check access policy or protection rules.",
      error_summary_http_429: "Detected too many requests (429). Please retry in a moment.",
      error_summary_http_5xx: "Detected a server-side error (5xx). Please retry later.",
      error_title_style: "Stylesheet Load Failed",
      error_summary_style: "Critical styles failed to load. The page cannot render correctly.",
      error_detail_failed_style: "Failed stylesheet: {name}",
      error_detail_failed_resource: "Failed resource: {name}",
      error_detail_network_state: "Network: {state}",
      error_network_online: "online",
      error_network_offline: "offline",
      error_detail_http_status: "HTTP status: {status}{hint}",
      error_detail_failed_reason: "Failure reason: {reason}",
      error_hint_flaky:
        "Possible causes: network fluctuation, broken cache, CDN propagation delay, or blocking extensions.",
      error_reason_http: "The request returned an error status",
      error_reason_error: "The browser fired a resource error event",
      error_reason_stalled:
        "The resource never became usable for too long (possible hanging connection or interception)",
      error_reason_stalled_with_status:
        "The request responded, but the stylesheet never became ready (possible hanging connection or interception)",
      http_404: "Resource not found or wrong path",
      http_429: "Too many requests (possibly rate limited)",
      http_403: "Access denied (can also indicate request rate limiting)",
      http_5xx: "Server error",
      suggestion_retry: "Click Retry to request critical resources again",
      suggestion_hard_refresh: "Press Ctrl + F5 for a hard refresh and retry",
      suggestion_issue_screenshot: "If the issue persists, attach console screenshots in GitHub Issues",
      list_sep: ", ",
      preload_current_optional_failed: "Optional failed: {label}",
      optional_modal_title: "Optional Feature Load Failed",
      optional_modal_summary: "Some optional features could not be loaded. Core page usage is still available.",
      optional_modal_detail_features: "Affected features: {features}",
      optional_modal_detail_resources: "Failed resources: {resources}",
      optional_modal_detail_non_blocking: "Impact: optional features only, core functionality remains available.",
      optional_feature_pinyin: "Pinyin search",
      optional_feature_i18n: "Extended language support",
      optional_feature_notice_content: "Announcement content",
      optional_feature_sponsor_data: "Sponsor list display",
      optional_feature_weapon_images: "Weapon image index",
      optional_feature_version_meta: "Version metadata display",
      optional_feature_core_data: "Core game data",
      optional_feature_ui_scripts: "UI interaction scripts",
      optional_feature_runtime: "Runtime dependency",
    },
    ja: {
      preload_title: "少女祈祷中 / 少女、祈りの最中…",
      preload_note: "初回起動や強制リロードは少し時間がかかる場合があります",
      preload_status_prepare: "リソースを準備しています…",
      preload_status_failed: "リソースの読み込みに失敗しました",
      preload_status_ready: "リソースの準備が完了しました。ページを初期化しています…",
      preload_status_background_prepare: "リソースの準備が完了しました。背景を準備しています…",
      preload_status_staging: "リソースの取得完了。次の段階を開始しています…",
      preload_status_parallel: "リソースを並列で読み込み中…",
      preload_status_loading: "リソースを読み込み中…",
      preload_current_failed: "失敗項目：{label}",
      preload_current_parallel: "並列：{labels}{more}",
      preload_current_parallel_more: " ほか {count} 件",
      preload_current_done: "完了：{labels}",
      preload_current_now: "現在：{label}",
      preload_current_wait_stage: "直近の完了：{labels}；次の段階を待機中…",
      preload_current_wait_core: "現在：コアモジュールの起動待ち…",
      preload_current_background: "現在：背景",
      preload_current_wait_mount: "アプリのマウント完了を待機中…",
      preload_help_short: "読み込みが長い場合、ネットワークやキャッシュが原因のことがあります。",
      preload_help_long:
        "長時間変化がない場合は「再試行」または「再読み込み」を試してください。改善しない場合は「問題を報告」。",
      action_retry: "再試行",
      action_refresh: "再読み込み",
      action_export_diag: "診断をエクスポート",
      action_feedback: "問題を報告",
      unknown_resource: "不明なリソース",
      unknown_item: "不明",
      error_title_page_load: "ページの読み込みに失敗しました",
      error_summary_unknown: "不明なエラーが発生しました。しばらくしてから再試行してください。",
      error_details_title: "エラー詳細",
      error_suggestions_title: "対処方法",
      error_title_resource: "リソースの読み込みに失敗しました",
      error_summary_script_chain_missing: "スクリプト読み込みマニフェストが見つからず、アプリを起動できません。",
      error_summary_manifest_invalid: "起動リソースマニフェストの設定が無効なため、アプリを起動できません。",
      error_detail_missing_chain: "必須キーがありません：window.__APP_RESOURCE_MANIFEST.app.scriptChain",
      error_detail_manifest_chain_invalid: "無効なキーです：window.__APP_RESOURCE_MANIFEST.app.scriptChain（空でない配列が必要です）",
      error_detail_confirm_chain: "./js/app.resource-manifest.js が正しく配置され、空でない scriptChain を含むか確認してください",
      error_summary_core_script: "コアスクリプトの読み込みが完了しませんでした。",
      error_summary_core_resource: "コアリソースの読み込みが完了しませんでした。",
      error_summary_http_404:
        "リソースのパスエラー（404）を検出しました。配置ディレクトリとURLパスを確認してください。",
      error_summary_http_403:
        "リソースへのアクセス拒否（403）を検出しました。アクセス方針や保護設定を確認してください。",
      error_summary_http_429: "リクエスト過多（429）を検出しました。しばらくして再試行してください。",
      error_summary_http_5xx: "サーバー側の異常（5xx）を検出しました。しばらくして再試行してください。",
      error_title_style: "スタイルシートの読み込みに失敗しました",
      error_summary_style: "重要なスタイルの読み込みに失敗し、正しく表示できません。",
      error_detail_failed_style: "失敗したスタイル：{name}",
      error_detail_failed_resource: "失敗したリソース：{name}",
      error_detail_network_state: "ネットワーク：{state}",
      error_network_online: "オンライン",
      error_network_offline: "オフライン",
      error_detail_http_status: "HTTP ステータス：{status}{hint}",
      error_detail_failed_reason: "失敗理由：{reason}",
      error_hint_flaky:
        "原因候補：ネットワーク変動、キャッシュ破損、CDN 反映遅延、拡張機能によるブロック",
      error_reason_http: "リクエストがエラーステータスを返しました",
      error_reason_error: "ブラウザでリソース読み込みエラーが発生しました",
      error_reason_stalled:
        "長時間リソースが利用可能状態になりませんでした（接続停滞またはブロックの可能性）",
      error_reason_stalled_with_status:
        "応答はあるものの、スタイルが利用可能状態になりませんでした（接続停滞またはブロックの可能性）",
      http_404: "リソースが見つからないか、パスが不正です",
      http_429: "リクエストが多すぎます（レート制限の可能性）",
      http_403: "アクセスが拒否されました（レート制限の可能性もあります）",
      http_5xx: "サーバーエラー",
      suggestion_retry: "「再試行」で重要リソースを再取得",
      suggestion_hard_refresh: "Ctrl + F5 で強制再読み込みして再試行",
      suggestion_issue_screenshot:
        "改善しない場合は GitHub Issues にコンソールのスクリーンショットを添付してください",
      list_sep: "、",
      preload_current_optional_failed: "任意機能の失敗：{label}",
      optional_modal_title: "任意機能の読み込みに失敗しました",
      optional_modal_summary: "一部の任意機能を読み込めませんでしたが、ページ本体は引き続き利用できます。",
      optional_modal_detail_features: "失敗した機能：{features}",
      optional_modal_detail_resources: "失敗したリソース：{resources}",
      optional_modal_detail_non_blocking: "影響：任意機能のみ。コア機能は利用可能です。",
      optional_feature_pinyin: "ピンイン検索",
      optional_feature_i18n: "追加言語サポート",
      optional_feature_notice_content: "お知らせ内容表示",
      optional_feature_sponsor_data: "スポンサー一覧表示",
      optional_feature_weapon_images: "武器画像インデックス",
      optional_feature_version_meta: "バージョンメタデータ表示",
      optional_feature_core_data: "コアゲームデータ",
      optional_feature_ui_scripts: "UI操作スクリプト",
      optional_feature_runtime: "ランタイム依存",
    },
  };

  var normalizeBootLocale = function (value) {
    return supportedBootLocales.indexOf(value) >= 0 ? value : fallbackBootLocale;
  };
  var detectBootLocale = function () {
    try {
      var stored = localStorage.getItem(langStorageKey);
      if (stored) {
        return normalizeBootLocale(String(stored));
      }
    } catch (error) {
      // ignore storage errors
    }
    var raw = String((navigator && navigator.language) || "").toLowerCase();
    if (raw.indexOf("zh") === 0) {
      if (
        raw.indexOf("tw") >= 0 ||
        raw.indexOf("hk") >= 0 ||
        raw.indexOf("mo") >= 0 ||
        raw.indexOf("hant") >= 0
      ) {
        return "zh-TW";
      }
      return "zh-CN";
    }
    if (raw.indexOf("ja") === 0) return "ja";
    return "en";
  };
  var bootLocale = detectBootLocale();
  try {
    if (root) {
      root.setAttribute("lang", bootLocale);
    }
  } catch (error) {
    // ignore
  }
  var interpolateBootText = function (text, params) {
    if (!params) return String(text || "");
    return String(text || "").replace(/\{(\w+)\}/g, function (match, name) {
      if (Object.prototype.hasOwnProperty.call(params, name)) {
        return String(params[name]);
      }
      return match;
    });
  };
  var bt = function (key, params) {
    var localeTable = bootI18n[bootLocale] || bootI18n[fallbackBootLocale] || {};
    var fallbackTable = bootI18n[fallbackBootLocale] || {};
    var raw = Object.prototype.hasOwnProperty.call(localeTable, key)
      ? localeTable[key]
      : Object.prototype.hasOwnProperty.call(fallbackTable, key)
      ? fallbackTable[key]
      : key;
    return interpolateBootText(raw, params);
  };
  window.__bootI18n = {
    locale: bootLocale,
    t: bt,
  };
  var runBootStorageProbe = function () {
    var probeKey = "planner-storage-bootstrap-probe";
    var result = {
      ok: true,
      key: probeKey,
      errorName: "",
      errorMessage: "",
      occurredAt: new Date().toISOString(),
    };
    try {
      var marker = "__ok__" + Date.now();
      localStorage.setItem(probeKey, marker);
      var readBack = localStorage.getItem(probeKey);
      if (readBack !== marker) {
        throw new Error("localStorage probe mismatch");
      }
      localStorage.removeItem(probeKey);
    } catch (error) {
      result.ok = false;
      result.errorName = String((error && error.name) || "Error");
      result.errorMessage = String((error && error.message) || "bootstrap storage probe failed");
      try {
        localStorage.removeItem(probeKey);
      } catch (cleanupError) {
        // ignore probe cleanup errors
      }
    }
    window.__bootStorageProbe = result;
  };
  runBootStorageProbe();
  var resolveBootCacheBustToken = function () {
    try {
      var url = new URL(window.location.href);
      return String(url.searchParams.get("__clear_ts") || "").trim();
    } catch (error) {
      return "";
    }
  };
  var baseBootCacheBustToken = resolveBootCacheBustToken();
  var activeBootCacheBustToken = baseBootCacheBustToken;
  var setActiveBootCacheBustToken = function (token) {
    activeBootCacheBustToken = String(token || "").trim();
    window.__bootCacheBustToken = activeBootCacheBustToken;
    return activeBootCacheBustToken;
  };
  setActiveBootCacheBustToken(baseBootCacheBustToken);
  var applyBootCacheBust = function (src) {
    var input = String(src || "");
    if (!input || !activeBootCacheBustToken) return input;
    try {
      var url = new URL(input, window.location.href);
      url.searchParams.set("__cb", activeBootCacheBustToken);
      return url.toString();
    } catch (error) {
      return input;
    }
  };
  var normalizeResourceKey = function (src) {
    try {
      return new URL(src, window.location.href).href;
    } catch (error) {
      return String(src || "");
    }
  };

  var buildProbeUrl = function (src) {
    var normalized = normalizeResourceKey(src);
    if (!normalized) return "";
    var separator = normalized.indexOf("?") === -1 ? "?" : "&";
    return normalized + separator + "__boot_probe_ts=" + Date.now();
  };

  var probeResourceStatus = function (src) {
    if (typeof fetch !== "function") return Promise.resolve(null);
    var probeUrl = buildProbeUrl(src);
    if (!probeUrl) return Promise.resolve(null);
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timeoutId = null;
    if (controller) {
      timeoutId = setTimeout(function () {
        try {
          controller.abort();
        } catch (error) {
          // ignore abort errors
        }
      }, 2200);
    }
    var init = {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    };
    if (controller) {
      init.signal = controller.signal;
    }
    return fetch(probeUrl, init)
      .then(
        function (response) {
          return {
            status: Number(response && response.status) || 0,
          };
        },
        function () {
          return null;
        }
      )
      .then(function (result) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        return result;
      });
  };

  var explainHttpStatus = function (status) {
    if (!status) return "";
    if (status === 404) return bt("http_404");
    if (status === 429) return bt("http_429");
    if (status === 403) return bt("http_403");
    if (status >= 500 && status <= 599) return bt("http_5xx");
    return "";
  };
  var isFatalHttpStatus = function (status) {
    if (!status) return false;
    return status === 404 || status === 403 || status === 429 || (status >= 500 && status <= 599);
  };
  var resolveStatusSummaryKey = function (status) {
    if (!status) return "";
    if (status === 404) return "error_summary_http_404";
    if (status === 403) return "error_summary_http_403";
    if (status === 429) return "error_summary_http_429";
    if (status >= 500 && status <= 599) return "error_summary_http_5xx";
    return "";
  };
  var resolveResourceSummary = function (status, fallbackKey) {
    var key = resolveStatusSummaryKey(status);
    if (key) return bt(key);
    return bt(fallbackKey);
  };
  var resolveManifestAppScriptChain = function () {
    var manifest = window.__APP_RESOURCE_MANIFEST && typeof window.__APP_RESOURCE_MANIFEST === "object" ? window.__APP_RESOURCE_MANIFEST : null;
    var manifestApp = manifest && manifest.app && typeof manifest.app === "object" ? manifest.app : null;
    var scriptChain = manifestApp ? manifestApp.scriptChain : undefined;
    if (typeof scriptChain === "undefined") return { status: "missing", scripts: [] };
    if (!Array.isArray(scriptChain) || !scriptChain.length) return { status: "invalid", scripts: [] };
    return { status: "ok", scripts: scriptChain.slice() };
  };
  var publishAppScriptChain = function (scripts) {
    var normalized = Array.isArray(scripts) && scripts.length ? scripts.slice() : undefined;
    publishBootProtocolValue("appScriptChain", "__APP_SCRIPT_CHAIN", normalized);
    return Array.isArray(normalized) ? normalized.slice() : [];
  };
  var clearPublishedAppScriptChain = function () { publishBootProtocolValue("appScriptChain", "__APP_SCRIPT_CHAIN", undefined); return []; };
  var createManifestScriptChainError = function (reason) {
    var error = new Error("App script-chain manifest is unavailable.");
    error.resource = { kind: "manifest", src: "./js/app.resource-manifest.js", reason: String(reason || "missing") === "invalid" ? "invalid-script-chain" : "missing-script-chain", probe: null };
    return error;
  };

  var createLoadError = function (kind, src, reason, probe) {
    var message;
    if (kind === "style") {
      if (reason === "stalled") {
        message = "Failed to load stylesheet (stalled): " + src;
      } else if (reason === "http") {
        message = "Failed to load stylesheet (http): " + src;
      } else if (reason === "error") {
        message = "Failed to load stylesheet (error): " + src;
      } else {
        message = "Failed to load stylesheet: " + src;
      }
    } else {
      message = "Failed to load: " + src;
    }
    var error = new Error(message);
    error.resource = {
      kind: kind || "resource",
      src: String(src || ""),
      reason: String(reason || ""),
      probe: probe || null,
    };
    return error;
  };
  var describeStyleFailureReason = function (reason, status) {
    if (reason === "http") return bt("error_reason_http");
    if (reason === "error") return bt("error_reason_error");
    if (reason === "stalled") {
      if (status && !isFatalHttpStatus(status)) {
        return bt("error_reason_stalled_with_status");
      }
      return bt("error_reason_stalled");
    }
    return "";
  };

  var applyPreloadTheme = function () {
    var themePreference = "auto";
    try {
      var savedTheme = localStorage.getItem(themeStorageKey);
      if (savedTheme === "auto" || savedTheme === "light" || savedTheme === "dark") {
        themePreference = savedTheme;
      }
    } catch (error) {
      // ignore localStorage errors
    }
    var resolvedTheme =
      themePreference === "auto"
        ? window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : themePreference;
    root.setAttribute("data-theme", resolvedTheme);
    root.style.colorScheme = resolvedTheme;
    if (themePreference === "auto" && window.matchMedia) {
      var preloadMediaTheme = window.matchMedia("(prefers-color-scheme: light)");
      var onPreloadThemeChange = function (event) {
        if (!root.classList.contains("preload")) return;
        root.setAttribute("data-theme", event.matches ? "light" : "dark");
        root.style.colorScheme = event.matches ? "light" : "dark";
      };
      if (typeof preloadMediaTheme.addEventListener === "function") {
        preloadMediaTheme.addEventListener("change", onPreloadThemeChange);
      } else if (typeof preloadMediaTheme.addListener === "function") {
        preloadMediaTheme.addListener(onPreloadThemeChange);
      }
    }
  };

  var syncPreloadStaticText = function (overlay) {
    if (!overlay) return;
    var title = overlay.querySelector(".preload-title");
    var note = overlay.querySelector(".preload-note") || overlay.querySelector(".preload-sub");
    var status = overlay.querySelector(".preload-status");
    if (title) title.textContent = bt("preload_title");
    if (note) note.textContent = bt("preload_note");
    if (status) status.textContent = bt("preload_status_prepare");
  };

  var ensureShell = function () {
    if (!document.body) return false;
    var preload = document.getElementById("app-preload");
    if (!preload) {
      preload = document.createElement("div");
      preload.id = "app-preload";
      var card = document.createElement("div");
      card.className = "preload-card";

      var title = document.createElement("div");
      title.className = "preload-title";
      title.textContent = bt("preload_title");
      card.appendChild(title);

      var note = document.createElement("div");
      note.className = "preload-sub preload-note";
      note.textContent = bt("preload_note");
      card.appendChild(note);

      var status = document.createElement("div");
      status.className = "preload-status";
      status.setAttribute("aria-live", "polite");
      status.textContent = bt("preload_status_prepare");
      card.appendChild(status);

      var current = document.createElement("div");
      current.className = "preload-current";
      current.setAttribute("aria-live", "polite");
      card.appendChild(current);

      var progress = document.createElement("div");
      progress.className = "preload-progress";
      progress.setAttribute("role", "progressbar");
      progress.setAttribute("aria-valuemin", "0");
      progress.setAttribute("aria-valuemax", "100");
      var progressFill = document.createElement("span");
      progressFill.className = "preload-progress-fill";
      progressFill.setAttribute("aria-valuenow", "0");
      progress.appendChild(progressFill);
      card.appendChild(progress);

      var count = document.createElement("div");
      count.className = "preload-count";
      count.setAttribute("aria-live", "polite");
      count.textContent = "0/0";
      card.appendChild(count);

      preload.appendChild(card);
      document.body.insertBefore(preload, document.body.firstChild || null);
    } else {
      syncPreloadStaticText(preload);
    }
    var app = document.getElementById("app");
    if (!app) {
      app = document.createElement("div");
      app.id = "app";
      app.className = "app-shell";
      app.setAttribute("v-cloak", "");
      app.setAttribute("v-show", "appReady");
      app.setAttribute("data-fingerprint", "cmty-ep-2026-02-07");
      document.body.appendChild(app);
    }
    return true;
  };

  var getPreloadRefs = function () {
    var overlay = document.getElementById("app-preload");
    return {
      overlay: overlay,
      status: overlay ? overlay.querySelector(".preload-status") : null,
      current: overlay ? overlay.querySelector(".preload-current") : null,
      count: overlay ? overlay.querySelector(".preload-count") : null,
      progressFill: overlay ? overlay.querySelector(".preload-progress-fill") : null,
      help: overlay ? overlay.querySelector(".preload-help") : null,
      actions: overlay ? overlay.querySelector(".preload-actions") : null,
    };
  };

  var ensureErrorRenderer = function () {
    var api = window.__BOOTSTRAP_ERROR__;
    if (!api || typeof api.ensureErrorRenderer !== "function") return;
    api.ensureErrorRenderer({
      root: root,
      bt: bt,
    });
  };

  var ensureLoadErrorReporter = function () {
    var api = window.__BOOTSTRAP_ERROR__;
    if (!api || typeof api.ensureLoadErrorReporter !== "function") return;
    api.ensureLoadErrorReporter({
      bt: bt,
      resolveResourceSummary: resolveResourceSummary,
      explainHttpStatus: explainHttpStatus,
    });
  };

  var runBootstrap = function (options) {
    options = options || {};
    var runBootCacheBustToken = setActiveBootCacheBustToken(options.fromRetry ? "retry-" + Date.now() : baseBootCacheBustToken);
    if (options.fromRetry && document.body) {
      document.body.textContent = "";
    }
    runSerial += 1;
    var runId = runSerial;
    window.__bootstrapEntryRunning = true;
    publishBootProtocolValue("buildBootDiagnosticBundle", "__buildBootDiagnosticBundle", buildBootDiagnosticBundle);
    publishBootProtocolValue("exportBootDiagnosticBundle", "__exportBootDiagnosticBundle", exportBootDiagnosticBundle);
    var initialManifestScriptChainState = resolveManifestAppScriptChain();
    bootDiagnostics.recordEvent("bootstrap.run", {
      runId: runId,
      fromRetry: Boolean(options.fromRetry),
      cacheBustToken: runBootCacheBustToken,
      initialManifestScriptChainStatus: initialManifestScriptChainState.status,
    });
    if (initialManifestScriptChainState.status === "ok") publishAppScriptChain(initialManifestScriptChainState.scripts);
    else clearPublishedAppScriptChain();
    var appScriptChainFromProtocol = resolveBootProtocolValue("appScriptChain", "__APP_SCRIPT_CHAIN");
    var declaredAppScriptChain =
      Array.isArray(appScriptChainFromProtocol) && appScriptChainFromProtocol.length
        ? appScriptChainFromProtocol.slice()
        : [];
    root.classList.add("preload");
    applyPreloadTheme();
    ensureErrorRenderer();
    ensureLoadErrorReporter();
    var resourcesApi = window.__BOOTSTRAP_RESOURCES__;
    if (!resourcesApi || typeof resourcesApi.resolveBootResourceConfig !== "function") {
      throw new Error("Bootstrap resource manifest resolver is unavailable.");
    }
    var activeBootResourceConfig = resourcesApi.resolveBootResourceConfig({ warnOnce: warnOnce });
    var cssFiles = activeBootResourceConfig.cssFiles;
    var startupDataScripts = activeBootResourceConfig.startupDataScripts;
    var runtimePreludeScripts = activeBootResourceConfig.runtimePreludeScripts;
    var appEntryScript = activeBootResourceConfig.appEntryScript;
    var startupScripts = activeBootResourceConfig.startupScripts;
    var optionalScriptConfigs = activeBootResourceConfig.optionalScriptConfigs;
    var resourceRuntime = null;

    var finish = function () {
      if (resourceRuntime && typeof resourceRuntime.cleanup === "function") {
        resourceRuntime.cleanup();
      }
      root.classList.remove("preload");
      var overlay = document.getElementById("app-preload");
      if (overlay) {
        overlay.classList.add("preload-hide");
        overlay.style.pointerEvents = "none";
        setTimeout(function () {
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 240);
      }
    };
    window.__finishPreload = finish;

    if (!ensureShell() && document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        function () {
          ensureShell();
        },
        { once: true }
      );
    }

    var ensurePreloadAssist = function () {
      var refs = getPreloadRefs();
      if (!refs.overlay) return;
      var card = refs.overlay.querySelector(".preload-card");
      if (!card) return;
      if (!refs.help) {
        var help = document.createElement("div");
        help.className = "preload-sub preload-help";
        help.style.cssText = "margin-top:8px;line-height:1.5;";
        card.appendChild(help);
      }
      if (!refs.actions) {
        var actionRow = document.createElement("div");
        actionRow.className = "preload-actions";
        actionRow.style.cssText =
          "margin-top:10px;display:none;gap:8px;flex-wrap:wrap;justify-content:center;";

        var retryButton = document.createElement("button");
        retryButton.type = "button";
        retryButton.textContent = bt("action_retry");
        retryButton.style.cssText =
          "cursor:pointer;border:1px solid rgba(77,214,201,0.45);border-radius:999px;padding:4px 10px;background:rgba(12,18,28,0.9);color:#c9fff7;font-size:12px;";
        retryButton.addEventListener("click", function () {
          if (typeof window.__startBootstrapEntry === "function") {
            window.__startBootstrapEntry({ fromRetry: true });
            return;
          }
          window.location.reload();
        });
        actionRow.appendChild(retryButton);

        var refreshButton = document.createElement("button");
        refreshButton.type = "button";
        refreshButton.textContent = bt("action_refresh");
        refreshButton.style.cssText =
          "cursor:pointer;border:1px solid rgba(255,255,255,0.35);border-radius:999px;padding:4px 10px;background:rgba(12,18,28,0.9);color:#fff;font-size:12px;";
        refreshButton.addEventListener("click", function () {
          window.location.reload();
        });
        actionRow.appendChild(refreshButton);

        var feedbackLink = document.createElement("a");
        feedbackLink.href = "https://github.com/cmyyx/endfield-essence-planner/issues";
        feedbackLink.target = "_blank";
        feedbackLink.rel = "noreferrer";
        feedbackLink.textContent = bt("action_feedback");
        feedbackLink.style.cssText =
          "display:inline-flex;align-items:center;text-decoration:none;border:1px solid rgba(77,214,201,0.4);border-radius:999px;padding:4px 10px;background:rgba(12,18,28,0.85);color:#c9fff7;font-size:12px;";
        actionRow.appendChild(feedbackLink);

        card.appendChild(actionRow);
      }
    };
    ensurePreloadAssist();

    var optionalApi = window.__BOOTSTRAP_OPTIONAL__;
    var resourcesApiRuntime = window.__BOOTSTRAP_RESOURCES__;
    if (
      !optionalApi ||
      typeof optionalApi.createOptionalFailureReporter !== "function" ||
      typeof optionalApi.createOptionalScriptLoader !== "function" ||
      !resourcesApiRuntime ||
      typeof resourcesApiRuntime.createResourceRuntime !== "function"
    ) {
      throw new Error("Bootstrap helper module APIs are unavailable.");
    }

    var optionalReporter = optionalApi.createOptionalFailureReporter({ bt: bt });
    var reportOptionalResourceFailure = optionalReporter.reportOptionalResourceFailure;
    resourceRuntime = resourcesApiRuntime.createResourceRuntime({
      bt: bt,
      cssFiles: cssFiles,
      startupScripts: startupScripts,
      declaredAppScriptChain: declaredAppScriptChain,
      optionalScriptConfigs: optionalScriptConfigs,
      runId: runId,
      getRunSerial: function () {
        return runSerial;
      },
      ensurePreloadAssist: ensurePreloadAssist,
      getPreloadRefs: getPreloadRefs,
      normalizeResourceKey: normalizeResourceKey,
      applyBootCacheBust: applyBootCacheBust,
      probeResourceStatus: probeResourceStatus,
      isFatalHttpStatus: isFatalHttpStatus,
      createLoadError: createLoadError,
      reportOptionalResourceFailure: reportOptionalResourceFailure,
      bootCacheBustToken: runBootCacheBustToken,
    });
    bootDiagnostics.setResourceStateReader(function () {
      return Array.from(resourceRuntime.resourceState.values()).map(function (entry) {
        return {
          key: String((entry && entry.key) || ""),
          src: String((entry && entry.src) || ""),
          kind: String((entry && entry.kind) || ""),
          label: String((entry && entry.label) || ""),
          status: String((entry && entry.status) || ""),
          statusAt: Number((entry && entry.statusAt) || 0),
          optional: Boolean(entry && entry.optional),
          featureKey: String((entry && entry.featureKey) || ""),
        };
      });
    });
    resourceRuntime.initialize();
    bootDiagnostics.recordEvent("bootstrap.resource-runtime-ready", {
      runId: runId,
      trackedResources: resourceRuntime.resourceState.size,
    });

    var ensureResource = resourceRuntime.ensureResource;
    var renderProgress = resourceRuntime.renderProgress;
    var loadScript = resourceRuntime.loadScript;
    var loadStyle = resourceRuntime.loadStyle;
    var setStallTimeoutTrigger = resourceRuntime.setStallTimeoutTrigger;
    var loadOptionalScriptWithRetry = optionalApi.createOptionalScriptLoader({
      loadScript: loadScript,
      optionalScriptConfigs: optionalScriptConfigs,
      resourceState: resourceRuntime.resourceState,
      normalizeResourceKey: normalizeResourceKey,
      warnOnce: warnOnce,
      getRunSerial: function () {
        return runSerial;
      },
      reportOptionalResourceFailure: reportOptionalResourceFailure,
    });

    var cssPromise = Promise.all(cssFiles.map(loadStyle));
    var dataPromise = Promise.all(
      startupDataScripts.map(function (src) {
        return loadScript(src);
      })
    );
    var runtimePreludePromise = dataPromise.then(function () {
      return Promise.all(
        runtimePreludeScripts.map(function (src) {
          return loadScript(src);
        })
      );
    });
    var optionalScripts = Object.keys(optionalScriptConfigs);
    var optionalScriptPromise = runtimePreludePromise.then(function () {
      return Promise.all(
        optionalScripts.map(function (src) {
          return loadOptionalScriptWithRetry(src, optionalScriptConfigs[src], runId);
        })
      );
    });
    if (typeof window.__loadAnalyticsNow === "function") {
      try {
        // Intentionally eager: capture real startup timing under first-screen contention.
        window.__loadAnalyticsNow();
      } catch (error) {
        reportNonFatalDiagnostic({
          operation: "bootstrap.analytics-preload",
          kind: "analytics-load-failed",
          resource: "window.__loadAnalyticsNow",
          errorName: String((error && error.name) || "Error"),
          errorMessage: String((error && error.message) || "analytics preload failed"),
          optionalSignature: "bootstrap.analytics-preload",
        });
      }
    }
    var shellReadyPromise = new Promise(function (resolve) {
      var guard = 0;
      var check = function () {
        if (ensureShell()) {
          resolve();
          return;
        }
        guard += 1;
        if (guard >= 200) {
          resolve();
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
    var stallTimeoutTriggered = false;
    var triggerStallTimeout = null;
    var stallTimeoutReject = null;
    var stallTimeoutPromise = new Promise(function (resolve, reject) {
      stallTimeoutReject = reject;
    });
    triggerStallTimeout = function () {
      if (stallTimeoutTriggered || typeof stallTimeoutReject !== "function") return;
      stallTimeoutTriggered = true;
      var stallError = new Error("Bootstrap progress stalled");
      stallError.resource = {
        kind: "startup-stall",
        src: "bootstrap",
        reason: "stalled",
        probe: null,
      };
      stallTimeoutReject(stallError);
    };
    if (typeof setStallTimeoutTrigger === "function") {
      setStallTimeoutTrigger(triggerStallTimeout);
    }
    var bootLoadPromise = Promise.all([
      shellReadyPromise,
      cssPromise,
      runtimePreludePromise,
    ])
      .then(function () {
        var manifestScriptChainState = resolveManifestAppScriptChain();
        if (manifestScriptChainState.status !== "ok") {
          bootDiagnostics.recordEvent("bootstrap.manifest-script-chain-invalid", {
            runId: runId,
            status: manifestScriptChainState.status,
          });
          clearPublishedAppScriptChain();
          throw createManifestScriptChainError(manifestScriptChainState.status);
        }
        declaredAppScriptChain = publishAppScriptChain(manifestScriptChainState.scripts);
        declaredAppScriptChain.forEach(function (src) { ensureResource(src, "script"); });
        renderProgress();
        optionalScriptPromise.catch(function (error) {
          reportNonFatalDiagnostic({
            operation: "bootstrap.optional-preload",
            kind: "optional-preload-failed",
            resource: "bootstrap.optional",
            errorName: String((error && error.name) || "Error"),
            errorMessage: String((error && error.message) || "optional preload failed"),
            optionalSignature: "bootstrap.optional-preload",
          });
        });
        return loadScript(appEntryScript);
      });
    Promise.race([bootLoadPromise, stallTimeoutPromise])
      .catch(function (error) {
        if (runId !== runSerial) return;
        bootDiagnostics.recordEvent("bootstrap.failure", {
          runId: runId,
          error: error,
          resource: error && error.resource ? error.resource : null,
        });
        finish();
        var errorApi = window.__BOOTSTRAP_ERROR__;
        if (errorApi && typeof errorApi.handleBootFailure === "function") {
          errorApi.handleBootFailure({
            error: error,
            bt: bt,
            resolveResourceSummary: resolveResourceSummary,
            explainHttpStatus: explainHttpStatus,
            describeStyleFailureReason: describeStyleFailureReason,
          });
          return;
        }
        throw error;
      })
      .finally(function () {
        stallTimeoutTriggered = true;
        if (runId === runSerial) {
          window.__bootstrapEntryRunning = false;
        }
      });
  };

  var startBootstrap = function (options) {
    options = options || {};
    bootDiagnostics.recordEvent("bootstrap.helper-modules-requested", {
      fromRetry: Boolean(options.fromRetry),
      modules: bootstrapModuleScripts.slice(),
    });
    ensureBootstrapModulesReady()
      .then(function () {
        bootDiagnostics.recordEvent("bootstrap.helper-modules-ready", {
          fromRetry: Boolean(options.fromRetry),
          modules: bootstrapModuleScripts.slice(),
        });
        runBootstrap(options);
      })
      .catch(function (error) {
        var message = String((error && error.message) || "Failed to load bootstrap helper modules.");
        bootDiagnostics.recordEvent("bootstrap.helper-modules-failed", {
          fromRetry: Boolean(options.fromRetry),
          modules: bootstrapModuleScripts.slice(),
          error: error,
        });
        warnOnce("bootstrap-module-load-failed", "[bootstrap] " + message);
        reportNonFatalDiagnostic({
          operation: "bootstrap.load-helper-modules",
          kind: "helper-module-load-failed",
          resource: "bootstrap-module-scripts",
          errorName: String((error && error.name) || "Error"),
          errorMessage: message,
          optionalSignature: "bootstrap.load-helper-modules",
        });
        var renderBootError = resolveBootProtocolValue("renderBootError");
        if (typeof renderBootError === "function") {
          renderBootError({
            title: bt("error_title_resource"),
            summary: bt("error_summary_core_resource"),
            details: [message],
            suggestions: [bt("suggestion_retry"), bt("suggestion_hard_refresh")],
          });
          return;
        }
        var fallbackContainerId = "bootstrap-minimal-error";
        var fallbackRoot =
          typeof document !== "undefined" ? document.getElementById(fallbackContainerId) : null;
        if (!fallbackRoot && typeof document !== "undefined" && document.body) {
          fallbackRoot = document.createElement("div");
          fallbackRoot.id = fallbackContainerId;
          fallbackRoot.style.cssText =
            "position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,102,102,0.55);background:rgba(18,10,14,0.94);color:#ffd4d4;box-shadow:0 8px 24px rgba(0,0,0,0.35);font:13px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;";
          document.body.appendChild(fallbackRoot);
        }
        if (fallbackRoot) {
          fallbackRoot.innerHTML = "";
          var titleNode = document.createElement("div");
          titleNode.textContent = bt("error_title_resource");
          titleNode.style.cssText = "font-weight:700;margin-bottom:4px;";
          var messageNode = document.createElement("div");
          messageNode.textContent = message;
          fallbackRoot.appendChild(titleNode);
          fallbackRoot.appendChild(messageNode);
          var exportButton = document.createElement("button");
          exportButton.type = "button";
          exportButton.textContent = bt("action_export_diag");
          exportButton.style.cssText =
            "margin-top:10px;cursor:pointer;border:1px solid rgba(255,255,255,0.4);border-radius:999px;padding:4px 10px;background:rgba(12,18,28,0.9);color:#fff;font-size:12px;";
          exportButton.addEventListener("click", function () {
            exportBootDiagnosticBundle({
              title: bt("error_title_resource"),
              summary: bt("error_summary_core_resource"),
              details: [message],
              suggestions: [bt("suggestion_retry"), bt("suggestion_hard_refresh")],
            });
          });
          fallbackRoot.appendChild(exportButton);
        }
        if (typeof console !== "undefined" && typeof console.error === "function") {
          console.error(error);
        }
      });
  };

  publishBootProtocolValue("startBootstrapEntry", "__startBootstrapEntry", startBootstrap);
  window.__startBootstrapEntry = startBootstrap;
  startBootstrap({ fromRetry: false });
})();
