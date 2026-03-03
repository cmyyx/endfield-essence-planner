(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initUpSchedule = function initUpSchedule(ctx, state) {
    const { ref } = ctx;
    const runtimeRawSource =
      state.upScheduleRawSource && typeof state.upScheduleRawSource === "object"
        ? state.upScheduleRawSource
        : weaponUpSchedules && typeof weaponUpSchedules === "object"
        ? weaponUpSchedules
        : {};

    state.upScheduleRawSource = runtimeRawSource;
    if (!state.upScheduleNormalized || typeof state.upScheduleNormalized.value === "undefined") {
      state.upScheduleNormalized = ref({});
    }
    if (!state.upScheduleIssues || typeof state.upScheduleIssues.value === "undefined") {
      state.upScheduleIssues = ref([]);
    }

    // Extension points for phase 2.2/2.3: normalize, validate, and diagnostics.
    if (typeof state.normalizeUpSchedule !== "function") {
      state.normalizeUpSchedule = () => state.upScheduleNormalized.value;
    }
    if (typeof state.validateUpSchedule !== "function") {
      state.validateUpSchedule = () => state.upScheduleIssues.value;
    }
    if (typeof state.reportUpScheduleIssue !== "function") {
      state.reportUpScheduleIssue = (issue) => {
        const next = Array.isArray(state.upScheduleIssues.value)
          ? state.upScheduleIssues.value.slice()
          : [];
        if (issue && typeof issue === "object") {
          next.push({ ...issue });
        }
        state.upScheduleIssues.value = next.slice(-50);
      };
    }

    state.upScheduleNormalized.value = { byWeapon: {} };
    state.upScheduleIssues.value = [];
  };
})();
