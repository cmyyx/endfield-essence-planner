(function () {
  const modules = (window.AppModules = window.AppModules || {});
  const SHANGHAI_OFFSET_MINUTES = 8 * 60;
  const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const DATE_TIME_RE =
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+\-]\d{2}:\d{2})?$/;
  const ISSUE_CODES = Object.freeze({
    UNKNOWN_WEAPON: "UP_UNKNOWN_WEAPON",
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
      const startParsed = parseScheduleTime(windowItem.start);
      const endParsed = parseScheduleTime(windowItem.end);
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
    const weaponMap = new Map((Array.isArray(weaponList) ? weaponList : []).map((weapon) => [weapon.name, weapon]));
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

    Object.keys(source).forEach((weaponName) => {
      const entry = source[weaponName];
      const weapon = weaponMap.get(weaponName);
      if (!weapon) {
        reportIssue({
          code: ISSUE_CODES.UNKNOWN_WEAPON,
          weaponName,
          path: "weapon",
          message: "weapon key does not exist in WEAPONS",
        });
        return;
      }
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        reportIssue({
          code: ISSUE_CODES.UNKNOWN_KEY,
          weaponName,
          path: "entry",
          message: "weapon entry must be an object",
        });
        return;
      }
      const allowedEntryKeys = new Set(["windows"]);
      const unknownEntryKeys = Object.keys(entry).filter((key) => !allowedEntryKeys.has(key));
      if (unknownEntryKeys.length) {
        reportIssue({
          code: ISSUE_CODES.UNKNOWN_KEY,
          weaponName,
          path: "entry",
          message: `unknown keys: ${unknownEntryKeys.join(", ")}`,
        });
        return;
      }
      const windows = normalizeWindows(entry.windows, weaponName, reportIssue);
      if (!windows) return;
      if (issues.some((item) => item.weaponName === weaponName)) return;
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

    return {
      byWeapon,
      issues,
      reportIssue,
    };
  };
  modules.normalizeAndBindWeaponUpSchedule = normalizeAndBindWeaponUpSchedule;

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

    const { byWeapon, issues, reportIssue } = normalizeAndBindWeaponUpSchedule(runtimeRawSource, weapons, {
      onIssue: (entry) => {
        if (typeof state.reportRuntimeWarning === "function") {
          const error = new Error(`[${entry.code}] ${entry.message || "invalid up schedule entry"}`);
          error.name = entry.code;
          state.reportRuntimeWarning(error, {
            scope: "up-schedule.normalize",
            operation: "up-schedule.validate",
            key: `${entry.code}:${entry.weaponName || "unknown"}:${entry.path || "-"}`,
            title: "武器 UP 数据异常",
            summary: "部分武器 UP 记录已被拒绝，请检查数据格式。",
            note: `weapon: ${entry.weaponName || "unknown"}\npath: ${entry.path || "-"}\nmessage: ${entry.message || "-"}`,
            asToast: true,
          });
        }
      },
    });

    state.upScheduleNormalized.value = {
      byWeapon,
      issues,
    };
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
