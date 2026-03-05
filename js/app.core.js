      const dungeons = Array.isArray(window.DUNGEONS) ? window.DUNGEONS : [];
      const weapons = Array.isArray(window.WEAPONS) ? window.WEAPONS : [];
      const weaponUpSchedules =
        window.WEAPON_UP_SCHEDULES && typeof window.WEAPON_UP_SCHEDULES === "object"
          ? window.WEAPON_UP_SCHEDULES
          : {};
      const gears = Array.isArray(window.GEARS) ? window.GEARS : [];
      const weaponImages = new Set(Array.isArray(window.WEAPON_IMAGES) ? window.WEAPON_IMAGES : []);
      const i18nState = {
        locale: "zh-CN",
        t: (key, params) => {
          if (!params) return key;
          return String(key || "").replace(/\{(\w+)\}/g, (match, name) =>
            Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
          );
        },
        tTerm: (category, value) => value,
      };
      const finishPreload = () => {
        try {
          if (typeof window !== "undefined" && typeof window.__finishPreload === "function") {
            window.__finishPreload();
          }
        } catch (error) {
          // ignore
        }
      };

      const S1_ORDER = ["敏捷提升", "力量提升", "意志提升", "智识提升", "主能力提升"];

      const normalizeText = (value) => (value || "").toString().trim().toLowerCase();
      const PINYIN_SEARCH_OPTIONS = Object.freeze({
        toneType: "none",
        type: "string",
        separator: "",
      });
      const PINYIN_SEARCH_FIRST_OPTIONS = Object.freeze({
        toneType: "none",
        pattern: "first",
        type: "string",
        separator: "",
      });
      const getSearchPinyinApi = () => {
        if (
          typeof window === "undefined" ||
          !window.pinyinPro ||
          typeof window.pinyinPro.pinyin !== "function"
        ) {
          return null;
        }
        return window.pinyinPro;
      };
      const SEARCH_SCORE = Object.freeze({
        EXACT_TEXT: 120,
        COMPACT_MATCH: 115,
        LATIN_MATCH: 112,
        PINYIN_FULL: 110,
        PHONETIC_QUERY: 108,
        INITIAL_QUERY: 100,
        TYPO_FULL_BASE: 84,
        TYPO_FULL_DISTANCE_STEP: 12,
        TYPO_INITIAL_BASE: 74,
        TYPO_INITIAL_DISTANCE_STEP: 10,
      });

      const hasChineseChar = (value) => /[\u3400-\u9fff]/.test(String(value || ""));
      const normalizeSearchText = (value) => normalizeText(value).replace(/\s+/g, " ");
      const normalizeSearchCompact = (value) =>
        normalizeSearchText(value).replace(/[^a-z0-9\u3400-\u9fff]+/g, "");
      const normalizeSearchLatin = (value) =>
        normalizeSearchText(value)
          .normalize("NFD")
          .replace(/ü/g, "v")
          .replace(/u\u0308/g, "v")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "");
      const safeToPinyin = (value, options) => {
        if (!value || !hasChineseChar(value)) return "";
        const pinyinApi = getSearchPinyinApi();
        if (!pinyinApi) return "";
        try {
          const raw = pinyinApi.pinyin(value, options || PINYIN_SEARCH_OPTIONS);
          return normalizeSearchLatin(raw);
        } catch (error) {
          return "";
        }
      };
      const createSearchAlias = (value) => {
        const isObjectPart = value && typeof value === "object" && !Array.isArray(value);
        const rawValue = isObjectPart
          ? (value.value != null ? value.value : value.text != null ? value.text : "")
          : value;
        const tier =
          isObjectPart && value.tier === "secondary"
            ? "secondary"
            : "primary";
        const allowTypo =
          isObjectPart
            ? (typeof value.typo === "boolean" ? value.typo : tier === "primary")
            : tier === "primary";
        const original = String(rawValue ?? "").trim();
        if (!original) return null;
        const text = normalizeSearchText(original);
        if (!text) return null;
        const compact = normalizeSearchCompact(original);
        const latin = normalizeSearchLatin(original);
        const pinyinFull = safeToPinyin(original, PINYIN_SEARCH_OPTIONS);
        const pinyinInitial = safeToPinyin(original, PINYIN_SEARCH_FIRST_OPTIONS);
        return { original, text, compact, latin, pinyinFull, pinyinInitial, tier, allowTypo };
      };
      const buildSearchEntry = (parts) => {
        const source = Array.isArray(parts) ? parts : [parts];
        const aliases = [];
        const dedupIndex = new Map();
        source.forEach((part) => {
          const alias = createSearchAlias(part);
          if (!alias) return;
          const key = JSON.stringify([
            alias.text,
            alias.compact,
            alias.latin,
            alias.pinyinFull,
            alias.pinyinInitial,
          ]);
          if (dedupIndex.has(key)) {
            const index = dedupIndex.get(key);
            const existing = aliases[index];
            if (existing && existing.tier === "secondary" && alias.tier === "primary") {
              existing.tier = "primary";
            }
            if (existing && !existing.allowTypo && alias.allowTypo) {
              existing.allowTypo = true;
            }
            return;
          }
          dedupIndex.set(key, aliases.length);
          aliases.push(alias);
        });
        const searchText = aliases.map((alias) => alias.text).join(" ");
        const searchCompact = aliases.map((alias) => alias.compact).join("");
        const searchLatin = aliases.map((alias) => alias.latin).join("");
        const searchPinyinFull = aliases.map((alias) => alias.pinyinFull).join("");
        const searchPinyinInitial = aliases.map((alias) => alias.pinyinInitial).join("");
        return {
          aliases,
          searchText,
          searchCompact,
          searchLatin,
          searchPinyinFull,
          searchPinyinInitial,
        };
      };
      const createSearchQueryMeta = (query) => {
        const rawText = normalizeSearchText(query);
        const compact = normalizeSearchCompact(query);
        const latin = normalizeSearchLatin(query);
        const pinyinFull = safeToPinyin(query, PINYIN_SEARCH_OPTIONS);
        const pinyinInitial = safeToPinyin(query, PINYIN_SEARCH_FIRST_OPTIONS);
        const phoneticQueries = Array.from(new Set([latin, pinyinFull].filter(Boolean)));
        const initialQueries = Array.from(new Set([latin, pinyinInitial].filter(Boolean)));
        const phoneticQuery = phoneticQueries[0] || "";
        const initialQuery = initialQueries[0] || "";
        const maxPhoneticLength = phoneticQueries.reduce(
          (max, text) => Math.max(max, text.length),
          0
        );
        const isPureNumericQuery = Boolean(compact) && /^\d+$/.test(compact);
        const typoBudget =
          rawText && !isPureNumericQuery
            ? (maxPhoneticLength >= 5 ? 2 : 1)
            : 0;
        return {
          _isSearchQueryMeta: true,
          rawText,
          compact,
          latin,
          pinyinFull,
          pinyinInitial,
          phoneticQueries,
          initialQueries,
          phoneticQuery,
          initialQuery,
          maxPhoneticLength,
          typoBudget,
          active: Boolean(rawText),
        };
      };
      const getBoundedEditDistance = (a, b, maxDistance) => {
        const source = String(a || "");
        const target = String(b || "");
        if (source === target) return 0;
        if (Math.abs(source.length - target.length) > maxDistance) return maxDistance + 1;
        const prevPrev = new Array(target.length + 1).fill(0);
        const prev = new Array(target.length + 1).fill(0);
        const current = new Array(target.length + 1).fill(0);
        for (let j = 0; j <= target.length; j += 1) {
          prev[j] = j;
        }
        for (let i = 1; i <= source.length; i += 1) {
          current[0] = i;
          let rowMin = current[0];
          for (let j = 1; j <= target.length; j += 1) {
            const substitutionCost = source[i - 1] === target[j - 1] ? 0 : 1;
            let value = Math.min(
              prev[j] + 1,
              current[j - 1] + 1,
              prev[j - 1] + substitutionCost
            );
            if (
              i > 1 &&
              j > 1 &&
              source[i - 1] === target[j - 2] &&
              source[i - 2] === target[j - 1]
            ) {
              value = Math.min(value, prevPrev[j - 2] + 1);
            }
            current[j] = value;
            if (value < rowMin) rowMin = value;
          }
          if (rowMin > maxDistance) return maxDistance + 1;
          for (let j = 0; j <= target.length; j += 1) {
            prevPrev[j] = prev[j];
            prev[j] = current[j];
          }
        }
        return prev[target.length];
      };
      const getMinDistanceToSubstrings = (needle, haystack, maxDistance) => {
        const source = String(needle || "");
        const target = String(haystack || "");
        if (!source || !target) return maxDistance + 1;
        if (target.includes(source)) return 0;
        if (maxDistance <= 0) return maxDistance + 1;
        const minLen = Math.max(1, source.length - maxDistance);
        const maxLen = Math.min(target.length, source.length + maxDistance);
        let best = maxDistance + 1;
        for (let start = 0; start < target.length; start += 1) {
          for (let size = minLen; size <= maxLen; size += 1) {
            const end = start + size;
            if (end > target.length) break;
            const candidate = target.slice(start, end);
            const distance = getBoundedEditDistance(source, candidate, best - 1);
            if (distance < best) {
              best = distance;
              if (best === 0) return 0;
              if (best === 1) return 1;
            }
          }
        }
        return best;
      };
      const includesAny = (target, queries) => {
        if (!target || !Array.isArray(queries) || !queries.length) return false;
        for (let i = 0; i < queries.length; i += 1) {
          const query = queries[i];
          if (query && target.includes(query)) return true;
        }
        return false;
      };
      const getBestDistanceToAnySubstrings = (queries, target, maxDistance) => {
        if (!target || !Array.isArray(queries) || !queries.length || maxDistance < 0) {
          return maxDistance + 1;
        }
        if (includesAny(target, queries)) return 0;
        let best = maxDistance + 1;
        for (let i = 0; i < queries.length; i += 1) {
          const query = queries[i];
          if (!query) continue;
          const distance = getMinDistanceToSubstrings(query, target, best - 1);
          if (distance < best) {
            best = distance;
            if (best === 0) return 0;
          }
        }
        return best;
      };
      const scoreSearchAlias = (alias, queryMeta) => {
        if (!queryMeta.active) return 1;
        if (!alias) return 0;
        const allowTypo = Boolean(alias.allowTypo);
        let best = 0;
        if (queryMeta.rawText && alias.text.includes(queryMeta.rawText)) {
          best = Math.max(best, SEARCH_SCORE.EXACT_TEXT);
        }
        if (queryMeta.compact && alias.compact && alias.compact.includes(queryMeta.compact)) {
          best = Math.max(best, SEARCH_SCORE.COMPACT_MATCH);
        }
        if (queryMeta.latin && alias.latin && alias.latin.includes(queryMeta.latin)) {
          best = Math.max(best, SEARCH_SCORE.LATIN_MATCH);
        }
        if (
          queryMeta.pinyinFull &&
          alias.pinyinFull &&
          alias.pinyinFull.includes(queryMeta.pinyinFull)
        ) {
          best = Math.max(best, SEARCH_SCORE.PINYIN_FULL);
        }
        if (
          Array.isArray(queryMeta.phoneticQueries) &&
          queryMeta.phoneticQueries.length &&
          alias.pinyinFull &&
          includesAny(alias.pinyinFull, queryMeta.phoneticQueries)
        ) {
          best = Math.max(best, SEARCH_SCORE.PHONETIC_QUERY);
        }
        if (
          Array.isArray(queryMeta.initialQueries) &&
          queryMeta.initialQueries.length &&
          alias.pinyinInitial &&
          includesAny(alias.pinyinInitial, queryMeta.initialQueries)
        ) {
          best = Math.max(best, SEARCH_SCORE.INITIAL_QUERY);
        }
        if (best >= SEARCH_SCORE.PHONETIC_QUERY) return best;
        if (
          allowTypo &&
          queryMeta.typoBudget > 0 &&
          Array.isArray(queryMeta.phoneticQueries) &&
          queryMeta.phoneticQueries.length
        ) {
          const fullTarget = alias.pinyinFull || alias.latin;
          if (fullTarget) {
            const fullDistance = getBestDistanceToAnySubstrings(
              queryMeta.phoneticQueries,
              fullTarget,
              queryMeta.typoBudget
            );
            if (fullDistance <= queryMeta.typoBudget) {
              const baseLength = Math.max(
                1,
                Number(queryMeta.maxPhoneticLength) || queryMeta.phoneticQuery.length || 0
              );
              const relativeDistance = fullDistance / baseLength;
              const relativeLimit = queryMeta.typoBudget >= 2 ? 0.3 : 0.45;
              if (relativeDistance <= relativeLimit) {
                best = Math.max(
                  best,
                  SEARCH_SCORE.TYPO_FULL_BASE - fullDistance * SEARCH_SCORE.TYPO_FULL_DISTANCE_STEP
                );
              }
            }
          }
          if (Array.isArray(queryMeta.initialQueries) && queryMeta.initialQueries.length) {
            const hasEnoughInitialQuery = queryMeta.initialQueries.some((query) => query.length >= 3);
            if (hasEnoughInitialQuery) {
              const initialBudget = Math.min(1, queryMeta.typoBudget);
              const initialTarget = alias.pinyinInitial || alias.latin;
              if (initialTarget) {
                const initialDistance = getBestDistanceToAnySubstrings(
                  queryMeta.initialQueries,
                  initialTarget,
                  initialBudget
                );
                if (initialDistance <= initialBudget) {
                  best = Math.max(
                    best,
                    SEARCH_SCORE.TYPO_INITIAL_BASE -
                      initialDistance * SEARCH_SCORE.TYPO_INITIAL_DISTANCE_STEP
                  );
                }
              }
            }
          }
        }
        return best;
      };
      const scoreSearchEntry = (entry, queryOrMeta) => {
        const queryMeta =
          queryOrMeta && queryOrMeta._isSearchQueryMeta
            ? queryOrMeta
            : createSearchQueryMeta(queryOrMeta);
        if (!queryMeta.active) return 1;
        if (!entry) return 0;
        const aliases = Array.isArray(entry.aliases) && entry.aliases.length
          ? entry.aliases
          : [createSearchAlias(entry)];
        let best = 0;
        for (let i = 0; i < aliases.length; i += 1) {
          const score = scoreSearchAlias(aliases[i], queryMeta);
          if (score > best) best = score;
          if (best >= SEARCH_SCORE.EXACT_TEXT) break;
        }
        return best;
      };
      const isSearchEntryMatch = (entry, queryOrMeta) => scoreSearchEntry(entry, queryOrMeta) > 0;

      const defaultWeaponMark = Object.freeze({
        weaponOwned: false,
        essenceOwned: false,
        note: "",
      });

      const normalizeWeaponMark = (mark, options) => {
        const allowLegacyExcluded = !options || options.allowLegacyExcluded !== false;
        let weaponOwned = false;
        let essenceOwned = false;
        let note = "";
        if (mark && typeof mark === "object") {
          if (typeof mark.weaponOwned === "boolean") {
            weaponOwned = mark.weaponOwned;
          }
          if (typeof mark.essenceOwned === "boolean") {
            essenceOwned = mark.essenceOwned;
          } else if (allowLegacyExcluded && typeof mark.excluded === "boolean") {
            essenceOwned = mark.excluded;
          }
          note = typeof mark.note === "string" ? mark.note : "";
        } else if (typeof mark === "string") {
          note = mark;
        }
        return { weaponOwned, essenceOwned, note };
      };

      const compactWeaponMark = (mark) => {
        const normalized = normalizeWeaponMark(mark, { allowLegacyExcluded: false });
        const compact = {};
        if (normalized.weaponOwned) compact.weaponOwned = true;
        if (normalized.essenceOwned) compact.essenceOwned = true;
        if (normalized.note) compact.note = normalized.note;
        return Object.keys(compact).length ? compact : null;
      };

      const getWeaponMarkFromMap = (name, source) => {
        const map = source && typeof source === "object" ? source : {};
        if (!name || !Object.prototype.hasOwnProperty.call(map, name)) {
          return { ...defaultWeaponMark };
        }
        return normalizeWeaponMark(map[name]);
      };

      const normalizeWeaponMarksMap = (raw, weaponNameSet) => {
        if (!raw || typeof raw !== "object") return {};
        const normalized = {};
        Object.keys(raw).forEach((name) => {
          if (!name) return;
          if (weaponNameSet && !weaponNameSet.has(name)) return;
          const compact = compactWeaponMark(raw[name]);
          if (compact) {
            normalized[name] = compact;
          }
        });
        return normalized;
      };

      const normalizeLegacyExcludedMarksMap = (raw, weaponNameSet) => {
        if (!raw || typeof raw !== "object") return {};
        const normalized = {};
        Object.keys(raw).forEach((name) => {
          if (!name) return;
          if (weaponNameSet && !weaponNameSet.has(name)) return;
          const value = raw[name];
          let excluded = false;
          let note = "";
          if (value && typeof value === "object") {
            excluded = Boolean(value.excluded);
            note = typeof value.note === "string" ? value.note : "";
          } else if (typeof value === "string") {
            note = value;
          }
          if (excluded || note) {
            normalized[name] = { excluded, note };
          }
        });
        return normalized;
      };

      const allSame = (values) => values.length > 0 && values.every((value) => value === values[0]);

      const countBy = (values) =>
        values.reduce((acc, value) => {
          if (!value || value === "任意") return acc;
          acc[value] = (acc[value] || 0) + 1;
          return acc;
        }, {});

      const formatS1 = (value) => {
        if (value === "任意") return i18nState.t("任意");
        if (!value) return i18nState.t("error.attribute_missing");
        return i18nState.tTerm("s1", value);
      };

      const getS1OrderIndex = (value) => {
        const index = S1_ORDER.indexOf(value);
        return index === -1 ? 99 : index;
      };

      const compareText = (a, b) => (a || "").localeCompare(b || "", "zh-Hans-CN");

      const getDungeonRegion = (name) => {
        const text = (name || "").toString();
        if (!text) return "";
        const delimiter = text.indexOf("·");
        if (delimiter > 0) {
          return text.slice(0, delimiter).trim();
        }
        const spaceMatch = text.match(/^([^\s-]+?)\s*[-—]/);
        if (spaceMatch && spaceMatch[1]) {
          return spaceMatch[1].trim();
        }
        return text.trim();
      };

      const getBaseCount = (counts, key) => {
        if (!counts) return 0;
        if (typeof counts.get === "function") return counts.get(key) || 0;
        return counts[key] || 0;
      };

      const getBaseAttrSorter =
        (secondaryKey, tertiaryKey, selectedSet, baseCounts) => (a, b) => {
        if (selectedSet) {
          const selectedDiff =
            (selectedSet.has(b.name) ? 1 : 0) - (selectedSet.has(a.name) ? 1 : 0);
          if (selectedDiff !== 0) return selectedDiff;
        }
        if (baseCounts) {
          const baseCountDiff = getBaseCount(baseCounts, b.s1) - getBaseCount(baseCounts, a.s1);
          if (baseCountDiff !== 0) return baseCountDiff;
        }
        const baseDiff = getS1OrderIndex(a.s1) - getS1OrderIndex(b.s1);
        if (baseDiff !== 0) return baseDiff;
        const secondaryDiff = compareText(a[secondaryKey], b[secondaryKey]);
        if (secondaryDiff !== 0) return secondaryDiff;
        if (tertiaryKey) {
          const tertiaryDiff = compareText(a[tertiaryKey], b[tertiaryKey]);
          if (tertiaryDiff !== 0) return tertiaryDiff;
        }
        if (b.rarity !== a.rarity) return b.rarity - a.rarity;
        return compareText(a.name, b.name);
      };

      const getSchemeWeaponSorter = (lockType, selectedSet, baseCounts) => {
        const secondaryKey = lockType === "s2" ? "s3" : "s2";
        return getBaseAttrSorter(secondaryKey, null, selectedSet, baseCounts);
      };

      const getConflictInfo = (weapon, dungeon, lockOption) => {
        const reasons = [];
        let conflictS2 = false;
        let conflictS3 = false;

        if (lockOption.type === "s2") {
          if (weapon.s2 !== lockOption.value) {
            conflictS2 = true;
            reasons.push(
              i18nState.t("plan.extra_attribute_must_be_value", {
                value: i18nState.tTerm("s2", lockOption.value),
              })
            );
          }
          if (!dungeon.s3_pool.includes(weapon.s3)) {
            conflictS3 = true;
            reasons.push(
              i18nState.t("plan.dungeon_name_not_drop_skill_attribute", {
                name: i18nState.tTerm("dungeon", dungeon.name),
              })
            );
          }
        } else {
          if (weapon.s3 !== lockOption.value) {
            conflictS3 = true;
            reasons.push(
              i18nState.t("plan.skill_attribute_must_be_value", {
                value: i18nState.tTerm("s3", lockOption.value),
              })
            );
          }
          if (!dungeon.s2_pool.includes(weapon.s2)) {
            conflictS2 = true;
            reasons.push(
              i18nState.t("plan.dungeon_name_not_drop_extra_attribute", {
                name: i18nState.tTerm("dungeon", dungeon.name),
              })
            );
          }
        }

        return {
          conflictS2,
          conflictS3,
          conflictReason: reasons.length
            ? reasons.join("；")
            : i18nState.t("plan.incompatible_with_current_plan_attributes"),
        };
      };

      const isWeaponCompatible = (weapon, dungeon, lockOption) => {
        if (lockOption.type === "s2") {
          return (
            weapon.s2 === lockOption.value &&
            dungeon.s2_pool.includes(lockOption.value) &&
            dungeon.s3_pool.includes(weapon.s3)
          );
        }
        return (
          weapon.s3 === lockOption.value &&
          dungeon.s3_pool.includes(lockOption.value) &&
          dungeon.s2_pool.includes(weapon.s2)
        );
      };

