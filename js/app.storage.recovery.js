(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.createStorageRecoveryApi = function createStorageRecoveryApi(state, persistenceApi, options) {
    const storageIssueLogLimit = 20;
    const storageIssueDedupWindowMs = 4000;
    const storageSystemKeySet = new Set([
      "localStorage",
      "sessionStorage",
      "indexedDB",
      "diagnostic-bundle",
    ]);
    const storageFeedbackUrl =
      (options && options.storageFeedbackUrl) ||
      state.storageFeedbackUrl ||
      "https://github.com/cmyyx/endfield-essence-planner/issues";

    const nowIsoString = () => new Date().toISOString();

    let lastStorageIssueSignature = "";
    let lastStorageIssueAt = 0;
    let storageClearCountdownTimer = null;

    const splitStorageKeyParts = (rawKey) =>
      String(rawKey || "")
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);

    const buildStorageIssueEntry = (operation, key, error, meta) => {
      const name = error && error.name ? error.name : "Error";
      const message = error && error.message ? error.message : "unknown";
      return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        occurredAt: nowIsoString(),
        operation: String(operation || ""),
        key: String(key || ""),
        errorName: String(name),
        errorMessage: String(message),
        scope: meta && meta.scope ? String(meta.scope) : "",
        note: meta && meta.note ? String(meta.note) : "",
      };
    };

    const reportStorageIssue = (operation, key, error, meta) => {
      const entry = buildStorageIssueEntry(operation, key, error, meta);
      const signature = `${entry.operation}|${entry.key}|${entry.errorName}|${entry.errorMessage}`;
      const now = Date.now();
      if (
        signature === lastStorageIssueSignature &&
        now - lastStorageIssueAt <= storageIssueDedupWindowMs
      ) {
        return;
      }
      lastStorageIssueSignature = signature;
      lastStorageIssueAt = now;
      state.storageErrorCurrent.value = entry;
      state.storageErrorPreviewText.value =
        persistenceApi && typeof persistenceApi.buildStoragePreviewText === "function"
          ? persistenceApi.buildStoragePreviewText(entry.key)
          : "";
      const nextLogs = [entry].concat(
        Array.isArray(state.storageErrorLogs.value) ? state.storageErrorLogs.value : []
      );
      state.storageErrorLogs.value = nextLogs.slice(0, storageIssueLogLimit);
      state.showStorageErrorModal.value = true;
    };

    const collectProblematicStorageKeys = () => {
      const entries = [];
      if (state.storageErrorCurrent && state.storageErrorCurrent.value) {
        entries.push(state.storageErrorCurrent.value);
      }
      if (Array.isArray(state.storageErrorLogs.value) && state.storageErrorLogs.value.length) {
        entries.push(...state.storageErrorLogs.value);
      }
      const keys = new Set();
      entries.forEach((entry) => {
        splitStorageKeyParts(entry && entry.key).forEach((part) => {
          if (storageSystemKeySet.has(part)) return;
          if (
            !persistenceApi ||
            typeof persistenceApi.isLikelyPlannerStorageKey !== "function" ||
            !persistenceApi.isLikelyPlannerStorageKey(part)
          ) {
            return;
          }
          keys.add(part);
        });
      });
      return Array.from(keys);
    };

    const refreshStorageClearTargets = () => {
      const targets = collectProblematicStorageKeys();
      state.storageErrorClearTargetKeys.value = targets;
      return targets;
    };

    const stopStorageClearCountdown = () => {
      if (!storageClearCountdownTimer) return;
      clearInterval(storageClearCountdownTimer);
      storageClearCountdownTimer = null;
    };

    const startStorageClearCountdown = () => {
      stopStorageClearCountdown();
      state.storageErrorClearCountdown.value = 3;
      storageClearCountdownTimer = setInterval(() => {
        if (state.storageErrorClearCountdown.value > 0) {
          state.storageErrorClearCountdown.value -= 1;
        }
        if (state.storageErrorClearCountdown.value <= 0) {
          state.storageErrorClearCountdown.value = 0;
          stopStorageClearCountdown();
        }
      }, 1000);
    };

    const ignoreStorageErrors = () => {
      stopStorageClearCountdown();
      state.storageErrorIgnored.value = false;
      state.showStorageClearConfirmModal.value = false;
      state.showStorageIgnoreConfirmModal.value = false;
      state.storageErrorClearTargetKeys.value = [];
      state.storageErrorClearCountdown.value = 0;
      state.showStorageErrorModal.value = false;
    };

    const requestIgnoreStorageErrors = () => {
      state.showStorageIgnoreConfirmModal.value = true;
    };

    const cancelIgnoreStorageErrors = () => {
      state.showStorageIgnoreConfirmModal.value = false;
    };

    const confirmIgnoreStorageErrors = () => {
      ignoreStorageErrors();
    };

    const requestStorageDataClear = () => {
      refreshStorageClearTargets();
      state.showStorageClearConfirmModal.value = true;
      startStorageClearCountdown();
    };

    const cancelStorageDataClear = () => {
      stopStorageClearCountdown();
      state.showStorageClearConfirmModal.value = false;
      state.storageErrorClearTargetKeys.value = [];
      state.storageErrorClearCountdown.value = 0;
    };

    const clearProblematicStorageKeys = () => {
      const targets = refreshStorageClearTargets();
      targets.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          reportStorageIssue("storage.clear", key, error, { scope: "clear-problematic-local" });
        }
      });
      targets.forEach((key) => {
        try {
          sessionStorage.removeItem(key);
        } catch (error) {
          reportStorageIssue("storage.clear", key, error, { scope: "clear-problematic-session" });
        }
      });
      return targets;
    };

    const clearStorageAndReloadNow = async () => {
      clearProblematicStorageKeys();
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("__clear_ts", String(Date.now()));
        window.location.replace(url.toString());
      }
    };

    const confirmStorageDataClearAndReload = async () => {
      if (state.storageErrorClearCountdown.value > 0) return;
      stopStorageClearCountdown();
      state.storageErrorClearCountdown.value = 0;
      state.showStorageClearConfirmModal.value = false;
      await clearStorageAndReloadNow();
    };

    const flushPendingStorageIssues = () => {
      if (!Array.isArray(state.pendingStorageIssues) || !state.pendingStorageIssues.length) return;
      const queuedIssues = state.pendingStorageIssues.slice();
      state.pendingStorageIssues = [];
      queuedIssues.forEach((item) => {
        if (!item) return;
        reportStorageIssue(item.operation, item.key, item.error, item.meta);
      });
    };

    const applyBootstrapStorageProbeIssue = () => {
      try {
        if (typeof window !== "undefined" && window.__bootStorageProbe && window.__bootStorageProbe.ok === false) {
          const probe = window.__bootStorageProbe;
          const bootError = new Error(probe && probe.errorMessage ? probe.errorMessage : "bootstrap storage probe failed");
          if (probe && probe.errorName) {
            bootError.name = String(probe.errorName);
          }
          reportStorageIssue(
            "storage.bootstrap-probe",
            (probe && probe.key) || "localStorage",
            bootError,
            { scope: "bootstrap-probe" }
          );
        }
      } catch (error) {
        // ignore bootstrap probe read errors
      }
    };

    return {
      storageFeedbackUrl,
      reportStorageIssue,
      refreshStorageClearTargets,
      stopStorageClearCountdown,
      ignoreStorageErrors,
      requestIgnoreStorageErrors,
      cancelIgnoreStorageErrors,
      confirmIgnoreStorageErrors,
      requestStorageDataClear,
      cancelStorageDataClear,
      clearProblematicStorageKeys,
      confirmStorageDataClearAndReload,
      flushPendingStorageIssues,
      applyBootstrapStorageProbeIssue,
    };
  };
})();
