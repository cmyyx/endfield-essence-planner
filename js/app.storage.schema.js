(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.createStorageSchemaApi = function createStorageSchemaApi(state) {
    const sanitizeArray = (value) => (Array.isArray(value) ? value : []);
    const catalog = Array.isArray(weapons) ? weapons : [];
    const validCatalog = catalog.filter(
      (weapon) => weapon && typeof weapon === "object" && typeof weapon.name === "string"
    );
    const weaponByName = new Map(
      validCatalog.map((weapon) => [weapon.name, weapon])
    );
    const weaponNameSet = new Set(validCatalog.map((weapon) => weapon.name));
    const s1Set = new Set(validCatalog.map((weapon) => weapon.s1).filter(Boolean));
    const dungeonsCatalog = Array.isArray(dungeons) ? dungeons : [];
    const s2Set = new Set(validCatalog.map((weapon) => weapon.s2).filter(Boolean));
    const s3Set = new Set(validCatalog.map((weapon) => weapon.s3).filter(Boolean));
    dungeonsCatalog.forEach((dungeon) => {
      const s2Pool = Array.isArray(dungeon && dungeon.s2_pool) ? dungeon.s2_pool : [];
      const s3Pool = Array.isArray(dungeon && dungeon.s3_pool) ? dungeon.s3_pool : [];
      s2Pool.filter(Boolean).forEach((value) => {
        s2Set.add(value);
      });
      s3Pool.filter(Boolean).forEach((value) => {
        s3Set.add(value);
      });
    });
    const mobilePanels = new Set(["weapons", "plans"]);
    const priorityModes = new Set(["ignore", "strict", "sameCoverage", "sameEfficiency"]);
    const strictPriorityOrders = new Set(["ownershipFirst", "regionFirst"]);
    const themeModes = new Set(["auto", "light", "dark"]);
    const regionSet = new Set(
      dungeonsCatalog
        .map((dungeon) => getDungeonRegion(dungeon && dungeon.name))
        .filter((name) => typeof name === "string" && name)
    );

    const normalizeRecommendationConfig = (raw, legacyHideExcluded) => {
      const defaults = state.recommendationConfig.value || {};
      const source = raw && typeof raw === "object" ? raw : {};

      const hideEssenceOwnedWeaponsInPlans =
        typeof source.hideEssenceOwnedWeaponsInPlans === "boolean"
          ? source.hideEssenceOwnedWeaponsInPlans
          : Boolean(defaults.hideEssenceOwnedWeaponsInPlans);

      const hideEssenceOwnedWeaponsInSelector =
        typeof source.hideEssenceOwnedWeaponsInSelector === "boolean"
          ? source.hideEssenceOwnedWeaponsInSelector
          : Boolean(defaults.hideEssenceOwnedWeaponsInSelector);

      const hideEssenceOwnedEnabled =
        hideEssenceOwnedWeaponsInPlans || hideEssenceOwnedWeaponsInSelector;

      const hideEssenceOwnedOwnedOnly =
        hideEssenceOwnedEnabled && typeof source.hideEssenceOwnedOwnedOnly === "boolean"
          ? source.hideEssenceOwnedOwnedOnly
          : hideEssenceOwnedEnabled && Boolean(defaults.hideEssenceOwnedOwnedOnly);

      const hideUnownedWeaponsInPlans =
        typeof source.hideUnownedWeaponsInPlans === "boolean"
          ? source.hideUnownedWeaponsInPlans
          : Boolean(defaults.hideUnownedWeaponsInPlans);

      const hideUnownedWeaponsInSelector =
        typeof source.hideUnownedWeaponsInSelector === "boolean"
          ? source.hideUnownedWeaponsInSelector
          : Boolean(defaults.hideUnownedWeaponsInSelector);

      const hideFourStarWeaponsInPlans =
        typeof source.hideFourStarWeaponsInPlans === "boolean"
          ? source.hideFourStarWeaponsInPlans
          : Boolean(defaults.hideFourStarWeaponsInPlans);

      const hideFourStarWeaponsInSelector =
        typeof source.hideFourStarWeaponsInSelector === "boolean"
          ? source.hideFourStarWeaponsInSelector
          : Boolean(defaults.hideFourStarWeaponsInSelector);

      const attributeFilterAffectsHiddenWeapons =
        typeof source.attributeFilterAffectsHiddenWeapons === "boolean"
          ? source.attributeFilterAffectsHiddenWeapons
          : Boolean(defaults.attributeFilterAffectsHiddenWeapons);

      const regionPriorityMode = priorityModes.has(source.regionPriorityMode)
        ? source.regionPriorityMode
        : priorityModes.has(source.priorityMode)
          ? source.priorityMode
          : defaults.regionPriorityMode || "ignore";

      const ownershipPriorityMode = priorityModes.has(source.ownershipPriorityMode)
        ? source.ownershipPriorityMode
        : defaults.ownershipPriorityMode || "ignore";

      const strictPriorityOrder = strictPriorityOrders.has(source.strictPriorityOrder)
        ? source.strictPriorityOrder
        : defaults.strictPriorityOrder || "ownershipFirst";

      const normalized = {
        hideEssenceOwnedWeaponsInPlans,
        hideEssenceOwnedOwnedOnly,
        hideEssenceOwnedWeaponsInSelector,
        hideUnownedWeaponsInPlans,
        hideUnownedWeaponsInSelector,
        hideFourStarWeaponsInPlans,
        hideFourStarWeaponsInSelector,
        attributeFilterAffectsHiddenWeapons,
        preferredRegion1: "",
        preferredRegion2: "",
        regionPriorityMode,
        ownershipPriorityMode,
        strictPriorityOrder,
      };

      if (typeof source.preferredRegion1 === "string" && regionSet.has(source.preferredRegion1)) {
        normalized.preferredRegion1 = source.preferredRegion1;
      }
      if (typeof source.preferredRegion2 === "string" && regionSet.has(source.preferredRegion2)) {
        normalized.preferredRegion2 = source.preferredRegion2;
      }
      if (
        normalized.preferredRegion1 &&
        normalized.preferredRegion2 &&
        normalized.preferredRegion1 === normalized.preferredRegion2
      ) {
        normalized.preferredRegion2 = "";
      }

      if (!normalized.hideEssenceOwnedWeaponsInPlans && !normalized.hideEssenceOwnedWeaponsInSelector) {
        normalized.hideEssenceOwnedOwnedOnly = false;
      }

      return normalized;
    };

    const normalizeWeaponMarks = (raw) => normalizeWeaponMarksMap(raw, weaponNameSet);

    const inspectWeaponMarksSchemaIssues = (raw) => {
      const issues = [];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        issues.push("顶层结构不是对象");
        return issues;
      }
      const allowedKeys = new Set(["weaponOwned", "essenceOwned", "excluded", "note"]);
      Object.keys(raw).forEach((name) => {
        if (!name || !weaponNameSet.has(name)) return;
        const entry = raw[name];
        if (entry == null) return;
        if (typeof entry === "string") return;
        if (typeof entry !== "object" || Array.isArray(entry)) {
          issues.push(`${name}: 数据结构不是对象或字符串`);
          return;
        }
        Object.keys(entry).forEach((key) => {
          if (!allowedKeys.has(key)) {
            issues.push(`${name}: 存在未知字段 ${key}`);
          }
        });
        if (Object.prototype.hasOwnProperty.call(entry, "weaponOwned") && typeof entry.weaponOwned !== "boolean") {
          issues.push(`${name}: weaponOwned 不是布尔值`);
        }
        if (Object.prototype.hasOwnProperty.call(entry, "essenceOwned") && typeof entry.essenceOwned !== "boolean") {
          issues.push(`${name}: essenceOwned 不是布尔值`);
        }
        if (Object.prototype.hasOwnProperty.call(entry, "excluded") && typeof entry.excluded !== "boolean") {
          issues.push(`${name}: excluded 不是布尔值`);
        }
        if (Object.prototype.hasOwnProperty.call(entry, "note") && typeof entry.note !== "string") {
          issues.push(`${name}: note 不是字符串`);
        }
      });
      return issues;
    };

    const escapeJsonString = (value) => {
      const text = String(value == null ? "" : value);
      const serialized = JSON.stringify(text);
      return typeof serialized === "string" ? serialized.slice(1, -1) : "";
    };

    const serializeWeaponMarksNormalized = (normalizedMap) => {
      const source = normalizedMap && typeof normalizedMap === "object" ? normalizedMap : {};
      const names = Object.keys(source);
      if (!names.length) return "{}";
      const items = [];
      names.forEach((name) => {
        if (!name) return;
        const entry = source[name];
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
        const fields = [];
        if (entry.weaponOwned === true) fields.push('"weaponOwned":true');
        if (entry.essenceOwned === true) fields.push('"essenceOwned":true');
        if (typeof entry.note === "string" && entry.note) {
          fields.push(`"note":"${escapeJsonString(entry.note)}"`);
        }
        if (!fields.length) return;
        items.push(`"${escapeJsonString(name)}":{${fields.join(",")}}`);
      });
      return `{${items.join(",")}}`;
    };

    const sanitizeState = (raw) => {
      if (!raw || typeof raw !== "object") return null;
      const next = {};
      const isSafeObjectKey = (key) =>
        key !== "__proto__" && key !== "prototype" && key !== "constructor";

      if (typeof raw.searchQuery === "string") {
        next.searchQuery = raw.searchQuery;
      }

      if (Array.isArray(raw.selectedNames)) {
        const unique = Array.from(new Set(raw.selectedNames));
        next.selectedNames = unique.filter((name) => weaponNameSet.has(name));
      }

      if (raw.schemeBaseSelections && typeof raw.schemeBaseSelections === "object") {
        const cleaned = Object.create(null);
        Object.keys(raw.schemeBaseSelections).forEach((key) => {
          if (!key || !isSafeObjectKey(key)) return;
          const values = sanitizeArray(raw.schemeBaseSelections[key]).filter((value) => s1Set.has(value));
          if (values.length) {
            cleaned[key] = Array.from(new Set(values));
          }
        });
        next.schemeBaseSelections = cleaned;
      }

      if (raw.weaponAttrOverrides && typeof raw.weaponAttrOverrides === "object") {
        const cleaned = {};
        Object.keys(raw.weaponAttrOverrides).forEach((name) => {
          if (!name || !weaponNameSet.has(name)) return;
          const weapon = weaponByName.get(name);
          if (!weapon || !weapon.isPreview) return;
          const entry = raw.weaponAttrOverrides[name];
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
          const normalized = {};
          const rawS1 = typeof weapon.s1 === "string" ? weapon.s1.trim() : "";
          const rawS2 = typeof weapon.s2 === "string" ? weapon.s2.trim() : "";
          const rawS3 = typeof weapon.s3 === "string" ? weapon.s3.trim() : "";
          if (!rawS1 && typeof entry.s1 === "string" && s1Set.has(entry.s1)) normalized.s1 = entry.s1;
          if (!rawS2 && typeof entry.s2 === "string" && s2Set.has(entry.s2)) normalized.s2 = entry.s2;
          if (!rawS3 && typeof entry.s3 === "string" && s3Set.has(entry.s3)) normalized.s3 = entry.s3;
          if (Object.keys(normalized).length) cleaned[name] = normalized;
        });
        next.weaponAttrOverrides = cleaned;
      }

      if (typeof raw.showWeaponAttrs === "boolean") {
        next.showWeaponAttrs = raw.showWeaponAttrs;
      }
      if (typeof raw.showWeaponOwnership === "boolean") {
        next.showWeaponOwnership = raw.showWeaponOwnership;
      }
      if (typeof raw.filterPanelManuallySet === "boolean") {
        next.filterPanelManuallySet = raw.filterPanelManuallySet;
      }
      if (next.filterPanelManuallySet && typeof raw.showFilterPanel === "boolean") {
        next.showFilterPanel = raw.showFilterPanel;
      }
      if (typeof raw.showAllSchemes === "boolean") {
        next.showAllSchemes = raw.showAllSchemes;
      }
      if (typeof raw.backgroundDisplayEnabled === "boolean") {
        next.backgroundDisplayEnabled = raw.backgroundDisplayEnabled;
      }

      next.recommendationConfig = normalizeRecommendationConfig(
        raw.recommendationConfig,
        raw.hideExcludedInPlans
      );

      if (mobilePanels.has(raw.mobilePanel)) {
        next.mobilePanel = raw.mobilePanel;
      }

      const s1Filter = Array.from(new Set(sanitizeArray(raw.filterS1).filter((value) => s1Set.has(value))));
      const s2Filter = Array.from(new Set(sanitizeArray(raw.filterS2).filter((value) => s2Set.has(value))));
      const s3Filter = Array.from(new Set(sanitizeArray(raw.filterS3).filter((value) => s3Set.has(value))));
      if (s1Filter.length) next.filterS1 = s1Filter;
      if (s2Filter.length) next.filterS2 = s2Filter;
      if (s3Filter.length) next.filterS3 = s3Filter;

      return next;
    };

    const getUrlSelectedWeaponNames = () => {
      if (typeof window === "undefined") return [];
      try {
        const params = new URLSearchParams(window.location.search || "");
        if (!params.has("weapons") && !params.has("weapon")) return [];
        const names = [];
        const packed = params.get("weapons");
        if (packed) {
          names.push(...packed.split(","));
        }
        const repeated = params.getAll("weapon");
        if (repeated.length) {
          names.push(...repeated);
        }
        if (!names.length) return [];
        const unique = Array.from(new Set(names.map((name) => String(name || "").trim()).filter(Boolean)));
        return unique.filter((name) => weaponNameSet.has(name));
      } catch (error) {
        return [];
      }
    };

    const isThemeMode = (value) => themeModes.has(value);

    const shouldCollapseFilterPanelByDefault = () => {
      if (typeof window === "undefined") return false;
      return state.isPortrait.value || window.innerWidth <= 640;
    };

    return {
      normalizeRecommendationConfig,
      normalizeWeaponMarks,
      inspectWeaponMarksSchemaIssues,
      serializeWeaponMarksNormalized,
      sanitizeState,
      getUrlSelectedWeaponNames,
      isThemeMode,
      shouldCollapseFilterPanelByDefault,
    };
  };
})();
