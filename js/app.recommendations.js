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
            hideEssenceOwnedWeaponsInPlans: false,
            hideEssenceOwnedOwnedOnly: false,
            hideUnownedWeaponsInPlans: false,
            hideFourStarWeaponsInPlans: true,
            preferredRegion1: "",
            preferredRegion2: "",
            regionPriorityMode: "ignore",
            ownershipPriorityMode: "ignore",
            strictPriorityOrder: "ownershipFirst",
          };

    const getCatalogWeapons = () =>
      typeof state.getCatalogWeapons === "function" ? state.getCatalogWeapons() : weapons;

    const getSelectedWeaponAttrIssues = () =>
      typeof state.getSelectedWeaponAttrIssues === "function"
        ? state.getSelectedWeaponAttrIssues()
        : [];

    const resolveRecommendationContext = () => {
      const isWeaponOwnedForRecommendation =
        typeof state.isWeaponOwnedForRecommendation === "function"
          ? state.isWeaponOwnedForRecommendation
          : state.isWeaponOwned;
      const isEssenceOwnedForRecommendation =
        typeof state.isEssenceOwnedForRecommendation === "function"
          ? state.isEssenceOwnedForRecommendation
          : typeof state.isEssenceOwnedForPlanning === "function"
          ? state.isEssenceOwnedForPlanning
          : state.isEssenceOwned;
      const recommendationConfig = getRecommendationConfig();
      const hideEssenceOwnedInPlans = Boolean(recommendationConfig.hideEssenceOwnedWeaponsInPlans);
      const hideEssenceOwnedOwnedOnly = Boolean(recommendationConfig.hideEssenceOwnedOwnedOnly);
      const hideUnownedInPlans = Boolean(recommendationConfig.hideUnownedWeaponsInPlans);
      const hideFourStarWeaponsInPlans = Boolean(recommendationConfig.hideFourStarWeaponsInPlans);
      const useEffectiveMetrics = hideEssenceOwnedInPlans && hideEssenceOwnedOwnedOnly;
      const shouldHideWeaponInPlan = (weapon) => {
        if (!weapon) return true;
        if (hideEssenceOwnedInPlans && isEssenceOwnedForRecommendation(weapon.name)) {
          if (!hideEssenceOwnedOwnedOnly || isWeaponOwnedForRecommendation(weapon.name)) {
            return true;
          }
        }
        if (hideUnownedInPlans && !isWeaponOwnedForRecommendation(weapon.name)) return true;
        return false;
      };
      const selectedWeapons = Array.isArray(state.selectedWeapons && state.selectedWeapons.value)
        ? state.selectedWeapons.value
        : [];
      const targets = selectedWeapons.filter((weapon) => !shouldHideWeaponInPlan(weapon));
      return {
        isWeaponOwnedForRecommendation,
        isEssenceOwnedForRecommendation,
        recommendationConfig,
        hideFourStarWeaponsInPlans,
        useEffectiveMetrics,
        shouldHideWeaponInPlan,
        selectedWeapons,
        targets,
      };
    };

    const getRegionRank = (region, preferred1, preferred2) => {
      if (!region) return 99;
      if (preferred1 && region === preferred1) return 0;
      if (preferred2 && region === preferred2) return 1;
      return 2;
    };

    const getSelectedMatchCountForSort = (scheme) => {
      if (Number.isFinite(scheme && scheme.effectiveSelectedMatchCount)) {
        return scheme.effectiveSelectedMatchCount;
      }
      return Number.isFinite(scheme && scheme.selectedMatchCount) ? scheme.selectedMatchCount : 0;
    };

    const getWeaponCountForSort = (scheme) => {
      if (Number.isFinite(scheme && scheme.effectiveWeaponCount)) {
        return scheme.effectiveWeaponCount;
      }
      return Number.isFinite(scheme && scheme.weaponCount) ? scheme.weaponCount : 0;
    };

    const getOwnedPendingMatchCountForSort = (scheme) => {
      if (Number.isFinite(scheme && scheme.effectiveOwnedPendingMatchCount)) {
        return scheme.effectiveOwnedPendingMatchCount;
      }
      return Number.isFinite(scheme && scheme.ownedPendingMatchCount) ? scheme.ownedPendingMatchCount : 0;
    };

    const getUnownedPendingMatchCountForSort = (scheme) => {
      if (Number.isFinite(scheme && scheme.effectiveUnownedPendingMatchCount)) {
        return scheme.effectiveUnownedPendingMatchCount;
      }
      return Number.isFinite(scheme && scheme.unownedPendingMatchCount)
        ? scheme.unownedPendingMatchCount
        : 0;
    };

    const compareBaseEfficiency = (a, b) => {
      const selectedDiff = getSelectedMatchCountForSort(b) - getSelectedMatchCountForSort(a);
      if (selectedDiff !== 0) return selectedDiff;

      const weaponDiff = getWeaponCountForSort(b) - getWeaponCountForSort(a);
      if (weaponDiff !== 0) return weaponDiff;

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

    const compareOwnership = (a, b) => {
      const ownedDiff = getOwnedPendingMatchCountForSort(b) - getOwnedPendingMatchCountForSort(a);
      if (ownedDiff !== 0) return ownedDiff;

      const unownedDiff =
        getUnownedPendingMatchCountForSort(a) - getUnownedPendingMatchCountForSort(b);
      if (unownedDiff !== 0) {
        return unownedDiff;
      }
      return 0;
    };

    const compareWithPriorityMode = (a, b, config) => {
      const preferred1 = config.preferredRegion1 || "";
      const preferred2 = config.preferredRegion2 || "";
      const regionMode = config.regionPriorityMode || "ignore";
      const ownershipMode = config.ownershipPriorityMode || "ignore";
      const strictPriorityOrder = config.strictPriorityOrder || "ownershipFirst";
      const baseDiff = compareBaseEfficiency(a, b);
      const coverageDiff = getSelectedMatchCountForSort(b) - getSelectedMatchCountForSort(a);
      const regionDiff = compareRegion(a, b, preferred1, preferred2);
      const ownershipDiff = compareOwnership(a, b);

      const hasStrictMode = regionMode === "strict" || ownershipMode === "strict";
      if (hasStrictMode && regionMode === "strict" && ownershipMode === "strict") {
        if (strictPriorityOrder === "ownershipFirst") {
          if (ownershipDiff !== 0) return ownershipDiff;
          if (regionDiff !== 0) return regionDiff;
        } else {
          if (regionDiff !== 0) return regionDiff;
          if (ownershipDiff !== 0) return ownershipDiff;
        }
      } else if (hasStrictMode) {
        if (ownershipMode === "strict" && ownershipDiff !== 0) return ownershipDiff;
        if (regionMode === "strict" && regionDiff !== 0) return regionDiff;
      }

      if (coverageDiff !== 0) return coverageDiff;

      if (ownershipMode === "sameCoverage" && ownershipDiff !== 0) return ownershipDiff;
      if (regionMode === "sameCoverage" && regionDiff !== 0) return regionDiff;

      if (baseDiff !== 0) return baseDiff;

      if (ownershipMode === "sameEfficiency" && ownershipDiff !== 0) return ownershipDiff;
      if (regionMode === "sameEfficiency" && regionDiff !== 0) return regionDiff;

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
      const selectedSet = new Set(state.selectedNames.value);
      const selectedAttrIssues = getSelectedWeaponAttrIssues();
      if (selectedAttrIssues.length) return [];
      const recommendationContext = resolveRecommendationContext();
      const {
        isWeaponOwnedForRecommendation,
        isEssenceOwnedForRecommendation,
        recommendationConfig,
        hideFourStarWeaponsInPlans,
        useEffectiveMetrics,
        shouldHideWeaponInPlan,
        targets,
      } = recommendationContext;
      const catalogWeapons = getCatalogWeapons();
      if (!targets.length) return [];

      const isWeaponFarmableInCurrentVersion = (weapon) => {
        if (!weapon || !weapon.s2 || !weapon.s3) return false;
        return dungeons.some((dungeon) => {
          const s2Pool = Array.isArray(dungeon && dungeon.s2_pool) ? dungeon.s2_pool : [];
          const s3Pool = Array.isArray(dungeon && dungeon.s3_pool) ? dungeon.s3_pool : [];
          return s2Pool.includes(weapon.s2) && s3Pool.includes(weapon.s3);
        });
      };
      const farmableS1Pool = uniqueSorted(
        catalogWeapons
          .filter((weapon) => isWeaponFarmableInCurrentVersion(weapon))
          .map((weapon) => weapon.s1),
        (a, b) => getS1OrderIndex(a) - getS1OrderIndex(b)
      );

      const lockOptions = [
        ...uniqueSorted(targets.map((weapon) => weapon.s2), (a, b) =>
          a.localeCompare(b, "zh-Hans-CN")
        ).map((value) => ({
          type: "s2",
          label: "nav.extra_attributes",
          value,
        })),
        ...uniqueSorted(targets.map((weapon) => weapon.s3), (a, b) =>
          a.localeCompare(b, "zh-Hans-CN")
        ).map((value) => ({
          type: "s3",
          label: "nav.skill_attributes",
          value,
        })),
      ];

      if (!lockOptions.length) return [];

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
          const schemeWeapons = catalogWeapons.filter((weapon) => {
            if (hideFourStarWeaponsInPlans && weapon.rarity === 4) return false;
            return isWeaponCompatible(weapon, dungeon, option);
          });

          const schemeWeaponsVisible = schemeWeapons.filter(
            (weapon) => !shouldHideWeaponInPlan(weapon)
          );
          const schemeWeaponsActive = schemeWeaponsVisible;

          const baseCounts = countBy(schemeWeaponsActive.map((weapon) => weapon.s1));
          const sortBaseCounts = countBy(schemeWeaponsVisible.map((weapon) => weapon.s1));
          const selectedSortSet = selectedSet;
          const schemeWeaponSorter = getSchemeWeaponSorter(
            option.type,
            selectedSortSet,
            sortBaseCounts
          );
          const schemeWeaponsSorted = schemeWeaponsVisible.slice().sort(schemeWeaponSorter);
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
          if (baseAutoPick.length < 3 && farmableS1Pool.length) {
            const fillers = farmableS1Pool.filter((value) => !baseAutoPick.includes(value));
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

          const planWeapons = schemeWeaponsSorted;
          const incompatibleSelected = targets
            .filter((weapon) => !isWeaponCompatible(weapon, dungeon, option))
            .slice()
            .sort(schemeWeaponSorter)
            .map((weapon) => ({
              ...weapon,
              ...getConflictInfo(weapon, dungeon, option),
              isUnowned: !isWeaponOwnedForRecommendation(weapon.name),
              isEssenceOwnedReal: state.isEssenceOwned(weapon.name),
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
          const autoCoveredOwnedSelected = autoCoveredSelected.filter((weapon) =>
            isWeaponOwnedForRecommendation(weapon.name)
          );
          const effectiveAutoCoveredSelected = useEffectiveMetrics
            ? autoCoveredSelected.filter(
                (weapon) =>
                  !(
                    isEssenceOwnedForRecommendation(weapon.name) &&
                    isWeaponOwnedForRecommendation(weapon.name)
                  )
              )
            : autoCoveredSelected.slice();
          const effectiveAutoCoveredOwnedSelected = effectiveAutoCoveredSelected.filter((weapon) =>
            isWeaponOwnedForRecommendation(weapon.name)
          );
          const coveredOwnedSelected = coveredSelected.filter((weapon) =>
            isWeaponOwnedForRecommendation(weapon.name)
          );
          const autoWeaponCount = schemeWeaponsActive.filter((weapon) =>
            baseAutoPickSet.has(weapon.s1)
          ).length;
          const effectiveAutoWeaponCount = useEffectiveMetrics
            ? schemeWeaponsActive.filter(
                (weapon) =>
                  baseAutoPickSet.has(weapon.s1) &&
                  !(
                    isEssenceOwnedForRecommendation(weapon.name) &&
                    isWeaponOwnedForRecommendation(weapon.name)
                  )
              ).length
            : autoWeaponCount;
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
            isWeaponOwned: isWeaponOwnedForRecommendation(weapon.name),
            isUnowned: !isWeaponOwnedForRecommendation(weapon.name),
            isEssenceOwned: isEssenceOwnedForRecommendation(weapon.name),
            isEssenceOwnedReal: state.isEssenceOwned(weapon.name),
            isExcluded: isEssenceOwnedForRecommendation(weapon.name),
            note: state.getWeaponNote(weapon.name),
            baseLocked: baseLockedSet.has(weapon.s1),
            baseConflict: baseOverflow && manualPickReady && !activeBaseSet.has(weapon.s1),
            baseDim:
              (baseOverflow && manualPickReady && !activeBaseSet.has(weapon.s1)) ||
              isEssenceOwnedForRecommendation(weapon.name),
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
            effectiveWeaponCount: effectiveAutoWeaponCount,
            maxWeaponCount: schemeWeaponsVisible.length,
            selectedMatchCount: autoCoveredSelected.length,
            effectiveSelectedMatchCount: effectiveAutoCoveredSelected.length,
            ownedPendingMatchCount: autoCoveredOwnedSelected.length,
            effectiveOwnedPendingMatchCount: effectiveAutoCoveredOwnedSelected.length,
            unownedPendingMatchCount: Math.max(
              0,
              autoCoveredSelected.length - autoCoveredOwnedSelected.length
            ),
            effectiveUnownedPendingMatchCount: Math.max(
              0,
              effectiveAutoCoveredSelected.length - effectiveAutoCoveredOwnedSelected.length
            ),
            selectedMissingCount: autoMissingSelected.length,
            selectedMatchNames: autoCoveredSelected.map((weapon) => weapon.name),
            effectiveSelectedMatchNames: effectiveAutoCoveredSelected.map((weapon) => weapon.name),
            selectedMissingNames: autoMissingSelected.map((weapon) => weapon.name),
            targetCount: targets.length,
            targetNames: targets.map((weapon) => weapon.name),
            conflictSelected: incompatibleSelected,
            conflictSelectedNames: incompatibleSelected.map((weapon) => weapon.name),
            displayWeaponCount,
            displaySelectedMatchCount: coveredSelected.length,
            displayOwnedPendingMatchCount: coveredOwnedSelected.length,
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

    const recommendationDataIssue = computed(() => {
      const recommendationContext = resolveRecommendationContext();
      if (!recommendationContext.selectedWeapons.length || !recommendationContext.targets.length) {
        return null;
      }
      const attrIssues = getSelectedWeaponAttrIssues();
      if (attrIssues.length) {
        const previewWeaponNames = attrIssues
          .filter((item) => item && item.isPreview)
          .map((item) => item.name)
          .filter(Boolean);
        const dataIntegrityWeaponNames = attrIssues
          .filter((item) => item && !item.isPreview)
          .map((item) => item.name)
          .filter(Boolean);
        if (dataIntegrityWeaponNames.length) {
          return {
            kind: "dataIntegrityMissingAttr",
            weaponNames: dataIntegrityWeaponNames,
          };
        }
        if (previewWeaponNames.length) {
          return {
            kind: "previewMissingAttr",
            weaponNames: previewWeaponNames,
          };
        }
        return {
          kind: "missingAttr",
          weaponNames: attrIssues.map((item) => item.name).filter(Boolean),
        };
      }
      if (!recommendations.value.length) {
        return {
          kind: "inconsistentData",
          weaponNames: recommendationContext.targets.map((weapon) => weapon.name).filter(Boolean),
        };
      }
      return null;
    });

    const recommendationEmptyReason = computed(() => {
      const recommendationContext = resolveRecommendationContext();
      if (!recommendationContext.selectedWeapons.length) return "";
      if (!recommendationContext.targets.length) return "filteredOut";
      if (recommendationDataIssue.value) return "noScheme";
      return "";
    });

    const coverageSummary = computed(() => {
      const schemes = recommendations.value;
      if (!schemes.length) return null;
      const best = schemes[0];
      const bestMatchCount = getSelectedMatchCountForSort(best);
      const totalSelected =
        Number.isFinite(best.targetCount) && best.targetCount > 0 ? best.targetCount : 0;
      if (!totalSelected) return null;
      return {
        totalSelected,
        bestMatchCount,
        missingNames: best.selectedMissingNames || [],
        hasGap: bestMatchCount < totalSelected,
      };
    });

    const primaryRecommendations = computed(() => {
      const schemes = recommendations.value;
      if (!schemes.length) return [];

      const top = schemes[0];
      const targetNames = Array.isArray(top.targetNames) ? top.targetNames : [];
      if (!targetNames.length) return [];
      const bestMatch = getSelectedMatchCountForSort(top);
      const bestWeaponCount = getWeaponCountForSort(top);
      const bestSchemes = schemes.filter(
        (scheme) =>
          getSelectedMatchCountForSort(scheme) === bestMatch &&
          getWeaponCountForSort(scheme) === bestWeaponCount
      );

      const remaining = new Set(targetNames);
      const picked = [];
      const pickedKeys = new Set();
      const pickScheme = (scheme) => {
        picked.push(scheme);
        pickedKeys.add(scheme.schemeKey);
        const names = Array.isArray(scheme.effectiveSelectedMatchNames)
          ? scheme.effectiveSelectedMatchNames
          : scheme.selectedMatchNames;
        if (Array.isArray(names)) {
          names.forEach((name) => {
            remaining.delete(name);
          });
        }
      };

      let seed = null;
      let seedCover = -1;
      bestSchemes.forEach((scheme) => {
        const names = Array.isArray(scheme.effectiveSelectedMatchNames)
          ? scheme.effectiveSelectedMatchNames
          : scheme.selectedMatchNames;
        const cover = Array.isArray(names) ? names.length : 0;
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
          const names = Array.isArray(scheme.effectiveSelectedMatchNames)
            ? scheme.effectiveSelectedMatchNames
            : scheme.selectedMatchNames;
          const cover = Array.isArray(names)
            ? names.filter((name) => remaining.has(name)).length
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
    state.recommendationDataIssue = recommendationDataIssue;
    state.recommendationEmptyReason = recommendationEmptyReason;
    state.coverageSummary = coverageSummary;
    state.primaryRecommendations = primaryRecommendations;
    state.extraRecommendations = extraRecommendations;
    state.visibleRecommendations = visibleRecommendations;
  };
})();
