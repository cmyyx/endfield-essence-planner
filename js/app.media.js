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
    const equipImageMap =
      window.EQUIP_IMAGES && typeof window.EQUIP_IMAGES === "object"
        ? window.EQUIP_IMAGES
        : {};
    const resolveWeaponImageOverride = (weapon) => {
      if (!weapon) return "";
      const override = weapon.image || weapon.icon;
      if (!override) return "";
      return formatMediaPath(override);
    };
    const hasImage = (weapon) =>
      Boolean(
        weapon &&
          (weapon.image ||
            weapon.icon ||
            (weapon.name && weaponImageMap[weapon.name]))
      );
    const weaponImageSrc = (weapon) => {
      if (!weapon) return "";
      const override = resolveWeaponImageOverride(weapon);
      if (override) return override;
      const cached = state.weaponImageSrcCache.get(weapon.name);
      if (cached) return cached;
      const internalName = weaponImageMap[weapon.name];
      if (!internalName) return "";
      const src = encodeURI(`./image/weapon/${internalName}.avif`);
      state.weaponImageSrcCache.set(weapon.name, src);
      return src;
    };
    const resolveEquipImageOverride = (equip) => {
      if (!equip) return "";
      const override = equip.image || equip.icon;
      if (!override) return "";
      return formatMediaPath(override);
    };
    const hasEquipImage = (equip) =>
      Boolean(
        equip &&
          (equip.image || equip.icon || (equip.name && equipImageMap[equip.name]))
      );
    const equipImageSrc = (equip) => {
      if (!equip) return "";
      const override = resolveEquipImageOverride(equip);
      if (override) return override;
      const internalName = equipImageMap[equip.name];
      if (!internalName) return "";
      return encodeURI(`./image/equip/${internalName}.avif`);
    };
    const normalizeItemName = (value) => {
      if (!value) return "";
      const raw = String(value).trim();
      if (!raw) return "";
      const match = raw.match(
        /^(.*?)(?:\s*[xX×]\s*\d+(?:\.\d+)?\s*(?:k|K|w|W|千|万)?\s*)?$/
      );
      return match ? match[1].trim() : raw;
    };
    const resolveItemLabel = (item) => {
      if (!item) return "";
      if (typeof item === "string") return item;
      return item.label || item.name || item.id || "";
    };
    const resolvePotentialName = (entry) => {
      if (!entry) return "";
      if (typeof entry === "string") return entry;
      return entry.name || entry.title || entry.label || "";
    };
    const resolvePotentialDescription = (entry) => {
      if (!entry || typeof entry === "string") return "";
      return entry.description || entry.desc || entry.detail || "";
    };
    const resolveItemImageName = (item) => {
      if (!item) return "";
      if (typeof item === "string") return normalizeItemName(item);
      if (item.name) return normalizeItemName(item.name);
      if (item.label) return normalizeItemName(item.label);
      if (item.id) return normalizeItemName(item.id);
      return "";
    };
    const resolveItemImageOverride = (item) => {
      if (!item || typeof item === "string") return "";
      const override = item.image || item.icon;
      if (!override) return "";
      return formatMediaPath(override);
    };
    const hasItemImage = (item) => {
      const override = resolveItemImageOverride(item);
      if (override) return true;
      const name = resolveItemImageName(item);
      return Boolean(name);
    };
    const itemImageSrc = (item) => {
      const override = resolveItemImageOverride(item);
      if (override) return override;
      const name = resolveItemImageName(item);
      if (!name) return "";
      return encodeURI(`./image/item/${name}.avif`);
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
        ? "rgba(var(--color-white-rgb), 0.04)"
        : rarity === 6
          ? "rgba(255, 112, 0, 1)"
          : rarity === 5
            ? "rgba(var(--color-rarity-5-rgb), 1)"
            : rarity === 4
              ? "rgba(var(--color-rarity-4-rgb), 1)"
              : "rgba(var(--color-info-rgb), 1)",
      color: withImage ? "transparent" : "rgba(var(--color-black-rgb), 1)",
    });

    const rarityTextStyle = (rarity) => ({
      color:
        rarity === 6
          ? "rgba(255, 112, 0, 1)"
          : rarity === 5
            ? "rgba(var(--color-rarity-5-rgb), 1)"
            : rarity === 4
              ? "rgba(var(--color-rarity-4-rgb), 1)"
              : "inherit",
    });

    state.hasImage = hasImage;
    state.weaponImageSrc = weaponImageSrc;
    state.hasEquipImage = hasEquipImage;
    state.equipImageSrc = equipImageSrc;
    state.resolveItemLabel = resolveItemLabel;
    state.resolvePotentialName = resolvePotentialName;
    state.resolvePotentialDescription = resolvePotentialDescription;
    state.hasItemImage = hasItemImage;
    state.itemImageSrc = itemImageSrc;
    state.weaponCharacters = weaponCharacters;
    state.characterImageSrc = characterImageSrc;
    state.characterCardSrc = characterCardSrc;
    state.handleCharacterImageError = handleCharacterImageError;
    state.handleCharacterCardError = handleCharacterCardError;
    state.rarityBadgeStyle = rarityBadgeStyle;
    state.rarityTextStyle = rarityTextStyle;
  };
})();
