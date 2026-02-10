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

    const escapeHtml = (value) =>
      String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const sanitizeUrl = (value) => {
      const trimmed = String(value || "").trim();
      if (!/^https?:\/\//i.test(trimmed)) return "";
      return escapeHtml(trimmed);
    };

    const formatNoticeItem = (value) => {
      const raw = String(value || "");
      const linkTokens = [];
      const tokenized = raw.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, text, url) => {
        const safeUrl = sanitizeUrl(url);
        const safeText = escapeHtml(text);
        const html = safeUrl
          ? '<a class="notice-link" href="' +
            safeUrl +
            '" target="_blank" rel="noreferrer">' +
            safeText +
            "</a>"
          : safeText;
        const token = `__NOTICE_LINK_${linkTokens.length}__`;
        linkTokens.push({ token, html });
        return token;
      });

      const escaped = escapeHtml(tokenized);
      const highlighted = escaped.replace(/==(.+?)==/g, '<mark class="notice-highlight">$1</mark>');
      const urlPattern = /https?:\/\/[^\s<]+/g;
      const linked = highlighted.replace(urlPattern, (match) => {
        const trimmed = match.replace(/[),.;!?，。！？、]+$/g, "");
        const tail = match.slice(trimmed.length);
        if (!trimmed) return match;
        return (
          '<a class="notice-link" href="' +
          trimmed +
          '" target="_blank" rel="noreferrer">' +
          trimmed +
          "</a>" +
          tail
        );
      });

      return linkTokens.reduce((result, entry) => result.replace(entry.token, entry.html), linked);
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

    const localizedContent = computed(() => getContentForLocale(state.locale.value));
    const defaultAnnouncement = computed(() => ({
      version: "",
      title: t("公告"),
      date: "",
      qqGroup: "",
      qqNote: "",
      items: [],
    }));
    const announcement = computed(() => ({
      ...defaultAnnouncement.value,
      ...(localizedContent.value.announcement || {}),
    }));
    const defaultChangelog = computed(() => ({
      title: t("更新日志"),
      entries: [],
    }));
    const changelog = computed(() => ({
      ...defaultChangelog.value,
      ...(localizedContent.value.changelog || {}),
    }));
    const defaultAbout = computed(() => ({
      title: t("关于本工具"),
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
    state.formatNoticeItem = formatNoticeItem;
    state.changelog = changelog;
    state.aboutContent = aboutContent;
  };
})();
