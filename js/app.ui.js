(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initUi = function initUi(ctx, state) {
    const { ref, onMounted, onBeforeUnmount, nextTick, watch } = ctx;

    const showBackToTop = state.showBackToTop;
    const showLangMenu = state.showLangMenu;
    const showSecondaryMenu = state.showSecondaryMenu;
    const showPlanConfig = state.showPlanConfig;
    const showPlanConfigHintDot = state.showPlanConfigHintDot;
    const showGearRefiningNavHintDot = state.showGearRefiningNavHintDot;
    const isPortrait = state.isPortrait;
    const isAdPortrait = state.isAdPortrait;
    const canShowAds = state.canShowAds;
    const updateLangMenuPlacement = state.updateLangMenuPlacement;
    const loadScriptOnce = state.loadScriptOnce;
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

    const allowedAdHosts = new Set([
    //  "end.canmoe.com",
    //  "127.0.0.1",
    //  "localhost",
    ]);
    const providerScriptSrc = "https://cdn.adwork.net/js/makemoney.js";
    const mobileLayoutBreakpoint = 1024;
    const adMobileBreakpoint = mobileLayoutBreakpoint;
    const adPreviewParamKey = "adPreview";
    const adPreviewMode = state.adPreviewMode || ref(false);
    const adDismissedSession = state.adDismissedSession || ref(false);
    let adScriptLoadingPromise = null;
    let adScriptRetryTimer = null;
    let adScriptRetryCount = 0;
    const adScriptRetryDelaysMs = [1800, 5000];

    state.adPreviewMode = adPreviewMode;
    state.adDismissedSession = adDismissedSession;

    const isLocalPreviewHost = (host) => host === "127.0.0.1" || host === "localhost" || host === "::1";
    const resolveCurrentHost = () =>
      (window.location && window.location.hostname ? window.location.hostname : "").toLowerCase();
    const isAllowedAdHost = (host) => {
      if (!host) return false;
      return allowedAdHosts.has(host);
    };
    const isAdPreviewEnabledByQuery = () => {
      if (typeof window === "undefined") return false;
      try {
        const params = new URLSearchParams(window.location.search || "");
        const value = (params.get(adPreviewParamKey) || "").trim().toLowerCase();
        return value === "1" || value === "true" || value === "yes" || value === "on";
      } catch (error) {
        return false;
      }
    };
    const syncAdPreviewFlags = () => {
      if (typeof window === "undefined") return;
      const host = resolveCurrentHost();
      const local = isLocalPreviewHost(host);
      adPreviewMode.value = local && isAdPreviewEnabledByQuery();
    };

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
    const optionalFailureQueueKey = "__bootOptionalLoadFailures";
    const optionalFailureEventName = "planner:optional-resource-failed";
    let optionalFailurePollTimer = null;
    let lastRuntimeWarningSignature = "";
    let lastRuntimeWarningAt = 0;
    const seenOptionalFailureSignatures = new Set();
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
      const title = meta && meta.title ? String(meta.title) : "页面初始化异常";
      const summary =
        meta && meta.summary
          ? String(meta.summary)
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
    const showUiInitWarning = (error, meta) => {
      const runtimeWarningCurrent = state.runtimeWarningCurrent;
      const runtimeWarningLogs = state.runtimeWarningLogs;
      const runtimeWarningPreviewText = state.runtimeWarningPreviewText;
      const showRuntimeWarningModal = state.showRuntimeWarningModal;
      const runtimeWarningIgnored = state.runtimeWarningIgnored;
      if (
        !runtimeWarningCurrent ||
        !runtimeWarningLogs ||
        !runtimeWarningPreviewText ||
        !showRuntimeWarningModal
      ) {
        return;
      }
      const forceShow = Boolean(meta && meta.forceShow);
      if (!forceShow && runtimeWarningIgnored && runtimeWarningIgnored.value) {
        return;
      }
      const entry = buildRuntimeWarningEntry(error, meta);
      const signature = `${entry.operation}|${entry.key}|${entry.errorName}|${entry.errorMessage}`;
      const now = Date.now();
      if (
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
      showRuntimeWarningModal.value = true;
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
        const resourceLabel = String(item.label || item.src || "").trim();
        const signature = `${featureKey}|${resourceLabel}`;
        if (!resourceLabel || seenOptionalFailureSignatures.has(signature)) return;
        seenOptionalFailureSignatures.add(signature);
        normalized.push({
          featureKey,
          featureLabel: String(item.featureLabel || "").trim(),
          resourceLabel,
        });
      });
      if (!normalized.length) return;
      const featureLabels = Array.from(
        new Set(
          normalized
            .filter((item) => item.featureKey || item.featureLabel)
            .map((item) => {
              const featureKey = item.featureKey;
              if (typeof state.t !== "function") return featureKey || item.featureLabel;
              if (!featureKey) return item.featureLabel;
              const i18nKey = `optional_feature_${featureKey}`;
              const translated = state.t(i18nKey);
              if (translated && translated !== i18nKey) return translated;
              return item.featureLabel || featureKey;
            })
        )
      );
      const resourceLabels = Array.from(new Set(normalized.map((item) => item.resourceLabel)));
      const detailLines = [];
      if (featureLabels.length && typeof state.t === "function") {
        detailLines.push(
          state.t("失败功能：{features}", {
            features: featureLabels.join(", "),
          })
        );
      }
      if (resourceLabels.length && typeof state.t === "function") {
        detailLines.push(
          state.t("失败资源：{resources}", {
            resources: resourceLabels.join(", "),
          })
        );
      }
      if (typeof state.t === "function") {
        detailLines.push(state.t("影响说明：仅影响可选功能，不影响核心功能。"));
      }
      const firstFeature = featureLabels[0] || "";
      const firstResource = resourceLabels[0] || "optional-resource";
      const messageParts = [];
      if (firstFeature) {
        messageParts.push(firstFeature);
      }
      if (firstResource) {
        messageParts.push(firstResource);
      }
      const error = new Error(messageParts.join(" / ") || "optional resource failed");
      error.name = "OptionalResourceLoadError";
      showUiInitWarning(error, {
        scope: "boot.optional-resource",
        operation: "optional.load",
        key: resourceLabels.join(", ") || "optional-resource",
        title:
          typeof state.t === "function"
            ? state.t("可选功能加载失败")
            : "可选功能加载失败",
        summary:
          typeof state.t === "function"
            ? state.t("部分可选功能未能加载，页面主体仍可继续使用。")
            : "部分可选功能未能加载，页面主体仍可继续使用。",
        note: detailLines.join("\n"),
        forceShow: true,
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

    const evaluateAdVisibility = () => {
      if (typeof window === "undefined") {
        canShowAds.value = false;
        return;
      }
      if (adDismissedSession.value) {
        canShowAds.value = false;
        return;
      }
      if (adPreviewMode.value) {
        canShowAds.value = true;
        return;
      }
      const host = resolveCurrentHost();
      canShowAds.value = isAllowedAdHost(host);
    };

    const handleAdFailed = () => {
      canShowAds.value = false;
    };

    const hasRenderedAdSlotContainer = () => {
      if (typeof document === "undefined") return false;
      return Boolean(document.querySelector(".slot-provider-net, .adwork-net"));
    };

    const clearAdScriptRetry = () => {
      if (!adScriptRetryTimer) return;
      clearTimeout(adScriptRetryTimer);
      adScriptRetryTimer = null;
    };

    const scheduleAdScriptRetry = () => {
      if (adPreviewMode.value) return;
      if (adScriptRetryTimer) return;
      if (adScriptRetryCount >= adScriptRetryDelaysMs.length) return;
      const host = resolveCurrentHost();
      if (!isAllowedAdHost(host)) return;
      const delay = adScriptRetryDelaysMs[adScriptRetryCount];
      adScriptRetryCount += 1;
      adScriptRetryTimer = setTimeout(() => {
        adScriptRetryTimer = null;
        window.__slotProviderScriptError = false;
        evaluateAdVisibility();
        if (canShowAds.value) {
          ensureAdScriptLoaded();
        }
      }, delay);
    };

    const ensureAdScriptLoaded = () => {
      if (typeof window === "undefined" || typeof document === "undefined") {
        return Promise.resolve(false);
      }
      if (adPreviewMode.value) {
        return Promise.resolve(false);
      }
      if (!canShowAds.value) {
        return Promise.resolve(false);
      }
      if (!hasRenderedAdSlotContainer()) {
        return Promise.resolve(false);
      }
      if (window.__slotProviderScriptReady) {
        return Promise.resolve(true);
      }
      if (adScriptLoadingPromise) {
        return adScriptLoadingPromise;
      }
      const loadTask =
        typeof loadScriptOnce === "function"
          ? loadScriptOnce(providerScriptSrc)
          : new Promise((resolve, reject) => {
              const script = document.createElement("script");
              script.src = providerScriptSrc;
              script.async = true;
              script.onload = resolve;
              script.onerror = reject;
              document.body.appendChild(script);
            });
      adScriptLoadingPromise = loadTask
        .then(() => {
          window.__slotProviderScriptReady = true;
          window.__slotProviderScriptError = false;
          adScriptRetryCount = 0;
          clearAdScriptRetry();
          return true;
        })
        .catch(() => {
          window.__slotProviderScriptError = true;
          scheduleAdScriptRetry();
          window.dispatchEvent(new Event("slotfeed:failed"));
          return false;
        })
        .finally(() => {
          adScriptLoadingPromise = null;
        });
      return adScriptLoadingPromise;
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
      isAdPortrait.value = window.innerWidth <= adMobileBreakpoint;
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

    const togglePlanConfig = () => {
      const nextOpen = !showPlanConfig.value;
      showPlanConfig.value = nextOpen;
      if (nextOpen) {
        markPlanConfigHintSeen();
      }
    };

    const dismissAdsForSession = () => {
      adDismissedSession.value = true;
      canShowAds.value = false;
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
        syncAdPreviewFlags();
        updateViewportOrientation();
        window.addEventListener("resize", updateViewportOrientation);
        updateViewportSafeBottom();
        window.addEventListener("resize", scheduleViewportSafeBottom);
        if (window.visualViewport) {
          window.visualViewport.addEventListener("resize", scheduleViewportSafeBottom);
          window.visualViewport.addEventListener("scroll", scheduleViewportSafeBottom);
        }
        if (typeof window !== "undefined") {
          if (!window.__slotProviderScriptReady) {
            window.__slotProviderScriptError = false;
          }
          backToTopLastScroll = window.scrollY || window.pageYOffset || 0;
          updateBackToTopVisibility();
          window.addEventListener("scroll", handleBackToTopScroll, { passive: true });
          evaluateAdVisibility();
          window.addEventListener("slotfeed:failed", handleAdFailed);
          if (canShowAds.value) {
            runAfterLayout(ensureAdScriptLoaded);
          }
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

    watch([canShowAds, isAdPortrait], () => {
      if (canShowAds.value) {
        runAfterLayout(ensureAdScriptLoaded);
      }
    });

    watch(
      () => (state.currentView ? state.currentView.value : ""),
      (view) => {
        if (view !== "planner") return;
        const refreshAdSlotAfterViewSwitch = () => {
          if (canShowAds.value) {
            ensureAdScriptLoaded();
          }
        };
        runAfterLayout(refreshAdSlotAfterViewSwitch);
      }
    );

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
        window.removeEventListener("slotfeed:failed", handleAdFailed);
        window.removeEventListener(optionalFailureEventName, handleOptionalFailureEvent);
      }
      clearAdScriptRetry();
      clearBackToTopTimer();
      if (optionalFailurePollTimer) {
        clearInterval(optionalFailurePollTimer);
        optionalFailurePollTimer = null;
      }
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

    state.scrollToTop = scrollToTop;
    state.setThemeMode = setThemeMode;
    state.togglePlanConfig = togglePlanConfig;
    state.markGearRefiningNavHintSeen = markGearRefiningNavHintSeen;
    state.dismissAdsForSession = dismissAdsForSession;
    state.dismissRuntimeWarning = dismissRuntimeWarning;
    state.ignoreRuntimeWarnings = ignoreRuntimeWarnings;
    state.requestIgnoreRuntimeWarnings = requestIgnoreRuntimeWarnings;
    state.cancelIgnoreRuntimeWarnings = cancelIgnoreRuntimeWarnings;
    state.confirmIgnoreRuntimeWarnings = confirmIgnoreRuntimeWarnings;
    state.reloadBypassCache = reloadBypassCache;
    state.exportRuntimeDiagnosticBundle = exportRuntimeDiagnosticBundle;
  };
})();
