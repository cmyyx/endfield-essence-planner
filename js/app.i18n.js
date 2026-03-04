(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initI18n = function initI18n(ctx, state) {
    const { ref, computed, watch, nextTick } = ctx;

    const i18n = window.I18N || {};
    const fallbackLocale = "zh-CN";
    const allLocales = ["zh-CN", "zh-TW", "en", "ja"];
    const localeScriptMap = {
      "zh-CN": "./data/i18n/zh-CN.js",
      "zh-TW": "./data/i18n/zh-TW.js",
      en: "./data/i18n/en.js",
      ja: "./data/i18n/ja.js",
    };
    const missingI18nPlaceholder = "文案缺失";
    const missingI18nWarningDedupWindowMs = 10000;
    const missingI18nWarningLastSeenAt = new Map();
    const reportStorageIssue = (operation, key, error, meta) => {
      if (typeof state.reportStorageIssue === "function") {
        state.reportStorageIssue(operation, key, error, meta);
        return;
      }
      const queue = Array.isArray(state.pendingStorageIssues) ? state.pendingStorageIssues : [];
      queue.push({ operation, key, error, meta });
      state.pendingStorageIssues = queue.slice(-20);
    };
    const isLocaleLoaded = (localeKey) => Boolean(i18n && i18n[localeKey]);
    const normalizeLocale = (value) => (allLocales.includes(value) ? value : fallbackLocale);
    const detectLocale = () => {
      if (typeof window === "undefined") return fallbackLocale;
      let stored = "";
      try {
        stored = localStorage.getItem(state.langStorageKey);
      } catch (error) {
        reportStorageIssue("storage.read", state.langStorageKey, error, {
          scope: "i18n.detect-locale",
        });
      }
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
    const localeRenderVersion = ref(0);
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
        const loaded = isLocaleLoaded(normalized);
        if (loaded) {
          localeRenderVersion.value += 1;
        }
        return loaded;
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
    const resolveLocalizedString = (targetLocale, key, fallbackText) => {
      const localeStrings = getStrings(targetLocale);
      if (Object.prototype.hasOwnProperty.call(localeStrings, key)) {
        return localeStrings[key];
      }
      const fallbackStrings = getStrings(fallbackLocale);
      if (Object.prototype.hasOwnProperty.call(fallbackStrings, key)) {
        return fallbackStrings[key];
      }
      return fallbackText;
    };
    const interpolate = (text, params) => {
      if (!params) return text;
      return String(text).replace(/\{(\w+)\}/g, (match, name) =>
        Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
      );
    };
    const reportMissingI18nKey = (targetLocale, messageKey) => {
      if (typeof state.reportRuntimeWarning !== "function") return;
      const normalizedLocale = normalizeLocale(targetLocale);
      const normalizedKey = String(messageKey || "").trim() || "unknown";
      const warningKey = `${normalizedLocale}:${normalizedKey}`;
      const optionalSignature = `i18n-missing-key:${warningKey}`;
      const now = Date.now();
      const lastSeenAt = missingI18nWarningLastSeenAt.get(optionalSignature) || 0;
      if (now - lastSeenAt <= missingI18nWarningDedupWindowMs) return;
      missingI18nWarningLastSeenAt.set(optionalSignature, now);
      const warning = new Error(`Missing i18n key: ${warningKey}`);
      warning.name = "I18nMissingKeyError";
      const localizedTitle = interpolate(
        resolveLocalizedString(
          normalizedLocale,
          "warning.i18n_missing_key_title",
          "文案缺失提醒（{locale}）"
        ),
        { locale: normalizedLocale }
      );
      const localizedSummary = interpolate(
        resolveLocalizedString(
          normalizedLocale,
          "warning.i18n_missing_key_summary",
          "检测到文案缺失，已回退到占位文案。"
        ),
        { locale: normalizedLocale }
      );
      state.reportRuntimeWarning(warning, {
        scope: "i18n.missing-key",
        operation: "i18n.lookup",
        key: warningKey,
        title: localizedTitle,
        summary: localizedSummary,
        note: `locale=${normalizedLocale}\nkey=${normalizedKey}`,
        asToast: true,
        optionalSignature,
      });
    };
    const t = (key, params) => {
      void localeRenderVersion.value;
      const strings = getStrings(locale.value);
      const fallbackStrings = getStrings(fallbackLocale);
      const hasLocaleValue = Object.prototype.hasOwnProperty.call(strings, key);
      const hasFallbackValue = Object.prototype.hasOwnProperty.call(fallbackStrings, key);
      const raw = hasLocaleValue
        ? strings[key]
        : hasFallbackValue
        ? fallbackStrings[key]
        : missingI18nPlaceholder;
      if (!hasLocaleValue && !hasFallbackValue) {
        reportMissingI18nKey(locale.value, key);
      }
      return interpolate(raw, params);
    };

    const translateOptionItems = (items) =>
      (items || []).map((item) => ({
        ...item,
        label: t(item.label),
        description: t(item.description),
      }));

    const tRegionPriorityModeOptions = computed(() =>
      translateOptionItems(state.regionPriorityModeOptions)
    );
    const tOwnershipPriorityModeOptions = computed(() =>
      translateOptionItems(state.ownershipPriorityModeOptions)
    );
    const tStrictPriorityOrderOptions = computed(() =>
      translateOptionItems(state.strictPriorityOrderOptions)
    );
    const tTerm = (category, value) => {
      void localeRenderVersion.value;
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
    const seoTitle = "终末地基质规划器 (Endfield Essence Planner)";
    const seoDescription =
      "终末地基质规划器：根据附加/技能属性池与锁定规则，自动计算多武器共刷方案，提供基础属性冲突提示与可刷数量参考，适配移动端。 Endfield Essence Planner: plan efficient shared dungeon farming across multiple weapons with lock rules, trait pools, base-attribute conflict hints, and mobile-friendly guidance.";
    const seoSiteName = "终末地基质规划器 (Endfield Essence Planner)";

    const updateMeta = () => {
      if (typeof document === "undefined") return;
      document.title = seoTitle;
      const metaDesc = document.querySelector('meta[name=\"description\"]');
      if (metaDesc) metaDesc.setAttribute("content", seoDescription);
      const ogTitle = document.querySelector('meta[property=\"og:title\"]');
      if (ogTitle) ogTitle.setAttribute("content", seoTitle);
      const ogDesc = document.querySelector('meta[property=\"og:description\"]');
      if (ogDesc) ogDesc.setAttribute("content", seoDescription);
      const ogSiteName = document.querySelector('meta[property=\"og:site_name\"]');
      if (ogSiteName) ogSiteName.setAttribute("content", seoSiteName);
    };

    const updatePreloadText = () => {
      if (typeof document === "undefined") return;
      const overlay = document.getElementById("app-preload");
      if (!overlay) return;
      const title = overlay.querySelector(".preload-title");
      const sub = overlay.querySelector(".preload-note") || overlay.querySelector(".preload-sub");
      if (title) title.textContent = t("preload_title");
      if (sub) sub.textContent = t("preload_note");
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
          reportStorageIssue("storage.write", state.langStorageKey, error, {
            scope: "i18n.persist-locale",
          });
        }
        localeRenderVersion.value += 1;
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
    state.tRegionPriorityModeOptions = tRegionPriorityModeOptions;
    state.tOwnershipPriorityModeOptions = tOwnershipPriorityModeOptions;
    state.tStrictPriorityOrderOptions = tStrictPriorityOrderOptions;
    state.localeRenderVersion = localeRenderVersion;
  };
  modules.initI18n.required = ["initState"];
  modules.initI18n.optional = [];
  modules.initI18n.requiredProviders = [];
  modules.initI18n.optionalProviders = [];
})();
