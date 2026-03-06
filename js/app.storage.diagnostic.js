(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.createStorageDiagnosticApi = function createStorageDiagnosticApi(state, persistenceApi, options) {
    const appUtils =
      typeof window !== "undefined" && window.AppUtils && typeof window.AppUtils === "object"
        ? window.AppUtils
        : {};
    const getAppFingerprint =
      typeof appUtils.getAppFingerprint === "function" ? appUtils.getAppFingerprint : () => "";
    const triggerJsonDownload =
      typeof appUtils.triggerJsonDownload === "function"
        ? appUtils.triggerJsonDownload
        : () => {};

    let reportStorageIssue = () => {};
    const setIssueReporter = (reporter) => {
      reportStorageIssue = typeof reporter === "function" ? reporter : () => {};
    };

    const nowIsoString = () => new Date().toISOString();

    const readStorageEstimate = async () => {
      if (typeof navigator === "undefined" || !navigator.storage) return null;
      if (typeof navigator.storage.estimate !== "function") return null;
      try {
        const estimate = await navigator.storage.estimate();
        return {
          quota: typeof estimate.quota === "number" ? estimate.quota : null,
          usage: typeof estimate.usage === "number" ? estimate.usage : null,
        };
      } catch (error) {
        return null;
      }
    };

    const readNonFatalDiagnosticsHistory = () => {
      if (typeof window === "undefined") return [];
      const diagnosticsApi =
        window.__APP_DIAGNOSTICS__ && typeof window.__APP_DIAGNOSTICS__ === "object"
          ? window.__APP_DIAGNOSTICS__
          : null;
      if (!diagnosticsApi || typeof diagnosticsApi.readDiagnosticsHistory !== "function") {
        return [];
      }
      try {
        const history = diagnosticsApi.readDiagnosticsHistory();
        return Array.isArray(history) ? history : [];
      } catch (error) {
        return [];
      }
    };

    const readNonFatalDiagnosticsConfig = () => {
      if (typeof window === "undefined") return null;
      const config =
        window.__APP_DIAGNOSTICS_CONFIG__ && typeof window.__APP_DIAGNOSTICS_CONFIG__ === "object"
          ? window.__APP_DIAGNOSTICS_CONFIG__
          : null;
      if (!config) return null;
      return {
        enabled: typeof config.enabled === "boolean" ? config.enabled : null,
        sampleRate: Number.isFinite(Number(config.sampleRate)) ? Number(config.sampleRate) : null,
        dedupWindowMs: Number.isFinite(Number(config.dedupWindowMs)) ? Number(config.dedupWindowMs) : null,
        historyLimit: Number.isFinite(Number(config.historyLimit)) ? Number(config.historyLimit) : null,
        storageKey: typeof config.storageKey === "string" ? config.storageKey : null,
      };
    };

    const isSafeObjectKey = (key) =>
      key !== "__proto__" && key !== "prototype" && key !== "constructor";

    const isWhitelistedStorageKey = (key) => {
      const text = String(key || "").trim();
      if (!text) return false;
      if (/^planner-/i.test(text)) return true;
      if (/^weapon-(marks|attr-overrides):/i.test(text)) return true;
      if (/^announcement:skip(?::|$)/i.test(text)) return true;
      if (/^weapon-marks-migration:/i.test(text)) return true;
      return false;
    };

    const redactStringValue = (value) => {
      const text = String(value == null ? "" : value);
      return {
        redacted: true,
        length: text.length,
      };
    };

    const sanitizeStorageRawValue = (value, depth) => {
      if (depth > 4) return { redacted: true, type: "depth-limit" };
      if (value == null) return value;
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return {
            type: "json",
            value: sanitizeStorageRawValue(parsed, depth + 1),
          };
        } catch (error) {
          return {
            type: "string",
            value: redactStringValue(value),
          };
        }
      }
      if (typeof value === "number" || typeof value === "boolean") {
        return value;
      }
      if (Array.isArray(value)) {
        return value.slice(0, 50).map((item) => sanitizeStorageRawValue(item, depth + 1));
      }
      if (typeof value === "object") {
        const sanitized = Object.create(null);
        Object.keys(value)
          .filter((key) => isSafeObjectKey(key))
          .slice(0, 80)
          .forEach((key) => {
            sanitized[key] = sanitizeStorageRawValue(value[key], depth + 1);
          });
        return sanitized;
      }
      return String(value);
    };

    const buildSafeStorageRaw = (rawSource) => {
      const source = rawSource && typeof rawSource === "object" ? rawSource : {};
      const safeRaw = {};
      Object.keys(source).forEach((key) => {
        if (!isWhitelistedStorageKey(key)) return;
        safeRaw[key] = sanitizeStorageRawValue(source[key], 0);
      });
      return safeRaw;
    };

    const resolveSafeLocation = () => {
      if (typeof window === "undefined" || !window.location) return "";
      const origin = String(window.location.origin || "");
      const pathname = String(window.location.pathname || "");
      return `${origin}${pathname}`;
    };

    const buildDiagnosticBundle = async () => {
      const estimate = await readStorageEstimate();
      const currentIssue = state.storageErrorCurrent.value || null;
      const bootStorageProbe =
        typeof window !== "undefined" && window.__bootStorageProbe ? window.__bootStorageProbe : null;
      const storageRawSource =
        persistenceApi && typeof persistenceApi.readManagedStorageRaw === "function"
          ? persistenceApi.readManagedStorageRaw()
          : {};
      return {
        exportedAt: nowIsoString(),
        fingerprint: getAppFingerprint(),
        location: resolveSafeLocation(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        online:
          typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
            ? navigator.onLine
            : null,
        feedbackUrl:
          (options && options.storageFeedbackUrl) || state.storageFeedbackUrl || "",
        currentIssue,
        issueLogs: Array.isArray(state.storageErrorLogs.value) ? state.storageErrorLogs.value : [],
        storageEstimate: estimate,
        bootStorageProbe,
        storageSummary:
          persistenceApi && typeof persistenceApi.readManagedStorageSummary === "function"
            ? persistenceApi.readManagedStorageSummary()
            : {},
        storageRaw: buildSafeStorageRaw(storageRawSource),
        nonFatalDiagnostics: readNonFatalDiagnosticsHistory(),
        nonFatalDiagnosticsConfig: readNonFatalDiagnosticsConfig(),
      };
    };

    const exportStorageDiagnosticBundle = async () => {
      try {
        const payload = await buildDiagnosticBundle();
        const stamp = nowIsoString().replace(/[^\d]/g, "").slice(0, 14) || String(Date.now());
        triggerJsonDownload(`planner-storage-diagnostic-${stamp}.json`, payload);
      } catch (error) {
        reportStorageIssue("diagnostic.export", "diagnostic-bundle", error, {
          scope: "diagnostic-export",
        });
      }
    };

    return {
      setIssueReporter,
      buildDiagnosticBundle,
      exportStorageDiagnosticBundle,
    };
  };
})();
