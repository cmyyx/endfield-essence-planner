(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.createStoragePersistenceApi = function createStoragePersistenceApi(state) {
    const plannerStorageKeyPrefixes = [
      "planner-",
      "weapon-marks:",
      "weapon-marks-migration:",
      "excluded-notes:",
      "announcement:skip",
    ];

    let reportStorageIssue = () => {};

    const setIssueReporter = (reporter) => {
      reportStorageIssue = typeof reporter === "function" ? reporter : () => {};
    };

    const truncateText = (value, maxLength = 320) => {
      const text = String(value == null ? "" : value);
      if (text.length <= maxLength) return text;
      return `${text.slice(0, maxLength)} ...(truncated, total ${text.length})`;
    };

    const collectManagedStorageKeys = () => {
      const keys = [
        state.marksStorageKey,
        state.legacyMarksStorageKey,
        state.legacyExcludedKey,
        state.migrationStorageKey,
        state.tutorialStorageKey,
        state.uiStateStorageKey,
        state.attrHintStorageKey,
        state.noticeSkipKey,
        state.perfModeStorageKey,
        state.themeModeStorageKey,
        state.langStorageKey,
        state.backgroundStorageKey,
        state.backgroundApiStorageKey,
        state.backgroundDisplayStorageKey,
        state.planConfigHintStorageKey,
        state.gearRefiningNavHintStorageKey,
        state.rerunRankingNavHintStorageKey,
      ].filter(Boolean);
      const unique = Array.from(new Set(keys));
      try {
        if (state.legacyNoticePrefix) {
          for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (key && key.startsWith(state.legacyNoticePrefix)) {
              unique.push(key);
            }
          }
        }
      } catch (error) {
        // ignore enumeration errors
      }
      return Array.from(new Set(unique));
    };

    const readStorageValueSafe = (key) => {
      if (!key) {
        return { key: String(key || ""), exists: false, length: 0, value: null, error: "" };
      }
      try {
        const raw = localStorage.getItem(key);
        return {
          key,
          exists: raw != null,
          length: raw == null ? 0 : String(raw).length,
          value: raw,
          error: "",
        };
      } catch (error) {
        return {
          key,
          exists: false,
          length: 0,
          value: null,
          error: `${error && error.name ? error.name : "Error"}: ${
            error && error.message ? error.message : "unknown"
          }`,
        };
      }
    };

    const buildStoragePreviewText = (failedKey) => {
      const ordered = [
        failedKey,
        state.marksStorageKey,
        state.uiStateStorageKey,
        state.backgroundStorageKey,
        state.backgroundApiStorageKey,
      ].filter(Boolean);
      const keys = Array.from(new Set(ordered));
      if (!keys.length) return "";
      const lines = [];
      keys.forEach((key) => {
        const snapshot = readStorageValueSafe(key);
        if (snapshot.error) {
          lines.push(`[${snapshot.key}] read-failed: ${snapshot.error}`);
          return;
        }
        if (!snapshot.exists) {
          lines.push(`[${snapshot.key}] <empty>`);
          return;
        }
        lines.push(`[${snapshot.key}] len=${snapshot.length}`);
        lines.push(truncateText(snapshot.value, 360));
      });
      return lines.join("\n\n");
    };

    const isLikelyPlannerStorageKey = (key) => {
      if (!key) return false;
      if (collectManagedStorageKeys().includes(key)) return true;
      return plannerStorageKeyPrefixes.some((prefix) => key.startsWith(prefix));
    };

    const safeGetItem = (key, meta) => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        reportStorageIssue("storage.read", key, error, meta || {});
        return null;
      }
    };

    const safeSetItem = (key, value, meta) => {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        reportStorageIssue("storage.write", key, error, meta || {});
        return false;
      }
    };

    const safeRemoveItem = (key, meta) => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        reportStorageIssue("storage.clear", key, error, meta || {});
        return false;
      }
    };

    const writeJsonStorageWithVerify = (key, payload, meta, options) => {
      const scope = (meta && meta.scope) || "";
      let serialized = "";
      try {
        if (options && typeof options.serialized === "string") {
          serialized = options.serialized;
        } else if (options && typeof options.serialize === "function") {
          serialized = String(options.serialize(payload));
        } else {
          serialized = JSON.stringify(payload);
        }
      } catch (error) {
        reportStorageIssue("storage.serialize", key, error, { scope });
        return;
      }
      try {
        localStorage.setItem(key, serialized);
      } catch (error) {
        reportStorageIssue("storage.write", key, error, {
          scope,
          note: `write=${truncateText(serialized, 220)}`,
        });
        return;
      }
      let readBack = null;
      try {
        readBack = localStorage.getItem(key);
      } catch (error) {
        reportStorageIssue("storage.read", key, error, {
          scope,
          note: `write=${truncateText(serialized, 220)}`,
        });
        return;
      }
      const readBackText = readBack == null ? "<null>" : String(readBack);
      const note = `write=${truncateText(serialized, 220)} | read=${truncateText(readBackText, 220)}`;
      if (readBack == null) {
        const mismatchError = new Error("localStorage read-back is empty after write");
        mismatchError.name = "StorageRoundTripMismatchError";
        reportStorageIssue("storage.verify", key, mismatchError, {
          scope,
          note,
        });
        return;
      }
      if (readBackText !== serialized) {
        const mismatchError = new Error("localStorage read-back mismatch after write");
        mismatchError.name = "StorageRoundTripMismatchError";
        reportStorageIssue("storage.verify", key, mismatchError, {
          scope,
          note,
        });
      }
      try {
        JSON.parse(readBackText);
      } catch (error) {
        reportStorageIssue("storage.verify", key, error, {
          scope,
          note,
        });
      }
    };

    const readManagedStorageRaw = () => {
      const keys = collectManagedStorageKeys();
      const data = {};
      keys.forEach((key) => {
        const snapshot = readStorageValueSafe(key);
        data[key] = snapshot.error ? { error: snapshot.error } : snapshot.value;
      });
      return data;
    };

    const readManagedStorageSummary = () => {
      const keys = collectManagedStorageKeys();
      const summary = {};
      keys.forEach((key) => {
        const snapshot = readStorageValueSafe(key);
        summary[key] = {
          exists: snapshot.exists,
          length: snapshot.length,
          preview: snapshot.error ? "" : truncateText(snapshot.value, 220),
          error: snapshot.error,
        };
      });
      return summary;
    };

    return {
      setIssueReporter,
      truncateText,
      collectManagedStorageKeys,
      readStorageValueSafe,
      buildStoragePreviewText,
      isLikelyPlannerStorageKey,
      safeGetItem,
      safeSetItem,
      safeRemoveItem,
      writeJsonStorageWithVerify,
      readManagedStorageRaw,
      readManagedStorageSummary,
    };
  };
})();
