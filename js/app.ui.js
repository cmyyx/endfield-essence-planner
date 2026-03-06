(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initUi = function initUi(ctx, state) {
    const { ref, onMounted, onBeforeUnmount, nextTick } = ctx;

    const showBackToTop = state.showBackToTop;
    const showLangMenu = state.showLangMenu;
    const showSecondaryMenu = state.showSecondaryMenu;
    const showPlanConfig = state.showPlanConfig;
    const showPlanConfigHintDot = state.showPlanConfigHintDot;
    const showGearRefiningNavHintDot = state.showGearRefiningNavHintDot;
    const showRerunRankingNavHintDot = state.showRerunRankingNavHintDot;
    const isPortrait = state.isPortrait;
    const updateLangMenuPlacement = state.updateLangMenuPlacement;
    const reportStorageIssue = (operation, key, error, meta) => {
      if (typeof state.reportStorageIssue === "function") {
        state.reportStorageIssue(operation, key, error, meta);
        return;
      }
      const queue = Array.isArray(state.pendingStorageIssues) ? state.pendingStorageIssues : [];
      queue.push({ operation, key, error, meta });
      state.pendingStorageIssues = queue.slice(-20);
    };

    const root = typeof document !== "undefined" ? document.documentElement : null;
    const defaultBackgroundUrl = "https://img.canmoe.com/image?img=ua";
    const defaultBackgroundCssValue = `url("${defaultBackgroundUrl}")`;
    const preloadBackgroundTimeoutMs = 850;
    const preloadBackgroundFadeMs = 720;
    let preloadBackgroundFadeTimer = null;
    const mobileLayoutBreakpoint = 1024;

    const readStorageValue = (key) => {
      if (!key) return "";
      try {
        return String(localStorage.getItem(key) || "");
      } catch (error) {
        reportStorageIssue("storage.read", key, error, {
          scope: "ui.read-storage-value",
        });
        return "";
      }
    };

    const hasStoredCustomBackground = () => {
      const key = state.backgroundStorageKey || "planner-bg-image:v1";
      const raw = readStorageValue(key);
      if (!raw) return false;
      if (raw.startsWith("data:")) return true;
      try {
        const parsed = JSON.parse(raw);
        return Boolean(parsed && typeof parsed.data === "string" && parsed.data.trim());
      } catch (error) {
        return false;
      }
    };

    const hasStoredBackgroundApi = () => {
      const key = state.backgroundApiStorageKey || "planner-bg-api:v1";
      const raw = readStorageValue(key);
      return Boolean(raw && raw.trim());
    };

    const setPreloadPhaseText = ({ status = "", current = "", help = "" } = {}) => {
      if (typeof document === "undefined") return;
      const overlay = document.getElementById("app-preload");
      if (!overlay) return;
      const statusEl = overlay.querySelector(".preload-status");
      const currentEl = overlay.querySelector(".preload-current");
      const helpEl = overlay.querySelector(".preload-help");
      if (statusEl) statusEl.textContent = status;
      if (currentEl) currentEl.textContent = current;
      if (helpEl) helpEl.textContent = help;
    };

    const runtimeWarningLogLimit = 20;
    const runtimeWarningDedupWindowMs = 4000;
    const optionalFailureNotificationDedupWindowMs = 10000;
    const optionalFailureVisibleLimit = 2;
    const optionalFailureToastDurationMs = 6500;
    const optionalFailureQueueKey = "__bootOptionalLoadFailures";
    const optionalFailureEventName = "planner:optional-resource-failed";
    let optionalFailurePollTimer = null;
    const optionalFailureToastTimers = new Map();
    let lastRuntimeWarningSignature = "";
    let lastRuntimeWarningAt = 0;
    const optionalFailureLastSeenAt = new Map();
    const optionalFailureNotices = state.optionalFailureNotices || ref([]);
    const optionalFailureNotice = state.optionalFailureNotice || ref(null);
    const optionalFailureHistory = state.optionalFailureHistory || ref([]);
    const hasOptionalFailureHistory = state.hasOptionalFailureHistory || ref(false);
    hasOptionalFailureHistory.value =
      Array.isArray(optionalFailureHistory.value) && optionalFailureHistory.value.length > 0;
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
    const truncateText = (value, maxLength) => {
      const text = String(value || "");
      if (!text || maxLength <= 0) return "";
      if (text.length <= maxLength) return text;
      return `${text.slice(0, maxLength)}…`;
    };
    const buildRuntimeWarningEntry = (error, meta) => {
      const scope = meta && meta.scope ? String(meta.scope) : "init-ui";
      const operation = meta && meta.operation ? String(meta.operation) : "runtime.init";
      const key = meta && meta.key ? String(meta.key) : "app.ui:onMounted";
      const title =
        meta && meta.title
          ? String(meta.title)
          : typeof state.t === "function"
          ? state.t("error.page_init_title")
          : "页面初始化异常";
      const summary =
        meta && meta.summary
          ? String(meta.summary)
          : typeof state.t === "function"
          ? state.t("error.page_init_summary")
          : "页面初始化阶段发生异常，部分功能可能不可用。";
      return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        title,
        summary,
        occurredAt: nowIsoString(),
        operation,
        key,
        scope,
        errorName: error && error.name ? String(error.name) : "Error",
        errorMessage: error && error.message ? String(error.message) : "unknown",
        errorStack: error && error.stack ? String(error.stack) : "",
        note: meta && meta.note ? String(meta.note) : "",
      };
    };
    const buildRuntimeWarningPreviewText = (entry) => {
      if (!entry) return "";
      const lines = [
        `scope: ${entry.scope || "unknown"}`,
        `operation: ${entry.operation || "unknown"}`,
        `key: ${entry.key || "unknown"}`,
        `error: ${entry.errorName || "Error"}: ${entry.errorMessage || "unknown"}`,
      ];
      if (entry.note) {
        lines.push(`note: ${entry.note}`);
      }
      if (entry.errorStack) {
        lines.push("", "stack:", truncateText(entry.errorStack, 1800));
      }
      return lines.join("\n");
    };
    const syncOptionalFailurePrimaryNotice = () => {
      if (!optionalFailureNotice || !optionalFailureNotices) return;
      const list = Array.isArray(optionalFailureNotices.value) ? optionalFailureNotices.value : [];
      optionalFailureNotice.value = list.length ? list[0] : null;
    };
    const setVisibleOptionalFailureNotices = (nextList) => {
      if (!optionalFailureNotices) return;
      const list = Array.isArray(nextList) ? nextList.slice(0, optionalFailureVisibleLimit) : [];
      optionalFailureNotices.value = list;
      syncOptionalFailurePrimaryNotice();
    };
    const clearOptionalFailureToastTimer = (noticeId) => {
      const key = String(noticeId || "");
      if (!key) return;
      const timer = optionalFailureToastTimers.get(key);
      if (!timer) return;
      clearTimeout(timer);
      optionalFailureToastTimers.delete(key);
    };
    const clearAllOptionalFailureToastTimers = () => {
      for (const timer of optionalFailureToastTimers.values()) {
        clearTimeout(timer);
      }
      optionalFailureToastTimers.clear();
    };
    const removeVisibleOptionalFailureNotice = (noticeId) => {
      if (!optionalFailureNotices) return;
      const key = String(noticeId || "");
      if (!key) {
        setVisibleOptionalFailureNotices([]);
        return;
      }
      const current = Array.isArray(optionalFailureNotices.value) ? optionalFailureNotices.value : [];
      const next = current.filter((item) => String((item && item.id) || "") !== key);
      setVisibleOptionalFailureNotices(next);
    };
    const scheduleOptionalFailureAutoDismiss = (noticeId) => {
      const key = String(noticeId || "");
      if (!key) return;
      clearOptionalFailureToastTimer(key);
      const timer = setTimeout(() => {
        optionalFailureToastTimers.delete(key);
        removeVisibleOptionalFailureNotice(key);
      }, optionalFailureToastDurationMs);
      optionalFailureToastTimers.set(key, timer);
    };
    const dismissOptionalFailureNotice = (noticeId) => {
      if (!optionalFailureNotices) return;
      if (!noticeId) {
        const first =
          Array.isArray(optionalFailureNotices.value) && optionalFailureNotices.value.length
            ? optionalFailureNotices.value[0]
            : null;
        if (!first || !first.id) return;
        clearOptionalFailureToastTimer(first.id);
        removeVisibleOptionalFailureNotice(first.id);
        return;
      }
      clearOptionalFailureToastTimer(noticeId);
      removeVisibleOptionalFailureNotice(noticeId);
    };
    const pushOptionalFailureNotice = (entry, meta) => {
      if (!optionalFailureNotices || !optionalFailureHistory) return;
      const signature = String((meta && meta.optionalSignature) || entry.key || "").trim();
      const notice = {
        id: entry.id,
        logId: entry.id,
        occurredAt: entry.occurredAt || nowIsoString(),
        title: entry.title,
        summary: entry.summary,
        note: entry.note || "",
        signature,
      };
      const nextHistory = [notice].concat(
        Array.isArray(optionalFailureHistory.value) ? optionalFailureHistory.value : []
      );
      optionalFailureHistory.value = nextHistory.slice(0, runtimeWarningLogLimit);
      hasOptionalFailureHistory.value = optionalFailureHistory.value.length > 0;
      const now = Date.now();
      if (signature) {
        const lastAt = optionalFailureLastSeenAt.get(signature) || 0;
        if (now - lastAt <= optionalFailureNotificationDedupWindowMs) {
          return;
        }
        optionalFailureLastSeenAt.set(signature, now);
      }
      const current = Array.isArray(optionalFailureNotices.value) ? optionalFailureNotices.value : [];
      const withoutSameSignature = signature
        ? current.filter((item) => String((item && item.signature) || "") !== signature)
        : current.slice();
      const nextVisible = [notice].concat(withoutSameSignature).slice(0, optionalFailureVisibleLimit);
      const dropped = [notice].concat(withoutSameSignature).slice(optionalFailureVisibleLimit);
      dropped.forEach((item) => {
        if (item && item.id) {
          clearOptionalFailureToastTimer(item.id);
        }
      });
      setVisibleOptionalFailureNotices(nextVisible);
      scheduleOptionalFailureAutoDismiss(notice.id);
    };
    const resolveRuntimeWarningLogById = (logId) => {
      if (!state.runtimeWarningLogs || !Array.isArray(state.runtimeWarningLogs.value)) return null;
      const idText = String(logId || "");
      return state.runtimeWarningLogs.value.find((item) => String((item && item.id) || "") === idText) || null;
    };
    const openOptionalFailureDetailByLogId = (logId) => {
      const target = resolveRuntimeWarningLogById(logId);
      if (target && typeof state.openUnifiedExceptionFromLog === "function") {
        state.openUnifiedExceptionFromLog(target);
      } else if (target && state.runtimeWarningCurrent && state.showRuntimeWarningModal) {
        state.runtimeWarningCurrent.value = target;
        if (state.runtimeWarningPreviewText) {
          state.runtimeWarningPreviewText.value = buildRuntimeWarningPreviewText(target);
        }
        state.showRuntimeWarningModal.value = true;
      } else if (state.showRuntimeWarningModal) {
        state.showRuntimeWarningModal.value = true;
      }
      dismissOptionalFailureNotice();
    };
    const openLatestOptionalFailureDetail = () => {
      const first =
        optionalFailureHistory && Array.isArray(optionalFailureHistory.value)
          ? optionalFailureHistory.value[0]
          : null;
      if (!first) return;
      openOptionalFailureDetailByLogId(first.logId);
    };
    const showUiInitWarning = (error, meta) => {
      const runtimeWarningCurrent = state.runtimeWarningCurrent;
      const runtimeWarningLogs = state.runtimeWarningLogs;
      const runtimeWarningPreviewText = state.runtimeWarningPreviewText;
      const showRuntimeWarningModal = state.showRuntimeWarningModal;
      const runtimeWarningIgnored = state.runtimeWarningIgnored;
      const asToast = Boolean(meta && meta.asToast);
      if (
        !runtimeWarningCurrent ||
        !runtimeWarningLogs ||
        !runtimeWarningPreviewText ||
        !showRuntimeWarningModal
      ) {
        return;
      }
      const forceShow = Boolean(meta && meta.forceShow);
      if (!asToast && !forceShow && runtimeWarningIgnored && runtimeWarningIgnored.value) {
        return;
      }
      const entry = buildRuntimeWarningEntry(error, meta);
      const signature = `${entry.operation}|${entry.key}|${entry.errorName}|${entry.errorMessage}`;
      const isOptionalToast = Boolean(
        asToast && meta && String(meta.optionalSignature || "").trim()
      );
      const now = Date.now();
      if (
        !isOptionalToast &&
        signature === lastRuntimeWarningSignature &&
        now - lastRuntimeWarningAt <= runtimeWarningDedupWindowMs
      ) {
        return;
      }
      lastRuntimeWarningSignature = signature;
      lastRuntimeWarningAt = now;
      runtimeWarningCurrent.value = entry;
      runtimeWarningPreviewText.value = buildRuntimeWarningPreviewText(entry);
      const nextLogs = [entry].concat(
        Array.isArray(runtimeWarningLogs.value) ? runtimeWarningLogs.value : []
      );
      runtimeWarningLogs.value = nextLogs.slice(0, runtimeWarningLogLimit);
      if (asToast) {
        pushOptionalFailureNotice(entry, meta);
        return;
      }
      showRuntimeWarningModal.value = true;
    };
    const reportRuntimeWarning = (error, meta) => {
      showUiInitWarning(error, meta);
    };
    const flushBootOptionalFailureQueue = (incomingItems) => {
      const queued =
        incomingItems && Array.isArray(incomingItems)
          ? incomingItems
          : typeof window !== "undefined" && Array.isArray(window[optionalFailureQueueKey])
          ? window[optionalFailureQueueKey]
          : [];
      if (!queued.length) return;
      if (typeof window !== "undefined" && window[optionalFailureQueueKey] === queued) {
        window[optionalFailureQueueKey] = [];
      }
      const normalized = [];
      queued.forEach((item) => {
        if (!item || typeof item !== "object") return;
        const featureKey = String(item.featureKey || "").trim();
        const resourceLabel = String(item.resource || item.resourceLabel || item.label || item.src || "").trim();
        const signature = String(item.signature || `${featureKey}|${resourceLabel}`).trim();
        if (!resourceLabel || !signature) return;
        normalized.push({
          occurredAt: String(item.occurredAt || nowIsoString()),
          signature,
          featureKey,
          featureLabel: String(item.featureLabel || "").trim(),
          resourceLabel,
        });
      });
      if (!normalized.length) return;
      normalized.forEach((item) => {
        const featureLabel = (() => {
          if (!item.featureKey && !item.featureLabel) return "";
          if (typeof state.t !== "function") return item.featureKey || item.featureLabel || "";
          if (!item.featureKey) return item.featureLabel || "";
          const i18nKey = `optional_feature_${item.featureKey}`;
          const translated = state.t(i18nKey);
          if (translated && translated !== i18nKey) return translated;
          return item.featureLabel || item.featureKey;
        })();
        const detailLines = [];
        if (featureLabel && typeof state.t === "function") {
          detailLines.push(
            state.t("warning.affected_features_features", {
              features: featureLabel,
            })
          );
        }
        if (item.resourceLabel && typeof state.t === "function") {
          detailLines.push(
            state.t("warning.failed_resources_resources", {
              resources: item.resourceLabel,
            })
          );
        }
        if (typeof state.t === "function") {
          detailLines.push(state.t("optional.impact_optional_features_only_core_functionality_remains"));
        }
        const messageParts = [];
        if (featureLabel) {
          messageParts.push(featureLabel);
        }
        if (item.resourceLabel) {
          messageParts.push(item.resourceLabel);
        }
        const error = new Error(messageParts.join(" / ") || "optional resource failed");
        error.name = "OptionalResourceLoadError";
        showUiInitWarning(error, {
          scope: "boot.optional-resource",
          operation: "optional.load",
          key: item.signature,
          title:
            typeof state.t === "function"
              ? state.t("error.optional_feature_load_failed")
              : "可选功能加载失败",
          summary:
            typeof state.t === "function"
              ? state.t("warning.some_optional_features_could_not_be_loaded_core_page_usa")
              : "部分可选功能未能加载，页面主体仍可继续使用。",
          note: detailLines.join("\n"),
          asToast: true,
          optionalSignature: item.signature,
          occurredAt: item.occurredAt || nowIsoString(),
        });
      });
    };
    const handleOptionalFailureEvent = (event) => {
      if (!event) return;
      flushBootOptionalFailureQueue();
    };

    const dismissRuntimeWarning = () => {
      if (state.showRuntimeWarningModal) {
        state.showRuntimeWarningModal.value = false;
      }
    };

    const ignoreRuntimeWarnings = () => {
      if (state.runtimeWarningIgnored) {
        state.runtimeWarningIgnored.value = true;
      }
      if (state.showRuntimeIgnoreConfirmModal) {
        state.showRuntimeIgnoreConfirmModal.value = false;
      }
      dismissRuntimeWarning();
    };

    const requestIgnoreRuntimeWarnings = () => {
      if (state.showRuntimeIgnoreConfirmModal) {
        state.showRuntimeIgnoreConfirmModal.value = true;
      }
    };

    const cancelIgnoreRuntimeWarnings = () => {
      if (state.showRuntimeIgnoreConfirmModal) {
        state.showRuntimeIgnoreConfirmModal.value = false;
      }
    };

    const confirmIgnoreRuntimeWarnings = () => {
      ignoreRuntimeWarnings();
    };

    const reloadBypassCache = () => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      url.searchParams.set("__reload_ts", String(Date.now()));
      window.location.replace(url.toString());
    };

    const exportRuntimeDiagnosticBundle = () => {
      try {
        const payload = {
          exportedAt: nowIsoString(),
          fingerprint: getAppFingerprint(),
          location: typeof window !== "undefined" ? window.location.href : "",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          online:
            typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
              ? navigator.onLine
              : null,
          feedbackUrl: state.storageFeedbackUrl || "https://github.com/cmyyx/endfield-essence-planner/issues",
          currentIssue: state.runtimeWarningCurrent ? state.runtimeWarningCurrent.value || null : null,
          issueLogs:
            state.runtimeWarningLogs && Array.isArray(state.runtimeWarningLogs.value)
              ? state.runtimeWarningLogs.value
              : [],
          preview:
            state.runtimeWarningPreviewText && typeof state.runtimeWarningPreviewText.value === "string"
              ? state.runtimeWarningPreviewText.value
              : "",
        };
        const stamp = nowIsoString().replace(/[^\d]/g, "").slice(0, 14) || String(Date.now());
        triggerJsonDownload(`planner-runtime-diagnostic-${stamp}.json`, payload);
      } catch (error) {
        if (typeof console !== "undefined" && typeof console.error === "function") {
          console.error("[runtime-warning] export diagnostic failed", error);
        }
      }
    };

    const shouldWarmupDefaultBackground = () => {
      if (!root || typeof Image !== "function") return false;
      if (!root.classList.contains("preload")) return false;
      if (state.lowGpuEnabled && state.lowGpuEnabled.value) return false;
      if (state.backgroundDisplayEnabled && state.backgroundDisplayEnabled.value === false) return false;
      const customFile = state.customBackground ? String(state.customBackground.value || "").trim() : "";
      if (customFile) return false;
      const customApi = state.customBackgroundApi ? String(state.customBackgroundApi.value || "").trim() : "";
      if (customApi) return false;
      if (hasStoredCustomBackground()) return false;
      if (hasStoredBackgroundApi()) return false;
      const perfModeKey = state.perfModeStorageKey || "planner-perf-mode:v1";
      const perfMode = readStorageValue(perfModeKey);
      if (perfMode === "low") return false;
      return true;
    };

    const warmupBackgroundBeforeFinish = () => {
      if (!shouldWarmupDefaultBackground()) {
        return Promise.resolve(false);
      }
      const bootT =
        typeof window !== "undefined" && window.__bootI18n && typeof window.__bootI18n.t === "function"
          ? window.__bootI18n.t
          : null;
      const stateT = typeof state.t === "function" ? state.t : (text) => text;
      const tByKey = (bootKey, fallbackKey) => (bootT ? bootT(bootKey) : stateT(fallbackKey));
      if (root) {
        root.style.setProperty("--bg-image", defaultBackgroundCssValue);
      }
      setPreloadPhaseText({
        status: tByKey("preload_status_background_prepare", "资源已就绪，正在准备背景…"),
        current: tByKey("preload_current_background", "当前：背景"),
        help: "",
      });
      return new Promise((resolve) => {
        let settled = false;
        const image = new Image();
        const settle = (loaded) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          let applied = false;
          if (
            loaded &&
            root &&
            root.classList.contains("preload") &&
            shouldWarmupDefaultBackground()
          ) {
            root.classList.add("bg-image-fading-in");
            applied = true;
            if (preloadBackgroundFadeTimer) {
              clearTimeout(preloadBackgroundFadeTimer);
            }
            preloadBackgroundFadeTimer = setTimeout(() => {
              preloadBackgroundFadeTimer = null;
              if (root) {
                root.classList.remove("bg-image-fading-in");
              }
            }, preloadBackgroundFadeMs);
          }
          resolve(applied);
        };
        const timeoutId = setTimeout(() => {
          settle(false);
        }, preloadBackgroundTimeoutMs);
        image.onload = () => settle(true);
        image.onerror = () => settle(false);
        image.src = defaultBackgroundUrl;
      });
    };

    const resolveTheme = (mode) => {
      if (mode === "light" || mode === "dark") return mode;
      if (typeof window === "undefined" || !window.matchMedia) return "dark";
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    };

    const applyTheme = (mode) => {
      const resolved = resolveTheme(mode);
      state.resolvedTheme.value = resolved;
      if (!root) return;
      root.setAttribute("data-theme", resolved);
      root.style.colorScheme = resolved;
    };

    const setThemeMode = (mode) => {
      const normalized = mode === "light" || mode === "dark" ? mode : "auto";
      state.themePreference.value = normalized;
      applyTheme(normalized);
    };

    let mediaTheme = null;
    let removeMediaThemeListener = null;

    const bindSystemThemeListener = () => {
      if (typeof window === "undefined" || !window.matchMedia) return;
      mediaTheme = window.matchMedia("(prefers-color-scheme: light)");
      const onChange = () => {
        if (state.themePreference.value === "auto") {
          applyTheme("auto");
        }
      };
      if (typeof mediaTheme.addEventListener === "function") {
        mediaTheme.addEventListener("change", onChange);
        removeMediaThemeListener = () => mediaTheme.removeEventListener("change", onChange);
      } else if (typeof mediaTheme.addListener === "function") {
        mediaTheme.addListener(onChange);
        removeMediaThemeListener = () => mediaTheme.removeListener(onChange);
      }
    };

    const backToTopRevealOffset = 240;
    const backToTopScrollDelta = 6;
    const backToTopIdleDelay = 200;
    let backToTopLastScroll = 0;
    let backToTopTimer = null;
    let viewportSafeBottomRaf = null;

    const updateViewportOrientation = () => {
      if (typeof window === "undefined") return;
      const viewportWidth =
        window.innerWidth ||
        (document.documentElement && document.documentElement.clientWidth) ||
        0;
      if (viewportWidth > 0) {
        isPortrait.value = viewportWidth <= mobileLayoutBreakpoint;
      } else if (window.matchMedia) {
        isPortrait.value = window.matchMedia("(orientation: portrait)").matches;
      } else {
        isPortrait.value = window.innerHeight >= window.innerWidth;
      }
      if (showLangMenu.value && updateLangMenuPlacement) {
        if (typeof nextTick === "function") {
          nextTick(updateLangMenuPlacement);
        } else {
          updateLangMenuPlacement();
        }
      }
    };

    updateViewportOrientation();

    const updateViewportSafeBottom = () => {
      if (typeof window === "undefined") return;
      const root = document.documentElement;
      if (!root) return;
      const viewport = window.visualViewport;
      if (!viewport) {
        root.style.removeProperty("--viewport-safe-bottom");
        return;
      }
      const blocked = Math.max(
        0,
        Math.round(window.innerHeight - (viewport.height + viewport.offsetTop))
      );
      root.style.setProperty("--viewport-safe-bottom", `${blocked}px`);
    };

    const scheduleViewportSafeBottom = () => {
      if (viewportSafeBottomRaf) return;
      viewportSafeBottomRaf = requestAnimationFrame(() => {
        viewportSafeBottomRaf = null;
        updateViewportSafeBottom();
      });
    };

    const clearBackToTopTimer = () => {
      if (backToTopTimer) {
        clearTimeout(backToTopTimer);
        backToTopTimer = null;
      }
    };

    const updateBackToTopVisibility = () => {
      if (typeof window === "undefined") return;
      const current = window.scrollY || window.pageYOffset || 0;
      const delta = current - backToTopLastScroll;
      if (current < backToTopRevealOffset) {
        showBackToTop.value = false;
      } else if (delta > backToTopScrollDelta) {
        showBackToTop.value = false;
      } else if (delta < -backToTopScrollDelta) {
        showBackToTop.value = true;
      }
      backToTopLastScroll = current;
      clearBackToTopTimer();
      backToTopTimer = setTimeout(() => {
        const position = window.scrollY || window.pageYOffset || 0;
        if (position >= backToTopRevealOffset) {
          showBackToTop.value = true;
        }
      }, backToTopIdleDelay);
    };

    const handleBackToTopScroll = () => {
      updateBackToTopVisibility();
    };

    const scrollToTop = () => {
      if (typeof window === "undefined") return;
      if (typeof window.scrollTo === "function") {
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        } catch (error) {
          // ignore and fall back
        }
      }
      window.scrollTo(0, 0);
    };

    const markPlanConfigHintSeen = () => {
      if (!showPlanConfigHintDot.value) return;
      showPlanConfigHintDot.value = false;
      try {
        localStorage.setItem(state.planConfigHintStorageKey, state.planConfigHintVersion);
      } catch (error) {
        reportStorageIssue("storage.write", state.planConfigHintStorageKey, error, {
          scope: "ui.plan-config-hint-write",
        });
      }
    };

    const markGearRefiningNavHintSeen = () => {
      if (!showGearRefiningNavHintDot.value) return;
      showGearRefiningNavHintDot.value = false;
      try {
        localStorage.setItem(
          state.gearRefiningNavHintStorageKey,
          state.gearRefiningNavHintVersion
        );
      } catch (error) {
        reportStorageIssue("storage.write", state.gearRefiningNavHintStorageKey, error, {
          scope: "ui.gear-refining-nav-hint-write",
        });
      }
    };
    const markRerunRankingNavHintSeen = () => {
      if (!showRerunRankingNavHintDot.value) return;
      showRerunRankingNavHintDot.value = false;
      try {
        localStorage.setItem(
          state.rerunRankingNavHintStorageKey,
          state.rerunRankingNavHintVersion
        );
      } catch (error) {
        reportStorageIssue("storage.write", state.rerunRankingNavHintStorageKey, error, {
          scope: "ui.rerun-ranking-nav-hint-write",
        });
      }
    };

    const togglePlanConfig = () => {
      const nextOpen = !showPlanConfig.value;
      showPlanConfig.value = nextOpen;
      if (nextOpen) {
        markPlanConfigHintSeen();
      }
    };

    const handleDocClick = (event) => {
      if (!event || !event.target || !event.target.closest) {
        showSecondaryMenu.value = false;
        showPlanConfig.value = false;
        showLangMenu.value = false;
        return;
      }
      if (showSecondaryMenu.value && !event.target.closest(".secondary-menu")) {
        showSecondaryMenu.value = false;
      }
      if (showPlanConfig.value && !event.target.closest(".plan-config")) {
        showPlanConfig.value = false;
      }
      if (showLangMenu.value && !event.target.closest(".lang-switch")) {
        showLangMenu.value = false;
      }
    };

    const handleDocKeydown = (event) => {
      if (!event) return;
      if (event.key === "Escape") {
        showSecondaryMenu.value = false;
        showPlanConfig.value = false;
        showLangMenu.value = false;
      }
    };

    const runAfterLayout = (callback) => {
      if (typeof callback !== "function") return;
      const run = () => {
        let settled = false;
        const invoke = () => {
          if (settled) return;
          settled = true;
          callback();
        };
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(invoke);
          setTimeout(invoke, 120);
          return;
        }
        setTimeout(invoke, 0);
      };
      if (typeof nextTick === "function") {
        nextTick(run);
      } else {
        run();
      }
    };

    onMounted(() => {
      const finalizePreload = () => {
        warmupBackgroundBeforeFinish()
          .catch(() => false)
          .then((loaded) => {
            finishPreload();
            if (!loaded && typeof state.reapplyBackground === "function") {
              requestAnimationFrame(() => {
                state.reapplyBackground();
              });
            }
          });
      };
      state.appReady.value = true;
      try {
        if (typeof window !== "undefined") {
          window.addEventListener(optionalFailureEventName, handleOptionalFailureEvent);
        }
        flushBootOptionalFailureQueue();
        optionalFailurePollTimer = setInterval(() => {
          flushBootOptionalFailureQueue();
        }, 1200);
        bindSystemThemeListener();
        applyTheme(state.themePreference.value || "auto");
        updateViewportOrientation();
        window.addEventListener("resize", updateViewportOrientation);
        updateViewportSafeBottom();
        window.addEventListener("resize", scheduleViewportSafeBottom);
        if (window.visualViewport) {
          window.visualViewport.addEventListener("resize", scheduleViewportSafeBottom);
          window.visualViewport.addEventListener("scroll", scheduleViewportSafeBottom);
        }
        if (typeof window !== "undefined") {
          backToTopLastScroll = window.scrollY || window.pageYOffset || 0;
          updateBackToTopVisibility();
          window.addEventListener("scroll", handleBackToTopScroll, { passive: true });
        }
        document.addEventListener("click", handleDocClick);
        document.addEventListener("keydown", handleDocKeydown);
      } catch (error) {
        if (typeof console !== "undefined" && typeof console.error === "function") {
          console.error("[initUi:onMounted] failed, fallback to finalize preload", error);
        }
        flushBootOptionalFailureQueue();
        showUiInitWarning(error, { scope: "init-ui.onMounted" });
      } finally {
        runAfterLayout(finalizePreload);
      }
    });

    onBeforeUnmount(() => {
      if (removeMediaThemeListener) {
        removeMediaThemeListener();
        removeMediaThemeListener = null;
      }
      mediaTheme = null;
      window.removeEventListener("resize", updateViewportOrientation);
      window.removeEventListener("resize", scheduleViewportSafeBottom);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", scheduleViewportSafeBottom);
        window.visualViewport.removeEventListener("scroll", scheduleViewportSafeBottom);
      }
      if (viewportSafeBottomRaf) {
        cancelAnimationFrame(viewportSafeBottomRaf);
        viewportSafeBottomRaf = null;
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("scroll", handleBackToTopScroll);
        window.removeEventListener(optionalFailureEventName, handleOptionalFailureEvent);
      }
      clearBackToTopTimer();
      if (optionalFailurePollTimer) {
        clearInterval(optionalFailurePollTimer);
        optionalFailurePollTimer = null;
      }
      clearAllOptionalFailureToastTimers();
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("keydown", handleDocKeydown);
      if (preloadBackgroundFadeTimer) {
        clearTimeout(preloadBackgroundFadeTimer);
        preloadBackgroundFadeTimer = null;
      }
      if (root) {
        root.classList.remove("bg-image-fading-in");
      }
    });

    syncOptionalFailurePrimaryNotice();
    state.reportRuntimeWarning = reportRuntimeWarning;
    state.scrollToTop = scrollToTop;
    state.setThemeMode = setThemeMode;
    state.togglePlanConfig = togglePlanConfig;
    state.markGearRefiningNavHintSeen = markGearRefiningNavHintSeen;
    state.markRerunRankingNavHintSeen = markRerunRankingNavHintSeen;
    state.dismissRuntimeWarning = dismissRuntimeWarning;
    state.ignoreRuntimeWarnings = ignoreRuntimeWarnings;
    state.requestIgnoreRuntimeWarnings = requestIgnoreRuntimeWarnings;
    state.cancelIgnoreRuntimeWarnings = cancelIgnoreRuntimeWarnings;
    state.confirmIgnoreRuntimeWarnings = confirmIgnoreRuntimeWarnings;
    state.optionalFailureNotices = optionalFailureNotices;
    state.optionalFailureNotice = optionalFailureNotice;
    state.optionalFailureHistory = optionalFailureHistory;
    state.hasOptionalFailureHistory = hasOptionalFailureHistory;
    state.dismissOptionalFailureNotice = dismissOptionalFailureNotice;
    state.openOptionalFailureDetailByLogId = openOptionalFailureDetailByLogId;
    state.openLatestOptionalFailureDetail = openLatestOptionalFailureDetail;
    state.reloadBypassCache = reloadBypassCache;
    state.exportRuntimeDiagnosticBundle = exportRuntimeDiagnosticBundle;
  };
  modules.initUi.required = ["initState"];
  modules.initUi.optional = ["initI18n", "initSearch"];
  modules.initUi.requiredProviders = [];
  modules.initUi.optionalProviders = [];
  modules.initUi.provides = ["reportRuntimeWarning"];
})();
