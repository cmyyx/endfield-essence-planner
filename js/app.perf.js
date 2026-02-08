(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initPerf = function initPerf(ctx, state) {
    const { onMounted, onBeforeUnmount } = ctx;

    const perfAutoCooldownMs = 5000;
    const perfProbeThresholdMs = 46;
    const perfProbeMinSamples = 2;
    const lagThresholdMs = 180;
    const lagHitsForSwitch = 2;
    const longTaskThresholdMs = 260;
    const longTaskHitsForSwitch = 2;
    let perfAutoBlockedUntil = 0;
    let perfProbeRunning = false;
    let perfLagTimer = null;
    let perfLagTimeout = null;
    let longTaskObserver = null;
    let longTaskHits = 0;
    let lagHits = 0;
    let probeSlowHits = 0;
    let activityListenersBound = false;

    const removeActivityListeners = () => {
      if (!activityListenersBound) return;
      window.removeEventListener("scroll", onUserActivity);
      window.removeEventListener("wheel", onUserActivity);
      window.removeEventListener("pointerdown", onUserActivity);
      window.removeEventListener("keydown", onUserActivity);
      window.removeEventListener("touchstart", onUserActivity);
      document.removeEventListener("visibilitychange", onUserActivity);
      activityListenersBound = false;
    };

    const applyLowGpuMode = (enabled) => {
      state.lowGpuEnabled.value = enabled;
      document.documentElement.classList.toggle("low-gpu", enabled);
    };

    const readPerfMode = () => {
      try {
        const value = localStorage.getItem(state.perfModeStorageKey) || "";
        return value === "off" ? "standard" : value;
      } catch (error) {
        return "";
      }
    };

    const writePerfMode = (value) => {
      try {
        if (value) {
          localStorage.setItem(state.perfModeStorageKey, value);
        } else {
          localStorage.removeItem(state.perfModeStorageKey);
        }
      } catch (error) {
        // ignore storage errors
      }
    };

    const blockAutoSwitch = (durationMs) => {
      perfAutoBlockedUntil = Math.max(
        perfAutoBlockedUntil,
        performance.now() + (durationMs || 0)
      );
    };

    const canAutoSwitch = () => {
      if (document.visibilityState && document.visibilityState !== "visible") {
        return false;
      }
      return performance.now() >= perfAutoBlockedUntil;
    };

    const autoSwitchToLowGpu = () => {
      if (state.perfPreference.value !== "auto" || state.lowGpuEnabled.value) return;
      if (!canAutoSwitch()) return;
      applyLowGpuMode(true);
      state.showPerfNotice.value = true;
      stopAutoMonitors();
    };

    const stopAutoMonitors = () => {
      if (perfLagTimer) {
        clearInterval(perfLagTimer);
        perfLagTimer = null;
      }
      if (perfLagTimeout) {
        clearTimeout(perfLagTimeout);
        perfLagTimeout = null;
      }
      if (longTaskObserver) {
        longTaskObserver.disconnect();
        longTaskObserver = null;
      }
      longTaskHits = 0;
      lagHits = 0;
      probeSlowHits = 0;
    };

    const startPerfProbe = (durationMs = 1200) => {
      if (perfProbeRunning || state.perfPreference.value !== "auto") return;
      perfProbeRunning = true;
      let frames = 0;
      let total = 0;
      let last = performance.now();
      const start = last;
      const step = (now) => {
        total += now - last;
        frames += 1;
        last = now;
        if (now - start < durationMs) {
          requestAnimationFrame(step);
          return;
        }
        perfProbeRunning = false;
        const avg = total / Math.max(frames, 1);
        if (avg > perfProbeThresholdMs && state.perfPreference.value === "auto") {
          probeSlowHits += 1;
          if (probeSlowHits >= perfProbeMinSamples) {
            autoSwitchToLowGpu();
            probeSlowHits = 0;
          }
        } else {
          probeSlowHits = 0;
        }
      };
      requestAnimationFrame(step);
    };

    const startLagMonitor = (durationMs = 8000, intervalMs = 200) => {
      if (state.perfPreference.value !== "auto" || perfLagTimer) return;
      let last = performance.now();
      perfLagTimer = setInterval(() => {
        const now = performance.now();
        const lag = Math.max(0, now - last - intervalMs);
        last = now;
        if (lag > lagThresholdMs) {
          lagHits += 1;
          if (lagHits >= lagHitsForSwitch) {
            autoSwitchToLowGpu();
            lagHits = 0;
          }
        } else {
          lagHits = 0;
        }
      }, intervalMs);
      perfLagTimeout = setTimeout(() => {
        if (perfLagTimer) {
          clearInterval(perfLagTimer);
          perfLagTimer = null;
        }
        perfLagTimeout = null;
      }, durationMs);
    };

    const startLongTaskObserver = () => {
      if (state.perfPreference.value !== "auto" || longTaskObserver) return;
      if (typeof PerformanceObserver === "undefined") return;
      try {
        longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.some((entry) => entry.duration >= longTaskThresholdMs)) {
            longTaskHits += 1;
            if (longTaskHits >= longTaskHitsForSwitch) {
              autoSwitchToLowGpu();
              longTaskHits = 0;
            }
          } else {
            longTaskHits = 0;
          }
        });
        longTaskObserver.observe({ entryTypes: ["longtask"] });
      } catch (error) {
        longTaskObserver = null;
      }
    };

    const startAutoMonitors = () => {
      if (state.perfPreference.value !== "auto") return;
      if (!canAutoSwitch()) return;
      startPerfProbe();
      startLagMonitor();
      startLongTaskObserver();
    };

    const onUserActivity = () => {
      if (readPerfMode()) {
        removeActivityListeners();
        return;
      }
      if (state.perfPreference.value !== "auto") return;
      if (!canAutoSwitch()) return;
      startAutoMonitors();
    };

    const ensureActivityListeners = () => {
      if (activityListenersBound) return;
      window.addEventListener("scroll", onUserActivity, { passive: true });
      window.addEventListener("wheel", onUserActivity, { passive: true });
      window.addEventListener("pointerdown", onUserActivity);
      window.addEventListener("keydown", onUserActivity);
      window.addEventListener("touchstart", onUserActivity, { passive: true });
      document.addEventListener("visibilitychange", onUserActivity);
      activityListenersBound = true;
    };

    const initPerfMode = () => {
      const pref = readPerfMode();
      if (pref === "low") {
        state.perfPreference.value = "low";
        applyLowGpuMode(true);
        return;
      }
      if (pref === "standard") {
        state.perfPreference.value = "standard";
        applyLowGpuMode(false);
        return;
      }
      state.perfPreference.value = "auto";
      blockAutoSwitch(perfAutoCooldownMs);
      ensureActivityListeners();
      startAutoMonitors();
    };

    const setPerfMode = (mode) => {
      state.perfPreference.value = mode;
      state.showPerfNotice.value = false;
      if (mode === "low") {
        applyLowGpuMode(true);
        writePerfMode("low");
        stopAutoMonitors();
        removeActivityListeners();
        return;
      }
      if (mode === "standard") {
        applyLowGpuMode(false);
        writePerfMode("standard");
        stopAutoMonitors();
        removeActivityListeners();
        return;
      }
      writePerfMode("");
      applyLowGpuMode(false);
      stopAutoMonitors();
      blockAutoSwitch(perfAutoCooldownMs);
      ensureActivityListeners();
      startAutoMonitors();
    };

    onMounted(() => {
      initPerfMode();
    });

    onBeforeUnmount(() => {
      stopAutoMonitors();
      removeActivityListeners();
    });

    state.setPerfMode = setPerfMode;
  };
})();
