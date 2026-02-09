(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initWeapons = function initWeapons(ctx, state) {
    const { computed } = ctx;

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
      return state.baseSortedWeapons.filter((weapon) => {
        const matchQuery = !query || (searchIndex.get(weapon.name) || "").includes(query);
        if (!matchQuery) return false;
        if (state.filterS1.value.length && !state.filterS1.value.includes(weapon.s1)) return false;
        if (state.filterS2.value.length && !state.filterS2.value.includes(weapon.s2)) return false;
        if (state.filterS3.value.length && !state.filterS3.value.includes(weapon.s3)) return false;
        return true;
      });
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
    state.allFilteredSelected = allFilteredSelected;
    state.selectAllWeapons = selectAllWeapons;
    state.trackEvent = trackEvent;
    state.dismissAttrHint = dismissAttrHint;
  };
})();
