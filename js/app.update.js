(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initUpdate = function initUpdate(ctx, state) {
    const { ref, watch, onMounted, onBeforeUnmount } = ctx;

    const versionEndpoint = "./data/version.json";
    const checkIntervalMs = 30 * 60 * 1000;
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
    let gameCompatTimer = null;
    // Contract with scripts/gen-version.mjs output payload.
    const versionCoreFields = Object.freeze([
      "buildId",
      "displayVersion",
      "announcementVersion",
      "fingerprint",
      "publishedAt",
    ]);
    const reportNonFatalDiagnostic = (payload) => {
      const source = payload && typeof payload === "object" ? payload : {};
      const reporter =
        (typeof state.reportNonFatalDiagnostic === "function" && state.reportNonFatalDiagnostic) ||
        (typeof window !== "undefined" && typeof window.__reportNonFatalDiagnostic === "function"
          ? window.__reportNonFatalDiagnostic
          : null) ||
        (typeof window !== "undefined" &&
        window.__APP_DIAGNOSTICS__ &&
        typeof window.__APP_DIAGNOSTICS__.reportNonFatalDiagnostic === "function"
          ? window.__APP_DIAGNOSTICS__.reportNonFatalDiagnostic
          : null);
      if (typeof reporter !== "function") return;
      try {
        reporter({
          module: "app.update",
          operation: safeText(source.operation) || "update.unknown",
          kind: safeText(source.kind) || "non-fatal",
          resource: safeText(source.resource) || versionEndpoint,
          timestamp: source.timestamp,
          errorName: safeText(source.errorName) || "",
          errorMessage: safeText(source.errorMessage) || "",
          note: safeText(source.note) || "",
          optionalSignature: safeText(source.optionalSignature) || "",
        });
      } catch (error) {
        // diagnostic reporter must stay non-blocking
      }
    };

    const safeText = (value) => String(value == null ? "" : value).trim();
    const getCurrentVersionLoadFailedText = () =>
      (typeof state.t === "function" ? state.t("storage.failed_to_load_current_version") : "current version load failed");
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

    const reportInvalidVersionPayload = (source, reason, raw, missingFields) => {
      reportNonFatalDiagnostic({
        operation: "update.payload-validate",
        kind: "invalid-version-payload",
        resource: source || versionEndpoint,
        errorName: "VersionPayloadContractError",
        errorMessage: reason || "invalid-payload",
        note:
          Array.isArray(missingFields) && missingFields.length
            ? `missing=${missingFields.join(",")}`
            : "",
        optionalSignature: `update.payload-validate:${safeText(source) || "unknown"}:${safeText(reason) || "invalid"}`,
      });
      if (typeof state.reportRuntimeWarning !== "function") return;
      const error = new Error(`invalid version payload from ${source}: ${reason}`);
      error.name = "VersionPayloadContractError";
      let payloadPreview = "";
      try {
        payloadPreview = JSON.stringify(raw);
      } catch (serializeError) {
        payloadPreview = "[unserializable payload]";
      }
      const details = [
        `source: ${safeText(source) || "unknown"}`,
        `reason: ${safeText(reason) || "invalid payload"}`,
      ];
      if (Array.isArray(missingFields) && missingFields.length) {
        details.push(`missing: ${missingFields.join(", ")}`);
      }
      if (payloadPreview) {
        details.push(`payload: ${payloadPreview.slice(0, 500)}`);
      }
      state.reportRuntimeWarning(error, {
        scope: "update.version",
        operation: "update.payload-validate",
        key: `${safeText(source) || "unknown"}:${safeText(reason) || "invalid"}`,
        title:
          typeof state.t === "function"
            ? state.t("update.version_payload_invalid_title")
            : "Invalid version payload",
        summary:
          typeof state.t === "function"
            ? state.t("update.version_payload_invalid_summary")
            : "Invalid version payload rejected, update prompt skipped.",
        note: details.join("\n"),
        asToast: true,
      });
    };

    const normalizeVersionInfo = (raw, options) => {
      const resolved = options && typeof options === "object" ? options : {};
      const source = safeText(resolved.source || "unknown");
      const isLocalSource = source === "local";
      const reportInvalid = Boolean(resolved.reportInvalid);
      if (!raw || typeof raw !== "object") {
        if (reportInvalid) {
          reportInvalidVersionPayload(source, "payload-not-object", raw, versionCoreFields);
        }
        return null;
      }
      const info = {
        buildId: safeText(raw.buildId || ""),
        displayVersion: safeText(raw.displayVersion || ""),
        announcementVersion: safeText(raw.announcementVersion || ""),
        fingerprint: safeText(raw.fingerprint || ""),
        publishedAt: safeText(raw.publishedAt || ""),
      };
      const missingFields = versionCoreFields.filter((field) => !info[field]);
      if (missingFields.length) {
        if (reportInvalid) {
          reportInvalidVersionPayload(source, "missing-core-fields", raw, missingFields);
        }
        if (!isLocalSource) {
          return null;
        }
      }
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
      if (!info.signature) {
        if (reportInvalid) {
          reportInvalidVersionPayload(source, "empty-signature", raw, versionCoreFields);
        }
        if (!isLocalSource) {
          return null;
        }
        const fallbackSignature = [
          info.fingerprint,
          info.announcementVersion,
          info.publishedAt,
          info.displayVersion,
          info.buildId,
        ]
          .filter(Boolean)
          .join("|");
        info.signature = safeText(fallbackSignature || "local-version-metadata-downgraded");
        info.display = buildDisplayText(info) || info.signature;
      }
      return info;
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
        return state.t("update.compat_version", { version: text });
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
      const nextAtTime = Date.parse(config.nextVersionAt);
      const now = Date.now();
      if (Number.isFinite(nextAtTime) && now < nextAtTime) {
        clearGameCompatTimer();
        const maxDelay = 2147480000;
        const delay = Math.max(1000, Math.min(nextAtTime - now + 500, maxDelay));
        gameCompatTimer = window.setTimeout(() => {
          gameCompatTimer = null;
          applyGameCompatState();
        }, delay);
      } else {
        clearGameCompatTimer();
      }
      const shouldWarn = shouldShowGameCompatWarning(config);
      state.showGameCompatWarning.value = shouldWarn && !gameCompatWarningDismissedSession;
      updateVersionBadgeDisplayText();
    };
    const clearGameCompatTimer = () => {
      if (gameCompatTimer) {
        clearTimeout(gameCompatTimer);
        gameCompatTimer = null;
      }
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
      const localCorePayload = {
        buildId,
        displayVersion,
        announcementVersion,
        fingerprint,
        publishedAt,
      };
      return normalizeVersionInfo(localCorePayload, {
        source: "local",
        reportInvalid: true,
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
        (typeof state.t === "function" ? state.t("gear_refining.unknown") : "unknown");
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
      if (!response.ok) {
        reportNonFatalDiagnostic({
          operation: "update.fetch-latest-version",
          kind: "http-not-ok",
          resource: versionEndpoint,
          errorName: "VersionFetchHttpError",
          errorMessage: `status=${response.status}`,
          optionalSignature: `update.fetch-http:${response.status || 0}`,
        });
        return null;
      }
      const data = await response.json();
      return normalizeVersionInfo(data, {
        source: "remote",
        reportInvalid: true,
      });
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
        reportNonFatalDiagnostic({
          operation: "update.check",
          kind: "check-failed",
          resource: versionEndpoint,
          errorName: safeText(error && error.name) || "Error",
          errorMessage: safeText(error && error.message) || "update-check-failed",
          optionalSignature: "update.check:failed",
        });
      } finally {
        checking = false;
      }
    };

    const handleVisibilityRecovery = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      applyGameCompatState();
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
        showCopyFeedback("update.copy_version_success");
        return;
      }
      showCopyFeedback("update.copy_version_failure");
      if (typeof window !== "undefined" && typeof window.prompt === "function") {
        const promptText =
          typeof state.t === "function"
            ? state.t("update.auto_copy_is_not_available_in_this_environment_please_co")
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
      clearGameCompatTimer();
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
  modules.initUpdate.required = ["initState", "initI18n", "initContent"];
  modules.initUpdate.optional = ["initUi"];
  modules.initUpdate.requiredProviders = [];
  modules.initUpdate.optionalProviders = ["reportRuntimeWarning"];
})();
