(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initBackground = function initBackground(ctx, state) {
    const { watch, onMounted, onBeforeUnmount } = ctx;
    const storageKey = state.backgroundStorageKey || "planner-bg-image:v1";
    const apiStorageKey = state.backgroundApiStorageKey || "planner-bg-api:v1";
    const root = typeof document !== "undefined" ? document.documentElement : null;
    const defaultBackgroundUrl = "https://img.canmoe.com/image?img=ua";
    let mounted = false;
    let fallbackFadeTimer = null;

    const normalizeUrlValue = (value) => {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "";
      if (/^url\(/i.test(trimmed)) return trimmed;
      const safe = trimmed.replace(/"/g, '\\"');
      return `url("${safe}")`;
    };

    const defaultBackgroundCssValue = normalizeUrlValue(defaultBackgroundUrl);

    const setRootBackground = (value) => {
      if (!root) return;
      const normalized = normalizeUrlValue(value);
      if (normalized) {
        root.style.setProperty("--bg-image", normalized);
      } else {
        root.style.removeProperty("--bg-image");
      }
    };

    const getInlineBackgroundValue = () => {
      if (!root) return "";
      return String(root.style.getPropertyValue("--bg-image") || "").trim();
    };

    const markBackgroundFadeIn = () => {
      if (!root) return;
      root.classList.add("bg-image-fading-in");
      if (fallbackFadeTimer) {
        clearTimeout(fallbackFadeTimer);
      }
      fallbackFadeTimer = setTimeout(() => {
        fallbackFadeTimer = null;
        if (!root) return;
        root.classList.remove("bg-image-fading-in");
      }, 720);
    };

    const clearFadeTimer = () => {
      if (fallbackFadeTimer) {
        clearTimeout(fallbackFadeTimer);
        fallbackFadeTimer = null;
        if (root) {
          root.classList.remove("bg-image-fading-in");
        }
      }
    };

    const setBackgroundVisualEnabled = (enabled) => {
      if (!root) return;
      const visualEnabled = Boolean(enabled);
      root.setAttribute("data-bg-display", visualEnabled ? "on" : "off");
      if (!visualEnabled) {
        clearFadeTimer();
        root.style.setProperty("--bg-image", "none");
      } else if (String(root.style.getPropertyValue("--bg-image") || "").trim() === "none") {
        root.style.removeProperty("--bg-image");
      }
    };

    const isLowGpuMode = () => Boolean(state.lowGpuEnabled && state.lowGpuEnabled.value);

    const isStandardBackgroundEnabled = () => {
      if (isLowGpuMode()) return false;
      if (state.backgroundDisplayEnabled && "value" in state.backgroundDisplayEnabled) {
        return state.backgroundDisplayEnabled.value !== false;
      }
      return true;
    };

    const shouldUseDefaultBackground = () => {
      if (!root) return false;
      if (!isStandardBackgroundEnabled()) return false;
      const customFile = state.customBackground ? state.customBackground.value : "";
      if (customFile) return false;
      const customApi = state.customBackgroundApi ? state.customBackgroundApi.value : "";
      if (customApi) return false;
      return true;
    };

    const applyRootBackground = (value, options = {}) => {
      if (!root) return false;
      const normalized = normalizeUrlValue(value);
      const current = getInlineBackgroundValue();
      if (current === normalized) return false;
      if (normalized) {
        setRootBackground(normalized);
      } else {
        setRootBackground("");
      }
      if (normalized && options.fade && !root.classList.contains("preload")) {
        markBackgroundFadeIn();
      }
      return true;
    };

    const applyBackground = () => {
      if (!root) return;
      if (!isStandardBackgroundEnabled()) {
        setBackgroundVisualEnabled(false);
        return;
      }
      setBackgroundVisualEnabled(true);
      const customFile = state.customBackground ? state.customBackground.value : "";
      if (customFile) {
        applyRootBackground(customFile, { fade: mounted });
        return;
      }
      const customApi = state.customBackgroundApi ? state.customBackgroundApi.value : "";
      if (customApi) {
        applyRootBackground(customApi, { fade: mounted });
        return;
      }
      if (!shouldUseDefaultBackground()) {
        applyRootBackground("", { fade: false });
        return;
      }
      applyRootBackground(defaultBackgroundCssValue, { fade: mounted });
    };

    const readStoredBackground = () => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        if (raw.startsWith("data:")) {
          state.customBackground.value = raw;
          return;
        }
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.data === "string") {
            state.customBackground.value = parsed.data;
          }
          if (typeof parsed.name === "string") {
            state.customBackgroundName.value = parsed.name;
          }
        }
      } catch (error) {
        // ignore storage errors
      }
    };

    const readStoredApi = () => {
      try {
        const raw = localStorage.getItem(apiStorageKey);
        if (!raw) return;
        if (typeof raw === "string") {
          state.customBackgroundApi.value = raw;
        }
      } catch (error) {
        // ignore storage errors
      }
    };

    const saveBackground = () => {
      if (!state.customBackground.value) {
        try {
          localStorage.removeItem(storageKey);
        } catch (error) {
          // ignore storage errors
        }
        return;
      }
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            data: state.customBackground.value,
            name: state.customBackgroundName.value || "",
          })
        );
        state.customBackgroundError.value = "";
      } catch (error) {
        state.customBackgroundError.value =
          (state.t && state.t("背景图片过大，无法保存到浏览器。")) ||
          "背景图片过大，无法保存到浏览器。";
      }
    };

    const saveApi = () => {
      const value = String(state.customBackgroundApi.value || "").trim();
      state.customBackgroundApi.value = value;
      if (!value) {
        try {
          localStorage.removeItem(apiStorageKey);
        } catch (error) {
          // ignore storage errors
        }
        return;
      }
      try {
        localStorage.setItem(apiStorageKey, value);
      } catch (error) {
        // ignore storage errors
      }
    };

    const clearCustomBackground = () => {
      state.customBackground.value = "";
      state.customBackgroundName.value = "";
      state.customBackgroundError.value = "";
      state.customBackgroundApi.value = "";
      try {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(apiStorageKey);
      } catch (error) {
        // ignore storage errors
      }
      applyBackground();
    };

    const setBackgroundDisplayEnabled = (enabled) => {
      const next = Boolean(enabled);
      if (state.backgroundDisplayEnabled && state.backgroundDisplayEnabled.value === next) {
        applyBackground();
        return;
      }
      if (state.backgroundDisplayEnabled) {
        state.backgroundDisplayEnabled.value = next;
      }
      applyBackground();
    };

    const toggleBackgroundDisplayEnabled = () => {
      const current = Boolean(state.backgroundDisplayEnabled && state.backgroundDisplayEnabled.value);
      setBackgroundDisplayEnabled(!current);
    };

    const handleBackgroundFile = (event) => {
      const input = event && event.target;
      const file = input && input.files && input.files[0];
      if (!file) return;
      if (!file.type || !file.type.startsWith("image/")) {
        state.customBackgroundError.value =
          (state.t && state.t("请选择图片文件。")) || "请选择图片文件。";
        if (input) input.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        if (!dataUrl.startsWith("data:")) {
          state.customBackgroundError.value =
            (state.t && state.t("读取图片失败。")) || "读取图片失败。";
          return;
        }
        state.customBackground.value = dataUrl;
        state.customBackgroundName.value = file.name || "";
        state.customBackgroundError.value = "";
        saveBackground();
        applyBackground();
      };
      reader.onerror = () => {
        state.customBackgroundError.value =
          (state.t && state.t("读取图片失败。")) || "读取图片失败。";
      };
      reader.readAsDataURL(file);
      if (input) input.value = "";
    };

    readStoredBackground();
    readStoredApi();
    applyBackground();

    watch(
      () => [
        state.customBackground.value,
        state.lowGpuEnabled.value,
        state.backgroundDisplayEnabled ? state.backgroundDisplayEnabled.value : true,
      ],
      () => applyBackground(),
      { immediate: true }
    );

    watch(
      () => state.customBackgroundApi.value,
      () => {
        saveApi();
        applyBackground();
      }
    );

    onMounted(() => {
      mounted = true;
      applyBackground();
    });

    if (typeof onBeforeUnmount === "function") {
      onBeforeUnmount(() => {
        clearFadeTimer();
        if (root) {
          root.removeAttribute("data-bg-display");
        }
      });
    }

    state.handleBackgroundFile = handleBackgroundFile;
    state.clearCustomBackground = clearCustomBackground;
    state.setBackgroundDisplayEnabled = setBackgroundDisplayEnabled;
    state.toggleBackgroundDisplayEnabled = toggleBackgroundDisplayEnabled;
    state.reapplyBackground = applyBackground;
  };
})();
