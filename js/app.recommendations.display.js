(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initRecommendationDisplay = function initRecommendationDisplay(ctx, state) {
    const { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } = ctx;

    const reorderForTutorial = (list) => {
      if (!state.tutorialActive.value || state.tutorialStepKey.value !== "base-pick") {
        return list;
      }
      const target = state.tutorialTargetScheme ? state.tutorialTargetScheme.value : null;
      if (!target) return list;
      const targetKey = target.schemeKey;
      const hasTarget = list.some((scheme) => scheme && scheme.schemeKey === targetKey);
      if (!hasTarget) return list;
      const rest = list.filter((scheme) => scheme && scheme.schemeKey !== targetKey);
      return [target, ...rest];
    };

    const hasVisibleRows = (scheme) =>
      Boolean(scheme && Array.isArray(scheme.weaponRows) && scheme.weaponRows.length);

    const displayPrimaryRecommendations = computed(() =>
      reorderForTutorial(state.primaryRecommendations.value).filter(hasVisibleRows)
    );

    const displayExtraRecommendations = computed(() =>
      reorderForTutorial(state.extraRecommendations.value).filter(hasVisibleRows)
    );

    const displayRecommendations = computed(() => {
      if (!state.showAllSchemes.value || !displayExtraRecommendations.value.length) {
        return displayPrimaryRecommendations.value;
      }
      return [...displayPrimaryRecommendations.value, ...displayExtraRecommendations.value];
    });

    const displayDividerIndex = computed(() => {
      if (!state.showAllSchemes.value) return -1;
      if (!displayExtraRecommendations.value.length) return -1;
      return displayPrimaryRecommendations.value.length;
    });

    const recommendationVirtual = ref({
      startIndex: 0,
      endIndex: Number.POSITIVE_INFINITY,
      itemHeight: 420,
      overscan: 1,
      enabled: false,
    });

    const updateRecommendationVirtualWindow = () => {
      const list = displayRecommendations.value;
      if (!list.length) {
        recommendationVirtual.value = {
          ...recommendationVirtual.value,
          startIndex: 0,
          endIndex: 0,
        };
        state.recommendationTopSpacer.value = 0;
        state.recommendationBottomSpacer.value = 0;
        return;
      }

      if (!recommendationVirtual.value.enabled) {
        if (
          recommendationVirtual.value.startIndex === 0 &&
          recommendationVirtual.value.endIndex === list.length &&
          state.recommendationTopSpacer.value === 0 &&
          state.recommendationBottomSpacer.value === 0
        ) {
          return;
        }
        recommendationVirtual.value = {
          ...recommendationVirtual.value,
          startIndex: 0,
          endIndex: list.length,
        };
        state.recommendationTopSpacer.value = 0;
        state.recommendationBottomSpacer.value = 0;
        return;
      }

      if (state.currentView.value !== "planner" || typeof window === "undefined") {
        recommendationVirtual.value = {
          ...recommendationVirtual.value,
          startIndex: 0,
          endIndex: list.length,
        };
        state.recommendationTopSpacer.value = 0;
        state.recommendationBottomSpacer.value = 0;
        return;
      }

      const anchor = document.querySelector(".scheme-list-anchor");
      if (!anchor) {
        recommendationVirtual.value = {
          ...recommendationVirtual.value,
          startIndex: 0,
          endIndex: list.length,
        };
        state.recommendationTopSpacer.value = 0;
        state.recommendationBottomSpacer.value = 0;
        return;
      }

      const sampleCard = document.querySelector(".scheme-card");
      const measuredHeight = sampleCard ? sampleCard.getBoundingClientRect().height + 12 : 420;
      const itemHeight = Math.max(220, Math.ceil(measuredHeight));
      const viewportHeight =
        window.innerHeight ||
        (document.documentElement && document.documentElement.clientHeight) ||
        0;
      const scrollTop = window.scrollY || window.pageYOffset || 0;
      const listTop = anchor.getBoundingClientRect().top + scrollTop;
      const viewTop = Math.max(0, scrollTop - listTop);

      const overscan = recommendationVirtual.value.overscan;
      const startIndex = Math.max(0, Math.floor(viewTop / itemHeight) - overscan);
      const visibleCount = Math.max(1, Math.ceil(viewportHeight / itemHeight) + overscan * 2 + 1);
      const endIndex = Math.min(list.length, startIndex + visibleCount);

      recommendationVirtual.value = {
        ...recommendationVirtual.value,
        startIndex,
        endIndex,
        itemHeight,
      };
      state.recommendationTopSpacer.value = startIndex * itemHeight;
      state.recommendationBottomSpacer.value = Math.max(0, (list.length - endIndex) * itemHeight);
    };

    const scheduleRecommendationVirtualWindow =
      typeof state.createUiScheduler === "function"
        ? state.createUiScheduler(updateRecommendationVirtualWindow)
        : () => {
            if (typeof window === "undefined") return;
            const run = () => updateRecommendationVirtualWindow();
            if (typeof nextTick === "function") {
              nextTick(() => {
                if (typeof window.requestAnimationFrame === "function") {
                  window.requestAnimationFrame(run);
                } else {
                  run();
                }
              });
              return;
            }
            if (typeof window.requestAnimationFrame === "function") {
              window.requestAnimationFrame(run);
            } else {
              run();
            }
          };

    const visibleDisplayRecommendations = computed(() => {
      const list = displayRecommendations.value;
      const start = Math.max(0, recommendationVirtual.value.startIndex || 0);
      const end = Math.max(start, recommendationVirtual.value.endIndex || list.length);
      return list.slice(start, end);
    });

    const recommendationVirtualStartIndex = computed(
      () => recommendationVirtual.value.startIndex || 0
    );

    const updateAttrWrap = () => {
      const groups = document.querySelectorAll(".scheme-weapon-attrs");
      const isWrapped = (group) => {
        const items = group.querySelectorAll(".attr-value");
        if (items.length < 2) return false;
        const firstTop = items[0].offsetTop;
        for (let i = 1; i < items.length; i += 1) {
          if (items[i].offsetTop > firstTop) {
            return true;
          }
        }
        return false;
      };

      const shrinkToFit = (group) => {
        const minFontSize = 9;
        const maxSteps = 2;
        let steps = 0;
        while (isWrapped(group) && steps < maxSteps) {
          const current = parseFloat(getComputedStyle(group).fontSize);
          if (!current || current <= minFontSize) break;
          const nextSize = Math.max(minFontSize, current - 1);
          group.style.fontSize = `${nextSize}px`;
          steps += 1;
        }
      };

      groups.forEach((group) => {
        group.classList.remove("is-wrapped");
        group.style.fontSize = "";
        if (!isWrapped(group)) {
          return;
        }
        group.classList.add("is-wrapped");
        // Keep weapon selection rows readable: do not downscale wrapped attrs there.
        if (group.closest(".weapon-attr-item")) {
          return;
        }
        shrinkToFit(group);
      });
    };

    const scheduleAttrWrap = () => {
      nextTick(() => {
        requestAnimationFrame(() => {
          updateAttrWrap();
          requestAnimationFrame(updateAttrWrap);
        });
      });
    };

    const fallbackPlan = computed(() => {
      const targets = state.selectedWeapons.value;
      if (!targets.length) return null;
      if (state.recommendations.value.length) return null;
      const selectedAttrIssues =
        typeof state.getSelectedWeaponAttrIssues === "function"
          ? state.getSelectedWeaponAttrIssues()
          : [];
      if (selectedAttrIssues.length) return null;
      if (state.recommendationDataIssue && state.recommendationDataIssue.value) return null;

      const baseCounts = countBy(targets.map((weapon) => weapon.s1));
      const baseKeys = Object.keys(baseCounts);
      const baseSorted = baseKeys.sort((a, b) => {
        if (baseCounts[b] !== baseCounts[a]) return baseCounts[b] - baseCounts[a];
        return getS1OrderIndex(a) - getS1OrderIndex(b);
      });
      const basePick = baseSorted.slice(0, 3);
      const baseOverflow = baseKeys.length > 3;
      const basePickLabels = basePick.slice();
      while (basePickLabels.length < 3) basePickLabels.push("任意属性");
      const baseAllLabels = baseSorted.slice();

      const baseChips = baseSorted.map((key) => ({
        key,
        label: `${formatS1(key)} ×${baseCounts[key]}`,
        overflow: baseOverflow && !basePick.includes(key),
      }));

      const s2Conflict = new Set(targets.map((weapon) => weapon.s2)).size > 1;
      const s3Conflict = new Set(targets.map((weapon) => weapon.s3)).size > 1;

      const weaponRows = targets
        .slice()
        .sort(getBaseAttrSorter("s2", "s3", null, baseCounts))
        .map((weapon) => ({
          ...weapon,
          baseLocked: basePick.includes(weapon.s1),
          baseConflict: baseOverflow && !basePick.includes(weapon.s1),
        }));

      return {
        basePickLabels,
        baseAllLabels,
        baseOverflow,
        baseCount: baseKeys.length,
        baseChips,
        weaponRows,
        s2Conflict,
        s3Conflict,
      };
    });

    onMounted(() => {
      scheduleAttrWrap();
      scheduleRecommendationVirtualWindow();
      window.addEventListener("load", scheduleAttrWrap);
      window.addEventListener("resize", scheduleAttrWrap);
      window.addEventListener("resize", scheduleRecommendationVirtualWindow);
      window.addEventListener("scroll", scheduleRecommendationVirtualWindow, { passive: true });
    });

    onBeforeUnmount(() => {
      window.removeEventListener("load", scheduleAttrWrap);
      window.removeEventListener("resize", scheduleAttrWrap);
      window.removeEventListener("resize", scheduleRecommendationVirtualWindow);
      window.removeEventListener("scroll", scheduleRecommendationVirtualWindow);
    });

    watch(
      [
        state.showWeaponAttrs,
        state.showAllSchemes,
        state.mobilePanel,
        () => (state.recommendationConfig.value || {}).hideEssenceOwnedWeapons,
        () => (state.recommendationConfig.value || {}).hideEssenceOwnedOwnedOnly,
        () => (state.recommendationConfig.value || {}).hideUnownedWeapons,
      ],
      () => {
        scheduleAttrWrap();
        scheduleRecommendationVirtualWindow();
      }
    );
    watch(state.filteredWeapons, scheduleAttrWrap);
    watch(displayRecommendations, () => {
      scheduleAttrWrap();
      scheduleRecommendationVirtualWindow();
    });
    watch(state.conflictOpenMap, scheduleAttrWrap, { deep: true });
    watch(
      () => state.currentView.value,
      () => {
        scheduleAttrWrap();
        scheduleRecommendationVirtualWindow();
      },
      { immediate: true }
    );
    watch(
      () => state.selectedWeapons.value.length,
      (count) => {
        if (count === 1) {
          state.showAllSchemes.value = true;
        } else if (count > 1) {
          state.showAllSchemes.value = false;
        } else if (count === 0) {
          state.showAllSchemes.value = false;
        }
      }
    );

    state.displayRecommendations = displayRecommendations;
    state.displayDividerIndex = displayDividerIndex;
    state.visibleDisplayRecommendations = visibleDisplayRecommendations;
    state.recommendationVirtualStartIndex = recommendationVirtualStartIndex;
    state.fallbackPlan = fallbackPlan;
  };
})();
