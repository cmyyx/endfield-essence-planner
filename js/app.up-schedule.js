(function () {
  const modules = (window.AppModules = window.AppModules || {});
  const SHANGHAI_OFFSET_MINUTES = 8 * 60;
  const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const DATE_TIME_RE =
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+\-]\d{2}:\d{2})?$/;

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
  const parseScheduleTime = (value) => {
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
  const normalizeWindows = (windows) => {
    if (!Array.isArray(windows)) return [];
    const normalized = [];
    windows.forEach((windowItem, sourceIndex) => {
      if (!windowItem || typeof windowItem !== "object") return;
      const startParsed = parseScheduleTime(windowItem.start);
      const endParsed = parseScheduleTime(windowItem.end);
      if (!startParsed || !endParsed) return;
      if (startParsed.ms >= endParsed.ms) return;
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

  modules.initUpSchedule = function initUpSchedule(ctx, state) {
    const { ref } = ctx;
    const runtimeRawSource =
      state.upScheduleRawSource && typeof state.upScheduleRawSource === "object"
        ? state.upScheduleRawSource
        : weaponUpSchedules && typeof weaponUpSchedules === "object"
        ? weaponUpSchedules
        : {};

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
    if (!state.weaponUpIssues || typeof state.weaponUpIssues.value === "undefined") {
      state.weaponUpIssues = ref([]);
    }

    const weaponMap = new Map((Array.isArray(weapons) ? weapons : []).map((weapon) => [weapon.name, weapon]));
    const byWeapon = {};
    Object.keys(runtimeRawSource).forEach((weaponName) => {
      const weapon = weaponMap.get(weaponName);
      const entry = runtimeRawSource[weaponName];
      if (!weapon || !entry || typeof entry !== "object") return;
      const windows = normalizeWindows(entry.windows);
      const characters = Array.isArray(weapon.chars)
        ? Array.from(new Set(weapon.chars.filter(Boolean)))
        : [];
      const primaryCharacter = characters.length ? characters[0] : "";
      byWeapon[weaponName] = {
        weaponName,
        windows,
        characters,
        primaryCharacter,
        avatarSrc: primaryCharacter ? encodeURI(`./image/characters/${primaryCharacter}.png`) : "",
      };
    });

    state.upScheduleNormalized.value = { byWeapon };
    state.upScheduleIssues.value = [];
    state.weaponUpByWeapon.value = byWeapon;
    state.weaponUpIssues.value = [];
    if (typeof state.normalizeUpSchedule !== "function") {
      state.normalizeUpSchedule = () => state.upScheduleNormalized.value;
    }
    if (typeof state.validateUpSchedule !== "function") {
      state.validateUpSchedule = () => state.upScheduleIssues.value;
    }
    if (typeof state.reportUpScheduleIssue !== "function") {
      state.reportUpScheduleIssue = (issue) => {
        const next = Array.isArray(state.upScheduleIssues.value)
          ? state.upScheduleIssues.value.slice()
          : [];
        if (issue && typeof issue === "object") {
          next.push({ ...issue });
        }
        state.upScheduleIssues.value = next.slice(-50);
      };
    }
  };
})();
