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

    const normalizeLegacyMarks = (raw) => {
      return normalizeLegacyExcludedMarksMap(raw, weaponNameSet);
    };

    state.normalizeWeaponMarks = normalizeWeaponMarks;
    state.normalizeLegacyMarks = normalizeLegacyMarks;
    state.normalizeRecommendationConfig = normalizeRecommendationConfig;

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
      const storedBackgroundDisplay = localStorage.getItem(state.backgroundDisplayStorageKey);
      if (storedBackgroundDisplay === "0") {
        state.backgroundDisplayEnabled.value = false;
      } else if (storedBackgroundDisplay === "1") {
        state.backgroundDisplayEnabled.value = true;
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
      // ignore storage errors
    }

    try {
      const stored = localStorage.getItem(state.marksStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        state.weaponMarks.value = normalizeWeaponMarks(parsed);
      }
    } catch (error) {
      // ignore storage errors
    }

    const readLegacyMarks = (storageKey) => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return {};
        return normalizeLegacyMarks(JSON.parse(raw));
      } catch (error) {
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
          const normalized = normalizeWeaponMarks(value);
          const keys = Object.keys(normalized || {});
          if (!keys.length) {
            localStorage.removeItem(state.marksStorageKey);
            return;
          }
          localStorage.setItem(state.marksStorageKey, JSON.stringify(normalized));
        } catch (error) {
          // ignore storage errors
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

    watch(state.backgroundDisplayEnabled, (value) => {
      try {
        localStorage.setItem(state.backgroundDisplayStorageKey, value ? "1" : "0");
      } catch (error) {
        // ignore storage errors
      }
    });
  };
})();
