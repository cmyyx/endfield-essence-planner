(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initSearch = function initSearch(ctx, state) {
    const { ref, watch } = ctx;
    const hasSearchPinyinApi = () =>
      typeof window !== "undefined" &&
      window.pinyinPro &&
      typeof window.pinyinPro.pinyin === "function";

    const baseSortedWeapons = weapons.slice().sort((a, b) => {
      if (b.rarity !== a.rarity) return b.rarity - a.rarity;
      return compareText(a.name, b.name);
    });
    const weaponCharacterMap = new Map();
    const weaponImageSrcCache = new Map();
    const characterImageSrcCache = new Map();
    const weaponSearchIndex = ref(new Map());

    baseSortedWeapons.forEach((weapon) => {
      const chars = Array.isArray(weapon.chars) ? weapon.chars.filter(Boolean) : [];
      const uniqueChars = Array.from(new Set(chars));
      weaponCharacterMap.set(weapon.name, uniqueChars);
      weaponImageSrcCache.set(weapon.name, encodeURI(`./image/${weapon.name}.png`));
      uniqueChars.forEach((name) => {
        if (!characterImageSrcCache.has(name)) {
          characterImageSrcCache.set(name, encodeURI(`./image/characters/${name}.png`));
        }
      });
    });

    const buildWeaponSearchIndex = () => {
      const index = new Map();
      baseSortedWeapons.forEach((weapon) => {
        const characters = weaponCharacterMap.get(weapon.name) || [];
        const searchEntry = buildSearchEntry([
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
          ...characters.map((name) => ({ value: name, typo: false })),
          ...characters.map((name) => ({ value: state.tTerm("character", name), typo: false })),
        ]);
        index.set(weapon.name, searchEntry);
      });
      weaponSearchIndex.value = index;
    };

    let searchIndexBuiltWithPinyin = false;
    const rebuildWeaponSearchIndex = () => {
      buildWeaponSearchIndex();
      searchIndexBuiltWithPinyin = hasSearchPinyinApi();
    };

    rebuildWeaponSearchIndex();
    watch(state.locale, rebuildWeaponSearchIndex);
    if (!searchIndexBuiltWithPinyin && typeof window !== "undefined") {
      const pollIntervalMs = 800;
      const maxPollAttempts = 300;
      let pollAttempts = 0;
      const pollTimer = setInterval(() => {
        if (hasSearchPinyinApi()) {
          clearInterval(pollTimer);
          rebuildWeaponSearchIndex();
          return;
        }
        pollAttempts += 1;
        if (pollAttempts >= maxPollAttempts) {
          clearInterval(pollTimer);
        }
      }, pollIntervalMs);
    }

    state.baseSortedWeapons = baseSortedWeapons;
    state.weaponCharacterMap = weaponCharacterMap;
    state.weaponImageSrcCache = weaponImageSrcCache;
    state.characterImageSrcCache = characterImageSrcCache;
    state.weaponSearchIndex = weaponSearchIndex;
  };
})();
