(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initContent = function initContent(ctx, state) {
    const { computed } = ctx;

    const fallbackLocale = state.fallbackLocale || "zh-CN";
    const t = state.t || ((value) => value);

    const getContentRoot = () => (typeof window !== "undefined" && window.CONTENT ? window.CONTENT : {});
    const getSponsorEntries = () =>
      typeof window !== "undefined" && Array.isArray(window.SPONSORS) ? window.SPONSORS : [];

    let pendingContentLoad = null;
    let pendingSponsorLoad = null;
    let sponsorsLoaded =
      typeof window !== "undefined" && Array.isArray(window.SPONSORS) && window.SPONSORS.length > 0;

    const ensureBaseContentLoaded = async () => {
      if (state.contentLoaded.value) return true;
      if (pendingContentLoad) return pendingContentLoad;
      if (typeof state.loadScriptOnce !== "function") return false;
      pendingContentLoad = (async () => {
        try {
          await state.loadScriptOnce("./data/content.js");
          state.contentLoaded.value = Boolean(window.CONTENT);
          return state.contentLoaded.value;
        } catch (error) {
          return false;
        } finally {
          pendingContentLoad = null;
        }
      })();
      return pendingContentLoad;
    };

    const ensureSponsorsLoaded = async () => {
      if (sponsorsLoaded) return true;
      if (pendingSponsorLoad) return pendingSponsorLoad;
      if (typeof state.loadScriptOnce !== "function") return false;
      pendingSponsorLoad = (async () => {
        try {
          await state.loadScriptOnce("./data/sponsors.js");
          sponsorsLoaded = Array.isArray(window.SPONSORS);
          return sponsorsLoaded;
        } catch (error) {
          return false;
        } finally {
          pendingSponsorLoad = null;
        }
      })();
      return pendingSponsorLoad;
    };

    const ensureContentLoaded = async (options = {}) => {
      const withSponsors = Boolean(options && options.withSponsors);
      state.contentLoading.value = true;
      try {
        const baseLoaded = await ensureBaseContentLoaded();
        if (!baseLoaded) return false;
        if (withSponsors) {
          const sponsorsLoaded = await ensureSponsorsLoaded();
          if (!sponsorsLoaded) return false;
        }
        return true;
      } finally {
        state.contentLoading.value = false;
      }
    };

    const normalizeSponsorList = (list) => {
      if (!Array.isArray(list)) return [];
      return list
        .map((entry) => {
          if (!entry) return null;
          if (typeof entry === "string") return { name: entry };
          if (typeof entry === "object") {
            const name = entry.name || entry.title || entry.label;
            if (!name) return null;
            return {
              name,
              amount: entry.amount || entry.money || "",
              note: entry.note || entry.message || "",
              date: entry.date || "",
            };
          }
          return null;
        })
        .filter(Boolean);
    };

    const noticeSanitizer =
      typeof window !== "undefined" &&
      window.__APP_SANITIZER__ &&
      typeof window.__APP_SANITIZER__.tokenizeNoticeItem === "function"
        ? window.__APP_SANITIZER__
        : {
            tokenizeNoticeItem: (value) => [{ type: "text", text: String(value || "") }],
          };

    const getContentForLocale = (targetLocale) => {
      const content = getContentRoot();
      const base = {
        announcement: content.announcement || {},
        changelog: content.changelog || {},
        about: content.about || {},
      };
      if (!content.locales || targetLocale === fallbackLocale) return base;
      const localized = content.locales[targetLocale] || {};
      return {
        announcement: { ...base.announcement, ...(localized.announcement || {}) },
        changelog: { ...base.changelog, ...(localized.changelog || {}) },
        about: { ...base.about, ...(localized.about || {}) },
      };
    };
    const i18nKeyPattern = /^[A-Za-z0-9_]+(?:[.-][A-Za-z0-9_]+)+$/;
    const resolveTitleValue = (rawTitle, fallbackKey) => {
      const fallbackTitle = t(fallbackKey);
      if (typeof rawTitle !== "string") return fallbackTitle;
      const normalizedTitle = rawTitle.trim();
      if (!normalizedTitle) return fallbackTitle;
      if (!i18nKeyPattern.test(normalizedTitle)) return normalizedTitle;
      const translated = t(normalizedTitle);
      return translated === "文案缺失" ? normalizedTitle : translated;
    };

    const localizedContent = computed(() => getContentForLocale(state.locale.value));
    const defaultAnnouncement = computed(() => ({
      version: "",
      title: t("nav.announcement"),
      date: "",
      qqGroup: "",
      qqNote: "",
      items: [],
    }));
    const announcement = computed(() => {
      const next = {
        ...defaultAnnouncement.value,
        ...(localizedContent.value.announcement || {}),
      };
      next.title = resolveTitleValue(next.title, "nav.announcement");
      return next;
    });
    const defaultChangelog = computed(() => ({
      title: t("nav.changelog"),
      entries: [],
    }));
    const changelog = computed(() => {
      const next = {
        ...defaultChangelog.value,
        ...(localizedContent.value.changelog || {}),
      };
      next.title = resolveTitleValue(next.title, "nav.changelog");
      return next;
    });
    const defaultAbout = computed(() => ({
      title: t("nav.about_this_tool"),
      paragraphs: [],
      author: "",
      links: [],
      thanks: [],
    }));
    const aboutContent = computed(() => {
      const base = {
        ...defaultAbout.value,
        ...(localizedContent.value.about || {}),
      };
      base.title = resolveTitleValue(base.title, "nav.about_this_tool");
      const list = normalizeSponsorList((base.sponsor && base.sponsor.list) || getSponsorEntries());
      const items =
        (base.sponsor && Array.isArray(base.sponsor.items) && base.sponsor.items) || [];
      if (items.length) base.sponsor = { ...(base.sponsor || {}), items };
      if (list.length) {
        base.sponsor = { ...(base.sponsor || {}), list };
      }
      return base;
    });

    state.content = computed(() => getContentRoot());
    state.ensureContentLoaded = ensureContentLoaded;
    state.announcement = announcement;
    state.formatNoticeItem = (value) => noticeSanitizer.tokenizeNoticeItem(value);
    state.changelog = changelog;
    state.aboutContent = aboutContent;
  };
})();
