(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initStrategy = function (ctx, state) {
    const { ref, computed, nextTick } = ctx;
    const weaponCatalog = Array.isArray(window.WEAPONS) ? window.WEAPONS : [];
    const weaponMap = new Map(weaponCatalog.map((weapon) => [weapon.name, weapon]));

    state.characters = window.characters || [];
    state.selectedCharacterId = ref(null);
    state.strategyCategory = ref("info");
    state.strategyTab = ref("base");

    const normalizeGuideWeapon = (weapon) => {
      if (!weapon) return null;
      const base = weaponMap.get(weapon.name);
      return {
        ...weapon,
        rarity: weapon.rarity ?? (base ? base.rarity : undefined),
      };
    };

    const skillLevelLabels = [
      "Lv1",
      "Lv2",
      "Lv3",
      "Lv4",
      "Lv5",
      "Lv6",
      "Lv7",
      "Lv8",
      "Lv9",
      "M1",
      "M2",
      "M3",
    ];

    const normalizeSkillValue = (value) => {
      if (value === null || value === undefined || value === "") return "-";
      return value;
    };

    const buildSkillValues = (row) => {
      if (!row) return new Array(12).fill("-");
      if (row.value !== null && row.value !== undefined && row.value !== "") {
        return new Array(12).fill(row.value);
      }
      let values = [];
      if (Array.isArray(row.values)) {
        values = row.values.slice();
      } else if (row.values && typeof row.values === "object") {
        const levels = Array.isArray(row.values.levels) ? row.values.levels : [];
        const masteries = Array.isArray(row.values.masteries) ? row.values.masteries : [];
        if (levels.length || masteries.length) {
          values = [...levels, ...masteries];
        }
      }
      const filled = new Array(12).fill("-");
      values.forEach((value, index) => {
        if (index < filled.length) {
          filled[index] = value;
        }
      });
      return filled;
    };

    const mergeSkillValues = (values) => {
      const segments = [];
      let index = 0;
      while (index < values.length) {
        const baseValue = normalizeSkillValue(values[index]);
        let span = 1;
        while (index + span < values.length) {
          if (normalizeSkillValue(values[index + span]) !== baseValue) break;
          span += 1;
        }
        segments.push({ value: baseValue, span });
        index += span;
      }
      return segments;
    };

    const getSkillTables = (skill) => {
      if (!skill) return [];
      let tables = [];
      if (Array.isArray(skill.dataTables)) {
        tables = skill.dataTables;
      } else if (skill.data && Array.isArray(skill.data.rows)) {
        tables = [skill.data];
      } else if (Array.isArray(skill.dataRows)) {
        tables = [{ title: "技能数据", rows: skill.dataRows }];
      }
      return tables
        .map((table) => {
          const rows = Array.isArray(table.rows) ? table.rows : [];
          const normalizedRows = rows.map((row) => {
            const values = buildSkillValues(row);
            const segments = mergeSkillValues(values);
            const uniformValue = segments.length === 1 ? segments[0].value : null;
            return {
              name: row.name || "",
              segments,
              uniformValue,
            };
          });
          return {
            title: table.title || "技能数据",
            rows: normalizedRows,
          };
        })
        .filter((table) => table.rows.length);
    };

    state.skillLevelLabels = skillLevelLabels;
    state.getSkillTables = getSkillTables;

    state.currentCharacter = computed(() => {
      if (!state.selectedCharacterId.value) return null;
      return state.characters.find(c => c.id === state.selectedCharacterId.value);
    });

    const normalizeGearRows = (rows) => {
      if (!Array.isArray(rows)) return [];
      return rows.map((row) => {
        const weapons = Array.isArray(row.weapons) ? row.weapons.filter(Boolean) : [];
        const equipment = Array.isArray(row.equipment) ? row.equipment.filter(Boolean) : [];
        const normalizedEquipment = equipment.slice(0, 4);
        while (normalizedEquipment.length < 4) normalizedEquipment.push(null);
        return {
          weapons: weapons.map(normalizeGuideWeapon).filter(Boolean),
          equipment: normalizedEquipment,
        };
      });
    };

    const stripAvatarName = (value) => {
      if (!value) return "";
      return String(value)
        .trim()
        .replace(/\s+/g, "")
        .replace(/[（(][^()（）]*[)）]/g, "")
        .replace(/[\/|｜、，。·•・_\-]/g, "");
    };

    const normalizeNameForAvatar = (value) => {
      const stripped = stripAvatarName(value);
      if (!stripped) return "";
      return stripped.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, "");
    };

    const findCharacterAvatarByName = (name) => {
      const target = normalizeNameForAvatar(name);
      if (!target) return "";

      let bestMatch = null;
      (state.characters || []).forEach((character) => {
        if (!character || !character.name || !character.avatar) return;
        const current = normalizeNameForAvatar(character.name);
        if (!current) return;

        let score = 0;
        if (current === target) {
          score = 3;
        } else if (current.includes(target) || target.includes(current)) {
          score = 2;
        }
        if (!score) return;

        if (
          !bestMatch ||
          score > bestMatch.score ||
          (score === bestMatch.score && current.length < bestMatch.length)
        ) {
          bestMatch = {
            score,
            length: current.length,
            avatar: character.avatar,
          };
        }
      });

      return bestMatch ? bestMatch.avatar : "";
    };

    const normalizeTeamSlots = (slots) => {
      if (!Array.isArray(slots)) return [];
      return slots
        .map((slot) => {
          if (!slot) return null;
          const options = Array.isArray(slot.options) ? slot.options.filter(Boolean) : [];
          if (!options.length && slot.name) {
            options.push(slot);
          }
          if (!options.length) return null;
          const normalizedOptions = options.map((option) => ({
            ...option,
            avatar: resolveTeamAvatar(option, slot),
            weapons: Array.isArray(option.weapons)
              ? option.weapons.filter(Boolean).map(normalizeGuideWeapon).filter(Boolean)
              : [],
            equipment: Array.isArray(option.equipment) ? option.equipment.filter(Boolean) : [],
          }));
          return {
            ...slot,
            options: normalizedOptions,
          };
        })
        .filter(Boolean);
    };

    const resolveTeamAvatar = (option, slot) => {
      if (option && option.avatar) return option.avatar;
      if (slot && slot.avatar) return slot.avatar;

      const names = [option && option.name, slot && slot.name].filter(Boolean);
      for (let index = 0; index < names.length; index += 1) {
        const found = findCharacterAvatarByName(names[index]);
        if (found) return found;
      }

      const fallbackCandidates = names.flatMap((name) => buildAvatarPathCandidates(name));
      return fallbackCandidates[0] || "";
    };

    const buildAvatarPathCandidates = (name) => {
      const raw = stripAvatarName(name);
      if (!raw) return [];
      const candidates = [];
      candidates.push(`image/characters/${raw}.png`);

      const base = raw.replace(/[\u7537\u5973]$/u, "").trim();
      if (base && base !== raw) {
        const gender = /\u7537$/u.test(raw) ? "\u7537" : "\u5973";
        candidates.push(`image/characters/${base}(${gender}).png`);
      } else {
        candidates.push(`image/characters/${raw}(\u5973).png`);
        candidates.push(`image/characters/${raw}(\u7537).png`);
      }

      return Array.from(new Set(candidates));
    };

    state.currentGuide = computed(() => {
      const current = state.currentCharacter.value;
      if (!current) return null;
      return current.guide || null;
    });

    state.guideRows = computed(() => {
      const guide = state.currentGuide.value;
      if (!guide) return [];
      return normalizeGearRows(guide.gearRows || []);
    });

    state.teamSlots = computed(() => {
      const guide = state.currentGuide.value;
      const slots = guide && Array.isArray(guide.teamSlots) ? guide.teamSlots : [];
      const normalized = normalizeTeamSlots(slots);
      if (!normalized.length) return [];
      const trimmed = normalized.slice(0, 4);
      while (trimmed.length < 4) trimmed.push(null);
      return trimmed;
    });

    const resetStrategyDefaults = () => {
      state.strategyCategory.value = "info";
      state.strategyTab.value = "base";
    };

    state.selectCharacter = (id) => {
      state.selectedCharacterId.value = id;
      resetStrategyDefaults();
    };
    
    state.backToCharacterList = () => {
      state.selectedCharacterId.value = null;
      resetStrategyDefaults();
    };

    state.setStrategyTab = (tab) => {
      state.strategyTab.value = tab;
    };

    state.setStrategyCategory = (category) => {
      state.strategyCategory.value = category;
      const infoTabs = ["base", "skillsTalents", "potentials"];
      const guideTabs = ["analysis", "team", "operation"];
      if (category === "info" && !infoTabs.includes(state.strategyTab.value)) {
        state.strategyTab.value = "base";
      }
      if (category === "guide" && !guideTabs.includes(state.strategyTab.value)) {
        state.strategyTab.value = "analysis";
      }
    };

    const getGuideContainer = (el) => {
      if (!el || !el.closest) return null;
      return el.closest(".strategy-view");
    };

    const clearGuideRelease = (container) => {
      if (!container || !container._guideHeightRelease) return;
      const release = container._guideHeightRelease;
      if (release.onEnd) {
        container.removeEventListener("transitionend", release.onEnd);
      }
      if (release.timeout) {
        clearTimeout(release.timeout);
      }
      container._guideHeightRelease = null;
    };

    const lockGuideContainer = (container) => {
      if (!container) return;
      clearGuideRelease(container);
      const height = container.getBoundingClientRect().height;
      container.style.height = `${height}px`;
      container.classList.add("is-guide-animating");
    };

    const setGuideContainerHeight = (container, el) => {
      if (!container) return;
      let nextHeight = container.scrollHeight;
      if (el && typeof window !== "undefined" && window.getComputedStyle) {
        const styles = window.getComputedStyle(container);
        const paddingTop = parseFloat(styles.paddingTop) || 0;
        const paddingBottom = parseFloat(styles.paddingBottom) || 0;
        const borderTop = parseFloat(styles.borderTopWidth) || 0;
        const borderBottom = parseFloat(styles.borderBottomWidth) || 0;
        const contentHeight = el.scrollHeight || el.getBoundingClientRect().height || 0;
        nextHeight = contentHeight + paddingTop + paddingBottom + borderTop + borderBottom;
      }
      container.style.height = `${Math.max(0, Math.ceil(nextHeight))}px`;
    };

    const releaseGuideContainer = (container) => {
      if (!container) return;
      container.style.height = "";
      container.classList.remove("is-guide-animating");
    };

    const scheduleGuideRelease = (container) => {
      if (!container) return;
      clearGuideRelease(container);
      const onEnd = (event) => {
        if (event && event.propertyName !== "height") return;
        clearGuideRelease(container);
        releaseGuideContainer(container);
      };
      container.addEventListener("transitionend", onEnd);
      const timeout = setTimeout(() => {
        clearGuideRelease(container);
        releaseGuideContainer(container);
      }, 320);
      container._guideHeightRelease = { onEnd, timeout };
    };

    state.guideBeforeLeave = (el) => {
      const container = getGuideContainer(el);
      lockGuideContainer(container);
    };

    state.guideEnter = (el) => {
      const container = getGuideContainer(el);
      if (!container) return;
      if (!container.classList.contains("is-guide-animating")) {
        lockGuideContainer(container);
      }
      const applyHeight = () => {
        container.getBoundingClientRect();
        setGuideContainerHeight(container, el);
        scheduleGuideRelease(container);
      };
      const schedule = () => {
        if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(applyHeight);
          });
        } else {
          applyHeight();
        }
      };
      if (typeof nextTick === "function") {
        nextTick(schedule);
      } else {
        schedule();
      }
    };
  };
})();


