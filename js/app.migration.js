(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initMigration = function initMigration(ctx, state) {
    const { computed, watch, onMounted } = ctx;

    const defaultMark = { weaponOwned: false, essenceOwned: false, note: "" };

    const getStoredDecision = () => {
      try {
        const raw = localStorage.getItem(state.migrationStorageKey);
        if (!raw) return { status: "pending" };
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return { status: "pending" };
        const status = typeof parsed.status === "string" ? parsed.status : "pending";
        return { ...parsed, status };
      } catch (error) {
        return { status: "pending" };
      }
    };

    const saveDecision = (status, extra) => {
      try {
        localStorage.setItem(
          state.migrationStorageKey,
          JSON.stringify({
            status,
            updatedAt: Date.now(),
            ...(extra || {}),
          })
        );
      } catch (error) {
        // ignore storage errors
      }
    };

    const clearLegacySources = () => {
      try {
        localStorage.removeItem(state.legacyMarksStorageKey);
        localStorage.removeItem(state.legacyExcludedKey);
      } catch (error) {
        // ignore storage errors
      }
      state.legacyMigrationMarks.value = {};
    };

    const normalizeCurrentMark = (name, map) => {
      const source = map || state.weaponMarks.value || {};
      if (!Object.prototype.hasOwnProperty.call(source, name)) {
        return { ...defaultMark };
      }
      const mark = source[name];
      if (!mark || typeof mark !== "object") {
        return { ...defaultMark };
      }
      return {
        weaponOwned: typeof mark.weaponOwned === "boolean" ? mark.weaponOwned : false,
        essenceOwned: typeof mark.essenceOwned === "boolean" ? mark.essenceOwned : false,
        note: typeof mark.note === "string" ? mark.note : "",
      };
    };

    const normalizeForStore = (mark) => {
      const weaponOwned = typeof mark.weaponOwned === "boolean" ? mark.weaponOwned : false;
      const essenceOwned = typeof mark.essenceOwned === "boolean" ? mark.essenceOwned : false;
      const note = typeof mark.note === "string" ? mark.note : "";
      const normalized = {};
      if (weaponOwned) normalized.weaponOwned = true;
      if (essenceOwned) normalized.essenceOwned = true;
      if (note) normalized.note = note;
      return Object.keys(normalized).length ? normalized : null;
    };

    const buildPatchByMapping = (legacyEntry, mappingMode) => {
      const patch = {};
      if (legacyEntry && legacyEntry.excluded) {
        if (mappingMode === "weaponUnowned") {
          patch.weaponOwned = false;
        } else {
          patch.essenceOwned = true;
        }
      }
      return patch;
    };

    const detectConflict = (current, patch, note, hasCurrentStored, currentRaw) => {
      if (!hasCurrentStored) return false;
      const raw = currentRaw && typeof currentRaw === "object" ? currentRaw : {};
      const hasStatusConflict = Object.keys(patch).some((key) => {
        if (!Object.prototype.hasOwnProperty.call(raw, key)) return false;
        return current[key] !== patch[key];
      });
      const hasNoteConflict = Boolean(
        note &&
          Object.prototype.hasOwnProperty.call(raw, "note") &&
          current.note &&
          current.note !== note
      );
      return hasStatusConflict || hasNoteConflict;
    };

    const migrationPreview = computed(() => {
      const legacy = state.legacyMigrationMarks.value || {};
      const names = Object.keys(legacy);
      const mappingMode = state.migrationMappingMode.value || "essenceOwned";
      const currentMap = state.weaponMarks.value || {};

      let effectCount = 0;
      let conflictCount = 0;
      let statusChangeCount = 0;
      let noteChangeCount = 0;

      names.forEach((name) => {
        const entry = legacy[name];
        if (!entry || typeof entry !== "object") return;
        const hasCurrentStored = Object.prototype.hasOwnProperty.call(currentMap, name);
        const currentRaw = hasCurrentStored ? currentMap[name] : null;
        const current = normalizeCurrentMark(name, currentMap);
        const patch = buildPatchByMapping(entry, mappingMode);
        const note = typeof entry.note === "string" ? entry.note : "";

        const hasStatusChange = Object.keys(patch).some((key) => current[key] !== patch[key]);
        const hasNoteChange = Boolean(note && current.note !== note);
        if (!hasStatusChange && !hasNoteChange) return;

        effectCount += 1;
        if (hasStatusChange) statusChangeCount += 1;
        if (hasNoteChange) noteChangeCount += 1;

        if (detectConflict(current, patch, note, hasCurrentStored, currentRaw)) {
          conflictCount += 1;
        }
      });

      return {
        totalLegacyCount: names.length,
        effectCount,
        conflictCount,
        statusChangeCount,
        noteChangeCount,
      };
    });

    const hasLegacyData = computed(() =>
      Object.keys(state.legacyMigrationMarks.value || {}).length > 0
    );

    const shouldShowConflictStrategy = computed(
      () => migrationPreview.value.conflictCount > 0
    );

    const migrationConflictOptions = [
      {
        value: "fillMissing",
        label: "仅补全缺失（推荐）",
        description: "只写入当前没有新版标记的武器，避免覆盖你已手动维护的新数据。",
      },
      {
        value: "overwriteLegacy",
        label: "旧数据覆盖新数据",
        description: "旧数据优先，冲突条目将按本次迁移方案覆盖当前新版标记。",
      },
      {
        value: "keepCurrent",
        label: "保留新数据，跳过冲突",
        description: "冲突条目保持当前新版标记，仅迁移不冲突条目。",
      },
    ];

    const closeMigrationModals = () => {
      state.showMigrationConfirmModal.value = false;
      state.migrationConfirmAction.value = "";
      state.showMigrationModal.value = false;
    };

    const applyMigration = () => {
      const legacy = state.legacyMigrationMarks.value || {};
      const names = Object.keys(legacy);
      if (!names.length) {
        closeMigrationModals();
        return;
      }

      const mappingMode = state.migrationMappingMode.value || "essenceOwned";
      const strategy = state.migrationConflictStrategy.value || "fillMissing";
      const currentMap = { ...(state.weaponMarks.value || {}) };

      names.forEach((name) => {
        const entry = legacy[name];
        if (!entry || typeof entry !== "object") return;
        const hasCurrentStored = Object.prototype.hasOwnProperty.call(currentMap, name);
        const currentRaw = hasCurrentStored ? currentMap[name] : null;
        const current = normalizeCurrentMark(name, currentMap);
        const patch = buildPatchByMapping(entry, mappingMode);
        const note = typeof entry.note === "string" ? entry.note : "";

        const hasStatusChange = Object.keys(patch).some((key) => current[key] !== patch[key]);
        const hasNoteChange = Boolean(note && current.note !== note);
        if (!hasStatusChange && !hasNoteChange) return;

        const conflict = detectConflict(current, patch, note, hasCurrentStored, currentRaw);

        let shouldApply = !conflict;
        if (conflict) {
          if (strategy === "overwriteLegacy") {
            shouldApply = true;
          } else if (strategy === "keepCurrent") {
            shouldApply = false;
          } else {
            shouldApply = !hasCurrentStored;
          }
        }

        if (!shouldApply) return;

        const next = { ...current };
        Object.keys(patch).forEach((key) => {
          next[key] = patch[key];
        });

        if (note) {
          if (strategy === "overwriteLegacy") {
            next.note = note;
          } else if (!next.note) {
            next.note = note;
          }
        }

        const normalized = normalizeForStore(next);
        if (!normalized) {
          delete currentMap[name];
        } else {
          currentMap[name] = normalized;
        }
      });

      state.weaponMarks.value = currentMap;
      clearLegacySources();
      saveDecision("done", {
        mappingMode: state.migrationMappingMode.value,
        conflictStrategy: state.migrationConflictStrategy.value,
      });
      closeMigrationModals();
    };

    const discardLegacy = () => {
      clearLegacySources();
      saveDecision("discarded");
      closeMigrationModals();
    };

    const deferMigration = () => {
      saveDecision("deferred");
      closeMigrationModals();
    };

    const openMigrationConfirm = (action) => {
      state.migrationConfirmAction.value = action;
      state.showMigrationConfirmModal.value = true;
    };

    const closeMigrationConfirm = () => {
      state.showMigrationConfirmModal.value = false;
      state.migrationConfirmAction.value = "";
    };

    const confirmMigrationAction = () => {
      const action = state.migrationConfirmAction.value;
      if (action === "apply") {
        applyMigration();
        return;
      }
      if (action === "discard") {
        discardLegacy();
        return;
      }
      if (action === "defer") {
        deferMigration();
        return;
      }
      closeMigrationConfirm();
    };

    const ensureValidConflictStrategy = () => {
      if (!shouldShowConflictStrategy.value) return;
      const valid = migrationConflictOptions.some(
        (item) => item.value === state.migrationConflictStrategy.value
      );
      if (!valid) {
        state.migrationConflictStrategy.value = "fillMissing";
      }
    };

    const maybeAutoOpenMigrationModal = () => {
      if (!hasLegacyData.value) {
        state.showMigrationModal.value = false;
        state.showMigrationConfirmModal.value = false;
        return;
      }
      const decision = getStoredDecision();
      if (decision.status === "done" || decision.status === "discarded") {
        state.showMigrationModal.value = false;
        state.showMigrationConfirmModal.value = false;
        return;
      }
      state.showMigrationModal.value = true;
    };

    watch(hasLegacyData, () => {
      maybeAutoOpenMigrationModal();
    });

    watch(
      () => state.migrationMappingMode.value,
      () => {
        ensureValidConflictStrategy();
      }
    );

    watch(
      shouldShowConflictStrategy,
      (hasConflict) => {
        if (!hasConflict) {
          state.migrationConflictStrategy.value = "fillMissing";
          return;
        }
        ensureValidConflictStrategy();
      },
      { immediate: true }
    );

    onMounted(() => {
      maybeAutoOpenMigrationModal();
    });

    state.hasLegacyMigrationData = hasLegacyData;
    state.migrationPreview = migrationPreview;
    state.shouldShowConflictStrategy = shouldShowConflictStrategy;
    state.migrationConflictOptions = migrationConflictOptions;
    state.openMigrationConfirm = openMigrationConfirm;
    state.closeMigrationConfirm = closeMigrationConfirm;
    state.confirmMigrationAction = confirmMigrationAction;
  };
})();
