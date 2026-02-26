(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initUi = function initUi(ctx, state) {
    const { ref, onMounted, onBeforeUnmount, nextTick, watch } = ctx;

    const showBackToTop = state.showBackToTop;
    const showLangMenu = state.showLangMenu;
    const showSecondaryMenu = state.showSecondaryMenu;
    const showPlanConfig = state.showPlanConfig;
    const showPlanConfigHintDot = state.showPlanConfigHintDot;
    const isPortrait = state.isPortrait;
    const isAdPortrait = state.isAdPortrait;
    const canShowAds = state.canShowAds;
    const updateLangMenuPlacement = state.updateLangMenuPlacement;
    const loadScriptOnce = state.loadScriptOnce;

    const root = typeof document !== "undefined" ? document.documentElement : null;
    const defaultBackgroundUrl = "https://img.canmoe.com/image?img=ua";
    const defaultBackgroundCssValue = `url("${defaultBackgroundUrl}")`;
    const preloadBackgroundTimeoutMs = 850;
    const preloadBackgroundFadeMs = 720;
    let preloadBackgroundFadeTimer = null;

    const allowedAdHosts = new Set([
      "end.canmoe.com",
      "127.0.0.1",
      "localhost",
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
      scheduleAdSlotVisibility();
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
          scheduleAdSlotVisibility();
          primeAdSlotVisibility();
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

    const adSlotSelector = ".slot-hero-shell, .slot-inline-top";
    const adSlotContainerSelector = ".slot-provider-net, .adwork-net";
    let adSlotVisibilityRaf = null;
    let adSlotVisibilityTimers = [];

    const clearAdSlotTimers = () => {
      if (!adSlotVisibilityTimers.length) return;
      adSlotVisibilityTimers.forEach((timer) => clearTimeout(timer));
      adSlotVisibilityTimers = [];
    };

    const hasRenderableAdContent = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (Number(style.opacity || 1) === 0) return false;
      const rect = node.getBoundingClientRect();
      return rect.width >= 120 && rect.height >= 20;
    };

    const isLikelyPlaceholderNode = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const text = (node.textContent || "").trim();
      if (text && text.length > 0) {
        const normalized = text.toLowerCase();
        if (
          normalized.includes("广告") ||
          normalized.includes("ad") ||
          normalized.includes("placeholder") ||
          normalized.includes("审核")
        ) {
          return true;
        }
      }
      const className = (node.className || "").toString().toLowerCase();
      if (
          className.includes("placeholder")
      ) {
        return true;
      }
      const bg = window.getComputedStyle(node).backgroundColor;
      return bg === "rgb(255, 255, 255)" || bg === "rgba(255, 255, 255, 1)";
    };

    const hasMeaningfulAdChildren = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const children = Array.from(node.children || []);
      if (!children.length) return false;
      return children.some((child) => {
        if (!(child instanceof HTMLElement)) return false;
        if (child.matches("script, style, link, meta")) return false;
        if (isLikelyPlaceholderNode(child)) return false;
        if (child.matches("iframe, img, ins, object, embed, video, canvas, svg, a, button")) {
          return true;
        }
        const text = (child.textContent || "").trim();
        if (text.length > 0) return true;
        return hasRenderableAdContent(child);
      });
    };

    const updateAdSlotVisibility = () => {
      if (typeof window === "undefined" || typeof document === "undefined") return;
      const slots = document.querySelectorAll(adSlotSelector);
      slots.forEach((slot) => {
        if (adPreviewMode.value && !adDismissedSession.value) {
          slot.classList.remove("is-slot-hidden");
          slot.classList.remove("is-slot-compact");
          return;
        }
        const container = slot.querySelector(adSlotContainerSelector);
        const hasContainer = container instanceof HTMLElement;
        const richNodes =
          hasContainer
            ? Array.from(
                container.querySelectorAll("iframe, img, ins, object, embed, video, canvas, svg")
              )
            : [];
        const hasRichRenderable = richNodes.some((node) => {
          if (!(node instanceof HTMLElement)) return false;
          if (node.tagName === "IFRAME") {
            const src = String(node.getAttribute("src") || "").trim().toLowerCase();
            if (!src || src === "about:blank") return false;
          }
          return hasRenderableAdContent(node);
        });
        const hasMeaningfulChildren =
          hasContainer && hasMeaningfulAdChildren(container);
        const hasContainerRenderable =
          hasContainer && hasRenderableAdContent(container);
        const placeholderChildren =
          hasContainer &&
          Array.from(container.children || []).some(
            (child) => child instanceof HTMLElement && isLikelyPlaceholderNode(child)
          );
        const placeholderLike =
          hasContainer &&
          !hasRichRenderable &&
          (isLikelyPlaceholderNode(container) || placeholderChildren);
        const hasRenderable = hasRichRenderable || (hasMeaningfulChildren && hasContainerRenderable);
        const shouldHardHide = !canShowAds.value || !hasContainer;
        const shouldSoftHide = !shouldHardHide && (!hasRenderable || placeholderLike);
        slot.classList.toggle("is-slot-hidden", shouldHardHide);
        slot.classList.toggle("is-slot-compact", shouldSoftHide);
      });
    };

    const scheduleAdSlotVisibility = () => {
      if (typeof window === "undefined") return;
      if (adSlotVisibilityRaf) {
        cancelAnimationFrame(adSlotVisibilityRaf);
      }
      adSlotVisibilityRaf = requestAnimationFrame(() => {
        adSlotVisibilityRaf = null;
        updateAdSlotVisibility();
      });
    };

    const primeAdSlotVisibility = () => {
      clearAdSlotTimers();
      [80, 360, 900, 1800, 3200].forEach((delay) => {
        adSlotVisibilityTimers.push(
          setTimeout(() => {
            scheduleAdSlotVisibility();
          }, delay)
        );
      });
    };

    const handleAdPotentialMutation = () => {
      scheduleAdSlotVisibility();
      if (typeof window !== "undefined") {
        setTimeout(() => scheduleAdSlotVisibility(), 120);
      }
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
        // ignore storage errors
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
      scheduleAdSlotVisibility();
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
        requestAnimationFrame(() => {
          callback();
        });
      };
      if (typeof nextTick === "function") {
        nextTick(run);
      } else {
        run();
      }
    };

    onMounted(() => {
      state.appReady.value = true;
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
        window.addEventListener("resize", scheduleAdSlotVisibility);
        if (canShowAds.value) {
          runAfterLayout(ensureAdScriptLoaded);
        }
      }
      document.addEventListener("click", handleAdPotentialMutation, true);
      document.addEventListener("click", handleDocClick);
      document.addEventListener("keydown", handleDocKeydown);
      primeAdSlotVisibility();
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
      runAfterLayout(finalizePreload);
    });

    watch([canShowAds, isAdPortrait], () => {
      if (canShowAds.value) {
        runAfterLayout(ensureAdScriptLoaded);
      }
      primeAdSlotVisibility();
    });

    watch(
      () => (state.currentView ? state.currentView.value : ""),
      (view) => {
        if (view !== "planner") return;
        const refreshAdSlotAfterViewSwitch = () => {
          if (canShowAds.value) {
            ensureAdScriptLoaded();
          }
          primeAdSlotVisibility();
          scheduleAdSlotVisibility();
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
        window.removeEventListener("resize", scheduleAdSlotVisibility);
      }
      if (adSlotVisibilityRaf) {
        cancelAnimationFrame(adSlotVisibilityRaf);
        adSlotVisibilityRaf = null;
      }
      clearAdSlotTimers();
      clearAdScriptRetry();
      document.removeEventListener("click", handleAdPotentialMutation, true);
      clearBackToTopTimer();
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
    state.dismissAdsForSession = dismissAdsForSession;
  };
})();
