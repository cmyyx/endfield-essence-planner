(function () {
  const modules = (window.AppModules = window.AppModules || {});
  const SHANGHAI_OFFSET_MINUTES = 8 * 60;
  const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const DATE_TIME_RE =
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+\-]\d{2}:\d{2})?$/;
  const ISSUE_CODES = Object.freeze({
    UNKNOWN_CHARACTER: "UP_UNKNOWN_CHARACTER",
    UNKNOWN_KEY: "UP_UNKNOWN_KEY",
    INVALID_TIME: "UP_INVALID_TIME",
    WINDOW_ORDER: "UP_WINDOW_ORDER",
  });

  const toInt = (value) => Number.parseInt(String(value), 10);
  const isValidDateTime = (year, month, day, hour, minute, second) => {
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day &&
      date.getUTCHours() === hour &&
      date.getUTCMinutes() === minute &&
      date.getUTCSeconds() === second
    );
  };
  const parseTimezoneOffsetMinutes = (timezoneText) => {
    if (!timezoneText) return SHANGHAI_OFFSET_MINUTES;
    if (timezoneText === "Z") return 0;
    const match = /^([+\-])(\d{2}):(\d{2})$/.exec(timezoneText);
    if (!match) return null;
    const sign = match[1] === "-" ? -1 : 1;
    const hour = toInt(match[2]);
    const minute = toInt(match[3]);
    if (hour > 23 || minute > 59) return null;
    return sign * (hour * 60 + minute);
  };
  const parseScheduleTime = (value, boundary) => {
    const source = typeof value === "string" ? value.trim() : "";
    if (!source) return null;

    const dateOnly = DATE_ONLY_RE.exec(source);
    if (dateOnly) {
      const year = toInt(dateOnly[1]);
      const month = toInt(dateOnly[2]);
      const day = toInt(dateOnly[3]);
      const hour = 12;
      const minute = 0;
      const second = 0;
      if (!isValidDateTime(year, month, day, hour, minute, second)) return null;
      const utcMs =
        Date.UTC(year, month - 1, day, hour, minute, second) -
        SHANGHAI_OFFSET_MINUTES * 60 * 1000;
      return {
        ms: utcMs,
        iso: new Date(utcMs).toISOString(),
      };
    }

    const dateTime = DATE_TIME_RE.exec(source);
    if (!dateTime) return null;
    const year = toInt(dateTime[1]);
    const month = toInt(dateTime[2]);
    const day = toInt(dateTime[3]);
    const hour = toInt(dateTime[4]);
    const minute = toInt(dateTime[5]);
    const second = dateTime[6] ? toInt(dateTime[6]) : 0;
    if (!isValidDateTime(year, month, day, hour, minute, second)) return null;
    const offsetMinutes = parseTimezoneOffsetMinutes(dateTime[7] || "");
    if (offsetMinutes === null) return null;
    const utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - offsetMinutes * 60 * 1000;
    return {
      ms: utcMs,
      iso: new Date(utcMs).toISOString(),
    };
  };
  const normalizeWindows = (windows, weaponName, reportIssue) => {
    if (!Array.isArray(windows)) {
      reportIssue({
        code: ISSUE_CODES.UNKNOWN_KEY,
        weaponName,
        path: "windows",
        message: "windows must be an array",
      });
      return null;
    }
    const normalized = [];
    const allowedWindowKeys = new Set(["start", "end"]);
    windows.forEach((windowItem, sourceIndex) => {
      if (!windowItem || typeof windowItem !== "object" || Array.isArray(windowItem)) {
        reportIssue({
          code: ISSUE_CODES.UNKNOWN_KEY,
          weaponName,
          path: `windows[${sourceIndex}]`,
          message: "window must be an object",
        });
        return;
      }
      const unknownWindowKeys = Object.keys(windowItem).filter((key) => !allowedWindowKeys.has(key));
      if (unknownWindowKeys.length) {
        reportIssue({
          code: ISSUE_CODES.UNKNOWN_KEY,
          weaponName,
          path: `windows[${sourceIndex}]`,
          message: `unknown keys: ${unknownWindowKeys.join(", ")}`,
        });
        return;
      }
      if (typeof windowItem.start !== "string" || typeof windowItem.end !== "string") {
        reportIssue({
          code: ISSUE_CODES.INVALID_TIME,
          weaponName,
          path: `windows[${sourceIndex}]`,
          message: "window.start/window.end must be string",
        });
        return;
      }
      const startParsed = parseScheduleTime(windowItem.start, "start");
      const endParsed = parseScheduleTime(windowItem.end, "end");
      if (!startParsed || !endParsed) {
        reportIssue({
          code: ISSUE_CODES.INVALID_TIME,
          weaponName,
          path: `windows[${sourceIndex}]`,
          message: `invalid time range: ${String(windowItem.start)} ~ ${String(windowItem.end)}`,
        });
        return;
      }
      if (startParsed.ms >= endParsed.ms) {
        reportIssue({
          code: ISSUE_CODES.WINDOW_ORDER,
          weaponName,
          path: `windows[${sourceIndex}]`,
          message: "window start must be earlier than end",
        });
        return;
      }
      normalized.push({
        startMs: startParsed.ms,
        endMs: endParsed.ms,
        startIso: startParsed.iso,
        endIso: endParsed.iso,
        sourceStart: String(windowItem.start || ""),
        sourceEnd: String(windowItem.end || ""),
        sourceIndex,
      });
    });
    normalized.sort((a, b) => {
      if (a.startMs !== b.startMs) return a.startMs - b.startMs;
      if (a.endMs !== b.endMs) return a.endMs - b.endMs;
      return a.sourceIndex - b.sourceIndex;
    });
    return normalized;
  };
  const resolveNowMs = (now) => {
    if (typeof now === "number" && Number.isFinite(now)) return now;
    if (now instanceof Date && Number.isFinite(now.getTime())) return now.getTime();
    if (typeof now === "string" && now.trim()) {
      const parsed = Date.parse(now);
      if (Number.isFinite(parsed)) return parsed;
    }
    return Date.now();
  };
  const normalizeAndBindWeaponUpSchedule = (rawSource, weaponList, options) => {
    const source = rawSource && typeof rawSource === "object" ? rawSource : {};
    const onIssue = options && typeof options.onIssue === "function" ? options.onIssue : null;
    const characterWeaponMap = new Map();
    (Array.isArray(weaponList) ? weaponList : []).forEach((weapon) => {
      if (!weapon || typeof weapon !== "object") return;
      const weaponName = String(weapon.name || "").trim();
      if (!weaponName) return;
      const characters = Array.isArray(weapon.chars)
        ? Array.from(new Set(weapon.chars.map((item) => String(item || "").trim()).filter(Boolean)))
        : [];
      characters.forEach((characterName) => {
        if (!characterWeaponMap.has(characterName)) {
          characterWeaponMap.set(characterName, []);
        }
        characterWeaponMap.get(characterName).push(weapon);
      });
    });
    const byCharacter = {};
    const byWeapon = {};
    const issues = [];
    const reportIssue = (issue) => {
      if (!issue || typeof issue !== "object") return;
      const entry = {
        code: String(issue.code || ISSUE_CODES.UNKNOWN_KEY),
        weaponName: String(issue.weaponName || ""),
        path: String(issue.path || ""),
        message: String(issue.message || ""),
      };
      issues.push(entry);
      if (onIssue) onIssue(entry);
    };
    const sortWeaponsForCharacter = (left, right) => {
      const leftRarity = Number(left && left.rarity) || 0;
      const rightRarity = Number(right && right.rarity) || 0;
      if (rightRarity !== leftRarity) return rightRarity - leftRarity;
      return String((left && left.name) || "").localeCompare(String((right && right.name) || ""), "zh-Hans-CN");
    };
    const normalizeWindowSignature = (windowItem) => {
      const startMs = Number(windowItem && windowItem.startMs);
      const endMs = Number(windowItem && windowItem.endMs);
      const startIso = String((windowItem && windowItem.startIso) || "");
      const endIso = String((windowItem && windowItem.endIso) || "");
      return `${startMs}|${endMs}|${startIso}|${endIso}`;
    };
    const sortWindowsByTime = (left, right) => {
      const leftStart = Number(left && left.startMs);
      const rightStart = Number(right && right.startMs);
      if (leftStart !== rightStart) return leftStart - rightStart;
      const leftEnd = Number(left && left.endMs);
      const rightEnd = Number(right && right.endMs);
      if (leftEnd !== rightEnd) return leftEnd - rightEnd;
      return Number(left && left.sourceIndex) - Number(right && right.sourceIndex);
    };
    const mergeWindows = (existing, incoming) => {
      const merged = Array.isArray(existing) ? existing.map((item) => ({ ...item })) : [];
      const signatures = new Set(merged.map((item) => normalizeWindowSignature(item)));
      (Array.isArray(incoming) ? incoming : []).forEach((windowItem) => {
        const signature = normalizeWindowSignature(windowItem);
        if (signatures.has(signature)) return;
        signatures.add(signature);
        merged.push({ ...windowItem });
      });
      merged.sort(sortWindowsByTime);
      return merged;
    };

    Object.keys(source).forEach((characterName) => {
      const entry = source[characterName];
      const relatedWeapons = characterWeaponMap.get(characterName);
      if (!Array.isArray(relatedWeapons) || !relatedWeapons.length) {
        reportIssue({
          code: ISSUE_CODES.UNKNOWN_CHARACTER,
          weaponName: characterName,
          path: "character",
          message: "character key does not exist in WEAPONS[].chars",
        });
        return;
      }
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        reportIssue({
          code: ISSUE_CODES.UNKNOWN_KEY,
          weaponName: characterName,
          path: "entry",
          message: "character entry must be an object",
        });
        return;
      }
      const allowedEntryKeys = new Set(["windows"]);
      const unknownEntryKeys = Object.keys(entry).filter((key) => !allowedEntryKeys.has(key));
      if (unknownEntryKeys.length) {
        reportIssue({
          code: ISSUE_CODES.UNKNOWN_KEY,
          weaponName: characterName,
          path: "entry",
          message: `unknown keys: ${unknownEntryKeys.join(", ")}`,
        });
        return;
      }
      const windows = normalizeWindows(entry.windows, characterName, reportIssue);
      if (!windows) return;
      if (issues.some((item) => item.weaponName === characterName)) return;
      const sortedWeapons = relatedWeapons.slice().sort(sortWeaponsForCharacter);
      const weaponNames = sortedWeapons
        .map((weapon) => String((weapon && weapon.name) || "").trim())
        .filter(Boolean);
      const primaryWeaponName = weaponNames[0] || "";
      const avatarSrc = encodeURI(`./image/characters/${characterName}.png`);
      byCharacter[characterName] = {
        characterName,
        windows,
        weaponNames,
        primaryWeaponName,
        avatarSrc,
      };
      weaponNames.forEach((weaponName) => {
        const existing = byWeapon[weaponName];
        if (!existing || typeof existing !== "object") {
          byWeapon[weaponName] = {
            weaponName,
            windows: windows.map((item) => ({ ...item })),
            characters: [characterName],
            primaryCharacter: characterName,
            avatarSrc,
          };
          return;
        }
        const currentCharacters = Array.isArray(existing.characters) ? existing.characters.slice() : [];
        if (!currentCharacters.includes(characterName)) {
          currentCharacters.push(characterName);
        }
        existing.characters = currentCharacters;
        existing.windows = mergeWindows(existing.windows, windows);
        if (!existing.primaryCharacter) {
          existing.primaryCharacter = characterName;
        }
        if (!existing.avatarSrc) {
          existing.avatarSrc = avatarSrc;
        }
      });
    });

    return {
      byCharacter,
      byWeapon,
      issues,
      reportIssue,
    };
  };
  modules.normalizeAndBindWeaponUpSchedule = normalizeAndBindWeaponUpSchedule;

  modules.initUpSchedule = function initUpSchedule(ctx, state) {
    const { ref } = ctx;
    const ctxRawSource =
      ctx && ctx.weaponUpSchedules && typeof ctx.weaponUpSchedules === "object"
        ? ctx.weaponUpSchedules
        : null;
    const globalRawSource =
      typeof weaponUpSchedules !== "undefined" &&
      weaponUpSchedules &&
      typeof weaponUpSchedules === "object"
        ? weaponUpSchedules
        : typeof window !== "undefined" &&
          window.WEAPON_UP_SCHEDULES &&
          typeof window.WEAPON_UP_SCHEDULES === "object"
        ? window.WEAPON_UP_SCHEDULES
        : null;
    const runtimeRawSource =
      state.upScheduleRawSource && typeof state.upScheduleRawSource === "object"
        ? state.upScheduleRawSource
        : ctxRawSource
        ? ctxRawSource
        : globalRawSource
        ? globalRawSource
        : {};
    const ctxWeapons = Array.isArray(ctx && ctx.weapons) ? ctx.weapons : null;
    const globalWeapons =
      typeof weapons !== "undefined" && Array.isArray(weapons)
        ? weapons
        : typeof window !== "undefined" && Array.isArray(window.WEAPONS)
        ? window.WEAPONS
        : [];
    const runtimeWeapons = ctxWeapons || globalWeapons;

    state.upScheduleRawSource = runtimeRawSource;
    if (!state.upScheduleNormalized || typeof state.upScheduleNormalized.value === "undefined") {
      state.upScheduleNormalized = ref({});
    }
    if (!state.upScheduleIssues || typeof state.upScheduleIssues.value === "undefined") {
      state.upScheduleIssues = ref([]);
    }
    if (!state.weaponUpByWeapon || typeof state.weaponUpByWeapon.value === "undefined") {
      state.weaponUpByWeapon = ref({});
    }
    if (!state.characterUpByCharacter || typeof state.characterUpByCharacter.value === "undefined") {
      state.characterUpByCharacter = ref({});
    }
    if (!state.weaponUpIssues || typeof state.weaponUpIssues.value === "undefined") {
      state.weaponUpIssues = ref([]);
    }

    const { byCharacter, byWeapon, issues, reportIssue } = normalizeAndBindWeaponUpSchedule(
      runtimeRawSource,
      runtimeWeapons,
      {
        onIssue: (entry) => {
          if (typeof state.reportRuntimeWarning === "function") {
            const error = new Error(`[${entry.code}] ${entry.message || "invalid up schedule entry"}`);
            error.name = entry.code;
            state.reportRuntimeWarning(error, {
              scope: "up-schedule.normalize",
              operation: "up-schedule.validate",
              key: `${entry.code}:${entry.weaponName || "unknown"}:${entry.path || "-"}`,
              title: "角色 UP 数据异常",
              summary: "部分角色 UP 记录已被拒绝，请检查数据格式。",
              note: `character: ${entry.weaponName || "unknown"}\npath: ${entry.path || "-"}\nmessage: ${entry.message || "-"}`,
              asToast: true,
            });
          }
        },
      }
    );

    state.upScheduleNormalized.value = {
      byCharacter,
      byWeapon,
      issues,
    };
    state.characterUpByCharacter.value = byCharacter;
    state.upScheduleIssues.value = issues;
    state.weaponUpByWeapon.value = byWeapon;
    state.weaponUpIssues.value = issues;
    if (typeof state.normalizeUpSchedule !== "function") {
      state.normalizeUpSchedule = () => state.upScheduleNormalized.value;
    }
    if (typeof state.validateUpSchedule !== "function") {
      state.validateUpSchedule = () => state.upScheduleIssues.value;
    }
    state.getWeaponUpWindowAt = (now) => {
      const nowMs = resolveNowMs(now);
      const result = {};
      const source = state.weaponUpByWeapon && state.weaponUpByWeapon.value
        ? state.weaponUpByWeapon.value
        : {};
      Object.keys(source).forEach((weaponName) => {
        const record = source[weaponName];
        const windows = Array.isArray(record && record.windows) ? record.windows : [];
        const activeWindow = windows.find((windowItem) => {
          const startMs = Number(windowItem && windowItem.startMs);
          const endMs = Number(windowItem && windowItem.endMs);
          return Number.isFinite(startMs) && Number.isFinite(endMs) && nowMs >= startMs && nowMs < endMs;
        });
        if (!activeWindow) return;
        result[weaponName] = {
          weaponName,
          characters: Array.isArray(record.characters) ? record.characters.slice() : [],
          primaryCharacter: record.primaryCharacter || "",
          avatarSrc: record.avatarSrc || "",
          window: { ...activeWindow },
        };
      });
      return result;
    };
    state.reportUpScheduleIssue = reportIssue;
  };
  modules.initUpSchedule.required = ["initState", "initUi"];
  modules.initUpSchedule.optional = [];
  modules.initUpSchedule.requiredProviders = ["reportRuntimeWarning"];
  modules.initUpSchedule.optionalProviders = [];
})();
