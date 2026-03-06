(function (globalObject) {
  var defaultStorageKey = "planner-nonfatal-diagnostics:v1";
  var defaultEnabled = true;
  var defaultSampleRate = 1;
  var defaultHistoryLimit = 120;
  var defaultDedupWindowMs = 10000;

  var safeText = function (value) {
    return String(value == null ? "" : value).trim();
  };

  var clampSampleRate = function (value, fallback) {
    var numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return Number.isFinite(fallback) ? fallback : defaultSampleRate;
    }
    if (numeric < 0) return 0;
    if (numeric > 1) return 1;
    return numeric;
  };

  var clampPositiveInt = function (value, fallback) {
    var numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return Number.isFinite(fallback) && fallback > 0 ? Math.floor(fallback) : 1;
    }
    return Math.floor(numeric);
  };

  var normalizeTimestamp = function (value) {
    var text = safeText(value);
    if (text) {
      var parsed = Date.parse(text);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed).toISOString();
      }
    }
    return new Date().toISOString();
  };

  var buildEventSignature = function (event) {
    var fromPayload = safeText(event && event.signature);
    if (fromPayload) return fromPayload;
    return [
      safeText(event && event.module),
      safeText(event && event.operation),
      safeText(event && event.kind),
      safeText(event && event.resource),
      safeText(event && event.optionalSignature),
      safeText(event && event.errorName),
      safeText(event && event.errorMessage),
    ]
      .filter(Boolean)
      .join("|");
  };

  var normalizeDiagnosticEvent = function (raw) {
    var source = raw && typeof raw === "object" ? raw : {};
    var normalized = {
      module: safeText(source.module) || "unknown.module",
      operation: safeText(source.operation) || "unknown.operation",
      kind: safeText(source.kind) || "unknown.kind",
      resource: safeText(source.resource) || "unknown.resource",
      timestamp: normalizeTimestamp(source.timestamp || source.occurredAt),
      source: safeText(source.source) || "",
      errorName: safeText(source.errorName || source.name) || "",
      errorMessage: safeText(source.errorMessage || source.message) || "",
      note: safeText(source.note) || "",
      optionalSignature: safeText(source.optionalSignature) || "",
    };
    normalized.signature = buildEventSignature(source) || buildEventSignature(normalized);
    return normalized;
  };

  var readStoredHistory = function (storageKey, historyLimit) {
    if (typeof localStorage === "undefined") return [];
    try {
      var raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(function (entry) {
          return entry && typeof entry === "object";
        })
        .slice(0, historyLimit);
    } catch (error) {
      return [];
    }
  };

  var writeStoredHistory = function (storageKey, history) {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (error) {
      // local-only best effort; write failures must stay non-fatal
    }
  };

  var createLocalHistorySink = function (options) {
    var normalizedOptions = options && typeof options === "object" ? options : {};
    var storageKey = safeText(normalizedOptions.storageKey) || defaultStorageKey;
    var historyLimit = clampPositiveInt(normalizedOptions.historyLimit, defaultHistoryLimit);
    var history = readStoredHistory(storageKey, historyLimit);

    var push = function (entry) {
      var normalized = normalizeDiagnosticEvent(entry);
      history = [normalized].concat(history).slice(0, historyLimit);
      writeStoredHistory(storageKey, history);
      return normalized;
    };

    var read = function () {
      return history.slice();
    };

    var clear = function () {
      history = [];
      if (typeof localStorage === "undefined") return;
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        // local-only best effort
      }
    };

    return {
      push: push,
      read: read,
      clear: clear,
      storageKey: storageKey,
      historyLimit: historyLimit,
    };
  };

  var createDiagnosticsReporter = function (options) {
    var normalizedOptions = options && typeof options === "object" ? options : {};
    var enabled =
      typeof normalizedOptions.enabled === "boolean" ? normalizedOptions.enabled : defaultEnabled;
    var sampleRate = clampSampleRate(normalizedOptions.sampleRate, defaultSampleRate);
    var dedupWindowMs = clampPositiveInt(normalizedOptions.dedupWindowMs, defaultDedupWindowMs);
    var random =
      typeof normalizedOptions.random === "function" ? normalizedOptions.random : Math.random;
    var sink = typeof normalizedOptions.sink === "function" ? normalizedOptions.sink : null;
    var historySink =
      normalizedOptions.historySink && typeof normalizedOptions.historySink.push === "function"
        ? normalizedOptions.historySink
        : createLocalHistorySink(normalizedOptions);
    var dedupState = new Map();

    var shouldSample = function (effectiveSampleRate) {
      if (effectiveSampleRate >= 1) return true;
      if (effectiveSampleRate <= 0) return false;
      var sampleValue = Number(random());
      if (!Number.isFinite(sampleValue)) {
        sampleValue = Math.random();
      }
      return sampleValue <= effectiveSampleRate;
    };

    var report = function (raw, reportOptions) {
      var optionsObject = reportOptions && typeof reportOptions === "object" ? reportOptions : {};
      var event = normalizeDiagnosticEvent(raw);
      var force = Boolean(optionsObject.force);
      var effectiveEnabled = force ? true : enabled;
      if (!effectiveEnabled) {
        return { recorded: false, reason: "disabled", event: event };
      }
      var effectiveSampleRate = clampSampleRate(optionsObject.sampleRate, sampleRate);
      if (!force && !shouldSample(effectiveSampleRate)) {
        return { recorded: false, reason: "sampled-out", event: event };
      }
      var now = Date.now();
      var lastSeenAt = dedupState.get(event.signature) || 0;
      if (!force && dedupWindowMs > 0 && now - lastSeenAt <= dedupWindowMs) {
        return { recorded: false, reason: "deduped", event: event };
      }
      dedupState.set(event.signature, now);

      if (historySink && typeof historySink.push === "function") {
        historySink.push(event);
      }
      if (sink) {
        sink(event);
      }
      return { recorded: true, reason: "recorded", event: event };
    };

    var configure = function (nextOptions) {
      var source = nextOptions && typeof nextOptions === "object" ? nextOptions : {};
      if (typeof source.enabled === "boolean") {
        enabled = source.enabled;
      }
      if (typeof source.sampleRate !== "undefined") {
        sampleRate = clampSampleRate(source.sampleRate, sampleRate);
      }
      if (typeof source.dedupWindowMs !== "undefined") {
        dedupWindowMs = clampPositiveInt(source.dedupWindowMs, dedupWindowMs);
      }
      return getConfig();
    };

    var getConfig = function () {
      return {
        enabled: enabled,
        sampleRate: sampleRate,
        dedupWindowMs: dedupWindowMs,
        storageKey: historySink && historySink.storageKey ? historySink.storageKey : defaultStorageKey,
        historyLimit:
          historySink && Number.isFinite(historySink.historyLimit)
            ? historySink.historyLimit
            : defaultHistoryLimit,
      };
    };

    var readHistory = function () {
      if (!historySink || typeof historySink.read !== "function") return [];
      return historySink.read();
    };

    var clearHistory = function () {
      if (!historySink || typeof historySink.clear !== "function") return;
      historySink.clear();
      dedupState.clear();
    };

    return {
      report: report,
      configure: configure,
      getConfig: getConfig,
      readHistory: readHistory,
      clearHistory: clearHistory,
    };
  };

  var singletonReporter = null;

  var readGlobalDiagnosticsConfig = function () {
    var config =
      globalObject && globalObject.__APP_DIAGNOSTICS_CONFIG__ && typeof globalObject.__APP_DIAGNOSTICS_CONFIG__ === "object"
        ? globalObject.__APP_DIAGNOSTICS_CONFIG__
        : {};
    return {
      enabled: typeof config.enabled === "boolean" ? config.enabled : defaultEnabled,
      sampleRate: clampSampleRate(config.sampleRate, defaultSampleRate),
      dedupWindowMs: clampPositiveInt(config.dedupWindowMs, defaultDedupWindowMs),
      historyLimit: clampPositiveInt(config.historyLimit, defaultHistoryLimit),
      storageKey: safeText(config.storageKey) || defaultStorageKey,
    };
  };

  var ensureSingletonReporter = function () {
    if (singletonReporter) return singletonReporter;
    var config = readGlobalDiagnosticsConfig();
    singletonReporter = createDiagnosticsReporter(config);
    return singletonReporter;
  };

  var reportNonFatalDiagnostic = function (raw, reportOptions) {
    try {
      return ensureSingletonReporter().report(raw, reportOptions);
    } catch (error) {
      return {
        recorded: false,
        reason: "reporter-error",
        event: normalizeDiagnosticEvent(raw),
        errorName: safeText(error && error.name) || "Error",
      };
    }
  };

  var configureDiagnostics = function (options) {
    return ensureSingletonReporter().configure(options || {});
  };

  var readDiagnosticsHistory = function () {
    return ensureSingletonReporter().readHistory();
  };

  var clearDiagnosticsHistory = function () {
    ensureSingletonReporter().clearHistory();
  };

  var api = {
    normalizeDiagnosticEvent: normalizeDiagnosticEvent,
    createLocalHistorySink: createLocalHistorySink,
    createDiagnosticsReporter: createDiagnosticsReporter,
    reportNonFatalDiagnostic: reportNonFatalDiagnostic,
    configureDiagnostics: configureDiagnostics,
    readDiagnosticsHistory: readDiagnosticsHistory,
    clearDiagnosticsHistory: clearDiagnosticsHistory,
  };

  globalObject.__APP_DIAGNOSTICS__ = api;
  globalObject.__reportNonFatalDiagnostic = reportNonFatalDiagnostic;
  if (globalObject.window && typeof globalObject.window === "object") {
    globalObject.window.__APP_DIAGNOSTICS__ = api;
    globalObject.window.__reportNonFatalDiagnostic = reportNonFatalDiagnostic;
  }

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
