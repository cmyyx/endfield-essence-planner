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

    const s1Options = computed(() =>
      uniqueSorted(weapons.map((weapon) => weapon.s1), (a, b) => {
        return getS1OrderIndex(a) - getS1OrderIndex(b);
      })
    );
    const s2Options = computed(() =>
      uniqueSorted(weapons.map((weapon) => weapon.s2), (a, b) => {
        return a.localeCompare(b, "zh-Hans-CN");
      })
    );
    const s3OptionEntries = computed(() => {
      const weaponValues = weapons.map((weapon) => weapon.s3).filter(Boolean);
      const weaponCounts = countBy(weaponValues);
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
      return values.map((value) => ({
        value,
        count: weaponCounts[value] || 0,
        isEmpty: !weaponCounts[value],
      }));
    });

    const excludedNameSet = computed(() => {
      const names = Object.keys(state.weaponMarks.value || {});
      const excluded = names.filter(
        (name) => state.weaponMarks.value[name] && state.weaponMarks.value[name].excluded
      );
      return new Set(excluded);
    });

    const getWeaponMark = (name) =>
      state.weaponMarks.value && state.weaponMarks.value[name]
        ? state.weaponMarks.value[name]
        : { excluded: false, note: "" };

    const isExcluded = (name) => Boolean(getWeaponMark(name).excluded);

    const getWeaponNote = (name) => getWeaponMark(name).note || "";

    const defaultTrackEvent = (name, data) => {
      if (typeof window === "undefined") return;
      if (window.umami && typeof window.umami.track === "function") {
        window.umami.track(name, data);
      }
    };
    const trackEvent = typeof state.trackEvent === "function" ? state.trackEvent : defaultTrackEvent;

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

    const toggleExclude = (weapon) => {
      if (!weapon || !weapon.name) return;
      const current = getWeaponMark(weapon.name);
      const nextExcluded = !current.excluded;
      const next = { ...current, excluded: nextExcluded };
      const updated = { ...state.weaponMarks.value };
      if (!next.excluded && !next.note) {
        delete updated[weapon.name];
      } else {
        updated[weapon.name] = next;
      }
      state.weaponMarks.value = updated;

      if (nextExcluded) {
        trackEvent("weapon_exclude", { weapon: weapon.name });
      } else {
        trackEvent("weapon_unexclude", { weapon: weapon.name });
      }
    };

    const updateWeaponNote = (weapon, value) => {
      if (!weapon || !weapon.name) return;
      const current = getWeaponMark(weapon.name);
      const next = { ...current, note: value || "" };
      const updated = { ...state.weaponMarks.value };
      if (!next.excluded && !next.note) {
        delete updated[weapon.name];
      } else {
        updated[weapon.name] = next;
      }
      state.weaponMarks.value = updated;
    };

    const selectedWeaponRows = computed(() =>
      state.selectedNames.value
        .map((name) => weaponMap.get(name))
        .filter(Boolean)
        .map((weapon) => ({
          ...weapon,
          isExcluded: isExcluded(weapon.name),
          note: getWeaponNote(weapon.name),
        }))
    );

    const selectedWeapons = computed(() => {
      const rows = selectedWeaponRows.value;
      const active = rows.filter((weapon) => !weapon.isExcluded);
      if (!active.length && rows.length === 1) return rows;
      return active;
    });

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
        if (config.hideFourStarWeapons && weapon.rarity === 4) return false;
        if (state.filterS1.value.length && !state.filterS1.value.includes(weapon.s1)) return false;
        if (state.filterS2.value.length && !state.filterS2.value.includes(weapon.s2)) return false;
        if (state.filterS3.value.length && !state.filterS3.value.includes(weapon.s3)) return false;
        return true;
      });
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
      const containerSelector = showingAttrs ? ".weapon-attr-list" : ".weapon-list";
      const itemSelector = showingAttrs ? ".weapon-attr-item" : ".weapon-item";
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

      const anchor = showingAttrs ? grid.querySelector(".weapon-attr-anchor") || grid : grid;
      const styles = window.getComputedStyle(grid);
      const gap = parseFloat(styles.rowGap || styles.gap || "8") || 8;
      const sampleCard = grid.querySelector(itemSelector);
      const fallbackHeight = showingAttrs ? 86 : 148;
      const sampleHeight = sampleCard ? sampleCard.getBoundingClientRect().height : fallbackHeight;
      const rowHeight = Math.max(1, sampleHeight + gap);

      let columns = 1;
      if (!showingAttrs) {
        const tracks = (styles.gridTemplateColumns || "").split(" ").filter(Boolean);
        columns = Math.max(1, tracks.length || 1);
      }
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
    state.excludedNameSet = excludedNameSet;
    state.getWeaponNote = getWeaponNote;
    state.isExcluded = isExcluded;
    state.toggleExclude = toggleExclude;
    state.updateWeaponNote = updateWeaponNote;
    state.selectedWeaponRows = selectedWeaponRows;
    state.selectedWeapons = selectedWeapons;
    state.selectedNameSet = selectedNameSet;
    state.toggleWeapon = toggleWeapon;
    state.toggleShowWeaponAttrs = toggleShowWeaponAttrs;
    state.clearSelection = clearSelection;
    state.toggleFilterValue = toggleFilterValue;
    state.clearAttributeFilters = clearAttributeFilters;
    state.hasAttributeFilters = hasAttributeFilters;
    state.filteredWeapons = filteredWeapons;
    state.visibleFilteredWeapons = visibleFilteredWeapons;
    state.allFilteredSelected = allFilteredSelected;
    state.selectAllWeapons = selectAllWeapons;
    state.trackEvent = trackEvent;
    state.dismissAttrHint = dismissAttrHint;
  };
})();
