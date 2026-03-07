(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initState = function initState(ctx, state) {
    const { ref } = ctx;

    state.searchQuery = ref("");
    state.matchQuery = ref("");
    state.selectedNames = ref([]);
    state.matchSourceName = ref("");
    state.schemeBaseSelections = ref({});
    state.weaponMarks = ref({});
    state.weaponAttrOverrides = ref({});
    state.showAbout = ref(false);
    state.showSecondaryMenu = ref(false);

    state.contentLoading = ref(false);
    state.contentLoaded = ref(Boolean(window.CONTENT));
    state.charactersLoading = ref(false);
    state.charactersLoaded = ref(Array.isArray(window.characters) && window.characters.length > 0);
    state.upScheduleRawSource = window.WEAPON_UP_SCHEDULES && typeof window.WEAPON_UP_SCHEDULES === "object"
      ? window.WEAPON_UP_SCHEDULES
      : {};
    state.upScheduleNormalized = ref({});
    state.upScheduleIssues = ref([]);
    state.weaponUpByWeapon = ref({});
    state.weaponUpIssues = ref([]);
    state.getWeaponUpWindowAt = () => ({});

    state.weaponGridTopSpacer = ref(0);
    state.weaponGridBottomSpacer = ref(0);
    state.recommendationTopSpacer = ref(0);
    state.recommendationBottomSpacer = ref(0);
    state.characterGridTopSpacer = ref(0);
    state.characterGridBottomSpacer = ref(0);

    state.marksStorageKey = "weapon-marks:v2";
    state.legacyMarksStorageKey = "weapon-marks:v1";
    state.legacyExcludedKey = "excluded-notes:v1";
    state.migrationStorageKey = "weapon-marks-migration:v1";
    state.tutorialStorageKey = "planner-tutorial:v1";
    state.uiStateStorageKey = "planner-ui-state:v1";
    state.attrHintStorageKey = "planner-attr-hint:v1";
    state.weaponAttrOverridesStorageKey = "weapon-attr-overrides:v1";
    state.noticeSkipKey = "announcement:skip";
    state.legacyNoticePrefix = "announcement:skip:";
    state.perfModeStorageKey = "planner-perf-mode:v1";
    state.themeModeStorageKey = "planner-theme-mode:v1";
    state.langStorageKey = "planner-lang";
    state.backgroundStorageKey = "planner-bg-image:v1";
    state.backgroundApiStorageKey = "planner-bg-api:v1";
    state.backgroundDisplayStorageKey = "planner-bg-display:v1";
    state.planConfigHintStorageKey = "planner-plan-config-hint:v1";
    // 更新基质规划设置时递增该版本号，可让红点对所有用户重新显示一次。
    state.planConfigHintVersion = "5";
    state.gearRefiningNavHintStorageKey = "planner-gear-refining-nav-hint:v1";
    // 更新装备精锻导航提示时递增该版本号，可让红点对所有用户重新显示一次。
    state.gearRefiningNavHintVersion = "1";
    state.rerunRankingNavHintStorageKey = "planner-rerun-ranking-nav-hint:v1";
    // 更新复刻排行导航提示时递增该版本号，可让红点对所有用户重新显示一次。
    state.rerunRankingNavHintVersion = "1";

    state.lowGpuEnabled = ref(false);
    state.perfPreference = ref("auto");
    state.showPerfNotice = ref(false);
    state.themePreference = ref("auto");
    state.resolvedTheme = ref("dark");

    state.customBackground = ref("");
    state.customBackgroundName = ref("");
    state.customBackgroundError = ref("");
    state.customBackgroundApi = ref("");
    state.backgroundDisplayEnabled = ref(true);

    state.showNotice = ref(false);
    state.showChangelog = ref(false);
    state.skipNotice = ref(false);

    state.appReady = ref(false);
    state.currentView = ref("planner");
    state.mobilePanel = ref("weapons");
    state.matchMobilePanel = ref("source");
    state.gearRefiningMobilePanel = ref("gears");
    state.showWeaponAttrs = ref(false);
    state.showWeaponOwnership = ref(false);
    state.showAttrHint = ref(false);
    state.showFilterPanel = ref(true);
    state.filterPanelManuallySet = ref(false);
    state.showAllSchemes = ref(false);
    state.showPlanConfig = ref(false);
    state.showWeaponAttrDataModal = ref(false);
    state.showPlanConfigHintDot = ref(false);
    state.showGearRefiningNavHintDot = ref(false);
    state.showRerunRankingNavHintDot = ref(false);
    state.recommendationConfig = ref({
      hideEssenceOwnedWeaponsInPlans: false,
      hideEssenceOwnedOwnedOnly: false,
      hideEssenceOwnedWeaponsInSelector: false,
      hideUnownedWeaponsInPlans: false,
      hideUnownedWeaponsInSelector: false,
      hideFourStarWeaponsInPlans: true,
      hideFourStarWeaponsInSelector: true,
      attributeFilterAffectsHiddenWeapons: false,
      preferredRegion1: "",
      preferredRegion2: "",
      regionPriorityMode: "ignore",
      ownershipPriorityMode: "ignore",
      strictPriorityOrder: "ownershipFirst",
    });
    state.regionOptions = ref([]);
    state.regionPriorityModeOptions = [
      {
        value: "ignore",
        label: "不启用",
        description: "不使用地区优先，完全按刷取效率排序。",
      },
      {
        value: "strict",
        label: "严格优先",
        description:
          "只要方案里包含你设置的优先地区（地区1 > 地区2 > 其他），就先排在前面；同组里再看效率。"
      },
      {
        value: "sameCoverage",
        label: "同覆盖优先",
        description:
          "先看每个方案能覆盖多少把待刷武器；数量一样时，再按优先地区（地区1 > 地区2 > 其他）排序。"
      },
      {
        value: "sameEfficiency",
        label: "同效率优先",
        description:
          "先按效率排序；只有效率完全一样时，才按优先地区（地区1 > 地区2 > 其他）排序。"
      },
    ];
    state.ownershipPriorityModeOptions = [
      {
        value: "ignore",
        label: "不启用",
        description: "不使用已拥有武器优先，完全按刷取效率排序。",
      },
      {
        value: "strict",
        label: "严格优先",
        description: "排序时先比较“已拥有武器命中数量”，数量更多的方案排在前面，再比较效率。",
      },
      {
        value: "sameCoverage",
        label: "同覆盖优先",
        description: "先比较待刷覆盖数量；覆盖数相同时，再比较“已拥有武器命中数量”。",
      },
      {
        value: "sameEfficiency",
        label: "同效率优先",
        description: "先按效率排序；效率完全相同时，再比较“已拥有武器命中数量”。",
      },
    ];
    state.strictPriorityOrderOptions = [
      {
        value: "ownershipFirst",
        label: "已拥有武器优先在前",
        description: "当地区与已拥有武器都为严格优先时，先比较已拥有武器优先策略，再比较地区优先策略。",
      },
      {
        value: "regionFirst",
        label: "地区优先在前",
        description: "当地区与已拥有武器都为严格优先时，先比较地区优先策略，再比较已拥有武器优先策略。",
      },
    ];
    state.conflictOpenMap = ref({});
    state.showBackToTop = ref(false);

    state.legacyMigrationMarks = ref({});
    state.showStorageErrorModal = ref(false);
    state.storageErrorIgnored = ref(false);
    state.storageErrorCurrent = ref(null);
    state.storageErrorLogs = ref([]);
    state.storageErrorPreviewText = ref("");
    state.showRuntimeWarningModal = ref(false);
    state.runtimeWarningIgnored = ref(false);
    state.runtimeWarningCurrent = ref(null);
    state.runtimeWarningLogs = ref([]);
    state.runtimeWarningPreviewText = ref("");
    state.showRuntimeIgnoreConfirmModal = ref(false);
    state.showStorageClearConfirmModal = ref(false);
    state.showStorageIgnoreConfirmModal = ref(false);
    state.storageErrorClearCountdown = ref(0);
    state.storageErrorClearTargetKeys = ref([]);
    state.storageFeedbackUrl = "https://github.com/cmyyx/endfield-essence-planner/issues";
    state.pendingStorageIssues = [];
    state.showUpdatePrompt = ref(false);
    state.updateCurrentVersionText = ref("");
    state.updateLatestVersionText = ref("");
    state.updateLatestPublishedAt = ref("");
    state.versionBadgeDisplayText = ref("");
    state.gameCompatSupportedVersion = ref("");
    state.gameCompatNextVersion = ref("");
    state.gameCompatNextVersionAtText = ref("");
    state.showGameCompatWarning = ref(false);
    state.versionCopyFeedbackText = ref("");
    state.copyCurrentVersionInfo = () => {};
    state.dismissGameCompatWarning = () => {};

    state.tutorialVersion = "1.0.0";
    state.tutorialActive = ref(false);
    state.tutorialStepIndex = ref(0);
    state.tutorialSkippedVersion = ref("");
    state.tutorialCompletedVersion = ref("");
    state.showTutorialSkipConfirm = ref(false);
    state.showTutorialComplete = ref(false);

    state.filterS1 = ref([]);
    state.filterS2 = ref([]);
    state.filterS3 = ref([]);

    state.tutorialWeaponTarget = ref(null);
    state.tutorialSchemeTarget = ref(null);
    state.tutorialPlansTab = ref(null);
    state.tutorialBodyCollapsed = ref(false);
    state.tutorialCollapseHighlight = ref(false);
    state.tutorialCollapseHighlightSeen = ref(false);
    state.tutorialManualAdvanceHoldIndex = ref(-1);
    state.isPortrait = ref(false);

    state.tutorialTargetWeaponName = "沧溟星梦";
    state.tutorialTargetDungeonId = "energy";
    state.tutorialTargetLockType = "s3";
    state.tutorialTargetLockValue = "附术";
    state.tutorialGuideWeaponNames = new Set(["白夜新星", "宏愿"]);
    state.tutorialRequiredBaseKeys = ["主能力提升", "敏捷提升"];

    state.formatS1 = formatS1;
  };
})();
