(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initStorage = function initStorage(ctx, state) {
    const { computed, watch } = ctx;

    const sanitizeArray = (value) => (Array.isArray(value) ? value : []);
    const weaponNameSet = new Set(weapons.map((weapon) => weapon.name));
    const s1Set = new Set(weapons.map((weapon) => weapon.s1).filter(Boolean));
    const s2Set = new Set(weapons.map((weapon) => weapon.s2).filter(Boolean));
    const s3Set = new Set(weapons.map((weapon) => weapon.s3).filter(Boolean));
    const mobilePanels = new Set(["weapons", "plans"]);
    const priorityModes = new Set(["strict", "sameCoverage", "sameEfficiency", "weighted"]);
    const themeModes = new Set(["auto", "light", "dark"]);
    const regionSet = new Set(
      dungeons
        .map((dungeon) => getDungeonRegion(dungeon && dungeon.name))
        .filter((name) => typeof name === "string" && name)
    );

    const sanitizeRecommendationConfig = (raw, legacyHideExcluded) => {
      const defaults = state.recommendationConfig.value || {};
      const source = raw && typeof raw === "object" ? raw : {};
      const normalized = {
        hideExcluded:
          typeof source.hideExcluded === "boolean"
            ? source.hideExcluded
            : typeof legacyHideExcluded === "boolean"
            ? legacyHideExcluded
            : Boolean(defaults.hideExcluded),
        preferredRegion1: "",
        preferredRegion2: "",
        priorityMode: priorityModes.has(source.priorityMode)
          ? source.priorityMode
          : defaults.priorityMode || "sameCoverage",
        priorityStrength: Number.isFinite(source.priorityStrength)
          ? Math.max(0, Math.min(100, Math.round(source.priorityStrength)))
          : Number.isFinite(defaults.priorityStrength)
          ? Math.max(0, Math.min(100, Math.round(defaults.priorityStrength)))
          : 50,
        prioritySecondaryWeight: Number.isFinite(source.prioritySecondaryWeight)
          ? Math.max(0, Math.min(100, Math.round(source.prioritySecondaryWeight)))
          : Number.isFinite(defaults.prioritySecondaryWeight)
          ? Math.max(0, Math.min(100, Math.round(defaults.prioritySecondaryWeight)))
          : 60,
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
      return normalized;
    };

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
      if (typeof raw.showFilterPanel === "boolean") {
        next.showFilterPanel = raw.showFilterPanel;
      }
      if (typeof raw.showAllSchemes === "boolean") {
        next.showAllSchemes = raw.showAllSchemes;
      }
      next.recommendationConfig = sanitizeRecommendationConfig(
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

    let restoredShowFilterPanel = false;
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
          if (typeof restored.showFilterPanel === "boolean") {
            state.showFilterPanel.value = restored.showFilterPanel;
            restoredShowFilterPanel = true;
          }
          if (typeof restored.showAllSchemes === "boolean") {
            state.showAllSchemes.value = restored.showAllSchemes;
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
      // ignore storage errors
    }

    try {
      const storedTheme = localStorage.getItem(state.themeModeStorageKey);
      if (themeModes.has(storedTheme)) {
        state.themePreference.value = storedTheme;
      }
    } catch (error) {
      // ignore storage errors
    }

    try {
      const storedPlanConfigHintVersion = localStorage.getItem(state.planConfigHintStorageKey);
      state.showPlanConfigHintDot.value =
        storedPlanConfigHintVersion !== state.planConfigHintVersion;
    } catch (error) {
      state.showPlanConfigHintDot.value = true;
    }

    if (!restoredShowFilterPanel && shouldCollapseFilterPanelByDefault()) {
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
      // ignore storage errors
    }

    const sanitizeMarks = (raw) => {
      if (!raw || typeof raw !== "object") return {};
      const normalized = {};
      Object.keys(raw).forEach((name) => {
        const mark = raw[name];
        if (!name) return;
        if (mark && typeof mark === "object") {
          const excluded = Boolean(mark.excluded);
          const note = typeof mark.note === "string" ? mark.note : "";
          if (excluded || note) {
            normalized[name] = { excluded, note };
          }
        } else if (typeof mark === "string") {
          if (mark) {
            normalized[name] = { excluded: false, note: mark };
          }
        }
      });
      return normalized;
    };

    try {
      const stored = localStorage.getItem(state.marksStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        state.weaponMarks.value = sanitizeMarks(parsed);
      }
    } catch (error) {
      // ignore storage errors
    }

    if (!Object.keys(state.weaponMarks.value).length) {
      try {
        const legacy = localStorage.getItem(state.legacyExcludedKey);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (parsed && typeof parsed === "object") {
            const migrated = {};
            Object.keys(parsed).forEach((name) => {
              const note = typeof parsed[name] === "string" ? parsed[name] : "";
              migrated[name] = { excluded: true, note };
            });
            state.weaponMarks.value = sanitizeMarks(migrated);
            localStorage.removeItem(state.legacyExcludedKey);
            localStorage.setItem(state.marksStorageKey, JSON.stringify(state.weaponMarks.value));
          }
        }
      } catch (error) {
        // ignore storage errors
      }
    }

    watch(
      state.weaponMarks,
      (value) => {
        try {
          const keys = Object.keys(value || {});
          if (!keys.length) {
            localStorage.removeItem(state.marksStorageKey);
            return;
          }
          localStorage.setItem(state.marksStorageKey, JSON.stringify(value));
        } catch (error) {
          // ignore storage errors
        }
      },
      { deep: true }
    );

    const uiState = computed(() => ({
      searchQuery: state.searchQuery.value,
      selectedNames: state.selectedNames.value,
      schemeBaseSelections: state.schemeBaseSelections.value,
      showWeaponAttrs: state.showWeaponAttrs.value,
      showFilterPanel: state.showFilterPanel.value,
      showAllSchemes: state.showAllSchemes.value,
      recommendationConfig: state.recommendationConfig.value,
      filterS1: state.filterS1.value,
      filterS2: state.filterS2.value,
      filterS3: state.filterS3.value,
      mobilePanel: state.mobilePanel.value,
    }));

    watch(
      uiState,
      (value) => {
        try {
          localStorage.setItem(state.uiStateStorageKey, JSON.stringify(value));
        } catch (error) {
          // ignore storage errors
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
        // ignore storage errors
      }
    });
  };
})();
