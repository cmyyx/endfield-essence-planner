(function (globalObject) {
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
        module: "bootstrap.optional",
        operation: String(source.operation || "optional.unknown"),
        kind: String(source.kind || "non-fatal"),
        resource: String(source.resource || "bootstrap.optional"),
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

  var createOptionalFailureReporter = function (options) {
    var bt = options && typeof options.bt === "function" ? options.bt : function (key) { return key; };

    var optionalFailureEventName = "planner:optional-resource-failed";
    var optionalFailureQueueKey = "__bootOptionalLoadFailures";
    var optionalFailureQueueLimit = 20;
    var optionalFailureIdSeed = 0;
    var optionalFailureSignatureSet = new Set();

    var resolveOptionalFeatureKey = function (entry) {
      if (entry && entry.featureKey) return String(entry.featureKey);
      return "";
    };
    var resolveOptionalFeatureLabel = function (featureKey) {
      if (!featureKey) return "";
      var key = "optional_feature_" + featureKey;
      var translated = bt(key);
      if (!translated || translated === key) return "";
      return translated;
    };
    var toOptionalFailureIsoTime = function (value) {
      var parsed = Date.parse(String(value || ""));
      if (!isNaN(parsed)) {
        return new Date(parsed).toISOString();
      }
      return new Date().toISOString();
    };
    var buildOptionalFailureSignature = function (featureKey, resourceLabel) {
      return String(featureKey || "").trim() + "|" + String(resourceLabel || "").trim();
    };
    var buildOptionalFailurePayload = function (entry) {
      var featureKey = resolveOptionalFeatureKey(entry);
      var featureLabel = resolveOptionalFeatureLabel(featureKey);
      if (!featureLabel && entry && entry.featureLabel) {
        featureLabel = String(entry.featureLabel);
      }
      var resourceLabel = String(
        (entry && entry.resource) ||
          (entry && entry.resourceLabel) ||
          (entry && entry.label) ||
          (entry && entry.src) ||
          ""
      ).trim();
      if (!resourceLabel) {
        var fallbackResource = bt("unknown_resource");
        resourceLabel =
          fallbackResource && fallbackResource !== "unknown_resource"
            ? fallbackResource
            : "optional-resource";
      }
      var signature = buildOptionalFailureSignature(featureKey, resourceLabel);
      optionalFailureIdSeed += 1;
      return {
        id:
          "bootopt-" +
          Date.now() +
          "-" +
          optionalFailureIdSeed +
          "-" +
          Math.random().toString(16).slice(2, 6),
        occurredAt: toOptionalFailureIsoTime(entry && entry.occurredAt),
        feature: featureKey,
        featureKey: featureKey,
        featureLabel: featureLabel,
        resource: resourceLabel,
        resourceLabel: resourceLabel,
        signature: signature,
        source: String((entry && (entry.source || entry.scope || entry.stage)) || "bootstrap.optional"),
        src: String((entry && entry.src) || resourceLabel),
        label: resourceLabel,
      };
    };
    var enqueueOptionalFailure = function (payload) {
      if (typeof window === "undefined") return;
      var queue = Array.isArray(window[optionalFailureQueueKey]) ? window[optionalFailureQueueKey] : [];
      queue.push(payload);
      window[optionalFailureQueueKey] = queue.slice(-optionalFailureQueueLimit);
      if (typeof window.dispatchEvent === "function") {
        try {
          var event = new CustomEvent(optionalFailureEventName, { detail: payload });
          window.dispatchEvent(event);
        } catch (error) {
          // ignore event dispatch failures
        }
      }
    };
    var reportOptionalResourceFailure = function (entry, reportOptions) {
      if (!entry || typeof entry !== "object") return null;
      var allowUnsafe = Boolean(reportOptions && reportOptions.allowUnsafe);
      if (!allowUnsafe && !entry.optional) return null;
      var payload = buildOptionalFailurePayload(entry);
      if (payload && payload.signature) {
        if (optionalFailureSignatureSet.has(payload.signature)) {
          return payload;
        }
        optionalFailureSignatureSet.add(payload.signature);
      }
      enqueueOptionalFailure(payload);
      reportNonFatalDiagnostic({
        operation: "optional.report-failure",
        kind: "optional-resource-failed",
        resource: payload && payload.src ? payload.src : "optional-resource",
        errorName: "OptionalResourceFailure",
        errorMessage: payload && payload.signature ? payload.signature : "optional resource failed",
        optionalSignature: "optional.report-failure:" + String((payload && payload.signature) || "unknown"),
      });
      return payload;
    };
    if (typeof window !== "undefined") {
      window.__reportOptionalResourceFailure = function (entry) {
        return reportOptionalResourceFailure(entry, { allowUnsafe: true });
      };
    }

    return {
      reportOptionalResourceFailure: reportOptionalResourceFailure,
    };
  };

  var createOptionalScriptLoader = function (options) {
    var loadScript = options.loadScript;
    var optionalScriptConfigs = options.optionalScriptConfigs || {};
    var resourceState = options.resourceState || new Map();
    var normalizeResourceKey =
      typeof options.normalizeResourceKey === "function"
        ? options.normalizeResourceKey
        : function (src) { return String(src || ""); };
    var warnOnce = typeof options.warnOnce === "function" ? options.warnOnce : function () {};
    var getRunSerial = typeof options.getRunSerial === "function" ? options.getRunSerial : function () { return 0; };
    var reportOptionalResourceFailure =
      typeof options.reportOptionalResourceFailure === "function"
        ? options.reportOptionalResourceFailure
        : function () { return null; };

    var resolveOptionalRetryDelayMs = function (config) {
      var parsed = Number(config && config.retryDelayMs);
      if (!Number.isFinite(parsed) || parsed < 0) return 1200;
      return Math.floor(parsed);
    };
    var resolveOptionalTimeoutMs = function (config) {
      var parsed = Number(config && config.timeoutMs);
      if (!Number.isFinite(parsed) || parsed <= 0) return 12000;
      return Math.floor(parsed);
    };
    var resolveOptionalMaxRetries = function (config) {
      var parsed = Number(config && config.maxRetries);
      if (!Number.isFinite(parsed) || parsed < 0) return 1;
      return Math.floor(parsed);
    };
    var reportOptionalResourceFailureByConfig = function (src, config) {
      var entry = resourceState.get(normalizeResourceKey(src));
      if (entry && entry.optional) {
        reportOptionalResourceFailure(entry);
        return;
      }
      reportOptionalResourceFailure({
        optional: true,
        label: src,
        src: src,
        featureKey: config && config.featureKey ? String(config.featureKey) : "",
      });
    };
    var runOptionalScriptValidation = function (src, config) {
      if (!config || typeof config.validate !== "function") return true;
      try {
        return config.validate(window, src) !== false;
      } catch (error) {
        warnOnce(
          "optional-validate-error:" + src,
          "[bootstrap] optional script validation threw for " + src + ", treating as failed validation."
        );
        reportNonFatalDiagnostic({
          operation: "optional.validate-script",
          kind: "optional-validation-error",
          resource: src,
          errorName: String((error && error.name) || "Error"),
          errorMessage: String((error && error.message) || "optional validation error"),
          optionalSignature: "optional.validate-script:" + src,
        });
        return false;
      }
    };
    return function loadOptionalScriptWithRetry(src, config, expectedRunId) {
      var retries = resolveOptionalMaxRetries(config);
      var retryDelayMs = resolveOptionalRetryDelayMs(config);
      var timeoutMs = resolveOptionalTimeoutMs(config);
      var loadOptions = {
        optional: true,
        featureKey: config && config.featureKey ? String(config.featureKey) : "",
      };
      return new Promise(function (resolve) {
        var runAttemptWithTimeout = function (runner) {
          return new Promise(function (attemptResolve, attemptReject) {
            var settled = false;
            var timeoutId = setTimeout(function () {
              if (settled) return;
              settled = true;
              var timeoutError = new Error("Optional script load timed out");
              timeoutError.name = "OptionalScriptLoadTimeoutError";
              attemptReject(timeoutError);
            }, timeoutMs);
            var settle = function (fn, value) {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutId);
              fn(value);
            };
            var task = null;
            try {
              task = runner();
            } catch (error) {
              settle(attemptReject, error);
              return;
            }
            Promise.resolve(task).then(
              function (value) {
                settle(attemptResolve, value);
              },
              function (error) {
                settle(attemptReject, error);
              }
            );
          });
        };
        var attempts = 0;
        var execute = function () {
          if (getRunSerial() !== expectedRunId) {
            resolve();
            return;
          }
          runAttemptWithTimeout(function () {
            return loadScript(src, loadOptions);
          })
            .then(function () {
              if (runOptionalScriptValidation(src, config)) {
                resolve();
                return;
              }
              attempts += 1;
              if (attempts <= retries) {
                setTimeout(execute, retryDelayMs);
                return;
              }
              reportOptionalResourceFailureByConfig(src, config);
              resolve();
            })
            .catch(function (error) {
              attempts += 1;
              if (attempts <= retries) {
                setTimeout(execute, retryDelayMs);
                return;
              }
              reportNonFatalDiagnostic({
                operation: "optional.load-script",
                kind: "optional-script-load-failed",
                resource: src,
                errorName: String((error && error.name) || "Error"),
                errorMessage: String((error && error.message) || "optional script load failed"),
                optionalSignature: "optional.load-script:" + src,
              });
              reportOptionalResourceFailureByConfig(src, config);
              resolve();
            });
        };
        execute();
      });
    };
  };

  var api = {
    createOptionalFailureReporter: createOptionalFailureReporter,
    createOptionalScriptLoader: createOptionalScriptLoader,
  };

  globalObject.__BOOTSTRAP_OPTIONAL__ = api;

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
