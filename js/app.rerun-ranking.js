(function () {
  const modules = (window.AppModules = window.AppModules || {});
  const DAY_MS = 24 * 60 * 60 * 1000;
  const compareTextSafe = (a, b) => {
    if (typeof compareText === "function") return compareText(a, b);
    return String(a || "").localeCompare(String(b || ""), "zh-Hans-CN");
  };

  const resolveNowMs = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (value instanceof Date && Number.isFinite(value.getTime())) return value.getTime();
    if (typeof value === "string" && value.trim()) {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return Date.now();
  };

  const pickLastEndedWindow = (windows, nowMs) => {
    if (!Array.isArray(windows)) return null;
    let candidate = null;
    windows.forEach((item) => {
      const endMs = Number(item && item.endMs);
      if (!Number.isFinite(endMs) || endMs > nowMs) return;
      if (!candidate || endMs > candidate.endMs) {
        candidate = item;
      }
    });
    return candidate;
  };

  const pickNextUpcomingWindow = (windows, nowMs) => {
    if (!Array.isArray(windows)) return null;
    let candidate = null;
    windows.forEach((item) => {
      const startMs = Number(item && item.startMs);
      if (!Number.isFinite(startMs) || startMs <= nowMs) return;
      if (!candidate || startMs < candidate.startMs) {
        candidate = item;
      }
    });
    return candidate;
  };

  const countStartedWindows = (windows, nowMs) => {
    if (!Array.isArray(windows)) return 0;
    let count = 0;
    windows.forEach((item) => {
      const startMs = Number(item && item.startMs);
      if (!Number.isFinite(startMs) || startMs > nowMs) return;
      count += 1;
    });
    return count;
  };

  const toCharacterName = (record) => {
    if (!record || typeof record !== "object") return "";
    if (record.characterName) return String(record.characterName);
    if (record.primaryCharacter) return String(record.primaryCharacter);
    if (Array.isArray(record.characters)) {
      const first = record.characters.find(Boolean);
      if (first) return String(first);
    }
    return "";
  };
  const resolveWeaponNames = (record, fallbackKey) => {
    if (!record || typeof record !== "object") {
      return fallbackKey ? [String(fallbackKey)] : [];
    }
    if (Array.isArray(record.weaponNames) && record.weaponNames.length) {
      return Array.from(new Set(record.weaponNames.map((item) => String(item || "").trim()).filter(Boolean)));
    }
    if (record.primaryWeaponName) return [String(record.primaryWeaponName)];
    if (record.weaponName) return [String(record.weaponName)];
    return fallbackKey ? [String(fallbackKey)] : [];
  };

  const deriveRerunRankingRows = (scheduleByCharacter, options) => {
    const source = scheduleByCharacter && typeof scheduleByCharacter === "object" ? scheduleByCharacter : {};
    const nowMs = resolveNowMs(options && options.nowMs);
    const activeByWeapon =
      options && options.activeByWeapon && typeof options.activeByWeapon === "object"
        ? options.activeByWeapon
        : {};
    const rows = [];

    Object.keys(source).forEach((scheduleKey) => {
      const record = source[scheduleKey];
      if (!record || typeof record !== "object") return;
      const characterName = toCharacterName(record);
      if (!characterName) return;
      const weaponNames = resolveWeaponNames(record, scheduleKey);
      const weaponLabel = String(
        record.primaryWeaponName ||
          record.weaponName ||
          weaponNames[0] ||
          scheduleKey
      );
      const isActive = weaponNames.some((name) => Boolean(activeByWeapon[name]));
      const lastWindow = pickLastEndedWindow(record.windows, nowMs);
      const nextWindow = pickNextUpcomingWindow(record.windows, nowMs);
      const lastEndMs = lastWindow ? Number(lastWindow.endMs) : Number.NaN;
      const nextStartMs = nextWindow ? Number(nextWindow.startMs) : Number.NaN;
      const hasEndedHistory = Number.isFinite(lastEndMs);
      const hasUpcomingWindow = Number.isFinite(nextStartMs);
      if (!hasEndedHistory && !isActive && !hasUpcomingWindow) return;
      const gapMs = hasEndedHistory ? nowMs - lastEndMs : null;
      if (hasEndedHistory && (!Number.isFinite(gapMs) || gapMs < 0)) return;

      rows.push({
        weaponName: weaponLabel,
        characterName,
        avatarSrc: String(record.avatarSrc || ""),
        hasEndedHistory,
        lastEndMs: hasEndedHistory ? lastEndMs : null,
        nextStartMs: hasUpcomingWindow ? nextStartMs : null,
        gapMs,
        gapDays: hasEndedHistory ? Math.floor(gapMs / DAY_MS) : null,
        rerunCount: countStartedWindows(record.windows, nowMs),
        isActive,
        isUpcoming: !isActive && hasUpcomingWindow && !hasEndedHistory,
      });
    });

    const compareRankingRow = (a, b) => {
      const gapA = Number.isFinite(a.gapMs) ? a.gapMs : -1;
      const gapB = Number.isFinite(b.gapMs) ? b.gapMs : -1;
      if (gapB !== gapA) return gapB - gapA;

      const lastEndA = Number.isFinite(a.lastEndMs) ? a.lastEndMs : Number.POSITIVE_INFINITY;
      const lastEndB = Number.isFinite(b.lastEndMs) ? b.lastEndMs : Number.POSITIVE_INFINITY;
      if (lastEndA !== lastEndB) return lastEndA - lastEndB;

      const characterDiff = compareTextSafe(a.characterName, b.characterName);
      if (characterDiff !== 0) return characterDiff;
      return compareTextSafe(a.weaponName, b.weaponName);
    };

    rows.sort(compareRankingRow);

    const dedupedByCharacter = new Map();
    rows.forEach((row) => {
      const key = String(row.characterName || "");
      if (!key) return;
      if (!dedupedByCharacter.has(key)) {
        dedupedByCharacter.set(key, row);
        return;
      }
      const existing = dedupedByCharacter.get(key);
      if (row.isActive !== existing.isActive) {
        dedupedByCharacter.set(key, row.isActive ? row : existing);
        return;
      }
      if (row.isUpcoming !== existing.isUpcoming) {
        dedupedByCharacter.set(key, row.isUpcoming ? row : existing);
        return;
      }
      if (compareRankingRow(row, existing) < 0) {
        dedupedByCharacter.set(key, row);
      }
    });
    const deduped = Array.from(dedupedByCharacter.values()).sort(compareRankingRow);

    const inactive = [];
    const active = [];
    const upcoming = [];
    deduped.forEach((row) => {
      if (row.isUpcoming) {
        upcoming.push(row);
        return;
      }
      if (row.isActive) {
        active.push(row);
      } else {
        inactive.push(row);
      }
    });

    return inactive.concat(active, upcoming);
  };

  modules.deriveRerunRankingRows = deriveRerunRankingRows;

  modules.initRerunRanking = function initRerunRanking(ctx, state, options) {
    const { ref, watch } = ctx;
    const resolveValue = (value, fallback) =>
      value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "value")
        ? value
        : ref(fallback);

    state.rerunRankingRows = resolveValue(state.rerunRankingRows, []);
    state.hasRerunRankingRows = resolveValue(state.hasRerunRankingRows, false);
    state.rerunRankingGeneratedAt = resolveValue(state.rerunRankingGeneratedAt, 0);

    state.refreshRerunRanking = (nextNow) => {
      // Priority: character map ({ value: byCharacter }) -> normalized byCharacter fallback -> weapon map ({ value: byWeapon }).
      // The first two sources are character-oriented; the last one is weapon-oriented and may use different item keys.
      const source = (
        (state.characterUpByCharacter && state.characterUpByCharacter.value) ||
        (state.upScheduleNormalized &&
          state.upScheduleNormalized.value &&
          state.upScheduleNormalized.value.byCharacter) ||
        (state.weaponUpByWeapon && state.weaponUpByWeapon.value) ||
        {}
      );
      const scheduleNowMs =
        state.upScheduleNowMs && typeof state.upScheduleNowMs.value !== "undefined"
          ? Number(state.upScheduleNowMs.value)
          : Number.NaN;
      const fallbackNow =
        Number.isFinite(scheduleNowMs) && scheduleNowMs > 0
          ? scheduleNowMs
          : options && Object.prototype.hasOwnProperty.call(options, "nowMs")
          ? options.nowMs
          : undefined;
      const nowMs = resolveNowMs(typeof nextNow === "undefined" ? fallbackNow : nextNow);
      const activeByWeapon =
        typeof state.getWeaponUpWindowAt === "function" ? state.getWeaponUpWindowAt(nowMs) : {};
      const rows = deriveRerunRankingRows(source, { nowMs, activeByWeapon });
      state.rerunRankingRows.value = rows;
      state.hasRerunRankingRows.value = rows.length > 0;
      state.rerunRankingGeneratedAt.value = nowMs;
      return rows;
    };
    if (typeof watch === "function" && state.upScheduleNowMs && typeof state.upScheduleNowMs === "object") {
      watch(
        () => Number(state.upScheduleNowMs.value || 0),
        (nextNow) => {
          state.refreshRerunRanking(nextNow);
        },
        { immediate: true }
      );
    } else {
      state.refreshRerunRanking();
    }
  };
})();
