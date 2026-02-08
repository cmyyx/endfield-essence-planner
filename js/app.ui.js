(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initUi = function initUi(ctx, state) {
    const { onMounted, onBeforeUnmount, nextTick } = ctx;

    const showBackToTop = state.showBackToTop;
    const showLangMenu = state.showLangMenu;
    const showSecondaryMenu = state.showSecondaryMenu;
    const showPlanConfig = state.showPlanConfig;
    const showPlanConfigHintDot = state.showPlanConfigHintDot;
    const isPortrait = state.isPortrait;
    const updateLangMenuPlacement = state.updateLangMenuPlacement;

    const root = typeof document !== "undefined" ? document.documentElement : null;

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
      if (window.matchMedia) {
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

    onMounted(() => {
      state.appReady.value = true;
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
      if (typeof nextTick === "function") {
        nextTick(() => requestAnimationFrame(() => finishPreload()));
      } else {
        requestAnimationFrame(() => finishPreload());
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
      }
      clearBackToTopTimer();
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("keydown", handleDocKeydown);
    });

    state.scrollToTop = scrollToTop;
    state.setThemeMode = setThemeMode;
    state.togglePlanConfig = togglePlanConfig;
  };
})();
