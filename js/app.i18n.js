(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initI18n = function initI18n(ctx, state) {
    const { ref, computed, watch, nextTick } = ctx;

    const i18n = window.I18N || {};
    const fallbackLocale = "zh-CN";
    const allLocales = ["zh-CN", "zh-TW", "en", "ja"];
    const localeScriptMap = {
      "zh-CN": "./data/i18n.zh-CN.js",
      "zh-TW": "./data/i18n.zh-TW.js",
      en: "./data/i18n.en.js",
      ja: "./data/i18n.ja.js",
    };
    const isLocaleLoaded = (localeKey) => Boolean(i18n && i18n[localeKey]);
    const normalizeLocale = (value) => (allLocales.includes(value) ? value : fallbackLocale);
    const detectLocale = () => {
      if (typeof window === "undefined") return fallbackLocale;
      const stored = localStorage.getItem(state.langStorageKey);
      if (stored && allLocales.includes(stored)) return normalizeLocale(stored);
      const raw = (navigator.language || "").toLowerCase();
      if (raw.startsWith("zh")) {
        if (raw.includes("tw") || raw.includes("hk") || raw.includes("mo") || raw.includes("hant")) {
          return normalizeLocale("zh-TW");
        }
        return normalizeLocale("zh-CN");
      }
      if (raw.startsWith("ja")) return normalizeLocale("ja");
      return normalizeLocale("en");
    };

    const locale = ref(detectLocale());
    const localeLabels = {
      "zh-CN": "简体中文",
      "zh-TW": "繁體中文",
      en: "English",
      ja: "日本語",
    };
    const localeLoading = ref(false);
    const languageOptions = computed(() =>
      allLocales.map((value) => ({
        value,
        label: localeLabels[value] || value,
      }))
    );

    const langSwitchRef = ref(null);
    const showLangMenu = ref(false);
    const langMenuPlacement = ref("right");
    const updateLangMenuPlacement = () => {
      if (typeof window === "undefined") return;
      const container = langSwitchRef.value;
      if (!container) return;
      const menu = container.querySelector(".lang-menu");
      const button = container.querySelector(".lang-button");
      if (!menu || !button) return;
      const menuWidth = menu.offsetWidth || 0;
      const viewportWidth =
        window.innerWidth ||
        (document.documentElement && document.documentElement.clientWidth) ||
        0;
      if (!viewportWidth || !menuWidth) return;
      const margin = 8;
      const buttonRect = button.getBoundingClientRect();
      const rightAlignLeft = buttonRect.right - menuWidth;
      const rightAlignRight = buttonRect.right;
      const leftAlignLeft = buttonRect.left;
      const leftAlignRight = buttonRect.left + menuWidth;
      const fitsRight = rightAlignLeft >= margin && rightAlignRight <= viewportWidth - margin;
      const fitsLeft = leftAlignLeft >= margin && leftAlignRight <= viewportWidth - margin;
      if (!fitsRight && fitsLeft) {
        langMenuPlacement.value = "left";
        return;
      }
      if (!fitsLeft && fitsRight) {
        langMenuPlacement.value = "right";
        return;
      }
      if (!fitsLeft && !fitsRight) {
        const spaceRight = viewportWidth - buttonRect.left;
        const spaceLeft = buttonRect.right;
        langMenuPlacement.value = spaceRight >= spaceLeft ? "left" : "right";
        return;
      }
      langMenuPlacement.value = "right";
    };

    const ensureLocaleLoaded = async (targetLocale) => {
      const normalized = normalizeLocale(targetLocale);
      if (isLocaleLoaded(normalized)) return true;
      const src = localeScriptMap[normalized];
      if (!src || typeof state.loadScriptOnce !== "function") return false;
      localeLoading.value = true;
      try {
        await state.loadScriptOnce(src);
        return isLocaleLoaded(normalized);
      } catch (error) {
        return false;
      } finally {
        localeLoading.value = false;
      }
    };

    const toggleLangMenu = () => {
      state.showSecondaryMenu.value = false;
      showLangMenu.value = !showLangMenu.value;
      if (showLangMenu.value) {
        if (typeof nextTick === "function") {
          nextTick(updateLangMenuPlacement);
        } else {
          updateLangMenuPlacement();
        }
      }
    };

    const setLocale = async (value) => {
      const normalized = normalizeLocale(value);
      if (!isLocaleLoaded(normalized)) {
        await ensureLocaleLoaded(normalized);
      }
      locale.value = normalized;
      showLangMenu.value = false;
    };

    const getStrings = (targetLocale) =>
      (i18n[targetLocale] && i18n[targetLocale].strings) || {};
    const getTerms = (targetLocale) =>
      (i18n[targetLocale] && i18n[targetLocale].terms) || {};
    const interpolate = (text, params) => {
      if (!params) return text;
      return String(text).replace(/\{(\w+)\}/g, (match, name) =>
        Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
      );
    };
    const t = (key, params) => {
      const strings = getStrings(locale.value);
      const fallbackStrings = getStrings(fallbackLocale);
      const raw =
        Object.prototype.hasOwnProperty.call(strings, key)
          ? strings[key]
          : Object.prototype.hasOwnProperty.call(fallbackStrings, key)
          ? fallbackStrings[key]
          : key;
      return interpolate(raw, params);
    };

    const tPlanPriorityMode = (value) => {
      const config = state.regionPriorityModeOptions || [];
      const matched = config.find((item) => item && item.value === value);
      if (!matched) return value;
      return {
        ...matched,
        label: t(matched.label),
        description: t(matched.description),
      };
    };

    const tPlanPriorityModeOptions = computed(() =>
      (state.regionPriorityModeOptions || []).map((item) => ({
        ...item,
        label: t(item.label),
        description: t(item.description),
      }))
    );
    const tTerm = (category, value) => {
      if (!value) return value;
      const terms = getTerms(locale.value);
      const fallbackTerms = getTerms(fallbackLocale);
      const table = terms && terms[category] ? terms[category] : {};
      const fallbackTable = fallbackTerms && fallbackTerms[category] ? fallbackTerms[category] : {};
      return table[value] || fallbackTable[value] || value;
    };

    i18nState.t = t;
    i18nState.tTerm = tTerm;
    i18nState.locale = locale.value;

    const showAiNotice = computed(() => locale.value !== "zh-CN");

    const updateMeta = () => {
      if (typeof document === "undefined") return;
      const title = t("终末地基质规划器 (Endfield Essence Planner)");
      const description = t(
        "终末地基质规划器：根据附加/技能属性池与锁定规则，自动计算多武器共刷方案，提供基础属性冲突提示与可刷数量参考，适配移动端。"
      );
      document.title = title;
      const metaDesc = document.querySelector('meta[name=\"description\"]');
      if (metaDesc) metaDesc.setAttribute("content", description);
      const ogTitle = document.querySelector('meta[property=\"og:title\"]');
      if (ogTitle) ogTitle.setAttribute("content", title);
      const ogDesc = document.querySelector('meta[property=\"og:description\"]');
      if (ogDesc) ogDesc.setAttribute("content", description);
      const ogSiteName = document.querySelector('meta[property=\"og:site_name\"]');
      if (ogSiteName) ogSiteName.setAttribute("content", t("终末地基质规划器"));
    };

    const updatePreloadText = () => {
      if (typeof document === "undefined") return;
      const overlay = document.getElementById("app-preload");
      if (!overlay) return;
      const title = overlay.querySelector(".preload-title");
      const sub = overlay.querySelector(".preload-sub");
      if (title) title.textContent = t("少女祈祷中");
      if (sub) sub.textContent = t("首次打开或强制刷新可能稍慢");
    };

    let localeWatchSeq = 0;
    watch(
      locale,
      async (value) => {
        const requestId = ++localeWatchSeq;
        const normalized = normalizeLocale(value);
        if (!isLocaleLoaded(normalized)) {
          const loaded = await ensureLocaleLoaded(normalized);
          if (requestId !== localeWatchSeq) return;
          if (!loaded && normalized !== fallbackLocale) {
            locale.value = fallbackLocale;
            return;
          }
        }
        if (requestId !== localeWatchSeq) return;
        i18nState.locale = normalized;
        if (typeof document !== "undefined") {
          document.documentElement.lang = normalized;
        }
        try {
          localStorage.setItem(state.langStorageKey, normalized);
        } catch (error) {
          // ignore storage errors
        }
        updateMeta();
        updatePreloadText();
      },
      { immediate: true }
    );

    state.locale = locale;
    state.languageOptions = languageOptions;
    state.localeLoading = localeLoading;
    state.ensureLocaleLoaded = ensureLocaleLoaded;
    state.langSwitchRef = langSwitchRef;
    state.showLangMenu = showLangMenu;
    state.langMenuPlacement = langMenuPlacement;
    state.toggleLangMenu = toggleLangMenu;
    state.setLocale = setLocale;
    state.t = t;
    state.tTerm = tTerm;
    state.showAiNotice = showAiNotice;
    state.updateLangMenuPlacement = updateLangMenuPlacement;
    state.fallbackLocale = fallbackLocale;
    state.tPlanPriorityMode = tPlanPriorityMode;
    state.tPlanPriorityModeOptions = tPlanPriorityModeOptions;
  };
})();
