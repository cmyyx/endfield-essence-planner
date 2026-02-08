      const dungeons = Array.isArray(window.DUNGEONS) ? window.DUNGEONS : [];
      const weapons = Array.isArray(window.WEAPONS) ? window.WEAPONS : [];
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

      const allSame = (values) => values.length > 0 && values.every((value) => value === values[0]);

      const countBy = (values) =>
        values.reduce((acc, value) => {
          if (!value || value === "任意") return acc;
          acc[value] = (acc[value] || 0) + 1;
          return acc;
        }, {});

      const formatS1 = (value) => {
        if (!value || value === "任意") return i18nState.t("任意");
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
              i18nState.t("附加属性需为 {value}", {
                value: i18nState.tTerm("s2", lockOption.value),
              })
            );
          }
          if (!dungeon.s3_pool.includes(weapon.s3)) {
            conflictS3 = true;
            reasons.push(
              i18nState.t("方案地区（{name}）不产出该技能属性", {
                name: i18nState.tTerm("dungeon", dungeon.name),
              })
            );
          }
        } else {
          if (weapon.s3 !== lockOption.value) {
            conflictS3 = true;
            reasons.push(
              i18nState.t("技能属性需为 {value}", {
                value: i18nState.tTerm("s3", lockOption.value),
              })
            );
          }
          if (!dungeon.s2_pool.includes(weapon.s2)) {
            conflictS2 = true;
            reasons.push(
              i18nState.t("方案地区（{name}）不产出该附加属性", {
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
            : i18nState.t("与当前方案属性不兼容"),
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

