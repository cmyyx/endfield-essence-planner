(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initWeapons = function initWeapons(ctx, state) {
    const { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } = ctx;

    const weaponMap = new Map(weapons.map((weapon) => [weapon.name, weapon]));

    const uniqueSorted = (items, sorter) => {
      const values = Array.from(new Set(items.filter(Boolean)));
      if (sorter) {
        values.sort(sorter);
      }
      return values;
    };

    const getWeaponMark = (name) => getWeaponMarkFromMap(name, state.weaponMarks.value);
    const normalizeMarkForStore = (mark) => compactWeaponMark(mark);

    const setWeaponMark = (name, patch) => {
      if (!name) return;
      const current = getWeaponMark(name);
      const next = { ...current, ...patch };
      const normalized = normalizeMarkForStore(next);
      const updated = { ...(state.weaponMarks.value || {}) };
      if (!normalized) {
        delete updated[name];
      } else {
        updated[name] = normalized;
      }
      state.weaponMarks.value = updated;
    };

    const isWeaponOwned = (name) => Boolean(getWeaponMark(name).weaponOwned);
    const isEssenceOwned = (name) => Boolean(getWeaponMark(name).essenceOwned);
    const isExcluded = isEssenceOwned;
    const isUnowned = (name) => !isWeaponOwned(name);
    const getWeaponNote = (name) => getWeaponMark(name).note || "";

    const weaponOwnedNameSet = computed(() => {
      const names = Object.keys(state.weaponMarks.value || {});
      const values = names.filter((name) => isWeaponOwned(name));
      return new Set(values);
    });

    const markedButUnownedNameSet = computed(() => {
      const names = Object.keys(state.weaponMarks.value || {});
      const values = names.filter((name) => !isWeaponOwned(name));
      return new Set(values);
    });

    const essenceOwnedNameSet = computed(() => {
      const names = Object.keys(state.weaponMarks.value || {});
      const values = names.filter((name) => isEssenceOwned(name));
      return new Set(values);
    });

    const defaultTrackEvent = (name, data) => {
      if (typeof window === "undefined") return;
      if (window.umami && typeof window.umami.track === "function") {
        window.umami.track(name, data);
      }
    };
    const trackEvent = typeof state.trackEvent === "function" ? state.trackEvent : defaultTrackEvent;

    const setWeaponOwned = (weapon, owned) => {
      if (!weapon || !weapon.name) return;
      const nextOwned = Boolean(owned);
      setWeaponMark(weapon.name, { weaponOwned: nextOwned });
      trackEvent(nextOwned ? "weapon_mark_owned" : "weapon_mark_unowned", { weapon: weapon.name });
    };

    const toggleWeaponOwned = (weapon) => {
      if (!weapon || !weapon.name) return;
      const current = getWeaponMark(weapon.name);
      setWeaponOwned(weapon, !current.weaponOwned);
    };

    const setEssenceOwned = (weapon, owned) => {
      if (!weapon || !weapon.name) return;
      const nextOwned = Boolean(owned);
      setWeaponMark(weapon.name, { essenceOwned: nextOwned });
      trackEvent(nextOwned ? "weapon_mark_essence_owned" : "weapon_mark_essence_pending", {
        weapon: weapon.name,
      });
    };

    const toggleEssenceOwned = (weapon) => {
      if (!weapon || !weapon.name) return;
      const current = getWeaponMark(weapon.name);
      setEssenceOwned(weapon, !current.essenceOwned);
    };

    const toggleExclude = toggleEssenceOwned;

    const updateWeaponNote = (weapon, value) => {
      if (!weapon || !weapon.name) return;
      setWeaponMark(weapon.name, { note: value || "" });
    };

    const readAttrHintSeen = () => {
      try {
        return localStorage.getItem(state.attrHintStorageKey) === "seen";
      } catch (error) {
        return false;
      }
    };

    const markAttrHintSeen = () => {
      try {
        localStorage.setItem(state.attrHintStorageKey, "seen");
      } catch (error) {
        // ignore storage errors
      }
    };

    const dismissAttrHint = () => {
      if (!state.showAttrHint.value) return;
      state.showAttrHint.value = false;
      markAttrHintSeen();
    };

    if (!readAttrHintSeen() && !state.showWeaponAttrs.value) {
      state.showAttrHint.value = true;
    }

    const hasAttributeFilterSelection = () =>
      Boolean(state.filterS1.value.length || state.filterS2.value.length || state.filterS3.value.length);

    const getSelectorHiddenFlags = (weapon, config) => {
      const weaponOwned = isWeaponOwned(weapon.name);
      const essenceOwned = isEssenceOwned(weapon.name);
      const hiddenByUnowned =
        Boolean(config.hideUnownedWeapons && config.hideUnownedWeaponsInSelector) &&
        !weaponOwned;
      const hiddenByEssenceOwned =
        Boolean(config.hideEssenceOwnedWeapons && config.hideEssenceOwnedWeaponsInSelector) &&
        essenceOwned &&
        (!config.hideEssenceOwnedOwnedOnly || weaponOwned);
      const hiddenByFourStar =
        Boolean(config.hideFourStarWeapons && config.hideFourStarWeaponsInSelector) &&
        weapon.rarity === 4;
      return {
        hiddenByUnowned,
        hiddenByEssenceOwned,
        hiddenByFourStar,
        hidden: hiddenByUnowned || hiddenByEssenceOwned || hiddenByFourStar,
      };
    };

    const shouldHideInSelector = (weapon, config) => {
      const flags = getSelectorHiddenFlags(weapon, config);
      if (!flags.hidden) return false;
      if (config.attributeFilterAffectsHiddenWeapons) return true;
      return !hasAttributeFilterSelection();
    };

    const getSelectorHiddenReason = (weapon) => {
      if (!weapon) return "";
      const config = state.recommendationConfig.value || {};
      const flags = getSelectorHiddenFlags(weapon, config);
      if (!shouldHideInSelector(weapon, config)) return "";
      const t = typeof state.t === "function" ? state.t : (value) => value;
      const reasons = [];
      if (flags.hiddenByUnowned) reasons.push(t("未拥有"));
      if (flags.hiddenByEssenceOwned) reasons.push(t("基质已有"));
      if (flags.hiddenByFourStar) reasons.push(t("四星"));
      if (!reasons.length) return "";
      return t("已隐藏：{reasons}", { reasons: reasons.join(" / ") });
    };

    const matchesSearchQuery = (weapon, query, searchIndex) => {
      if (!query) return true;
      return (searchIndex.get(weapon.name) || "").includes(query);
    };

    const matchesCrossGroupFilters = (weapon, group) => {
      if (group !== "s1" && state.filterS1.value.length && !state.filterS1.value.includes(weapon.s1)) {
        return false;
      }
      if (group !== "s2" && state.filterS2.value.length && !state.filterS2.value.includes(weapon.s2)) {
        return false;
      }
      if (group !== "s3" && state.filterS3.value.length && !state.filterS3.value.includes(weapon.s3)) {
        return false;
      }
      return true;
    };

    const buildFilterOptionEntry = (group, value, query, searchIndex, config) => {
      const list = Array.isArray(state.baseSortedWeapons) && state.baseSortedWeapons.length
        ? state.baseSortedWeapons
        : weapons;
      const affectsHidden = Boolean(config.attributeFilterAffectsHiddenWeapons);
      let fullCount = 0;
      let effectiveCount = 0;
      for (let i = 0; i < list.length; i += 1) {
        const weapon = list[i];
        if (!matchesSearchQuery(weapon, query, searchIndex)) continue;
        if (!matchesCrossGroupFilters(weapon, group)) continue;
        if (weapon[group] !== value) continue;
        fullCount += 1;
        if (!getSelectorHiddenFlags(weapon, config).hidden) {
          effectiveCount += 1;
        }
      }
      const isEmpty = fullCount === 0;
      const count = affectsHidden ? effectiveCount : fullCount;
      const affectsNotOwned = Boolean(config.hideUnownedWeapons && config.hideUnownedWeaponsInSelector);
      const affectsEssenceOwned = Boolean(
        config.hideEssenceOwnedWeapons && config.hideEssenceOwnedWeaponsInSelector
      );
      const affectsFourStar = Boolean(config.hideFourStarWeapons && config.hideFourStarWeaponsInSelector);
      const isOnlyFourStarHidden =
        affectsHidden &&
        !isEmpty &&
        effectiveCount === 0 &&
        affectsFourStar &&
        !affectsNotOwned &&
        !affectsEssenceOwned;
      return {
        value,
        count,
        fullCount,
        effectiveCount,
        isEmpty,
        isOnlyFourStarHidden,
        isDisabled: count === 0,
      };
    };

    const s1Options = computed(() => {
      const query = normalizeText(state.searchQuery.value);
      const searchIndex = state.weaponSearchIndex.value;
      const config = state.recommendationConfig.value || {};
      const values = uniqueSorted(weapons.map((weapon) => weapon.s1), (a, b) => {
        return getS1OrderIndex(a) - getS1OrderIndex(b);
      });
      return values.map((value) =>
        buildFilterOptionEntry("s1", value, query, searchIndex, config)
      );
    });

    const s2Options = computed(() => {
      const query = normalizeText(state.searchQuery.value);
      const searchIndex = state.weaponSearchIndex.value;
      const config = state.recommendationConfig.value || {};
      const values = uniqueSorted(weapons.map((weapon) => weapon.s2), (a, b) => {
        return a.localeCompare(b, "zh-Hans-CN");
      });
      return values.map((value) =>
        buildFilterOptionEntry("s2", value, query, searchIndex, config)
      );
    });

    const s3OptionEntries = computed(() => {
      const query = normalizeText(state.searchQuery.value);
      const searchIndex = state.weaponSearchIndex.value;
      const config = state.recommendationConfig.value || {};
      const weaponValues = weapons.map((weapon) => weapon.s3).filter(Boolean);
      const dungeonValues = dungeons.reduce((acc, dungeon) => {
        if (Array.isArray(dungeon.s3_pool)) {
          acc.push(...dungeon.s3_pool);
        }
        return acc;
      }, []);
      const values = uniqueSorted(
        [...weaponValues, ...dungeonValues],
        (a, b) => a.localeCompare(b, "zh-Hans-CN")
      );
      return values.map((value) =>
        buildFilterOptionEntry("s3", value, query, searchIndex, config)
      );
    });

    const selectedWeaponRows = computed(() =>
      state.selectedNames.value
        .map((name) => weaponMap.get(name))
        .filter(Boolean)
        .map((weapon) => ({
          ...weapon,
          isWeaponOwned: isWeaponOwned(weapon.name),
          isUnowned: isUnowned(weapon.name),
          isEssenceOwned: isEssenceOwned(weapon.name),
          isExcluded: isEssenceOwned(weapon.name),
          note: getWeaponNote(weapon.name),
        }))
    );

    const isEssenceOwnedForPlanning = (name) => isEssenceOwned(name);
    const isWeaponOwnedForRecommendation = (name) => isWeaponOwned(name);
    const isEssenceOwnedForRecommendation = (name) => isEssenceOwnedForPlanning(name);

    const pendingSelectedWeapons = computed(() =>
      selectedWeaponRows.value.filter((weapon) => !isEssenceOwnedForPlanning(weapon.name))
    );

    const selectedWeapons = computed(() => selectedWeaponRows.value);
    const selectedCount = computed(() => state.selectedNames.value.length);
    const pendingCount = computed(() => pendingSelectedWeapons.value.length);
    const selectedNameSet = computed(() => new Set(state.selectedNames.value));

    const toggleWeapon = (weapon, source = "grid") => {
      if (!weapon || !weapon.name) return;
      const index = state.selectedNames.value.indexOf(weapon.name);
      const action = index === -1 ? "select" : "deselect";
      if (index === -1) {
        state.selectedNames.value.push(weapon.name);
      } else {
        state.selectedNames.value.splice(index, 1);
      }

      trackEvent("weapon_click", {
        weapon: weapon.name,
        action,
        source,
      });
    };

    const toggleShowWeaponAttrs = () => {
      state.showWeaponAttrs.value = !state.showWeaponAttrs.value;
      if (state.showWeaponAttrs.value) {
        dismissAttrHint();
      }
    };

    const toggleFilterPanel = () => {
      state.showFilterPanel.value = !state.showFilterPanel.value;
      if (state.filterPanelManuallySet && state.filterPanelManuallySet.value !== true) {
        state.filterPanelManuallySet.value = true;
      }
    };

    const clearSelection = () => {
      state.selectedNames.value = [];
      state.schemeBaseSelections.value = {};
    };

    const toggleFilterValue = (group, value) => {
      const target = group === "s1" ? state.filterS1 : group === "s2" ? state.filterS2 : state.filterS3;
      const index = target.value.indexOf(value);
      if (index === -1) {
        target.value.push(value);
      } else {
        target.value.splice(index, 1);
      }
    };

    const clearAttributeFilters = () => {
      state.filterS1.value = [];
      state.filterS2.value = [];
      state.filterS3.value = [];
    };

    const hasAttributeFilters = computed(
      () => state.filterS1.value.length || state.filterS2.value.length || state.filterS3.value.length
    );

    const filteredWeapons = computed(() => {
      const query = normalizeText(state.searchQuery.value);
      const searchIndex = state.weaponSearchIndex.value;
      const config = state.recommendationConfig.value || {};
      return state.baseSortedWeapons.filter((weapon) => {
        const matchQuery = !query || (searchIndex.get(weapon.name) || "").includes(query);
        if (!matchQuery) return false;
        if (state.filterS1.value.length && !state.filterS1.value.includes(weapon.s1)) return false;
        if (state.filterS2.value.length && !state.filterS2.value.includes(weapon.s2)) return false;
        if (state.filterS3.value.length && !state.filterS3.value.includes(weapon.s3)) return false;
        if (shouldHideInSelector(weapon, config)) return false;
        return true;
      });
    });

    const hiddenInSelectorSummary = computed(() => {
      const query = normalizeText(state.searchQuery.value);
      const searchIndex = state.weaponSearchIndex.value;
      const config = state.recommendationConfig.value || {};
      const list = Array.isArray(state.baseSortedWeapons) && state.baseSortedWeapons.length
        ? state.baseSortedWeapons
        : weapons;
      let total = 0;
      let unowned = 0;
      let essenceOwned = 0;
      let fourStar = 0;
      list.forEach((weapon) => {
        if (!matchesSearchQuery(weapon, query, searchIndex)) return;
        if (state.filterS1.value.length && !state.filterS1.value.includes(weapon.s1)) return;
        if (state.filterS2.value.length && !state.filterS2.value.includes(weapon.s2)) return;
        if (state.filterS3.value.length && !state.filterS3.value.includes(weapon.s3)) return;
        const flags = getSelectorHiddenFlags(weapon, config);
        const isHidden = shouldHideInSelector(weapon, config);
        if (!isHidden) return;
        total += 1;
        if (flags.hiddenByUnowned) unowned += 1;
        if (flags.hiddenByEssenceOwned) essenceOwned += 1;
        if (flags.hiddenByFourStar) fourStar += 1;
      });
      return { total, unowned, essenceOwned, fourStar };
    });

    const weaponGridVirtual = ref({
      startIndex: 0,
      endIndex: Number.POSITIVE_INFINITY,
      columns: 1,
      rowHeight: 160,
      gap: 8,
      overscanRows: 2,
    });

    const updateWeaponGridWindow = () => {
      const list = filteredWeapons.value;
      if (!list.length) {
        weaponGridVirtual.value = {
          ...weaponGridVirtual.value,
          startIndex: 0,
          endIndex: 0,
        };
        state.weaponGridTopSpacer.value = 0;
        state.weaponGridBottomSpacer.value = 0;
        return;
      }

      if (state.currentView.value !== "planner" || typeof window === "undefined") {
        weaponGridVirtual.value = {
          ...weaponGridVirtual.value,
          startIndex: 0,
          endIndex: list.length,
        };
        state.weaponGridTopSpacer.value = 0;
        state.weaponGridBottomSpacer.value = 0;
        return;
      }

      const showingAttrs = Boolean(state.showWeaponAttrs.value);
      if (showingAttrs) {
        weaponGridVirtual.value = {
          ...weaponGridVirtual.value,
          startIndex: 0,
          endIndex: list.length,
          columns: 1,
        };
        state.weaponGridTopSpacer.value = 0;
        state.weaponGridBottomSpacer.value = 0;
        return;
      }
      const containerSelector = ".weapon-list";
      const itemSelector = ".weapon-item";
      const grid = document.querySelector(containerSelector);
      if (!grid) {
        weaponGridVirtual.value = {
          ...weaponGridVirtual.value,
          startIndex: 0,
          endIndex: list.length,
        };
        state.weaponGridTopSpacer.value = 0;
        state.weaponGridBottomSpacer.value = 0;
        return;
      }

      const anchor = grid;
      const styles = window.getComputedStyle(grid);
      const gap = parseFloat(styles.rowGap || styles.gap || "8") || 8;
      const sampleCard = grid.querySelector(itemSelector);
      const fallbackHeight = 148;
      const sampleHeight = sampleCard ? sampleCard.getBoundingClientRect().height : fallbackHeight;
      const rowHeight = Math.max(1, sampleHeight + gap);

      const tracks = (styles.gridTemplateColumns || "").split(" ").filter(Boolean);
      const columns = Math.max(1, tracks.length || 1);
      const totalRows = Math.ceil(list.length / columns);

      const viewportHeight =
        window.innerHeight ||
        (document.documentElement && document.documentElement.clientHeight) ||
        0;
      const scrollTop = window.scrollY || window.pageYOffset || 0;
      const gridTop = anchor.getBoundingClientRect().top + scrollTop;
      const viewTop = Math.max(0, scrollTop - gridTop);

      const overscanRows = weaponGridVirtual.value.overscanRows;
      const startRow = Math.max(0, Math.floor(viewTop / rowHeight) - overscanRows);
      const visibleRows = Math.max(1, Math.ceil(viewportHeight / rowHeight) + overscanRows * 2 + 1);
      const endRow = Math.min(totalRows, startRow + visibleRows);

      const startIndex = Math.min(list.length, startRow * columns);
      const endIndex = Math.min(list.length, endRow * columns);
      const topSpacer = startRow * rowHeight;
      const bottomSpacer = Math.max(0, (totalRows - endRow) * rowHeight);

      weaponGridVirtual.value = {
        ...weaponGridVirtual.value,
        startIndex,
        endIndex,
        columns,
        rowHeight,
        gap,
      };
      state.weaponGridTopSpacer.value = topSpacer;
      state.weaponGridBottomSpacer.value = bottomSpacer;
    };

    const scheduleWeaponGridWindow =
      typeof state.createUiScheduler === "function"
        ? state.createUiScheduler(updateWeaponGridWindow)
        : () => {
            if (typeof window === "undefined") return;
            const run = () => updateWeaponGridWindow();
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

    const visibleFilteredWeapons = computed(() => {
      const rows = filteredWeapons.value;
      const start = Math.max(0, weaponGridVirtual.value.startIndex || 0);
      const end = Math.max(start, weaponGridVirtual.value.endIndex || rows.length);
      return rows.slice(start, end);
    });

    const allFilteredSelected = computed(() => {
      const rows = filteredWeapons.value;
      if (!rows.length) return false;
      const selected = selectedNameSet.value;
      return rows.every((weapon) => selected.has(weapon.name));
    });

    const selectAllWeapons = () => {
      const rows = filteredWeapons.value;
      if (!rows.length) return;
      const next = new Set(state.selectedNames.value);
      rows.forEach((weapon) => next.add(weapon.name));
      state.selectedNames.value = Array.from(next);
      trackEvent("weapon_select_all", { count: rows.length });
    };

    watch(
      [filteredWeapons, state.showWeaponAttrs, () => state.currentView.value],
      scheduleWeaponGridWindow,
      { immediate: true }
    );
    onMounted(() => {
      if (typeof window === "undefined") return;
      window.addEventListener("scroll", scheduleWeaponGridWindow, { passive: true });
      window.addEventListener("resize", scheduleWeaponGridWindow);
      scheduleWeaponGridWindow();
    });

    onBeforeUnmount(() => {
      if (typeof window === "undefined") return;
      window.removeEventListener("scroll", scheduleWeaponGridWindow);
      window.removeEventListener("resize", scheduleWeaponGridWindow);
    });

    state.s1Options = s1Options;
    state.s2Options = s2Options;
    state.s3OptionEntries = s3OptionEntries;
    state.weaponOwnedNameSet = weaponOwnedNameSet;
    state.markedButUnownedNameSet = markedButUnownedNameSet;
    state.essenceOwnedNameSet = essenceOwnedNameSet;
    state.getWeaponMark = getWeaponMark;
    state.getWeaponNote = getWeaponNote;
    state.isWeaponOwned = isWeaponOwned;
    state.isUnowned = isUnowned;
    state.isEssenceOwned = isEssenceOwned;
    state.isWeaponOwnedForRecommendation = isWeaponOwnedForRecommendation;
    state.isEssenceOwnedForRecommendation = isEssenceOwnedForRecommendation;
    state.isExcluded = isExcluded;
    state.setWeaponOwned = setWeaponOwned;
    state.setEssenceOwned = setEssenceOwned;
    state.toggleWeaponOwned = toggleWeaponOwned;
    state.toggleEssenceOwned = toggleEssenceOwned;
    state.toggleExclude = toggleExclude;
    state.updateWeaponNote = updateWeaponNote;
    state.selectedWeaponRows = selectedWeaponRows;
    state.pendingSelectedWeapons = pendingSelectedWeapons;
    state.selectedWeapons = selectedWeapons;
    state.selectedCount = selectedCount;
    state.pendingCount = pendingCount;
    state.selectedNameSet = selectedNameSet;
    state.isEssenceOwnedForPlanning = isEssenceOwnedForPlanning;
    state.toggleWeapon = toggleWeapon;
    state.toggleShowWeaponAttrs = toggleShowWeaponAttrs;
    state.toggleFilterPanel = toggleFilterPanel;
    state.clearSelection = clearSelection;
    state.toggleFilterValue = toggleFilterValue;
    state.clearAttributeFilters = clearAttributeFilters;
    state.hasAttributeFilters = hasAttributeFilters;
    state.filteredWeapons = filteredWeapons;
    state.visibleFilteredWeapons = visibleFilteredWeapons;
    state.hiddenInSelectorSummary = hiddenInSelectorSummary;
    state.getSelectorHiddenReason = getSelectorHiddenReason;
    state.allFilteredSelected = allFilteredSelected;
    state.selectAllWeapons = selectAllWeapons;
    state.trackEvent = trackEvent;
    state.dismissAttrHint = dismissAttrHint;
  };
})();
