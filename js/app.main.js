(function () {
  const { createApp, ref, computed, onMounted, onBeforeUnmount, watch, nextTick } = Vue || {};

  const showBootError = (payload) => {
    if (typeof window !== "undefined" && typeof window.__renderBootError === "function") {
      window.__renderBootError(payload);
      return;
    }
    document.body.innerHTML =
      "<div style='padding:24px;color:#f36c6c;font-family:Microsoft YaHei UI;'>页面启动失败，请刷新后重试。</div>";
  };

  if (!createApp) {
    finishPreload();
    showBootError({
      title: "运行依赖缺失",
      summary: "未检测到 Vue 3 运行时，页面无法初始化。",
      details: [
        "缺失文件：./vendor/vue.global.prod.js",
        "请确认构建产物或静态资源已完整部署",
      ],
      suggestions: ["检查 vendor 目录是否完整", "清理缓存后刷新页面并重试"],
    });
    return;
  }

  if (!dungeons.length || !weapons.length) {
    finishPreload();
    showBootError({
      title: "数据文件缺失",
      summary: "核心数据未加载完成，当前无法生成武器规划。",
      details: [
        `地牢数据：${dungeons.length ? "已加载" : "缺失"}`,
        `武器数据：${weapons.length ? "已加载" : "缺失"}`,
        "请确认 ./data/dungeons.js 与 ./data/weapons.js 可访问",
      ],
      suggestions: ["检查 data 目录与发布路径", "强制刷新页面后重试"],
    });
    return;
  }

  const modules = window.AppModules || {};

  createApp({
    setup() {
      const ctx = { ref, computed, onMounted, onBeforeUnmount, watch, nextTick };
      const state = {};
      const init = (name) => {
        const fn = modules[name];
        if (typeof fn === "function") {
          fn(ctx, state);
        }
      };

      init("initState");
      init("initI18n");
      init("initContent");
      init("initSearch");
      init("initUi");
      init("initStorage");
      init("initAnalytics");
      init("initEmbed");
      init("initPerf");
      init("initBackground");
      init("initWeapons");
      init("initRecommendations");
      init("initTutorial");
      init("initRecommendationDisplay");
      init("initModals");
      init("initMedia");
      init("initStrategy");
      init("initReforging");

      const weaponCatalog =
        typeof window !== "undefined" && Array.isArray(window.WEAPONS) ? window.WEAPONS : [];
      const weaponNameSet = new Set(weaponCatalog.map((weapon) => weapon.name));
      const parseWeaponNames = (params) => {
        if (!params) return [];
        const entries = [];
        const packed = params.get("weapons");
        if (packed) {
          entries.push(...packed.split(","));
        }
        const repeated = params.getAll("weapon");
        if (repeated.length) {
          entries.push(...repeated);
        }
        if (!entries.length) return [];
        const unique = Array.from(
          new Set(entries.map((name) => (name || "").trim()).filter(Boolean))
        );
        return unique.filter((name) => weaponNameSet.has(name));
      };

      const parseRoute = () => {
        if (typeof window === "undefined") {
          return { view: state.currentView.value };
        }
        const params = new URLSearchParams(window.location.search || "");
        const view = params.get("view") || "planner";
        const characterId = params.get("operator");
        const hasWeaponParam = params.has("weapons") || params.has("weapon");
        const weaponNames = hasWeaponParam ? parseWeaponNames(params) : [];
        if (view === "strategy") {
          return { view: "strategy", characterId, weaponNames, hasWeaponParam };
        }
        if (view === "reforging") {
          return { view: "reforging", weaponNames, hasWeaponParam };
        }
        return { view: "planner", weaponNames, hasWeaponParam };
      };

      const hasCharacter = (id) =>
        id &&
        Array.isArray(state.characters) &&
        state.characters.some((char) => char && char.id === id);

      let applyingRoute = false;

      const applyRoute = (route) => {
        if (!route) return;
        applyingRoute = true;
        state.currentView.value = route.view || "planner";
        if (route.view === "strategy") {
          const resolvedId = hasCharacter(route.characterId) ? route.characterId : null;
          if (resolvedId && typeof state.selectCharacter === "function") {
            state.selectCharacter(resolvedId);
          } else {
            state.selectedCharacterId.value = resolvedId;
          }
        }
        if (route.view === "planner" && route.hasWeaponParam) {
          state.selectedNames.value = Array.isArray(route.weaponNames) ? route.weaponNames : [];
        }
        applyingRoute = false;
      };

      const buildQuery = () => {
        const view = state.currentView.value;
        const params = new URLSearchParams();
        if (view && view !== "planner") {
          params.set("view", view);
        }
        if (view === "strategy") {
          const id = state.selectedCharacterId.value;
          if (id) params.set("operator", id);
        }
        if (view === "planner") {
          const selected = Array.isArray(state.selectedNames.value)
            ? state.selectedNames.value.filter((name) => weaponNameSet.has(name))
            : [];
          if (selected.length) {
            params.set("weapons", selected.join(","));
          }
        }
        const query = params.toString();
        return query ? `?${query}` : "";
      };

      const buildAnalyticsPath = () => {
        const view = state.currentView.value;
        if (view === "strategy") {
          const id = state.selectedCharacterId.value;
          if (id) return `/strategy/${encodeURIComponent(id)}`;
          return "/strategy";
        }
        if (view === "reforging") {
          return "/reforging";
        }
        return "/planner";
      };

      const buildAnalyticsUrl = () => {
        if (typeof window === "undefined") return "";
        const pathname = window.location.pathname || "";
        const base = pathname.endsWith("/")
          ? pathname.slice(0, -1)
          : pathname.endsWith(".html")
          ? pathname.replace(/\/[^/]*$/, "")
          : pathname;
        const path = buildAnalyticsPath();
        if (!base) return path;
        return `${base}${path}`;
      };

      const trackPageview = () => {
        if (typeof state.trackPageview !== "function") return;
        if (typeof window === "undefined") return;
        state.trackPageview({
          url: buildAnalyticsUrl(),
          path: buildAnalyticsPath(),
          view: state.currentView.value,
          title: document.title,
        });
      };

      const syncQuery = (replace = false) => {
        if (typeof window === "undefined") return;
        if (applyingRoute) return;
        const nextQuery = buildQuery();
        const nextUrl = `${window.location.pathname}${nextQuery}`;
        const currentUrl = `${window.location.pathname}${window.location.search || ""}`;
        if (nextUrl === currentUrl) return;
        if (replace) {
          window.history.replaceState(null, "", nextUrl);
        } else {
          window.history.pushState(null, "", nextUrl);
        }
        return nextUrl;
      };

      onMounted(() => {
        const route = parseRoute();
        applyRoute(route);
        syncQuery(true);
        trackPageview();
        if (typeof window !== "undefined") {
          window.addEventListener("popstate", () => {
            applyRoute(parseRoute());
            trackPageview();
          });
        }
      });

      watch([state.currentView, state.selectedCharacterId], () => {
        syncQuery(false);
        trackPageview();
      });

      watch(
        state.selectedNames,
        () => {
          if (state.currentView.value !== "planner") return;
          syncQuery(true);
        },
        { deep: true }
      );

      return {
        currentView: state.currentView,
        setView: (view) => {
          state.currentView.value = view;
          window.scrollTo(0, 0);
        },
        locale: state.locale,
        languageOptions: state.languageOptions,
        langSwitchRef: state.langSwitchRef,
        showLangMenu: state.showLangMenu,
        langMenuPlacement: state.langMenuPlacement,
        toggleLangMenu: state.toggleLangMenu,
        setLocale: state.setLocale,
        t: state.t,
        tTerm: state.tTerm,
        tPlanPriorityMode: state.tPlanPriorityMode,
        tPlanPriorityModeOptions: state.tPlanPriorityModeOptions,
        showAiNotice: state.showAiNotice,
        searchQuery: state.searchQuery,
        selectedNames: state.selectedNames,
        selectedWeaponRows: state.selectedWeaponRows,
        selectedWeapons: state.selectedWeapons,
        selectedNameSet: state.selectedNameSet,
        isExcluded: state.isExcluded,
        toggleExclude: state.toggleExclude,
        getWeaponNote: state.getWeaponNote,
        updateWeaponNote: state.updateWeaponNote,
        toggleShowWeaponAttrs: state.toggleShowWeaponAttrs,
        showWeaponAttrs: state.showWeaponAttrs,
        showAttrHint: state.showAttrHint,
        dismissAttrHint: state.dismissAttrHint,
        showFilterPanel: state.showFilterPanel,
        showAllSchemes: state.showAllSchemes,
        showPlanConfig: state.showPlanConfig,
        showPlanConfigHintDot: state.showPlanConfigHintDot,
        togglePlanConfig: state.togglePlanConfig,
        recommendationConfig: state.recommendationConfig,
        regionOptions: state.regionOptions,
        regionPriorityModeOptions: state.regionPriorityModeOptions,
        showBackToTop: state.showBackToTop,
        scrollToTop: state.scrollToTop,
        tutorialActive: state.tutorialActive,
        tutorialStep: state.tutorialStep,
        tutorialVisibleLines: state.tutorialVisibleLines,
        tutorialStepIndex: state.tutorialStepIndex,
        tutorialTotalSteps: state.tutorialTotalSteps,
        tutorialStepKey: state.tutorialStepKey,
        tutorialStepReady: state.tutorialStepReady,
        tutorialWeapon: state.tutorialWeapon,
        tutorialExcluded: state.tutorialExcluded,
        tutorialNote: state.tutorialNote,
        tutorialBodyCanCollapse: state.tutorialBodyCanCollapse,
        tutorialBodyCollapsed: state.tutorialBodyCollapsed,
        tutorialCollapseHighlight: state.tutorialCollapseHighlight,
        tutorialSkipAll: state.tutorialSkipAll,
        showTutorialSkipConfirm: state.showTutorialSkipConfirm,
        showTutorialComplete: state.showTutorialComplete,
        tutorialTargetSchemeKey: state.tutorialTargetSchemeKey,
        isTutorialGuideWeapon: state.isTutorialGuideWeapon,
        isPortrait: state.isPortrait,
        startTutorial: state.startTutorial,
        nextTutorialStep: state.nextTutorialStep,
        prevTutorialStep: state.prevTutorialStep,
        skipTutorialStep: state.skipTutorialStep,
        skipTutorialAll: state.skipTutorialAll,
        openTutorialSkipConfirm: state.openTutorialSkipConfirm,
        closeTutorialSkipConfirm: state.closeTutorialSkipConfirm,
        confirmTutorialSkipAll: state.confirmTutorialSkipAll,
        closeTutorialComplete: state.closeTutorialComplete,
        finishTutorial: state.finishTutorial,
        toggleTutorialBody: state.toggleTutorialBody,
        toggleTutorialExclude: state.toggleTutorialExclude,
        updateTutorialNote: state.updateTutorialNote,
        markTutorialNoteTouched: state.markTutorialNoteTouched,
        tutorialWeaponTarget: state.tutorialWeaponTarget,
        tutorialSchemeTarget: state.tutorialSchemeTarget,
        tutorialPlansTab: state.tutorialPlansTab,
        filterS1: state.filterS1,
        filterS2: state.filterS2,
        filterS3: state.filterS3,
        s1Options: state.s1Options,
        s2Options: state.s2Options,
        s3OptionEntries: state.s3OptionEntries,
        toggleFilterValue: state.toggleFilterValue,
        clearAttributeFilters: state.clearAttributeFilters,
        hasAttributeFilters: state.hasAttributeFilters,
        filteredWeapons: state.filteredWeapons,
        allFilteredSelected: state.allFilteredSelected,
        recommendations: state.recommendations,
        coverageSummary: state.coverageSummary,
        primaryRecommendations: state.primaryRecommendations,
        extraRecommendations: state.extraRecommendations,
        visibleRecommendations: state.visibleRecommendations,
        displayRecommendations: state.displayRecommendations,
        displayDividerIndex: state.displayDividerIndex,
        fallbackPlan: state.fallbackPlan,
        toggleWeapon: state.toggleWeapon,
        toggleSchemeBasePick: state.toggleSchemeBasePick,
        isConflictOpen: state.isConflictOpen,
        toggleConflictOpen: state.toggleConflictOpen,
        selectAllWeapons: state.selectAllWeapons,
        clearSelection: state.clearSelection,
        formatS1: state.formatS1,
        rarityBadgeStyle: state.rarityBadgeStyle,
        rarityTextStyle: state.rarityTextStyle,
        hasImage: state.hasImage,
        weaponImageSrc: state.weaponImageSrc,
        weaponCharacters: state.weaponCharacters,
        characterImageSrc: state.characterImageSrc,
        characterCardSrc: state.characterCardSrc,
        handleCharacterImageError: state.handleCharacterImageError,
        handleCharacterCardError: state.handleCharacterCardError,
        announcement: state.announcement,
        formatNoticeItem: state.formatNoticeItem,
        changelog: state.changelog,
        aboutContent: state.aboutContent,
        showAbout: state.showAbout,
        showNotice: state.showNotice,
        showChangelog: state.showChangelog,
        skipNotice: state.skipNotice,
        openNotice: state.openNotice,
        closeNotice: state.closeNotice,
        appReady: state.appReady,
        mobilePanel: state.mobilePanel,
        showDomainWarning: state.showDomainWarning,
        currentHost: state.currentHost,
        embedHostLabel: state.embedHostLabel,
        isEmbedTrusted: state.isEmbedTrusted,
        isEmbedded: state.isEmbedded,
        warningCountdown: state.warningCountdown,
        dismissDomainWarning: state.dismissDomainWarning,
        lowGpuEnabled: state.lowGpuEnabled,
        perfPreference: state.perfPreference,
        themePreference: state.themePreference,
        resolvedTheme: state.resolvedTheme,
        showSecondaryMenu: state.showSecondaryMenu,
        showPerfNotice: state.showPerfNotice,
        setPerfMode: state.setPerfMode,
        setThemeMode: state.setThemeMode,
        customBackground: state.customBackground,
        customBackgroundName: state.customBackgroundName,
        customBackgroundError: state.customBackgroundError,
        customBackgroundApi: state.customBackgroundApi,
        handleBackgroundFile: state.handleBackgroundFile,
        clearCustomBackground: state.clearCustomBackground,
        // Strategy Module
        characters: state.characters,
        selectedCharacterId: state.selectedCharacterId,
        currentCharacter: state.currentCharacter,
        currentGuide: state.currentGuide,
        skillLevelLabels: state.skillLevelLabels,
        getSkillTables: state.getSkillTables,
        guideRows: state.guideRows,
        teamSlots: state.teamSlots,
        strategyCategory: state.strategyCategory,
        strategyTab: state.strategyTab,
        selectCharacter: state.selectCharacter,
        setStrategyCategory: state.setStrategyCategory,
        setStrategyTab: state.setStrategyTab,
        backToCharacterList: state.backToCharacterList,
        guideBeforeLeave: state.guideBeforeLeave,
        guideEnter: state.guideEnter,
      };
    },
  }).mount("#app");
})();
