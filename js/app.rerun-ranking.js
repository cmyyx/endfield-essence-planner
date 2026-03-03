(function () {
  const modules = (window.AppModules = window.AppModules || {});
  const DAY_MS = 24 * 60 * 60 * 1000;

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

  const toCharacterName = (record) => {
    if (!record || typeof record !== "object") return "";
    if (record.primaryCharacter) return String(record.primaryCharacter);
    if (Array.isArray(record.characters)) {
      const first = record.characters.find(Boolean);
      if (first) return String(first);
    }
    return "";
  };

  const deriveRerunRankingRows = (weaponUpByWeapon, options) => {
    const source = weaponUpByWeapon && typeof weaponUpByWeapon === "object" ? weaponUpByWeapon : {};
    const nowMs = resolveNowMs(options && options.nowMs);
    const rows = [];

    Object.keys(source).forEach((weaponName) => {
      const record = source[weaponName];
      if (!record || typeof record !== "object") return;
      const lastWindow = pickLastEndedWindow(record.windows, nowMs);
      if (!lastWindow) return;
      const lastEndMs = Number(lastWindow.endMs);
      if (!Number.isFinite(lastEndMs)) return;
      const characterName = toCharacterName(record);
      if (!characterName) return;
      const gapMs = nowMs - lastEndMs;
      if (!Number.isFinite(gapMs) || gapMs < 0) return;

      rows.push({
        weaponName: String(record.weaponName || weaponName),
        characterName,
        avatarSrc: String(record.avatarSrc || ""),
        lastEndMs,
        gapMs,
        gapDays: Math.floor(gapMs / DAY_MS),
        isActive: false,
      });
    });

    rows.sort((a, b) => b.gapMs - a.gapMs);
    return rows;
  };

  modules.deriveRerunRankingRows = deriveRerunRankingRows;

  modules.initRerunRanking = function initRerunRanking(ctx, state, options) {
    const { ref } = ctx;
    const resolveValue = (value, fallback) =>
      value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "value")
        ? value
        : ref(fallback);

    state.rerunRankingRows = resolveValue(state.rerunRankingRows, []);
    state.hasRerunRankingRows = resolveValue(state.hasRerunRankingRows, false);
    state.rerunRankingGeneratedAt = resolveValue(state.rerunRankingGeneratedAt, 0);

    state.refreshRerunRanking = (nextNow) => {
      const source =
        state.weaponUpByWeapon && state.weaponUpByWeapon.value
          ? state.weaponUpByWeapon.value
          : {};
      const nowMs = resolveNowMs(
        typeof nextNow === "undefined"
          ? options && Object.prototype.hasOwnProperty.call(options, "nowMs")
            ? options.nowMs
            : undefined
          : nextNow
      );
      const rows = deriveRerunRankingRows(source, { nowMs });
      state.rerunRankingRows.value = rows;
      state.hasRerunRankingRows.value = rows.length > 0;
      state.rerunRankingGeneratedAt.value = nowMs;
      return rows;
    };

    state.refreshRerunRanking();
  };
})();

