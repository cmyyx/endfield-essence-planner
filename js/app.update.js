(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initUpdate = function initUpdate(ctx, state) {
    const { ref, onMounted, onBeforeUnmount } = ctx;

    const versionEndpoint = "./data/version.json";
    const checkIntervalMs = 5 * 60 * 1000;
    const checkCooldownMs = 60 * 1000;
    const firstCheckDelayMs = 12 * 1000;

    state.showUpdatePrompt = ref(false);
    state.updateCurrentVersionText = ref("");
    state.updateLatestVersionText = ref("");
    state.updateLatestPublishedAt = ref("");

    let currentVersionInfo = null;
    let latestVersionInfo = null;
    let dismissedSignature = "";
    let checkTimer = null;
    let firstCheckTimer = null;
    let checking = false;
    let lastCheckAt = 0;
    let copyFeedbackTimer = null;

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

    const copyCurrentVersionInfo = async () => {
      if (!currentVersionInfo) {
        setCurrentVersionInfo(getLocalVersionInfo());
      }
      const copied = await copyTextToClipboard(buildVersionCopyText(currentVersionInfo));
      showCopyFeedback(copied ? "版本信息已复制" : "复制失败，请手动复制");
    };

    state.dismissUpdatePrompt = dismissUpdatePrompt;
    state.reloadToLatestVersion = reloadToLatestVersion;
    state.copyCurrentVersionInfo = copyCurrentVersionInfo;

    onMounted(() => {
      setCurrentVersionInfo(getLocalVersionInfo());
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
