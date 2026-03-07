(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initWeapons = function initWeapons(ctx, state) {
    const { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } = ctx;
    const reportStorageIssue = (operation, key, error, meta) => {
      if (typeof state.reportStorageIssue === "function") {
        state.reportStorageIssue(operation, key, error, meta);
        return;
      }
      const queue = Array.isArray(state.pendingStorageIssues) ? state.pendingStorageIssues : [];
      queue.push({ operation, key, error, meta });
      state.pendingStorageIssues = queue.slice(-20);
    };

    const weaponMap = new Map(weapons.map((weapon) => [weapon.name, weapon]));
    const ATTR_KEYS = ["s1", "s2", "s3"];
    const WEAPON_DATA_INTEGRITY_WARNING_SCOPE = "weapons.catalog-validate";
    const WEAPON_DATA_INTEGRITY_WARNING_OPERATION = "weapons.catalog-validate";
    const WEAPON_DATA_INTEGRITY_WARNING_KEY = "weapon-attr-integrity";
    const hasOwn = (target, key) =>
      target && typeof target === "object" && Object.prototype.hasOwnProperty.call(target, key);
    const isStateRefLike = (candidate) =>
      candidate &&
      typeof candidate === "object" &&
      (candidate.__v_isRef === true || "value" in candidate);
    const ensureStateRef = (key, fallback) => {
      const candidate = state[key];
      if (isStateRefLike(candidate)) {
        return candidate;
      }
      const next = typeof ref === "function" ? ref(fallback) : { value: fallback };
      state[key] = next;
      return next;
    };
    const weaponAttrOverridesRef = ensureStateRef("weaponAttrOverrides", {});
    const showWeaponAttrDataModalRef = ensureStateRef("showWeaponAttrDataModal", false);

    const uniqueSorted = (items, sorter) => {
      const values = Array.from(new Set(items.filter(Boolean)));
      if (sorter) {
        values.sort(sorter);
      }
      return values;
    };

    const normalizeAttrValue = (value) => (typeof value === "string" ? value.trim() : "");
    const s1AllowedSet = new Set(weapons.map((weapon) => normalizeAttrValue(weapon.s1)).filter(Boolean));
    const s2AllowedSet = new Set(weapons.map((weapon) => normalizeAttrValue(weapon.s2)).filter(Boolean));
    const s3AllowedSet = new Set(weapons.map((weapon) => normalizeAttrValue(weapon.s3)).filter(Boolean));
    dungeons.forEach((dungeon) => {
      const s2Pool = Array.isArray(dungeon && dungeon.s2_pool) ? dungeon.s2_pool : [];
      const s3Pool = Array.isArray(dungeon && dungeon.s3_pool) ? dungeon.s3_pool : [];
      s2Pool.forEach((value) => {
        const normalized = normalizeAttrValue(value);
        if (normalized) s2AllowedSet.add(normalized);
      });
      s3Pool.forEach((value) => {
        const normalized = normalizeAttrValue(value);
        if (normalized) s3AllowedSet.add(normalized);
      });
    });

    const sanitizeWeaponAttrOverrides = (raw) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
      const cleaned = {};
      Object.keys(raw).forEach((weaponName) => {
        const rawWeapon = weaponMap.get(weaponName);
        if (!rawWeapon || !rawWeapon.isPreview) return;
        const entry = raw[weaponName];
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
        const normalized = {};
        const s1 = normalizeAttrValue(entry.s1);
        const s2 = normalizeAttrValue(entry.s2);
        const s3 = normalizeAttrValue(entry.s3);
        const rawS1 = normalizeAttrValue(rawWeapon.s1);
        const rawS2 = normalizeAttrValue(rawWeapon.s2);
        const rawS3 = normalizeAttrValue(rawWeapon.s3);
        if (!rawS1 && s1AllowedSet.has(s1)) normalized.s1 = s1;
        if (!rawS2 && s2AllowedSet.has(s2)) normalized.s2 = s2;
        if (!rawS3 && s3AllowedSet.has(s3)) normalized.s3 = s3;
        if (Object.keys(normalized).length) cleaned[weaponName] = normalized;
      });
      return cleaned;
    };

    const getWeaponRawMissingFields = (weapon) => {
      if (!weapon || typeof weapon !== "object") return ATTR_KEYS.slice();
      return ATTR_KEYS.filter((field) => !normalizeAttrValue(weapon[field]));
    };

    const resolveWeaponAttrs = (weapon) => {
      if (!weapon || typeof weapon !== "object") return null;
      const overrides = weaponAttrOverridesRef && weaponAttrOverridesRef.value
        ? weaponAttrOverridesRef.value
        : {};
      const overrideEntry =
        weapon.name && overrides && typeof overrides === "object" && overrides[weapon.name]
          ? overrides[weapon.name]
          : null;
      const rawMissingFields = getWeaponRawMissingFields(weapon);
      const resolved = { ...weapon };
      ATTR_KEYS.forEach((field) => {
        const rawValue = normalizeAttrValue(weapon[field]);
        const overrideValue = normalizeAttrValue(overrideEntry && overrideEntry[field]);
        const canUseOverride = Boolean(weapon.isPreview) && !rawValue;
        resolved[field] = canUseOverride ? overrideValue || rawValue || "" : rawValue || "";
      });
      const unresolvedFields = ATTR_KEYS.filter((field) => !normalizeAttrValue(resolved[field]));
      resolved.__rawMissingAttrFields = rawMissingFields;
      resolved.__missingAttrFields = unresolvedFields;
      resolved.__hasAttrIssue = unresolvedFields.length > 0;
      resolved.__isPreview = Boolean(weapon && weapon.isPreview);
      return resolved;
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

    weaponAttrOverridesRef.value = sanitizeWeaponAttrOverrides(weaponAttrOverridesRef.value);

    const setWeaponAttrOverride = (weaponName, field, nextValue) => {
      if (!weaponName || ATTR_KEYS.indexOf(field) === -1) return;
      const rawWeapon = weaponMap.get(weaponName);
      if (!rawWeapon) return;
      const rawValue = normalizeAttrValue(rawWeapon[field]);
      if (!rawWeapon.isPreview || rawValue) {
        clearWeaponAttrOverride(weaponName);
        return;
      }
      const sanitizedValue = normalizeAttrValue(nextValue);
      const allowedSet = field === "s1" ? s1AllowedSet : field === "s2" ? s2AllowedSet : s3AllowedSet;
      const validValue = allowedSet.has(sanitizedValue) ? sanitizedValue : "";
      const current = weaponAttrOverridesRef.value || {};
      const next = { ...current };
      const entry = { ...(next[weaponName] || {}) };
      if (!validValue || validValue === rawValue) {
        delete entry[field];
      } else {
        entry[field] = validValue;
      }
      if (!Object.keys(entry).length) {
        delete next[weaponName];
      } else {
        next[weaponName] = entry;
      }
      weaponAttrOverridesRef.value = sanitizeWeaponAttrOverrides(next);
    };

    const clearWeaponAttrOverride = (weaponName) => {
      if (!weaponName) return;
      const current = weaponAttrOverridesRef.value || {};
      if (!hasOwn(current, weaponName)) return;
      const next = { ...current };
      delete next[weaponName];
      weaponAttrOverridesRef.value = sanitizeWeaponAttrOverrides(next);
    };

    const openWeaponAttrDataModal = () => {
      showWeaponAttrDataModalRef.value = true;
    };
    const closeWeaponAttrDataModal = () => {
      showWeaponAttrDataModalRef.value = false;
    };

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

    const weaponAttrS1Options = uniqueSorted(
      weapons.map((weapon) => normalizeAttrValue(weapon.s1)),
      (a, b) => getS1OrderIndex(a) - getS1OrderIndex(b)
    );
    const weaponAttrS2Options = uniqueSorted(Array.from(s2AllowedSet), (a, b) =>
      a.localeCompare(b, "zh-Hans-CN")
    );
    const weaponAttrS3Options = uniqueSorted(Array.from(s3AllowedSet), (a, b) =>
      a.localeCompare(b, "zh-Hans-CN")
    );

    const catalogWeapons = computed(() =>
      weapons.map((weapon) => resolveWeaponAttrs(weapon)).filter(Boolean)
    );

    const catalogWeaponMap = computed(() => {
      const map = new Map();
      catalogWeapons.value.forEach((weapon) => {
        map.set(weapon.name, weapon);
      });
      return map;
    });

    const getCatalogWeaponByName = (name) =>
      catalogWeaponMap.value.get(name) || (name ? resolveWeaponAttrs(weaponMap.get(name)) : null);

    const weaponAttrIssueRows = computed(() =>
      catalogWeapons.value
        .filter((weapon) => Array.isArray(weapon.__rawMissingAttrFields) && weapon.__rawMissingAttrFields.length > 0)
        .map((weapon) => ({
          name: weapon.name,
          rarity: weapon.rarity,
          type: weapon.type,
          isPreview: Boolean(weapon.__isPreview),
          rawMissingFields: weapon.__rawMissingAttrFields.slice(),
          unresolvedFields: (weapon.__missingAttrFields || []).slice(),
          hasUnresolvedFields: Boolean(weapon.__hasAttrIssue),
          s1: weapon.s1,
          s2: weapon.s2,
          s3: weapon.s3,
        }))
    );

    const previewWeaponRows = computed(() =>
      weaponAttrIssueRows.value.filter((row) => Boolean(row && row.isPreview))
    );
    const dataIntegrityWeaponAttrRows = computed(() =>
      weaponAttrIssueRows.value.filter((row) => Boolean(row && !row.isPreview))
    );
    const hasPreviewWeapons = computed(() => previewWeaponRows.value.length > 0);
    const hasDataIntegrityWeaponAttrs = computed(() => dataIntegrityWeaponAttrRows.value.length > 0);

    const hasWeaponAttrIssues = computed(() =>
      weaponAttrIssueRows.value.some((row) => row.hasUnresolvedFields)
    );

    const getWeaponAttrIssueRow = (weaponName) =>
      previewWeaponRows.value.find((row) => row.name === weaponName) || null;

    const getWeaponAttrEditorValue = (weaponName, field) => {
      if (!weaponName || ATTR_KEYS.indexOf(field) === -1) return "";
      const weapon = getCatalogWeaponByName(weaponName);
      return normalizeAttrValue(weapon && weapon[field]);
    };

    const isWeaponRawAttrMissingField = (weaponName, field) => {
      if (!weaponName || ATTR_KEYS.indexOf(field) === -1) return false;
      const row = getWeaponAttrIssueRow(weaponName);
      if (!row) return false;
      return row.rawMissingFields.indexOf(field) !== -1;
    };

    const getSelectedWeaponAttrIssues = () =>
      selectedWeaponRows.value
        .filter((weapon) => weapon && weapon.__hasAttrIssue)
        .map((weapon) => ({
          name: weapon.name,
          isPreview: Boolean(weapon.__isPreview),
          missingFields: Array.isArray(weapon.__missingAttrFields)
            ? weapon.__missingAttrFields.slice()
            : [],
        }));

    const weaponAttrFieldLabel = (field) => {
      if (field === "s1") return "base";
      if (field === "s2") return "extra";
      if (field === "s3") return "skill";
      return String(field || "");
    };
    const buildWeaponDataIntegritySignature = (rows) =>
      rows
        .map((row) => `${row.name}:${(row.rawMissingFields || []).slice().sort().join(",")}`)
        .sort()
        .join("|");
    const buildWeaponDataIntegrityNote = (rows) =>
      rows
        .map((row) => {
          const missing = (row.rawMissingFields || []).map((field) => weaponAttrFieldLabel(field));
          return `${row.name} -> missing: ${missing.join("/") || "unknown"}`;
        })
        .join("\n");
    const buildRuntimeWarningPreviewFromEntry = (entry) => {
      if (!entry) return "";
      const lines = [
        `scope: ${entry.scope || "unknown"}`,
        `operation: ${entry.operation || "unknown"}`,
        `key: ${entry.key || "unknown"}`,
        `error: ${entry.errorName || "Error"}: ${entry.errorMessage || "unknown"}`,
      ];
      if (entry.note) {
        lines.push(`note: ${entry.note}`);
      }
      if (entry.errorStack) {
        lines.push("", "stack:", String(entry.errorStack));
      }
      return lines.join("\n");
    };
    let lastWeaponDataIntegritySignature = "";
    const reportWeaponDataIntegrityWarning = (rows, options) => {
      const normalizedRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
      if (!normalizedRows.length || typeof state.reportRuntimeWarning !== "function") return false;
      const signature = buildWeaponDataIntegritySignature(normalizedRows);
      const force = Boolean(options && options.force);
      if (!force && signature && signature === lastWeaponDataIntegritySignature) return false;
      const warningError = new Error(`weapon data integrity issue detected (${normalizedRows.length})`);
      warningError.name = "WeaponDataIntegrityError";
      state.reportRuntimeWarning(warningError, {
        scope: WEAPON_DATA_INTEGRITY_WARNING_SCOPE,
        operation: WEAPON_DATA_INTEGRITY_WARNING_OPERATION,
        key: WEAPON_DATA_INTEGRITY_WARNING_KEY,
        title: "武器数据异常",
        summary: "检测到武器数据缺失属性，相关推荐已停用，请查看异常详情。",
        note: buildWeaponDataIntegrityNote(normalizedRows),
        forceShow: true,
        asToast: false,
      });
      lastWeaponDataIntegritySignature = signature;
      return true;
    };
    const resolveLatestWeaponDataIntegrityWarning = () => {
      const matchesWarning = (entry) =>
        Boolean(entry) &&
        (String(entry.scope || "") === WEAPON_DATA_INTEGRITY_WARNING_SCOPE ||
          String(entry.operation || "") === WEAPON_DATA_INTEGRITY_WARNING_OPERATION);
      const current = state.runtimeWarningCurrent ? state.runtimeWarningCurrent.value : null;
      if (matchesWarning(current)) return current;
      const logs =
        state.runtimeWarningLogs && Array.isArray(state.runtimeWarningLogs.value)
          ? state.runtimeWarningLogs.value
          : [];
      return logs.find((entry) => matchesWarning(entry)) || null;
    };
    const openWeaponDataIntegrityDetails = () => {
      let target = resolveLatestWeaponDataIntegrityWarning();
      if (!target && hasDataIntegrityWeaponAttrs.value) {
        reportWeaponDataIntegrityWarning(dataIntegrityWeaponAttrRows.value, { force: true });
        target = resolveLatestWeaponDataIntegrityWarning();
      }
      if (target && typeof state.openUnifiedExceptionFromLog === "function") {
        state.openUnifiedExceptionFromLog({ ...target, __kind: "runtime" });
        return;
      }
      if (target && state.runtimeWarningCurrent) {
        state.runtimeWarningCurrent.value = target;
      }
      if (target && state.runtimeWarningPreviewText) {
        state.runtimeWarningPreviewText.value = buildRuntimeWarningPreviewFromEntry(target);
      }
      if (state.showStorageErrorModal) {
        state.showStorageErrorModal.value = false;
      }
      if (state.showRuntimeWarningModal) {
        state.showRuntimeWarningModal.value = true;
      }
    };
    reportWeaponDataIntegrityWarning(dataIntegrityWeaponAttrRows.value);

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
        reportStorageIssue("storage.read", state.attrHintStorageKey, error, {
          scope: "weapons.read-attr-hint",
        });
        return false;
      }
    };

    const markAttrHintSeen = () => {
      try {
        localStorage.setItem(state.attrHintStorageKey, "seen");
      } catch (error) {
        reportStorageIssue("storage.write", state.attrHintStorageKey, error, {
          scope: "weapons.write-attr-hint",
        });
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

    const translate = (key, params) => {
      if (typeof state.t === "function") {
        return state.t(key, params);
      }
      if (!params) return key;
      return key.replace(/\{(\w+)\}/g, (match, token) =>
        Object.prototype.hasOwnProperty.call(params, token) ? String(params[token]) : match
      );
    };

    const buildHiddenReasonKeys = (flags) => {
      const keys = [];
      if (flags.hiddenByUnowned) keys.push("unowned");
      if (flags.hiddenByEssenceOwned) keys.push("essenceOwned");
      if (flags.hiddenByFourStar) keys.push("fourStar");
      return keys;
    };

    const formatHiddenReasons = (reasonKeys) =>
      reasonKeys
        .map((key) => {
          if (key === "unowned") return translate("未拥有");
          if (key === "essenceOwned") return translate("基质已有");
          return translate("四星");
        })
        .join(" / ");

    const getSelectorHiddenFlags = (weapon, config) => {
      const weaponOwned = isWeaponOwned(weapon.name);
      const essenceOwned = isEssenceOwned(weapon.name);
      const hiddenByUnowned = Boolean(config.hideUnownedWeaponsInSelector) && !weaponOwned;
      const hiddenByEssenceOwned =
        Boolean(config.hideEssenceOwnedWeaponsInSelector) &&
        essenceOwned &&
        (!config.hideEssenceOwnedOwnedOnly || weaponOwned);
      const hiddenByFourStar = Boolean(config.hideFourStarWeaponsInSelector) && weapon.rarity === 4;
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
      if (!flags.hidden) return "";
      const reasonKeys = buildHiddenReasonKeys(flags);
      if (!reasonKeys.length) return "";
      const reasons = formatHiddenReasons(reasonKeys);
      if (shouldHideInSelector(weapon, config)) {
        return translate("隐藏（{reasons}）", { reasons });
      }
      if (!config.attributeFilterAffectsHiddenWeapons && hasAttributeFilterSelection()) {
        return translate("命中隐藏规则（{reasons}）", { reasons });
      }
      return "";
    };

    const matchesSearchQuery = (weapon, queryMeta, searchIndex) => {
      if (!queryMeta || !queryMeta.active) return true;
      const entry = getWeaponSearchEntry(weapon, searchIndex);
      if (!entry) return false;
      return scoreSearchEntry(entry, queryMeta) > 0;
    };

    const getWeaponSearchEntry = (weapon, searchIndex) => {
      if (!weapon || !weapon.name) return null;
      const hasAttrOverride = hasOwn(weaponAttrOverridesRef.value || {}, weapon.name);
      if (!hasAttrOverride && !weapon.__hasAttrIssue && searchIndex && searchIndex.has(weapon.name)) {
        return searchIndex.get(weapon.name);
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

    const getCatalogListInBaseOrder = () => {
      const list = Array.isArray(state.baseSortedWeapons) && state.baseSortedWeapons.length
        ? state.baseSortedWeapons
        : weapons;
      return list.map((weapon) => resolveWeaponAttrs(weapon)).filter(Boolean);
    };

    const buildFilterOptionEntry = (group, value, queryMeta, searchIndex, config) => {
      const list = getCatalogListInBaseOrder();
      const affectsHidden = Boolean(config.attributeFilterAffectsHiddenWeapons);
      let fullCount = 0;
      let effectiveCount = 0;
      const hiddenReasonSet = new Set();
      for (let i = 0; i < list.length; i += 1) {
        const weapon = list[i];
        if (!matchesSearchQuery(weapon, queryMeta, searchIndex)) continue;
        if (!matchesCrossGroupFilters(weapon, group)) continue;
        if (weapon[group] !== value) continue;
        fullCount += 1;
        const flags = getSelectorHiddenFlags(weapon, config);
        if (!flags.hidden) {
          effectiveCount += 1;
        } else if (affectsHidden) {
          buildHiddenReasonKeys(flags).forEach((key) => hiddenReasonSet.add(key));
        }
      }
      const isEmpty = fullCount === 0;
      const count = affectsHidden ? effectiveCount : fullCount;
      const hiddenReasonKeys =
        affectsHidden && !isEmpty && effectiveCount === 0
          ? ["unowned", "essenceOwned", "fourStar"].filter((key) => hiddenReasonSet.has(key))
          : [];
      const hiddenReasons = formatHiddenReasons(hiddenReasonKeys);
      const isHiddenOnly = affectsHidden && !isEmpty && effectiveCount === 0;
      const disabledHintLabel = isEmpty
        ? translate("nav.none")
        : isHiddenOnly
          ? translate("nav.hidden")
          : translate("nav.none");
      const disabledHintTitle = isEmpty
        ? translate("nav.no_weapons_under_current_filters")
        : hiddenReasons
          ? translate("nav.weapons_hidden_under_current_filters_reasons", { reasons: hiddenReasons })
          : translate("nav.weapons_hidden_under_current_filters");
      return {
        value,
        count,
        fullCount,
        effectiveCount,
        isEmpty,
        hiddenReasons,
        disabledHintLabel,
        disabledHintTitle,
        isDisabled: count === 0,
      };
    };

    const searchQueryMeta = computed(() => createSearchQueryMeta(state.searchQuery.value));

    const s1Options = computed(() => {
      const queryMeta = searchQueryMeta.value;
      const searchIndex = state.weaponSearchIndex.value;
      const config = state.recommendationConfig.value || {};
      const values = uniqueSorted(catalogWeapons.value.map((weapon) => weapon.s1), (a, b) => {
        return getS1OrderIndex(a) - getS1OrderIndex(b);
      });
      return values.map((value) =>
        buildFilterOptionEntry("s1", value, queryMeta, searchIndex, config)
      );
    });

    const s2Options = computed(() => {
      const queryMeta = searchQueryMeta.value;
      const searchIndex = state.weaponSearchIndex.value;
      const config = state.recommendationConfig.value || {};
      const values = uniqueSorted(catalogWeapons.value.map((weapon) => weapon.s2), (a, b) => {
        return a.localeCompare(b, "zh-Hans-CN");
      });
      return values.map((value) =>
        buildFilterOptionEntry("s2", value, queryMeta, searchIndex, config)
      );
    });

    const s3OptionEntries = computed(() => {
      const queryMeta = searchQueryMeta.value;
      const searchIndex = state.weaponSearchIndex.value;
      const config = state.recommendationConfig.value || {};
      const weaponValues = catalogWeapons.value.map((weapon) => weapon.s3).filter(Boolean);
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
        buildFilterOptionEntry("s3", value, queryMeta, searchIndex, config)
      );
    });

    const selectedWeaponRows = computed(() =>
      state.selectedNames.value
        .map((name) => getCatalogWeaponByName(name))
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

    const toggleShowWeaponOwnership = () => {
      state.showWeaponOwnership.value = !state.showWeaponOwnership.value;
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

    const getCurrentWeaponUpActiveMap = () => {
      if (typeof state.getWeaponUpWindowAt !== "function") return {};
      const activeByWeapon = state.getWeaponUpWindowAt(Date.now());
      if (!activeByWeapon || typeof activeByWeapon !== "object") return {};
      return activeByWeapon;
    };

    const partitionWeaponsByUpActive = (rows, activeByWeapon) => {
      const upActiveRows = [];
      const fallbackRows = [];
      rows.forEach((weapon) => {
        if (weapon && activeByWeapon[weapon.name]) {
          upActiveRows.push(weapon);
          return;
        }
        fallbackRows.push(weapon);
      });
      return upActiveRows.concat(fallbackRows);
    };

    const isWeaponUpActive = (name) => {
      if (!name) return false;
      const activeByWeapon = getCurrentWeaponUpActiveMap();
      return Boolean(activeByWeapon[name]);
    };

    const weaponUpBadgeMemoKey = computed(() => {
      const activeByWeapon = getCurrentWeaponUpActiveMap();
      return Object.keys(activeByWeapon).sort().join("|");
    });

    const filteredWeapons = computed(() => {
      const queryMeta = searchQueryMeta.value;
      const searchIndex = state.weaponSearchIndex.value;
      const config = state.recommendationConfig.value || {};
      const activeByWeapon = getCurrentWeaponUpActiveMap();
      const matched = [];
      const baseCatalog = getCatalogListInBaseOrder();
      baseCatalog.forEach((weapon, index) => {
        const entry = queryMeta.active ? getWeaponSearchEntry(weapon, searchIndex) : null;
        const matchScore = queryMeta.active ? scoreSearchEntry(entry, queryMeta) : 1;
        if (queryMeta.active && matchScore <= 0) return;
        if (state.filterS1.value.length && !state.filterS1.value.includes(weapon.s1)) return;
        if (state.filterS2.value.length && !state.filterS2.value.includes(weapon.s2)) return;
        if (state.filterS3.value.length && !state.filterS3.value.includes(weapon.s3)) return;
        if (shouldHideInSelector(weapon, config)) return;
        matched.push({ weapon, score: matchScore, index });
      });
      if (!queryMeta.active) {
        const orderedRows = matched.map((item) => item.weapon);
        return partitionWeaponsByUpActive(orderedRows, activeByWeapon);
      }
      matched.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.index - b.index;
      });
      const orderedRows = matched.map((item) => item.weapon);
      return partitionWeaponsByUpActive(orderedRows, activeByWeapon);
    });

    const hiddenInSelectorSummary = computed(() => {
      const queryMeta = searchQueryMeta.value;
      const searchIndex = state.weaponSearchIndex.value;
      const config = state.recommendationConfig.value || {};
      const list = getCatalogListInBaseOrder();
      let total = 0;
      let unowned = 0;
      let essenceOwned = 0;
      let fourStar = 0;
      list.forEach((weapon) => {
        if (!matchesSearchQuery(weapon, queryMeta, searchIndex)) return;
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

    const selectorHiddenMemoKey = computed(() => {
      const config = state.recommendationConfig.value || {};
      const hasFilters = hasAttributeFilterSelection();
      return [
        config.hideUnownedWeaponsInSelector ? 1 : 0,
        config.hideEssenceOwnedWeaponsInSelector ? 1 : 0,
        config.hideEssenceOwnedWeaponsInSelector && config.hideEssenceOwnedOwnedOnly ? 1 : 0,
        config.hideFourStarWeaponsInSelector ? 1 : 0,
        config.attributeFilterAffectsHiddenWeapons ? 1 : 0,
        hasFilters ? 1 : 0,
      ].join("|");
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
      weaponAttrOverridesRef,
      (value) => {
        const cleaned = sanitizeWeaponAttrOverrides(value);
        const same = JSON.stringify(cleaned) === JSON.stringify(value || {});
        if (!same) {
          weaponAttrOverridesRef.value = cleaned;
        }
      },
      { deep: true }
    );

    let previousSelectedNameSet = new Set(
      Array.isArray(state.selectedNames.value) ? state.selectedNames.value : []
    );
    watch(
      () => (Array.isArray(state.selectedNames.value) ? state.selectedNames.value.slice() : []),
      (selectedNames) => {
        const nextSet = new Set(selectedNames);
        const newlySelectedNames = selectedNames.filter((name) => !previousSelectedNameSet.has(name));
        previousSelectedNameSet = nextSet;
        if (!newlySelectedNames.length) return;
        const shouldAutoOpen = newlySelectedNames.some((name) => {
          const row = getWeaponAttrIssueRow(name);
          return Boolean(row && row.isPreview && row.hasUnresolvedFields);
        });
        if (!shouldAutoOpen) return;
        openWeaponAttrDataModal();
      }
    );

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
    state.weaponAttrS1Options = weaponAttrS1Options;
    state.weaponAttrS2Options = weaponAttrS2Options;
    state.weaponAttrS3Options = weaponAttrS3Options;
    state.getCatalogWeapons = () => catalogWeapons.value.slice();
    state.getCatalogWeaponByName = getCatalogWeaponByName;
    state.weaponAttrIssueRows = previewWeaponRows;
    state.previewWeaponRows = previewWeaponRows;
    state.dataIntegrityWeaponAttrRows = dataIntegrityWeaponAttrRows;
    state.hasPreviewWeapons = hasPreviewWeapons;
    state.hasDataIntegrityWeaponAttrs = hasDataIntegrityWeaponAttrs;
    state.hasWeaponAttrIssues = hasWeaponAttrIssues;
    state.getWeaponAttrIssueRow = getWeaponAttrIssueRow;
    state.getSelectedWeaponAttrIssues = getSelectedWeaponAttrIssues;
    state.openWeaponAttrDataModal = openWeaponAttrDataModal;
    state.openWeaponDataIntegrityDetails = openWeaponDataIntegrityDetails;
    state.closeWeaponAttrDataModal = closeWeaponAttrDataModal;
    state.setWeaponAttrOverride = setWeaponAttrOverride;
    state.clearWeaponAttrOverride = clearWeaponAttrOverride;
    state.getWeaponAttrEditorValue = getWeaponAttrEditorValue;
    state.isWeaponRawAttrMissingField = isWeaponRawAttrMissingField;
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
    state.isWeaponUpActive = isWeaponUpActive;
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
    state.toggleShowWeaponOwnership = toggleShowWeaponOwnership;
    state.toggleFilterPanel = toggleFilterPanel;
    state.clearSelection = clearSelection;
    state.toggleFilterValue = toggleFilterValue;
    state.clearAttributeFilters = clearAttributeFilters;
    state.hasAttributeFilters = hasAttributeFilters;
    state.filteredWeapons = filteredWeapons;
    state.visibleFilteredWeapons = visibleFilteredWeapons;
    state.hiddenInSelectorSummary = hiddenInSelectorSummary;
    state.selectorHiddenMemoKey = selectorHiddenMemoKey;
    state.weaponUpBadgeMemoKey = weaponUpBadgeMemoKey;
    state.getSelectorHiddenReason = getSelectorHiddenReason;
    state.allFilteredSelected = allFilteredSelected;
    state.selectAllWeapons = selectAllWeapons;
    state.trackEvent = trackEvent;
    state.dismissAttrHint = dismissAttrHint;
  };
})();
