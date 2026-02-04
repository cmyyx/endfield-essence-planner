(function () {
    const { createApp, ref, computed, onMounted, onBeforeUnmount, watch, nextTick } = Vue || {};

    if (!createApp) {
        if (window.finishPreload) window.finishPreload();
        document.body.innerHTML =
            "<div style='padding:24px;color:#f36c6c;font-family:Microsoft YaHei UI;'>未找到 Vue 3 本地文件：请将 vue.global.prod.js 放入 ./vendor/</div>";
        return;
    }

    const modules = window.AppModules || {};

    createApp({
        setup() {
            const ctx = { ref, computed, onMounted, onBeforeUnmount, watch, nextTick };
            const state = {};
            const init = (name) => {
                const fn = modules[name];
                if (typeof fn === "function") {
                    fn(ctx, state);
                }
            };

            init("initState");
            init("initI18n");
            init("initContent"); // Might be needed for some strings
            init("initUi");
            // init("initStorage");
            init("initEmbed");
            init("initPerf");
            init("initBackground");
            // init("initWeapons"); // We might not need the full weapon logic (filters etc), but we need the data?
            // actually initWeapons does heavy processing. Let's rely on data/weapons.js being global and just use initMatcher.
            // However, initWeapons might be harmless. Let's skip it to avoid overhead and irrelevant state.
            // But wait, if other modules depend on state.weapons... 
            // initMatcher handles its own data access from window.WEAPONS.

            init("initModals");
            init("initMedia");

            init("initMatcher");

            const weaponCharacters = (w) => w.chars || [];

            return {
                locale: state.locale,
                languageOptions: state.languageOptions,
                langSwitchRef: state.langSwitchRef,
                showLangMenu: state.showLangMenu,
                langMenuPlacement: state.langMenuPlacement,
                toggleLangMenu: state.toggleLangMenu,
                setLocale: state.setLocale,
                t: state.t,
                tTerm: state.tTerm,
                weaponCharacters,

                // Perf / BG
                lowGpuEnabled: state.lowGpuEnabled,
                perfPreference: state.perfPreference,
                showPerfNotice: state.showPerfNotice,
                setPerfMode: state.setPerfMode,
                customBackground: state.customBackground,
                handleBackgroundFile: state.handleBackgroundFile,
                clearCustomBackground: state.clearCustomBackground,

                // UI
                showSecondaryMenu: state.showSecondaryMenu,
                showAbout: state.showAbout,
                showNotice: state.showNotice,
                showChangelog: state.showChangelog,
                skipNotice: state.skipNotice,
                openNotice: state.openNotice,
                closeNotice: state.closeNotice,

                // Media
                rarityBadgeStyle: state.rarityBadgeStyle,
                rarityTextStyle: state.rarityTextStyle,
                hasImage: state.hasImage,
                weaponImageSrc: state.weaponImageSrc,
                characterImageSrc: state.characterImageSrc,
                handleCharacterImageError: state.handleCharacterImageError,

                // Matcher
                matcherSelected6StarName: state.matcherSelected6StarName,
                matcherSearchQuery: state.matcherSearchQuery,
                matcherFilteredSixStarWeapons: state.matcherFilteredSixStarWeapons,
                // matcherSixStarWeapons: state.matcherSixStarWeapons,
                matcherSelected6Star: state.matcherSelected6Star,
                matcherMatches: state.matcherMatches,
                matcherViewMode: state.matcherViewMode,
                matcherAllMatches: state.matcherAllMatches,

                appReady: state.appReady,
            };
        },
    }).mount("#app");
})();
