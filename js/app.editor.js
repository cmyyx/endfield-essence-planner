(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initEditor = function initEditor(ctx, state) {
    if (state.editorInitialized) return;
    state.editorInitialized = true;

    const { ref, computed, watch, nextTick } = ctx;

    const ensureRef = (key, initial) => {
      const current = state[key];
      if (current && typeof current === "object" && "value" in current) return current;
      state[key] = ref(initial);
      return state[key];
    };

    const editorCharacters = ensureRef("editorCharacters", []);
    const editorSelectedId = ensureRef("editorSelectedId", null);
    const editorSearchQuery = ensureRef("editorSearchQuery", "");
    const editorPickerOpen = ensureRef("editorPickerOpen", true);
    const editorIssues = ensureRef("editorIssues", []);
    const editorIssueMap = ensureRef("editorIssueMap", {});
    const editorDirty = ensureRef("editorDirty", false);
    const editorImportFileName = ensureRef("editorImportFileName", "");
    const editorImportError = ensureRef("editorImportError", "");
    const editorLoadError = ensureRef("editorLoadError", "");
    const editorImportInput = ensureRef("editorImportInput", null);
    const editorIdentityDraft = ensureRef("editorIdentityDraft", { id: "", name: "" });
    const editorJsonDraft = ensureRef("editorJsonDraft", {
      skills: "[]",
      talents: "[]",
      baseSkills: "[]",
      guide: "{}",
    });
    const editorJsonErrors = ensureRef("editorJsonErrors", {});
    const editorPotentialsDraft = ensureRef("editorPotentialsDraft", []);
    const editorMaterialsDraft = ensureRef("editorMaterialsDraft", {});
    const editorStrategyCategory = ensureRef("editorStrategyCategory", "info");
    const editorStrategyTab = ensureRef("editorStrategyTab", "base");

    const editorMaterialLevels = ["elite1", "elite2", "elite3", "elite4"];
    state.editorMaterialLevels = editorMaterialLevels;

    const ensureEditorStyles = () => {
      if (typeof document === "undefined") return;
      const existing = document.querySelector('link[data-editor-style="true"]');
      if (existing) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "./css/styles.editor.css";
      link.dataset.editorStyle = "true";
      document.head.appendChild(link);
    };

    const editorStorageKey = state.editorCharactersStorageKey || "planner-editor-characters:v1";
    const editorStorageVersion = 2;

    const readEditorStorage = () => {
      if (!editorStorageKey || typeof localStorage === "undefined") return null;
      try {
        const raw = localStorage.getItem(editorStorageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        const hasLegacy = Array.isArray(parsed.characters);
        const hasOverrides = Array.isArray(parsed.overrides);
        const hasCustoms = Array.isArray(parsed.customs) || Array.isArray(parsed.custom);
        if (!hasLegacy && !hasOverrides && !hasCustoms) return null;
        return parsed;
      } catch (error) {
        return null;
      }
    };

    const characterKey = (character, index) => {
      if (!character) return `editor-${index}`;
      const id = String(character.id || "").trim();
      if (id) return id;
      const name = String(character.name || "").trim();
      if (name) return name;
      return `editor-${index}`;
    };

    let editorBaseCharacters = [];
    let editorBaseMap = new Map();
    let editorBaseKeySet = new Set();

    const setEditorBaseCharacters = (list) => {
      const baseList = safeClone(list || []);
      editorBaseCharacters = baseList;
      editorBaseMap = new Map();
      editorBaseKeySet = new Set();
      baseList.forEach((character, index) => {
        ensureCharacterShape(character);
        const key = characterKey(character, index);
        if (!key) return;
        if (!editorBaseMap.has(key)) {
          editorBaseMap.set(key, character);
        }
        editorBaseKeySet.add(key);
      });
      return baseList;
    };

    const serializeValue = (value) => {
      try {
        return JSON.stringify(value ?? null);
      } catch (error) {
        return "";
      }
    };

    const buildEditorStoragePayload = (list) => {
      const overrides = [];
      const customs = [];
      (list || []).forEach((character, index) => {
        const key = characterKey(character, index);
        if (key && editorBaseKeySet.has(key)) {
          const base = editorBaseMap.get(key);
          if (!base || serializeValue(base) !== serializeValue(character)) {
            overrides.push(character);
          }
          return;
        }
        customs.push(character);
      });
      return {
        version: editorStorageVersion,
        savedAt: new Date().toISOString(),
        selectedId: editorSelectedId.value || null,
        overrides,
        customs,
      };
    };

    const writeEditorStorage = (list) => {
      if (!editorStorageKey || typeof localStorage === "undefined") return;
      const payload = buildEditorStoragePayload(list);
      try {
        localStorage.setItem(editorStorageKey, JSON.stringify(payload));
      } catch (error) {
        // ignore write failures
      }
    };

    const findCharacterByKey = (key) => {
      const list = editorCharacters.value || [];
      for (let index = 0; index < list.length; index += 1) {
        const current = list[index];
        if (characterKey(current, index) === key) {
          return { character: current, index };
        }
      }
      return null;
    };

    const buildDefaultStats = () => ({
      strength: "",
      agility: "",
      intellect: "",
      will: "",
      attack: "",
      hp: "",
    });

    const buildDefaultGuide = () => ({
      equipRows: [],
      analysis: "",
      teamTips: "",
      operationTips: "",
      teamSlots: [],
    });

    const normalizeGuideEntry = (entry) => {
      if (!entry) return null;
      if (typeof entry === "string") return { name: entry };
      if (typeof entry === "object") return entry;
      return null;
    };

    const normalizeGuideList = (list) =>
      Array.isArray(list) ? list.map((entry) => normalizeGuideEntry(entry)).filter(Boolean) : [];

    const normalizeGuideEquipList = (list) => {
      if (!Array.isArray(list)) return [];
      return list.map((entry) => {
        if (!entry) return null;
        return normalizeGuideEntry(entry);
      });
    };

    const ensureCharacterShape = (character) => {
      if (!character || typeof character !== "object") return;
      if (!character.stats || typeof character.stats !== "object") {
        character.stats = buildDefaultStats();
      } else {
        const defaults = buildDefaultStats();
        Object.keys(defaults).forEach((key) => {
          if (character.stats[key] === undefined) {
            character.stats[key] = defaults[key];
          }
        });
      }
      if (!character.materials || typeof character.materials !== "object") {
        character.materials = {};
      }
      editorMaterialLevels.forEach((level) => {
        if (!Array.isArray(character.materials[level])) {
          character.materials[level] = [];
        }
        character.materials[level] = character.materials[level]
          .map((item) => formatMaterialLine(item))
          .filter(Boolean);
      });
      if (!Array.isArray(character.potentials)) {
        character.potentials = [];
      }
      if (!Array.isArray(character.skills)) {
        character.skills = [];
      }
      character.skills = character.skills.map((skill) => {
        if (!skill || typeof skill !== "object") {
          const name = String(skill || "").trim();
          return {
            name,
            description: "",
            icon: "",
            type: "",
            dataTables: [],
          };
        }
        if (skill.name === undefined) skill.name = "";
        if (skill.description === undefined) skill.description = "";
        if (skill.icon === undefined) skill.icon = "";
        if (skill.type === undefined) skill.type = "";
        if (!Array.isArray(skill.dataTables)) skill.dataTables = [];
        return skill;
      });
      if (!Array.isArray(character.talents)) {
        character.talents = [];
      }
      if (!Array.isArray(character.baseSkills)) {
        character.baseSkills = [];
      }
      if (!character.guide || typeof character.guide !== "object") {
        character.guide = buildDefaultGuide();
      } else {
        const defaults = buildDefaultGuide();
        Object.keys(defaults).forEach((key) => {
          if (character.guide[key] === undefined) {
            character.guide[key] = defaults[key];
          }
        });
      }
      if (!Array.isArray(character.guide.equipRows)) {
        character.guide.equipRows = [];
      }
      character.guide.equipRows = character.guide.equipRows.map((row) => {
        const target = row && typeof row === "object" ? row : {};
        target.weapons = normalizeGuideList(target.weapons);
        target.equipment = normalizeGuideEquipList(target.equipment);
        if (target.equipment.length < 4) {
          target.equipment = target.equipment.concat(new Array(4 - target.equipment.length).fill(null));
        } else if (target.equipment.length > 4) {
          target.equipment = target.equipment.slice(0, 4);
        }
        return target;
      });
      if (!Array.isArray(character.guide.teamSlots)) {
        character.guide.teamSlots = [];
      }
      character.guide.teamSlots = character.guide.teamSlots.map((slot) => {
        const target = slot && typeof slot === "object" ? slot : {};
        if (Array.isArray(target.options)) {
          target.options = target.options.map((option) => {
            const normalized = option && typeof option === "object" ? option : {};
            normalized.weapons = normalizeGuideList(normalized.weapons);
            normalized.equipment = normalizeGuideList(normalized.equipment);
            return normalized;
          });
        }
        return target;
      });
    };

    const safeClone = (value) => {
      if (typeof structuredClone === "function") {
        try {
          return structuredClone(value);
        } catch (error) {
          // fallback to JSON clone
        }
      }
      return JSON.parse(JSON.stringify(value || null));
    };

    const serializeCharacters = (value) => {
      try {
        return JSON.stringify(value || []);
      } catch (error) {
        return "[]";
      }
    };

    let editorBaselineSnapshot = serializeCharacters(editorCharacters.value);
    let editorBaselineData = safeClone(editorCharacters.value || []);
    let suspendDirtyWatch = false;

    const setEditorBaseline = (list) => {
      editorBaselineData = safeClone(list || []);
      editorBaselineSnapshot = serializeCharacters(list || []);
      editorDirty.value = false;
    };

    function formatMaterialLine(item) {
      if (!item) return "";
      if (typeof item === "string") return item.trim();
      if (typeof item === "object") {
        return String(item.name || item.label || item.id || "").trim();
      }
      return String(item).trim();
    }

    const normalizePotentialEntry = (entry) => {
      if (!entry) return null;
      if (typeof entry === "string") {
        const name = entry.trim();
        return name ? { name, description: "" } : null;
      }
      if (typeof entry === "object") {
        const name = String(entry.name || entry.title || entry.label || "").trim();
        const description = String(entry.description || entry.desc || entry.detail || "").trim();
        if (!name && !description) return null;
        return { name, description };
      }
      const name = String(entry).trim();
      return name ? { name, description: "" } : null;
    };

    const normalizePotentialEntries = (entries) =>
      (entries || []).map((item) => normalizePotentialEntry(item)).filter(Boolean);

    const syncMaterialsDraftFromCharacter = (character) => {
      const draft = {};
      const materials = character && character.materials ? character.materials : {};
      editorMaterialLevels.forEach((level) => {
        const entries = Array.isArray(materials[level]) ? materials[level] : [];
        draft[level] = entries
          .map((item) => formatMaterialLine(item))
          .filter(Boolean)
          .join("\n");
      });
      editorMaterialsDraft.value = draft;
    };

    const syncPotentialsDraftFromCharacter = (character) => {
      const list = character && Array.isArray(character.potentials) ? character.potentials : [];
      const normalized = normalizePotentialEntries(list);
      if (character) {
        character.potentials = normalized;
      }
      editorPotentialsDraft.value = normalized;
    };

    const stringifyJsonField = (value, fallback) => {
      const target = value === undefined ? fallback : value;
      return JSON.stringify(target, null, 2);
    };

    const syncJsonDraftFromCharacter = (character) => {
      editorJsonDraft.value = {
        skills: stringifyJsonField(character ? character.skills : undefined, []),
        talents: stringifyJsonField(character ? character.talents : undefined, []),
        baseSkills: stringifyJsonField(character ? character.baseSkills : undefined, []),
        guide: stringifyJsonField(character ? character.guide : undefined, {}),
      };
      editorJsonErrors.value = {};
    };

    const syncIdentityDraftFromCharacter = (character) => {
      editorIdentityDraft.value = {
        id: character ? String(character.id || "") : "",
        name: character ? String(character.name || "") : "",
      };
    };

    const syncDraftsFromCharacter = (character) => {
      if (!character) {
        editorMaterialsDraft.value = {};
        editorPotentialsDraft.value = [];
        editorJsonDraft.value = {
          skills: "[]",
          talents: "[]",
          baseSkills: "[]",
          guide: "{}",
        };
        editorJsonErrors.value = {};
        syncIdentityDraftFromCharacter(null);
        return;
      }
      ensureCharacterShape(character);
      syncMaterialsDraftFromCharacter(character);
      syncPotentialsDraftFromCharacter(character);
      syncJsonDraftFromCharacter(character);
      syncIdentityDraftFromCharacter(character);
    };

    const editorSelectedIndex = ref(-1);

    const editorSelectedCharacter = computed(() => {
      const key = editorSelectedId.value;
      if (!key) return null;
      const found = findCharacterByKey(key);
      return found ? found.character : null;
    });
    state.editorSelectedCharacter = editorSelectedCharacter;
    state.editorCurrentCharacter = editorSelectedCharacter;
    state.editorPickerOpen = editorPickerOpen;
    state.editorIdentityDraft = editorIdentityDraft;

    const editorFilteredCharacters = computed(() => {
      const list = editorCharacters.value || [];
      const query = String(editorSearchQuery.value || "").trim().toLowerCase();
      if (!query) return list;
      return list.filter((character) => {
        if (!character) return false;
        const name = String(character.name || "").toLowerCase();
        const id = String(character.id || "").toLowerCase();
        return name.includes(query) || id.includes(query);
      });
    });
    state.editorFilteredCharacters = editorFilteredCharacters;

    state.editorIssueSummary = computed(() => {
      const list = editorIssues.value || [];
      let errorCount = 0;
      let warnCount = 0;
      list.forEach((issue) => {
        if (issue && issue.level === "error") errorCount += 1;
        if (issue && issue.level === "warn") warnCount += 1;
      });
      return { errorCount, warnCount, total: list.length };
    });

    const weaponCatalog = Array.isArray(window.WEAPONS) ? window.WEAPONS : [];
    const weaponMap = new Map(weaponCatalog.map((weapon) => [weapon.name, weapon]));

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

    const buildEditableSkillValues = (row) =>
      buildSkillValues(row).map((value) => (value === "-" ? "" : value));

    const ensureSkillRowValues = (row) => {
      if (!row || typeof row !== "object") return new Array(12).fill("");
      if (Array.isArray(row.values)) {
        const copy = row.values.slice(0, 12);
        while (copy.length < 12) copy.push("");
        return copy;
      }
      return buildEditableSkillValues(row);
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

    state.editorSkillLevelLabels = skillLevelLabels;
    state.editorGetSkillTables = getSkillTables;

    state.getEditorSkillValue = (row, index) => {
      const values = ensureSkillRowValues(row);
      return values[index] || "";
    };

    state.updateEditorSkillValue = (row, index, value) => {
      if (!row || typeof row !== "object") return;
      const values = ensureSkillRowValues(row);
      values[index] = value;
      row.values = values;
      if ("value" in row) delete row.value;
    };

    const normalizeEquipRows = (rows) => {
      if (!Array.isArray(rows)) return [];
      return rows.map((row) => {
        const weapons = Array.isArray(row.weapons) ? row.weapons.filter(Boolean) : [];
        const equipment = Array.isArray(row.equipment) ? row.equipment : [];
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
        .replace(/[\/|、，。·？_\-]/g, "");
    };

    const normalizeNameForAvatar = (value) => {
      const stripped = stripAvatarName(value);
      if (!stripped) return "";
      return stripped.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, "");
    };

    const buildAvatarPathCandidates = (name) => {
      const raw = stripAvatarName(name);
      if (!raw) return [];
      const candidates = [];
      candidates.push(`image/characters/${raw}.avif`);

      const base = raw.replace(/[\u7537\u5973]$/u, "").trim();
      if (base && base !== raw) {
        const gender = /\u7537$/u.test(raw) ? "\u7537" : "\u5973";
        candidates.push(`image/characters/${base}(${gender}).avif`);
      } else {
        candidates.push(`image/characters/${raw}(\u5973).avif`);
        candidates.push(`image/characters/${raw}(\u7537).avif`);
      }

      return Array.from(new Set(candidates));
    };

    const resolveAvatarFromName = (name) => {
      if (!name) return "";
      if (typeof state.characterImageSrc === "function") {
        const src = state.characterImageSrc(name);
        if (src) return src;
      }
      const fallbackCandidates = buildAvatarPathCandidates(name);
      return fallbackCandidates[0] || "";
    };

    const findCharacterAvatarByName = (name) => {
      const target = normalizeNameForAvatar(name);
      if (!target) return "";

      let bestMatch = null;
      (editorCharacters.value || []).forEach((character) => {
        if (!character || !character.name) return;
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
            name: character.name,
          };
        }
      });

      if (bestMatch) return resolveAvatarFromName(bestMatch.name);
      return resolveAvatarFromName(name);
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
      const names = [option && option.name, slot && slot.name].filter(Boolean);
      for (let index = 0; index < names.length; index += 1) {
        const found = findCharacterAvatarByName(names[index]);
        if (found) return found;
      }

      const fallbackCandidates = names.flatMap((name) => buildAvatarPathCandidates(name));
      return fallbackCandidates[0] || "";
    };

    state.editorCurrentGuide = computed(() => {
      const current = editorSelectedCharacter.value;
      if (!current) return null;
      return current.guide || null;
    });

    state.editorGuideRows = computed(() => {
      const guide = state.editorCurrentGuide.value;
      if (!guide) return [];
      return normalizeEquipRows(guide.equipRows || []);
    });

    state.editorTeamSlots = computed(() => {
      const guide = state.editorCurrentGuide.value;
      const slots = guide && Array.isArray(guide.teamSlots) ? guide.teamSlots : [];
      const normalized = normalizeTeamSlots(slots);
      if (!normalized.length) return [];
      const trimmed = normalized.slice(0, 4);
      while (trimmed.length < 4) trimmed.push(null);
      return trimmed;
    });

    state.setEditorStrategyTab = (tab) => {
      editorStrategyTab.value = tab;
    };

    state.setEditorStrategyCategory = (category) => {
      editorStrategyCategory.value = category;
      const infoTabs = ["base", "skillsTalents", "potentials"];
      const guideTabs = ["analysis", "team", "operation"];
      if (category === "info" && !infoTabs.includes(editorStrategyTab.value)) {
        editorStrategyTab.value = "base";
      }
      if (category === "guide" && !guideTabs.includes(editorStrategyTab.value)) {
        editorStrategyTab.value = "analysis";
      }
    };

    const syncEditorSelectionByIndex = () => {
      const list = editorCharacters.value || [];
      if (!list.length) {
        editorSelectedId.value = null;
        editorSelectedIndex.value = -1;
        return;
      }
      const index = Math.max(0, Math.min(editorSelectedIndex.value, list.length - 1));
      const target = list[index];
      editorSelectedId.value = characterKey(target, index);
      editorSelectedIndex.value = index;
    };

    state.selectEditorCharacter = (key) => {
      const found = findCharacterByKey(key);
      if (!found) return;
      editorSelectedId.value = key;
      editorSelectedIndex.value = found.index;
      syncDraftsFromCharacter(found.character);
    };

    const updateEditorSelectionIfMissing = () => {
      if (!editorSelectedId.value) return;
      const found = findCharacterByKey(editorSelectedId.value);
      if (found) {
        editorSelectedIndex.value = found.index;
        return;
      }
      syncEditorSelectionByIndex();
    };

    const splitLines = (value) =>
      String(value || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const parseMaterialLine = (line) => {
      const raw = String(line || "").trim();
      if (!raw) return null;
      return raw || null;
    };

    state.updateEditorMaterialLevel = (level, value) => {
      if (!editorMaterialsDraft.value || typeof editorMaterialsDraft.value !== "object") {
        editorMaterialsDraft.value = {};
      }
      editorMaterialsDraft.value[level] = value;
      const current = editorSelectedCharacter.value;
      if (!current) return;
      ensureCharacterShape(current);
      current.materials[level] = splitLines(value)
        .map((line) => parseMaterialLine(line))
        .filter(Boolean);
    };

    state.updateEditorPotentials = (value) => {
      editorPotentialsDraft.value = value;
      const current = editorSelectedCharacter.value;
      if (!current) return;
      ensureCharacterShape(current);
      current.potentials = Array.isArray(value) ? value : [];
    };

    state.addEditorPotential = () => {
      const current = editorSelectedCharacter.value;
      if (!current) return;
      ensureCharacterShape(current);
      const list = Array.isArray(current.potentials) ? current.potentials.slice() : [];
      list.push({ name: "", description: "" });
      current.potentials = list;
      editorPotentialsDraft.value = list;
    };

    state.removeEditorPotential = (index) => {
      const current = editorSelectedCharacter.value;
      if (!current) return;
      const list = Array.isArray(current.potentials) ? current.potentials.slice() : [];
      if (index < 0 || index >= list.length) return;
      list.splice(index, 1);
      current.potentials = list;
      editorPotentialsDraft.value = list;
    };

    state.moveEditorPotential = (index, offset) => {
      const current = editorSelectedCharacter.value;
      if (!current) return;
      const list = Array.isArray(current.potentials) ? current.potentials.slice() : [];
      const target = index + offset;
      if (index < 0 || index >= list.length) return;
      if (target < 0 || target >= list.length) return;
      const item = list[index];
      list.splice(index, 1);
      list.splice(target, 0, item);
      current.potentials = list;
      editorPotentialsDraft.value = list;
    };

    state.updateEditorPotentialField = (index, field, value) => {
      const current = editorSelectedCharacter.value;
      if (!current) return;
      const list = Array.isArray(current.potentials) ? current.potentials.slice() : [];
      if (index < 0 || index >= list.length) return;
      const target = list[index];
      if (!target || typeof target !== "object") {
        list[index] = { name: "", description: "" };
      }
      const normalizedValue = String(value || "");
      if (field === "name") {
        list[index].name = normalizedValue;
      } else if (field === "description") {
        list[index].description = normalizedValue;
      }
      current.potentials = list;
      editorPotentialsDraft.value = list;
    };

    const getEditorEquipSlotValue = (row, slotIndex, key) => {
      if (!row || typeof row !== "object") return "";
      const list = Array.isArray(row.equipment) ? row.equipment : [];
      const entry = list[slotIndex];
      if (typeof entry === "string") return key === "name" ? entry : "";
      if (!entry || typeof entry !== "object") return "";
      const value = entry[key];
      return value === undefined || value === null ? "" : value;
    };

    const updateEditorEquipSlotField = (row, slotIndex, key, value) => {
      if (!row || typeof row !== "object") return;
      if (!Array.isArray(row.equipment)) row.equipment = [];
      while (row.equipment.length <= slotIndex) row.equipment.push(null);
      let entry = row.equipment[slotIndex];
      if (typeof entry === "string") {
        entry = { name: entry };
      }
      if (!entry || typeof entry !== "object") {
        entry = { name: "", icon: "", note: "", rarity: "" };
      }
      if (key === "rarity") {
        const parsed = Number(value);
        entry[key] = Number.isFinite(parsed) && value !== "" ? parsed : null;
      } else {
        entry[key] = value;
      }
      row.equipment[slotIndex] = entry;
    };

    state.getEditorEquipSlotValue = getEditorEquipSlotValue;
    state.updateEditorEquipSlotField = updateEditorEquipSlotField;
    state.clearEditorEquipSlot = (row, slotIndex) => {
      if (!row || typeof row !== "object") return;
      if (!Array.isArray(row.equipment)) row.equipment = [];
      while (row.equipment.length <= slotIndex) row.equipment.push(null);
      row.equipment[slotIndex] = null;
    };

    state.addEditorSkill = () => {
      const current = editorSelectedCharacter.value;
      if (!current) return;
      ensureCharacterShape(current);
      current.skills.push({
        name: "",
        description: "",
        icon: "",
        type: "",
        dataTables: [],
      });
    };

    state.removeEditorSkill = (index) => {
      const current = editorSelectedCharacter.value;
      if (!current || !Array.isArray(current.skills)) return;
      current.skills.splice(index, 1);
    };

    state.addEditorSkillTable = (skillIndex) => {
      const current = editorSelectedCharacter.value;
      if (!current || !Array.isArray(current.skills)) return;
      const skill = current.skills[skillIndex];
      if (!skill || typeof skill !== "object") return;
      if (!Array.isArray(skill.dataTables)) skill.dataTables = [];
      skill.dataTables.push({ title: "", rows: [] });
    };

    state.removeEditorSkillTable = (skillIndex, tableIndex) => {
      const current = editorSelectedCharacter.value;
      if (!current || !Array.isArray(current.skills)) return;
      const skill = current.skills[skillIndex];
      if (!skill || !Array.isArray(skill.dataTables)) return;
      skill.dataTables.splice(tableIndex, 1);
    };

    state.addEditorSkillRow = (skillIndex, tableIndex) => {
      const current = editorSelectedCharacter.value;
      if (!current || !Array.isArray(current.skills)) return;
      const skill = current.skills[skillIndex];
      if (!skill || !Array.isArray(skill.dataTables)) return;
      const table = skill.dataTables[tableIndex];
      if (!table || typeof table !== "object") return;
      if (!Array.isArray(table.rows)) table.rows = [];
      table.rows.push({ name: "", values: [] });
    };

    state.removeEditorSkillRow = (skillIndex, tableIndex, rowIndex) => {
      const current = editorSelectedCharacter.value;
      if (!current || !Array.isArray(current.skills)) return;
      const skill = current.skills[skillIndex];
      if (!skill || !Array.isArray(skill.dataTables)) return;
      const table = skill.dataTables[tableIndex];
      if (!table || !Array.isArray(table.rows)) return;
      table.rows.splice(rowIndex, 1);
    };

    state.addEditorTalent = () => {
      const current = editorSelectedCharacter.value;
      if (!current) return;
      ensureCharacterShape(current);
      current.talents.push({
        name: "",
        description: "",
        icon: "",
      });
    };

    state.removeEditorTalent = (index) => {
      const current = editorSelectedCharacter.value;
      if (!current || !Array.isArray(current.talents)) return;
      current.talents.splice(index, 1);
    };

    state.addEditorBaseSkill = () => {
      const current = editorSelectedCharacter.value;
      if (!current) return;
      ensureCharacterShape(current);
      current.baseSkills.push({
        name: "",
        description: "",
        icon: "",
      });
    };

    state.removeEditorBaseSkill = (index) => {
      const current = editorSelectedCharacter.value;
      if (!current || !Array.isArray(current.baseSkills)) return;
      current.baseSkills.splice(index, 1);
    };

    state.addEditorEquipRow = () => {
      const current = editorSelectedCharacter.value;
      if (!current) return;
      ensureCharacterShape(current);
      current.guide.equipRows.push({
        weapons: [],
        equipment: [null, null, null, null],
      });
    };

    state.removeEditorEquipRow = (index) => {
      const current = editorSelectedCharacter.value;
      if (!current || !current.guide || !Array.isArray(current.guide.equipRows)) return;
      current.guide.equipRows.splice(index, 1);
    };

    state.addEditorEquipWeapon = (rowIndex) => {
      const current = editorSelectedCharacter.value;
      if (!current || !current.guide || !Array.isArray(current.guide.equipRows)) return;
      const row = current.guide.equipRows[rowIndex];
      if (!row || typeof row !== "object") return;
      if (!Array.isArray(row.weapons)) row.weapons = [];
      row.weapons.push({
        name: "",
        icon: "",
        note: "",
        rarity: null,
      });
    };

    state.removeEditorEquipWeapon = (rowIndex, weaponIndex) => {
      const current = editorSelectedCharacter.value;
      if (!current || !current.guide || !Array.isArray(current.guide.equipRows)) return;
      const row = current.guide.equipRows[rowIndex];
      if (!row || !Array.isArray(row.weapons)) return;
      row.weapons.splice(weaponIndex, 1);
    };

    state.addEditorTeamSlot = () => {
      const current = editorSelectedCharacter.value;
      if (!current) return;
      ensureCharacterShape(current);
      current.guide.teamSlots.push({
        name: "",
        note: "",
        options: [],
      });
    };

    state.removeEditorTeamSlot = (slotIndex) => {
      const current = editorSelectedCharacter.value;
      if (!current || !current.guide || !Array.isArray(current.guide.teamSlots)) return;
      current.guide.teamSlots.splice(slotIndex, 1);
    };

    state.addEditorTeamOption = (slotIndex) => {
      const current = editorSelectedCharacter.value;
      if (!current || !current.guide || !Array.isArray(current.guide.teamSlots)) return;
      const slot = current.guide.teamSlots[slotIndex];
      if (!slot || typeof slot !== "object") return;
      if (!Array.isArray(slot.options)) slot.options = [];
      slot.options.push({
        name: "",
        tag: "",
        weapons: [],
        equipment: [],
      });
    };

    state.removeEditorTeamOption = (slotIndex, optionIndex) => {
      const current = editorSelectedCharacter.value;
      if (!current || !current.guide || !Array.isArray(current.guide.teamSlots)) return;
      const slot = current.guide.teamSlots[slotIndex];
      if (!slot || !Array.isArray(slot.options)) return;
      slot.options.splice(optionIndex, 1);
    };

    state.addEditorTeamWeapon = (slotIndex, optionIndex) => {
      const current = editorSelectedCharacter.value;
      if (!current || !current.guide || !Array.isArray(current.guide.teamSlots)) return;
      const slot = current.guide.teamSlots[slotIndex];
      if (!slot || !Array.isArray(slot.options)) return;
      const option = slot.options[optionIndex];
      if (!option || typeof option !== "object") return;
      if (!Array.isArray(option.weapons)) option.weapons = [];
      option.weapons.push({
        name: "",
        icon: "",
        note: "",
        rarity: null,
      });
    };

    state.removeEditorTeamWeapon = (slotIndex, optionIndex, weaponIndex) => {
      const current = editorSelectedCharacter.value;
      if (!current || !current.guide || !Array.isArray(current.guide.teamSlots)) return;
      const slot = current.guide.teamSlots[slotIndex];
      if (!slot || !Array.isArray(slot.options)) return;
      const option = slot.options[optionIndex];
      if (!option || !Array.isArray(option.weapons)) return;
      option.weapons.splice(weaponIndex, 1);
    };

    state.addEditorTeamEquip = (slotIndex, optionIndex) => {
      const current = editorSelectedCharacter.value;
      if (!current || !current.guide || !Array.isArray(current.guide.teamSlots)) return;
      const slot = current.guide.teamSlots[slotIndex];
      if (!slot || !Array.isArray(slot.options)) return;
      const option = slot.options[optionIndex];
      if (!option || typeof option !== "object") return;
      if (!Array.isArray(option.equipment)) option.equipment = [];
      option.equipment.push({
        name: "",
        icon: "",
        note: "",
        rarity: null,
      });
    };

    state.removeEditorTeamEquip = (slotIndex, optionIndex, equipIndex) => {
      const current = editorSelectedCharacter.value;
      if (!current || !current.guide || !Array.isArray(current.guide.teamSlots)) return;
      const slot = current.guide.teamSlots[slotIndex];
      if (!slot || !Array.isArray(slot.options)) return;
      const option = slot.options[optionIndex];
      if (!option || !Array.isArray(option.equipment)) return;
      option.equipment.splice(equipIndex, 1);
    };

    const normalizeIdentityValue = (value) => String(value || "").trim();

    const findIdentityConflict = (field, value, ignoreIndex) => {
      const list = editorCharacters.value || [];
      for (let index = 0; index < list.length; index += 1) {
        if (index === ignoreIndex) continue;
        const character = list[index];
        if (!character || typeof character !== "object") continue;
        const target = normalizeIdentityValue(character[field]);
        if (target && target === value) return character;
      }
      return null;
    };

    const pushIdentityNotice = (title, summary, tone = "warning") => {
      if (typeof state.pushToastNotice !== "function") return;
      state.pushToastNotice({
        title,
        summary,
        tone,
        icon: tone === "warning" ? "!" : "i",
        durationMs: 6000,
        ariaLabel: title,
      });
    };

    const resolveCurrentEditorIndex = (current) => {
      const list = editorCharacters.value || [];
      if (
        editorSelectedIndex.value >= 0 &&
        editorSelectedIndex.value < list.length &&
        list[editorSelectedIndex.value] === current
      ) {
        return editorSelectedIndex.value;
      }
      return list.indexOf(current);
    };

    state.commitEditorCharacterIdentity = (field) => {
      const current = editorSelectedCharacter.value;
      if (!current || typeof current !== "object") return;
      const draft = editorIdentityDraft.value || {};
      const normalized = normalizeIdentityValue(draft[field]);
      const currentValue = normalizeIdentityValue(current[field]);
      const currentIndex = resolveCurrentEditorIndex(current);
      if (!normalized) {
        pushIdentityNotice(field === "id" ? "ID 不能为空" : "名称不能为空", "请填写唯一内容。");
        editorIdentityDraft.value = { ...draft, [field]: currentValue };
        return;
      }
      const conflict = findIdentityConflict(field, normalized, currentIndex);
      if (conflict) {
        const conflictLabel =
          normalizeIdentityValue(conflict.name) || normalizeIdentityValue(conflict.id) || "其他角色";
        const title = field === "id" ? "ID 已存在" : "名称已存在";
        pushIdentityNotice(title, `已被 ${conflictLabel} 使用：${normalized}`);
        editorIdentityDraft.value = { ...draft, [field]: currentValue };
        return;
      }
      if (normalized !== currentValue) {
        current[field] = normalized;
      }
      const resolvedIndex = currentIndex >= 0 ? currentIndex : editorSelectedIndex.value;
      if (field === "id" || !normalizeIdentityValue(current.id)) {
        editorSelectedId.value = characterKey(current, resolvedIndex);
        editorSelectedIndex.value = resolvedIndex;
      }
      editorIdentityDraft.value = { ...draft, [field]: normalized };
    };

    const buildUniqueCandidate = (base, used) => {
      const trimmed = String(base || "").trim();
      const seed = trimmed || "new";
      let candidate = seed;
      let index = 1;
      while (used.has(candidate)) {
        candidate = `${seed}-${index}`;
        index += 1;
      }
      used.add(candidate);
      return candidate;
    };

    const ensureUniqueCharacterIdentityList = (list) => {
      if (!Array.isArray(list)) return list;
      const usedIds = new Set();
      const usedNames = new Set();
      list.forEach((character, index) => {
        if (!character || typeof character !== "object") return;
        const rawId = String(character.id || "").trim();
        const rawName = String(character.name || "").trim();
        const baseName = rawName || rawId || `New Character ${index + 1}`;
        const uniqueName = buildUniqueCandidate(baseName, usedNames);
        if (uniqueName !== rawName) character.name = uniqueName;
        const baseId = rawId || uniqueName;
        const uniqueId = buildUniqueCandidate(baseId, usedIds);
        if (uniqueId !== rawId) character.id = uniqueId;
      });
      return list;
    };

    const resolveUniqueCharacterIdentity = (baseId, baseName, list) => {
      const usedIds = new Set();
      const usedNames = new Set();
      (list || []).forEach((character) => {
        if (!character || typeof character !== "object") return;
        const id = String(character.id || "").trim();
        const name = String(character.name || "").trim();
        if (id) usedIds.add(id);
        if (name) usedNames.add(name);
      });
      const uniqueName = buildUniqueCandidate(baseName || "New Character", usedNames);
      const uniqueId = buildUniqueCandidate(baseId || uniqueName, usedIds);
      return { id: uniqueId, name: uniqueName };
    };

    let pendingEditorDelete = null;
    const pushUndoDeleteNotice = (title, summary, onActivate) => {
      if (typeof state.pushToastNotice !== "function") return;
      state.pushToastNotice({
        title,
        summary,
        onActivate,
        tone: "warning",
        icon: "!",
        durationMs: 8000,
        ariaLabel: title,
      });
    };
    const pushUndoResultNotice = (title, summary, tone = "info") => {
      if (typeof state.pushToastNotice !== "function") return;
      state.pushToastNotice({
        title,
        summary,
        tone,
        icon: tone === "info" ? "i" : "!",
        durationMs: 6000,
        ariaLabel: title,
      });
    };

    const parseJsonField = (value, fallback, fieldKey) => {
      const trimmed = String(value || "").trim();
      if (!trimmed) return fallback;
      try {
        return JSON.parse(trimmed);
      } catch (error) {
        editorJsonErrors.value = {
          ...editorJsonErrors.value,
          [fieldKey]: "JSON 解析失败，请检查格式。",
        };
        return null;
      }
    };

    state.syncEditorJsonField = (fieldKey) => {
      if (!editorJsonErrors.value) editorJsonErrors.value = {};
      if (editorJsonErrors.value[fieldKey]) {
        editorJsonErrors.value = {
          ...editorJsonErrors.value,
          [fieldKey]: "",
        };
      }
    };

    state.formatEditorJsonField = (fieldKey) => {
      const defaults = {
        skills: [],
        talents: [],
        baseSkills: [],
        guide: {},
      };
      const parsed = parseJsonField(editorJsonDraft.value[fieldKey], defaults[fieldKey], fieldKey);
      if (parsed === null) return;
      editorJsonDraft.value = {
        ...editorJsonDraft.value,
        [fieldKey]: JSON.stringify(parsed, null, 2),
      };
      editorJsonErrors.value = {
        ...editorJsonErrors.value,
        [fieldKey]: "",
      };
    };

    state.applyEditorJsonField = (fieldKey) => {
      const defaults = {
        skills: [],
        talents: [],
        baseSkills: [],
        guide: {},
      };
      const parsed = parseJsonField(editorJsonDraft.value[fieldKey], defaults[fieldKey], fieldKey);
      if (parsed === null) return;
      const current = editorSelectedCharacter.value;
      if (!current) return;
      current[fieldKey] = parsed;
      editorJsonErrors.value = {
        ...editorJsonErrors.value,
        [fieldKey]: "",
      };
      syncDraftsFromCharacter(current);
    };

    state.addEditorCharacter = () => {
      const newCharacter = {
        id: "",
        name: "New Character",
        rarity: 5,
        element: "",
        weaponType: "",
        mainAbility: "",
        subAbility: "",
        role: "",
        profession: "",
        stats: buildDefaultStats(),
        skills: [],
        talents: [],
        baseSkills: [],
        potentials: [],
        materials: {
          elite1: [],
          elite2: [],
          elite3: [],
          elite4: [],
        },
        guide: {
          equipRows: [],
          analysis: "",
          teamTips: "",
          operationTips: "",
          teamSlots: [],
        },
      };
      const list = editorCharacters.value || [];
      const uniqueIdentity = resolveUniqueCharacterIdentity(newCharacter.id, newCharacter.name, list);
      newCharacter.id = uniqueIdentity.id;
      newCharacter.name = uniqueIdentity.name;
      list.push(newCharacter);
      editorCharacters.value = list;
      const key = characterKey(newCharacter, list.length - 1);
      editorSelectedIndex.value = list.length - 1;
      state.selectEditorCharacter(key);
    };

    state.removeEditorCharacter = () => {
      const key = editorSelectedId.value;
      if (!key) return;
      const found = findCharacterByKey(key);
      if (!found) return;
      const displayName = String(found.character.name || found.character.id || "角色").trim() || "角色";
      const snapshot = {
        token: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        character: safeClone(found.character),
        index: found.index,
        mode: editorBaseKeySet.has(key) ? "replace" : "remove",
      };
      const attemptUndoDelete = () => {
        if (!pendingEditorDelete || pendingEditorDelete.token !== snapshot.token) return;
        const currentList = editorCharacters.value || [];
        const working = currentList.slice();
        const targetIndex = Math.min(snapshot.index, working.length);
        if (snapshot.mode === "replace" && targetIndex < working.length) {
          working.splice(targetIndex, 1);
        }
        const restored = safeClone(snapshot.character);
        const resolved = resolveUniqueCharacterIdentity(restored.id, restored.name, working);
        const identityChanged =
          resolved.id !== String(restored.id || "").trim() ||
          resolved.name !== String(restored.name || "").trim();
        restored.id = resolved.id;
        restored.name = resolved.name;
        const insertIndex = Math.min(snapshot.index, working.length);
        working.splice(insertIndex, 0, restored);
        editorCharacters.value = working;
        editorSelectedIndex.value = insertIndex;
        editorSelectedId.value = characterKey(working[insertIndex], insertIndex);
        syncDraftsFromCharacter(working[insertIndex]);
        pendingEditorDelete = null;
        if (identityChanged) {
          pushUndoResultNotice("已撤销删除", "因 ID 或名称冲突已自动调整。");
        } else {
          pushUndoResultNotice("已撤销删除", "已恢复角色内容。");
        }
      };

      if (editorBaseKeySet.has(key)) {
        const baseCharacter = editorBaseMap.get(key);
        if (baseCharacter) {
          const list = editorCharacters.value || [];
          list[found.index] = safeClone(baseCharacter);
          editorCharacters.value = list;
          editorSelectedIndex.value = found.index;
          editorSelectedId.value = characterKey(list[found.index], found.index);
          syncDraftsFromCharacter(list[found.index]);
          pendingEditorDelete = snapshot;
          pushUndoDeleteNotice(
            "基准角色已恢复默认内容",
            `已重置 ${displayName}，点击通知撤销。`,
            attemptUndoDelete
          );
          return;
        }
      }
      const list = editorCharacters.value || [];
      list.splice(found.index, 1);
      editorCharacters.value = list;
      if (!list.length) {
        editorSelectedId.value = null;
        editorSelectedIndex.value = -1;
        syncDraftsFromCharacter(null);
        pendingEditorDelete = snapshot;
        pushUndoDeleteNotice("角色已删除", `已删除 ${displayName}，点击通知撤销。`, attemptUndoDelete);
        return;
      }
      const nextIndex = Math.min(found.index, list.length - 1);
      editorSelectedIndex.value = nextIndex;
      editorSelectedId.value = characterKey(list[nextIndex], nextIndex);
      syncDraftsFromCharacter(list[nextIndex]);
      pendingEditorDelete = snapshot;
      pushUndoDeleteNotice("角色已删除", `已删除 ${displayName}，点击通知撤销。`, attemptUndoDelete);
    };

    const normalizeLineEntries = (entries) =>
      entries
        .map((item) => String(item || "").trim())
        .filter(Boolean);

    const normalizeGuideName = (entry) => {
      if (!entry) return "";
      if (typeof entry === "string") return entry.trim();
      return String(entry.name || "").trim();
    };

    const pushIssue = (issues, issueMap, level, key, title, message) => {
      issues.push({ level, title, message, key });
      if (!key) return;
      const current = issueMap[key];
      if (!current || (current === "warn" && level === "error")) {
        issueMap[key] = level;
      }
    };

    state.runEditorValidation = () => {
      const list = editorCharacters.value || [];
      const issues = [];
      const issueMap = {};
      const idMap = new Map();
      const nameMap = new Map();
      const weaponNames = new Set(
        (Array.isArray(window.WEAPONS) ? window.WEAPONS : []).map((w) => w.name)
      );
      const equipNames = new Set(
        (Array.isArray(window.EQUIPS) ? window.EQUIPS : []).map((e) => e.name)
      );

      list.forEach((character, index) => {
        if (!character || typeof character !== "object") return;
        const key = characterKey(character, index);
        const id = String(character.id || "").trim();
        const name = String(character.name || "").trim();
        if (!id) {
          pushIssue(issues, issueMap, "error", key, "角色缺少 ID", "请填写唯一 ID。");
        }
        if (!name) {
          pushIssue(issues, issueMap, "error", key, "角色缺少名称", "请填写角色名称。");
        }
        if (id) {
          if (idMap.has(id)) {
            pushIssue(issues, issueMap, "error", key, "ID 重复", `与 ${idMap.get(id)} 重复。`);
          } else {
            idMap.set(id, name || id);
          }
        }
        if (name) {
          if (nameMap.has(name)) {
            pushIssue(issues, issueMap, "error", key, "名称重复", `与 ${nameMap.get(name)} 重复。`);
          } else {
            nameMap.set(name, id || name);
          }
        }

        const guide = character.guide;
        if (guide && typeof guide === "object") {
          const equipRows = Array.isArray(guide.equipRows) ? guide.equipRows : [];
          equipRows.forEach((row) => {
            const weapons = Array.isArray(row && row.weapons) ? row.weapons : [];
            weapons.forEach((weapon) => {
              const weaponName = normalizeGuideName(weapon);
              if (weaponName && weaponNames.size && !weaponNames.has(weaponName)) {
                pushIssue(issues, issueMap, "warn", key, "武器名称不存在", `未找到武器：${weaponName}`);
              }
            });
            const equipment = Array.isArray(row && row.equipment) ? row.equipment : [];
            equipment.forEach((equip) => {
              const equipName = normalizeGuideName(equip);
              if (equipName && equipNames.size && !equipNames.has(equipName)) {
                pushIssue(issues, issueMap, "warn", key, "装备名称不存在", `未找到装备：${equipName}`);
              }
            });
          });
          const teamSlots = Array.isArray(guide.teamSlots) ? guide.teamSlots : [];
          teamSlots.forEach((slot) => {
            const options = Array.isArray(slot && slot.options) ? slot.options : [];
            options.forEach((option) => {
              const weapons = Array.isArray(option && option.weapons) ? option.weapons : [];
              weapons.forEach((weapon) => {
                const weaponName = normalizeGuideName(weapon);
                if (weaponName && weaponNames.size && !weaponNames.has(weaponName)) {
                  pushIssue(issues, issueMap, "warn", key, "武器名称不存在", `未找到武器：${weaponName}`);
                }
              });
              const equipment = Array.isArray(option && option.equipment) ? option.equipment : [];
              equipment.forEach((equip) => {
                const equipName = normalizeGuideName(equip);
                if (equipName && equipNames.size && !equipNames.has(equipName)) {
                  pushIssue(issues, issueMap, "warn", key, "装备名称不存在", `未找到装备：${equipName}`);
                }
              });
            });
          });
        }
      });

      editorIssues.value = issues;
      editorIssueMap.value = issueMap;
    };

    state.applyEditorAutoFix = () => {
      const list = editorCharacters.value || [];
      list.forEach((character) => {
        if (!character || typeof character !== "object") return;
        ensureCharacterShape(character);
        if (character.id) character.id = String(character.id).trim();
        if (character.name) character.name = String(character.name).trim();
        if (Array.isArray(character.potentials)) {
          character.potentials = normalizePotentialEntries(character.potentials);
        }
        if (character.materials && typeof character.materials === "object") {
          editorMaterialLevels.forEach((level) => {
            if (Array.isArray(character.materials[level])) {
              character.materials[level] = normalizeLineEntries(character.materials[level]);
            }
          });
        }
      });
      ensureUniqueCharacterIdentityList(list);
      editorCharacters.value = list;
      state.runEditorValidation();
    };

    state.resetEditorChanges = () => {
      suspendDirtyWatch = true;
      editorCharacters.value = safeClone(editorBaselineData || []);
      editorDirty.value = false;
      editorIssues.value = [];
      editorIssueMap.value = {};
      editorImportError.value = "";
      editorLoadError.value = "";
      const list = editorCharacters.value || [];
      if (list.length) {
        editorSelectedIndex.value = 0;
        editorSelectedId.value = characterKey(list[0], 0);
        syncDraftsFromCharacter(list[0]);
      } else {
        editorSelectedIndex.value = -1;
        editorSelectedId.value = null;
        syncDraftsFromCharacter(null);
      }
      nextTick(() => {
        suspendDirtyWatch = false;
      });
    };

    const buildExportScript = (list) => {
      const lines = [];
      lines.push("(function () {");
      lines.push("  window.characters = window.characters || [];");
      list.forEach((character) => {
        const payload = JSON.stringify(character, null, 2);
        const indented = payload
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n");
        lines.push(`  window.characters.push(${indented});`);
      });
      lines.push("})();");
      return lines.join("\n");
    };

    const triggerDownload = (filename, content) => {
      if (typeof document === "undefined") return;
      const blob = new Blob([content], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };

    state.exportEditorData = () => {
      const current = editorSelectedCharacter.value;
      if (!current) return;
      const sanitizeFilePart = (value, fallback) => {
        const raw = String(value || "").trim();
        if (!raw) return fallback;
        return raw.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "-").trim() || fallback;
      };
      const namePart = sanitizeFilePart(current.name, "character");
      const idPart = sanitizeFilePart(current.id, "unknown");
      const filename = `character-${namePart}-${idPart}.js`;
      const content = buildExportScript([current]);
      triggerDownload(filename, content);
    };

    state.triggerEditorImport = () => {
      if (editorImportInput.value && typeof editorImportInput.value.click === "function") {
        editorImportInput.value.click();
      }
    };

    const parseCharactersFromScript = (source) => {
      try {
        const parsed = JSON.parse(source);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        throw new Error("Invalid format: expected JSON array");
      } catch (jsonError) {
        const scriptPattern = /^\s*\(function\s*\(\)\s*\{[\s\S]*window\.characters[\s\S]*\}\)\(\);?\s*$/;
        if (!scriptPattern.test(source)) {
          throw new Error("Invalid script format: only JSON or safe character export scripts are allowed");
        }
        const sandbox = { characters: [] };
        const sandboxWindow = { characters: sandbox.characters };
        const fn = new Function(
          "window",
          "self",
          "globalThis",
          `"use strict";\n${source}\n;return window.characters;`
        );
        const result = fn(sandboxWindow, sandboxWindow, sandboxWindow);
        return Array.isArray(result) ? result : sandbox.characters;
      }
    };

    state.handleEditorImportFile = async (event) => {
      const file = event && event.target && event.target.files ? event.target.files[0] : null;
      if (!file) return;
      editorImportFileName.value = file.name || "";
      editorImportError.value = "";
      try {
        const text = await file.text();
        const parsed = parseCharactersFromScript(text);
        if (!Array.isArray(parsed) || !parsed.length) {
          editorImportError.value = "未检测到角色数据，请确认导入的脚本格式。";
          return;
        }
        const cloned = safeClone(parsed);
        const existing = safeClone(editorCharacters.value || []);
        const resolveImportKey = (character, fallbackIndex) => {
          if (!character || typeof character !== "object") return `index:${fallbackIndex}`;
          const id = String(character.id || "").trim();
          if (id) return `id:${id}`;
          const name = String(character.name || "").trim();
          if (name) return `name:${name}`;
          return `index:${fallbackIndex}`;
        };
        const mergeImportedCharacters = (baseList, incomingList) => {
          const merged = Array.isArray(baseList) ? baseList.slice() : [];
          const keyIndexMap = new Map();
          merged.forEach((character, index) => {
            keyIndexMap.set(resolveImportKey(character, index), index);
          });
          incomingList.forEach((character, index) => {
            if (!character || typeof character !== "object") return;
            ensureCharacterShape(character);
            const key = resolveImportKey(character, index);
            const existingIndex = keyIndexMap.get(key);
            if (existingIndex === undefined) {
              merged.push(character);
              keyIndexMap.set(key, merged.length - 1);
            } else {
              merged[existingIndex] = character;
            }
          });
          return merged;
        };
        const merged = mergeImportedCharacters(existing, cloned);
        ensureUniqueCharacterIdentityList(merged);
        const previousKey = editorSelectedId.value;
        suspendDirtyWatch = true;
        editorCharacters.value = merged;
        setEditorBaseline(merged);
        editorIssues.value = [];
        editorIssueMap.value = {};
        let selection = null;
        if (previousKey) {
          const found = findCharacterByKey(previousKey);
          if (found) selection = found;
        }
        if (!selection && cloned.length === 1) {
          const imported = cloned[0];
          const importedId = String(imported.id || "").trim();
          const importedName = String(imported.name || "").trim();
          for (let index = 0; index < merged.length; index += 1) {
            const current = merged[index];
            if (!current) continue;
            if (importedId && String(current.id || "").trim() === importedId) {
              selection = { character: current, index };
              break;
            }
            if (importedName && String(current.name || "").trim() === importedName) {
              selection = { character: current, index };
              break;
            }
          }
        }
        if (!selection && merged.length) {
          selection = { character: merged[0], index: 0 };
        }
        if (selection) {
          editorSelectedIndex.value = selection.index;
          editorSelectedId.value = characterKey(selection.character, selection.index);
          syncDraftsFromCharacter(selection.character);
        } else {
          editorSelectedIndex.value = -1;
          editorSelectedId.value = null;
          syncDraftsFromCharacter(null);
        }
        nextTick(() => {
          suspendDirtyWatch = false;
        });
      } catch (error) {
        editorImportError.value = "导入失败，请检查文件内容。";
      } finally {
        if (event && event.target) {
          event.target.value = "";
        }
      }
    };

    const resolveCharacterScripts = () => {
      if (typeof window === "undefined") return [];
      const raw = Array.isArray(window.__APP_CHARACTER_SCRIPTS__)
        ? window.__APP_CHARACTER_SCRIPTS__
        : [];
      const normalized = raw.map((src) => String(src || "").trim()).filter(Boolean);
      const unique = Array.from(new Set(normalized));
      return unique.filter((src) => src !== "./data/characters.js");
    };

    const resolveStorageLists = (payload, baseList) => {
      const overrides = Array.isArray(payload && payload.overrides) ? safeClone(payload.overrides) : [];
      const customs = Array.isArray(payload && payload.customs)
        ? safeClone(payload.customs)
        : Array.isArray(payload && payload.custom)
          ? safeClone(payload.custom)
          : [];
      const selectedId = (payload && payload.selectedId) || null;
      if ((!overrides.length && !customs.length) && Array.isArray(payload && payload.characters)) {
        const legacyList = safeClone(payload.characters || []);
        if (Array.isArray(baseList) && baseList.length) {
          const baseKeySet = new Set(
            baseList.map((character, index) => characterKey(character, index)).filter(Boolean)
          );
          legacyList.forEach((character, index) => {
            const key = characterKey(character, index);
            if (key && baseKeySet.has(key)) {
              overrides.push(character);
            } else {
              customs.push(character);
            }
          });
        } else {
          customs.push(...legacyList);
        }
      }
      return { overrides, customs, selectedId };
    };

    const applyEditorStoragePayload = (payload, baseList) => {
      if (!payload) return false;
      const { overrides, customs, selectedId } = resolveStorageLists(payload, baseList);
      if (!overrides.length && !customs.length && !(Array.isArray(baseList) && baseList.length)) {
        return false;
      }
      const overrideMap = new Map();
      overrides.forEach((character, index) => {
        const key = characterKey(character, index);
        if (key) overrideMap.set(key, character);
      });
      const mergedBase = Array.isArray(baseList) && baseList.length
        ? baseList.map((character, index) => {
            const key = characterKey(character, index);
            const override = key ? overrideMap.get(key) : null;
            return safeClone(override || character);
          })
        : [];
      const merged = mergedBase.concat(customs.map((character) => safeClone(character)));
      merged.forEach((character) => ensureCharacterShape(character));
      ensureUniqueCharacterIdentityList(merged);
      editorCharacters.value = merged;
      setEditorBaseline(merged);
      if (selectedId) {
        const found = findCharacterByKey(selectedId);
        if (found) {
          editorSelectedIndex.value = found.index;
          editorSelectedId.value = selectedId;
          syncDraftsFromCharacter(found.character);
          return true;
        }
      }
      if (merged.length) {
        editorSelectedIndex.value = 0;
        editorSelectedId.value = characterKey(merged[0], 0);
        syncDraftsFromCharacter(merged[0]);
      } else {
        editorSelectedIndex.value = -1;
        editorSelectedId.value = null;
        syncDraftsFromCharacter(null);
      }
      return true;
    };

    let pendingLoad = null;
    const ensureEditorDataLoaded = async () => {
      if (editorCharacters.value && editorCharacters.value.length) return true;
      const storedPayload = readEditorStorage();
      if (Array.isArray(window.characters) && window.characters.length) {
        const baseList = setEditorBaseCharacters(window.characters);
        if (storedPayload && applyEditorStoragePayload(storedPayload, baseList)) {
          editorLoadError.value = "";
          return true;
        }
        editorCharacters.value = baseList;
        setEditorBaseline(baseList);
        if (baseList.length) {
          editorSelectedIndex.value = 0;
          editorSelectedId.value = characterKey(baseList[0], 0);
          syncDraftsFromCharacter(baseList[0]);
        }
        return true;
      }
      if (pendingLoad) return pendingLoad;
      if (typeof state.loadScriptOnce !== "function") {
        editorLoadError.value = "未找到脚本加载器，无法自动加载角色数据。";
        return false;
      }
      pendingLoad = (async () => {
        let warningText = "";
        try {
          let hadFailure = false;
          await state.loadScriptOnce("./data/characters.js");
          const characterScripts = resolveCharacterScripts();
          for (let index = 0; index < characterScripts.length; index += 1) {
            const script = characterScripts[index];
            try {
              await state.loadScriptOnce(script);
            } catch (error) {
              hadFailure = true;
              if (typeof console !== "undefined" && typeof console.warn === "function") {
                console.warn("[editor] Failed to load character script:", script, error);
              }
            }
          }
          warningText = hadFailure ? "部分角色脚本加载失败，已忽略缺失文件。" : "";
          if (Array.isArray(window.characters)) {
            const baseList = setEditorBaseCharacters(window.characters);
            if (storedPayload && applyEditorStoragePayload(storedPayload, baseList)) {
              editorLoadError.value = warningText;
              return true;
            }
            editorCharacters.value = baseList;
            setEditorBaseline(baseList);
            if (baseList.length) {
              editorSelectedIndex.value = 0;
              editorSelectedId.value = characterKey(baseList[0], 0);
              syncDraftsFromCharacter(baseList[0]);
            }
            editorLoadError.value = warningText;
            return true;
          }
          if (storedPayload && applyEditorStoragePayload(storedPayload, [])) {
            editorLoadError.value = warningText || "未能加载最新角色数据，已使用本地草稿。";
            return true;
          }
          editorLoadError.value = warningText || "角色数据未能加载，请稍后重试。";
          return false;
        } catch (error) {
          if (storedPayload && applyEditorStoragePayload(storedPayload, [])) {
            editorLoadError.value = warningText || "未能加载最新角色数据，已使用本地草稿。";
            return true;
          }
          editorLoadError.value = warningText || "角色数据加载失败，请稍后重试。";
          return false;
        } finally {
          pendingLoad = null;
        }
      })();
      return pendingLoad;
    };

    watch(
      editorCharacters,
      () => {
        if (suspendDirtyWatch) return;
        editorDirty.value = serializeCharacters(editorCharacters.value) !== editorBaselineSnapshot;
      },
      { deep: true }
    );

    watch(
      () => editorSelectedId.value,
      (key) => {
        if (!key) {
          syncDraftsFromCharacter(null);
          return;
        }
        const found = findCharacterByKey(key);
        if (found) {
          editorSelectedIndex.value = found.index;
          syncDraftsFromCharacter(found.character);
        }
      }
    );

    watch(
      editorCharacters,
      () => {
        updateEditorSelectionIfMissing();
      },
      { deep: true }
    );

    watch(
      [editorCharacters, () => editorSelectedId.value],
      () => {
        writeEditorStorage(editorCharacters.value);
      },
      { deep: true }
    );

    watch(
      () => state.currentView && state.currentView.value,
      (view) => {
        if (view === "editor") {
          ensureEditorStyles();
          ensureEditorDataLoaded();
        }
      },
      { immediate: true }
    );
  };
})();
