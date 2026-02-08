(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initRecommendationDisplay = function initRecommendationDisplay(ctx, state) {
    const { computed, onMounted, onBeforeUnmount, watch, nextTick } = ctx;

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

    const displayPrimaryRecommendations = computed(() =>
      reorderForTutorial(state.primaryRecommendations.value)
    );

    const displayExtraRecommendations = computed(() =>
      reorderForTutorial(state.extraRecommendations.value)
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
        shrinkToFit(group);
      });
    };

    const scheduleAttrWrap = () => {
      nextTick(() => {
        requestAnimationFrame(updateAttrWrap);
      });
    };

    const fallbackPlan = computed(() => {
      const config = state.recommendationConfig.value || {};
      const hideExcludedInPlans = Boolean(config.hideExcluded);
      const excludedSet = hideExcludedInPlans ? state.excludedNameSet.value : null;
      const targets = hideExcludedInPlans
        ? state.selectedWeapons.value.filter((weapon) => !excludedSet.has(weapon.name))
        : state.selectedWeapons.value;
      if (!targets.length) return null;
      if (state.recommendations.value.length) return null;

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
      window.addEventListener("resize", scheduleAttrWrap);
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", scheduleAttrWrap);
    });

    watch(
      [
        state.showWeaponAttrs,
        state.showAllSchemes,
        state.mobilePanel,
        () => (state.recommendationConfig.value || {}).hideExcluded,
      ],
      scheduleAttrWrap
    );
    watch(state.filteredWeapons, scheduleAttrWrap);
    watch(displayRecommendations, scheduleAttrWrap);
    watch(state.conflictOpenMap, scheduleAttrWrap, { deep: true });
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
    state.fallbackPlan = fallbackPlan;
  };
})();
