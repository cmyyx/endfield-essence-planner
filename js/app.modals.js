(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initModals = function initModals(ctx, state) {
    const { watch, onMounted, onBeforeUnmount } = ctx;
    const modalTransitionMs = 280;
    let modalUnlockTimer = null;

    const readNoticeSkipVersion = () => {
      try {
        return localStorage.getItem(state.noticeSkipKey) || "";
      } catch (error) {
        return "";
      }
    };

    const writeNoticeSkipVersion = (version) => {
      try {
        if (version) {
          localStorage.setItem(state.noticeSkipKey, version);
        } else {
          localStorage.removeItem(state.noticeSkipKey);
        }
      } catch (error) {
        // ignore storage errors
      }
    };

    const cleanupLegacyNoticeKeys = () => {
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key && key.startsWith(state.legacyNoticePrefix)) {
            keys.push(key);
          }
        }
        keys.forEach((key) => localStorage.removeItem(key));
      } catch (error) {
        // ignore storage errors
      }
    };

    const ensureModalContent = async (withSponsors = false) => {
      if (typeof state.ensureContentLoaded === "function") {
        await state.ensureContentLoaded({ withSponsors });
      }
    };

    const openNotice = async () => {
      state.showNotice.value = true;
      await ensureModalContent(false);
      state.skipNotice.value =
        readNoticeSkipVersion() === (state.announcement.value || {}).version;
    };

    const openChangelog = async () => {
      state.showChangelog.value = true;
      await ensureModalContent(false);
    };

    const openAbout = async () => {
      state.showAbout.value = true;
      await ensureModalContent(true);
    };

    const closeNotice = () => {
      state.showNotice.value = false;
      const currentVersion = (state.announcement.value || {}).version;
      if (state.skipNotice.value) {
        writeNoticeSkipVersion(currentVersion);
        return;
      }
      if (readNoticeSkipVersion() === currentVersion) {
        writeNoticeSkipVersion("");
      }
    };

    let scrollLockActive = false;
    let scrollLockY = 0;
    const supportsStableGutter = (() => {
      try {
        return typeof CSS !== "undefined" && CSS.supports("scrollbar-gutter: stable");
      } catch (error) {
        return false;
      }
    })();

    const setModalScrollLock = (locked) => {
      if (typeof window === "undefined") return;
      const root = document.documentElement;
      const body = document.body;
      if (locked) {
        if (scrollLockActive) return;
        scrollLockActive = true;
        scrollLockY = window.scrollY || window.pageYOffset || 0;
        const scrollbarGap = window.innerWidth - root.clientWidth;
        if (scrollbarGap > 0 && !supportsStableGutter) {
          body.style.paddingRight = `${scrollbarGap}px`;
        }
        body.style.position = "fixed";
        body.style.top = `-${scrollLockY}px`;
        body.style.left = "0";
        body.style.right = "0";
        body.style.width = "100%";
        body.style.overflow = "hidden";
        root.classList.add("modal-open");
        body.classList.add("modal-open");
        return;
      }
      if (!scrollLockActive) return;
      scrollLockActive = false;
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";
      body.style.paddingRight = "";
      root.classList.remove("modal-open");
      body.classList.remove("modal-open");
      if (scrollLockY) {
        window.scrollTo(0, scrollLockY);
      }
    };

    onMounted(() => {
      cleanupLegacyNoticeKeys();

      const autoOpenNotice = async () => {
        await ensureModalContent(false);
        if (!state.contentLoaded.value) return;
        const skippedVersion = readNoticeSkipVersion();
        if (skippedVersion !== (state.announcement.value || {}).version) {
          state.skipNotice.value = false;
          state.showNotice.value = true;
        }
      };
      autoOpenNotice();

      if (typeof state.maybeAutoStartTutorial === "function") {
        state.maybeAutoStartTutorial();
      }
    });

    watch(
      [state.showNotice, state.showChangelog, state.showAbout, state.showTutorialSkipConfirm],
      ([noticeOpen, changelogOpen, aboutOpen, skipOpen]) => {
        const hasOpenModal = Boolean(noticeOpen || changelogOpen || aboutOpen || skipOpen);
        if (modalUnlockTimer) {
          clearTimeout(modalUnlockTimer);
          modalUnlockTimer = null;
        }
        if (hasOpenModal) {
          setModalScrollLock(true);
          return;
        }
        modalUnlockTimer = setTimeout(() => {
          setModalScrollLock(false);
          modalUnlockTimer = null;
        }, modalTransitionMs);
      },
      { immediate: true }
    );

    watch(
      [state.showNotice, state.showChangelog, state.showAbout, state.showDomainWarning],
      () => {
        if (typeof state.maybeAutoStartTutorial === "function") {
          state.maybeAutoStartTutorial();
        }
      },
      { immediate: true }
    );

    onBeforeUnmount(() => {
      if (modalUnlockTimer) {
        clearTimeout(modalUnlockTimer);
        modalUnlockTimer = null;
      }
      setModalScrollLock(false);
    });

    state.openNotice = openNotice;
    state.openChangelog = openChangelog;
    state.openAbout = openAbout;
    state.closeNotice = closeNotice;
  };
})();
