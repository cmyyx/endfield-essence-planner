(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initRecommendations = function initRecommendations(ctx, state) {
    const { computed } = ctx;

    const uniqueSorted = (items, sorter) => {
      const values = Array.from(new Set(items.filter(Boolean)));
      if (sorter) {
        values.sort(sorter);
      }
      return values;
    };

    const getRecommendationConfig = () =>
      state.recommendationConfig && state.recommendationConfig.value
        ? state.recommendationConfig.value
        : {
            hideExcluded: false,
            preferredRegion1: "",
            preferredRegion2: "",
            priorityMode: "sameCoverage",
            priorityStrength: 50,
            prioritySecondaryWeight: 60,
          };

    const getRegionRank = (region, preferred1, preferred2) => {
      if (!region) return 99;
      if (preferred1 && region === preferred1) return 0;
      if (preferred2 && region === preferred2) return 1;
      return 2;
    };

    const compareBaseEfficiency = (a, b) => {
      if (b.selectedMatchCount !== a.selectedMatchCount) {
        return b.selectedMatchCount - a.selectedMatchCount;
      }
      if (b.weaponCount !== a.weaponCount) return b.weaponCount - a.weaponCount;
      if (b.maxWeaponCount !== a.maxWeaponCount) {
        return b.maxWeaponCount - a.maxWeaponCount;
      }
      return 0;
    };

    const compareRegion = (a, b, preferred1, preferred2) => {
      if (!preferred1 && !preferred2) return 0;
      const rankDiff =
        getRegionRank(a.dungeonRegion, preferred1, preferred2) -
        getRegionRank(b.dungeonRegion, preferred1, preferred2);
      if (rankDiff !== 0) return rankDiff;
      return 0;
    };

    const compareWithPriorityMode = (a, b, config) => {
      const preferred1 = config.preferredRegion1 || "";
      const preferred2 = config.preferredRegion2 || "";
      const mode = config.priorityMode || "sameCoverage";
      const baseDiff = compareBaseEfficiency(a, b);

      if (mode === "strict") {
        const aCovered = a.selectedMatchCount > 0;
        const bCovered = b.selectedMatchCount > 0;
        if (aCovered !== bCovered) return bCovered ? 1 : -1;
        const regionDiff = compareRegion(a, b, preferred1, preferred2);
        if (regionDiff !== 0) return regionDiff;
        if (baseDiff !== 0) return baseDiff;
      } else if (mode === "sameCoverage") {
        if (b.selectedMatchCount !== a.selectedMatchCount) {
          return b.selectedMatchCount - a.selectedMatchCount;
        }
        const regionDiff = compareRegion(a, b, preferred1, preferred2);
        if (regionDiff !== 0) return regionDiff;
        if (b.weaponCount !== a.weaponCount) return b.weaponCount - a.weaponCount;
        if (b.maxWeaponCount !== a.maxWeaponCount) {
          return b.maxWeaponCount - a.maxWeaponCount;
        }
      } else if (mode === "weighted") {
        const strength = Math.max(0, Math.min(100, Number(config.priorityStrength) || 0));
        const secondaryWeight =
          Math.max(0, Math.min(100, Number(config.prioritySecondaryWeight) || 0)) / 100;
        const regionWeightTable = {
          0: 1,
          1: secondaryWeight,
          2: 0,
        };
        const efficiencyA =
          a.selectedMatchCount * 1000 +
          a.weaponCount * 100 +
          a.maxWeaponCount * 10;
        const efficiencyB =
          b.selectedMatchCount * 1000 +
          b.weaponCount * 100 +
          b.maxWeaponCount * 10;
        const priorityA =
          (regionWeightTable[getRegionRank(a.dungeonRegion, preferred1, preferred2)] || 0) * strength;
        const priorityB =
          (regionWeightTable[getRegionRank(b.dungeonRegion, preferred1, preferred2)] || 0) * strength;
        const totalA = efficiencyA + priorityA;
        const totalB = efficiencyB + priorityB;
        if (totalB !== totalA) return totalB - totalA;
      } else {
        if (baseDiff !== 0) return baseDiff;
        const regionDiff = compareRegion(a, b, preferred1, preferred2);
        if (regionDiff !== 0) return regionDiff;
      }

      if (baseDiff !== 0) return baseDiff;
      if (a.dungeon.name !== b.dungeon.name) {
        return a.dungeon.name.localeCompare(b.dungeon.name, "zh-Hans-CN");
      }
      return a.lockLabel.localeCompare(b.lockLabel, "zh-Hans-CN");
    };

    const toggleSchemeBasePick = (scheme, weapon) => {
      if (!scheme || !weapon || !scheme.baseOverflow) return;
      const baseKey = weapon.s1;
      if (!baseKey || baseKey === "任意") return;
      const stored = state.schemeBaseSelections.value || {};
      const hasStored = Object.prototype.hasOwnProperty.call(stored, scheme.schemeKey);
      const seed = hasStored
        ? stored[scheme.schemeKey] || []
        : scheme.baseAutoPickKeys || scheme.requiredBaseKeys || [];
      const current = new Set(seed.filter(Boolean));
      if (current.has(baseKey)) {
        current.delete(baseKey);
      } else {
        current.add(baseKey);
      }
      state.schemeBaseSelections.value = {
        ...stored,
        [scheme.schemeKey]: Array.from(current),
      };
    };

    const isConflictOpen = (schemeKey) => {
      const map = state.conflictOpenMap.value || {};
      if (Object.prototype.hasOwnProperty.call(map, schemeKey)) {
        return Boolean(map[schemeKey]);
      }
      return false;
    };

    const toggleConflictOpen = (schemeKey) => {
      const map = state.conflictOpenMap.value || {};
      state.conflictOpenMap.value = {
        ...map,
        [schemeKey]: !isConflictOpen(schemeKey),
      };
    };

    state.regionOptions.value = uniqueSorted(
      dungeons.map((dungeon) => getDungeonRegion(dungeon && dungeon.name)),
      (a, b) => a.localeCompare(b, "zh-Hans-CN")
    );

    const recommendations = computed(() => {
      const targets = state.selectedWeapons.value;
      if (!targets.length) return [];

      const lockOptions = [
        ...uniqueSorted(targets.map((weapon) => weapon.s2), (a, b) =>
          a.localeCompare(b, "zh-Hans-CN")
        ).map((value) => ({
          type: "s2",
          label: "附加属性",
          value,
        })),
        ...uniqueSorted(targets.map((weapon) => weapon.s3), (a, b) =>
          a.localeCompare(b, "zh-Hans-CN")
        ).map((value) => ({
          type: "s3",
          label: "技能属性",
          value,
        })),
      ];

      if (!lockOptions.length) return [];

      const selectedSet = new Set(state.selectedNames.value);
      const excludedSet = state.excludedNameSet.value;
      const recommendationConfig = getRecommendationConfig();
      const hideExcludedInPlans = Boolean(recommendationConfig.hideExcluded);
      const schemes = [];

      dungeons.forEach((dungeon) => {
        lockOptions.forEach((option) => {
          const lockPool = option.type === "s2" ? dungeon.s2_pool : dungeon.s3_pool;
          if (!lockPool.includes(option.value)) return;

          const matchedSelected = targets.filter((weapon) =>
            isWeaponCompatible(weapon, dungeon, option)
          );
          if (!matchedSelected.length) return;

          const schemeKey = `${dungeon.id}-${option.type}-${option.value}`;
          const schemeWeapons = weapons.filter((weapon) =>
            isWeaponCompatible(weapon, dungeon, option)
          );

          const schemeWeaponsActive = schemeWeapons.filter(
            (weapon) => !excludedSet.has(weapon.name)
          );

          const baseCounts = countBy(schemeWeaponsActive.map((weapon) => weapon.s1));
          const selectedSortSet = new Set(targets.map((weapon) => weapon.name));
          const schemeWeaponSorter = getSchemeWeaponSorter(option.type, selectedSortSet, baseCounts);
          const schemeWeaponsSorted = schemeWeapons.slice().sort(schemeWeaponSorter);
          const baseKeys = Object.keys(baseCounts);
          const baseSorted = baseKeys.sort((a, b) => {
            if (baseCounts[b] !== baseCounts[a]) return baseCounts[b] - baseCounts[a];
            return getS1OrderIndex(a) - getS1OrderIndex(b);
          });
          const baseLimit = Math.min(3, baseKeys.length);
          const baseAutoPick = [];
          const selectedBaseSet = new Set(matchedSelected.map((weapon) => weapon.s1));
          baseSorted.forEach((key) => {
            if (baseAutoPick.length >= baseLimit) return;
            if (selectedBaseSet.has(key) && !baseAutoPick.includes(key)) {
              baseAutoPick.push(key);
            }
          });
          baseSorted.forEach((key) => {
            if (baseAutoPick.length >= baseLimit) return;
            if (!baseAutoPick.includes(key)) {
              baseAutoPick.push(key);
            }
          });
          const baseOverflow = baseKeys.length > 3;
          if (baseAutoPick.length < 3 && state.s1Options.value.length) {
            const fillers = state.s1Options.value.filter((value) => !baseAutoPick.includes(value));
            baseAutoPick.push(...fillers.slice(0, 3 - baseAutoPick.length));
          }
          const baseAllLabels = baseSorted.slice();
          const storedMap = state.schemeBaseSelections.value || {};
          const hasStoredManual = Object.prototype.hasOwnProperty.call(storedMap, schemeKey);
          const storedManual = hasStoredManual ? storedMap[schemeKey] || [] : [];
          const requiredBaseKeys = uniqueSorted(
            matchedSelected.map((weapon) => weapon.s1),
            (a, b) => getS1OrderIndex(a) - getS1OrderIndex(b)
          );
          const manualSeed = hasStoredManual ? storedManual : baseAutoPick;
          const manualPickKeys = uniqueSorted(
            manualSeed.filter((key) => baseKeys.includes(key)),
            (a, b) => getS1OrderIndex(a) - getS1OrderIndex(b)
          );
          const displayBaseKeys = uniqueSorted(manualPickKeys, (a, b) => getS1OrderIndex(a) - getS1OrderIndex(b));
          const manualPickNeeded = baseOverflow ? Math.max(0, baseLimit - displayBaseKeys.length) : 0;
          const manualPickOverflow = baseOverflow && displayBaseKeys.length > baseLimit;
          const manualPickOverflowCount = manualPickOverflow
            ? Math.max(0, displayBaseKeys.length - baseLimit)
            : 0;
          const manualPickReady =
            baseOverflow && displayBaseKeys.length >= baseLimit && !manualPickOverflow;
          const activeBaseKeys = baseOverflow
            ? manualPickReady
              ? displayBaseKeys
              : baseAutoPick
            : baseKeys;
          const activeBaseSet = new Set(activeBaseKeys);
          const baseLockedSet = baseOverflow ? new Set(displayBaseKeys) : activeBaseSet;
          const baseAutoPickSet = new Set(baseAutoPick);

          const baseChips = baseSorted.map((key) => ({
            key,
            label: `${formatS1(key)} ×${baseCounts[key]}`,
            overflow: baseOverflow && !baseAutoPick.includes(key),
          }));

          const planWeapons = hideExcludedInPlans
            ? schemeWeaponsSorted.filter((weapon) => !excludedSet.has(weapon.name))
            : schemeWeaponsSorted.slice();
          const incompatibleSelected = targets
            .filter((weapon) => !isWeaponCompatible(weapon, dungeon, option))
            .slice()
            .sort(schemeWeaponSorter)
            .map((weapon) => ({
              ...weapon,
              ...getConflictInfo(weapon, dungeon, option),
              note: state.getWeaponNote(weapon.name),
            }));
          const autoCoveredSelected = matchedSelected.filter((weapon) => baseAutoPickSet.has(weapon.s1));
          const autoCoveredSelectedSet = new Set(autoCoveredSelected.map((weapon) => weapon.name));
          const autoMissingSelected = targets.filter(
            (weapon) => !autoCoveredSelectedSet.has(weapon.name)
          );
          const coveredSelected = matchedSelected.filter((weapon) => activeBaseSet.has(weapon.s1));
          const coveredSelectedSet = new Set(coveredSelected.map((weapon) => weapon.name));
          const missingSelected = matchedSelected.filter(
            (weapon) => !coveredSelectedSet.has(weapon.name)
          );
          const autoWeaponCount = schemeWeaponsActive.filter((weapon) =>
            baseAutoPickSet.has(weapon.s1)
          ).length;
          const displayWeaponCount = schemeWeaponsActive.filter((weapon) =>
            activeBaseSet.has(weapon.s1)
          ).length;

          const basePickLabels = baseOverflow ? [...displayBaseKeys] : baseAutoPick.slice();
          if (baseOverflow) {
            while (basePickLabels.length < baseLimit) {
              basePickLabels.push("请手动选择");
            }
          }

          const weaponRows = planWeapons.map((weapon) => ({
            ...weapon,
            isSelected: selectedSet.has(weapon.name),
            isExcluded: excludedSet.has(weapon.name),
            note: state.getWeaponNote(weapon.name),
            baseLocked: baseLockedSet.has(weapon.s1),
            baseConflict: baseOverflow && manualPickReady && !activeBaseSet.has(weapon.s1),
            baseDim:
              (baseOverflow && manualPickReady && !activeBaseSet.has(weapon.s1)) ||
              excludedSet.has(weapon.name),
          }));

          schemes.push({
            dungeon,
            dungeonRegion: getDungeonRegion(dungeon.name),
            lockType: option.type,
            lockLabel: option.label,
            lockValue: option.value,
            schemeKey,
            weaponRows,
            weaponCount: autoWeaponCount,
            maxWeaponCount: schemeWeaponsActive.length,
            selectedMatchCount: autoCoveredSelected.length,
            selectedMissingCount: autoMissingSelected.length,
            selectedMatchNames: autoCoveredSelected.map((weapon) => weapon.name),
            selectedMissingNames: autoMissingSelected.map((weapon) => weapon.name),
            conflictSelected: incompatibleSelected,
            conflictSelectedNames: incompatibleSelected.map((weapon) => weapon.name),
            displayWeaponCount,
            displaySelectedMatchCount: coveredSelected.length,
            displaySelectedMissingCount: missingSelected.length,
            displaySelectedMatchNames: coveredSelected.map((weapon) => weapon.name),
            displaySelectedMissingNames: missingSelected.map((weapon) => weapon.name),
            basePickLabels,
            baseAllLabels,
            baseAutoPickKeys: baseAutoPick.slice(),
            baseOverflow,
            manualPickNeeded,
            manualPickOverflow,
            manualPickOverflowCount,
            baseCount: baseKeys.length,
            baseChips,
            requiredBaseKeys,
          });
        });
      });

      return schemes.sort((a, b) => compareWithPriorityMode(a, b, recommendationConfig));
    });

    const coverageSummary = computed(() => {
      const targets = state.selectedWeapons.value;
      if (!targets.length) return null;
      const schemes = recommendations.value;
      if (!schemes.length) return null;
      const best = schemes[0];
      return {
        totalSelected: targets.length,
        bestMatchCount: best.selectedMatchCount,
        missingNames: best.selectedMissingNames || [],
        hasGap: best.selectedMatchCount < targets.length,
      };
    });

    const primaryRecommendations = computed(() => {
      const targets = state.selectedWeapons.value;
      const schemes = recommendations.value;
      if (!targets.length || !schemes.length) return [];

      const top = schemes[0];
      const bestMatch = top.selectedMatchCount;
      const bestWeaponCount = top.weaponCount;
      const bestSchemes = schemes.filter(
        (scheme) =>
          scheme.selectedMatchCount === bestMatch && scheme.weaponCount === bestWeaponCount
      );

      const remaining = new Set(targets.map((weapon) => weapon.name));
      const picked = [];
      const pickedKeys = new Set();
      const pickScheme = (scheme) => {
        picked.push(scheme);
        pickedKeys.add(scheme.schemeKey);
        if (scheme.selectedMatchNames) {
          scheme.selectedMatchNames.forEach((name) => remaining.delete(name));
        }
      };

      let seed = null;
      let seedCover = -1;
      bestSchemes.forEach((scheme) => {
        const cover = scheme.selectedMatchNames ? scheme.selectedMatchNames.length : 0;
        if (cover > seedCover) {
          seed = scheme;
          seedCover = cover;
        }
      });
      if (seed) pickScheme(seed);

      while (remaining.size) {
        let best = null;
        let bestCover = 0;

        schemes.forEach((scheme) => {
          if (pickedKeys.has(scheme.schemeKey)) return;
          const cover = scheme.selectedMatchNames
            ? scheme.selectedMatchNames.filter((name) => remaining.has(name)).length
            : 0;
          if (cover > bestCover) {
            best = scheme;
            bestCover = cover;
          }
        });

        if (!best || bestCover === 0) break;
        pickScheme(best);
      }

      bestSchemes.forEach((scheme) => {
        if (!pickedKeys.has(scheme.schemeKey)) pickScheme(scheme);
      });

      if (!picked.length && schemes.length) {
        pickScheme(schemes[0]);
      }

      return picked;
    });

    const extraRecommendations = computed(() => {
      const primaryKeys = new Set(primaryRecommendations.value.map((scheme) => scheme.schemeKey));
      return recommendations.value.filter((scheme) => !primaryKeys.has(scheme.schemeKey));
    });

    const visibleRecommendations = computed(() =>
      state.showAllSchemes.value ? recommendations.value : primaryRecommendations.value
    );

    state.toggleSchemeBasePick = toggleSchemeBasePick;
    state.isConflictOpen = isConflictOpen;
    state.toggleConflictOpen = toggleConflictOpen;
    state.recommendations = recommendations;
    state.coverageSummary = coverageSummary;
    state.primaryRecommendations = primaryRecommendations;
    state.extraRecommendations = extraRecommendations;
    state.visibleRecommendations = visibleRecommendations;
  };
})();
