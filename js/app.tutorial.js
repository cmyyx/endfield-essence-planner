(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initTutorial = function initTutorial(ctx, state) {
    const { ref, computed, watch, nextTick } = ctx;
    const reportStorageIssue = (operation, key, error, meta) => {
      if (typeof state.reportStorageIssue === "function") {
        state.reportStorageIssue(operation, key, error, meta);
        return;
      }
      const queue = Array.isArray(state.pendingStorageIssues) ? state.pendingStorageIssues : [];
      queue.push({ operation, key, error, meta });
      state.pendingStorageIssues = queue.slice(-20);
    };

    const tutorialWeapon = {
      name: "教学示例-武器",
      rarity: 5,
      type: "示例类型",
      s1: "力量提升",
      s2: "攻击提升",
      s3: "压制",
    };

    const tutorialEssenceOwned = ref(false);
    const tutorialNote = ref("");
    const tutorialNoteTouched = ref(false);
    const tutorialManualBack = ref(false);
    let tutorialAutoStartPending = true;
    const tutorialAutoStartEnabled = false;
    let tutorialAdvanceTimer = null;
    let tutorialScrollTimer = null;

    const tutorialTargetDungeon = dungeons.find(
      (dungeon) => dungeon && dungeon.id === state.tutorialTargetDungeonId
    );
    const tutorialTargetDungeonName = tutorialTargetDungeon ? tutorialTargetDungeon.name : "";

    const isTutorialGuideWeapon = (name) => state.tutorialGuideWeaponNames.has(name);

    const tutorialSkipAll = computed({
      get: () => state.tutorialSkippedVersion.value === state.tutorialVersion,
      set: (value) => {
        state.tutorialSkippedVersion.value = value ? state.tutorialVersion : "";
      },
    });
    const tutorialCompleted = computed(
      () => state.tutorialCompletedVersion.value === state.tutorialVersion
    );

    const tutorialSteps = computed(() => {
      const targetWeapon = state.tTerm("weapon", state.tutorialTargetWeaponName);
      const targetWeaponS1 = state.tTerm("s1", "智识提升");
      const targetDungeon = state.tTerm("dungeon", tutorialTargetDungeonName);
      const guideWeaponA = state.tTerm("weapon", "白夜新星");
      const guideWeaponAS1 = state.tTerm("s1", "主能力提升");
      const guideWeaponB = state.tTerm("weapon", "宏愿");
      const guideWeaponBS1 = state.tTerm("s1", "敏捷提升");
      return [
        {
          key: "show-attrs",
          title: state.t("tutorial.step_show_attrs_title"),
          body: [
            state.t("tutorial.step_show_attrs_tip_toggle", {
              label: state.t("nav.show_attributes_ownership_notes"),
            }),
            state.t("tutorial.step_show_attrs_tip_after_toggle"),
          ],
        },
        {
          key: "essence-owned",
          title: state.t("button.mark_essence_owned"),
          body: [
            state.t("tutorial.step_essence_owned_tip_click", {
              label: state.t("button.mark_essence_owned"),
            }),
            state.t("tutorial.step_essence_owned_tip_effect"),
          ],
        },
        {
          key: "note",
          title: state.t("tutorial.step_note_title"),
          body: [
            state.t("tutorial.step_note_tip_optional"),
            state.t("tutorial.step_note_tip_example"),
            state.t("tutorial.step_note_tip_manual_next", {
              label: state.t("gear_refining.next"),
            }),
          ],
        },
        {
          key: "base-pick",
          title: state.t("tutorial.step_base_pick_title"),
          body: [
            state.t("tutorial.step_base_pick_tip_auto_selected", {
              weapon: targetWeapon,
              s1: targetWeaponS1,
              dungeon: targetDungeon,
            }),
            state.t("tutorial.step_base_pick_tip_max_gt_simul"),
            state.t("tutorial.step_base_pick_tip_max_simul", {
              max: 7,
              simul: 6,
            }),
            state.t("tutorial.step_base_pick_tip_total_lock", {
              total: 4,
              lock: 3,
            }),
            state.t(
              "tutorial.step_base_pick_tip_manual_pick_reason",
              {
                weapon: targetWeapon,
                s1: targetWeaponS1,
              }
            ),
            state.t("tutorial.step_base_pick_tip_select_two", {
              weaponA: guideWeaponA,
              s1A: guideWeaponAS1,
              weaponB: guideWeaponB,
              s1B: guideWeaponBS1,
            }),
          ],
        },
      ];
    });

    const tutorialTotalSteps = computed(() => tutorialSteps.value.length);
    const tutorialStep = computed(
      () => tutorialSteps.value[state.tutorialStepIndex.value] || tutorialSteps.value[0]
    );
    const tutorialStepKey = computed(() => tutorialStep.value.key);
    const tutorialStepLines = computed(() => {
      const step = tutorialStep.value || {};
      const lines = Array.isArray(step.body) ? step.body.slice() : [];
      if (step.key === "base-pick" && state.isPortrait.value) {
        lines.unshift(
          state.t("tutorial.step_base_pick_tip_portrait_switch", {
            label: state.t("nav.plans"),
          })
        );
      }
      return lines;
    });
    const tutorialBodyCanCollapse = computed(
      () => tutorialStepKey.value === "base-pick" && tutorialStepLines.value.length > 2
    );
    const tutorialVisibleLines = computed(() => {
      const lines = tutorialStepLines.value;
      if (!tutorialBodyCanCollapse.value || !state.tutorialBodyCollapsed.value) {
        return lines;
      }
      return lines.slice(0, 2);
    });

    const tutorialTargetScheme = computed(() =>
      state.visibleRecommendations.value.find(
        (scheme) =>
          scheme &&
          scheme.dungeon &&
          scheme.dungeon.id === state.tutorialTargetDungeonId &&
          scheme.lockType === state.tutorialTargetLockType &&
          scheme.lockValue === state.tutorialTargetLockValue
      )
    );
    const tutorialTargetSchemeKey = computed(
      () => (tutorialTargetScheme.value ? tutorialTargetScheme.value.schemeKey : "")
    );

    const tutorialManualPickReady = computed(() => {
      const scheme = tutorialTargetScheme.value;
      if (!scheme) return false;
      const stored = state.schemeBaseSelections.value[scheme.schemeKey] || [];
      return state.tutorialRequiredBaseKeys.every((key) => stored.includes(key));
    });

    const tutorialStepReady = computed(() => {
      if (!state.tutorialActive.value) return false;
      switch (tutorialStepKey.value) {
        case "show-attrs":
          return state.showWeaponAttrs.value;
        case "essence-owned":
          return tutorialEssenceOwned.value;
        case "note":
          return true;
        case "base-pick":
          return tutorialManualPickReady.value;
        default:
          return false;
      }
    });

    const tutorialAutoAdvanceDisabled = computed(
      () =>
        tutorialStepKey.value === "note" ||
        tutorialManualBack.value ||
        state.tutorialManualAdvanceHoldIndex.value === state.tutorialStepIndex.value
    );

    const resetTutorialState = () => {
      tutorialEssenceOwned.value = false;
      tutorialNote.value = "";
      tutorialNoteTouched.value = false;
      tutorialManualBack.value = false;
      state.tutorialManualAdvanceHoldIndex.value = -1;
      state.tutorialBodyCollapsed.value = false;
      state.tutorialCollapseHighlight.value = false;
      state.tutorialCollapseHighlightSeen.value = false;
    };

    const syncTutorialPanelForStep = () => {
      if (tutorialStepKey.value === "base-pick") {
        if (!state.isPortrait.value) {
          state.mobilePanel.value = "plans";
        }
        return;
      }
      state.mobilePanel.value = "weapons";
    };

    const applyTutorialBasePickPreset = () => {
      const target = weapons.find((weapon) => weapon.name === state.tutorialTargetWeaponName);
      if (!target) return;
      if (state.selectedNames.value.length !== 1 || state.selectedNames.value[0] !== target.name) {
        state.selectedNames.value = [target.name];
      }
      state.schemeBaseSelections.value = {};
      state.showAllSchemes.value = true;
    };

    const syncTutorialStepState = () => {
      if (tutorialStepKey.value === "base-pick") {
        applyTutorialBasePickPreset();
        return;
      }
    };

    const maybeHighlightCollapseToggle = () => {
      if (!state.tutorialActive.value) return;
      if (tutorialStepKey.value !== "base-pick") return;
      if (!state.isPortrait.value) return;
      if (!tutorialBodyCanCollapse.value || !state.tutorialBodyCollapsed.value) return;
      if (state.tutorialCollapseHighlightSeen.value) return;
      state.tutorialCollapseHighlight.value = true;
    };

    const syncTutorialBodyCollapse = () => {
      if (!state.tutorialActive.value) {
        state.tutorialBodyCollapsed.value = false;
        state.tutorialCollapseHighlight.value = false;
        state.tutorialCollapseHighlightSeen.value = false;
        return;
      }
      if (tutorialStepKey.value === "base-pick" && state.isPortrait.value) {
        state.tutorialBodyCollapsed.value = true;
        maybeHighlightCollapseToggle();
        return;
      }
      state.tutorialBodyCollapsed.value = false;
      state.tutorialCollapseHighlight.value = false;
    };

    const toggleTutorialBody = () => {
      state.tutorialBodyCollapsed.value = !state.tutorialBodyCollapsed.value;
      if (state.tutorialCollapseHighlight.value) {
        state.tutorialCollapseHighlight.value = false;
        state.tutorialCollapseHighlightSeen.value = true;
      }
    };

    const toggleTutorialEssenceOwned = () => {
      tutorialEssenceOwned.value = !tutorialEssenceOwned.value;
      if (tutorialEssenceOwned.value) {
        state.trackEvent("weapon_mark_essence_owned", { weapon: tutorialWeapon.name, tutorial: true });
      } else {
        state.trackEvent("weapon_mark_essence_pending", { weapon: tutorialWeapon.name, tutorial: true });
      }
    };

    const markTutorialNoteTouched = () => {
      tutorialNoteTouched.value = true;
    };

    const updateTutorialNote = (value) => {
      tutorialNote.value = value || "";
      tutorialNoteTouched.value = true;
    };

    const clearTutorialScrollTimer = () => {
      if (tutorialScrollTimer) {
        clearTimeout(tutorialScrollTimer);
        tutorialScrollTimer = null;
      }
    };

    const clearTutorialAdvanceTimer = () => {
      if (tutorialAdvanceTimer) {
        clearTimeout(tutorialAdvanceTimer);
        tutorialAdvanceTimer = null;
      }
    };

    const resolveTutorialTarget = (value) => (Array.isArray(value) ? value[0] : value);

    const getTutorialScrollTarget = () => {
      if (!state.tutorialActive.value) return null;
      if (tutorialStepKey.value === "essence-owned" || tutorialStepKey.value === "note") {
        return resolveTutorialTarget(state.tutorialWeaponTarget.value);
      }
      if (tutorialStepKey.value === "base-pick") {
        if (state.isPortrait.value && state.mobilePanel.value !== "plans") {
          return resolveTutorialTarget(state.tutorialPlansTab.value);
        }
        return resolveTutorialTarget(state.tutorialSchemeTarget.value);
      }
      return null;
    };

    const scrollTutorialTarget = () => {
      const target = getTutorialScrollTarget();
      if (!target || typeof target.scrollIntoView !== "function") return;
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    };

    const scheduleTutorialScroll = () => {
      clearTutorialScrollTimer();
      tutorialScrollTimer = setTimeout(() => {
        if (!state.tutorialActive.value) return;
        if (typeof nextTick === "function") {
          nextTick(() => requestAnimationFrame(scrollTutorialTarget));
        } else {
          requestAnimationFrame(scrollTutorialTarget);
        }
      }, 120);
    };

    const advanceTutorialStep = (options = {}) => {
      const { manual = false } = options;
      if (state.tutorialStepIndex.value >= tutorialTotalSteps.value - 1) {
        finishTutorial();
        return;
      }
      state.tutorialStepIndex.value += 1;
      tutorialManualBack.value = false;
      state.tutorialManualAdvanceHoldIndex.value = -1;
      syncTutorialPanelForStep();
      syncTutorialStepState();
      if (manual && tutorialStepReady.value) {
        state.tutorialManualAdvanceHoldIndex.value = state.tutorialStepIndex.value;
      }
    };

    const scheduleTutorialAdvance = () => {
      clearTutorialAdvanceTimer();
      tutorialAdvanceTimer = setTimeout(() => {
        if (!state.tutorialActive.value) return;
        if (!tutorialStepReady.value) return;
        advanceTutorialStep();
      }, 450);
    };

    const startTutorial = (force = false) => {
      if (!force && (tutorialSkipAll.value || tutorialCompleted.value)) return;
      state.showTutorialSkipConfirm.value = false;
      state.showTutorialComplete.value = false;
      state.tutorialActive.value = true;
      state.tutorialStepIndex.value = 0;
      tutorialAutoStartPending = false;
      resetTutorialState();
      syncTutorialPanelForStep();
      syncTutorialStepState();
    };

    const finishTutorial = () => {
      state.tutorialActive.value = false;
      state.tutorialCompletedVersion.value = state.tutorialVersion;
      state.showTutorialSkipConfirm.value = false;
      state.showTutorialComplete.value = true;
      clearTutorialAdvanceTimer();
      clearTutorialScrollTimer();
    };

    const skipTutorialAll = () => {
      state.tutorialActive.value = false;
      state.tutorialSkippedVersion.value = state.tutorialVersion;
      state.tutorialCompletedVersion.value = state.tutorialVersion;
      tutorialAutoStartPending = false;
      state.showTutorialSkipConfirm.value = false;
      state.showTutorialComplete.value = false;
      clearTutorialAdvanceTimer();
      clearTutorialScrollTimer();
    };

    const openTutorialSkipConfirm = () => {
      if (!state.tutorialActive.value) return;
      state.showTutorialSkipConfirm.value = true;
    };

    const closeTutorialSkipConfirm = () => {
      state.showTutorialSkipConfirm.value = false;
    };

    const confirmTutorialSkipAll = () => {
      skipTutorialAll();
    };

    const closeTutorialComplete = () => {
      state.showTutorialComplete.value = false;
    };

    const skipTutorialStep = () => {
      if (!state.tutorialActive.value) return;
      clearTutorialAdvanceTimer();
      advanceTutorialStep();
    };

    const nextTutorialStep = () => {
      if (!tutorialStepReady.value) return;
      clearTutorialAdvanceTimer();
      tutorialManualBack.value = false;
      advanceTutorialStep({ manual: true });
    };

    const prevTutorialStep = () => {
      if (!state.tutorialActive.value) return;
      if (state.tutorialStepIndex.value <= 0) return;
      state.tutorialStepIndex.value -= 1;
      tutorialManualBack.value = true;
      state.tutorialManualAdvanceHoldIndex.value = -1;
      clearTutorialAdvanceTimer();
      syncTutorialPanelForStep();
      syncTutorialStepState();
    };

    const maybeAutoStartTutorial = () => {
      if (!tutorialAutoStartPending) return;
      if (!tutorialAutoStartEnabled) {
        tutorialAutoStartPending = false;
        return;
      }
      if (state.tutorialActive.value) return;
      if (tutorialSkipAll.value || tutorialCompleted.value) {
        tutorialAutoStartPending = false;
        return;
      }
      if (
        state.showNotice.value ||
        state.showChangelog.value ||
        state.showAbout.value ||
        state.showDomainWarning.value ||
        state.showMigrationModal.value ||
        state.showMigrationConfirmModal.value
      ) {
        return;
      }
      tutorialAutoStartPending = false;
      startTutorial(true);
    };

    watch(
      [state.tutorialStepIndex, state.tutorialActive],
      ([, active]) => {
        if (!active) {
          clearTutorialScrollTimer();
          syncTutorialBodyCollapse();
          return;
        }
        syncTutorialPanelForStep();
        syncTutorialStepState();
        syncTutorialBodyCollapse();
        scheduleTutorialScroll();
      },
      { immediate: true }
    );

    watch(
      state.isPortrait,
      (current, previous) => {
        if (current && !previous) {
          state.tutorialCollapseHighlightSeen.value = false;
          maybeHighlightCollapseToggle();
          return;
        }
        if (!current && previous) {
          state.tutorialCollapseHighlight.value = false;
        }
      },
      { immediate: true }
    );

    watch(
      [tutorialStepReady, tutorialAutoAdvanceDisabled],
      ([ready, disabled]) => {
        if (!state.tutorialActive.value) {
          clearTutorialAdvanceTimer();
          return;
        }
        if (disabled) {
          clearTutorialAdvanceTimer();
          return;
        }
        if (ready) {
          scheduleTutorialAdvance();
        } else {
          clearTutorialAdvanceTimer();
        }
      },
      { immediate: true }
    );

    watch(
      [state.mobilePanel, tutorialStepKey, state.isPortrait],
      () => {
        if (!state.tutorialActive.value) return;
        if (tutorialStepKey.value === "base-pick") {
          scheduleTutorialScroll();
        }
      },
      { immediate: true }
    );

    watch(
      [state.tutorialSkippedVersion, state.tutorialCompletedVersion],
      () => {
        try {
          localStorage.setItem(
            state.tutorialStorageKey,
            JSON.stringify({
              skipVersion: state.tutorialSkippedVersion.value,
              completedVersion: state.tutorialCompletedVersion.value,
            })
          );
        } catch (error) {
          reportStorageIssue("storage.write", state.tutorialStorageKey, error, {
            scope: "tutorial.persist-state",
          });
        }
      },
      { immediate: true }
    );

    state.tutorialWeapon = tutorialWeapon;
    state.tutorialEssenceOwned = tutorialEssenceOwned;
    state.tutorialNote = tutorialNote;
    state.tutorialSkipAll = tutorialSkipAll;
    state.tutorialStep = tutorialStep;
    state.tutorialVisibleLines = tutorialVisibleLines;
    state.tutorialTotalSteps = tutorialTotalSteps;
    state.tutorialStepKey = tutorialStepKey;
    state.tutorialStepReady = tutorialStepReady;
    state.tutorialBodyCanCollapse = tutorialBodyCanCollapse;
    state.tutorialTargetScheme = tutorialTargetScheme;
    state.tutorialTargetSchemeKey = tutorialTargetSchemeKey;
    state.isTutorialGuideWeapon = isTutorialGuideWeapon;
    state.startTutorial = startTutorial;
    state.nextTutorialStep = nextTutorialStep;
    state.prevTutorialStep = prevTutorialStep;
    state.skipTutorialStep = skipTutorialStep;
    state.skipTutorialAll = skipTutorialAll;
    state.openTutorialSkipConfirm = openTutorialSkipConfirm;
    state.closeTutorialSkipConfirm = closeTutorialSkipConfirm;
    state.confirmTutorialSkipAll = confirmTutorialSkipAll;
    state.closeTutorialComplete = closeTutorialComplete;
    state.finishTutorial = finishTutorial;
    state.toggleTutorialBody = toggleTutorialBody;
    state.toggleTutorialEssenceOwned = toggleTutorialEssenceOwned;
    state.updateTutorialNote = updateTutorialNote;
    state.markTutorialNoteTouched = markTutorialNoteTouched;
    state.maybeAutoStartTutorial = maybeAutoStartTutorial;
  };
})();
