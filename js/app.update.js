(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initUpdate = function initUpdate(ctx, state) {
    const { ref, watch, onMounted, onBeforeUnmount } = ctx;

    const versionEndpoint = "./data/version.json";
    const checkIntervalMs = 5 * 60 * 1000;
    const checkCooldownMs = 60 * 1000;
    const firstCheckDelayMs = 12 * 1000;

    state.showUpdatePrompt = ref(false);
    state.updateCurrentVersionText = ref("");
    state.updateLatestVersionText = ref("");
    state.updateLatestPublishedAt = ref("");
    state.versionBadgeDisplayText = ref("");
    state.gameCompatSupportedVersion = ref("");
    state.gameCompatNextVersion = ref("");
    state.gameCompatNextVersionAtText = ref("");
    state.showGameCompatWarning = ref(false);

    let currentVersionInfo = null;
    let latestVersionInfo = null;
    let dismissedSignature = "";
    let checkTimer = null;
    let firstCheckTimer = null;
    let checking = false;
    let lastCheckAt = 0;
    let copyFeedbackTimer = null;
    let gameCompatWarningDismissedSession = false;

    const safeText = (value) => String(value == null ? "" : value).trim();
    const getCurrentVersionLoadFailedText = () =>
      (typeof state.t === "function" ? state.t("当前版本获取失败") : "current version load failed");
    const formatPublishedAtLocal = (value) => {
      const raw = safeText(value);
      if (!raw) return "";
      const parsed = Date.parse(raw);
      if (Number.isNaN(parsed)) return raw;
      const date = new Date(parsed);
      try {
        return new Intl.DateTimeFormat(undefined, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZoneName: "short",
        }).format(date);
      } catch (error) {
        return date.toLocaleString();
      }
    };

    const shortenToken = (value, head = 8, tail = 6) => {
      const text = safeText(value);
      if (!text) return "";
      if (text.length <= head + tail + 3) return text;
      return `${text.slice(0, head)}...${text.slice(-tail)}`;
    };

    const extractBuildTimeToken = (value) => {
      const text = safeText(value);
      if (!text) return "";
      const match = text.match(/(\d{14})/);
      if (match) return safeText(match[1]);
      const fallback = text.replace(/\s+/g, "");
      return fallback || "";
    };

    const buildDisplayText = (info) => {
      if (!info) return "";
      const displayVersion = safeText(info.displayVersion);
      const buildId = safeText(info.buildId);
      const announcementVersion = safeText(info.announcementVersion);
      const fingerprint = safeText(info.fingerprint);
      const buildTimeToken = extractBuildTimeToken(buildId);

      if (displayVersion) return displayVersion;
      if (announcementVersion && /^\d{14}$/.test(buildTimeToken)) {
        const shortTime = `${buildTimeToken.slice(2, 8)}-${buildTimeToken.slice(8, 12)}`;
        return `v${announcementVersion}@${shortTime}`;
      }

      if (announcementVersion) return announcementVersion;
      if (buildId) return shortenToken(buildId);
      if (fingerprint) return shortenToken(fingerprint);
      return "";
    };

    const normalizeVersionInfo = (raw) => {
      if (!raw || typeof raw !== "object") return null;
      const info = {
        buildId: safeText(raw.buildId || raw.build || raw.version || ""),
        displayVersion: safeText(raw.displayVersion || raw.label || ""),
        announcementVersion: safeText(raw.announcementVersion || ""),
        fingerprint: safeText(raw.fingerprint || ""),
        publishedAt: safeText(raw.publishedAt || raw.builtAt || ""),
      };
      info.buildTimeToken = extractBuildTimeToken(info.buildId);
      const signature =
        info.buildTimeToken ||
        [
          info.fingerprint,
          info.announcementVersion,
          info.publishedAt,
          info.displayVersion,
        ]
          .filter(Boolean)
          .join("|");
      info.signature = safeText(signature);
      info.display = buildDisplayText(info) || info.signature;
      return info.signature ? info : null;
    };

    const getContentRoot = () => {
      // window.CONTENT is the live source of truth. state.content may cache an early empty object.
      if (typeof window !== "undefined" && window.CONTENT && typeof window.CONTENT === "object") {
        return window.CONTENT;
      }
      if (state.content && state.content.value && typeof state.content.value === "object") {
        return state.content.value;
      }
      return {};
    };

    const normalizeGameCompatConfig = (raw) => {
      const source = raw && typeof raw === "object" ? raw : {};
      return {
        supportedVersion: safeText(source.supportedVersion || source.supportedGameVersion || ""),
        nextVersion: safeText(source.nextVersion || source.nextGameVersion || ""),
        nextVersionAt: safeText(source.nextVersionAt || source.nextGameVersionAt || ""),
      };
    };

    const parseVersionSegments = (value) => {
      const cleaned = safeText(value).replace(/[^0-9.]+/g, "");
      if (!cleaned) return [];
      return cleaned
        .split(".")
        .map((part) => Number.parseInt(part, 10))
        .filter((part) => Number.isFinite(part) && part >= 0);
    };

    const compareVersionText = (left, right) => {
      const a = parseVersionSegments(left);
      const b = parseVersionSegments(right);
      const maxLength = Math.max(a.length, b.length);
      for (let i = 0; i < maxLength; i += 1) {
        const lv = a[i] || 0;
        const rv = b[i] || 0;
        if (lv > rv) return 1;
        if (lv < rv) return -1;
      }
      return 0;
    };

    const buildCompatLabel = (version) => {
      const text = safeText(version);
      if (!text) return "";
      if (typeof state.t === "function") {
        return state.t("适配 {version}", { version: text });
      }
      return `Compat ${text}`;
    };

    const updateVersionBadgeDisplayText = () => {
      const versionText = safeText(state.updateCurrentVersionText && state.updateCurrentVersionText.value);
      const base = versionText || getCurrentVersionLoadFailedText();
      const compatLabel = buildCompatLabel(
        state.gameCompatSupportedVersion && state.gameCompatSupportedVersion.value
      );
      // Put compat info first so it remains visible even when the badge text is truncated.
      state.versionBadgeDisplayText.value = compatLabel ? `${compatLabel} · ${base}` : base;
    };

    const shouldShowGameCompatWarning = (config) => {
      if (!config || !config.supportedVersion || !config.nextVersion || !config.nextVersionAt) {
        return false;
      }
      const nextAtTime = Date.parse(config.nextVersionAt);
      if (Number.isNaN(nextAtTime)) return false;
      if (Date.now() < nextAtTime) return false;
      return compareVersionText(config.supportedVersion, config.nextVersion) < 0;
    };

    const applyGameCompatState = () => {
      const content = getContentRoot();
      const config = normalizeGameCompatConfig(content.gameCompat);
      state.gameCompatSupportedVersion.value = config.supportedVersion;
      state.gameCompatNextVersion.value = config.nextVersion;
      state.gameCompatNextVersionAtText.value = config.nextVersionAt
        ? formatPublishedAtLocal(config.nextVersionAt)
        : "";
      const shouldWarn = shouldShowGameCompatWarning(config);
      state.showGameCompatWarning.value = shouldWarn && !gameCompatWarningDismissedSession;
      updateVersionBadgeDisplayText();
    };

    const getLocalVersionInfo = () => {
      const globalVersion =
        typeof window !== "undefined" && window.__APP_VERSION_INFO && typeof window.__APP_VERSION_INFO === "object"
          ? window.__APP_VERSION_INFO
          : null;
      const appEl = typeof document !== "undefined" ? document.getElementById("app") : null;
      const fingerprint = safeText(
        (globalVersion && globalVersion.fingerprint) ||
          (appEl && appEl.getAttribute ? appEl.getAttribute("data-fingerprint") : "")
      );
      const announcementVersion = safeText(
        (globalVersion && globalVersion.announcementVersion) ||
          (state.announcement &&
          state.announcement.value &&
          typeof state.announcement.value.version === "string"
            ? state.announcement.value.version
            : "")
      );
      const buildId = safeText(globalVersion && globalVersion.buildId);
      const displayVersion = safeText(globalVersion && globalVersion.displayVersion);
      const publishedAt = safeText(globalVersion && globalVersion.publishedAt);
      return normalizeVersionInfo({
        buildId,
        displayVersion,
        announcementVersion,
        fingerprint,
        publishedAt,
      });
    };

    const buildVersionCopyText = (info) => {
      if (!info) return getCurrentVersionLoadFailedText();
      return [
        `displayVersion: ${safeText(info.display) || safeText(info.displayVersion) || getCurrentVersionLoadFailedText()}`,
        `buildId: ${safeText(info.buildId) || "n/a"}`,
        `announcementVersion: ${safeText(info.announcementVersion) || "n/a"}`,
        `publishedAt: ${safeText(info.publishedAt) || "n/a"}`,
        `fingerprint: ${safeText(info.fingerprint) || "n/a"}`,
        `supportedGameVersion: ${safeText(state.gameCompatSupportedVersion && state.gameCompatSupportedVersion.value) || "n/a"}`,
        `nextGameVersion: ${safeText(state.gameCompatNextVersion && state.gameCompatNextVersion.value) || "n/a"}`,
        `nextGameVersionAt: ${safeText(state.gameCompatNextVersionAtText && state.gameCompatNextVersionAtText.value) || "n/a"}`,
      ].join("\n");
    };

    const clearCopyFeedbackTimer = () => {
      if (copyFeedbackTimer) {
        clearTimeout(copyFeedbackTimer);
        copyFeedbackTimer = null;
      }
    };

    const showCopyFeedback = (key) => {
      if (
        !state.versionCopyFeedbackText ||
        typeof state.versionCopyFeedbackText.value === "undefined"
      ) {
        return;
      }
      state.versionCopyFeedbackText.value = typeof state.t === "function" ? state.t(key) : key;
      clearCopyFeedbackTimer();
      copyFeedbackTimer = window.setTimeout(() => {
        copyFeedbackTimer = null;
        if (state.versionCopyFeedbackText) {
          state.versionCopyFeedbackText.value = "";
        }
      }, 1500);
    };

    const copyTextToClipboard = async (text) => {
      const copyText = safeText(text);
      if (!copyText) return false;
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === "function"
        ) {
          await navigator.clipboard.writeText(copyText);
          return true;
        }
      } catch (error) {
        // fallback to legacy copy flow
      }
      if (typeof document === "undefined") return false;
      const canUseLegacyCopy =
        typeof document.execCommand === "function" &&
        (typeof document.queryCommandSupported !== "function" ||
          document.queryCommandSupported("copy"));
      if (!canUseLegacyCopy) return false;
      const textarea = document.createElement("textarea");
      textarea.value = copyText;
      textarea.setAttribute("readonly", "readonly");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch (error) {
        // ignore copy errors
      }
      document.body.removeChild(textarea);
      return copied;
    };

    const setCurrentVersionInfo = (info) => {
      currentVersionInfo = info;
      state.updateCurrentVersionText.value =
        (currentVersionInfo && currentVersionInfo.display) ||
        getCurrentVersionLoadFailedText();
      updateVersionBadgeDisplayText();
    };

    const setLatestVersionInfo = (info) => {
      latestVersionInfo = info;
      state.updateLatestVersionText.value =
        (latestVersionInfo && latestVersionInfo.display) ||
        (typeof state.t === "function" ? state.t("未知") : "unknown");
      state.updateLatestPublishedAt.value = latestVersionInfo
        ? formatPublishedAtLocal(latestVersionInfo.publishedAt)
        : "";
    };

    const fetchLatestVersionInfo = async () => {
      if (typeof fetch !== "function") return null;
      const url = new URL(versionEndpoint, window.location.href);
      url.searchParams.set("__vcheck", String(Date.now()));
      const response = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) return null;
      const data = await response.json();
      return normalizeVersionInfo(data);
    };

    const shouldShowPrompt = (remoteInfo) => {
      if (!remoteInfo || !remoteInfo.signature) return false;
      if (!currentVersionInfo || !currentVersionInfo.signature) return false;
      if (remoteInfo.signature === currentVersionInfo.signature) return false;
      if (dismissedSignature && dismissedSignature === remoteInfo.signature) return false;
      return true;
    };

    const checkForUpdate = async (force) => {
      if (checking) return;
      const now = Date.now();
      if (!force && now - lastCheckAt < checkCooldownMs) return;
      checking = true;
      lastCheckAt = now;
      try {
        const remoteInfo = await fetchLatestVersionInfo();
        if (!remoteInfo) return;
        if (!currentVersionInfo) {
          setCurrentVersionInfo(getLocalVersionInfo());
        }
        if (shouldShowPrompt(remoteInfo)) {
          setLatestVersionInfo(remoteInfo);
          state.showUpdatePrompt.value = true;
        }
      } catch (error) {
        // ignore update check errors to avoid user disruption
      } finally {
        checking = false;
      }
    };

    const handleVisibilityRecovery = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      checkForUpdate(false);
    };

    const dismissUpdatePrompt = () => {
      if (latestVersionInfo && latestVersionInfo.signature) {
        dismissedSignature = latestVersionInfo.signature;
      }
      state.showUpdatePrompt.value = false;
    };

    const reloadToLatestVersion = () => {
      if (typeof window === "undefined") return;
      state.showUpdatePrompt.value = false;
      window.location.reload();
    };

    const dismissGameCompatWarning = () => {
      gameCompatWarningDismissedSession = true;
      state.showGameCompatWarning.value = false;
    };

    const copyCurrentVersionInfo = async () => {
      if (!currentVersionInfo) {
        setCurrentVersionInfo(getLocalVersionInfo());
      }
      const copyPayload = buildVersionCopyText(currentVersionInfo);
      const copied = await copyTextToClipboard(copyPayload);
      if (copied) {
        showCopyFeedback("版本信息已复制");
        return;
      }
      showCopyFeedback("复制失败，请手动复制");
      if (typeof window !== "undefined" && typeof window.prompt === "function") {
        const promptText =
          typeof state.t === "function"
            ? state.t("当前环境不支持自动复制，请手动复制以下内容：")
            : "Auto copy is not available. Please copy the following content manually:";
        window.prompt(promptText, copyPayload);
      }
    };

    state.dismissUpdatePrompt = dismissUpdatePrompt;
    state.reloadToLatestVersion = reloadToLatestVersion;
    state.dismissGameCompatWarning = dismissGameCompatWarning;
    state.copyCurrentVersionInfo = copyCurrentVersionInfo;

    if (typeof watch === "function") {
      watch(
        state.locale,
        () => {
          if (currentVersionInfo) {
            setCurrentVersionInfo(currentVersionInfo);
          } else {
            setCurrentVersionInfo(getLocalVersionInfo());
          }
          applyGameCompatState();
        },
        { flush: "post" }
      );
      watch(
        () => (state.contentLoaded && state.contentLoaded.value ? 1 : 0),
        () => {
          applyGameCompatState();
        }
      );
    }

    onMounted(() => {
      setCurrentVersionInfo(getLocalVersionInfo());
      applyGameCompatState();
      if (typeof state.ensureContentLoaded === "function") {
        Promise.resolve(state.ensureContentLoaded())
          .then(() => {
            applyGameCompatState();
          })
          .catch(() => false);
      }
      firstCheckTimer = window.setTimeout(() => {
        firstCheckTimer = null;
        checkForUpdate(true);
      }, firstCheckDelayMs);
      checkTimer = window.setInterval(() => {
        checkForUpdate(false);
      }, checkIntervalMs);
      window.addEventListener("focus", handleVisibilityRecovery);
      window.addEventListener("pageshow", handleVisibilityRecovery);
      document.addEventListener("visibilitychange", handleVisibilityRecovery);
    });

    onBeforeUnmount(() => {
      clearCopyFeedbackTimer();
      if (state.versionCopyFeedbackText) {
        state.versionCopyFeedbackText.value = "";
      }
      if (state.showGameCompatWarning) {
        state.showGameCompatWarning.value = false;
      }
      if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = null;
      }
      if (firstCheckTimer) {
        clearTimeout(firstCheckTimer);
        firstCheckTimer = null;
      }
      window.removeEventListener("focus", handleVisibilityRecovery);
      window.removeEventListener("pageshow", handleVisibilityRecovery);
      document.removeEventListener("visibilitychange", handleVisibilityRecovery);
    });
  };
})();
