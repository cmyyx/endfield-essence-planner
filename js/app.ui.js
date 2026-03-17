(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initUi = function initUi(ctx, state) {
    const { ref, computed, onMounted, onBeforeUnmount, nextTick } = ctx;

    const showBackToTop = state.showBackToTop;
    const showLangMenu = state.showLangMenu;
    const showSecondaryMenu = state.showSecondaryMenu;
    const showPlanConfig = state.showPlanConfig;
    const showPlanConfigHintDot = state.showPlanConfigHintDot;
    const showEquipRefiningNavHintDot = state.showEquipRefiningNavHintDot;
    const showRerunRankingNavHintDot = state.showRerunRankingNavHintDot;
    const isPortrait = state.isPortrait;
    const updateLangMenuPlacement = state.updateLangMenuPlacement;
    const reportStorageIssue = (operation, key, error, meta) => {
      if (typeof state.reportStorageIssue === "function") {
        state.reportStorageIssue(operation, key, error, meta);
        return;
      }
      const queue = Array.isArray(state.pendingStorageIssues) ? state.pendingStorageIssues : [];
      queue.push({ operation, key, error, meta });
      state.pendingStorageIssues = queue.slice(-20);
    };

    const root = typeof document !== "undefined" ? document.documentElement : null;
    const defaultBackgroundUrl = "https://img.canmoe.com/image?img=ua";
    const defaultBackgroundCssValue = `url("${defaultBackgroundUrl}")`;
    const preloadBackgroundTimeoutMs = 850;
    const preloadBackgroundFadeMs = 720;
    let preloadBackgroundFadeTimer = null;
    const mobileLayoutBreakpoint = 1024;

    const readStorageValue = (key) => {
      if (!key) return "";
      try {
        return String(localStorage.getItem(key) || "");
      } catch (error) {
        reportStorageIssue("storage.read", key, error, {
          scope: "ui.read-storage-value",
        });
        return "";
      }
    };

    const hasStoredCustomBackground = () => {
      const key = state.backgroundStorageKey || "planner-bg-image:v1";
      const raw = readStorageValue(key);
      if (!raw) return false;
      if (raw.startsWith("data:")) return true;
      try {
        const parsed = JSON.parse(raw);
        return Boolean(parsed && typeof parsed.data === "string" && parsed.data.trim());
      } catch (error) {
        return false;
      }
    };

    const hasStoredBackgroundApi = () => {
      const key = state.backgroundApiStorageKey || "planner-bg-api:v1";
      const raw = readStorageValue(key);
      return Boolean(raw && raw.trim());
    };

    const setPreloadPhaseText = ({ status = "", current = "", help = "" } = {}) => {
      if (typeof document === "undefined") return;
      const overlay = document.getElementById("app-preload");
      if (!overlay) return;
      const statusEl = overlay.querySelector(".preload-status");
      const currentEl = overlay.querySelector(".preload-current");
      const helpEl = overlay.querySelector(".preload-help");
      if (statusEl) statusEl.textContent = status;
      if (currentEl) currentEl.textContent = current;
      if (helpEl) helpEl.textContent = help;
    };

    const runtimeWarningLogLimit = 20;
    const runtimeWarningDedupWindowMs = 4000;
    const toastVisibleLimit = 5;
    const toastDefaultDurationMs = 6500;
    const toastDismissBufferMs = 120;
    const toastLastSeenAt = new Map();
    const toastTimers = new Map();
    const toastTimerMeta = new Map();
    const toastManualPause = new Set();
    const toastManualPauseMeta = new Map();
    const toastHoverPause = new Set();
    const toastLeaveRects = new Map();
    let toastPointerTrackerReady = false;
    let toastPointerPosition = null;
    let toastPointerMoveHandler = null;
    let toastPointerSyncHandle = 0;
    const optionalFailureNotificationDedupWindowMs = 10000;
    const optionalFailureQueueKey = "__bootOptionalLoadFailures";
    const optionalFailureEventName = "planner:optional-resource-failed";
    let optionalFailurePollTimer = null;
    let lastRuntimeWarningSignature = "";
    let lastRuntimeWarningAt = 0;
    const toastNotices = state.toastNotices || ref([]);
    const toastNotice = state.toastNotice || ref(null);
    const runtimeWarningLogs = state.runtimeWarningLogs || ref([]);
    if (!state.runtimeWarningLogs) {
      state.runtimeWarningLogs = runtimeWarningLogs;
    }
    const hasRuntimeWarningHistory =
      state.hasRuntimeWarningHistory && typeof state.hasRuntimeWarningHistory === "object"
        ? state.hasRuntimeWarningHistory
        : computed(
            () =>
              Array.isArray(runtimeWarningLogs.value) && runtimeWarningLogs.value.length > 0
          );
    state.hasRuntimeWarningHistory = hasRuntimeWarningHistory;
    const optionalFailureHistory = state.optionalFailureHistory || ref([]);
    const hasOptionalFailureHistory = state.hasOptionalFailureHistory || ref(false);
    hasOptionalFailureHistory.value =
      Array.isArray(optionalFailureHistory.value) && optionalFailureHistory.value.length > 0;
    const nowIsoString = () => new Date().toISOString();
    const appUtils =
      typeof window !== "undefined" && window.AppUtils && typeof window.AppUtils === "object"
        ? window.AppUtils
        : {};
    const getAppFingerprint =
      typeof appUtils.getAppFingerprint === "function" ? appUtils.getAppFingerprint : () => "";
    const triggerJsonDownload =
      typeof appUtils.triggerJsonDownload === "function"
        ? appUtils.triggerJsonDownload
        : () => {};
    const truncateText = (value, maxLength) => {
      const text = String(value || "");
      if (!text || maxLength <= 0) return "";
      if (text.length <= maxLength) return text;
      return `${text.slice(0, maxLength)}…`;
    };
    const buildRuntimeWarningEntry = (error, meta) => {
      const scope = meta && meta.scope ? String(meta.scope) : "init-ui";
      const operation = meta && meta.operation ? String(meta.operation) : "runtime.init";
      const key = meta && meta.key ? String(meta.key) : "app.ui:onMounted";
      const title =
        meta && meta.title
          ? String(meta.title)
          : typeof state.t === "function"
          ? state.t("error.page_init_title")
          : "页面初始化异常";
      const summary =
        meta && meta.summary
          ? String(meta.summary)
          : typeof state.t === "function"
          ? state.t("error.page_init_summary")
          : "页面初始化阶段发生异常，部分功能可能不可用。";
      return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        title,
        summary,
        occurredAt: nowIsoString(),
        operation,
        key,
        scope,
        errorName: error && error.name ? String(error.name) : "Error",
        errorMessage: error && error.message ? String(error.message) : "unknown",
        errorStack: error && error.stack ? String(error.stack) : "",
        note: meta && meta.note ? String(meta.note) : "",
      };
    };
    const buildRuntimeWarningPreviewText = (entry) => {
      if (!entry) return "";
      const lines = [
        `scope: ${entry.scope || "unknown"}`,
        `operation: ${entry.operation || "unknown"}`,
        `key: ${entry.key || "unknown"}`,
        `error: ${entry.errorName || "Error"}: ${entry.errorMessage || "unknown"}`,
      ];
      if (entry.note) {
        lines.push(`note: ${entry.note}`);
      }
      if (entry.errorStack) {
        lines.push("", "stack:", truncateText(entry.errorStack, 1800));
      }
      return lines.join("\n");
    };
    const syncToastPrimaryNotice = () => {
      if (!toastNotice || !toastNotices) return;
      const list = Array.isArray(toastNotices.value) ? toastNotices.value : [];
      toastNotice.value = list.length ? list[0] : null;
    };
    let toastQueue = [];
    function snapshotToastLeaveRects() {
      if (typeof document === "undefined") return;
      toastLeaveRects.clear();
      const items = document.querySelectorAll(".toast-stack .planner-toast");
      items.forEach((el) => {
        if (!el || !el.getBoundingClientRect) return;
        const card = el.querySelector ? el.querySelector(".toast-card[data-toast-id]") : null;
        const id = card ? card.getAttribute("data-toast-id") : "";
        if (!id) return;
        const rect = el.getBoundingClientRect();
        toastLeaveRects.set(String(id), rect);
        if (el.dataset) {
          el.dataset.toastTop = String(rect.top);
          el.dataset.toastLeft = String(rect.left);
          el.dataset.toastWidth = String(rect.width);
          el.dataset.toastHeight = String(rect.height);
        }
      });
    }
    const setToastQueue = (nextQueue) => {
      toastQueue = Array.isArray(nextQueue) ? nextQueue.filter(Boolean) : [];
    };
    const setVisibleToastNotices = (nextList) => {
      if (!toastNotices) return;
      const list = Array.isArray(nextList) ? nextList.slice(0, toastVisibleLimit) : [];
      snapshotToastLeaveRects();
      toastNotices.value = list;
      syncToastPrimaryNotice();
      requestToastPointerSync();
    };
    const fillToastVisibleFromQueue = () => {
      if (!toastNotices) return;
      if (!toastQueue.length) return;
      const current = Array.isArray(toastNotices.value) ? toastNotices.value : [];
      if (current.length >= toastVisibleLimit) return;
      const needed = toastVisibleLimit - current.length;
      if (needed <= 0) return;
      const pulled = toastQueue.splice(0, needed);
      if (!pulled.length) return;
      const next = current.concat(pulled);
      setVisibleToastNotices(next);
      pulled.forEach((item) => {
        scheduleToastAutoDismiss(item);
      });
    };
    const clearToastTimer = (noticeId, options = {}) => {
      const key = String(noticeId || "");
      if (!key) return;
      const timer = toastTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        toastTimers.delete(key);
      }
      if (!options.keepMeta) {
        toastTimerMeta.delete(key);
        toastHoverPause.delete(key);
      }
    };
    const clearAllToastTimers = () => {
      for (const timer of toastTimers.values()) {
        clearTimeout(timer);
      }
      toastTimers.clear();
      toastTimerMeta.clear();
    };
    const removeVisibleToastNotice = (noticeId) => {
      if (!toastNotices) return;
      const key = String(noticeId || "");
      if (!key) {
        setVisibleToastNotices([]);
        fillToastVisibleFromQueue();
        return;
      }
      toastManualPause.delete(key);
      toastManualPauseMeta.delete(key);
      const current = Array.isArray(toastNotices.value) ? toastNotices.value : [];
      const next = current.filter((item) => String((item && item.id) || "") !== key);
      setVisibleToastNotices(next);
      fillToastVisibleFromQueue();
    };
    const scheduleToastAutoDismiss = (notice, options = {}) => {
      if (!notice || !notice.id) return;
      const key = String(notice.id);
      if (toastManualPause.has(key) && !options.allowPaused) {
        return;
      }
      const baseDuration = Number.isFinite(notice.durationMs)
        ? Number(notice.durationMs)
        : toastDefaultDurationMs;
      const hasRemaining = Number.isFinite(options.remainingMs);
      const duration = hasRemaining ? Number(options.remainingMs) : baseDuration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      const timeoutDuration = hasRemaining ? duration : duration + toastDismissBufferMs;
      clearToastTimer(notice.id);
      const startedAt = Date.now();
      toastTimerMeta.set(key, {
        remainingMs: timeoutDuration,
        startedAt,
      });
      const timer = setTimeout(() => {
        toastTimers.delete(notice.id);
        toastTimerMeta.delete(key);
        removeVisibleToastNotice(notice.id);
      }, timeoutDuration);
      toastTimers.set(notice.id, timer);
    };

    const syncPausedToastsWithPointer = (options = {}) => {
      if (!toastPointerPosition) return;
      if (typeof document === "undefined") return;
      const fromPointerMove = Boolean(options.fromPointerMove);
      const elements = Array.from(document.querySelectorAll("[data-toast-id]"));
      const insideIds = new Set();
      const x = toastPointerPosition.x;
      const y = toastPointerPosition.y;
      elements.forEach((el) => {
        const id = el.getAttribute("data-toast-id");
        if (!id) return;
        const rect = el.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          insideIds.add(String(id));
        }
      });
      const toPause = Array.from(insideIds).filter(
        (id) => !toastManualPause.has(id) && !toastHoverPause.has(id)
      );
      const toResume = fromPointerMove
        ? Array.from(toastHoverPause).filter((id) => !insideIds.has(id))
        : [];
      toPause.forEach((id) => {
        toastHoverPause.add(id);
        pauseToastNotice(id);
      });
      toResume.forEach((id) => {
        toastHoverPause.delete(id);
        resumeToastNotice(id);
      });
    };

    const requestToastPointerSync = () => {
      if (!toastPointerPosition) return;
      if (toastPointerSyncHandle) return;
      if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
        toastPointerSyncHandle = setTimeout(() => {
          toastPointerSyncHandle = 0;
          syncPausedToastsWithPointer({ fromPointerMove: false });
        }, 0);
        return;
      }
      toastPointerSyncHandle = window.requestAnimationFrame(() => {
        toastPointerSyncHandle = 0;
        syncPausedToastsWithPointer({ fromPointerMove: false });
      });
    };

    const escapeToastSelector = (value) => {
      if (typeof window !== "undefined" && window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(value);
      }
      return String(value).replace(/([\"'\\\\])/g, "\\$1");
    };

    const ensureToastPointerTracker = () => {
      if (toastPointerTrackerReady) return;
      if (typeof window === "undefined" || typeof document === "undefined") return;
      toastPointerTrackerReady = true;
      toastPointerMoveHandler = (event) => {
        toastPointerPosition = { x: event.clientX, y: event.clientY };
        syncPausedToastsWithPointer({ fromPointerMove: true });
      };
      document.addEventListener("pointermove", toastPointerMoveHandler, { passive: true });
    };

    const pauseToastNotice = (noticeId) => {
      const key = String(noticeId || "");
      if (!key) return;
      ensureToastPointerTracker();
      toastManualPause.add(key);
      toastManualPauseMeta.set(key, { pausedAt: Date.now() });
      const meta = toastTimerMeta.get(key);
      if (!meta || !toastTimers.has(key)) {
        const notice = getToastNoticeById(key);
        const baseDuration =
          notice && Number.isFinite(notice.durationMs)
            ? Number(notice.durationMs)
            : toastDefaultDurationMs;
        if (notice && Number.isFinite(baseDuration) && baseDuration > 0 && !toastTimerMeta.has(key)) {
          toastTimerMeta.set(key, { remainingMs: baseDuration + toastDismissBufferMs, startedAt: 0 });
        }
        return;
      }
      const now = Date.now();
      const elapsed = Math.max(0, now - meta.startedAt);
      const remaining = Math.max(0, Number(meta.remainingMs) - elapsed);
      clearToastTimer(key, { keepMeta: true });
      toastTimerMeta.set(key, { remainingMs: remaining, startedAt: 0 });
    };

    const resumeToastNotice = (noticeId) => {
      const key = String(noticeId || "");
      if (!key) return;
      toastManualPause.delete(key);
      toastManualPauseMeta.delete(key);
      if (toastTimers.has(key)) return;
      const meta = toastTimerMeta.get(key);
      if (!meta) return;
      const notice = getToastNoticeById(key);
      if (!notice) {
        toastTimerMeta.delete(key);
        return;
      }
      const remaining = Number(meta.remainingMs);
      if (!Number.isFinite(remaining) || remaining <= 0) {
        toastTimerMeta.delete(key);
        removeVisibleToastNotice(key);
        return;
      }
      scheduleToastAutoDismiss(notice, { remainingMs: remaining, allowPaused: true });
    };

    const resumeToastNoticeIfNotHovered = (noticeId, options = {}) => {
      const key = String(noticeId || "");
      if (!key) return;
      if (!options.fromPointerMove) return;
      if (typeof window === "undefined" || typeof document === "undefined") {
        resumeToastNotice(key);
        return;
      }
      syncPausedToastsWithPointer({ fromPointerMove: true });
    };

    const isToastNoticePaused = (noticeId) => {
      const key = String(noticeId || "");
      if (!key) return false;
      return toastManualPause.has(key);
    };

    const pauseAllToastNotices = () => {
      const list = Array.isArray(toastNotices.value) ? toastNotices.value : [];
      list.forEach((item) => {
        if (item && item.id) pauseToastNotice(item.id);
      });
    };

    const resumeAllToastNotices = () => {
      const list = Array.isArray(toastNotices.value) ? toastNotices.value : [];
      list.forEach((item) => {
        if (item && item.id) resumeToastNotice(item.id);
      });
    };
    const dismissToastNotice = (noticeId) => {
      if (!toastNotices) return;
      if (!noticeId) {
        const first =
          Array.isArray(toastNotices.value) && toastNotices.value.length
            ? toastNotices.value[0]
            : null;
        if (!first || !first.id) return;
        clearToastTimer(first.id);
        removeVisibleToastNotice(first.id);
        return;
      }
      toastManualPause.delete(String(noticeId || ""));
      toastManualPauseMeta.delete(String(noticeId || ""));
      clearToastTimer(noticeId);
      removeVisibleToastNotice(noticeId);
    };
    const getToastNoticeById = (noticeId) => {
      if (!toastNotices || !noticeId) return null;
      const list = Array.isArray(toastNotices.value) ? toastNotices.value : [];
      return list.find((item) => String((item && item.id) || "") === String(noticeId)) || null;
    };
    const runToastAction = (noticeId) => {
      const notice = getToastNoticeById(noticeId);
      if (!notice || typeof notice.action !== "function") return;
      try {
        notice.action();
      } catch (error) {
        console.error("[toast] action failed", error);
      } finally {
        dismissToastNotice(noticeId);
      }
    };
    const activateToastNotice = (noticeId) => {
      const notice = getToastNoticeById(noticeId);
      if (!notice) return;
      if (typeof notice.onActivate === "function") {
        try {
          notice.onActivate();
        } catch (error) {
          console.error("[toast] activate failed", error);
        } finally {
          dismissToastNotice(noticeId);
        }
        return;
      }
      if (typeof notice.action === "function") {
        try {
          notice.action();
        } catch (error) {
          console.error("[toast] action failed", error);
        } finally {
          dismissToastNotice(noticeId);
        }
      }
    };
    const pushToastNotice = (payload, options = {}) => {
      if (!toastNotices) return null;
      const raw = payload && typeof payload === "object" ? payload : {};
      const id = String(raw.id || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`);
      const normalized = {
        id,
        title: String(raw.title || ""),
        summary: String(raw.summary || ""),
        occurredAt: String(raw.occurredAt || nowIsoString()),
        tone: String(raw.tone || "warning"),
        icon: String(raw.icon || "!"),
        actionLabel: raw.actionLabel ? String(raw.actionLabel) : "",
        action: typeof raw.action === "function" ? raw.action : null,
        onActivate: typeof raw.onActivate === "function" ? raw.onActivate : null,
        durationMs: Number.isFinite(raw.durationMs) ? Number(raw.durationMs) : toastDefaultDurationMs,
        signature: String(raw.signature || ""),
        ariaLabel: raw.ariaLabel ? String(raw.ariaLabel) : "",
        logId: raw.logId ? String(raw.logId) : "",
      };
      normalized.clickable = Boolean(normalized.onActivate || normalized.action);
      const signature = String(options.signature || normalized.signature || "");
      const dedupWindowMs = Number.isFinite(options.dedupWindowMs)
        ? Number(options.dedupWindowMs)
        : 0;
      if (signature && dedupWindowMs > 0) {
        const now = Date.now();
        const lastAt = toastLastSeenAt.get(signature) || 0;
        if (now - lastAt <= dedupWindowMs) {
          return null;
        }
        toastLastSeenAt.set(signature, now);
      }
      if (signature) {
        normalized.signature = signature;
      }
      const current = Array.isArray(toastNotices.value) ? toastNotices.value : [];
      const queue = Array.isArray(toastQueue) ? toastQueue : [];
      const removedBySignature = signature
        ? current.filter((item) => String((item && item.signature) || "") === signature)
        : [];
      const withoutSameSignature = signature
        ? current.filter((item) => String((item && item.signature) || "") !== signature)
        : current.slice();
      const queueWithoutSignature = signature
        ? queue.filter((item) => String((item && item.signature) || "") !== signature)
        : queue.slice();
      const nextVisible = withoutSameSignature.slice();
      const nextQueue = queueWithoutSignature.slice();
      if (nextVisible.length < toastVisibleLimit) {
        nextVisible.push(normalized);
      } else {
        nextQueue.push(normalized);
      }
      const nextVisibleIds = new Set(nextVisible.map((item) => String((item && item.id) || "")));
      removedBySignature.forEach((item) => {
        if (item && item.id) {
          clearToastTimer(item.id);
        }
      });
      current.forEach((item) => {
        if (!item || !item.id) return;
        if (!nextVisibleIds.has(String(item.id))) {
          clearToastTimer(item.id);
        }
      });
      setToastQueue(nextQueue);
      setVisibleToastNotices(nextVisible);
      nextVisible.forEach((item) => {
        if (!item || !item.id) return;
        if (!toastTimers.has(item.id) && !toastManualPause.has(String(item.id))) {
          scheduleToastAutoDismiss(item);
        }
      });
      fillToastVisibleFromQueue();
      return normalized;
    };
    const dismissOptionalFailureNotice = (noticeId) => {
      if (!noticeId) return;
      dismissToastNotice(noticeId);
    };
    const pushOptionalFailureNotice = (entry, meta) => {
      if (!optionalFailureHistory) return;
      const signature = String((meta && meta.optionalSignature) || entry.key || "").trim();
      const summaryText =
        typeof state.t === "function"
          ? state.t("equip_refining.tap_the_notification_to_view_details")
          : "点击通知查看详情";
      const notice = {
        id: entry.id,
        logId: entry.id,
        occurredAt: entry.occurredAt || nowIsoString(),
        title: entry.title,
        summary: summaryText,
        note: entry.note || "",
        signature,
        tone: "warning",
        icon: "!",
        durationMs: toastDefaultDurationMs,
        ariaLabel:
          typeof state.t === "function"
            ? state.t("error.view_runtime_warning_details")
            : "查看错误详情",
        onActivate: () => openOptionalFailureDetailByLogId(entry.id),
      };
      const nextHistory = [notice].concat(
        Array.isArray(optionalFailureHistory.value) ? optionalFailureHistory.value : []
      );
      optionalFailureHistory.value = nextHistory.slice(0, runtimeWarningLogLimit);
      hasOptionalFailureHistory.value = optionalFailureHistory.value.length > 0;
      pushToastNotice(notice, {
        signature,
        dedupWindowMs: optionalFailureNotificationDedupWindowMs,
      });
    };
    const resolveRuntimeWarningLogById = (logId) => {
      if (!state.runtimeWarningLogs || !Array.isArray(state.runtimeWarningLogs.value)) return null;
      const idText = String(logId || "");
      return state.runtimeWarningLogs.value.find((item) => String((item && item.id) || "") === idText) || null;
    };
    const openOptionalFailureDetailByLogId = (logId) => {
      const target = resolveRuntimeWarningLogById(logId);
      if (target && typeof state.openUnifiedExceptionFromLog === "function") {
        state.openUnifiedExceptionFromLog(target);
      } else if (target && state.runtimeWarningCurrent && state.showRuntimeWarningModal) {
        state.runtimeWarningCurrent.value = target;
        if (state.runtimeWarningPreviewText) {
          state.runtimeWarningPreviewText.value = buildRuntimeWarningPreviewText(target);
        }
        state.showRuntimeWarningModal.value = true;
      } else if (state.showRuntimeWarningModal) {
        state.showRuntimeWarningModal.value = true;
      }
      dismissOptionalFailureNotice(logId);
    };
    const openLatestRuntimeWarningDetail = () => {
      const first =
        runtimeWarningLogs && Array.isArray(runtimeWarningLogs.value)
          ? runtimeWarningLogs.value[0]
          : null;
      if (!first) return;
      openOptionalFailureDetailByLogId(first.id || first.logId);
    };
    const openLatestOptionalFailureDetail = () => {
      openLatestRuntimeWarningDetail();
    };
    const showUiInitWarning = (error, meta) => {
      const runtimeWarningCurrent = state.runtimeWarningCurrent;
      const runtimeWarningLogs = state.runtimeWarningLogs;
      const runtimeWarningPreviewText = state.runtimeWarningPreviewText;
      const showRuntimeWarningModal = state.showRuntimeWarningModal;
      const runtimeWarningIgnored = state.runtimeWarningIgnored;
      const asToast = Boolean(meta && meta.asToast);
      if (
        !runtimeWarningCurrent ||
        !runtimeWarningLogs ||
        !runtimeWarningPreviewText ||
        !showRuntimeWarningModal
      ) {
        return;
      }
      const forceShow = Boolean(meta && meta.forceShow);
      if (!asToast && !forceShow && runtimeWarningIgnored && runtimeWarningIgnored.value) {
        return;
      }
      const entry = buildRuntimeWarningEntry(error, meta);
      const signature = `${entry.operation}|${entry.key}|${entry.errorName}|${entry.errorMessage}`;
      const isOptionalToast = Boolean(
        asToast && meta && String(meta.optionalSignature || "").trim()
      );
      const now = Date.now();
      if (
        !isOptionalToast &&
        signature === lastRuntimeWarningSignature &&
        now - lastRuntimeWarningAt <= runtimeWarningDedupWindowMs
      ) {
        return;
      }
      lastRuntimeWarningSignature = signature;
      lastRuntimeWarningAt = now;
      runtimeWarningCurrent.value = entry;
      runtimeWarningPreviewText.value = buildRuntimeWarningPreviewText(entry);
      const nextLogs = [entry].concat(
        Array.isArray(runtimeWarningLogs.value) ? runtimeWarningLogs.value : []
      );
      runtimeWarningLogs.value = nextLogs.slice(0, runtimeWarningLogLimit);
      if (asToast) {
        pushOptionalFailureNotice(entry, meta);
        return;
      }
      showRuntimeWarningModal.value = true;
    };
    const reportRuntimeWarning = (error, meta) => {
      showUiInitWarning(error, meta);
    };
    const flushBootOptionalFailureQueue = (incomingItems) => {
      const queued =
        incomingItems && Array.isArray(incomingItems)
          ? incomingItems
          : typeof window !== "undefined" && Array.isArray(window[optionalFailureQueueKey])
          ? window[optionalFailureQueueKey]
          : [];
      if (!queued.length) return;
      if (typeof window !== "undefined" && window[optionalFailureQueueKey] === queued) {
        window[optionalFailureQueueKey] = [];
      }
      const normalized = [];
      queued.forEach((item) => {
        if (!item || typeof item !== "object") return;
        const featureKey = String(item.featureKey || "").trim();
        const resourceLabel = String(item.resource || item.resourceLabel || item.label || item.src || "").trim();
        const signature = String(item.signature || `${featureKey}|${resourceLabel}`).trim();
        if (!resourceLabel || !signature) return;
        normalized.push({
          occurredAt: String(item.occurredAt || nowIsoString()),
          signature,
          featureKey,
          featureLabel: String(item.featureLabel || "").trim(),
          resourceLabel,
        });
      });
      if (!normalized.length) return;
      normalized.forEach((item) => {
        const featureLabel = (() => {
          if (!item.featureKey && !item.featureLabel) return "";
          if (typeof state.t !== "function") return item.featureKey || item.featureLabel || "";
          if (!item.featureKey) return item.featureLabel || "";
          const i18nKey = `optional_feature_${item.featureKey}`;
          const translated = state.t(i18nKey);
          if (translated && translated !== i18nKey) return translated;
          return item.featureLabel || item.featureKey;
        })();
        const detailLines = [];
        if (featureLabel && typeof state.t === "function") {
          detailLines.push(
            state.t("warning.affected_features_features", {
              features: featureLabel,
            })
          );
        }
        if (item.resourceLabel && typeof state.t === "function") {
          detailLines.push(
            state.t("warning.failed_resources_resources", {
              resources: item.resourceLabel,
            })
          );
        }
        if (typeof state.t === "function") {
          detailLines.push(state.t("optional.impact_optional_features_only_core_functionality_remains"));
        }
        const messageParts = [];
        if (featureLabel) {
          messageParts.push(featureLabel);
        }
        if (item.resourceLabel) {
          messageParts.push(item.resourceLabel);
        }
        const error = new Error(messageParts.join(" / ") || "optional resource failed");
        error.name = "OptionalResourceLoadError";
        showUiInitWarning(error, {
          scope: "boot.optional-resource",
          operation: "optional.load",
          key: item.signature,
          title:
            typeof state.t === "function"
              ? state.t("error.optional_feature_load_failed")
              : "可选功能加载失败",
          summary:
            typeof state.t === "function"
              ? state.t("warning.some_optional_features_could_not_be_loaded_core_page_usa")
              : "部分可选功能未能加载，页面主体仍可继续使用。",
          note: detailLines.join("\n"),
          asToast: true,
          optionalSignature: item.signature,
          occurredAt: item.occurredAt || nowIsoString(),
        });
      });
    };
    const handleOptionalFailureEvent = (event) => {
      if (!event) return;
      flushBootOptionalFailureQueue();
    };

    const dismissRuntimeWarning = () => {
      if (state.showRuntimeWarningModal) {
        state.showRuntimeWarningModal.value = false;
      }
    };

    const ignoreRuntimeWarnings = () => {
      if (state.runtimeWarningIgnored) {
        state.runtimeWarningIgnored.value = true;
      }
      if (state.showRuntimeIgnoreConfirmModal) {
        state.showRuntimeIgnoreConfirmModal.value = false;
      }
      dismissRuntimeWarning();
    };

    const requestIgnoreRuntimeWarnings = () => {
      if (state.showRuntimeIgnoreConfirmModal) {
        state.showRuntimeIgnoreConfirmModal.value = true;
      }
    };

    const cancelIgnoreRuntimeWarnings = () => {
      if (state.showRuntimeIgnoreConfirmModal) {
        state.showRuntimeIgnoreConfirmModal.value = false;
      }
    };

    const confirmIgnoreRuntimeWarnings = () => {
      ignoreRuntimeWarnings();
    };

    const reloadBypassCache = () => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      url.searchParams.set("__reload_ts", String(Date.now()));
      window.location.replace(url.toString());
    };

    const exportRuntimeDiagnosticBundle = () => {
      try {
        const payload = {
          exportedAt: nowIsoString(),
          fingerprint: getAppFingerprint(),
          location: typeof window !== "undefined" ? window.location.href : "",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          online:
            typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
              ? navigator.onLine
              : null,
          feedbackUrl: state.storageFeedbackUrl || "https://github.com/cmyyx/endfield-essence-planner/issues",
          currentIssue: state.runtimeWarningCurrent ? state.runtimeWarningCurrent.value || null : null,
          issueLogs:
            state.runtimeWarningLogs && Array.isArray(state.runtimeWarningLogs.value)
              ? state.runtimeWarningLogs.value
              : [],
          preview:
            state.runtimeWarningPreviewText && typeof state.runtimeWarningPreviewText.value === "string"
              ? state.runtimeWarningPreviewText.value
              : "",
        };
        const stamp = nowIsoString().replace(/[^\d]/g, "").slice(0, 14) || String(Date.now());
        triggerJsonDownload(`planner-runtime-diagnostic-${stamp}.json`, payload);
      } catch (error) {
        if (typeof console !== "undefined" && typeof console.error === "function") {
          console.error("[runtime-warning] export diagnostic failed", error);
        }
      }
    };

    const shouldWarmupDefaultBackground = () => {
      if (!root || typeof Image !== "function") return false;
      if (!root.classList.contains("preload")) return false;
      if (state.lowGpuEnabled && state.lowGpuEnabled.value) return false;
      if (state.backgroundDisplayEnabled && state.backgroundDisplayEnabled.value === false) return false;
      const customFile = state.customBackground ? String(state.customBackground.value || "").trim() : "";
      if (customFile) return false;
      const customApi = state.customBackgroundApi ? String(state.customBackgroundApi.value || "").trim() : "";
      if (customApi) return false;
      if (hasStoredCustomBackground()) return false;
      if (hasStoredBackgroundApi()) return false;
      const perfModeKey = state.perfModeStorageKey || "planner-perf-mode:v1";
      const perfMode = readStorageValue(perfModeKey);
      if (perfMode === "low") return false;
      return true;
    };

    const warmupBackgroundBeforeFinish = () => {
      if (!shouldWarmupDefaultBackground()) {
        return Promise.resolve(false);
      }
      const bootT =
        typeof window !== "undefined" && window.__bootI18n && typeof window.__bootI18n.t === "function"
          ? window.__bootI18n.t
          : null;
      const stateT = typeof state.t === "function" ? state.t : (text) => text;
      const tByKey = (bootKey, fallbackKey) => (bootT ? bootT(bootKey) : stateT(fallbackKey));
      if (root) {
        root.style.setProperty("--bg-image", defaultBackgroundCssValue);
      }
      setPreloadPhaseText({
        status: tByKey("preload_status_background_prepare", "资源已就绪，正在准备背景…"),
        current: tByKey("preload_current_background", "当前：背景"),
        help: "",
      });
      return new Promise((resolve) => {
        let settled = false;
        const image = new Image();
        const settle = (loaded) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          let applied = false;
          if (
            loaded &&
            root &&
            root.classList.contains("preload") &&
            shouldWarmupDefaultBackground()
          ) {
            root.classList.add("bg-image-fading-in");
            applied = true;
            if (preloadBackgroundFadeTimer) {
              clearTimeout(preloadBackgroundFadeTimer);
            }
            preloadBackgroundFadeTimer = setTimeout(() => {
              preloadBackgroundFadeTimer = null;
              if (root) {
                root.classList.remove("bg-image-fading-in");
              }
            }, preloadBackgroundFadeMs);
          }
          resolve(applied);
        };
        const timeoutId = setTimeout(() => {
          settle(false);
        }, preloadBackgroundTimeoutMs);
        image.onload = () => settle(true);
        image.onerror = () => settle(false);
        image.src = defaultBackgroundUrl;
      });
    };

    const resolveTheme = (mode) => {
      if (mode === "light" || mode === "dark") return mode;
      if (typeof window === "undefined" || !window.matchMedia) return "dark";
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    };

    const applyTheme = (mode) => {
      const resolved = resolveTheme(mode);
      state.resolvedTheme.value = resolved;
      if (!root) return;
      root.setAttribute("data-theme", resolved);
      root.style.colorScheme = resolved;
    };

    const setThemeMode = (mode) => {
      const normalized = mode === "light" || mode === "dark" ? mode : "auto";
      state.themePreference.value = normalized;
      applyTheme(normalized);
    };

    let mediaTheme = null;
    let removeMediaThemeListener = null;

    const bindSystemThemeListener = () => {
      if (typeof window === "undefined" || !window.matchMedia) return;
      mediaTheme = window.matchMedia("(prefers-color-scheme: light)");
      const onChange = () => {
        if (state.themePreference.value === "auto") {
          applyTheme("auto");
        }
      };
      if (typeof mediaTheme.addEventListener === "function") {
        mediaTheme.addEventListener("change", onChange);
        removeMediaThemeListener = () => mediaTheme.removeEventListener("change", onChange);
      } else if (typeof mediaTheme.addListener === "function") {
        mediaTheme.addListener(onChange);
        removeMediaThemeListener = () => mediaTheme.removeListener(onChange);
      }
    };

    const backToTopRevealOffset = 240;
    const backToTopScrollDelta = 6;
    const backToTopIdleDelay = 200;
    let backToTopLastScroll = 0;
    let backToTopTimer = null;
    let viewportSafeBottomRaf = null;

    const updateViewportOrientation = () => {
      if (typeof window === "undefined") return;
      const viewportWidth =
        window.innerWidth ||
        (document.documentElement && document.documentElement.clientWidth) ||
        0;
      if (viewportWidth > 0) {
        isPortrait.value = viewportWidth <= mobileLayoutBreakpoint;
      } else if (window.matchMedia) {
        isPortrait.value = window.matchMedia("(orientation: portrait)").matches;
      } else {
        isPortrait.value = window.innerHeight >= window.innerWidth;
      }
      if (showLangMenu.value && updateLangMenuPlacement) {
        if (typeof nextTick === "function") {
          nextTick(updateLangMenuPlacement);
        } else {
          updateLangMenuPlacement();
        }
      }
    };

    updateViewportOrientation();

    const updateViewportSafeBottom = () => {
      if (typeof window === "undefined") return;
      const root = document.documentElement;
      if (!root) return;
      const viewport = window.visualViewport;
      if (!viewport) {
        root.style.removeProperty("--viewport-safe-bottom");
        return;
      }
      const blocked = Math.max(
        0,
        Math.round(window.innerHeight - (viewport.height + viewport.offsetTop))
      );
      root.style.setProperty("--viewport-safe-bottom", `${blocked}px`);
    };

    const scheduleViewportSafeBottom = () => {
      if (viewportSafeBottomRaf) return;
      viewportSafeBottomRaf = requestAnimationFrame(() => {
        viewportSafeBottomRaf = null;
        updateViewportSafeBottom();
      });
    };

    const clearBackToTopTimer = () => {
      if (backToTopTimer) {
        clearTimeout(backToTopTimer);
        backToTopTimer = null;
      }
    };

    const updateBackToTopVisibility = () => {
      if (typeof window === "undefined") return;
      const current = window.scrollY || window.pageYOffset || 0;
      const delta = current - backToTopLastScroll;
      if (current < backToTopRevealOffset) {
        showBackToTop.value = false;
      } else if (delta > backToTopScrollDelta) {
        showBackToTop.value = false;
      } else if (delta < -backToTopScrollDelta) {
        showBackToTop.value = true;
      }
      backToTopLastScroll = current;
      clearBackToTopTimer();
      backToTopTimer = setTimeout(() => {
        const position = window.scrollY || window.pageYOffset || 0;
        if (position >= backToTopRevealOffset) {
          showBackToTop.value = true;
        }
      }, backToTopIdleDelay);
    };

    const handleBackToTopScroll = () => {
      updateBackToTopVisibility();
    };

    const scrollToTop = () => {
      if (typeof window === "undefined") return;
      if (typeof window.scrollTo === "function") {
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        } catch (error) {
          // ignore and fall back
        }
      }
      window.scrollTo(0, 0);
    };

    const markPlanConfigHintSeen = () => {
      if (!showPlanConfigHintDot.value) return;
      showPlanConfigHintDot.value = false;
      try {
        localStorage.setItem(state.planConfigHintStorageKey, state.planConfigHintVersion);
      } catch (error) {
        reportStorageIssue("storage.write", state.planConfigHintStorageKey, error, {
          scope: "ui.plan-config-hint-write",
        });
      }
    };

    const markEquipRefiningNavHintSeen = () => {
      if (!showEquipRefiningNavHintDot.value) return;
      showEquipRefiningNavHintDot.value = false;
      try {
        localStorage.setItem(
          state.equipRefiningNavHintStorageKey,
          state.equipRefiningNavHintVersion
        );
      } catch (error) {
        reportStorageIssue("storage.write", state.equipRefiningNavHintStorageKey, error, {
          scope: "ui.equip-refining-nav-hint-write",
        });
      }
    };
    const markRerunRankingNavHintSeen = () => {
      if (!showRerunRankingNavHintDot.value) return;
      showRerunRankingNavHintDot.value = false;
      try {
        localStorage.setItem(
          state.rerunRankingNavHintStorageKey,
          state.rerunRankingNavHintVersion
        );
      } catch (error) {
        reportStorageIssue("storage.write", state.rerunRankingNavHintStorageKey, error, {
          scope: "ui.rerun-ranking-nav-hint-write",
        });
      }
    };

    const togglePlanConfig = () => {
      const nextOpen = !showPlanConfig.value;
      showPlanConfig.value = nextOpen;
      if (nextOpen) {
        markPlanConfigHintSeen();
      }
    };

    const planConfigSectionCollapsed =
      state.planConfigSectionCollapsed || ref({});
    const planConfigSectionManuallySet =
      state.planConfigSectionManuallySet || ref(false);
    const isPlanConfigSectionCollapsed = (key) => {
      const name = String(key || "");
      if (!name) return true;
      if (!planConfigSectionManuallySet.value) return true;
      const map = planConfigSectionCollapsed.value || {};
      return map[name] !== false;
    };
    const togglePlanConfigSectionCollapsed = (key) => {
      const name = String(key || "");
      if (!name) return;
      const current = isPlanConfigSectionCollapsed(name);
      const next = { ...(planConfigSectionCollapsed.value || {}) };
      next[name] = !current;
      planConfigSectionCollapsed.value = next;
      if (!planConfigSectionManuallySet.value) {
        planConfigSectionManuallySet.value = true;
      }
    };

    const handleDocClick = (event) => {
      if (!event || !event.target || !event.target.closest) {
        showSecondaryMenu.value = false;
        showPlanConfig.value = false;
        showLangMenu.value = false;
        return;
      }
      if (showSecondaryMenu.value && !event.target.closest(".secondary-menu")) {
        showSecondaryMenu.value = false;
      }
      if (showPlanConfig.value && !event.target.closest(".plan-config")) {
        showPlanConfig.value = false;
      }
      if (showLangMenu.value && !event.target.closest(".lang-switch")) {
        showLangMenu.value = false;
      }
    };

    const handleDocKeydown = (event) => {
      if (!event) return;
      if (event.key === "Escape") {
        showSecondaryMenu.value = false;
        showPlanConfig.value = false;
        showLangMenu.value = false;
      }
    };

    const runAfterLayout = (callback) => {
      if (typeof callback !== "function") return;
      const run = () => {
        let settled = false;
        const invoke = () => {
          if (settled) return;
          settled = true;
          callback();
        };
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(invoke);
          setTimeout(invoke, 120);
          return;
        }
        setTimeout(invoke, 0);
      };
      if (typeof nextTick === "function") {
        nextTick(run);
      } else {
        run();
      }
    };

    onMounted(() => {
      const finalizePreload = () => {
        warmupBackgroundBeforeFinish()
          .catch(() => false)
          .then((loaded) => {
            finishPreload();
            if (!loaded && typeof state.reapplyBackground === "function") {
              requestAnimationFrame(() => {
                state.reapplyBackground();
              });
            }
          });
      };
      state.appReady.value = true;
      try {
        if (typeof window !== "undefined") {
          window.addEventListener(optionalFailureEventName, handleOptionalFailureEvent);
        }
        flushBootOptionalFailureQueue();
        optionalFailurePollTimer = setInterval(() => {
          flushBootOptionalFailureQueue();
        }, 1200);
        bindSystemThemeListener();
        applyTheme(state.themePreference.value || "auto");
        updateViewportOrientation();
        window.addEventListener("resize", updateViewportOrientation);
        updateViewportSafeBottom();
        window.addEventListener("resize", scheduleViewportSafeBottom);
        if (window.visualViewport) {
          window.visualViewport.addEventListener("resize", scheduleViewportSafeBottom);
          window.visualViewport.addEventListener("scroll", scheduleViewportSafeBottom);
        }
        if (typeof window !== "undefined") {
          backToTopLastScroll = window.scrollY || window.pageYOffset || 0;
          updateBackToTopVisibility();
          window.addEventListener("scroll", handleBackToTopScroll, { passive: true });
        }
        document.addEventListener("click", handleDocClick);
        document.addEventListener("keydown", handleDocKeydown);
      } catch (error) {
        if (typeof console !== "undefined" && typeof console.error === "function") {
          console.error("[initUi:onMounted] failed, fallback to finalize preload", error);
        }
        flushBootOptionalFailureQueue();
        showUiInitWarning(error, { scope: "init-ui.onMounted" });
      } finally {
        runAfterLayout(finalizePreload);
      }
    });

    onBeforeUnmount(() => {
      if (removeMediaThemeListener) {
        removeMediaThemeListener();
        removeMediaThemeListener = null;
      }
      mediaTheme = null;
      window.removeEventListener("resize", updateViewportOrientation);
      window.removeEventListener("resize", scheduleViewportSafeBottom);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", scheduleViewportSafeBottom);
        window.visualViewport.removeEventListener("scroll", scheduleViewportSafeBottom);
      }
      if (viewportSafeBottomRaf) {
        cancelAnimationFrame(viewportSafeBottomRaf);
        viewportSafeBottomRaf = null;
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("scroll", handleBackToTopScroll);
        window.removeEventListener(optionalFailureEventName, handleOptionalFailureEvent);
      }
      clearBackToTopTimer();
      if (optionalFailurePollTimer) {
        clearInterval(optionalFailurePollTimer);
        optionalFailurePollTimer = null;
      }
      clearAllToastTimers();
      if (toastPointerMoveHandler && typeof document !== "undefined") {
        document.removeEventListener("pointermove", toastPointerMoveHandler);
        toastPointerMoveHandler = null;
      }
      if (toastPointerSyncHandle) {
        cancelAnimationFrame(toastPointerSyncHandle);
        toastPointerSyncHandle = 0;
      }
      toastPointerTrackerReady = false;
      toastPointerPosition = null;
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("keydown", handleDocKeydown);
      if (preloadBackgroundFadeTimer) {
        clearTimeout(preloadBackgroundFadeTimer);
        preloadBackgroundFadeTimer = null;
      }
      if (root) {
        root.classList.remove("bg-image-fading-in");
      }
    });

    syncToastPrimaryNotice();
    state.reportRuntimeWarning = reportRuntimeWarning;
    state.scrollToTop = scrollToTop;
    state.setThemeMode = setThemeMode;
    state.togglePlanConfig = togglePlanConfig;
    state.isPlanConfigSectionCollapsed = isPlanConfigSectionCollapsed;
    state.togglePlanConfigSectionCollapsed = togglePlanConfigSectionCollapsed;
    state.markEquipRefiningNavHintSeen = markEquipRefiningNavHintSeen;
    state.markRerunRankingNavHintSeen = markRerunRankingNavHintSeen;
    state.dismissRuntimeWarning = dismissRuntimeWarning;
    state.ignoreRuntimeWarnings = ignoreRuntimeWarnings;
    state.requestIgnoreRuntimeWarnings = requestIgnoreRuntimeWarnings;
    state.cancelIgnoreRuntimeWarnings = cancelIgnoreRuntimeWarnings;
    state.confirmIgnoreRuntimeWarnings = confirmIgnoreRuntimeWarnings;
    state.toastNotices = toastNotices;
    state.toastNotice = toastNotice;
    state.toastDefaultDurationMs = toastDefaultDurationMs;
    state.toastLeaveRects = toastLeaveRects;
    state.snapshotToastLeaveRects = snapshotToastLeaveRects;
    state.pushToastNotice = pushToastNotice;
    state.dismissToastNotice = dismissToastNotice;
    state.pauseToastNotice = pauseToastNotice;
    state.resumeToastNotice = resumeToastNotice;
    state.isToastNoticePaused = isToastNoticePaused;
    state.resumeToastNoticeIfNotHovered = resumeToastNoticeIfNotHovered;
    state.pauseAllToastNotices = pauseAllToastNotices;
    state.resumeAllToastNotices = resumeAllToastNotices;
    state.runToastAction = runToastAction;
    state.activateToastNotice = activateToastNotice;
    state.optionalFailureNotices = toastNotices;
    state.optionalFailureNotice = toastNotice;
    state.optionalFailureHistory = optionalFailureHistory;
    state.hasOptionalFailureHistory = hasOptionalFailureHistory;
    state.dismissOptionalFailureNotice = dismissOptionalFailureNotice;
    state.openOptionalFailureDetailByLogId = openOptionalFailureDetailByLogId;
    state.openLatestOptionalFailureDetail = openLatestOptionalFailureDetail;
    state.hasRuntimeWarningHistory = hasRuntimeWarningHistory;
    state.openLatestRuntimeWarningDetail = openLatestRuntimeWarningDetail;
    state.reloadBypassCache = reloadBypassCache;
    state.exportRuntimeDiagnosticBundle = exportRuntimeDiagnosticBundle;
  };
  modules.initUi.required = ["initState"];
  modules.initUi.optional = ["initI18n", "initSearch"];
  modules.initUi.requiredProviders = [];
  modules.initUi.optionalProviders = [];
  modules.initUi.provides = ["reportRuntimeWarning"];
})();
