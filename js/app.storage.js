(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initStorage = function initStorage(ctx, state) {
    const { computed, watch, onBeforeUnmount } = ctx;

    const sanitizeArray = (value) => (Array.isArray(value) ? value : []);
    const weaponNameSet = new Set(weapons.map((weapon) => weapon.name));
    const s1Set = new Set(weapons.map((weapon) => weapon.s1).filter(Boolean));
    const s2Set = new Set(weapons.map((weapon) => weapon.s2).filter(Boolean));
    const s3Set = new Set(weapons.map((weapon) => weapon.s3).filter(Boolean));
    const mobilePanels = new Set(["weapons", "plans"]);
    const priorityModes = new Set(["ignore", "strict", "sameCoverage", "sameEfficiency"]);
    const strictPriorityOrders = new Set(["ownershipFirst", "regionFirst"]);
    const themeModes = new Set(["auto", "light", "dark"]);
    const regionSet = new Set(
      dungeons
        .map((dungeon) => getDungeonRegion(dungeon && dungeon.name))
        .filter((name) => typeof name === "string" && name)
    );

    const normalizeRecommendationConfig = (raw, legacyHideExcluded) => {
      const defaults = state.recommendationConfig.value || {};
      const source = raw && typeof raw === "object" ? raw : {};

      const hideEssenceOwnedWeapons =
        typeof source.hideEssenceOwnedWeapons === "boolean"
          ? source.hideEssenceOwnedWeapons
          : typeof source.hideExcluded === "boolean"
          ? source.hideExcluded
          : typeof legacyHideExcluded === "boolean"
          ? legacyHideExcluded
          : Boolean(defaults.hideEssenceOwnedWeapons);

      const hideEssenceOwnedOwnedOnly =
        hideEssenceOwnedWeapons && typeof source.hideEssenceOwnedOwnedOnly === "boolean"
          ? source.hideEssenceOwnedOwnedOnly
          : hideEssenceOwnedWeapons && Boolean(defaults.hideEssenceOwnedOwnedOnly);

      const hideEssenceOwnedWeaponsInSelector =
        hideEssenceOwnedWeapons && typeof source.hideEssenceOwnedWeaponsInSelector === "boolean"
          ? source.hideEssenceOwnedWeaponsInSelector
          : hideEssenceOwnedWeapons && Boolean(defaults.hideEssenceOwnedWeaponsInSelector);

      const hideUnownedWeapons =
        typeof source.hideUnownedWeapons === "boolean"
          ? source.hideUnownedWeapons
          : Boolean(defaults.hideUnownedWeapons);

      const hideUnownedWeaponsInSelector =
        hideUnownedWeapons && typeof source.hideUnownedWeaponsInSelector === "boolean"
          ? source.hideUnownedWeaponsInSelector
          : hideUnownedWeapons && Boolean(defaults.hideUnownedWeaponsInSelector);

      const hideFourStarWeapons =
        typeof source.hideFourStarWeapons === "boolean"
          ? source.hideFourStarWeapons
          : Boolean(defaults.hideFourStarWeapons);

      const hideFourStarWeaponsInSelector =
        hideFourStarWeapons && typeof source.hideFourStarWeaponsInSelector === "boolean"
          ? source.hideFourStarWeaponsInSelector
          : hideFourStarWeapons && Boolean(defaults.hideFourStarWeaponsInSelector);

      const attributeFilterAffectsHiddenWeapons =
        typeof source.attributeFilterAffectsHiddenWeapons === "boolean"
          ? source.attributeFilterAffectsHiddenWeapons
          : Boolean(defaults.attributeFilterAffectsHiddenWeapons);

      const regionPriorityMode = priorityModes.has(source.regionPriorityMode)
        ? source.regionPriorityMode
        : priorityModes.has(source.priorityMode)
        ? source.priorityMode
        : defaults.regionPriorityMode || "ignore";

      const ownershipPriorityMode = priorityModes.has(source.ownershipPriorityMode)
        ? source.ownershipPriorityMode
        : defaults.ownershipPriorityMode || "ignore";

      const strictPriorityOrder = strictPriorityOrders.has(source.strictPriorityOrder)
        ? source.strictPriorityOrder
        : defaults.strictPriorityOrder || "ownershipFirst";
      const normalized = {
        hideEssenceOwnedWeapons,
        hideEssenceOwnedOwnedOnly,
        hideEssenceOwnedWeaponsInSelector,
        hideUnownedWeapons,
        hideUnownedWeaponsInSelector,
        hideFourStarWeapons,
        hideFourStarWeaponsInSelector,
        attributeFilterAffectsHiddenWeapons,
        preferredRegion1: "",
        preferredRegion2: "",
        regionPriorityMode,
        ownershipPriorityMode,
        strictPriorityOrder,
      };

      if (typeof source.preferredRegion1 === "string" && regionSet.has(source.preferredRegion1)) {
        normalized.preferredRegion1 = source.preferredRegion1;
      }
      if (typeof source.preferredRegion2 === "string" && regionSet.has(source.preferredRegion2)) {
        normalized.preferredRegion2 = source.preferredRegion2;
      }
      if (
        normalized.preferredRegion1 &&
        normalized.preferredRegion2 &&
        normalized.preferredRegion1 === normalized.preferredRegion2
      ) {
        normalized.preferredRegion2 = "";
      }

      if (!normalized.hideEssenceOwnedWeapons) {
        normalized.hideEssenceOwnedOwnedOnly = false;
        normalized.hideEssenceOwnedWeaponsInSelector = false;
      }
      if (!normalized.hideUnownedWeapons) {
        normalized.hideUnownedWeaponsInSelector = false;
      }
      if (!normalized.hideFourStarWeapons) {
        normalized.hideFourStarWeaponsInSelector = false;
      }

      return normalized;
    };

    const normalizeWeaponMarks = (raw) => {
      return normalizeWeaponMarksMap(raw, weaponNameSet);
    };

    const inspectWeaponMarksSchemaIssues = (raw) => {
      const issues = [];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        issues.push("顶层结构不是对象");
        return issues;
      }
      const allowedKeys = new Set(["weaponOwned", "essenceOwned", "excluded", "note"]);
      Object.keys(raw).forEach((name) => {
        if (!name || !weaponNameSet.has(name)) return;
        const entry = raw[name];
        if (entry == null) return;
        if (typeof entry === "string") return;
        if (typeof entry !== "object" || Array.isArray(entry)) {
          issues.push(`${name}: 数据结构不是对象或字符串`);
          return;
        }
        Object.keys(entry).forEach((key) => {
          if (!allowedKeys.has(key)) {
            issues.push(`${name}: 存在未知字段 ${key}`);
          }
        });
        if (Object.prototype.hasOwnProperty.call(entry, "weaponOwned") && typeof entry.weaponOwned !== "boolean") {
          issues.push(`${name}: weaponOwned 不是布尔值`);
        }
        if (Object.prototype.hasOwnProperty.call(entry, "essenceOwned") && typeof entry.essenceOwned !== "boolean") {
          issues.push(`${name}: essenceOwned 不是布尔值`);
        }
        if (Object.prototype.hasOwnProperty.call(entry, "excluded") && typeof entry.excluded !== "boolean") {
          issues.push(`${name}: excluded 不是布尔值`);
        }
        if (Object.prototype.hasOwnProperty.call(entry, "note") && typeof entry.note !== "string") {
          issues.push(`${name}: note 不是字符串`);
        }
      });
      return issues;
    };

    const normalizeLegacyMarks = (raw) => {
      return normalizeLegacyExcludedMarksMap(raw, weaponNameSet);
    };

    state.normalizeWeaponMarks = normalizeWeaponMarks;
    state.normalizeLegacyMarks = normalizeLegacyMarks;
    state.normalizeRecommendationConfig = normalizeRecommendationConfig;

    const storageIssueLogLimit = 20;
    const storageIssueDedupWindowMs = 4000;
    const storageFeedbackUrl =
      state.storageFeedbackUrl ||
      "https://github.com/cmyyx/endfield-essence-planner/issues";
    let lastStorageIssueSignature = "";
    let lastStorageIssueAt = 0;
    let storageClearCountdownTimer = null;

    const nowIsoString = () => new Date().toISOString();
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

    const truncateText = (value, maxLength = 320) => {
      const text = String(value == null ? "" : value);
      if (text.length <= maxLength) return text;
      return `${text.slice(0, maxLength)} ...(truncated, total ${text.length})`;
    };

    const escapeJsonString = (value) => {
      const text = String(value == null ? "" : value);
      return text.replace(/[\u0000-\u001f"\\]/g, (char) => {
        if (char === '"') return '\\"';
        if (char === "\\") return "\\\\";
        if (char === "\b") return "\\b";
        if (char === "\f") return "\\f";
        if (char === "\n") return "\\n";
        if (char === "\r") return "\\r";
        if (char === "\t") return "\\t";
        const code = char.charCodeAt(0).toString(16).padStart(4, "0");
        return `\\u${code}`;
      });
    };

    const serializeWeaponMarksNormalized = (normalizedMap) => {
      const source = normalizedMap && typeof normalizedMap === "object" ? normalizedMap : {};
      const names = Object.keys(source);
      if (!names.length) return "{}";
      const items = [];
      names.forEach((name) => {
        if (!name) return;
        const entry = source[name];
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
        const fields = [];
        if (entry.weaponOwned === true) fields.push('"weaponOwned":true');
        if (entry.essenceOwned === true) fields.push('"essenceOwned":true');
        if (typeof entry.note === "string" && entry.note) {
          fields.push(`"note":"${escapeJsonString(entry.note)}"`);
        }
        if (!fields.length) return;
        items.push(`"${escapeJsonString(name)}":{${fields.join(",")}}`);
      });
      return `{${items.join(",")}}`;
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
      state.storageErrorPreviewText.value = buildStoragePreviewText(entry.key);
      const nextLogs = [entry].concat(Array.isArray(state.storageErrorLogs.value) ? state.storageErrorLogs.value : []);
      state.storageErrorLogs.value = nextLogs.slice(0, storageIssueLogLimit);
      state.showStorageErrorModal.value = true;
    };

    const writeJsonStorageWithVerify = (key, payload, meta, options) => {
      let serialized = "";
      if (options && typeof options.serialized === "string") {
        serialized = options.serialized;
      } else if (options && typeof options.serialize === "function") {
        serialized = String(options.serialize(payload));
      } else {
        serialized = JSON.stringify(payload);
      }
      localStorage.setItem(key, serialized);
      const readBack = localStorage.getItem(key);
      const readBackText = readBack == null ? "<null>" : String(readBack);
      const note = `write=${truncateText(serialized, 220)} | read=${truncateText(readBackText, 220)}`;
      if (readBack == null) {
        const mismatchError = new Error("localStorage read-back is empty after write");
        mismatchError.name = "StorageRoundTripMismatchError";
        reportStorageIssue("storage.verify", key, mismatchError, {
          scope: (meta && meta.scope) || "",
          note,
        });
        return;
      }
      if (readBackText !== serialized) {
        const mismatchError = new Error("localStorage read-back mismatch after write");
        mismatchError.name = "StorageRoundTripMismatchError";
        reportStorageIssue("storage.verify", key, mismatchError, {
          scope: (meta && meta.scope) || "",
          note,
        });
      }
      try {
        JSON.parse(readBackText);
      } catch (error) {
        reportStorageIssue("storage.verify", key, error, {
          scope: (meta && meta.scope) || "",
          note,
        });
      }
    };

    const storageSystemKeySet = new Set([
      "localStorage",
      "sessionStorage",
      "indexedDB",
      "diagnostic-bundle",
    ]);
    const plannerStorageKeyPrefixes = [
      "planner-",
      "weapon-marks:",
      "weapon-marks-migration:",
      "excluded-notes:",
      "announcement:skip",
    ];

    const splitStorageKeyParts = (rawKey) =>
      String(rawKey || "")
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);

    const isLikelyPlannerStorageKey = (key) => {
      if (!key) return false;
      if (collectManagedStorageKeys().includes(key)) return true;
      return plannerStorageKeyPrefixes.some((prefix) => key.startsWith(prefix));
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
          if (!isLikelyPlannerStorageKey(part)) return;
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

    const buildDiagnosticBundle = async () => {
      const estimate = await readStorageEstimate();
      const currentIssue = state.storageErrorCurrent.value || null;
      const bootStorageProbe =
        typeof window !== "undefined" && window.__bootStorageProbe ? window.__bootStorageProbe : null;
      return {
        exportedAt: nowIsoString(),
        fingerprint: getAppFingerprint(),
        location: typeof window !== "undefined" ? window.location.href : "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        online:
          typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
            ? navigator.onLine
            : null,
        feedbackUrl: storageFeedbackUrl,
        currentIssue,
        issueLogs: Array.isArray(state.storageErrorLogs.value) ? state.storageErrorLogs.value : [],
        storageEstimate: estimate,
        bootStorageProbe,
        storageSummary: readManagedStorageSummary(),
        storageRaw: readManagedStorageRaw(),
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

    state.reportStorageIssue = reportStorageIssue;
    if (Array.isArray(state.pendingStorageIssues) && state.pendingStorageIssues.length) {
      const queuedIssues = state.pendingStorageIssues.slice();
      state.pendingStorageIssues = [];
      queuedIssues.forEach((item) => {
        if (!item) return;
        reportStorageIssue(item.operation, item.key, item.error, item.meta);
      });
    }
    state.ignoreStorageErrors = ignoreStorageErrors;
    state.requestIgnoreStorageErrors = requestIgnoreStorageErrors;
    state.cancelIgnoreStorageErrors = cancelIgnoreStorageErrors;
    state.confirmIgnoreStorageErrors = confirmIgnoreStorageErrors;
    state.exportStorageDiagnosticBundle = exportStorageDiagnosticBundle;
    state.requestStorageDataClear = requestStorageDataClear;
    state.cancelStorageDataClear = cancelStorageDataClear;
    state.confirmStorageDataClearAndReload = confirmStorageDataClearAndReload;
    state.storageFeedbackUrl = storageFeedbackUrl;

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

    const sanitizeState = (raw) => {
      if (!raw || typeof raw !== "object") return null;
      const next = {};

      if (typeof raw.searchQuery === "string") {
        next.searchQuery = raw.searchQuery;
      }

      if (Array.isArray(raw.selectedNames)) {
        const unique = Array.from(new Set(raw.selectedNames));
        next.selectedNames = unique.filter((name) => weaponNameSet.has(name));
      }

      if (raw.schemeBaseSelections && typeof raw.schemeBaseSelections === "object") {
        const cleaned = {};
        Object.keys(raw.schemeBaseSelections).forEach((key) => {
          const values = sanitizeArray(raw.schemeBaseSelections[key]).filter((value) =>
            s1Set.has(value)
          );
          if (values.length) {
            cleaned[key] = Array.from(new Set(values));
          }
        });
        next.schemeBaseSelections = cleaned;
      }

      if (typeof raw.showWeaponAttrs === "boolean") {
        next.showWeaponAttrs = raw.showWeaponAttrs;
      }
      if (typeof raw.filterPanelManuallySet === "boolean") {
        next.filterPanelManuallySet = raw.filterPanelManuallySet;
      }
      if (next.filterPanelManuallySet && typeof raw.showFilterPanel === "boolean") {
        next.showFilterPanel = raw.showFilterPanel;
      }
      if (typeof raw.showAllSchemes === "boolean") {
        next.showAllSchemes = raw.showAllSchemes;
      }
      if (typeof raw.backgroundDisplayEnabled === "boolean") {
        next.backgroundDisplayEnabled = raw.backgroundDisplayEnabled;
      }

      next.recommendationConfig = normalizeRecommendationConfig(
        raw.recommendationConfig,
        raw.hideExcludedInPlans
      );

      if (mobilePanels.has(raw.mobilePanel)) {
        next.mobilePanel = raw.mobilePanel;
      }

      const s1Filter = Array.from(
        new Set(sanitizeArray(raw.filterS1).filter((value) => s1Set.has(value)))
      );
      const s2Filter = Array.from(
        new Set(sanitizeArray(raw.filterS2).filter((value) => s2Set.has(value)))
      );
      const s3Filter = Array.from(
        new Set(sanitizeArray(raw.filterS3).filter((value) => s3Set.has(value)))
      );
      if (s1Filter.length) next.filterS1 = s1Filter;
      if (s2Filter.length) next.filterS2 = s2Filter;
      if (s3Filter.length) next.filterS3 = s3Filter;

      return next;
    };

    const getUrlSelectedWeaponNames = () => {
      if (typeof window === "undefined") return [];
      try {
        const params = new URLSearchParams(window.location.search || "");
        if (!params.has("weapons") && !params.has("weapon")) return [];
        const names = [];
        const packed = params.get("weapons");
        if (packed) {
          names.push(...packed.split(","));
        }
        const repeated = params.getAll("weapon");
        if (repeated.length) {
          names.push(...repeated);
        }
        if (!names.length) return [];
        const unique = Array.from(new Set(names.map((name) => String(name || "").trim()).filter(Boolean)));
        return unique.filter((name) => weaponNameSet.has(name));
      } catch (error) {
        return [];
      }
    };

    const urlSelectedWeaponNames = getUrlSelectedWeaponNames();
    let restoredFilterPanelPreference = false;
    const shouldCollapseFilterPanelByDefault = () => {
      if (typeof window === "undefined") return false;
      return state.isPortrait.value || window.innerWidth <= 640;
    };

    try {
      const storedState = localStorage.getItem(state.uiStateStorageKey);
      if (storedState) {
        const parsed = JSON.parse(storedState);
        const restored = sanitizeState(parsed);
        if (restored) {
          if (typeof restored.searchQuery === "string") {
            state.searchQuery.value = restored.searchQuery;
          }
          if (restored.selectedNames) {
            state.selectedNames.value = restored.selectedNames;
          }
          if (restored.schemeBaseSelections) {
            state.schemeBaseSelections.value = restored.schemeBaseSelections;
          }
          if (typeof restored.showWeaponAttrs === "boolean") {
            state.showWeaponAttrs.value = restored.showWeaponAttrs;
          }
          if (typeof restored.filterPanelManuallySet === "boolean") {
            state.filterPanelManuallySet.value = restored.filterPanelManuallySet;
          }
          if (state.filterPanelManuallySet.value && typeof restored.showFilterPanel === "boolean") {
            state.showFilterPanel.value = restored.showFilterPanel;
            restoredFilterPanelPreference = true;
          }
          if (typeof restored.showAllSchemes === "boolean") {
            state.showAllSchemes.value = restored.showAllSchemes;
          }
          if (typeof restored.backgroundDisplayEnabled === "boolean") {
            state.backgroundDisplayEnabled.value = restored.backgroundDisplayEnabled;
          }
          if (restored.recommendationConfig) {
            state.recommendationConfig.value = restored.recommendationConfig;
          }
          if (restored.mobilePanel) {
            state.mobilePanel.value = restored.mobilePanel;
          }
          if (restored.filterS1) state.filterS1.value = restored.filterS1;
          if (restored.filterS2) state.filterS2.value = restored.filterS2;
          if (restored.filterS3) state.filterS3.value = restored.filterS3;
        }
      }
    } catch (error) {
      const isJsonParseError =
        error &&
        (error.name === "SyntaxError" ||
          /json|unexpected token|unterminated/i.test(String(error.message || "")));
      const shouldRepairFromUrl = isJsonParseError && urlSelectedWeaponNames.length > 0;
      if (shouldRepairFromUrl) {
        try {
          state.selectedNames.value = urlSelectedWeaponNames.slice();
          writeJsonStorageWithVerify(
            state.uiStateStorageKey,
            { selectedNames: urlSelectedWeaponNames.slice() },
            { scope: "repair-ui-state-from-url", note: "repair invalid planner-ui-state via url weapons" }
          );
        } catch (repairError) {
          reportStorageIssue("storage.write", state.uiStateStorageKey, repairError, {
            scope: "repair-ui-state-from-url",
          });
          reportStorageIssue("storage.read", state.uiStateStorageKey, error, {
            scope: "restore-ui-state",
          });
        }
      } else {
        reportStorageIssue("storage.read", state.uiStateStorageKey, error, {
          scope: "restore-ui-state",
        });
      }
    }

    try {
      const storedTheme = localStorage.getItem(state.themeModeStorageKey);
      if (themeModes.has(storedTheme)) {
        state.themePreference.value = storedTheme;
      }
    } catch (error) {
      reportStorageIssue("storage.read", state.themeModeStorageKey, error, {
        scope: "restore-theme",
      });
    }

    try {
      const storedBackgroundDisplay = localStorage.getItem(state.backgroundDisplayStorageKey);
      if (storedBackgroundDisplay === "0") {
        state.backgroundDisplayEnabled.value = false;
      } else if (storedBackgroundDisplay === "1") {
        state.backgroundDisplayEnabled.value = true;
      }
    } catch (error) {
      reportStorageIssue("storage.read", state.backgroundDisplayStorageKey, error, {
        scope: "restore-background-display",
      });
    }

    try {
      const storedPlanConfigHintVersion = localStorage.getItem(state.planConfigHintStorageKey);
      state.showPlanConfigHintDot.value =
        storedPlanConfigHintVersion !== state.planConfigHintVersion;
    } catch (error) {
      state.showPlanConfigHintDot.value = true;
      reportStorageIssue("storage.read", state.planConfigHintStorageKey, error, {
        scope: "restore-plan-config-hint",
      });
    }

    try {
      const storedGearRefiningNavHintVersion = localStorage.getItem(
        state.gearRefiningNavHintStorageKey
      );
      state.showGearRefiningNavHintDot.value =
        storedGearRefiningNavHintVersion !== state.gearRefiningNavHintVersion;
    } catch (error) {
      state.showGearRefiningNavHintDot.value = true;
      reportStorageIssue("storage.read", state.gearRefiningNavHintStorageKey, error, {
        scope: "restore-gear-refining-nav-hint",
      });
    }

    if (!restoredFilterPanelPreference && shouldCollapseFilterPanelByDefault()) {
      state.showFilterPanel.value = false;
    }

    try {
      const storedTutorial = localStorage.getItem(state.tutorialStorageKey);
      if (storedTutorial) {
        const parsed = JSON.parse(storedTutorial);
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.skipVersion === "string") {
            state.tutorialSkippedVersion.value = parsed.skipVersion;
          } else if (parsed.skipAll) {
            state.tutorialSkippedVersion.value = state.tutorialVersion;
          }
          if (typeof parsed.completedVersion === "string") {
            state.tutorialCompletedVersion.value = parsed.completedVersion;
          } else if (parsed.completed) {
            state.tutorialCompletedVersion.value = state.tutorialVersion;
          }
        }
      }
    } catch (error) {
      reportStorageIssue("storage.read", state.tutorialStorageKey, error, {
        scope: "restore-tutorial",
      });
    }

    try {
      const stored = localStorage.getItem(state.marksStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const schemaIssues = inspectWeaponMarksSchemaIssues(parsed);
        if (schemaIssues.length) {
          reportStorageIssue(
            "storage.schema",
            state.marksStorageKey,
            new Error(schemaIssues[0]),
            {
              scope: "restore-weapon-marks-schema",
              note: schemaIssues.slice(0, 8).join("; "),
            }
          );
        }
        state.weaponMarks.value = normalizeWeaponMarks(parsed);
      }
    } catch (error) {
      reportStorageIssue("storage.read", state.marksStorageKey, error, {
        scope: "restore-weapon-marks",
      });
    }

    const readLegacyMarks = (storageKey) => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return {};
        return normalizeLegacyMarks(JSON.parse(raw));
      } catch (error) {
        reportStorageIssue("storage.read", storageKey, error, {
          scope: "restore-legacy-marks",
        });
        return {};
      }
    };
    const legacyFromV1 = readLegacyMarks(state.legacyMarksStorageKey);
    const legacyFromExcluded = readLegacyMarks(state.legacyExcludedKey);
    state.legacyMigrationMarks.value = {
      ...legacyFromExcluded,
      ...legacyFromV1,
    };

    watch(
      state.weaponMarks,
      (value) => {
        try {
          const schemaIssues = inspectWeaponMarksSchemaIssues(value);
          if (schemaIssues.length) {
            reportStorageIssue(
              "storage.schema",
              state.marksStorageKey,
              new Error(schemaIssues[0]),
              {
                scope: "persist-weapon-marks-schema",
                note: schemaIssues.slice(0, 8).join("; "),
              }
            );
          }
          const normalized = normalizeWeaponMarks(value);
          const keys = Object.keys(normalized || {});
          if (!keys.length) {
            localStorage.removeItem(state.marksStorageKey);
            return;
          }
          const serializedMarks = serializeWeaponMarksNormalized(normalized);
          writeJsonStorageWithVerify(state.marksStorageKey, normalized, {
            scope: "persist-weapon-marks-verify",
          }, {
            serialized: serializedMarks,
          });
        } catch (error) {
          reportStorageIssue("storage.write", state.marksStorageKey, error, {
            scope: "persist-weapon-marks",
          });
        }
      },
      { deep: true }
    );

    const uiState = computed(() => {
      const value = {
        searchQuery: state.searchQuery.value,
        selectedNames: state.selectedNames.value,
        schemeBaseSelections: state.schemeBaseSelections.value,
        showWeaponAttrs: state.showWeaponAttrs.value,
        showAllSchemes: state.showAllSchemes.value,
        backgroundDisplayEnabled: state.backgroundDisplayEnabled.value,
        recommendationConfig: state.recommendationConfig.value,
        filterS1: state.filterS1.value,
        filterS2: state.filterS2.value,
        filterS3: state.filterS3.value,
        mobilePanel: state.mobilePanel.value,
        filterPanelManuallySet: Boolean(
          state.filterPanelManuallySet && state.filterPanelManuallySet.value
        ),
      };
      if (value.filterPanelManuallySet) {
        value.showFilterPanel = state.showFilterPanel.value;
      }
      return value;
    });

    watch(
      uiState,
      (value) => {
        try {
          localStorage.setItem(state.uiStateStorageKey, JSON.stringify(value));
        } catch (error) {
          reportStorageIssue("storage.write", state.uiStateStorageKey, error, {
            scope: "persist-ui-state",
          });
        }
      },
      { deep: true }
    );

    watch(state.themePreference, (value) => {
      try {
        if (!value || value === "auto") {
          localStorage.removeItem(state.themeModeStorageKey);
          return;
        }
        localStorage.setItem(state.themeModeStorageKey, value);
      } catch (error) {
        reportStorageIssue("storage.write", state.themeModeStorageKey, error, {
          scope: "persist-theme",
        });
      }
    });

    watch(state.backgroundDisplayEnabled, (value) => {
      try {
        localStorage.setItem(state.backgroundDisplayStorageKey, value ? "1" : "0");
      } catch (error) {
        reportStorageIssue("storage.write", state.backgroundDisplayStorageKey, error, {
          scope: "persist-background-display",
        });
      }
    });

    if (typeof onBeforeUnmount === "function") {
      onBeforeUnmount(() => {
        stopStorageClearCountdown();
      });
    }
  };
})();
