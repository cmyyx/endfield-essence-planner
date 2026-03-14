(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initMedia = function initMedia(ctx, state) {
    const formatMediaPath = (path) => {
      if (!path) return "";
      if (/^(https?:)?\/\//.test(path)) return encodeURI(path);
      if (path.startsWith("./") || path.startsWith("../")) return encodeURI(path);
      return encodeURI(`./${path.replace(/^\/+/, "")}`);
    };
    const weaponImageMap =
      window.WEAPON_IMAGES && typeof window.WEAPON_IMAGES === "object"
        ? window.WEAPON_IMAGES
        : {};
    const hasImage = (weapon) => Boolean(weapon && (weapon.image || weaponImageMap[weapon.name]));
    const weaponImageSrc = (weapon) => {
      if (!weapon) return "";
      if (weapon.image) return weapon.image;
      const cached = state.weaponImageSrcCache.get(weapon.name);
      if (cached) return cached;
      const internalName = weaponImageMap[weapon.name];
      if (!internalName) return "";
      const src = encodeURI(`./image/weapon/${internalName}.avif`);
      state.weaponImageSrcCache.set(weapon.name, src);
      return src;
    };
    const weaponCharacters = (weapon) => {
      if (!weapon) return [];
      const cached = state.weaponCharacterMap.get(weapon.name);
      if (cached) return cached;
      const chars = Array.isArray(weapon.chars) ? weapon.chars.filter(Boolean) : [];
      const uniqueChars = Array.from(new Set(chars));
      state.weaponCharacterMap.set(weapon.name, uniqueChars);
      uniqueChars.forEach((name) => {
        if (!state.characterImageSrcCache.has(name)) {
          state.characterImageSrcCache.set(name, encodeURI(`./image/characters/${name}.avif`));
        }
      });
      return uniqueChars;
    };
    const characterImageSrc = (name) => {
      if (!name) return "";
      const cached = state.characterImageSrcCache.get(name);
      if (cached) return cached;
      const src = encodeURI(`./image/characters/${name}.avif`);
      state.characterImageSrcCache.set(name, src);
      return src;
    };
    const characterCardSrc = (character) => {
      if (!character) return "";
      if (character.card) return formatMediaPath(character.card);
      const name = character.name || character.id;
      if (!name) return "";
      return encodeURI(`./image/characters/${name}_card.avif`);
    };
    const handleCharacterImageError = (event) => {
      const target = event && event.target;
      if (target) target.style.display = "none";
    };
    const handleCharacterCardError = (event) => {
      const target = event && event.target;
      if (target) target.style.display = "none";
    };

    const rarityBadgeStyle = (rarity, withImage = false) => ({
      backgroundColor: withImage
        ? "rgba(255,255,255,0.04)"
        : rarity === 6
          ? "#ff7000"
          : rarity === 5
            ? "#ffba03"
            : rarity === 4
              ? "#9b6bff"
              : "#9aa5b1",
      color: withImage ? "transparent" : "#0c1118",
    });

    const rarityTextStyle = (rarity) => ({
      color:
        rarity === 6
          ? "#ff7000"
          : rarity === 5
            ? "#ffba03"
            : rarity === 4
              ? "#9b6bff"
              : "inherit",
    });

    state.hasImage = hasImage;
    state.weaponImageSrc = weaponImageSrc;
    state.weaponCharacters = weaponCharacters;
    state.characterImageSrc = characterImageSrc;
    state.characterCardSrc = characterCardSrc;
    state.handleCharacterImageError = handleCharacterImageError;
    state.handleCharacterCardError = handleCharacterCardError;
    state.rarityBadgeStyle = rarityBadgeStyle;
    state.rarityTextStyle = rarityTextStyle;
  };
})();
