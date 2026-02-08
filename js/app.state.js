(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initState = function initState(ctx, state) {
    const { ref } = ctx;

    state.searchQuery = ref("");
    state.selectedNames = ref([]);
    state.schemeBaseSelections = ref({});
    state.weaponMarks = ref({});
    state.showAbout = ref(false);
    state.showSecondaryMenu = ref(false);

    state.marksStorageKey = "weapon-marks:v1";
    state.legacyExcludedKey = "excluded-notes:v1";
    state.tutorialStorageKey = "planner-tutorial:v1";
    state.uiStateStorageKey = "planner-ui-state:v1";
    state.attrHintStorageKey = "planner-attr-hint:v1";
    state.noticeSkipKey = "announcement:skip";
    state.legacyNoticePrefix = "announcement:skip:";
    state.perfModeStorageKey = "planner-perf-mode:v1";
    state.themeModeStorageKey = "planner-theme-mode:v1";
    state.langStorageKey = "planner-lang";
    state.backgroundStorageKey = "planner-bg-image:v1";
    state.backgroundApiStorageKey = "planner-bg-api:v1";
    state.planConfigHintStorageKey = "planner-plan-config-hint:v1";
    // 更新方案推荐设置时递增该版本号，可让红点对所有用户重新显示一次。
    state.planConfigHintVersion = "2";

    state.lowGpuEnabled = ref(false);
    state.perfPreference = ref("auto");
    state.showPerfNotice = ref(false);
    state.themePreference = ref("auto");
    state.resolvedTheme = ref("dark");

    state.customBackground = ref("");
    state.customBackgroundName = ref("");
    state.customBackgroundError = ref("");
    state.customBackgroundApi = ref("");

    state.showNotice = ref(false);
    state.showChangelog = ref(false);
    state.skipNotice = ref(false);

    state.appReady = ref(false);
    state.currentView = ref("planner");
    state.mobilePanel = ref("weapons");
    state.showWeaponAttrs = ref(false);
    state.showAttrHint = ref(false);
    state.showFilterPanel = ref(true);
    state.showAllSchemes = ref(false);
    state.showPlanConfig = ref(false);
    state.showPlanConfigHintDot = ref(false);
    state.recommendationConfig = ref({
      hideExcluded: false,
      preferredRegion1: "",
      preferredRegion2: "",
      priorityMode: "sameCoverage",
      priorityStrength: 50,
      prioritySecondaryWeight: 60,
    });
    state.regionOptions = ref([]);
    state.regionPriorityModeOptions = [
      {
        value: "strict",
        label: "严格优先",
        description:
          "只要方案覆盖至少一把已选武器，就优先显示优先地区（地区1 > 地区2 > 其他），再比较效率。",
      },
      {
        value: "sameCoverage",
        label: "同覆盖优先",
        description:
          "先比较已选武器覆盖数量；覆盖数相同后，再按优先地区排序；最后比较可同时刷数量。",
      },
      {
        value: "sameEfficiency",
        label: "同效率优先",
        description:
          "先按默认效率排序（覆盖数、可同时刷数量等）；仅在效率相同时，才使用优先地区打破平局。",
      },
      {
        value: "weighted",
        label: "加权融合",
        description:
          "给优先地区增加加权分数，并与效率综合排序；可通过“影响强度”调节地区优先级的影响大小。",
      },
    ];
    state.conflictOpenMap = ref({});
    state.showBackToTop = ref(false);

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
