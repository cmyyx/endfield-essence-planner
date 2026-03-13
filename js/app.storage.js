(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initStorage = function initStorage(ctx, state) {
    const { computed, watch, onBeforeUnmount } = ctx;
    const createStorageSchemaApi = modules.createStorageSchemaApi;
    const createStoragePersistenceApi = modules.createStoragePersistenceApi;
    const createStorageRecoveryApi = modules.createStorageRecoveryApi;
    const createStorageDiagnosticApi = modules.createStorageDiagnosticApi;

    if (
      typeof createStorageSchemaApi !== "function" ||
      typeof createStoragePersistenceApi !== "function" ||
      typeof createStorageRecoveryApi !== "function" ||
      typeof createStorageDiagnosticApi !== "function"
    ) {
      const error = new Error("storage helper modules are missing");
      if (typeof state.reportRuntimeWarning === "function") {
        state.reportRuntimeWarning(error, {
          module: "app.storage",
          operation: "init-storage",
          kind: "dependency-missing",
          resource: "app.storage.*",
        });
      }
      const noopAsync = async () => {};
      const queueStorageIssue = (operation, key, issueError, meta) => {
        const currentQueue = Array.isArray(state.pendingStorageIssues) ? state.pendingStorageIssues : [];
        currentQueue.push({
          operation: String(operation || ""),
          key: String(key || ""),
          error: issueError || null,
          meta: meta && typeof meta === "object" ? meta : {},
          occurredAt: new Date().toISOString(),
        });
        state.pendingStorageIssues = currentQueue.slice(-20);
      };
      if (typeof state.normalizeWeaponMarks !== "function") {
        state.normalizeWeaponMarks = (raw) => {
          if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
          return raw;
        };
      }
      if (typeof state.normalizeLegacyMarks !== "function") {
        state.normalizeLegacyMarks = () => ({});
      }
      if (typeof state.normalizeRecommendationConfig !== "function") {
        state.normalizeRecommendationConfig = (raw) =>
          raw && typeof raw === "object" && !Array.isArray(raw) ? { ...raw } : {};
      }
      if (typeof state.reportStorageIssue !== "function") {
        state.reportStorageIssue = queueStorageIssue;
      }
      if (typeof state.ignoreStorageErrors !== "function") {
        state.ignoreStorageErrors = () => {
          if (state.storageErrorIgnored && typeof state.storageErrorIgnored === "object") {
            state.storageErrorIgnored.value = true;
          }
        };
      }
      if (typeof state.requestIgnoreStorageErrors !== "function") {
        state.requestIgnoreStorageErrors = () => {
          if (state.showStorageIgnoreConfirmModal && typeof state.showStorageIgnoreConfirmModal === "object") {
            state.showStorageIgnoreConfirmModal.value = true;
          }
        };
      }
      if (typeof state.cancelIgnoreStorageErrors !== "function") {
        state.cancelIgnoreStorageErrors = () => {
          if (state.showStorageIgnoreConfirmModal && typeof state.showStorageIgnoreConfirmModal === "object") {
            state.showStorageIgnoreConfirmModal.value = false;
          }
        };
      }
      if (typeof state.confirmIgnoreStorageErrors !== "function") {
        state.confirmIgnoreStorageErrors = () => {
          if (state.showStorageIgnoreConfirmModal && typeof state.showStorageIgnoreConfirmModal === "object") {
            state.showStorageIgnoreConfirmModal.value = false;
          }
          if (typeof state.ignoreStorageErrors === "function") {
            state.ignoreStorageErrors();
          }
        };
      }
      if (typeof state.exportStorageDiagnosticBundle !== "function") {
        state.exportStorageDiagnosticBundle = noopAsync;
      }
      if (typeof state.exportWeaponMarks !== "function") {
        state.exportWeaponMarks = noopAsync;
      }
      if (typeof state.handleMarksImportFile !== "function") {
        state.handleMarksImportFile = () => {};
      }
      if (typeof state.cancelMarksImport !== "function") {
        state.cancelMarksImport = () => {
          if (state.showMarksImportConfirmModal && typeof state.showMarksImportConfirmModal === "object") {
            state.showMarksImportConfirmModal.value = false;
          }
        };
      }
      if (typeof state.confirmMarksImport !== "function") {
        state.confirmMarksImport = noopAsync;
      }
      if (typeof state.requestStorageDataClear !== "function") {
        state.requestStorageDataClear = () => {
          if (state.showStorageClearConfirmModal && typeof state.showStorageClearConfirmModal === "object") {
            state.showStorageClearConfirmModal.value = true;
          }
        };
      }
      if (typeof state.cancelStorageDataClear !== "function") {
        state.cancelStorageDataClear = () => {
          if (state.showStorageClearConfirmModal && typeof state.showStorageClearConfirmModal === "object") {
            state.showStorageClearConfirmModal.value = false;
          }
        };
      }
      if (typeof state.confirmStorageDataClearAndReload !== "function") {
        state.confirmStorageDataClearAndReload = noopAsync;
      }
      if (typeof state.storageFeedbackUrl !== "string" || !state.storageFeedbackUrl.trim()) {
        state.storageFeedbackUrl = "https://github.com/cmyyx/endfield-essence-planner/issues";
      }
      if (!Array.isArray(state.pendingStorageIssues)) {
        state.pendingStorageIssues = [];
      }
      return;
    }

    const schemaApi = createStorageSchemaApi(state);
    const persistenceApi = createStoragePersistenceApi(state);
    const recoveryApi = createStorageRecoveryApi(state, persistenceApi, {
      storageFeedbackUrl: state.storageFeedbackUrl,
    });
    // Recovery may fill a default feedback URL; diagnostics should always use the resolved one.
    const feedbackUrl = recoveryApi.storageFeedbackUrl || state.storageFeedbackUrl;
    const diagnosticApi = createStorageDiagnosticApi(state, persistenceApi, {
      storageFeedbackUrl: feedbackUrl,
    });

    persistenceApi.setIssueReporter(recoveryApi.reportStorageIssue);
    diagnosticApi.setIssueReporter(recoveryApi.reportStorageIssue);

    state.normalizeWeaponMarks = schemaApi.normalizeWeaponMarks;
    state.normalizeLegacyMarks = () => ({});
    state.normalizeRecommendationConfig = schemaApi.normalizeRecommendationConfig;
    state.reportStorageIssue = recoveryApi.reportStorageIssue;
    state.ignoreStorageErrors = recoveryApi.ignoreStorageErrors;
    state.requestIgnoreStorageErrors = recoveryApi.requestIgnoreStorageErrors;
    state.cancelIgnoreStorageErrors = recoveryApi.cancelIgnoreStorageErrors;
    state.confirmIgnoreStorageErrors = recoveryApi.confirmIgnoreStorageErrors;
    state.exportStorageDiagnosticBundle = diagnosticApi.exportStorageDiagnosticBundle;
    state.requestStorageDataClear = recoveryApi.requestStorageDataClear;
    state.cancelStorageDataClear = recoveryApi.cancelStorageDataClear;
    state.confirmStorageDataClearAndReload = recoveryApi.confirmStorageDataClearAndReload;
    state.storageFeedbackUrl = recoveryApi.storageFeedbackUrl;

    const appUtils =
      typeof window !== "undefined" && window.AppUtils && typeof window.AppUtils === "object"
        ? window.AppUtils
        : {};
    const fallbackTriggerJsonDownload = (filename, payload) => {
      if (
        typeof window === "undefined" ||
        typeof document === "undefined" ||
        typeof Blob === "undefined" ||
        typeof URL === "undefined" ||
        typeof URL.createObjectURL !== "function"
      ) {
        throw new Error("JSON download is unavailable in the current runtime");
      }
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = String(filename || "planner-marks.json");
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 0);
    };
    const triggerJsonDownload =
      typeof appUtils.triggerJsonDownload === "function"
        ? appUtils.triggerJsonDownload
        : fallbackTriggerJsonDownload;
    const resolveText = (key, params, fallback) =>
      typeof state.t === "function" ? state.t(key, params) : fallback;
    const buildExportStamp = () =>
      new Date().toISOString().replace(/[^\d]/g, "").slice(0, 14) || String(Date.now());
    const readVersionInfo = () => {
      if (typeof window === "undefined") return {};
      const info = window.__APP_VERSION_INFO;
      return info && typeof info === "object" ? info : {};
    };
    const buildMarksImportSummary = (normalized) => {
      const source = normalized && typeof normalized === "object" ? normalized : {};
      const names = Object.keys(source);
      let ownedCount = 0;
      let essenceCount = 0;
      let noteCount = 0;
      names.forEach((name) => {
        const entry = source[name];
        if (!entry || typeof entry !== "object") return;
        if (entry.weaponOwned) ownedCount += 1;
        if (entry.essenceOwned) essenceCount += 1;
        if (typeof entry.note === "string" && entry.note) noteCount += 1;
      });
      return {
        total: names.length,
        ownedCount,
        essenceCount,
        noteCount,
      };
    };
    const setRefValue = (refObj, value) => {
      if (refObj && typeof refObj === "object") {
        refObj.value = value;
      }
    };
    const getRefValue = (refObj) =>
      refObj && typeof refObj === "object" ? refObj.value : undefined;
    let marksImportCountdownTimer = null;
    const stopMarksImportCountdown = () => {
      if (!marksImportCountdownTimer) return;
      clearInterval(marksImportCountdownTimer);
      marksImportCountdownTimer = null;
    };
    const startMarksImportCountdown = () => {
      stopMarksImportCountdown();
      setRefValue(state.marksImportConfirmCountdown, 3);
      marksImportCountdownTimer = setInterval(() => {
        const current = getRefValue(state.marksImportConfirmCountdown) || 0;
        if (current > 0) {
          setRefValue(state.marksImportConfirmCountdown, current - 1);
        }
        if (getRefValue(state.marksImportConfirmCountdown) <= 0) {
          setRefValue(state.marksImportConfirmCountdown, 0);
          stopMarksImportCountdown();
        }
      }, 1000);
    };
    const resetMarksImportState = (options = {}) => {
      const keepFileName = Boolean(options.keepFileName);
      setRefValue(state.marksImportError, "");
      if (!keepFileName) {
        setRefValue(state.marksImportFileName, "");
      }
      setRefValue(state.marksImportSummary, null);
      setRefValue(state.marksImportMeta, null);
      setRefValue(state.marksImportPending, null);
      stopMarksImportCountdown();
      setRefValue(state.marksImportConfirmCountdown, 0);
      setRefValue(state.showMarksImportConfirmModal, false);
    };
    const parseMarksImportPayload = (payload) => {
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return { error: resolveText("plan_config.marks_import_invalid_root", null, "Invalid data") };
      }
      const topLevelKeys = Object.keys(payload);
      if (!Object.prototype.hasOwnProperty.call(payload, "marks")) {
        return { error: resolveText("plan_config.marks_import_invalid_root", null, "Invalid data") };
      }
      const hasUnknownTopLevelKey = topLevelKeys.some((key) => key !== "marks" && key !== "__meta");
      if (hasUnknownTopLevelKey) {
        return { error: resolveText("plan_config.marks_import_invalid_root", null, "Invalid data") };
      }
      if (!payload.marks || typeof payload.marks !== "object" || Array.isArray(payload.marks)) {
        return { error: resolveText("plan_config.marks_import_invalid_root", null, "Invalid data") };
      }
      return {
        marks: payload.marks,
        meta:
          payload.__meta && typeof payload.__meta === "object" && !Array.isArray(payload.__meta)
            ? payload.__meta
            : null,
      };
    };
    const exportWeaponMarks = () => {
      try {
        const versionInfo = readVersionInfo();
        const normalized = schemaApi.normalizeWeaponMarks(getRefValue(state.weaponMarks));
        const exportedAt = new Date().toISOString();
        const payload = {
          __meta: {
            exportedAt,
            buildId: String(versionInfo.buildId || ""),
            displayVersion: String(versionInfo.displayVersion || ""),
          },
          marks: normalized,
        };
        const stamp = buildExportStamp();
        const buildId = String(versionInfo.buildId || "unknown");
        const filename = `planner-marks-${buildId}-${stamp}.json`;
        triggerJsonDownload(filename, payload);
      } catch (error) {
        if (typeof state.reportStorageIssue === "function") {
          state.reportStorageIssue("export", state.marksStorageKey, error, {
            scope: "marks-export",
          });
        }
      }
    };
    const queueMarksImportConfirm = (normalized, meta, fileName) => {
      setRefValue(state.marksImportPending, normalized);
      setRefValue(state.marksImportSummary, buildMarksImportSummary(normalized));
      setRefValue(state.marksImportMeta, meta && typeof meta === "object" ? meta : null);
      setRefValue(state.marksImportFileName, fileName || "");
      setRefValue(state.marksImportError, "");
      setRefValue(state.showMarksImportConfirmModal, true);
      startMarksImportCountdown();
    };
    const handleMarksImportFile = (event) => {
      const input = event && event.target ? event.target : null;
      const file = input && input.files && input.files[0];
      if (!file) return;
      resetMarksImportState({ keepFileName: true });
      setRefValue(state.marksImportFileName, file.name || "");
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result || "");
          const payload = JSON.parse(text);
          const parsed = parseMarksImportPayload(payload);
          if (parsed.error) {
            setRefValue(state.marksImportError, parsed.error);
            setRefValue(state.marksImportPending, null);
            return;
          }
          const schemaIssues = schemaApi.inspectWeaponMarksSchemaIssues(parsed.marks);
          const importSchemaIssue = schemaIssues[0] || "";
          if (importSchemaIssue) {
            setRefValue(
              state.marksImportError,
              resolveText(
                "plan_config.marks_import_invalid_schema",
                { message: importSchemaIssue },
                `Schema error: ${importSchemaIssue}`
              )
            );
            setRefValue(state.marksImportPending, null);
            return;
          }
          const normalized = schemaApi.normalizeWeaponMarks(parsed.marks);
          queueMarksImportConfirm(normalized, parsed.meta, file.name || "");
        } catch (error) {
          setRefValue(
            state.marksImportError,
            resolveText("plan_config.marks_import_invalid_json", null, "Invalid JSON")
          );
        }
      };
      reader.onerror = () => {
        setRefValue(
          state.marksImportError,
          resolveText("plan_config.marks_import_read_failed", null, "Failed to read file")
        );
      };
      reader.readAsText(file);
      if (input) input.value = "";
    };
    const cancelMarksImport = () => {
      resetMarksImportState();
    };
    const confirmMarksImport = () => {
      if (getRefValue(state.marksImportConfirmCountdown) > 0) return;
      const pending = getRefValue(state.marksImportPending);
      if (!pending || typeof pending !== "object") {
        resetMarksImportState();
        return;
      }
      setRefValue(state.weaponMarks, pending);
      resetMarksImportState();
    };
    state.exportWeaponMarks = exportWeaponMarks;
    state.handleMarksImportFile = handleMarksImportFile;
    state.cancelMarksImport = cancelMarksImport;
    state.confirmMarksImport = confirmMarksImport;

    recoveryApi.flushPendingStorageIssues();
    recoveryApi.applyBootstrapStorageProbeIssue();

    const urlSelectedWeaponNames = schemaApi.getUrlSelectedWeaponNames();
    let restoredFilterPanelPreference = false;

    try {
      const storedState = localStorage.getItem(state.uiStateStorageKey);
      if (storedState) {
        const parsed = JSON.parse(storedState);
        const restored = schemaApi.sanitizeState(parsed);
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
          if (restored.weaponAttrOverrides) {
            state.weaponAttrOverrides.value = restored.weaponAttrOverrides;
          }
          if (typeof restored.showWeaponAttrs === "boolean") {
            state.showWeaponAttrs.value = restored.showWeaponAttrs;
          }
          if (typeof restored.showWeaponOwnership === "boolean") {
            state.showWeaponOwnership.value = restored.showWeaponOwnership;
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
      const isJsonParseError =
        error &&
        (error.name === "SyntaxError" ||
          /json|unexpected token|unterminated/i.test(String(error.message || "")));
      const shouldRepairFromUrl = isJsonParseError && urlSelectedWeaponNames.length > 0;
      if (shouldRepairFromUrl) {
        try {
          state.selectedNames.value = urlSelectedWeaponNames.slice();
          persistenceApi.writeJsonStorageWithVerify(
            state.uiStateStorageKey,
            { selectedNames: urlSelectedWeaponNames.slice() },
            { scope: "repair-ui-state-from-url", note: "repair invalid planner-ui-state via url weapons" }
          );
        } catch (repairError) {
          recoveryApi.reportStorageIssue("storage.write", state.uiStateStorageKey, repairError, {
            scope: "repair-ui-state-from-url",
          });
          recoveryApi.reportStorageIssue("storage.read", state.uiStateStorageKey, error, {
            scope: "restore-ui-state",
          });
        }
      } else {
        recoveryApi.reportStorageIssue("storage.read", state.uiStateStorageKey, error, {
          scope: "restore-ui-state",
        });
      }
    }

    const storedTheme = persistenceApi.safeGetItem(state.themeModeStorageKey, {
      scope: "restore-theme",
    });
    if (schemaApi.isThemeMode(storedTheme)) {
      state.themePreference.value = storedTheme;
    }

    const storedBackgroundDisplay = persistenceApi.safeGetItem(state.backgroundDisplayStorageKey, {
      scope: "restore-background-display",
    });
    if (storedBackgroundDisplay === "0") {
      state.backgroundDisplayEnabled.value = false;
    } else if (storedBackgroundDisplay === "1") {
      state.backgroundDisplayEnabled.value = true;
    }

    try {
      const storedPlanConfigHintVersion = localStorage.getItem(state.planConfigHintStorageKey);
      state.showPlanConfigHintDot.value =
        storedPlanConfigHintVersion !== state.planConfigHintVersion;
    } catch (error) {
      state.showPlanConfigHintDot.value = true;
      recoveryApi.reportStorageIssue("storage.read", state.planConfigHintStorageKey, error, {
        scope: "restore-plan-config-hint",
      });
    }

    try {
      const storedEquipRefiningNavHintVersion = localStorage.getItem(
        state.equipRefiningNavHintStorageKey
      );
      state.showEquipRefiningNavHintDot.value =
        storedEquipRefiningNavHintVersion !== state.equipRefiningNavHintVersion;
    } catch (error) {
      state.showEquipRefiningNavHintDot.value = true;
      recoveryApi.reportStorageIssue("storage.read", state.equipRefiningNavHintStorageKey, error, {
        scope: "restore-equip-refining-nav-hint",
      });
    }
    try {
      const storedRerunRankingNavHintVersion = localStorage.getItem(
        state.rerunRankingNavHintStorageKey
      );
      state.showRerunRankingNavHintDot.value =
        storedRerunRankingNavHintVersion !== state.rerunRankingNavHintVersion;
    } catch (error) {
      state.showRerunRankingNavHintDot.value = true;
      recoveryApi.reportStorageIssue("storage.read", state.rerunRankingNavHintStorageKey, error, {
        scope: "restore-rerun-ranking-nav-hint",
      });
    }

    if (!restoredFilterPanelPreference && schemaApi.shouldCollapseFilterPanelByDefault()) {
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
      recoveryApi.reportStorageIssue("storage.read", state.tutorialStorageKey, error, {
        scope: "restore-tutorial",
      });
    }

    try {
      const storedMarks = localStorage.getItem(state.marksStorageKey);
      if (storedMarks) {
        const parsed = JSON.parse(storedMarks);
        const schemaIssues = schemaApi.inspectWeaponMarksSchemaIssues(parsed);
        if (schemaIssues.length) {
          recoveryApi.reportStorageIssue(
            "storage.schema",
            state.marksStorageKey,
            new Error(schemaIssues[0]),
            {
              scope: "restore-weapon-marks-schema",
              note: schemaIssues.slice(0, 8).join("; "),
            }
          );
        }
        state.weaponMarks.value = schemaApi.normalizeWeaponMarks(parsed);
      }
    } catch (error) {
      recoveryApi.reportStorageIssue("storage.read", state.marksStorageKey, error, {
        scope: "restore-weapon-marks",
      });
    }

    // v1 legacy mark migration has been formally retired; clear any stale bridge cache.
    if (state.legacyMigrationMarks && state.legacyMigrationMarks.value) {
      state.legacyMigrationMarks.value = {};
    }

    watch(
      state.weaponMarks,
      (value) => {
        try {
          const schemaIssues = schemaApi.inspectWeaponMarksSchemaIssues(value);
          if (schemaIssues.length) {
            recoveryApi.reportStorageIssue(
              "storage.schema",
              state.marksStorageKey,
              new Error(schemaIssues[0]),
              {
                scope: "persist-weapon-marks-schema",
                note: schemaIssues.slice(0, 8).join("; "),
              }
            );
          }
          const normalized = schemaApi.normalizeWeaponMarks(value);
          const keys = Object.keys(normalized || {});
          if (!keys.length) {
            persistenceApi.safeRemoveItem(state.marksStorageKey, {
              scope: "persist-weapon-marks-empty",
            });
            return;
          }
          persistenceApi.writeJsonStorageWithVerify(
            state.marksStorageKey,
            normalized,
            {
              scope: "persist-weapon-marks-verify",
            },
            {
              serialized: schemaApi.serializeWeaponMarksNormalized(normalized),
            }
          );
        } catch (error) {
          recoveryApi.reportStorageIssue("storage.write", state.marksStorageKey, error, {
            scope: "persist-weapon-marks",
          });
        }
      },
      { deep: true }
    );

    const uiState = computed(() => {
      const value = {
        searchQuery: state.searchQuery.value,
        selectedNames: state.selectedNames.value,
        schemeBaseSelections: state.schemeBaseSelections.value,
        weaponAttrOverrides: state.weaponAttrOverrides.value,
        showWeaponAttrs: state.showWeaponAttrs.value,
        showWeaponOwnership: state.showWeaponOwnership.value,
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
        persistenceApi.safeSetItem(state.uiStateStorageKey, JSON.stringify(value), {
          scope: "persist-ui-state",
        });
      },
      { deep: true }
    );

    watch(state.themePreference, (value) => {
      if (!value || value === "auto") {
        persistenceApi.safeRemoveItem(state.themeModeStorageKey, {
          scope: "persist-theme-clear-auto",
        });
        return;
      }
      persistenceApi.safeSetItem(state.themeModeStorageKey, value, {
        scope: "persist-theme",
      });
    });

    watch(state.backgroundDisplayEnabled, (value) => {
      persistenceApi.safeSetItem(state.backgroundDisplayStorageKey, value ? "1" : "0", {
        scope: "persist-background-display",
      });
    });

    if (typeof onBeforeUnmount === "function") {
      onBeforeUnmount(() => {
        stopMarksImportCountdown();
        recoveryApi.stopStorageClearCountdown();
      });
    }
  };
})();
