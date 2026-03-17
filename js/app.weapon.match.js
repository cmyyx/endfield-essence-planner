(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initWeaponMatch = function initWeaponMatch(ctx, state) {
    const { ref, computed } = ctx;

    const matchQuery = ref("");
    const matchSourceName = ref("");

    const allWeapons = computed(() => {
      const base = Array.isArray(weapons) ? weapons.slice() : [];
      const custom = Array.isArray(state.customWeapons && state.customWeapons.value)
        ? state.customWeapons.value
        : [];
      return custom.concat(base).sort((a, b) => {
        if (b.rarity !== a.rarity) return b.rarity - a.rarity;
        return compareText(a.name, b.name);
      });
    });
    const sourceWeapons = computed(() => allWeapons.value);
    const sourceWeaponMap = computed(
      () => new Map(sourceWeapons.value.map((weapon) => [weapon.name, weapon]))
    );

    const getSearchEntry = (weapon) => {
      const index = state.weaponSearchIndex && state.weaponSearchIndex.value;
      if (index && index.has(weapon.name)) {
        return index.get(weapon.name);
      }
      return buildSearchEntry([
        { value: weapon.name, typo: true },
        { value: state.tTerm("weapon", weapon.name), typo: true },
        { value: weapon.short, typo: false },
        { value: state.tTerm("short", weapon.short), typo: false },
        { value: weapon.type, typo: false },
        { value: state.tTerm("type", weapon.type), typo: false },
        { value: weapon.s1, tier: "secondary" },
        { value: state.tTerm("s1", weapon.s1), tier: "secondary" },
        { value: weapon.s2, tier: "secondary" },
        { value: state.tTerm("s2", weapon.s2), tier: "secondary" },
        { value: weapon.s3, tier: "secondary" },
        { value: state.tTerm("s3", weapon.s3), tier: "secondary" },
      ]);
    };

    const matchSourceList = computed(() => {
      const queryMeta = createSearchQueryMeta(matchQuery.value);
      if (!queryMeta.active) return sourceWeapons.value;
      const matched = [];
      sourceWeapons.value.forEach((weapon, index) => {
        const score = scoreSearchEntry(getSearchEntry(weapon), queryMeta);
        if (score <= 0) return;
        matched.push({ weapon, score, index });
      });
      matched.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.index - b.index;
      });
      return matched.map((item) => item.weapon);
    });

    const matchSourceWeapon = computed(
      () => sourceWeaponMap.value.get(matchSourceName.value) || null
    );

    const matchResults = computed(() => {
      const source = matchSourceWeapon.value;
      if (!source) return [];
      return allWeapons.value.filter(
        (weapon) =>
          weapon.name !== source.name &&
          weapon.s1 === source.s1 &&
          weapon.s2 === source.s2 &&
          weapon.s3 === source.s3
      );
    });

    const selectMatchSource = (weapon) => {
      if (!weapon || !weapon.name) return;
      matchSourceName.value = weapon.name;
    };

    if (!matchSourceName.value && sourceWeapons.value.length) {
      matchSourceName.value = sourceWeapons.value[0].name;
    }

    state.matchQuery = matchQuery;
    state.matchSourceName = matchSourceName;
    state.matchSourceList = matchSourceList;
    state.matchSourceWeapon = matchSourceWeapon;
    state.matchResults = matchResults;
    state.selectMatchSource = selectMatchSource;
  };
})();
