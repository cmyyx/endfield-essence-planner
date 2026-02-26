(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initMigration = function initMigration(ctx, state) {
    const { computed, watch, onMounted, onBeforeUnmount, nextTick } = ctx;

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
      return getWeaponMarkFromMap(name, map || state.weaponMarks.value || {});
    };

    const normalizeForStore = (mark) => {
      return compactWeaponMark(mark);
    };

    const getMigrationTargetNames = (legacy, mappingMode) => {
      const legacyNames = Object.keys(legacy || {});
      if (mappingMode !== "weaponUnowned") return legacyNames;
      const result = [];
      const seen = new Set();
      const catalog = Array.isArray(weapons) ? weapons : [];
      catalog.forEach((weapon) => {
        const name = weapon && typeof weapon.name === "string" ? weapon.name : "";
        if (!name || seen.has(name)) return;
        seen.add(name);
        result.push(name);
      });
      legacyNames.forEach((name) => {
        if (!name || seen.has(name)) return;
        seen.add(name);
        result.push(name);
      });
      return result;
    };

    const buildPatchByMapping = (legacyEntry, mappingMode) => {
      const patch = {};
      if (mappingMode === "weaponUnowned") {
        patch.weaponOwned = !(legacyEntry && legacyEntry.excluded);
        return patch;
      }
      if (legacyEntry && legacyEntry.excluded) {
        patch.essenceOwned = true;
      }
      return patch;
    };

    const detectConflictFields = (current, patch, note, hasCurrentStored, currentRaw) => {
      if (!hasCurrentStored) return [];
      const raw = currentRaw && typeof currentRaw === "object" ? currentRaw : {};
      const fields = [];
      Object.keys(patch).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(raw, key) && current[key] !== patch[key]) {
          fields.push(key);
        }
      });
      if (note && Object.prototype.hasOwnProperty.call(raw, "note") && current.note !== note) {
        fields.push("note");
      }
      return fields;
    };

    const detectConflict = (current, patch, note, hasCurrentStored, currentRaw) => {
      return detectConflictFields(current, patch, note, hasCurrentStored, currentRaw).length > 0;
    };

    const migrationPreview = computed(() => {
      const legacy = state.legacyMigrationMarks.value || {};
      const legacyNames = Object.keys(legacy);
      const mappingMode = state.migrationMappingMode.value || "essenceOwned";
      const names = getMigrationTargetNames(legacy, mappingMode);
      const currentMap = state.weaponMarks.value || {};

      let effectCount = 0;
      let conflictCount = 0;
      let statusChangeCount = 0;
      let noteChangeCount = 0;
      const effectItems = [];
      const conflictItems = [];

      names.forEach((name) => {
        const rawLegacyEntry = legacy[name];
        const entry =
          rawLegacyEntry && typeof rawLegacyEntry === "object" ? rawLegacyEntry : null;
        const hasCurrentStored = Object.prototype.hasOwnProperty.call(currentMap, name);
        const currentRaw = hasCurrentStored ? currentMap[name] : null;
        const current = normalizeCurrentMark(name, currentMap);
        const patch = buildPatchByMapping(entry, mappingMode);
        const note = entry && typeof entry.note === "string" ? entry.note : "";
        const conflictFields = detectConflictFields(
          current,
          patch,
          note,
          hasCurrentStored,
          currentRaw
        );
        const conflict = conflictFields.length > 0;

        const statusChanges = Object.keys(patch)
          .filter((key) => current[key] !== patch[key])
          .map((key) => ({
            field: key,
            from: current[key],
            to: patch[key],
          }));
        const noteChange =
          note && current.note !== note
            ? {
                field: "note",
                from: current.note,
                to: note,
              }
            : null;
        const changes = noteChange ? statusChanges.concat([noteChange]) : statusChanges;
        const hasStatusChange = statusChanges.length > 0;
        const hasNoteChange = Boolean(noteChange);

        if (!hasStatusChange && !hasNoteChange) {
          if (conflict) {
            conflictCount += 1;
            conflictItems.push({
              name,
              conflictFields,
              changes: [],
            });
          }
          return;
        }

        effectCount += 1;
        if (hasStatusChange) statusChangeCount += 1;
        if (hasNoteChange) noteChangeCount += 1;
        effectItems.push({
          name,
          changes,
          conflict,
          conflictFields,
        });

        if (conflict) {
          conflictCount += 1;
          conflictItems.push({
            name,
            conflictFields,
            changes,
          });
        }
      });

      return {
        totalLegacyCount: legacyNames.length,
        effectCount,
        conflictCount,
        statusChangeCount,
        noteChangeCount,
        effectItems,
        conflictItems,
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
        label: "优先补全（推荐）",
        description: "优先补全缺失字段；遇到已存在且字段冲突的新版数据会跳过，避免覆盖你已手动维护的数据。",
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

    let migrationModalMeasureRaf = 0;
    let migrationModalMeasureRaf2 = 0;
    let migrationModalMeasureTimers = [];
    let migrationModalResizeObserver = null;
    let migrationModalMutationObserver = null;
    let migrationModalObservedCard = null;
    let migrationModalObservedOverlay = null;
    let migrationModalObservedContent = null;
    let migrationCardWheelBridgeTarget = null;
    let migrationCardTouchBridgeActive = false;
    let migrationCardTouchBridgeFromOutsideContent = false;
    let migrationCardTouchBridgeLastY = 0;
    let migrationConfirmCountdownTimer = null;

    const getMigrationModalCard = () =>
      document.querySelector(".migration-overlay .migration-card:not(.migration-confirm-card)");
    const getMigrationModalContent = () =>
      document.querySelector(
        ".migration-overlay .migration-card:not(.migration-confirm-card) .migration-content"
      );

    const resetMigrationCardTouchBridge = () => {
      migrationCardTouchBridgeActive = false;
      migrationCardTouchBridgeFromOutsideContent = false;
      migrationCardTouchBridgeLastY = 0;
    };

    const applyMigrationContentScrollDelta = (content, deltaY) => {
      if (!content) return false;
      const maxScroll = Math.max(0, content.scrollHeight - content.clientHeight);
      if (maxScroll <= 1) return false;
      const before = content.scrollTop;
      const next = Math.max(0, Math.min(maxScroll, before + deltaY));
      if (next === before) return false;
      content.scrollTop = next;
      return true;
    };

    const teardownMigrationCardWheelBridge = () => {
      if (!migrationCardWheelBridgeTarget) return;
      migrationCardWheelBridgeTarget.removeEventListener("wheel", handleMigrationCardWheel);
      migrationCardWheelBridgeTarget.removeEventListener("touchstart", handleMigrationCardTouchStart);
      migrationCardWheelBridgeTarget.removeEventListener("touchmove", handleMigrationCardTouchMove);
      migrationCardWheelBridgeTarget.removeEventListener("touchend", handleMigrationCardTouchEnd);
      migrationCardWheelBridgeTarget.removeEventListener("touchcancel", handleMigrationCardTouchEnd);
      migrationCardWheelBridgeTarget = null;
      resetMigrationCardTouchBridge();
    };

    const handleMigrationCardWheel = (event) => {
      if (!event || state.showMigrationModal.value !== true) return;
      const card = getMigrationModalCard();
      const content = getMigrationModalContent();
      if (!card || !content) return;
      if (!card.contains(event.target)) return;
      if (content.contains(event.target)) return;

      const deltaY = Number(event.deltaY || 0);
      if (!Number.isFinite(deltaY) || Math.abs(deltaY) < 0.1) return;
      if (applyMigrationContentScrollDelta(content, deltaY)) {
        event.preventDefault();
      }
    };

    const handleMigrationCardTouchStart = (event) => {
      if (!event || state.showMigrationModal.value !== true) return;
      const card = getMigrationModalCard();
      const content = getMigrationModalContent();
      if (!card || !content) return;
      if (!card.contains(event.target)) return;
      const touch = event.touches && event.touches[0];
      if (!touch) {
        resetMigrationCardTouchBridge();
        return;
      }
      migrationCardTouchBridgeActive = true;
      migrationCardTouchBridgeFromOutsideContent = !content.contains(event.target);
      migrationCardTouchBridgeLastY = Number(touch.clientY || 0);
    };

    const handleMigrationCardTouchMove = (event) => {
      if (!event || !migrationCardTouchBridgeActive) return;
      if (!migrationCardTouchBridgeFromOutsideContent) return;
      const content = getMigrationModalContent();
      if (!content) return;
      const touch = event.touches && event.touches[0];
      if (!touch) return;
      const currentY = Number(touch.clientY || 0);
      if (!Number.isFinite(currentY)) return;
      const deltaY = migrationCardTouchBridgeLastY - currentY;
      if (Math.abs(deltaY) < 0.1) return;
      migrationCardTouchBridgeLastY = currentY;
      if (applyMigrationContentScrollDelta(content, deltaY)) {
        event.preventDefault();
      }
    };

    const handleMigrationCardTouchEnd = () => {
      resetMigrationCardTouchBridge();
    };

    const ensureMigrationCardWheelBridge = (card) => {
      if (!card) return;
      if (migrationCardWheelBridgeTarget === card) return;
      teardownMigrationCardWheelBridge();
      card.addEventListener("wheel", handleMigrationCardWheel, { passive: false });
      card.addEventListener("touchstart", handleMigrationCardTouchStart, { passive: true });
      card.addEventListener("touchmove", handleMigrationCardTouchMove, { passive: false });
      card.addEventListener("touchend", handleMigrationCardTouchEnd, { passive: true });
      card.addEventListener("touchcancel", handleMigrationCardTouchEnd, { passive: true });
      migrationCardWheelBridgeTarget = card;
    };

    const clearMigrationModalMeasureTimers = () => {
      if (typeof window === "undefined") return;
      if (!migrationModalMeasureTimers.length) return;
      migrationModalMeasureTimers.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      migrationModalMeasureTimers = [];
    };

    const stopMigrationConfirmCountdown = () => {
      if (!migrationConfirmCountdownTimer) return;
      clearInterval(migrationConfirmCountdownTimer);
      migrationConfirmCountdownTimer = null;
    };

    const startMigrationConfirmCountdown = () => {
      stopMigrationConfirmCountdown();
      state.migrationConfirmCountdown.value = 3;
      migrationConfirmCountdownTimer = setInterval(() => {
        if (state.migrationConfirmCountdown.value > 0) {
          state.migrationConfirmCountdown.value -= 1;
        }
        if (state.migrationConfirmCountdown.value <= 0) {
          state.migrationConfirmCountdown.value = 0;
          stopMigrationConfirmCountdown();
        }
      }, 1000);
    };

    const teardownMigrationModalObservers = () => {
      teardownMigrationCardWheelBridge();
      if (migrationModalResizeObserver) {
        migrationModalResizeObserver.disconnect();
        migrationModalResizeObserver = null;
      }
      if (migrationModalMutationObserver) {
        migrationModalMutationObserver.disconnect();
        migrationModalMutationObserver = null;
      }
      migrationModalObservedCard = null;
      migrationModalObservedOverlay = null;
      migrationModalObservedContent = null;
    };

    const cancelMigrationModalMeasure = () => {
      if (typeof window === "undefined") return;
      if (migrationModalMeasureRaf) {
        window.cancelAnimationFrame(migrationModalMeasureRaf);
        migrationModalMeasureRaf = 0;
      }
      if (migrationModalMeasureRaf2) {
        window.cancelAnimationFrame(migrationModalMeasureRaf2);
        migrationModalMeasureRaf2 = 0;
      }
      clearMigrationModalMeasureTimers();
    };

    const measureMigrationModalScrollable = () => {
      const card = getMigrationModalCard();
      if (!card) {
        state.migrationModalScrollable.value = false;
        return;
      }
      const content = getMigrationModalContent() || card;
      state.migrationModalScrollable.value = content.scrollHeight - content.clientHeight > 1;
    };

    const scheduleDelayedMigrationModalMeasure = () => {
      if (typeof window === "undefined") return;
      clearMigrationModalMeasureTimers();
      [120, 300, 600].forEach((delay) => {
        const timerId = window.setTimeout(() => {
          if (!state.showMigrationModal.value) return;
          measureMigrationModalScrollable();
        }, delay);
        migrationModalMeasureTimers.push(timerId);
      });
    };

    const ensureMigrationModalObservers = () => {
      if (typeof window === "undefined") return;
      const overlay = document.querySelector(".migration-overlay");
      const card = getMigrationModalCard();
      const content = getMigrationModalContent();
      if (!overlay || !card) return;
      if (
        migrationModalObservedCard === card &&
        migrationModalObservedOverlay === overlay &&
        migrationModalObservedContent === content
      ) {
        ensureMigrationCardWheelBridge(card);
        return;
      }
      teardownMigrationModalObservers();
      ensureMigrationCardWheelBridge(card);
      if (typeof window.ResizeObserver === "function") {
        migrationModalResizeObserver = new window.ResizeObserver(() => {
          if (!state.showMigrationModal.value) return;
          measureMigrationModalScrollable();
        });
        migrationModalResizeObserver.observe(card);
        if (content) {
          migrationModalResizeObserver.observe(content);
        }
      }
      if (typeof window.MutationObserver === "function") {
        migrationModalMutationObserver = new window.MutationObserver(() => {
          if (!state.showMigrationModal.value) return;
          measureMigrationModalScrollable();
        });
        migrationModalMutationObserver.observe(card, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });
      }
      migrationModalObservedCard = card;
      migrationModalObservedOverlay = overlay;
      migrationModalObservedContent = content;
    };

    const updateMigrationModalScrollable = ({ includeDelayed = false } = {}) => {
      nextTick(() => {
        if (typeof window === "undefined") {
          measureMigrationModalScrollable();
          return;
        }
        cancelMigrationModalMeasure();
        migrationModalMeasureRaf = window.requestAnimationFrame(() => {
          migrationModalMeasureRaf = 0;
          migrationModalMeasureRaf2 = window.requestAnimationFrame(() => {
            migrationModalMeasureRaf2 = 0;
            measureMigrationModalScrollable();
            ensureMigrationModalObservers();
            if (includeDelayed) {
              scheduleDelayedMigrationModalMeasure();
            }
          });
        });
      });
    };

    const toggleMigrationPreviewDetails = () => {
      state.migrationPreviewExpanded.value = !state.migrationPreviewExpanded.value;
      updateMigrationModalScrollable();
    };

    const closeMigrationModals = () => {
      stopMigrationConfirmCountdown();
      state.showMigrationConfirmModal.value = false;
      state.migrationConfirmAction.value = "";
      state.migrationConfirmCountdown.value = 0;
      state.showMigrationModal.value = false;
      state.migrationPreviewExpanded.value = false;
      state.migrationModalScrollable.value = false;
    };

    const applyMigration = () => {
      const legacy = state.legacyMigrationMarks.value || {};
      const mappingMode = state.migrationMappingMode.value || "essenceOwned";
      const names = getMigrationTargetNames(legacy, mappingMode);
      if (!names.length) {
        closeMigrationModals();
        return;
      }

      const strategy = state.migrationConflictStrategy.value || "fillMissing";
      const currentMap = { ...(state.weaponMarks.value || {}) };

      names.forEach((name) => {
        const rawLegacyEntry = legacy[name];
        const entry =
          rawLegacyEntry && typeof rawLegacyEntry === "object" ? rawLegacyEntry : null;
        const hasCurrentStored = Object.prototype.hasOwnProperty.call(currentMap, name);
        const currentRaw = hasCurrentStored ? currentMap[name] : null;
        const current = normalizeCurrentMark(name, currentMap);
        const patch = buildPatchByMapping(entry, mappingMode);
        const note = entry && typeof entry.note === "string" ? entry.note : "";

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
      startMigrationConfirmCountdown();
    };

    const closeMigrationConfirm = () => {
      stopMigrationConfirmCountdown();
      state.showMigrationConfirmModal.value = false;
      state.migrationConfirmAction.value = "";
      state.migrationConfirmCountdown.value = 0;
    };

    const confirmMigrationAction = () => {
      if (state.migrationConfirmCountdown.value > 0) return;
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
        state.migrationPreviewExpanded.value = false;
        state.migrationModalScrollable.value = false;
        return;
      }
      const decision = getStoredDecision();
      if (decision.status === "done" || decision.status === "discarded") {
        state.showMigrationModal.value = false;
        state.showMigrationConfirmModal.value = false;
        state.migrationPreviewExpanded.value = false;
        state.migrationModalScrollable.value = false;
        return;
      }
      state.migrationPreviewExpanded.value = false;
      state.showMigrationModal.value = true;
      updateMigrationModalScrollable();
    };

    watch(hasLegacyData, () => {
      maybeAutoOpenMigrationModal();
    });

    watch(
      () => state.migrationMappingMode.value,
      () => {
        ensureValidConflictStrategy();
        if (state.showMigrationModal.value) {
          updateMigrationModalScrollable();
        }
      }
    );

    watch(
      () => state.showMigrationModal.value,
      (visible) => {
        if (!visible) {
          cancelMigrationModalMeasure();
          teardownMigrationModalObservers();
          state.migrationModalScrollable.value = false;
          return;
        }
        updateMigrationModalScrollable({ includeDelayed: true });
      }
    );

    watch(
      () => state.migrationPreviewExpanded.value,
      () => {
        if (!state.showMigrationModal.value) return;
        updateMigrationModalScrollable();
      }
    );

    watch(
      () => state.showMigrationConfirmModal.value,
      (visible) => {
        if (visible) return;
        stopMigrationConfirmCountdown();
        state.migrationConfirmCountdown.value = 0;
      }
    );

    watch(
      migrationPreview,
      () => {
        if (!state.showMigrationModal.value) return;
        updateMigrationModalScrollable();
      }
    );

    watch(
      shouldShowConflictStrategy,
      (hasConflict) => {
        if (!hasConflict) {
          state.migrationConflictStrategy.value = "fillMissing";
        } else {
          ensureValidConflictStrategy();
        }
        if (state.showMigrationModal.value) {
          updateMigrationModalScrollable();
        }
      },
      { immediate: true }
    );

    const handleWindowResize = () => {
      if (!state.showMigrationModal.value) return;
      updateMigrationModalScrollable();
    };

    onMounted(() => {
      maybeAutoOpenMigrationModal();
      if (typeof window !== "undefined") {
        window.addEventListener("resize", handleWindowResize);
      }
    });

    onBeforeUnmount(() => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleWindowResize);
      }
      stopMigrationConfirmCountdown();
      cancelMigrationModalMeasure();
      teardownMigrationModalObservers();
    });

    state.hasLegacyMigrationData = hasLegacyData;
    state.migrationPreview = migrationPreview;
    state.toggleMigrationPreviewDetails = toggleMigrationPreviewDetails;
    state.shouldShowConflictStrategy = shouldShowConflictStrategy;
    state.migrationConflictOptions = migrationConflictOptions;
    state.openMigrationConfirm = openMigrationConfirm;
    state.closeMigrationConfirm = closeMigrationConfirm;
    state.confirmMigrationAction = confirmMigrationAction;
  };
})();
