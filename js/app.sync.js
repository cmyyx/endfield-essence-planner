(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initSync = function initSync(ctx, state) {
    const { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } = ctx;
    const syncMetaStorageKey = state.syncMetaStorageKey || "planner-sync-meta:v1";
    const syncPrefsStorageKey = state.syncPrefsStorageKey || "planner-sync-prefs:v1";
    const syncDevStorageKey = state.syncDevStorageKey || "planner-sync-dev:v1";
    const syncAuthTokenStorageKey = state.syncAuthTokenStorageKey || "planner-sync-auth-token:v1";
    const syncSessionHintStorageKey = state.syncSessionHintStorageKey || "planner-session-hint:v1";
    const syncLegacyMigrationAttemptSessionKey = state.syncLegacyMigrationAttemptSessionKey || "planner-sync-legacy-migrate-attempted:v1";
    const syncEmailToastSessionKey = state.syncEmailToastSessionKey || "planner-sync-email-toast:v1";
    const syncPlanToastSessionKey = state.syncPlanToastSessionKey || "planner-sync-plan-toast:v1";
    const syncRestrictionToastSessionKey = state.syncRestrictionToastSessionKey || "planner-sync-restriction-toast:v1";
    const syncVerificationCooldownSessionKey = state.syncVerificationCooldownSessionKey || "planner-sync-email-verify-cooldown:v1";
    const syncVerificationSubmitCooldownSessionKey = state.syncVerificationSubmitCooldownSessionKey || "planner-sync-email-verify-submit-cooldown:v1";
    const syncEmailChangeCooldownSessionKey = state.syncEmailChangeCooldownSessionKey || "planner-sync-email-change-cooldown:v1";
    const syncResetCodeRequestCooldownSessionKey = state.syncResetCodeRequestCooldownSessionKey || "planner-sync-reset-code-request-cooldown:v1";
    const getDefaultApiBase = () => "https://endapi.canmoe.com/api";
    const devHostPattern = /^(localhost|127\.0\.0\.1)$/i;
    const defaultMeta = {
      serverVersion: 0,
      localHash: "",
      syncedAt: "",
      remoteUpdatedAt: "",
    };
    const runtimeEnv =
      typeof window !== "undefined" && typeof window.__APP_RUNTIME_ENV__ === "string"
        ? String(window.__APP_RUNTIME_ENV__ || "").toLowerCase()
        : "";
    const autoSyncDelayMs = 8000;
    const syncModalOpenCheckCooldownMs = 30000;
    const remoteRefreshFocusCooldownMs = 60000;
    const remoteRefreshIntervalMs = 300000;
    const syncConflictToastSignature = "sync-conflict-active";
    const syncConflictReminderThrottleMs = 1800;
    const usernamePattern = /^[a-zA-Z0-9_]{3,24}$/;
    const devHeaderNamePattern = /^[A-Za-z0-9-]+$/;
    const syncTurnstileSiteKey = "0x4AAAAAACxC56LlFLuFLUXe";
    const syncTurnstileAction = "sync_auth";
    const syncTurnstileScriptSrc = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    const adblockNoticeSessionKey = "planner-adblock-notice-shown:v1";
    const maxAutoSyncAttemptsPerHash = 2;
    let autoSyncTimer = null;
    let autoSyncCountdownTimer = null;
    let syncSessionRequest = null;
    let syncLegacyCookieMigrationRequest = null;
    let remoteRefreshTimer = null;
    let syncModalCleanupTimer = null;
    let lastRemoteRefreshAt = 0;
    let lastSyncModalOpenCheckAt = 0;
    let lastSyncConflictReminderAt = 0;
    let lastSyncConflictReminderHash = "";
    let suppressNextConflictToastUntil = 0;
    let syncTurnstileLoadPromise = null;
    let syncTurnstileMountPromise = null;
    let syncTurnstileMountVersion = 0;
    let adblockDetectionTimer = null;
    let lastAutoSyncEntitlement = false;
    let syncVerificationCooldownTimer = null;
    let syncVerificationSubmitCooldownTimer = null;
    let syncEmailChangeCooldownTimer = null;
    let syncResetCodeRequestCooldownTimer = null;
    let lastAutoSyncAttemptHash = "";
    let lastAutoSyncAttemptCount = 0;
    const overlayClosePointerState = Object.create(null);
    const overlayClosePointerMoveThreshold = 8;

    const isLikelyEmail = (value) => {
      const email = String(value || "").trim();
      return email !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const getOverlayPointerPosition = (event) => {
      if (!event || typeof event.clientX !== "number" || typeof event.clientY !== "number") {
        return null;
      }
      return { x: event.clientX, y: event.clientY };
    };

    const beginOverlayPointerClose = (key, event) => {
      if (!key) return;
      const target = event && event.target ? event.target : null;
      const currentTarget = event && event.currentTarget ? event.currentTarget : null;
      if (!target || !currentTarget || target !== currentTarget) {
        delete overlayClosePointerState[key];
        return;
      }
      overlayClosePointerState[key] = {
        pointerId: typeof event.pointerId === "number" ? event.pointerId : null,
        position: getOverlayPointerPosition(event),
      };
    };

    const cancelOverlayPointerClose = (key) => {
      if (!key) return;
      delete overlayClosePointerState[key];
    };

    const finishOverlayPointerClose = (key, closeFn, event) => {
      if (!key) return;
      const snapshot = overlayClosePointerState[key];
      delete overlayClosePointerState[key];
      if (!snapshot || typeof closeFn !== "function") return;
      const target = event && event.target ? event.target : null;
      const currentTarget = event && event.currentTarget ? event.currentTarget : null;
      if (!target || !currentTarget || target !== currentTarget) return;
      if (snapshot.pointerId !== null && typeof event.pointerId === "number" && snapshot.pointerId !== event.pointerId) return;
      const endPosition = getOverlayPointerPosition(event);
      if (snapshot.position && endPosition) {
        const deltaX = endPosition.x - snapshot.position.x;
        const deltaY = endPosition.y - snapshot.position.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > overlayClosePointerMoveThreshold) return;
      }
      closeFn();
    };

    const readSessionStorageValue = (key) => {
      if (typeof window === "undefined" || !window.sessionStorage) return "";
      try {
        return String(window.sessionStorage.getItem(key) || "");
      } catch (error) {
        return "";
      }
    };

    const writeSessionStorageValue = (key, value) => {
      if (typeof window === "undefined" || !window.sessionStorage) return;
      try {
        if (value === "" || value == null) {
          window.sessionStorage.removeItem(key);
          return;
        }
        window.sessionStorage.setItem(key, String(value));
      } catch (error) {
        // ignore sessionStorage write failures
      }
    };

    const clearCooldownTimer = (kind) => {
      if (kind === "verify") {
        if (!syncVerificationCooldownTimer) return;
        clearInterval(syncVerificationCooldownTimer);
        syncVerificationCooldownTimer = null;
        return;
      }
      if (kind === "verify-submit") {
        if (!syncVerificationSubmitCooldownTimer) return;
        clearInterval(syncVerificationSubmitCooldownTimer);
        syncVerificationSubmitCooldownTimer = null;
        return;
      }
      if (kind === "reset-request") {
        if (!syncResetCodeRequestCooldownTimer) return;
        clearInterval(syncResetCodeRequestCooldownTimer);
        syncResetCodeRequestCooldownTimer = null;
        return;
      }
      if (!syncEmailChangeCooldownTimer) return;
      clearInterval(syncEmailChangeCooldownTimer);
      syncEmailChangeCooldownTimer = null;
    };

    const getCooldownStateByKind = (kind) =>
      kind === "verify"
        ? {
            ref: state.syncVerificationCooldownSeconds,
            storageKey: syncVerificationCooldownSessionKey,
          }
        : kind === "verify-submit"
          ? {
              ref: state.syncVerificationSubmitCooldownSeconds,
              storageKey: syncVerificationSubmitCooldownSessionKey,
            }
        : kind === "reset-request"
          ? {
              ref: state.syncResetCodeRequestCooldownSeconds,
              storageKey: syncResetCodeRequestCooldownSessionKey,
            }
        : {
            ref: state.syncEmailChangeCooldownSeconds,
            storageKey: syncEmailChangeCooldownSessionKey,
          };

    const applyCooldownSeconds = (kind, seconds) => {
      const target = getCooldownStateByKind(kind);
      if (!target || !target.ref || !("value" in target.ref)) return;
      const total = Math.max(0, Number(seconds) || 0);
      target.ref.value = total;
      clearCooldownTimer(kind);
      if (total <= 0) {
        writeSessionStorageValue(target.storageKey, "");
        return;
      }
      const dueAt = Date.now() + total * 1000;
      writeSessionStorageValue(target.storageKey, String(dueAt));
      const tick = () => {
        const remaining = Math.max(0, Math.ceil((dueAt - Date.now()) / 1000));
        target.ref.value = remaining;
        if (remaining <= 0) {
          clearCooldownTimer(kind);
          writeSessionStorageValue(target.storageKey, "");
        }
      };
      tick();
      const timer = setInterval(tick, 1000);
      if (kind === "verify") {
        syncVerificationCooldownTimer = timer;
      } else if (kind === "verify-submit") {
        syncVerificationSubmitCooldownTimer = timer;
      } else if (kind === "reset-request") {
        syncResetCodeRequestCooldownTimer = timer;
      } else {
        syncEmailChangeCooldownTimer = timer;
      }
    };

    const restoreCooldownFromSession = (kind) => {
      const target = getCooldownStateByKind(kind);
      const dueAt = Number(readSessionStorageValue(target.storageKey) || 0);
      if (!Number.isFinite(dueAt) || dueAt <= Date.now()) {
        applyCooldownSeconds(kind, 0);
        return;
      }
      applyCooldownSeconds(kind, Math.ceil((dueAt - Date.now()) / 1000));
    };

    const startEmailActionCooldown = (kind, seconds) => {
      applyCooldownSeconds(kind, seconds);
      if (kind === 'verify') {
        applyCooldownSeconds('change', seconds);
      } else if (kind === 'change') {
        applyCooldownSeconds('verify', seconds);
      }
    };

    const getEmailActionCooldownRemaining = (kind) => {
      const target = getCooldownStateByKind(kind);
      if (!target || !target.ref || !("value" in target.ref)) return 0;
      const remaining = Number(target.ref.value || 0);
      return Number.isFinite(remaining) && remaining > 0 ? remaining : 0;
    };

    const getRefValue = (target, fallback) =>
      target && typeof target === "object" && "value" in target ? target.value : fallback;

    const isPlainObject = (value) =>
      Boolean(value) && typeof value === "object" && !Array.isArray(value);

    const readVersionInfo = () => {
      if (typeof window === "undefined") return {};
      const info = window.__APP_VERSION_INFO;
      return info && typeof info === "object" ? info : {};
    };

    const stableSerialize = (value) => {
      if (value === null) return "null";
      const type = typeof value;
      if (type === "number" || type === "boolean") return JSON.stringify(value);
      if (type === "string") return JSON.stringify(value);
      if (Array.isArray(value)) {
        return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
      }
      if (!isPlainObject(value)) return JSON.stringify(null);
      const keys = Object.keys(value).sort();
      return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
    };

    const hashText = (input) => {
      const text = String(input || "");
      let hash = 2166136261;
      for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return `h${(hash >>> 0).toString(16).padStart(8, "0")}`;
    };

    const cloneJson = (value, fallback) => {
      try {
        return JSON.parse(JSON.stringify(value == null ? fallback : value));
      } catch (error) {
        return fallback;
      }
    };

    const isLocalhostFrontend = () => {
      if (typeof window === "undefined" || !window.location) return false;
      return devHostPattern.test(String(window.location.hostname || ""));
    };

    const readSyncRegionAccessMode = () =>
      String(getRefValue(state.syncRegionAccessMode, isLocalhostFrontend() ? "available" : "checking") || "");

    const isOfficialSyncFrontend = () => {
      if (isLocalhostFrontend()) return true;
      return Boolean(getRefValue(state.isOfficialDeployment, false));
    };

    const getSyncFrontendBlockReason = () => {
      if (isLocalhostFrontend()) return "";
      if (!isOfficialSyncFrontend()) return "official_only";
      const accessMode = readSyncRegionAccessMode();
      if (accessMode === "cn-blocked") return "cn_region_unavailable";
      if (accessMode === "detect-failed") return "region_detection_failed";
      return "";
    };

    const isSyncFrontendAllowed = () => !getSyncFrontendBlockReason();

    const defaultWorkspaceConfig = cloneJson(getRefValue(state.recommendationConfig, {}), {});

    const normalizeWorkspace = (raw, options) => {
      const source = isPlainObject(raw) ? raw : {};
      const useCurrentFallback = Boolean(options && options.useCurrentFallback);
      const candidate = {
        selectedNames: Array.isArray(source.selectedNames)
          ? source.selectedNames.slice()
          : useCurrentFallback
            ? cloneJson(getRefValue(state.selectedNames, []), [])
            : [],
        schemeBaseSelections: cloneJson(
          source.schemeBaseSelections,
          useCurrentFallback ? cloneJson(getRefValue(state.schemeBaseSelections, {}), {}) : {}
        ),
        recommendationConfig: cloneJson(
          source.recommendationConfig,
          useCurrentFallback ? cloneJson(getRefValue(state.recommendationConfig, {}), {}) : defaultWorkspaceConfig
        ),
        filterS1: Array.isArray(source.filterS1)
          ? source.filterS1.slice()
          : useCurrentFallback
            ? cloneJson(getRefValue(state.filterS1, []), [])
            : [],
        filterS2: Array.isArray(source.filterS2)
          ? source.filterS2.slice()
          : useCurrentFallback
            ? cloneJson(getRefValue(state.filterS2, []), [])
            : [],
        filterS3: Array.isArray(source.filterS3)
          ? source.filterS3.slice()
          : useCurrentFallback
            ? cloneJson(getRefValue(state.filterS3, []), [])
            : [],
        selectedRegions: Array.isArray(source.selectedRegions)
          ? source.selectedRegions.slice()
          : useCurrentFallback
            ? cloneJson(getRefValue(state.selectedRegions, []), [])
            : [],
        equipRefiningSelectedName:
          typeof source.equipRefiningSelectedName === "string"
            ? source.equipRefiningSelectedName
            : useCurrentFallback
              ? String(getRefValue(state.equipRefiningSelectedName, "") || "")
              : "",
        weaponAttrOverrides: cloneJson(
          source.weaponAttrOverrides,
          useCurrentFallback ? cloneJson(getRefValue(state.weaponAttrOverrides, {}), {}) : {}
        ),
        showWeaponAttrs:
          typeof source.showWeaponAttrs === "boolean"
            ? source.showWeaponAttrs
            : useCurrentFallback
              ? Boolean(getRefValue(state.showWeaponAttrs, false))
              : false,
        showWeaponOwnershipInList:
          typeof source.showWeaponOwnershipInList === "boolean"
            ? source.showWeaponOwnershipInList
            : typeof source.showWeaponOwnership === "boolean"
              ? source.showWeaponOwnership
              : useCurrentFallback
                ? Boolean(getRefValue(state.showWeaponOwnershipInList, false))
                : false,
        showWeaponOwnershipInPlans:
          typeof source.showWeaponOwnershipInPlans === "boolean"
            ? source.showWeaponOwnershipInPlans
            : typeof source.showWeaponOwnership === "boolean"
              ? source.showWeaponOwnership
              : useCurrentFallback
                ? Boolean(getRefValue(state.showWeaponOwnershipInPlans, true))
                : true,
        showAllSchemes:
          typeof source.showAllSchemes === "boolean"
            ? source.showAllSchemes
            : useCurrentFallback
              ? Boolean(getRefValue(state.showAllSchemes, false))
              : false,
      };
      if (typeof state.sanitizeUiState === "function") {
        return state.sanitizeUiState(candidate) || {};
      }
      return candidate;
    };

    const normalizeExcludedPlannerFields = (planner) => {
      if (!isPlainObject(planner) || !Array.isArray(planner.excludedFields)) return [];
      return planner.excludedFields
        .map((field) => String(field || "").trim())
        .filter((field, index, list) => field && list.indexOf(field) === index)
        .sort();
    };

    const normalizeComparableData = (raw, options) => {
      const source = isPlainObject(raw) ? raw : {};
      const planner = isPlainObject(source.planner) ? source.planner : source;
      const excludedFields = normalizeExcludedPlannerFields(planner);
      const customWeaponsExcluded = excludedFields.includes("customWeapons");
      const hasCustomWeaponsField = Object.prototype.hasOwnProperty.call(planner, "customWeapons");
      const marksSource = isPlainObject(planner.marks) && "items" in planner.marks
        ? planner.marks.items
        : planner.marks;
      const customWeaponsSource = isPlainObject(planner.customWeapons) && "items" in planner.customWeapons
        ? planner.customWeapons.items
        : planner.customWeapons;
      const workspaceSource = isPlainObject(planner.workspace) ? planner.workspace : {};
      const comparable = {
        marks:
          typeof state.normalizeWeaponMarks === "function"
            ? state.normalizeWeaponMarks(marksSource)
            : cloneJson(marksSource, {}),
        workspace: normalizeWorkspace(workspaceSource, options),
      };
      if (excludedFields.length > 0) {
        comparable.excludedFields = excludedFields;
      }
      if (hasCustomWeaponsField || !customWeaponsExcluded) {
        comparable.customWeapons =
          typeof state.sanitizeCustomWeapons === "function"
            ? state.sanitizeCustomWeapons(customWeaponsSource)
            : cloneJson(customWeaponsSource, []);
      }
      return comparable;
    };

    const normalizeDurableComparableData = (raw, options) => {
      const comparable = normalizeComparableData(raw, options);
      const workspace = isPlainObject(comparable.workspace) ? comparable.workspace : {};
      comparable.workspace = Object.assign({}, workspace);
      return comparable;
    };

    const buildComparableHash = (raw, options) =>
      hashText(stableSerialize(normalizeDurableComparableData(raw, options)));

    const getCurrentPlanTier = () =>
      String(state.syncUser && state.syncUser.value && state.syncUser.value.plan_tier || "free");

    const isPremiumPlanTier = (planTier) => String(planTier || "free") === "premium";

    const buildLocalComparable = (options) => {
      const planTier = options && options.planTier ? String(options.planTier) : getCurrentPlanTier();
      const comparable = normalizeComparableData({
        marks: cloneJson(getRefValue(state.weaponMarks, {}), {}),
        customWeapons: cloneJson(getRefValue(state.customWeapons, []), []),
        workspace: normalizeWorkspace({}, { useCurrentFallback: true }),
      }, { useCurrentFallback: true });
      if (!isPremiumPlanTier(planTier)) {
        delete comparable.customWeapons;
        comparable.excludedFields = ["customWeapons"];
      }
      return comparable;
    };

    const buildLocalPayload = () => {
      const now = new Date().toISOString();
      const versionInfo = readVersionInfo();
      const planTier = getCurrentPlanTier();
      const comparable = buildLocalComparable({ planTier });
      const isPremium = isPremiumPlanTier(planTier);
      const planner = {
        marks: {
          updatedAt: now,
          items: comparable.marks,
        },
        workspace: Object.assign({ updatedAt: now }, comparable.workspace),
      };
      // Free users: exclude customWeapons from upload payload
      if (isPremium) {
        planner.customWeapons = {
          updatedAt: now,
          items: comparable.customWeapons,
        };
      } else {
        planner.excludedFields = ["customWeapons"];
      }
      return {
        schemaVersion: 1,
        capturedAt: now,
        source: {
          app: "endfield-essence-planner",
          buildId: String(versionInfo.buildId || ""),
          displayVersion: String(versionInfo.displayVersion || ""),
          host:
            typeof window !== "undefined" && window.location ? String(window.location.host || "") : "",
        },
        planner,
      };
    };

    const clearAutoSyncCountdownTimer = () => {
      if (autoSyncCountdownTimer) {
        clearInterval(autoSyncCountdownTimer);
        autoSyncCountdownTimer = null;
      }
    };

    const canAttemptAutoSyncForHash = (hash) => {
      const currentHash = String(hash || "");
      if (!currentHash) return false;
      if (lastAutoSyncAttemptHash !== currentHash) return true;
      return lastAutoSyncAttemptCount < maxAutoSyncAttemptsPerHash;
    };

    const noteAutoSyncAttemptForHash = (hash) => {
      const currentHash = String(hash || "");
      if (!currentHash) return;
      if (lastAutoSyncAttemptHash !== currentHash) {
        lastAutoSyncAttemptHash = currentHash;
        lastAutoSyncAttemptCount = 0;
      }
      lastAutoSyncAttemptCount += 1;
    };

    const clearAutoSyncAttemptState = () => {
      lastAutoSyncAttemptHash = "";
      lastAutoSyncAttemptCount = 0;
    };

    const isAutoSyncRetryExhaustedForHash = (hash) => {
      const currentHash = String(hash || "");
      return Boolean(
        currentHash &&
        lastAutoSyncAttemptHash === currentHash &&
        lastAutoSyncAttemptCount >= maxAutoSyncAttemptsPerHash
      );
    };

    const ensureAutoSyncCountdownTimer = () => {
      clearAutoSyncCountdownTimer();
      if (!state.syncAutoSyncDueAt || !("value" in state.syncAutoSyncDueAt) || !state.syncAutoSyncDueAt.value) return;
      if (!state.syncAutoSyncClock || !("value" in state.syncAutoSyncClock)) return;
      state.syncAutoSyncClock.value = Date.now();
      autoSyncCountdownTimer = setInterval(() => {
        state.syncAutoSyncClock.value = Date.now();
        if (!state.syncAutoSyncDueAt.value || state.syncAutoSyncDueAt.value <= Date.now()) {
          clearAutoSyncCountdownTimer();
        }
      }, 1000);
    };

    const clearAutoSyncTimer = () => {
      if (autoSyncTimer) {
        clearTimeout(autoSyncTimer);
        autoSyncTimer = null;
      }
      clearAutoSyncCountdownTimer();
      if (state.syncAutoSyncDueAt && "value" in state.syncAutoSyncDueAt) {
        state.syncAutoSyncDueAt.value = 0;
      }
      if (state.syncAutoSyncClock && "value" in state.syncAutoSyncClock) {
        state.syncAutoSyncClock.value = Date.now();
      }
    };

    const scheduleAutoSync = () => {
      clearAutoSyncTimer();
      if (!state.syncAuthenticated.value || state.syncBusy.value || state.syncConflictDetected.value) return;
      const currentHash = String(state.syncCurrentComparableHash.value || "");
      const lastHash = String(state.syncLastLocalHash.value || "");
      if (!currentHash || currentHash === lastHash || !canAttemptAutoSyncForHash(currentHash)) return;
      state.syncAutoSyncDueAt.value = Date.now() + autoSyncDelayMs;
      ensureAutoSyncCountdownTimer();
      autoSyncTimer = setTimeout(() => {
        autoSyncTimer = null;
        state.syncAutoSyncDueAt.value = 0;
        clearAutoSyncCountdownTimer();
        if (!state.syncAuthenticated.value || state.syncBusy.value || state.syncConflictDetected.value) return;
        const liveHash = String(state.syncCurrentComparableHash.value || "");
        const syncedHash = String(state.syncLastLocalHash.value || "");
        if (!liveHash || liveHash === syncedHash || !canAttemptAutoSyncForHash(liveHash)) return;
        noteAutoSyncAttemptForHash(liveHash);
        performManualSync({ source: "auto" });
      }, autoSyncDelayMs);
    };

    const summarizePayload = (payload, version, updatedAt) => {
      const comparable = normalizeComparableData(payload);
      return {
        version: Number.isFinite(Number(version)) ? Number(version) : 0,
        updatedAt: String(
          updatedAt ||
            (payload && payload.capturedAt) ||
            (payload && payload.planner && payload.planner.workspace && payload.planner.workspace.updatedAt) ||
            ""
        ),
        marksCount: Object.keys(comparable.marks || {}).length,
        customWeaponsCount: Array.isArray(comparable.customWeapons) ? comparable.customWeapons.length : 0,
        selectedCount: Array.isArray(comparable.workspace.selectedNames)
          ? comparable.workspace.selectedNames.length
          : 0,
      };
    };

    const hasMeaningfulLocalData = (payload) => {
      const summary = summarizePayload(payload, 0, "");
      if (summary.marksCount > 0 || summary.customWeaponsCount > 0 || summary.selectedCount > 0) {
        return true;
      }
      const comparable = normalizeComparableData(payload);
      const workspace = comparable.workspace || {};
      if (workspace.recommendationConfig && Object.keys(workspace.recommendationConfig).length > 0) {
        return true;
      }
      if (workspace.schemeBaseSelections && Object.keys(workspace.schemeBaseSelections).length > 0) {
        return true;
      }
      if (workspace.weaponAttrOverrides && Object.keys(workspace.weaponAttrOverrides).length > 0) {
        return true;
      }
      if (Array.isArray(workspace.selectedRegions) && workspace.selectedRegions.length > 0) {
        return true;
      }
      return false;
    };

    const readJsonStorage = (key, fallback) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return cloneJson(fallback, fallback);
        const parsed = JSON.parse(raw);
        return isPlainObject(parsed) || Array.isArray(parsed) ? parsed : cloneJson(fallback, fallback);
      } catch (error) {
        return cloneJson(fallback, fallback);
      }
    };

    const writeJsonStorage = (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        if (typeof state.reportStorageIssue === "function") {
          state.reportStorageIssue("storage.write", key, error, {
            scope: "sync.persist",
          });
        }
      }
    };

    const pushSyncToast = (tone, titleKey, summaryKey, fallbackTitle, fallbackSummary, signature, options) => {
      if (typeof state.pushToastNotice !== "function") return;
      const summary = summaryKey && typeof state.t === "function"
        ? state.t(summaryKey, options && options.summaryParams ? options.summaryParams : undefined)
        : fallbackSummary;
      state.pushToastNotice(
        {
          title: typeof state.t === "function" ? state.t(titleKey) : fallbackTitle,
          summary,
          tone,
          icon: tone === "danger" ? "!" : tone === "success" ? "✓" : "i",
          durationMs: options && Number.isFinite(options.durationMs)
            ? options.durationMs
            : (tone === "danger" ? 9000 : 3600),
          signature,
          ariaLabel: typeof state.t === "function" ? state.t(titleKey) : fallbackTitle,
          onActivate: options && typeof options.onActivate === "function" ? options.onActivate : null,
        },
        {
          signature,
          dedupWindowMs: 1200,
        }
      );
    };

    const openSyncModalFromConflictToast = () => {
      suppressNextConflictToastUntil = Date.now() + 6000;
      if (typeof state.openSyncModal === "function") {
        state.openSyncModal();
      }
    };

    const dismissConflictToast = () => {
      if (typeof state.dismissToastNoticeBySignature !== "function") return;
      state.dismissToastNoticeBySignature(syncConflictToastSignature);
    };

    const pushSyncConflictToast = (options) => {
      if (typeof state.pushToastNotice !== "function") return;
      const dedupWindowMs = Number(
        options && Number.isFinite(options.dedupWindowMs) ? options.dedupWindowMs : 0
      );
      state.pushToastNotice(
        {
          title: getSyncText("sync.conflict_title", "检测到冲突"),
          summary: getSyncText(
            "sync.error_conflict",
            "检测到同步冲突，请先确认当前设备还是云端数据应保留为最新版本。"
          ),
          tone: "warning",
          icon: "!",
          durationMs: 9000,
          signature: syncConflictToastSignature,
          ariaLabel: getSyncText("sync.conflict_title", "检测到冲突"),
          onActivate: openSyncModalFromConflictToast,
        },
        {
          signature: syncConflictToastSignature,
          dedupWindowMs,
        }
      );
    };

    const pushSyncReauthToast = () => {
      if (typeof state.pushToastNotice !== "function") return;
      state.pushToastNotice(
        {
          title: getSyncText("sync.session_expired_title", "登录状态已失效"),
          summary: getSyncText("sync.session_expired_summary", "点击这里重新打开登录面板。"),
          tone: "warning",
          icon: "!",
          onActivate: typeof state.openSyncModal === "function" ? () => state.openSyncModal() : null,
          durationMs: 9000,
          signature: "sync-session-expired",
          ariaLabel: getSyncText("sync.session_expired_title", "登录状态已失效"),
        },
        {
          signature: "sync-session-expired",
          dedupWindowMs: 3000,
        }
      );
    };

    const formatSyncStatusTime = (timestamp) => {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (Number.isNaN(date.getTime())) return "";
      const locale = getRefValue(state.locale, undefined);
      try {
        return date.toLocaleTimeString(locale || undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      } catch (error) {
        return date.toLocaleTimeString();
      }
    };

    const readSessionHint = () => {
      try {
        return localStorage.getItem(syncSessionHintStorageKey) === "1";
      } catch (error) {
        return false;
      }
    };

    const writeSessionHint = (enabled) => {
      try {
        if (enabled) {
          localStorage.setItem(syncSessionHintStorageKey, "1");
          return;
        }
        localStorage.removeItem(syncSessionHintStorageKey);
      } catch (error) {
        // ignore storage failures for non-sensitive session hint
      }
    };

    const readSyncAuthToken = () => {
      try {
        return String(localStorage.getItem(syncAuthTokenStorageKey) || "").trim();
      } catch (error) {
        return "";
      }
    };

    const writeSyncAuthToken = (token) => {
      try {
        if (token) {
          localStorage.setItem(syncAuthTokenStorageKey, String(token));
          return;
        }
        localStorage.removeItem(syncAuthTokenStorageKey);
      } catch (error) {
        // ignore storage failures for auth token persistence
      }
    };

    const readLegacyMigrationAttempted = () =>
      readSessionStorageValue(syncLegacyMigrationAttemptSessionKey) === "1";

    const writeLegacyMigrationAttempted = (enabled) => {
      writeSessionStorageValue(syncLegacyMigrationAttemptSessionKey, enabled ? "1" : "");
    };

    const clearSyncAuthToken = () => {
      writeSyncAuthToken("");
      writeLegacyMigrationAttempted(false);
    };

    const storeSyncAuthToken = (result) => {
      const token = result && typeof result.token === "string"
        ? String(result.token || "").trim()
        : "";
      if (!token) return "";
      writeSyncAuthToken(token);
      writeLegacyMigrationAttempted(false);
      return token;
    };

    const getSyncAuthorizationHeader = () => {
      const token = readSyncAuthToken();
      return token ? `Bearer ${token}` : "";
    };

    const formatSyncDateTime = (value) => {
      const text = String(value || "").trim();
      if (!text) return "";
      const date = new Date(text);
      if (Number.isNaN(date.getTime())) return text;
      const locale = getRefValue(state.locale, undefined);
      try {
        return new Intl.DateTimeFormat(locale || undefined, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(date);
      } catch (error) {
        return date.toLocaleString();
      }
    };

    const createSyncTextEntry = (key, fallback, params) => ({
      key: String(key || ""),
      fallback: String(fallback || ""),
      params: isPlainObject(params) ? cloneJson(params, {}) : null,
    });

    const coerceSyncText = (value, fallback) => {
      if (typeof value === "string") return value.trim();
      if (typeof value === "number" || typeof value === "boolean") return String(value);
      if (isPlainObject(value)) {
        if (typeof value.message === "string" && value.message.trim()) return value.message.trim();
        if (typeof value.error === "string" && value.error.trim()) return value.error.trim();
        if (typeof value.code === "string" && value.code.trim()) return value.code.trim();
      }
      return String(fallback || "").trim();
    };

    const resolveSyncEntry = (message) => {
      if (isPlainObject(message) && typeof message.key === "string" && message.key) {
        const translated = getSyncText(message.key, message.fallback || message.key, message.params || undefined);
        return {
          text: coerceSyncText(translated, message.fallback || message.key),
          messageKey: String(message.key || ""),
          params: isPlainObject(message.params) ? cloneJson(message.params, {}) : null,
        };
      }
      return {
        text: coerceSyncText(message, ""),
        messageKey: "",
        params: null,
      };
    };

    const sanitizeErrorDetails = (obj) => {
      const sensitiveKeys = ['password', 'token', 'secret', 'key', 'hash', 'authorization', 'cookie', 'session', 'code'];
      const stringSensitivePatterns = [
        /(bearer\s+[a-z0-9._-]+)/i,
        /([a-f0-9]{32,})/i,
        /(cookie\s*[:=]\s*[^\s]+)/i,
      ];
      const seen = new WeakSet();

      const maskString = (value) => {
        let text = String(value);
        stringSensitivePatterns.forEach((pattern) => {
          text = text.replace(pattern, '***');
        });
        if (text.length > 4000) {
          text = `${text.slice(0, 4000)}\n...<truncated>`;
        }
        return text;
      };

      const traverse = (o, depth = 0) => {
        if (depth > 8) return '...<max depth>';
        if (typeof o === 'string') return maskString(o);
        if (typeof o !== 'object' || o === null) return o;
        if (seen.has(o)) return '...<circular reference>';
        seen.add(o);
        const result = Array.isArray(o) ? [] : {};
        for (const [k, v] of Object.entries(o)) {
          if (sensitiveKeys.some(sk => String(k).toLowerCase().includes(sk))) {
            result[k] = '***';
          } else {
            result[k] = traverse(v, depth + 1);
          }
        }
        return result;
      };

      const json = JSON.stringify(traverse(obj), null, 2);
      if (!json) return '';
      return json.length > 12000 ? `${json.slice(0, 12000)}\n...<truncated>` : json;
    };

    const buildSyncErrorDetails = (error, context) => sanitizeErrorDetails({
      diagnostics: Object.assign(
        {
          status: error?.status || 'N/A',
          type: error?.name || error?.constructor?.name || 'Error',
          code: extractSyncErrorCode(error && error.payload ? error.payload.error : error && error.message) || 'unknown',
          endpoint: context?.endpoint || error?.requestContext?.endpoint || 'unknown',
          method: context?.method || error?.requestContext?.method || 'GET',
          syncMode: context?.syncMode || error?.requestContext?.syncMode || '',
          url: context?.url || error?.requestContext?.url || '',
        },
        context?.extra || null
      ),
      rawMessage: error?.message || '',
      payload: error?.payload,
    });

    const setSyncError = (message, details = "") => {
      const entry = resolveSyncEntry(message);
      const text = String(entry.text || "");
      state.syncError.value = text;
      state.syncErrorDetails.value = details;
      state.syncNotice.value = "";
    };

    const setSyncNotice = (message, tone) => {
      const entry = resolveSyncEntry(message);
      const text = String(entry.text || "");
      state.syncNotice.value = text;
      state.syncError.value = "";
      state.syncErrorDetails.value = "";
    };

    const persistMeta = (meta) => {
      const next = Object.assign({}, defaultMeta, isPlainObject(meta) ? meta : {});
      state.syncLastSyncedServerVersion.value = Number(next.serverVersion || 0);
      state.syncLastSyncedAt.value = String(next.syncedAt || "");
      state.syncLastRemoteUpdatedAt.value = String(next.remoteUpdatedAt || "");
      state.syncLastLocalHash.value = String(next.localHash || "");
      writeJsonStorage(syncMetaStorageKey, next);
    };

    const persistPrefs = () => {
      writeJsonStorage(syncPrefsStorageKey, {
        successToastEnabled: Boolean(state.syncSuccessToastEnabled.value),
        autoSyncEnabled: Boolean(state.syncAutoSyncEnabled.value),
      });
    };

    const persistDevSettings = () => {
      writeJsonStorage(syncDevStorageKey, {
        apiBase: String(state.syncApiBaseInput.value || ""),
        headerName: String(state.syncDevHeaderNameInput.value || ""),
        headerValue: String(state.syncDevHeaderValueInput.value || ""),
      });
    };

    const resolveApiBase = () => {
      if (!isLocalhostFrontend()) return getDefaultApiBase();
      const raw = String(state.syncApiBaseInput.value || "").trim();
      if (!raw) return getDefaultApiBase();
      return raw.replace(/\/+$/, "");
    };

    const buildApiUrl = (endpoint, query) => {
      const base = `${resolveApiBase()}/${endpoint}`;
      if (!isPlainObject(query)) return base;
      const params = new URLSearchParams();
      Object.keys(query).forEach((key) => {
        const value = query[key];
        if (value === undefined || value === null || value === "") return;
        params.set(key, String(value));
      });
      const search = params.toString();
      return search ? `${base}?${search}` : base;
    };

    const shouldSkipAutoRefresh = () =>
      isLocalhostFrontend() && (
        String(state.syncDevHeaderNameInput.value || "").trim() === "" ||
        String(state.syncDevHeaderValueInput.value || "").trim() === ""
      );

    const getOfficialOnlyEntry = () =>
      createSyncTextEntry("sync.error_official_only", "同步功能仅在官方网站 https://end.canmoe.com 可用");

    const getMainlandRegionUnavailableEntry = () =>
      createSyncTextEntry("sync.error_mainland_unavailable", "中国大陆地区暂不提供云服务。");

    const getRegionDetectionFailedEntry = () =>
      createSyncTextEntry("sync.error_region_detection_failed", "地区检测失败，请稍后刷新重试。");

    const getSyncFrontendBlockedEntry = () =>
      getSyncFrontendBlockReason() === "cn_region_unavailable"
        ? getMainlandRegionUnavailableEntry()
        : getSyncFrontendBlockReason() === "region_detection_failed"
          ? getRegionDetectionFailedEntry()
          : getOfficialOnlyEntry();

    const ensureSyncFrontendAllowed = (options) => {
      if (isSyncFrontendAllowed()) return true;
      if (!options || !options.silent) {
        setSyncError(getSyncFrontendBlockedEntry());
      }
      return false;
    };

    const isDocumentVisible = () =>
      typeof document === "undefined" || document.visibilityState !== "hidden";

    const getSyncRequestHeaders = (options) => {
      const headers = {};
      if (options && options.body != null) {
        headers["Content-Type"] = "application/json";
      }
      if (isLocalhostFrontend()) {
        const headerName = String(state.syncDevHeaderNameInput.value || "").trim();
        const headerValue = String(state.syncDevHeaderValueInput.value || "").trim();
        if (headerValue && devHeaderNamePattern.test(headerName)) {
          headers[headerName] = headerValue;
        }
      }
      return headers;
    };

    const isTurnstileEnabled = () => String(syncTurnstileSiteKey || "").trim() !== "";

    const isTurnstileApiReady = () =>
      typeof window !== "undefined" &&
      window.turnstile &&
      typeof window.turnstile.render === "function";

    const setSyncTurnstileMessage = (key, fallback, tone) => {
      state.syncTurnstileMessageKey.value = String(key || "");
      state.syncTurnstileMessageFallback.value = String(fallback || "");
      state.syncTurnstileMessageTone.value =
        tone === "error" || tone === "warning" ? tone : "info";
    };

    const clearSyncTurnstileMessage = () => {
      state.syncTurnstileMessageKey.value = "";
      state.syncTurnstileMessageFallback.value = "";
      state.syncTurnstileMessageTone.value = "info";
    };

    const loadTurnstileScript = () => {
      if (!isTurnstileEnabled()) {
        return Promise.reject(new Error("turnstile_site_key_missing"));
      }
      if (isTurnstileApiReady()) return Promise.resolve(window.turnstile);
      if (syncTurnstileLoadPromise) return syncTurnstileLoadPromise;
      syncTurnstileLoadPromise = new Promise((resolve, reject) => {
        if (typeof document === "undefined") {
          reject(new Error("turnstile_document_missing"));
          return;
        }
        let settled = false;
        const finishResolve = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          resolve(window.turnstile);
        };
        const finishReject = (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          reject(error);
        };
        const timeoutId = setTimeout(() => {
          finishReject(new Error("turnstile_script_timeout"));
        }, 12000);
        const existing = document.querySelector(
          'script[data-sync-turnstile="1"], script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
        );
        const finish = () => {
          if (!isTurnstileApiReady()) {
            finishReject(new Error("turnstile_api_missing"));
            return;
          }
          finishResolve();
        };
        if (existing) {
          if (isTurnstileApiReady()) {
            finishResolve();
            return;
          }
          existing.remove();
        }
        const script = document.createElement("script");
        script.src = syncTurnstileScriptSrc;
        script.async = true;
        script.defer = true;
        script.setAttribute("data-sync-turnstile", "1");
        script.addEventListener("load", finish, { once: true });
        script.addEventListener("error", () => finishReject(new Error("turnstile_script_load_failed")), { once: true });
        document.head.appendChild(script);
      }).catch((error) => {
        syncTurnstileLoadPromise = null;
        throw error;
      });
      return syncTurnstileLoadPromise;
    };

    const clearSyncTurnstileToken = () => {
      if (!state.syncTurnstileToken || !("value" in state.syncTurnstileToken)) return;
      state.syncTurnstileToken.value = "";
    };

    const destroySyncTurnstileWidget = () => {
      syncTurnstileMountVersion += 1;
      syncTurnstileMountPromise = null;
      const widgetId = state.syncTurnstileWidgetId && "value" in state.syncTurnstileWidgetId
        ? state.syncTurnstileWidgetId.value
        : null;
      if (widgetId != null && isTurnstileApiReady() && typeof window.turnstile.remove === "function") {
        try {
          window.turnstile.remove(widgetId);
        } catch (error) {
          // ignore widget cleanup failures
        }
      }
      if (state.syncTurnstileWidgetId && "value" in state.syncTurnstileWidgetId) {
        state.syncTurnstileWidgetId.value = null;
      }
      clearSyncTurnstileToken();
      if (state.syncTurnstileRef && "value" in state.syncTurnstileRef && state.syncTurnstileRef.value) {
        state.syncTurnstileRef.value.innerHTML = "";
      }
    };

    const resetSyncTurnstileWidget = (options) => {
      clearSyncTurnstileToken();
      if (state.syncTurnstileUnavailable && "value" in state.syncTurnstileUnavailable) {
        state.syncTurnstileUnavailable.value = false;
      }
      const widgetId = state.syncTurnstileWidgetId && "value" in state.syncTurnstileWidgetId
        ? state.syncTurnstileWidgetId.value
        : null;
      if (widgetId != null && isTurnstileApiReady() && typeof window.turnstile.reset === "function") {
        try {
          window.turnstile.reset(widgetId);
          return;
        } catch (error) {
          // fall back to full re-render
        }
      }
      destroySyncTurnstileWidget();
      if (!options || !options.skipRemount) {
        void mountSyncTurnstile();
      }
    };

    const mountSyncTurnstile = async () => {
      if (!isTurnstileEnabled() || state.syncAuthenticated.value || !state.showSyncModal.value) return;
      if (state.syncFrontendBlocked.value) return;
      if (state.syncTurnstileWidgetId.value != null) return;
      if (syncTurnstileMountPromise) return syncTurnstileMountPromise;
      const mountVersion = syncTurnstileMountVersion;
      syncTurnstileMountPromise = (async () => {
        if (typeof nextTick === "function") {
          await nextTick();
        }
        if (mountVersion !== syncTurnstileMountVersion) return;
        const container = state.syncTurnstileRef && "value" in state.syncTurnstileRef
          ? state.syncTurnstileRef.value
          : null;
        if (!container || state.syncTurnstileWidgetId.value != null) return;
        if (state.syncTurnstileLoading && "value" in state.syncTurnstileLoading) {
          state.syncTurnstileLoading.value = true;
        }
        if (state.syncTurnstileUnavailable && "value" in state.syncTurnstileUnavailable) {
          state.syncTurnstileUnavailable.value = false;
        }
        setSyncTurnstileMessage("sync.turnstile_loading", "正在加载人机验证…", "info");
        clearSyncTurnstileToken();
        container.innerHTML = "";
        try {
          await loadTurnstileScript();
        } catch (error) {
          if (mountVersion !== syncTurnstileMountVersion) return;
          state.syncTurnstileLoading.value = false;
          state.syncTurnstileUnavailable.value = true;
          setSyncTurnstileMessage(
            "sync.error_turnstile_unavailable",
            "Verification is temporarily unavailable. Please try again later.",
            "warning"
          );
          return;
        }
        if (mountVersion !== syncTurnstileMountVersion) return;
        if (!isTurnstileApiReady()) {
          state.syncTurnstileLoading.value = false;
          state.syncTurnstileUnavailable.value = true;
          setSyncTurnstileMessage(
            "sync.error_turnstile_unavailable",
            "Verification is temporarily unavailable. Please try again later.",
            "warning"
          );
          return;
        }
        try {
          if (mountVersion !== syncTurnstileMountVersion) return;
          state.syncTurnstileWidgetId.value = window.turnstile.render(container, {
            sitekey: syncTurnstileSiteKey,
            action: syncTurnstileAction,
            theme: "auto",
            size: "flexible",
            callback: (token) => {
              state.syncTurnstileToken.value = String(token || "");
              state.syncTurnstileUnavailable.value = false;
              clearSyncTurnstileMessage();
            },
            "expired-callback": () => {
              clearSyncTurnstileToken();
              setSyncTurnstileMessage(
                "sync.error_turnstile_expired",
                "Verification expired. Please complete it again.",
                "warning"
              );
              resetSyncTurnstileWidget({ skipRemount: false });
            },
            "timeout-callback": () => {
              clearSyncTurnstileToken();
              setSyncTurnstileMessage(
                "sync.error_turnstile_expired",
                "Verification expired. Please complete it again.",
                "warning"
              );
              resetSyncTurnstileWidget({ skipRemount: false });
            },
            "error-callback": () => {
              clearSyncTurnstileToken();
              state.syncTurnstileUnavailable.value = true;
              setSyncTurnstileMessage(
                "sync.error_turnstile_failed",
                "Verification failed. Please retry.",
                "warning"
              );
            },
          });
          clearSyncTurnstileMessage();
        } catch (error) {
          state.syncTurnstileUnavailable.value = true;
          setSyncTurnstileMessage(
            "sync.error_turnstile_unavailable",
            "Verification is temporarily unavailable. Please try again later.",
            "warning"
          );
        } finally {
          state.syncTurnstileLoading.value = false;
        }
      })();
      try {
        await syncTurnstileMountPromise;
      } finally {
        syncTurnstileMountPromise = null;
      }
    };

    const extractSyncErrorCode = (value) => {
      if (typeof value === "string" || typeof value === "number") {
        return String(value || "").trim();
      }
      if (!isPlainObject(value)) return "";
      if (typeof value.code === "string" && value.code.trim()) return value.code.trim();
      if (typeof value.error === "string" && value.error.trim()) return value.error.trim();
      if (typeof value.message === "string" && value.message.trim()) return value.message.trim();
      return "";
    };

    const translateSyncError = (code) => {
      const map = {
        invalid_credentials: "sync.error_invalid_credentials",
        invalid_username: "sync.error_invalid_username",
        username_taken: "sync.error_username_taken",
        weak_password: "sync.error_weak_password",
        invalid_current_password: "sync.error_invalid_current_password",
        bad_request: "sync.error_bad_request",
        invalid_reset_code: "sync.error_invalid_reset_code",
        missing_reset_code: "sync.error_missing_reset_code",
        reset_code_unavailable: "sync.error_reset_code_unavailable",
        reset_email_unavailable: "sync.error_reset_email_unavailable",
        reset_code_issue_failed: "sync.error_reset_code_issue_failed",
        password_mismatch: "sync.error_password_mismatch",
        account_disabled: "sync.error_account_disabled",
        missing_reset_password_account: "sync.error_missing_reset_password_account",
        missing_new_password_fields: "sync.error_missing_new_password_fields",
        email_unavailable: "sync.error_email_unavailable",
        email_unchanged: "sync.error_email_unchanged",
        email_send_failed: "sync.error_email_send_failed",
        email_domain_unsupported: "sync.error_email_domain_unsupported",
        email_verification_issue_failed: "sync.error_email_verification_issue_failed",
        smtp_disabled: "sync.error_smtp_disabled",
        smtp_config_invalid: "sync.error_smtp_config_invalid",
        smtp_connect_failed: "sync.error_smtp_connect_failed",
        smtp_rejected: "sync.error_smtp_rejected",
        email_taken: "sync.error_email_taken",
        missing_verification_code: "sync.error_missing_verification_code",
        invalid_verification_code: "sync.error_invalid_verification_code",
        invalid_payment_claim: "sync.error_invalid_payment_claim",
        merchant_order_no_required_for_alipay: "sync.error_merchant_order_required",
        payment_claim_duplicate: "sync.error_payment_claim_duplicate",
        payment_claim_failed: "sync.error_payment_claim_failed",
        register_conflict: "sync.error_register_conflict",
        unauthorized: "sync.error_unauthorized",
        invalid_payload: "sync.error_invalid_payload",
        payload_too_large: "sync.error_payload_too_large",
        auth_failed: "sync.error_auth_failed",
        premium_required: "sync.error_premium_required",
        email_verification_required: "sync.error_email_verification_required",
        turnstile_required: "sync.error_turnstile_required",
        turnstile_failed: "sync.error_turnstile_failed",
        turnstile_unavailable: "sync.error_turnstile_unavailable",
        dev_token_required: "sync.error_dev_token_required",
        forbidden_host: "sync.error_forbidden_host",
        origin_not_allowed: "sync.error_origin_not_allowed",
        official_only: "sync.error_official_only",
        forbidden: "sync.error_official_only",
        https_required: "sync.error_https_required",
        rate_limited: "sync.error_rate_limited",
        custom_weapons_not_allowed: "sync.error_custom_weapons_not_allowed",
        sync_failed: "sync.error_sync_failed",
        api_abuse_blocked: "sync.error_api_abuse_blocked",
        // ── Previously missing backend error codes ──
        missing_credentials: "sync.error_missing_credentials",
        invalid_email: "sync.error_invalid_email",
        weak_password: "sync.error_weak_password",
        turnstile_verification_failed: "sync.error_turnstile_failed",
        invalid_session: "sync.error_invalid_session",
        session_expired: "sync.error_session_expired",
        missing_token: "sync.error_missing_token",
        email_already_verified: "sync.error_email_already_verified",
        missing_code: "sync.error_missing_verification_code",
        no_email: "sync.error_no_pending_email",
        version_conflict: "sync.error_conflict",
        invalid_json: "sync.error_invalid_payload",
        user_not_found: "sync.error_invalid_session",
        temporarily_blocked: "sync.error_rate_limited",
        invalid_host: "sync.error_forbidden_host",
        rate_limit_exceeded: "sync.error_rate_limited",
        missing_email: "sync.error_invalid_email",
        missing_fields: "sync.error_bad_request",
        invalid_channel: "sync.error_bad_request",
        reference_too_long: "sync.error_bad_request",
        merchant_order_no_too_long: "sync.error_bad_request",
        invalid_paid_time_format: "sync.error_bad_request",
        invalid_or_expired_code: "sync.error_invalid_reset_code",
        code_sent_recently: "sync.error_code_sent_recently",
      };
      const key = map[String(code || "")];
      if (key) return getSyncText(key, String(code || ""));
      return extractSyncErrorCode(code);
    };

    const getSyncText = (key, fallback, params) =>
      coerceSyncText(typeof state.t === "function" ? state.t(key, params) : fallback, fallback || key);

    const formatSyncPaymentChannelLabel = (channel) => {
      const value = String(channel || "").trim();
      if (!value) return "";
      switch (value) {
        case "alipay":
          return getSyncText("sync.payment.alipay", value);
        case "wechat":
          return getSyncText("sync.payment.wechat", value);
        default:
          return value;
      }
    };

    const formatSyncPaymentStatusLabel = (status) => {
      const value = String(status || "").trim();
      if (!value) return "";
      switch (value) {
        case "pending":
          return getSyncText("sync.payment.status.pending", value);
        case "approved":
          return getSyncText("sync.payment.status.approved", value);
        case "rejected":
          return getSyncText("sync.payment.status.rejected", value);
        default:
          return value;
      }
    };

    const getPreferredBackendMessage = (payload) => {
      if (!payload || typeof payload !== "object") return "";
      const locale = String(getRefValue(state.locale, "") || "").toLowerCase();
      if ((locale || "").startsWith("zh") && typeof payload.message_zh === "string" && payload.message_zh.trim()) {
        return payload.message_zh;
      }
      if ((locale || "").startsWith("ja") && typeof payload.message_ja === "string" && payload.message_ja.trim()) {
        return payload.message_ja;
      }
      if (typeof payload.message_en === "string" && payload.message_en.trim()) {
        return payload.message_en;
      }
      if (typeof payload.message === "string" && payload.message.trim()) {
        return payload.message;
      }
      return "";
    };

    const getAutoSyncRemainingSeconds = () => {
      const dueAt = Number(state.syncAutoSyncDueAt.value || 0);
      if (!dueAt) return 0;
      const now = Number(
        state.syncAutoSyncClock && "value" in state.syncAutoSyncClock
          ? state.syncAutoSyncClock.value
          : Date.now()
      );
      const remaining = Math.ceil((dueAt - now) / 1000);
      return remaining > 0 ? remaining : 0;
    };

    const appendSyncSupportHint = (text) => {
      const supportHint = getSyncText(
        "sync.support_hint",
        "If the issue keeps happening, contact the developer via GitHub or the notice-group entry."
      );
      const base = coerceSyncText(text, "");
      if (!base || !supportHint || base.indexOf(supportHint) >= 0) return base;
      return `${base} ${supportHint}`.trim();
    };

    const maybeAppendSyncSupportHint = (text, errorCode, fallbackKey) => {
      if (
        fallbackKey === "sync.error_sync_failed" ||
        errorCode === "sync_failed" ||
        errorCode === "turnstile_unavailable"
      ) {
        return appendSyncSupportHint(text);
      }
      return text;
    };

    const appendSyncRetryAfter = (text, errorCode, payload) => {
      if (errorCode !== "rate_limit_exceeded" && errorCode !== "rate_limited" && errorCode !== "temporarily_blocked") return text;
      const retryAfterSec = Number(payload && payload.retry_after);
      if (!Number.isFinite(retryAfterSec) || retryAfterSec <= 0) return text;
      const base = coerceSyncText(text, "");
      if (retryAfterSec >= 60) {
        const mins = Math.ceil(retryAfterSec / 60);
        const hint = getSyncText("sync.error_retry_after_minutes", "{min}分钟后可重试", { min: mins });
        return `${base}（${hint}）`;
      }
      const secs = Math.ceil(retryAfterSec);
      const hint = getSyncText("sync.error_retry_after_seconds", "{sec}秒后可重试", { sec: secs });
      return `${base}（${hint}）`;
    };

    const normalizeSyncMessage = (message, fallbackKey, fallbackText, payload) => {
      const errorCode = extractSyncErrorCode((payload && payload.error) || message);
      const translatedByCode = translateSyncError(errorCode);
      if (translatedByCode && translatedByCode !== errorCode) {
        return appendSyncRetryAfter(
          maybeAppendSyncSupportHint(translatedByCode, errorCode, fallbackKey),
          errorCode,
          payload
        );
      }
      const backendMessage = getPreferredBackendMessage(payload);
      const raw = coerceSyncText(backendMessage || message, "");
      const translated = translateSyncError(raw);
      if (translated && translated !== raw) {
        return appendSyncRetryAfter(
          maybeAppendSyncSupportHint(translated, errorCode, fallbackKey),
          errorCode,
          payload
        );
      }
      if (!isSyncFrontendAllowed()) {
        return resolveSyncEntry(getSyncFrontendBlockedEntry()).text;
      }
      if (!raw || /^TypeError\b/i.test(raw) || /Failed to fetch|Load failed|NetworkError/i.test(raw)) {
        const networkError = raw || '网络连接失败';
        return maybeAppendSyncSupportHint(
          `请求未到达服务器，可能是 CORS、网络异常或服务不可达。浏览器信息：${networkError}`,
          errorCode,
          fallbackKey
        );
      }
      return appendSyncRetryAfter(
        maybeAppendSyncSupportHint(raw, errorCode, fallbackKey),
        errorCode,
        payload
      );
    };

    const syncTurnstileToneByErrorCode = (errorCode) => {
      if (errorCode === "turnstile_unavailable") return "warning";
      if (errorCode === "turnstile_failed" || errorCode === "turnstile_expired") return "warning";
      return "";
    };

    const syncTurnstileEntryByErrorCode = (errorCode) => {
      if (errorCode === "turnstile_unavailable") {
        return createSyncTextEntry(
          "sync.error_turnstile_unavailable",
          "Verification is temporarily unavailable. Please try again later."
        );
      }
      if (errorCode === "turnstile_failed") {
        return createSyncTextEntry(
          "sync.error_turnstile_failed",
          "Verification failed. Please retry."
        );
      }
      if (errorCode === "turnstile_expired") {
        return createSyncTextEntry(
          "sync.error_turnstile_expired",
          "Verification expired. Please complete it again."
        );
      }
      return null;
    };

    const requestJson = async (endpoint, options) => {
      const requestOptions = Object.assign(
        {
          method: "GET",
          credentials: "omit",
        },
        options || {}
      );
      const query = isPlainObject(requestOptions.query) ? requestOptions.query : null;
      const useLegacyCookie = requestOptions.useLegacyCookie === true;
      const skipAuthToken = requestOptions.skipAuthToken === true;
      delete requestOptions.query;
      delete requestOptions.useLegacyCookie;
      delete requestOptions.skipAuthToken;
      if (useLegacyCookie) {
        requestOptions.credentials = "include";
      }
      requestOptions.headers = Object.assign(
        {},
        getSyncRequestHeaders(requestOptions),
        options && isPlainObject(options.headers) ? options.headers : {}
      );
      if (!skipAuthToken) {
        const authorizationHeader = getSyncAuthorizationHeader();
        if (authorizationHeader && !requestOptions.headers.Authorization) {
          requestOptions.headers.Authorization = authorizationHeader;
        }
      }
      const requestUrl = buildApiUrl(endpoint, query);
      const requestContext = {
        endpoint,
        method: String(requestOptions.method || 'GET').toUpperCase(),
        syncMode: requestOptions.headers && requestOptions.headers['X-Sync-Mode']
          ? String(requestOptions.headers['X-Sync-Mode'])
          : '',
        url: requestUrl,
      };
      let response;
      try {
        response = await fetch(requestUrl, requestOptions);
      } catch (error) {
        error.requestContext = requestContext;
        throw error;
      }
      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }
      if (!response.ok) {
        const errorCode = extractSyncErrorCode(payload && payload.error);
        const errorMessage = normalizeSyncMessage(
          translateSyncError(errorCode) || coerceSyncText(payload && payload.message, ""),
          response.status === 403 ? "sync.error_official_only" : "sync.error_sync_failed",
          response.status === 403 ? "同步功能仅在官方网站 https://end.canmoe.com 可用" : `HTTP ${response.status}`,
          payload
        );
        const error = new Error(errorMessage);
        error.status = response.status;
        error.payload = payload;
        error.requestContext = requestContext;
        throw error;
      }
      return payload || {};
    };

    const migrateLegacyCookieSession = async () => {
      if (readSyncAuthToken()) return true;
      if (!readSessionHint()) return false;
      if (readLegacyMigrationAttempted()) return false;
      if (syncLegacyCookieMigrationRequest) return syncLegacyCookieMigrationRequest;

      const currentRequest = (async () => {
        writeLegacyMigrationAttempted(true);
        try {
          const result = await requestJson("auth/migrate-cookie", {
            method: "POST",
            useLegacyCookie: true,
            skipAuthToken: true,
          });
          const token = storeSyncAuthToken(result);
          if (!token) {
            writeLegacyMigrationAttempted(false);
            return false;
          }
          writeSessionHint(true);
          return true;
        } catch (error) {
          const errorCode = extractSyncErrorCode(
            (error && error.payload && error.payload.error) || (error && error.message) || ""
          );
          const terminalFailure = Boolean(
            errorCode === "account_disabled" ||
            errorCode === "invalid_session" ||
            errorCode === "session_expired" ||
            errorCode === "unauthorized" ||
            (error && error.status === 401)
          );
          if (terminalFailure) {
            writeSessionHint(false);
            return false;
          } else {
            writeLegacyMigrationAttempted(false);
            return null;
          }
        } finally {
          syncLegacyCookieMigrationRequest = null;
        }
      })();

      syncLegacyCookieMigrationRequest = currentRequest;
      return currentRequest;
    };

    const readAdblockDismissedInSession = () => {
      if (typeof window === 'undefined') return false;
      try {
        return Boolean(window.sessionStorage && window.sessionStorage.getItem(adblockNoticeSessionKey) === '1');
      } catch (error) {
        return false;
      }
    };

    const writeAdblockDismissedInSession = () => {
      if (typeof window === 'undefined') return;
      try {
        if (window.sessionStorage) window.sessionStorage.setItem(adblockNoticeSessionKey, '1');
      } catch (error) {
        // ignore storage issues
      }
    };

    const readEmailToastSignature = () => {
      if (typeof window === 'undefined') return '';
      try {
        return window.sessionStorage ? String(window.sessionStorage.getItem(syncEmailToastSessionKey) || '') : '';
      } catch (error) {
        return '';
      }
    };

    const writeEmailToastSignature = (value) => {
      if (typeof window === 'undefined') return;
      try {
        if (window.sessionStorage) window.sessionStorage.setItem(syncEmailToastSessionKey, String(value || ''));
      } catch (error) {
        // ignore storage issues
      }
    };

    const closeAdblockNotice = () => {
      state.showAdblockNotice.value = false;
      writeAdblockDismissedInSession();
    };

    const getHeroAdVisibilityState = () => {
      if (typeof document === 'undefined' || typeof window === 'undefined') {
        return { exists: false, visible: false, hidden: false, collapsed: false };
      }
      const adTarget = document.querySelector('.hero-ad-banner');
      if (!adTarget) {
        return { exists: false, visible: false, hidden: false, collapsed: false };
      }
      const rect = typeof adTarget.getBoundingClientRect === 'function'
        ? adTarget.getBoundingClientRect()
        : { width: 0, height: 0 };
      const styles = typeof window.getComputedStyle === 'function'
        ? window.getComputedStyle(adTarget)
        : null;
      const hidden = styles
        ? styles.display === 'none' || styles.visibility === 'hidden' || Number(styles.opacity || 1) === 0
        : false;
      const collapsed = rect.width <= 0 || rect.height <= 0;
      return {
        exists: true,
        visible: !hidden && !collapsed,
        hidden,
        collapsed,
      };
    };

    const clearAdblockDetectionTimer = () => {
      if (adblockDetectionTimer) {
        clearTimeout(adblockDetectionTimer);
        adblockDetectionTimer = null;
      }
    };

    const maybeShowAdblockNoticeOnce = () => {
      if (typeof document === 'undefined' || typeof window === 'undefined') return;
      if (readAdblockDismissedInSession()) return;
      // Follow the shared render flag so disabling the banner does not trigger
      // false-positive adblock notices.
      const shouldShowHeroAd =
        Boolean(getRefValue(state.heroAdBannerEnabled, false)) &&
        !Boolean(state.syncAuthenticated.value && state.syncUser.value && state.syncUser.value.ad_free);
      if (!shouldShowHeroAd) {
        clearAdblockDetectionTimer();
        state.aboutAdLoaded.value = false;
        state.showAdblockNotice.value = false;
        return;
      }
      clearAdblockDetectionTimer();
      state.aboutAdLoaded.value = false;
      state.showAdblockNotice.value = false;
      const firstPass = getHeroAdVisibilityState();
      if (firstPass.exists && firstPass.visible) {
        state.aboutAdLoaded.value = true;
        return;
      }
      adblockDetectionTimer = window.setTimeout(() => {
        adblockDetectionTimer = null;
        if (readAdblockDismissedInSession()) return;
        const secondPass = getHeroAdVisibilityState();
        if (secondPass.exists && secondPass.visible) {
          state.aboutAdLoaded.value = true;
          state.showAdblockNotice.value = false;
          return;
        }
        const blocked = secondPass.exists ? !secondPass.visible : !firstPass.exists;
        state.aboutAdLoaded.value = false;
        state.showAdblockNotice.value = Boolean(blocked);
      }, 2400);
    };

    const clearSyncConflictUiState = () => {
      state.syncConflictConfirmMode.value = "";
    };

    const clearSyncConflictState = () => {
      state.syncConflictDetected.value = false;
      state.syncConflictCurrent.value = null;
      clearSyncConflictUiState();
      lastSyncConflictReminderHash = "";
      lastSyncConflictReminderAt = 0;
      suppressNextConflictToastUntil = 0;
      dismissConflictToast();
    };

    const applyRemotePayload = (payload, options) => {
      const comparable = normalizeComparableData(payload);
      const customWeaponsExcluded = Array.isArray(comparable.excludedFields)
        && comparable.excludedFields.includes("customWeapons")
        && !Object.prototype.hasOwnProperty.call(comparable, "customWeapons");
      state.weaponMarks.value = comparable.marks;
      if (!customWeaponsExcluded) {
        state.customWeapons.value = comparable.customWeapons;
      }
      state.selectedNames.value = comparable.workspace.selectedNames || [];
      state.schemeBaseSelections.value = comparable.workspace.schemeBaseSelections || {};
      state.recommendationConfig.value = comparable.workspace.recommendationConfig || {};
      state.filterS1.value = comparable.workspace.filterS1 || [];
      state.filterS2.value = comparable.workspace.filterS2 || [];
      state.filterS3.value = comparable.workspace.filterS3 || [];
      state.selectedRegions.value = Array.isArray(comparable.workspace.selectedRegions)
        ? comparable.workspace.selectedRegions
        : [];
      state.weaponAttrOverrides.value = comparable.workspace.weaponAttrOverrides || {};
      state.showWeaponAttrs.value = Boolean(comparable.workspace.showWeaponAttrs);
      state.showWeaponOwnershipInList.value = Boolean(
        comparable.workspace.showWeaponOwnershipInList
      );
      state.showWeaponOwnershipInPlans.value = Boolean(
        comparable.workspace.showWeaponOwnershipInPlans
      );
      state.showAllSchemes.value = Boolean(comparable.workspace.showAllSchemes);
      if (state.equipRefiningSelectedName) {
        state.equipRefiningSelectedName.value = String(
          comparable.workspace.equipRefiningSelectedName || ""
        );
      }
      const localHash = buildComparableHash(payload);
      persistMeta({
        serverVersion: options && options.serverVersion,
        localHash,
        syncedAt: new Date().toISOString(),
        remoteUpdatedAt: options && options.remoteUpdatedAt,
      });
      state.syncRemoteData.value = cloneJson(payload, {});
      state.syncRemoteVersion.value = Number((options && options.serverVersion) || 0);
      state.syncRemoteUpdatedAt.value = String((options && options.remoteUpdatedAt) || "");
      clearSyncConflictState();
    };

    const updateRemoteSnapshot = (remote) => {
      state.syncRemoteData.value = cloneJson(remote && remote.data, {});
      state.syncRemoteVersion.value = Number((remote && remote.version) || 0);
      state.syncRemoteUpdatedAt.value = String((remote && remote.updated_at) || "");
    };

    const updateRemoteSnapshotMeta = (remote) => {
      state.syncRemoteVersion.value = Number((remote && remote.version) || 0);
      state.syncRemoteUpdatedAt.value = String((remote && remote.updated_at) || "");
    };

    const fetchRemoteSnapshot = async () => {
      const remote = await requestJson("sync", {
        headers: {
          "X-Sync-Mode": "auto",
        },
      });
      updateRemoteSnapshot(remote);
      return remote;
    };

    const fetchRemoteMeta = async () => {
      const remote = await requestJson("sync", {
        headers: {
          "X-Sync-Mode": "auto",
        },
        query: {
          meta: "1",
        },
      });
      updateRemoteSnapshotMeta(remote);
      return remote;
    };

    const handleConflictPayload = (payload) => {
      state.syncConflictCurrent.value = payload && payload.current ? payload.current : null;
      state.syncConflictDetected.value = true;
      clearSyncConflictUiState();
      state.syncRemoteData.value = payload && payload.current && payload.current.data
        ? cloneJson(payload.current.data, {})
        : {};
      state.syncRemoteVersion.value = payload && payload.current ? Number(payload.current.version || 0) : 0;
      state.syncRemoteUpdatedAt.value =
        payload && payload.current ? String(payload.current.updated_at || "") : "";
      setSyncError(createSyncTextEntry("sync.error_conflict", "检测到同步冲突，请先确认当前设备还是云端数据应保留为最新版本。"));
      lastSyncConflictReminderHash = String(state.syncCurrentComparableHash.value || "");
      lastSyncConflictReminderAt = Date.now();
      const shouldSuppressToast =
        suppressNextConflictToastUntil > 0 && Date.now() <= suppressNextConflictToastUntil;
      suppressNextConflictToastUntil = 0;
      if (!shouldSuppressToast) {
        pushSyncConflictToast({ dedupWindowMs: 0 });
      }
    };

    const describeRemoteState = (remote) => {
      const localPayload = buildLocalPayload();
      const localHash = buildComparableHash(localPayload);
      const lastServerVersion = Number(state.syncLastSyncedServerVersion.value || 0);
      const lastLocalHash = String(state.syncLastLocalHash.value || "");
      return {
        localPayload,
        localHasData: hasMeaningfulLocalData(localPayload),
        localHash,
        lastServerVersion,
        lastLocalHash,
        hasSyncHistory: Boolean(lastLocalHash || lastServerVersion || state.syncLastSyncedAt.value),
        serverVersion: Number((remote && remote.version) || 0),
        serverChanged: Number((remote && remote.version) || 0) !== lastServerVersion,
        localChanged: localHash !== lastLocalHash,
      };
    };

    const applyRemoteSnapshotWithNotice = (remote, noticeKey, fallbackNotice) => {
      applyRemotePayload(remote.data, {
        serverVersion: remote.version,
        remoteUpdatedAt: remote.updated_at,
      });
      setSyncNotice(createSyncTextEntry(noticeKey, fallbackNotice), "info");
      pushSyncToast(
        "info",
        "sync.pull_success_title",
        noticeKey,
        "已拉取云端数据",
        fallbackNotice,
        `sync-pull:${Number(remote && remote.version || 0)}:${String(remote && remote.updated_at || "")}`
      );
    };

    const reconcileRemoteSnapshot = async (remote, options) => {
      const comparison = describeRemoteState(remote);
      if (!comparison.hasSyncHistory) {
        if (comparison.serverVersion > 0 && comparison.localHasData) {
          handleConflictPayload({ current: remote });
          return "conflict";
        }
        if (comparison.serverVersion > 0) {
          applyRemoteSnapshotWithNotice(
            remote,
            options && options.noticeKey ? options.noticeKey : "sync.remote_pulled_notice",
            options && options.fallbackNotice ? options.fallbackNotice : "检测到云端更新，已同步到当前设备。"
          );
          return "pulled";
        }
        return "idle";
      }
      if (!comparison.serverChanged) return "unchanged";
      if (!comparison.localChanged) {
        applyRemoteSnapshotWithNotice(
          remote,
          options && options.noticeKey ? options.noticeKey : "sync.remote_pulled_notice",
          options && options.fallbackNotice ? options.fallbackNotice : "检测到云端更新，已同步到当前设备。"
        );
        return "pulled";
      }
      handleConflictPayload({ current: remote });
      return "conflict";
    };

    const clearRemoteSnapshot = () => {
      state.syncRemoteData.value = {};
      state.syncRemoteVersion.value = 0;
      state.syncRemoteUpdatedAt.value = "";
    };

    const clearPasswordChangeForm = () => {
      if (state.syncCurrentPasswordInput && "value" in state.syncCurrentPasswordInput) {
        state.syncCurrentPasswordInput.value = "";
      }
      if (state.syncResetCodeInput && "value" in state.syncResetCodeInput) {
        state.syncResetCodeInput.value = "";
      }
      if (state.syncNewPasswordInput && "value" in state.syncNewPasswordInput) {
        state.syncNewPasswordInput.value = "";
      }
      if (state.syncChangePasswordConfirmInput && "value" in state.syncChangePasswordConfirmInput) {
        state.syncChangePasswordConfirmInput.value = "";
      }
      if (state.syncPasswordChangeMode && "value" in state.syncPasswordChangeMode) {
        state.syncPasswordChangeMode.value = "current";
      }
      if (state.syncPasswordChangeError && "value" in state.syncPasswordChangeError) {
        state.syncPasswordChangeError.value = "";
      }
      if (state.syncPasswordChangeNotice && "value" in state.syncPasswordChangeNotice) {
        state.syncPasswordChangeNotice.value = "";
      }
      if (state.syncPasswordResetRequestAccountInput && "value" in state.syncPasswordResetRequestAccountInput) {
        state.syncPasswordResetRequestAccountInput.value = "";
      }
    };

    const clearPaymentClaimForm = () => {
      if (state.syncPaymentChannelInput && "value" in state.syncPaymentChannelInput) {
        state.syncPaymentChannelInput.value = "";
      }
      if (state.syncPaymentReferenceInput && "value" in state.syncPaymentReferenceInput) {
        state.syncPaymentReferenceInput.value = "";
      }
      if (state.syncPaymentMerchantOrderInput && "value" in state.syncPaymentMerchantOrderInput) {
        state.syncPaymentMerchantOrderInput.value = "";
      }
      if (state.syncPaymentPaidTimeInput && "value" in state.syncPaymentPaidTimeInput) {
        state.syncPaymentPaidTimeInput.value = "";
      }
      if (state.syncPaymentClaimError && "value" in state.syncPaymentClaimError) {
        state.syncPaymentClaimError.value = "";
      }
      if (state.syncPaymentClaimNotice && "value" in state.syncPaymentClaimNotice) {
        state.syncPaymentClaimNotice.value = "";
      }
    };

    const formatClaimTime = (isoString) => {
      const raw = String(isoString || "");
      const formatted = formatSyncDateTime(raw);
      return formatted || raw || "-";
    };

    const closeSyncPasswordModal = () => {
      if (state.syncShowPasswordModal && "value" in state.syncShowPasswordModal) {
        state.syncShowPasswordModal.value = false;
      }
      if (state.syncPasswordChangeMode && "value" in state.syncPasswordChangeMode) {
        state.syncPasswordChangeMode.value = "current";
      }
      if (state.syncPasswordChangeError && "value" in state.syncPasswordChangeError) {
        state.syncPasswordChangeError.value = "";
      }
      if (state.syncPasswordChangeNotice && "value" in state.syncPasswordChangeNotice) {
        state.syncPasswordChangeNotice.value = "";
      }
    };

    const openSyncPasswordModal = () => {
      if (!ensureSyncFrontendAllowed()) return;
      if (state.syncShowPasswordModal && "value" in state.syncShowPasswordModal) {
        state.syncShowPasswordModal.value = true;
      }
      if (state.syncPasswordChangeMode && "value" in state.syncPasswordChangeMode) {
        state.syncPasswordChangeMode.value = state.syncAuthenticated.value ? "current" : "reset_code";
      }
      if (state.syncPasswordChangeError && "value" in state.syncPasswordChangeError) {
        state.syncPasswordChangeError.value = "";
      }
      if (state.syncPasswordChangeNotice && "value" in state.syncPasswordChangeNotice) {
        state.syncPasswordChangeNotice.value = "";
      }
      if (!state.syncAuthenticated.value && state.syncPasswordResetRequestAccountInput && "value" in state.syncPasswordResetRequestAccountInput) {
        const loginEmail = String(state.syncAccountInput.value || "").trim();
        const registerEmail = String(state.syncEmailInput.value || "").trim();
        state.syncPasswordResetRequestAccountInput.value = isLikelyEmail(loginEmail)
          ? loginEmail
          : isLikelyEmail(registerEmail)
            ? registerEmail
            : "";
      }
    };

    const closeSyncEmailModal = () => {
      if (state.syncShowEmailModal && "value" in state.syncShowEmailModal) {
        state.syncShowEmailModal.value = false;
      }
      if (state.syncEmailActionMode && "value" in state.syncEmailActionMode) {
        state.syncEmailActionMode.value = "change";
      }
      if (state.syncEmailActionInput && "value" in state.syncEmailActionInput) {
        state.syncEmailActionInput.value = "";
      }
      if (state.syncEmailCodeInput && "value" in state.syncEmailCodeInput) {
        state.syncEmailCodeInput.value = "";
      }
      if (state.syncEmailActionError && "value" in state.syncEmailActionError) {
        state.syncEmailActionError.value = "";
      }
      if (state.syncEmailActionNotice && "value" in state.syncEmailActionNotice) {
        state.syncEmailActionNotice.value = "";
      }
    };

    const getSyncHttpStatus = (error) => {
      const status = Number(error && error.status);
      return Number.isFinite(status) ? status : 0;
    };

    const getEmailActionCooldownSeconds = (error) => {
      const payload = error && error.payload && typeof error.payload === "object" ? error.payload : null;
      const retryAfter = Number(payload && payload.retry_after);
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        return Math.max(15, Math.min(600, Math.ceil(retryAfter)));
      }
      const status = getSyncHttpStatus(error);
      if (status === 429) return 90;
      return 60;
    };

    const getVerificationSubmitCooldownSeconds = (error) => {
      const payload = error && error.payload && typeof error.payload === "object" ? error.payload : null;
      const retryAfter = Number(payload && payload.retry_after);
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        return Math.max(5, Math.min(30, Math.ceil(retryAfter)));
      }
      const status = getSyncHttpStatus(error);
      if (status === 429) return 30;
      return 5;
    };

    const openSyncEmailModal = () => {
      if (!ensureSyncFrontendAllowed()) return;
      state.syncShowEmailModal.value = true;
      state.syncEmailActionMode.value = 'change';
      state.syncEmailActionInput.value = '';
      state.syncEmailCodeInput.value = '';
      state.syncEmailActionError.value = '';
      state.syncEmailActionNotice.value = '';
    };

    const sendSyncVerificationCode = async () => {
      if (!state.syncAuthenticated.value) return;
      const currentEmail = state.syncUser && state.syncUser.value && state.syncUser.value.email ? state.syncUser.value.email : '';
      if (!currentEmail) {
        const message = createSyncTextEntry('sync.error_email_unavailable', '当前没有可用于接收验证码的邮箱。');
        state.syncEmailActionError.value = resolveSyncEntry(message).text;
        setSyncError(message);
        return;
      }
      state.syncEmailActionError.value = '';
      state.syncEmailActionNotice.value = typeof state.t === 'function' ? state.t('sync.email_sending_notice') : '正在发送验证码...';
      state.syncBusy.value = true;
      let requestError = null;
      try {
        await requestJson('email/send-verification', {
          method: 'POST',
          body: JSON.stringify({ email: currentEmail }),
        });
        const notice = createSyncTextEntry('sync.verification_code_sent_notice', '验证码已发送，请查收邮箱。');
        state.syncEmailActionNotice.value = resolveSyncEntry(notice).text;
        state.syncEmailActionError.value = '';
        setSyncNotice(notice, 'info');
      } catch (error) {
        requestError = error;
        handleSyncRequestFailure(error, 'sync.error_sync_failed', '同步失败，请稍后重试。');
        state.syncEmailActionError.value = state.syncError.value;
      } finally {
        startEmailActionCooldown('verify', getEmailActionCooldownSeconds(requestError));
        state.syncBusy.value = false;
      }
    };

    const submitSyncEmailAction = async (mode) => {
      if (!state.syncAuthenticated.value) return;
      const actionMode = String(mode || state.syncEmailActionMode.value || 'change');
      const cooldownKind = actionMode === 'verify' ? 'verify-submit' : 'change';
      const cooldownRemaining = getEmailActionCooldownRemaining(cooldownKind);
      if (cooldownRemaining > 0) {
        return;
      }
      let requestAttempted = false;
      let requestError = null;
      state.syncEmailActionError.value = '';
      state.syncEmailActionNotice.value = '';
      state.syncBusy.value = true;
      try {
        if (actionMode === 'verify') {
          const verificationCode = String(state.syncEmailCodeInput.value || '').trim();
          if (!verificationCode) {
            const message = createSyncTextEntry('sync.error_missing_verification_code', '请输入邮箱验证码。');
            state.syncEmailActionError.value = resolveSyncEntry(message).text;
            setSyncError(message);
            return;
          }
          state.syncEmailActionNotice.value = typeof state.t === 'function' ? state.t('sync.email_verifying_notice') : '正在验证邮箱...';
          requestAttempted = true;
          await requestJson('email/verify', {
            method: 'POST',
            body: JSON.stringify({ code: verificationCode }),
          });
          const notice = createSyncTextEntry('sync.email_verified_notice', '邮箱验证已完成。');
          state.syncEmailActionNotice.value = resolveSyncEntry(notice).text;
          state.syncEmailActionError.value = '';
          await refreshSyncSession(true);
          closeSyncEmailModal();
          setSyncNotice(notice, 'success');
          return;
        }

        const nextEmail = String(state.syncEmailActionInput.value || '').trim();
        if (!nextEmail) {
          const message = createSyncTextEntry('sync.error_invalid_email', '请输入有效邮箱地址。');
          state.syncEmailActionError.value = resolveSyncEntry(message).text;
          setSyncError(message);
          return;
        }
        if (!isLikelyEmail(nextEmail)) {
          const message = createSyncTextEntry('sync.error_invalid_email', '请输入有效邮箱地址。');
          state.syncEmailActionError.value = resolveSyncEntry(message).text;
          setSyncError(message);
          return;
        }

        const currentEmail = state.syncUser && state.syncUser.value && state.syncUser.value.email
          ? String(state.syncUser.value.email).trim().toLowerCase()
          : '';
        const normalizedNextEmail = String(nextEmail || '').trim().toLowerCase();
        if (normalizedNextEmail === currentEmail) {
          const message = createSyncTextEntry('sync.error_email_unchanged', '新邮箱不能与当前邮箱相同。');
          state.syncEmailActionError.value = resolveSyncEntry(message).text;
          setSyncError(message);
          return;
        }

        state.syncEmailActionNotice.value = typeof state.t === 'function' ? state.t('sync.email_changing_notice') : '正在修改邮箱...';
        requestAttempted = true;
        await requestJson('email/request-change', {
          method: 'POST',
          body: JSON.stringify({ newEmail: nextEmail }),
        });
        const notice = createSyncTextEntry('sync.email_change_notice', '邮箱已更新并发送验证码。');
        state.syncEmailActionNotice.value = resolveSyncEntry(notice).text;
        state.syncEmailActionError.value = '';
        await refreshSyncSession(true);
        setSyncNotice(notice, 'info');
      } catch (error) {
        requestError = error;
        handleSyncRequestFailure(error, 'sync.error_sync_failed', '同步失败，请稍后重试。');
        state.syncEmailActionError.value = state.syncError.value;
      } finally {
        if (requestAttempted) {
          startEmailActionCooldown(
            actionMode === 'verify' ? 'verify-submit' : 'change',
            actionMode === 'verify'
              ? getVerificationSubmitCooldownSeconds(requestError)
              : getEmailActionCooldownSeconds(requestError)
          );
        }
        state.syncBusy.value = false;
      }
    };

    const submitPaymentClaim = async () => {
      if (!state.syncAuthenticated.value) {
        setSyncError(createSyncTextEntry('sync.error_unauthorized', '请先登录。'));
        return;
      }
      const channel = String(state.syncPaymentChannelInput.value || '').trim();
      const reference = String(state.syncPaymentReferenceInput.value || '').trim();
      const merchantOrderNo = String(state.syncPaymentMerchantOrderInput.value || '').trim();
      const paidTime = String(state.syncPaymentPaidTimeInput.value || '').trim();
      if (!channel || !reference) {
        const message = createSyncTextEntry('sync.error_invalid_payment_claim', '请先选择支付方式并填写支付凭证。');
        state.syncPaymentClaimError.value = resolveSyncEntry(message).text;
        setSyncError(message);
        return;
      }
      if (channel === 'alipay' && !merchantOrderNo) {
        const message = createSyncTextEntry('sync.error_merchant_order_required', '支付宝渠道需同时填写商家订单号。');
        state.syncPaymentClaimError.value = resolveSyncEntry(message).text;
        setSyncError(message);
        return;
      }
      state.syncPaymentClaimError.value = '';
      state.syncPaymentClaimNotice.value = '';
      state.syncBusy.value = true;
      try {
        const payload = { channel, externalReference: reference };
        if (channel === 'alipay') payload.merchantOrderNo = merchantOrderNo;
        if (paidTime) payload.paidTime = paidTime;
        const result = await requestJson('payment/submit-claim', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        state.syncPaymentChannelInput.value = '';
        state.syncPaymentReferenceInput.value = '';
        state.syncPaymentMerchantOrderInput.value = '';
        state.syncPaymentPaidTimeInput.value = '';
        const notice = createSyncTextEntry(
          'sync.payment_claim_pending_notice',
          '支付凭证已提交，等待管理员审核。'
        );
        state.syncPaymentClaimNotice.value = resolveSyncEntry(notice).text;
        await refreshSyncSession(true);
        setSyncNotice(notice, 'info');
        pushSyncToast(
          'info',
          'sync.payment_claim_pending_title',
          'sync.payment_claim_pending_notice',
          '支付凭证已提交',
          resolveSyncEntry(notice).text,
          `sync-payment-claim:pending:${result && result.claimId ? result.claimId : 'unknown'}`
        );
      } catch (error) {
        const errorCode = extractSyncErrorCode(error && error.payload ? error.payload.error : error && error.message);
        const result = handleSyncRequestFailure(error, 'sync.error_sync_failed', '同步失败，请稍后重试。');
        if (errorCode === 'email_verification_required') {
          state.syncPaymentClaimError.value = state.syncError.value;
          pushSyncToast('warning', 'sync.email_verification_overdue_title', 'sync.error_email_verification_required', '邮箱验证已超期', state.syncError.value || '邮箱验证已超期，请先完成邮箱验证。', `sync-payment-claim:restricted:${result || 'error'}`);
        } else {
          state.syncPaymentClaimError.value = state.syncError.value;
          pushSyncToast('danger', 'sync.payment_claim_failed_title', 'sync.payment_claim_failed_summary', '支付凭证提交失败', state.syncError.value || '支付凭证提交失败。', `sync-payment-claim-error:${result || 'error'}`);
        }
      } finally {
        state.syncBusy.value = false;
      }
    };

    const requestSyncResetCode = async () => {
      const authenticated = Boolean(state.syncAuthenticated.value);
      const account = authenticated
        ? String(
            (state.syncUser && state.syncUser.value && state.syncUser.value.email) || ""
          ).trim()
        : String(state.syncPasswordResetRequestAccountInput.value || "").trim();
      state.syncPasswordChangeError.value = "";
      state.syncPasswordChangeNotice.value = "";
      if (authenticated && !account) {
        const message = createSyncTextEntry(
          "sync.error_reset_email_unavailable",
          "当前账号没有可用于接收重置码的邮箱。"
        );
        state.syncPasswordChangeError.value = resolveSyncEntry(message).text;
        setSyncError(message);
        return;
      }
      if (!account) {
        const message = createSyncTextEntry(
          "sync.error_missing_reset_password_account",
          "请输入邮箱地址。"
        );
        state.syncPasswordChangeError.value = resolveSyncEntry(message).text;
        setSyncError(message);
        return;
      }
      if (!authenticated && !isLikelyEmail(account)) {
        const message = createSyncTextEntry("sync.error_invalid_email", "请输入有效邮箱地址。");
        state.syncPasswordChangeError.value = resolveSyncEntry(message).text;
        setSyncError(message);
        return;
      }
      state.syncBusy.value = true;
      let requestError = null;
      try {
        await requestJson("password/send-reset", {
          method: "POST",
          body: JSON.stringify({ email: account }),
        });
        const notice = createSyncTextEntry(
          "sync.reset_code_sent_notice",
          "如果账号已绑定邮箱，重置码已发送到邮箱。"
        );
        state.syncPasswordChangeNotice.value = resolveSyncEntry(notice).text;
        setSyncNotice(notice, "info");
      } catch (error) {
        requestError = error;
        handleSyncRequestFailure(error, "sync.error_sync_failed", "同步失败，请稍后重试。");
        state.syncPasswordChangeError.value = state.syncError.value;
      } finally {
        startEmailActionCooldown('reset-request', getEmailActionCooldownSeconds(requestError));
        state.syncBusy.value = false;
      }
    };

    const clearSyncModalCleanupTimer = () => {
      if (!syncModalCleanupTimer) return;
      clearTimeout(syncModalCleanupTimer);
      syncModalCleanupTimer = null;
    };

    const scheduleSyncModalCleanup = () => {
      clearSyncModalCleanupTimer();
      syncModalCleanupTimer = setTimeout(() => {
        destroySyncTurnstileWidget();
        clearSyncConflictUiState();
        closeSyncPasswordModal();
        clearPasswordChangeForm();
        clearPaymentClaimForm();
        syncModalCleanupTimer = null;
      }, 320);
    };

    const resetSyncSessionState = () => {
      state.syncUser.value = null;
      state.syncAuthenticated.value = false;
      clearRemoteSnapshot();
      clearSyncConflictState();
      closeSyncPasswordModal();
      clearPasswordChangeForm();
      clearPaymentClaimForm();
    };

    const handleSyncUnauthorized = (options) => {
      clearSyncAuthToken();
      writeSessionHint(false);
      resetSyncSessionState();
      if (options && options.toastLogin) {
        pushSyncReauthToast();
      }
      if (options && options.silent) return;
      setSyncError(
        options && options.message
          ? options.message
          : createSyncTextEntry("sync.error_unauthorized", "请先登录。")
      );
    };

    const handleSyncAccountDisabled = (options) => {
      clearSyncAuthToken();
      writeSessionHint(false);
      resetSyncSessionState();
      const message = createSyncTextEntry(
        "sync.error_account_disabled",
        "This account has been disabled. Please contact support."
      );
      setSyncError(message);
      pushSyncToast(
        "danger",
        "sync.account_disabled_title",
        "sync.error_account_disabled",
        "Account Disabled",
        "This account has been disabled. Please contact support.",
        "sync-account-disabled"
      );
      if (options && options.silent) return;
    };

    const handleSyncRestrictedAccount = (errorCode, options) => {
      const key = errorCode === "email_verification_required"
        ? "sync.error_email_verification_required"
        : "sync.error_premium_required";
      const fallback = errorCode === "email_verification_required"
        ? "邮箱验证已超期，部分同步功能已受限，请先完成邮箱验证。"
        : "当前档位不支持自动同步，免费计划仅支持手动同步。";
      setSyncRestrictionState(errorCode);
      const entry = createSyncTextEntry(key, fallback);
      setSyncError(entry);
      if (options && options.toastOnRestricted) {
        const resolved = resolveSyncEntry(entry);
        const source = String(options.source || "restricted");
        const signature = `sync-restricted:${errorCode}:${source}`;
        pushSyncToast(
          errorCode === "email_verification_required" ? "warning" : "info",
          errorCode === "email_verification_required" ? "sync.email_verification_overdue_title" : "sync.plan_expired_title",
          key,
          errorCode === "email_verification_required" ? "邮箱验证已超期" : "自动同步不可用",
          resolved.text || fallback,
          signature,
          {
            durationMs: 12000,
            onActivate: typeof state.openSyncModal === "function" ? () => state.openSyncModal() : null,
          }
        );
      }
      return errorCode;
    };

    const readPlanToastSignature = () => {
      if (typeof window === "undefined") return "";
      try {
        return window.sessionStorage ? String(window.sessionStorage.getItem(syncPlanToastSessionKey) || "") : "";
      } catch (error) {
        return "";
      }
    };

    const writePlanToastSignature = (value) => {
      if (typeof window === "undefined") return;
      try {
        if (window.sessionStorage) window.sessionStorage.setItem(syncPlanToastSessionKey, String(value || ""));
      } catch (error) {
        // ignore storage issues
      }
    };

    const readRestrictionToastSignature = () => {
      if (typeof window === "undefined") return "";
      try {
        return window.sessionStorage ? String(window.sessionStorage.getItem(syncRestrictionToastSessionKey) || "") : "";
      } catch (error) {
        return "";
      }
    };

    const writeRestrictionToastSignature = (value) => {
      if (typeof window === "undefined") return;
      try {
        if (window.sessionStorage) window.sessionStorage.setItem(syncRestrictionToastSessionKey, String(value || ""));
      } catch (error) {
        // ignore storage issues
      }
    };

    const clearSyncRestrictionState = (errorCode) => {
      if (!state.syncRestrictionCode || !("value" in state.syncRestrictionCode)) return;
      if (errorCode && state.syncRestrictionCode.value !== errorCode) return;
      state.syncRestrictionCode.value = "";
    };

    const setSyncRestrictionState = (errorCode, options) => {
      const code = String(errorCode || "").trim();
      if (!code) return;
      if (state.syncRestrictionCode && "value" in state.syncRestrictionCode) {
        state.syncRestrictionCode.value = code;
      }
      clearAutoSyncTimer();
      if (code !== "email_verification_required") return;
      const signature = `restriction:${code}:${String((state.syncUser.value && state.syncUser.value.email_verification_deadline) || "none")}`;
      if (readRestrictionToastSignature() === signature) return;
      writeRestrictionToastSignature(signature);
      pushSyncToast(
        "warning",
        "sync.email_verification_overdue_title",
        "sync.email_verification_overdue_notice",
        "邮箱验证已超期",
        "邮箱验证已超期，部分同步功能已受限，请先完成邮箱验证。",
        signature,
        {
          durationMs: 12000,
          onActivate: typeof state.openSyncModal === "function" ? () => state.openSyncModal() : null,
        }
      );
      if (options && options.messageOnly) return;
    };

    const maybeNotifyPlanStatus = (me, previousUser) => {
      if (!me || typeof me !== "object") return;
      const planTier = String(me.plan_tier || "free");
      const planExpiresAtRaw = String(me.plan_expires_at || me.premium_until || me.premium_trial_until || "");
      const planExpiresAt = planExpiresAtRaw ? formatClaimTime(planExpiresAtRaw) : "";
      const expiringSoon = Boolean(me.plan_expiring_soon);
      const expired = Boolean(me.plan_expired);
      const autoSyncAllowed = Boolean(me.auto_sync_allowed);
      const previousAutoSyncAllowed = Boolean(previousUser && previousUser.auto_sync_allowed);
      const previousPlanTier = String(previousUser && previousUser.plan_tier ? previousUser.plan_tier : "");

      if (expiringSoon && planExpiresAt) {
        const expirySignature = `plan-expiring:${planTier}:${planExpiresAtRaw}`;
        if (readPlanToastSignature() !== expirySignature) {
          writePlanToastSignature(expirySignature);
          pushSyncToast(
            "warning",
            "sync.plan_expiring_title",
            "sync.plan_expiring_notice",
            "同步权益即将到期",
            `当前同步权益将于 ${planExpiresAt} 到期。到期后将切换为免费计划，仅保留手动同步。`,
            expirySignature,
            {
              durationMs: 12000,
              summaryParams: { time: planExpiresAt },
              onActivate: typeof state.openSyncModal === "function" ? () => state.openSyncModal() : null,
            }
          );
        }
      }

      if (expired && previousPlanTier && previousPlanTier !== "free") {
        const expiredSignature = `plan-expired:${planTier}:${planExpiresAtRaw || "none"}`;
        if (readPlanToastSignature() !== expiredSignature) {
          writePlanToastSignature(expiredSignature);
          pushSyncToast(
            "info",
            "sync.plan_expired_title",
            "sync.plan_expired_notice",
            "已切换为免费计划",
            "同步权益已到期，当前已切换为免费计划，仅支持手动同步。",
            expiredSignature,
            {
              durationMs: 12000,
              onActivate: typeof state.openSyncModal === "function" ? () => state.openSyncModal() : null,
            }
          );
        }
      }

      if (autoSyncAllowed && !previousAutoSyncAllowed && !state.syncAutoSyncEnabled.value) {
        clearSyncRestrictionState("premium_required");
        const restoredSignature = `auto-sync-restored:${planTier}:${planExpiresAtRaw || "none"}`;
        if (readPlanToastSignature() !== restoredSignature) {
          writePlanToastSignature(restoredSignature);
          pushSyncToast(
            "info",
            "sync.auto_sync_available_title",
            "sync.auto_sync_available_notice",
            "自动同步现已可用",
            "当前档位已恢复自动同步权益。如有需要，可重新打开自动同步。",
            restoredSignature,
            {
              durationMs: 10000,
              onActivate: typeof state.openSyncModal === "function" ? () => state.openSyncModal() : null,
            }
          );
        }
      }
    };

    const handleSyncKnownBusinessError = (errorCode, error) => {
      const knownMap = {
        invalid_credentials: {
          key: 'sync.error_invalid_credentials',
          fallback: '用户名、邮箱或密码错误。',
        },
        invalid_reset_code: {
          key: 'sync.error_invalid_reset_code',
          fallback: '重置码无效、已过期或已被使用。',
        },
        missing_reset_code: {
          key: 'sync.error_missing_reset_code',
          fallback: '请输入重置码。',
        },
        invalid_verification_code: {
          key: 'sync.error_invalid_verification_code',
          fallback: '邮箱验证码无效、已过期或已被使用。',
        },
        invalid_email: {
          key: 'sync.error_invalid_email',
          fallback: '请输入有效邮箱地址。',
        },
        bad_request: {
          key: 'sync.error_bad_request',
          fallback: '请求参数异常，请检查后重试。',
        },
        email_unavailable: {
          key: 'sync.error_email_unavailable',
          fallback: '当前服务暂不支持邮箱功能。',
        },
        email_unchanged: {
          key: 'sync.error_email_unchanged',
          fallback: '新邮箱不能与当前邮箱相同。',
        },
        email_send_failed: {
          key: 'sync.error_email_send_failed',
          fallback: '邮件发送失败，请稍后重试。',
        },
        email_domain_unsupported: {
          key: 'sync.error_email_domain_unsupported',
          fallback: '该邮箱域名无法接收邮件，请更换其他邮箱。',
        },
        email_taken: {
          key: 'sync.error_email_taken',
          fallback: '该邮箱已被占用。',
        },
        username_taken: {
          key: 'sync.error_username_taken',
          fallback: '该用户名已被占用。',
        },
        register_conflict: {
          key: 'sync.error_register_conflict',
          fallback: '注册信息与现有账号冲突，请更换后重试。',
        },
        payment_claim_failed: {
          key: 'sync.error_payment_claim_failed',
          fallback: '支付凭证提交失败，请稍后重试。',
        },
        payment_claim_duplicate: {
          key: 'sync.error_payment_claim_duplicate',
          fallback: '该支付凭证已提交过，不能重复提交。',
        },
        rate_limited: {
          key: 'sync.error_rate_limited',
          fallback: '请求过于频繁，请稍后再试。',
        },
        rate_limit_exceeded: {
          key: 'sync.error_rate_limited',
          fallback: '请求过于频繁，请稍后再试。',
        },
        temporarily_blocked: {
          key: 'sync.error_rate_limited',
          fallback: '请求过于频繁，请稍后再试。',
        },
        weak_password: {
          key: 'sync.error_weak_password',
          fallback: '密码至少需要 6 位。',
        },
        password_mismatch: {
          key: 'sync.error_password_mismatch',
          fallback: '两次输入的密码不一致。',
        },
        missing_reset_password_account: {
          key: 'sync.error_missing_reset_password_account',
          fallback: '请输入邮箱地址。',
        },
        missing_new_password_fields: {
          key: 'sync.error_missing_new_password_fields',
          fallback: '请输入新密码并完成确认。',
        },
        invalid_current_password: {
          key: 'sync.error_invalid_current_password',
          fallback: '当前密码不正确。',
        },
        reset_code_unavailable: {
          key: 'sync.error_reset_code_unavailable',
          fallback: '服务器尚未启用重置码功能，请联系开发者。',
        },
        reset_email_unavailable: {
          key: 'sync.error_reset_email_unavailable',
          fallback: '当前账号没有可用于接收重置码的邮箱。',
        },
        reset_code_issue_failed: {
          key: 'sync.error_reset_code_issue_failed',
          fallback: '重置码签发失败，请稍后重试。',
        },
        invalid_payload: {
          key: 'sync.error_invalid_payload',
          fallback: '同步数据格式无效。',
        },
        missing_verification_code: {
          key: 'sync.error_missing_verification_code',
          fallback: '请输入邮箱验证码。',
        },
        email_verification_issue_failed: {
          key: 'sync.error_email_verification_issue_failed',
          fallback: '邮箱验证码签发失败，请稍后重试。',
        },
        smtp_disabled: {
          key: 'sync.error_smtp_disabled',
          fallback: '服务器当前已关闭邮件发送功能。',
        },
        smtp_config_invalid: {
          key: 'sync.error_smtp_config_invalid',
          fallback: '服务器邮件配置无效，请联系开发者。',
        },
        smtp_connect_failed: {
          key: 'sync.error_smtp_connect_failed',
          fallback: '服务器暂时无法连接邮件服务，请稍后重试。',
        },
        smtp_rejected: {
          key: 'sync.error_smtp_rejected',
          fallback: '邮件服务拒绝了本次发送请求，请稍后重试。',
        },
        payload_too_large: {
          key: 'sync.error_payload_too_large',
          fallback: '当前数据超过当前档位允许的同步大小限制，请减少数据后重试。',
        },
        invalid_payment_claim: {
          key: 'sync.error_invalid_payment_claim',
          fallback: '请先选择支付方式并填写支付凭证。',
        },
        auth_failed: {
          key: 'sync.error_auth_failed',
          fallback: '身份验证失败。',
        },
      };
      const matched = knownMap[errorCode];
      if (!matched) return false;
      const payload = error && error.payload ? error.payload : null;
      const errorDetails = buildSyncErrorDetails(error);
      const message = appendSyncRetryAfter(
        resolveSyncEntry(createSyncTextEntry(matched.key, matched.fallback)).text || matched.fallback,
        errorCode,
        payload
      );
      setSyncError(message, errorDetails);
      return true;
    };

    const handleSyncRequestFailure = (error, fallbackKey, fallbackText, options) => {
      const errorCode = extractSyncErrorCode(error && error.payload ? error.payload.error : error && error.message);
      if (errorCode === "account_disabled") {
        handleSyncAccountDisabled(options);
        return "account_disabled";
      }
      if (errorCode === "maintenance_mode") {
        setSyncError(createSyncTextEntry("sync.error_maintenance", "服务维护中。"));
        return "maintenance_mode";
      }
      if (errorCode === "email_verification_required" || errorCode === "premium_required") {
        return handleSyncRestrictedAccount(errorCode, options);
      }
      if (handleSyncKnownBusinessError(errorCode, error)) {
        return errorCode;
      }
      if (error && error.status === 401) {
        handleSyncUnauthorized(options);
        return "unauthorized";
      }
      if (error && error.status === 403 && shouldSkipAutoRefresh()) {
        return "blocked";
      }
      if (options && options.silent) {
        return "error";
      }
      const httpStatus = error?.status ? `HTTP ${error.status}` : 'HTTP N/A';
      const errorDetails = buildSyncErrorDetails(error);
      const message = normalizeSyncMessage(
        error && error.message ? error.message : "",
        fallbackKey,
        fallbackText,
        error && error.payload ? error.payload : null
      );
      const messageWithStatus = `${httpStatus}: ${message}`;
      setSyncError(messageWithStatus, errorDetails);
      if (options && options.toastOnError) {
        pushSyncToast("danger", "sync.failure_title", "", "同步失败", messageWithStatus, `sync-failure:${messageWithStatus}`);
      }
      return "error";
    };

    const refreshSyncSession = async (skipSyncFetch, options) => {
      if (!ensureSyncFrontendAllowed({ silent: true })) return;
      if (shouldSkipAutoRefresh()) return;
      if (syncSessionRequest) return syncSessionRequest;
      state.syncSessionChecking.value = true;
      const currentRequest = (async () => {
        try {
          let migrationResult;
          if (!readSyncAuthToken() && readSessionHint()) {
            migrationResult = await migrateLegacyCookieSession();
          }
          if (!readSyncAuthToken()) {
            if (migrationResult === false) {
              handleSyncUnauthorized({ silent: true });
            }
            return;
          }
          const me = await requestJson("auth/me");
          const previousUser = state.syncUser.value;
          state.syncUserPaymentClaims.value = me && Array.isArray(me.payment_claims) ? me.payment_claims : [];
          state.syncUser.value = me;
          state.syncAuthenticated.value = true;
          writeSessionHint(true);
          if (me && me.email_verification_required) {
            setSyncRestrictionState("email_verification_required", { messageOnly: true });
          } else {
            clearSyncRestrictionState("email_verification_required");
          }
          maybeNotifyPlanStatus(me, previousUser);
          if (me && me.email_verification_required) {
            const overdueSignature = `${me.email || 'unknown'}:overdue:${me.email_verification_deadline || 'none'}`;
            if (readEmailToastSignature() !== overdueSignature) {
              writeEmailToastSignature(overdueSignature);
              pushSyncToast(
                "warning",
                "sync.email_verification_overdue_title",
                "sync.email_verification_overdue_notice",
                "邮箱验证已超期",
                "邮箱验证已超期，部分同步功能已受限，请先完成邮箱验证。",
                `sync-email-overdue:${overdueSignature}`,
                {
                  durationMs: 12000,
                  onActivate: typeof state.openSyncModal === "function" ? () => state.openSyncModal() : null,
                }
              );
            }
          } else if (me && me.email_verified === false) {
            const emailToastSignature = `${me.email || 'unknown'}:${me.email_verification_deadline || 'none'}`;
            if (readEmailToastSignature() !== emailToastSignature) {
              writeEmailToastSignature(emailToastSignature);
            pushSyncToast(
              "warning",
              "sync.email_unverified_title",
              "sync.email_unverified_notice",
              "邮箱尚未验证",
              `请在 ${me.email_verification_deadline || '-'} 前完成邮箱验证，否则部分权益将受限。`,
              `sync-email-unverified:${emailToastSignature}`,
              {
                durationMs: 12000,
                summaryParams: { time: me.email_verification_deadline || '-' },
                onActivate: typeof state.openSyncModal === "function" ? () => state.openSyncModal() : null,
              }
            );
            }
          }
          if (skipSyncFetch) return;
          if (options && options.forceFullSnapshot) {
            if (isAutoSyncRestricted() || !isAutoSyncAllowed()) {
              return;
            }
            const remote = await fetchRemoteSnapshot();
            await reconcileRemoteSnapshot(remote, {
              noticeKey: "sync.remote_pulled_notice",
              fallbackNotice: "检测到云端更新，已同步到当前设备。",
            });
            return;
          }
          await runPassiveRemoteCheck({ force: true, silentBlocked: true });
        } catch (error) {
          const failureType = handleSyncRequestFailure(error, "sync.error_sync_failed", "Sync failed due to a server error.", {
            silent: shouldSkipAutoRefresh(),
            toastLogin: readSessionHint(),
          });
          if (failureType === "unauthorized" || failureType === "account_disabled") {
            return;
          }
          if (error && error.status === 403 && shouldSkipAutoRefresh()) {
            return;
          }
        }
      })();
      syncSessionRequest = currentRequest;
      try {
        return await currentRequest;
      } finally {
        if (syncSessionRequest === currentRequest) {
          syncSessionRequest = null;
        }
        state.syncSessionChecking.value = false;
      }
    };

    const handleInitialRemoteStateAfterAuth = async () => {
      if (isAutoSyncRestricted() || !isAutoSyncAllowed()) {
        return "restricted";
      }
      const remote = await fetchRemoteSnapshot();
      const comparison = describeRemoteState(remote);
      if (comparison.serverVersion <= 0 && comparison.localHasData) {
        const pushed = await requestJson("sync", {
          method: "POST",
          headers: {
            "X-Sync-Mode": "manual",
          },
          body: JSON.stringify({
            base_version: 0,
            data: comparison.localPayload,
          }),
        });
        applySuccessfulPushResult(pushed, comparison.localPayload, comparison.localHash, {
          noticeKey: "sync.push_success_title",
          summaryKey: "sync.push_success_summary",
          fallbackTitle: "已上传本地数据",
          fallbackSummary: "本地数据已同步到云端。",
        });
        return "pushed";
      }
      return reconcileRemoteSnapshot(remote, {
        noticeKey: "sync.pull_success_summary",
        fallbackNotice: "服务器数据已应用到当前设备。",
      });
    };

    function isAutoSyncAllowed() {
      return Boolean(state.syncUser.value && state.syncUser.value.auto_sync_allowed);
    }

    function isAutoSyncRestricted() {
      return Boolean(
        state.syncRestrictionCode.value === "premium_required" ||
        state.syncRestrictionCode.value === "email_verification_required"
      );
    }

    const runPassiveRemoteCheck = async (options) => {
      if (!ensureSyncFrontendAllowed({ silent: Boolean(options && options.silentBlocked) })) {
        return "blocked";
      }
      if (shouldSkipAutoRefresh()) return "skip";
      if (!isDocumentVisible() && !(options && options.force)) return "hidden";
      if (state.syncBusy.value || state.syncConflictDetected.value) return "busy";
      const now = Date.now();
      if (!(options && options.force) && now - lastRemoteRefreshAt < remoteRefreshFocusCooldownMs) {
        return "cooldown";
      }
      if (!state.syncAuthenticated.value) {
        if (!readSessionHint()) return "idle";
        await refreshSyncSession(true);
        if (!state.syncAuthenticated.value) return "signed_out";
      }
      if (state.syncAuthenticated.value) {
        if (isAutoSyncRestricted()) return "restricted";
        if (!isAutoSyncAllowed()) return "restricted";
      }
      try {
        lastRemoteRefreshAt = now;
        const remoteMeta = await fetchRemoteMeta();
        const comparison = describeRemoteState(remoteMeta);
        if (comparison.hasSyncHistory && !comparison.serverChanged) {
          return "unchanged";
        }
        if (!comparison.hasSyncHistory && comparison.serverVersion <= 0) {
          return "idle";
        }
        const remote = await fetchRemoteSnapshot();
        return await reconcileRemoteSnapshot(remote, {
          noticeKey: "sync.remote_pulled_notice",
          fallbackNotice: "检测到云端更新，已同步到当前设备。",
        });
      } catch (error) {
        const result = handleSyncRequestFailure(error, "sync.error_sync_failed", "Sync failed due to a server error.", {
          silent: Boolean(options && options.silentErrors),
          silentBlocked: Boolean(options && options.silentBlocked),
          toastLogin: readSessionHint(),
          toastOnRestricted: true,
          source: options && options.force ? "passive-force" : "passive",
        });
        return result === "unauthorized" || result === "account_disabled" ? "signed_out" : result;
      }
    };

    const stopRemoteRefreshTimer = () => {
      if (!remoteRefreshTimer) return;
      clearInterval(remoteRefreshTimer);
      remoteRefreshTimer = null;
    };

    const commitSyncSuccess = (noticeKey, summaryKey, fallbackTitle, fallbackSummary) => {
      clearAutoSyncAttemptState();
      setSyncNotice(createSyncTextEntry(summaryKey, fallbackSummary));
      const forceToast = summaryKey === "sync.pull_success_summary" || summaryKey === "sync.remote_pulled_notice";
      if (state.syncSuccessToastEnabled.value || forceToast) {
        pushSyncToast(
          forceToast ? "info" : "success",
          noticeKey,
          summaryKey,
          fallbackTitle,
          fallbackSummary,
          `${summaryKey}:${state.syncRemoteVersion.value}:${state.syncRemoteUpdatedAt.value}`
        );
      }
    };

    const applySuccessfulPushResult = (pushed, localPayload, localHash, options) => {
      persistMeta({
        serverVersion: Number(pushed && pushed.version || 0),
        localHash,
        syncedAt: new Date().toISOString(),
        remoteUpdatedAt: pushed && pushed.updated_at ? pushed.updated_at : "",
      });
      state.syncRemoteData.value = cloneJson(localPayload, {});
      state.syncRemoteVersion.value = Number(pushed && pushed.version || 0);
      state.syncRemoteUpdatedAt.value = String(pushed && pushed.updated_at || "");
      commitSyncSuccess(
        options && options.noticeKey ? options.noticeKey : "sync.push_success_title",
        options && options.summaryKey ? options.summaryKey : "sync.push_success_summary",
        options && options.fallbackTitle ? options.fallbackTitle : "已上传本地数据",
        options && options.fallbackSummary ? options.fallbackSummary : "本地数据已同步到云端。"
      );
    };

    const performManualSync = async () => {
      if (!ensureSyncFrontendAllowed()) return;
      if (!state.syncAuthenticated.value) {
        setSyncError(createSyncTextEntry("sync.error_unauthorized", "请先登录。"));
        return;
      }
      clearAutoSyncTimer();
      state.syncBusy.value = true;
      clearSyncConflictState();
      try {
        const localPayload = buildLocalPayload();
        const localHash = buildComparableHash(localPayload);
        const remote = await requestJson("sync", {
          headers: {
            "X-Sync-Mode": "manual",
          },
        });
        state.syncRemoteData.value = cloneJson(remote.data, {});
        state.syncRemoteVersion.value = Number(remote.version || 0);
        state.syncRemoteUpdatedAt.value = String(remote.updated_at || "");

        const lastServerVersion = Number(state.syncLastSyncedServerVersion.value || 0);
        const lastLocalHash = String(state.syncLastLocalHash.value || "");
        const localHasData = hasMeaningfulLocalData(localPayload);
        const hasSyncHistory = Boolean(lastLocalHash || lastServerVersion || state.syncLastSyncedAt.value);

        if (!hasSyncHistory) {
          if (remote.version > 0 && localHasData) {
            handleConflictPayload({ current: remote });
            return;
          }
          if (remote.version > 0) {
            applyRemotePayload(remote.data, {
              serverVersion: remote.version,
              remoteUpdatedAt: remote.updated_at,
            });
            commitSyncSuccess(
              "sync.pull_success_title",
              "sync.pull_success_summary",
              "已拉取云端数据",
              "服务器数据已应用到当前设备。"
            );
            return;
          }
          if (!localHasData) {
            setSyncNotice(createSyncTextEntry("sync.no_data_notice", "No local or cloud data yet."), "info");
            return;
          }
        }

        const localChanged = localHash !== lastLocalHash;
        const serverChanged = Number(remote.version || 0) !== lastServerVersion;

        if (!localChanged && !serverChanged) {
          const notice = createSyncTextEntry("sync.already_up_to_date", "Already up to date.");
          setSyncNotice(notice, "info");
          pushSyncToast("info", "sync.manual_sync_title", "sync.already_up_to_date", "手动同步", resolveSyncEntry(notice).text, "sync-manual-up-to-date");
          return;
        }

        if (!localChanged && serverChanged) {
          applyRemotePayload(remote.data, {
            serverVersion: remote.version,
            remoteUpdatedAt: remote.updated_at,
          });
          commitSyncSuccess(
            "sync.pull_success_title",
            "sync.pull_success_summary",
            "已拉取云端数据",
            "服务器数据已应用到当前设备。"
          );
          return;
        }

        if (localChanged && serverChanged) {
          handleConflictPayload({ current: remote });
          return;
        }

        const pushed = await requestJson("sync", {
          method: "POST",
          headers: {
            "X-Sync-Mode": "manual",
          },
          body: JSON.stringify({
            base_version: Number(remote.version || 0),
            data: localPayload,
          }),
        });
        persistMeta({
          serverVersion: Number(pushed.version || 0),
          localHash,
          syncedAt: new Date().toISOString(),
          remoteUpdatedAt: pushed.updated_at || "",
        });
        state.syncRemoteData.value = cloneJson(localPayload, {});
        state.syncRemoteVersion.value = Number(pushed.version || 0);
        state.syncRemoteUpdatedAt.value = String(pushed.updated_at || "");
        commitSyncSuccess(
          "sync.push_success_title",
          "sync.push_success_summary",
          "已上传本地数据",
          "本地数据已同步到云端。"
        );
      } catch (error) {
        if (error && error.status === 409 && error.payload) {
          handleConflictPayload(error.payload);
        } else {
          handleSyncRequestFailure(error, "sync.error_sync_failed", "Sync failed due to a server error.", {
            toastOnError: true,
            toastOnRestricted: true,
            source: "manual",
          });
        }
      } finally {
        state.syncBusy.value = false;
      }
    };

    const applySyncConflictUseServer = async () => {
      const current = state.syncConflictCurrent.value;
      if (!current) return;
      applyRemotePayload(current.data || {}, {
        serverVersion: current.version,
        remoteUpdatedAt: current.updated_at,
      });
      commitSyncSuccess(
        "sync.conflict_server_title",
        "sync.conflict_server_summary",
        "已采用云端数据",
        "当前设备已切换为云端版本。"
      );
    };

    const applySyncConflictUseLocal = async () => {
      if (!ensureSyncFrontendAllowed()) return;
      if (!state.syncAuthenticated.value) return;
      clearAutoSyncTimer();
      state.syncBusy.value = true;
      try {
        const localPayload = buildLocalPayload();
        const localHash = buildComparableHash(localPayload);
        const current = state.syncConflictCurrent.value;
        const baseVersion = current ? Number(current.version || 0) : Number(state.syncRemoteVersion.value || 0);
        const pushed = await requestJson("sync", {
          method: "POST",
          headers: {
            "X-Sync-Mode": "manual",
          },
          body: JSON.stringify({
            base_version: baseVersion,
            data: localPayload,
          }),
        });
        persistMeta({
          serverVersion: Number(pushed.version || 0),
          localHash,
          syncedAt: new Date().toISOString(),
          remoteUpdatedAt: pushed.updated_at || "",
        });
        state.syncRemoteData.value = cloneJson(localPayload, {});
        state.syncRemoteVersion.value = Number(pushed.version || 0);
        state.syncRemoteUpdatedAt.value = String(pushed.updated_at || "");
        clearSyncConflictState();
        commitSyncSuccess(
          "sync.conflict_local_title",
          "sync.conflict_local_summary",
          "已用当前设备覆盖云端",
          "当前设备内容已写入云端。"
        );
      } catch (error) {
        if (error && error.status === 409 && error.payload) {
          handleConflictPayload(error.payload);
        } else {
          handleSyncRequestFailure(error, "sync.error_sync_failed", "Sync failed due to a server error.");
        }
      } finally {
        state.syncBusy.value = false;
      }
    };

    const resolveSyncConflictUseServer = () => {
      state.syncConflictConfirmMode.value = "use-server";
    };

    const resolveSyncConflictUseLocal = () => {
      state.syncConflictConfirmMode.value = "use-local";
    };

    const cancelSyncConflictConfirmation = () => {
      state.syncConflictConfirmMode.value = "";
    };

    const confirmSyncConflictResolution = async () => {
      const mode = String(state.syncConflictConfirmMode.value || "");
      if (!mode) return;
      state.syncConflictConfirmMode.value = "";
      if (mode === "use-server") {
        await applySyncConflictUseServer();
        return;
      }
      if (mode === "use-local") {
        await applySyncConflictUseLocal();
        return;
      }
    };

    const clearSyncFeedback = () => {
      state.syncError.value = "";
      state.syncErrorDetails.value = "";
      state.syncNotice.value = "";
    };

    const submitSyncAuth = async () => {
      if (!ensureSyncFrontendAllowed()) return;
      const account = String(state.syncAccountInput.value || "").trim();
      const username = String(state.syncUsernameInput.value || "").trim();
      const email = String(state.syncEmailInput.value || "").trim();
      const password = String(state.syncPasswordInput.value || "");
      const confirmPassword = String(state.syncPasswordConfirmInput.value || "");
      const loginAccount = state.syncAuthMode.value === "register" ? username : account;
      if (!loginAccount || !password) {
        setSyncError(createSyncTextEntry("sync.error_missing_credentials", "请输入账号和密码。"));
        return;
      }
      if (state.syncAuthMode.value === "register" && !usernamePattern.test(username)) {
        setSyncError(createSyncTextEntry("sync.error_invalid_username", "用户名只能使用 3-24 位字母、数字或下划线。"));
        return;
      }
      if (state.syncAuthMode.value === "register" && !/^.+@.+\..+$/.test(email)) {
        setSyncError(createSyncTextEntry("sync.error_invalid_email", "请输入有效邮箱地址。"));
        return;
      }
      if (state.syncAuthMode.value === "register" && password.length < 6) {
        setSyncError(createSyncTextEntry("sync.error_weak_password", "密码至少需要 6 位。"));
        return;
      }
      if (state.syncAuthMode.value === "register" && password !== confirmPassword) {
        setSyncError(createSyncTextEntry("sync.error_password_mismatch", "两次输入的密码不一致。"));
        return;
      }
      if (isTurnstileEnabled() && !state.syncTurnstileToken.value) {
        setSyncError(createSyncTextEntry("sync.error_turnstile_required", "请先完成人机验证。"));
        return;
      }
      state.syncBusy.value = true;
      try {
        const isRegister = state.syncAuthMode.value === "register";
        const authPayload = isRegister
          ? {
              username,
              email,
              password,
              turnstileToken: String(state.syncTurnstileToken.value || ""),
            }
          : {
              login: loginAccount,
              password,
              turnstileToken: String(state.syncTurnstileToken.value || ""),
            };
        const authResult = await requestJson(isRegister ? "auth/register" : "auth/login", {
          method: "POST",
          skipAuthToken: true,
          body: JSON.stringify(authPayload),
        });
        if (!storeSyncAuthToken(authResult)) {
          throw new Error("auth_failed");
        }
        writeSessionHint(true);
        state.syncAccountInput.value = "";
        state.syncPasswordInput.value = "";
        state.syncPasswordConfirmInput.value = "";
        state.syncEmailInput.value = "";
        destroySyncTurnstileWidget();
        await refreshSyncSession(true);
        setSyncNotice(createSyncTextEntry(
          state.syncAuthMode.value === "register"
            ? "sync.register_success_no_mail"
            : "sync.login_success",
          state.syncAuthMode.value === "register"
            ? "注册成功，已自动登录。请在“验证/修改邮箱”中验证邮箱。"
            : "登录成功。"
        ), "info");
        await handleInitialRemoteStateAfterAuth();
      } catch (error) {
        const errorCode = extractSyncErrorCode(
          (error && error.payload && error.payload.error) || (error && error.message) || ""
        );
        const turnstileEntry = syncTurnstileEntryByErrorCode(errorCode);
        if (turnstileEntry) {
          const tone = syncTurnstileToneByErrorCode(errorCode);
          setSyncTurnstileMessage(turnstileEntry.key, turnstileEntry.fallback, tone || "warning");
        }
        handleSyncRequestFailure(error, "sync.error_sync_failed", "同步失败，请稍后重试。");
      } finally {
        if (isTurnstileEnabled() && !state.syncAuthenticated.value) {
          resetSyncTurnstileWidget({ skipRemount: false });
        }
        state.syncBusy.value = false;
      }
    };

    watch(state.syncAuthMode, (mode, previousMode) => {
      const nextMode = String(mode || "login");
      const previous = String(previousMode || "");
      if (!previous || previous === nextMode) return;
      state.syncPasswordInput.value = "";
      state.syncPasswordConfirmInput.value = "";
      if (nextMode === "login") {
        state.syncUsernameInput.value = "";
        state.syncEmailInput.value = "";
      } else {
        state.syncAccountInput.value = "";
      }
      clearSyncFeedback();
    });

    const submitSyncPasswordChange = async () => {
      if (!ensureSyncFrontendAllowed()) return;
      const authenticated = Boolean(state.syncAuthenticated.value);
      const useResetCode =
        !authenticated || String(state.syncPasswordChangeMode.value || "current") === "reset_code";
      const account = String(state.syncPasswordResetRequestAccountInput.value || "").trim();
      const currentPassword = String(state.syncCurrentPasswordInput.value || "");
      const resetCode = String(state.syncResetCodeInput.value || "").trim();
      const newPassword = String(state.syncNewPasswordInput.value || "");
      const confirmPassword = String(state.syncChangePasswordConfirmInput.value || "");
      state.syncPasswordChangeError.value = "";
      state.syncPasswordChangeNotice.value = "";

      if (!authenticated && !useResetCode) {
        const message = createSyncTextEntry("sync.error_unauthorized", "Please sign in first.");
        state.syncPasswordChangeError.value = resolveSyncEntry(message).text;
        setSyncError(message);
        return;
      }

      if (useResetCode) {
        if (!authenticated && !account) {
          const message = createSyncTextEntry(
            "sync.error_missing_reset_password_account",
            "请输入邮箱地址。"
          );
          state.syncPasswordChangeError.value = resolveSyncEntry(message).text;
          setSyncError(message);
          return;
        }
        if (!authenticated && !isLikelyEmail(account)) {
          const message = createSyncTextEntry("sync.error_invalid_email", "请输入有效邮箱地址。");
          state.syncPasswordChangeError.value = resolveSyncEntry(message).text;
          setSyncError(message);
          return;
        }
        if (!resetCode) {
          const message = createSyncTextEntry(
            "sync.error_missing_reset_code",
            "请输入重置码。"
          );
          state.syncPasswordChangeError.value = resolveSyncEntry(message).text;
          setSyncError(message);
          return;
        }
        if (!newPassword || !confirmPassword) {
          const message = createSyncTextEntry(
            "sync.error_missing_new_password_fields",
            "请输入新密码并完成确认。"
          );
          state.syncPasswordChangeError.value = resolveSyncEntry(message).text;
          setSyncError(message);
          return;
        }
      } else if (!currentPassword || !newPassword || !confirmPassword) {
        const message = createSyncTextEntry(
          "sync.error_missing_change_password_fields",
          "Please enter current password, new password, and confirmation."
        );
        state.syncPasswordChangeError.value = resolveSyncEntry(message).text;
        setSyncError(message);
        return;
      }

      if (newPassword.length < 6) {
        const message = createSyncTextEntry("sync.error_weak_password", "Password must be at least 6 characters.");
        state.syncPasswordChangeError.value = resolveSyncEntry(message).text;
        setSyncError(message);
        return;
      }
      if (newPassword !== confirmPassword) {
        const message = createSyncTextEntry("sync.error_password_mismatch", "The two passwords do not match.");
        state.syncPasswordChangeError.value = resolveSyncEntry(message).text;
        setSyncError(message);
        return;
      }

      state.syncBusy.value = true;
      try {
        let response;
        if (useResetCode && authenticated) {
          // Authenticated user with reset code → use /password/change (auth required)
          response = await requestJson("password/change", {
            method: "POST",
            body: JSON.stringify({
              resetCode: resetCode,
              newPassword: newPassword,
            }),
          });
        } else if (useResetCode) {
          // Unauthenticated user with reset code → use /password/reset (public)
          response = await requestJson("password/reset", {
            method: "POST",
            body: JSON.stringify({
              email: account,
              code: resetCode,
              newPassword: newPassword,
            }),
          });
        } else {
          // Authenticated user with current password → use /password/change
          response = await requestJson("password/change", {
            method: "POST",
            body: JSON.stringify({
              currentPassword: currentPassword,
              newPassword: newPassword,
            }),
          });
        }
        clearPasswordChangeForm();
        if (useResetCode) {
          state.syncAuthMode.value = "login";
          if (authenticated && response && response.reauth_required === false) {
            const successEntry = createSyncTextEntry(
              "sync.change_password_success",
              "Password updated. Other devices have been signed out."
            );
            await refreshSyncSession(true);
            setSyncNotice(successEntry, "success");
            pushSyncToast(
              "success",
              "sync.change_password_title",
              "sync.change_password_success",
              "Change Password",
              "Password updated. Other devices have been signed out.",
              "sync-change-password-success"
            );
          } else {
            const successEntry = createSyncTextEntry(
              "sync.reset_password_success",
              "Password reset complete. Please sign in with the new password."
            );
            writeSessionHint(false);
            resetSyncSessionState();
            if (!authenticated) {
              state.syncAccountInput.value = account;
            }
            setSyncNotice(successEntry, "info");
            pushSyncToast(
              "info",
              "sync.change_password_title",
              "sync.reset_password_success",
              "Password Reset",
              "Password reset complete. Please sign in with the new password.",
              "sync-reset-password-success"
            );
          }
          closeSyncPasswordModal();
          return;
        }

        const successEntry = createSyncTextEntry(
          "sync.change_password_success",
          "Password updated. Other devices have been signed out."
        );
        state.syncPasswordChangeNotice.value = resolveSyncEntry(successEntry).text;
        setSyncNotice(successEntry, "success");
        pushSyncToast(
          "success",
          "sync.change_password_title",
          "sync.change_password_success",
          "Change Password",
          "Password updated. Other devices have been signed out.",
          "sync-change-password-success"
        );
        closeSyncPasswordModal();
      } catch (error) {
        handleSyncRequestFailure(error, "sync.error_sync_failed", "同步失败，请稍后重试。");
        state.syncPasswordChangeError.value = state.syncError.value;
      } finally {
        state.syncBusy.value = false;
      }
    };

    const logoutSync = async () => {
      if (!ensureSyncFrontendAllowed()) return;
      clearAutoSyncTimer();
      state.syncBusy.value = true;
      try {
        await requestJson("auth/logout", {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({}),
        });
      } catch (error) {
        // ignore logout failures and clear local session state anyway
      } finally {
        state.syncBusy.value = false;
      }
      clearSyncAuthToken();
      state.syncUser.value = null;
      resetSyncSessionState();
      clearSyncModalCleanupTimer();
      state.syncPasswordInput.value = "";
      state.syncPasswordConfirmInput.value = "";
      clearPasswordChangeForm();
      resetSyncTurnstileWidget({ skipRemount: false });
      writeSessionHint(false);
      clearSyncFeedback();
      setSyncNotice(createSyncTextEntry("sync.logout_success", "已退出登录。"), "info");
    };

    const storedMeta = readJsonStorage(syncMetaStorageKey, defaultMeta);
    const storedPrefs = readJsonStorage(syncPrefsStorageKey, { successToastEnabled: true, autoSyncEnabled: true });
    const storedDevSettingsRaw = isLocalhostFrontend()
      ? readJsonStorage(syncDevStorageKey, { apiBase: "", headerName: "", headerValue: "" })
      : { apiBase: "", headerName: "", headerValue: "" };
    const storedDevSettings = {
      apiBase: String(storedDevSettingsRaw && storedDevSettingsRaw.apiBase ? storedDevSettingsRaw.apiBase : ""),
      headerName: String(
        storedDevSettingsRaw && storedDevSettingsRaw.headerName
          ? storedDevSettingsRaw.headerName
          : storedDevSettingsRaw && storedDevSettingsRaw.devToken
            ? "X-Dev-Token"
            : ""
      ),
      headerValue: String(
        storedDevSettingsRaw && storedDevSettingsRaw.headerValue
          ? storedDevSettingsRaw.headerValue
          : storedDevSettingsRaw && storedDevSettingsRaw.devToken
            ? storedDevSettingsRaw.devToken
            : ""
      ),
    };

    state.syncAuthMode = ref("login");
    state.syncBusy = ref(false);
    state.syncAuthenticated = ref(false);
    state.syncUser = ref(null);
    state.syncAccountInput = ref("");
    state.syncUsernameInput = ref("");
    state.syncEmailInput = ref("");
    state.syncPasswordInput = ref("");
    state.syncPasswordConfirmInput = ref("");
    state.syncCurrentPasswordInput = ref("");
    state.syncResetCodeInput = ref("");
    state.syncPasswordChangeMode = ref("current");
    state.syncNewPasswordInput = ref("");
    state.syncChangePasswordConfirmInput = ref("");
    state.syncPasswordChangeError = ref("");
    state.syncPasswordChangeNotice = ref("");
    state.syncPasswordResetRequestAccountInput = ref("");
    state.syncShowPasswordModal = ref(false);
    state.syncShowEmailModal = ref(false);
    state.syncEmailActionMode = ref('change');
    state.syncEmailActionInput = ref('');
    state.syncEmailCodeInput = ref('');
    state.syncEmailActionError = ref('');
    state.syncEmailActionNotice = ref('');
    state.syncVerificationCooldownSeconds = ref(0);
    state.syncVerificationSubmitCooldownSeconds = ref(0);
    state.syncEmailChangeCooldownSeconds = ref(0);
    state.syncResetCodeRequestCooldownSeconds = ref(0);
    state.syncPaymentChannelInput = ref('');
    state.syncPaymentReferenceInput = ref('');
    state.syncPaymentMerchantOrderInput = ref('');
    state.syncPaymentPaidTimeInput = ref('');
    state.syncPaymentClaimError = ref('');
    state.syncPaymentClaimNotice = ref('');
    state.syncTurnstileRef = ref(null);
    state.syncTurnstileWidgetId = ref(null);
    state.syncTurnstileToken = ref("");
    state.syncTurnstileLoading = ref(false);
    state.syncTurnstileUnavailable = ref(false);
    state.syncTurnstileMessageKey = ref("");
    state.syncTurnstileMessageFallback = ref("");
    state.syncTurnstileMessageTone = ref("info");
    state.syncSessionChecking = ref(false);
    state.syncError = ref("");
    state.syncErrorDetails = ref("");
    state.syncNotice = ref("");
    state.syncRemoteData = ref({});
    state.syncRemoteVersion = ref(0);
    state.syncRemoteUpdatedAt = ref("");
    state.syncConflictDetected = ref(false);
    state.syncConflictCurrent = ref(null);
    state.syncConflictConfirmMode = ref("");
    state.syncRestrictionCode = ref("");
    state.syncSuccessToastEnabled = ref(storedPrefs.successToastEnabled !== false);
    state.syncAutoSyncEnabled = ref(storedPrefs.autoSyncEnabled !== false);
    state.syncApiBaseInput = ref(String(storedDevSettings.apiBase || ""));
    state.syncDevHeaderNameInput = ref(String(storedDevSettings.headerName || ""));
    state.syncDevHeaderValueInput = ref(String(storedDevSettings.headerValue || ""));
    state.syncLastSyncedServerVersion = ref(Number(storedMeta.serverVersion || 0));
    state.syncLastSyncedAt = ref(String(storedMeta.syncedAt || ""));
    state.syncLastRemoteUpdatedAt = ref(String(storedMeta.remoteUpdatedAt || ""));
    state.syncLastLocalHash = ref(String(storedMeta.localHash || ""));
    state.syncAutoSyncDueAt = ref(0);
    state.syncAutoSyncClock = ref(Date.now());
    state.syncCurrentComparableHash = computed(() =>
      buildComparableHash(buildLocalComparable({ planTier: getCurrentPlanTier() }))
    );
    state.syncLastSyncedDisplay = computed(() => formatSyncDateTime(state.syncLastSyncedAt.value));
    state.syncRemoteUpdatedDisplay = computed(() => formatSyncDateTime(state.syncRemoteUpdatedAt.value));
    state.syncAutoSyncText = computed(() => {
      const dueAt = Number(state.syncAutoSyncDueAt.value || 0);
      const seconds = dueAt > 0 ? getAutoSyncRemainingSeconds() : Math.round(autoSyncDelayMs / 1000);
      const currentHash = String(state.syncCurrentComparableHash.value || "");
      const lastHash = String(state.syncLastLocalHash.value || "");
      if (!state.syncAuthenticated.value) {
        return getSyncText("sync.auto_sync_signed_out", "登录后开启自动同步");
      }
      if (state.syncRestrictionCode.value === "email_verification_required") {
        return getSyncText("sync.auto_sync_blocked_email_verification", "邮箱验证已超期，部分同步功能已受限，请先完成邮箱验证。");
      }
      if (!(state.syncUser.value && state.syncUser.value.auto_sync_allowed)) {
        return getSyncText("sync.auto_sync_member_only", "当前档位不支持自动同步");
      }
      if (!state.syncAutoSyncEnabled.value) {
        return getSyncText("sync.auto_sync_disabled", "自动同步已关闭");
      }
      if (state.syncConflictDetected.value) {
        return getSyncText("sync.auto_sync_conflict", "已暂停，需先处理同步冲突");
      }
      if (state.syncBusy.value) {
        return getSyncText("sync.auto_sync_syncing", "正在同步");
      }
      if (currentHash && currentHash !== lastHash && isAutoSyncRetryExhaustedForHash(currentHash)) {
        return String(state.syncError.value || "自动同步已暂停，请处理错误后手动重试。");
      }
      if (currentHash && currentHash !== lastHash) {
        return getSyncText(
          "sync.auto_sync_scheduled",
          `检测到本地改动，约 ${seconds} 秒后自动同步`,
          { seconds: String(seconds) }
        );
      }
      return getSyncText(
        "sync.auto_sync_waiting",
        "已开启，检测到本地改动后会自动同步"
      );
    });

    state.syncLocalSummary = computed(() => summarizePayload(buildLocalPayload(), 0, ""));
    state.syncRemoteSummary = computed(() =>
      summarizePayload(state.syncRemoteData.value, state.syncRemoteVersion.value, state.syncRemoteUpdatedAt.value)
    );
    state.syncConflictCurrentSummary = computed(() =>
      summarizePayload(
        state.syncConflictCurrent.value ? state.syncConflictCurrent.value.data : {},
        state.syncConflictCurrent.value ? state.syncConflictCurrent.value.version : 0,
        state.syncConflictCurrent.value ? state.syncConflictCurrent.value.updated_at : ""
      )
    );
    state.syncIsLocalhostMode = computed(() => isLocalhostFrontend());
    state.syncShowDevPanel = computed(() => isLocalhostFrontend() && runtimeEnv !== "production");
    state.syncDevExpanded = ref(false);
    state.syncFrontendBlocked = computed(() => !isSyncFrontendAllowed());
    state.syncFrontendBlockedMessage = computed(() =>
      isSyncFrontendAllowed() ? "" : resolveSyncEntry(getSyncFrontendBlockedEntry()).text
    );
    state.syncTurnstileEnabled = computed(() => isTurnstileEnabled());
    state.syncTurnstileMounted = computed(() => Boolean(state.syncTurnstileWidgetId.value));
    state.syncTurnstileVerified = computed(() => Boolean(state.syncTurnstileToken.value));
    state.syncTurnstileReadyToSubmit = computed(() =>
      !state.syncTurnstileEnabled.value || Boolean(state.syncTurnstileToken.value)
    );
    state.syncTurnstileMessage = computed(() =>
      state.syncTurnstileMessageKey.value
        ? getSyncText(state.syncTurnstileMessageKey.value, state.syncTurnstileMessageFallback.value)
        : ""
    );
    state.formatSyncDateTime = formatSyncDateTime;
    state.submitSyncAuth = submitSyncAuth;
    state.submitSyncPasswordChange = submitSyncPasswordChange;
    state.openSyncPasswordModal = openSyncPasswordModal;
    state.requestSyncResetCode = requestSyncResetCode;
    state.closeSyncPasswordModal = closeSyncPasswordModal;
    state.openSyncEmailModal = openSyncEmailModal;
    state.closeSyncEmailModal = closeSyncEmailModal;
    state.beginOverlayPointerClose = beginOverlayPointerClose;
    state.finishOverlayPointerClose = finishOverlayPointerClose;
    state.cancelOverlayPointerClose = cancelOverlayPointerClose;
    state.submitSyncEmailAction = submitSyncEmailAction;
    state.sendSyncVerificationCode = sendSyncVerificationCode;
    state.submitPaymentClaim = submitPaymentClaim;
    state.formatClaimTime = formatClaimTime;
    state.logoutSync = logoutSync;
    state.performManualSync = performManualSync;
    state.resolveSyncConflictUseServer = resolveSyncConflictUseServer;
    state.resolveSyncConflictUseLocal = resolveSyncConflictUseLocal;
    state.confirmSyncConflictResolution = confirmSyncConflictResolution;
    state.cancelSyncConflictConfirmation = cancelSyncConflictConfirmation;
    state.refreshSyncSession = refreshSyncSession;
    state.formatSyncPaymentChannelLabel = formatSyncPaymentChannelLabel;
    state.formatSyncPaymentStatusLabel = formatSyncPaymentStatusLabel;
    state.clearSyncFeedback = clearSyncFeedback;
    state.saveSyncDevSettings = () => {
      state.syncApiBaseInput.value = String(state.syncApiBaseInput.value || "").trim();
      state.syncDevHeaderNameInput.value = String(state.syncDevHeaderNameInput.value || "").trim();
      state.syncDevHeaderValueInput.value = String(state.syncDevHeaderValueInput.value || "").trim();
      persistDevSettings();
      setSyncNotice(createSyncTextEntry("sync.dev_settings_saved", "开发设置已保存。"), "info");
    };

    let syncRuntimeMounted = false;
    let syncRuntimeStarted = false;
    let syncCooldownsRestored = false;

    const startSyncRuntime = () => {
      if (syncRuntimeStarted || !syncRuntimeMounted || !isSyncFrontendAllowed()) return;
      syncRuntimeStarted = true;
      if (typeof window !== "undefined") {
        const handleSyncVisibilityRecovery = () => {
          if (!isDocumentVisible() || !isSyncFrontendAllowed()) return;
          runPassiveRemoteCheck({ silentBlocked: true, silentErrors: true });
        };
        state.__handleSyncVisibilityRecovery = handleSyncVisibilityRecovery;
        window.addEventListener("focus", handleSyncVisibilityRecovery);
        window.addEventListener("pageshow", handleSyncVisibilityRecovery);
        if (typeof document !== "undefined") {
          document.addEventListener("visibilitychange", handleSyncVisibilityRecovery);
        }
        remoteRefreshTimer = setInterval(() => {
          if (!isDocumentVisible() || !isSyncFrontendAllowed()) return;
          runPassiveRemoteCheck({ silentBlocked: true, silentErrors: true });
        }, remoteRefreshIntervalMs);
      }
      if (!syncCooldownsRestored) {
        restoreCooldownFromSession("verify");
        restoreCooldownFromSession("verify-submit");
        restoreCooldownFromSession("change");
        restoreCooldownFromSession("reset-request");
        syncCooldownsRestored = true;
      }
      if (readSessionHint()) {
        refreshSyncSession(false, { forceFullSnapshot: true });
      }
      if (state.showSyncModal.value) {
        void mountSyncTurnstile();
      }
    };

    const stopSyncRuntime = () => {
      stopRemoteRefreshTimer();
      const handleSyncVisibilityRecovery = state.__handleSyncVisibilityRecovery;
      if (handleSyncVisibilityRecovery && typeof window !== "undefined") {
        window.removeEventListener("focus", handleSyncVisibilityRecovery);
        window.removeEventListener("pageshow", handleSyncVisibilityRecovery);
      }
      if (handleSyncVisibilityRecovery && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleSyncVisibilityRecovery);
      }
      state.__handleSyncVisibilityRecovery = null;
      clearAdblockDetectionTimer();
      state.showAdblockNotice.value = false;
      state.aboutAdLoaded.value = false;
      if (!isSyncFrontendAllowed()) {
        state.showSyncModal.value = false;
        state.syncShowPasswordModal.value = false;
        state.syncShowEmailModal.value = false;
        clearSyncModalCleanupTimer();
        destroySyncTurnstileWidget();
      }
      syncRuntimeStarted = false;
    };

    const syncRuntimeStateChanged = () => {
      if (!syncRuntimeMounted) return;
      if (isSyncFrontendAllowed()) {
        startSyncRuntime();
        return;
      }
      stopSyncRuntime();
    };

    if (typeof onMounted === "function") {
      onMounted(() => {
        syncRuntimeMounted = true;
        syncRuntimeStateChanged();
      });
    }

    if (typeof watch === "function") {
      watch([state.isOfficialDeployment, state.syncRegionAccessMode], () => {
        syncRuntimeStateChanged();
      });
    }

    if (typeof onBeforeUnmount === "function") {
      onBeforeUnmount(() => {
        syncRuntimeMounted = false;
        stopSyncRuntime();
        clearSyncModalCleanupTimer();
        destroySyncTurnstileWidget();
        clearCooldownTimer('verify');
        clearCooldownTimer('verify-submit');
        clearCooldownTimer('change');
        clearCooldownTimer('reset-request');
      });
    }

    watch(state.syncSuccessToastEnabled, () => {
      persistPrefs();
    });

    watch(state.syncAutoSyncEnabled, () => {
      persistPrefs();
    });

    watch(
      () => Boolean(state.syncUser.value && state.syncUser.value.auto_sync_allowed),
      (allowed) => {
        if (!allowed) {
          clearAutoSyncTimer();
        }
        lastAutoSyncEntitlement = allowed;
      },
      { immediate: true }
    );

    watch(
      () => [
        Boolean(state.syncAuthenticated.value),
        Boolean(state.syncBusy.value),
        Boolean(state.syncConflictDetected.value),
        String(state.syncRestrictionCode.value || ""),
        String(state.syncCurrentComparableHash.value || ""),
        String(state.syncLastLocalHash.value || ""),
      ],
      (current, previous) => {
        const [authenticated, busy, conflict, restrictionCode, currentHash, lastHash] = current;
        const autoSyncAllowed = Boolean(state.syncUser.value && state.syncUser.value.auto_sync_allowed);
        const autoSyncEnabled = Boolean(state.syncAutoSyncEnabled.value);
        if (!authenticated || !autoSyncAllowed || !autoSyncEnabled || busy || conflict || restrictionCode || !currentHash || currentHash === lastHash) {
          clearAutoSyncTimer();
          return;
        }
        const previousHash = Array.isArray(previous) ? previous[4] : "";
        if (currentHash !== previousHash || !autoSyncTimer) {
          scheduleAutoSync();
        }
      },
      { immediate: true }
    );

    watch(
      () => [Boolean(state.syncConflictDetected.value), String(state.syncCurrentComparableHash.value || "")],
      (current, previous) => {
        const [conflictDetected, currentHash] = current;
        if (!conflictDetected) {
          lastSyncConflictReminderHash = "";
          lastSyncConflictReminderAt = 0;
          return;
        }
        if (!currentHash) return;
        const previousConflict = Array.isArray(previous) ? Boolean(previous[0]) : false;
        const previousHash = Array.isArray(previous) ? String(previous[1] || "") : "";
        if (!previousConflict) {
          lastSyncConflictReminderHash = currentHash;
          return;
        }
        if (currentHash === previousHash || currentHash === lastSyncConflictReminderHash) return;
        const now = Date.now();
        if (now - lastSyncConflictReminderAt < syncConflictReminderThrottleMs) return;
        lastSyncConflictReminderHash = currentHash;
        lastSyncConflictReminderAt = now;
        pushSyncConflictToast({ dedupWindowMs: 0 });
      }
    );

    watch(state.showSyncModal, (open) => {
      if (open) {
        clearSyncModalCleanupTimer();
        if (!ensureSyncFrontendAllowed({ silent: true })) return;
        const now = Date.now();
        const shouldCheck =
          !lastSyncModalOpenCheckAt || (now - lastSyncModalOpenCheckAt) >= syncModalOpenCheckCooldownMs;
        if (shouldCheck) {
          lastSyncModalOpenCheckAt = now;
          if (state.syncAuthenticated.value) {
            refreshSyncSession(false, { forceFullSnapshot: true });
          } else {
            runPassiveRemoteCheck({ force: true, silentBlocked: true, silentErrors: true });
          }
        }
        if (typeof nextTick === "function") {
          nextTick(() => {
            void mountSyncTurnstile();
          });
        } else {
          void mountSyncTurnstile();
        }
        return;
      }
      scheduleSyncModalCleanup();
    });

    watch(
      () => [
        Boolean(state.appReady && state.appReady.value),
        Boolean(state.syncAuthenticated.value),
        state.syncUser && state.syncUser.value ? state.syncUser.value.ad_free : null,
      ],
      ([appReady, authenticated, adFree]) => {
        clearAdblockDetectionTimer();
        state.showAdblockNotice.value = false;
        state.aboutAdLoaded.value = false;
        if (!appReady) return;
        if (authenticated && adFree === null) return;
        if (adFree) return;
        const runCheck = () => {
          if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(() => {
              window.setTimeout(maybeShowAdblockNoticeOnce, 120);
            });
            return;
          }
          window.setTimeout(maybeShowAdblockNoticeOnce, 120);
        };
        if (typeof nextTick === 'function') {
          nextTick(runCheck);
        } else {
          runCheck();
        }
      },
      { immediate: true }
    );

    state.closeAdblockNotice = closeAdblockNotice;

    watch(
      () => [Boolean(state.showSyncModal.value), Boolean(state.syncAuthenticated.value)],
      ([open, authenticated]) => {
        if (!open) return;
        if (authenticated) {
          destroySyncTurnstileWidget();
          return;
        }
        void mountSyncTurnstile();
      }
    );

    watch(state.syncAuthMode, () => {
      if (!state.showSyncModal.value || state.syncAuthenticated.value || !isTurnstileEnabled()) return;
      clearSyncTurnstileMessage();
      destroySyncTurnstileWidget();
      void mountSyncTurnstile();
    });

    watch(state.syncPaymentChannelInput, (channel, prev) => {
      const next = String(channel || '');
      const previous = String(prev || '');
      if (previous === next) return;
      if (!previous) return;
      state.syncPaymentReferenceInput.value = '';
      state.syncPaymentMerchantOrderInput.value = '';
      state.syncPaymentPaidTimeInput.value = '';
      state.syncPaymentClaimError.value = '';
      state.syncPaymentClaimNotice.value = '';
    });

  };

  modules.initSync.required = ["initState", "initStorage", "initModals"];
  modules.initSync.optional = ["initUi", "initUpdate"];
  modules.initSync.requiredProviders = [];
  modules.initSync.optionalProviders = [];
})();
