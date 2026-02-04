(function () {
    const initMatcher = (ctx, state) => {
        const { ref, computed } = ctx;

        // Initialize maps required by app.media.js to prevent "Cannot read properties of undefined (reading 'get')"
        if (!state.weaponImageSrcCache) state.weaponImageSrcCache = new Map();
        if (!state.characterImageSrcCache) state.characterImageSrcCache = new Map();
        if (!state.weaponCharacterMap) state.weaponCharacterMap = new Map();

        const selected6StarName = ref("");
        const searchQuery = ref("");

        // Get 6 star weapons
        // Assuming 'weapons' global variable is available from data/weapons.js
        const sixStarWeapons = computed(() => {
            return (window.WEAPONS || window.weapons || []).filter(w => w.rarity === 6);
        });

        // Filtered 6-star list
        const filteredSixStarWeapons = computed(() => {
            const query = searchQuery.value.trim().toLowerCase();
            if (!query) return sixStarWeapons.value;
            return sixStarWeapons.value.filter(w =>
                w.name.toLowerCase().includes(query) ||
                (w.short && w.short.toLowerCase().includes(query)) ||
                (w.s1 && w.s1.toLowerCase().includes(query)) ||
                (w.s2 && w.s2.toLowerCase().includes(query)) ||
                (w.s3 && w.s3.toLowerCase().includes(query))
            );
        });

        // Get the selected 6-star weapon object
        const selected6Star = computed(() => {
            if (!selected6StarName.value) return null;
            return (window.WEAPONS || window.weapons || []).find(w => w.name === selected6StarName.value);
        });

        // Get target stats when a 6-star is selected
        const targetStats = computed(() => {
            if (!selected6Star.value) return null;
            return {
                s1: selected6Star.value.s1,
                s2: selected6Star.value.s2,
                s3: selected6Star.value.s3
            };
        });

        // Find matches
        const matches = computed(() => {
            if (!targetStats.value) return [];
            const target = targetStats.value;
            const allWeapons = window.WEAPONS || window.weapons || [];
            const candidates = allWeapons.filter(w => w.rarity === 4 || w.rarity === 5);

            return candidates.filter(w =>
                w.s1 === target.s1 &&
                w.s2 === target.s2 &&
                w.s3 === target.s3
            );
        });

        const viewMode = ref('search'); // 'search' or 'all'

        const allMatches = computed(() => {
            const allWeapons = window.WEAPONS || window.weapons || [];
            const sixStars = allWeapons.filter(w => w.rarity === 6);
            const candidates = allWeapons.filter(w => w.rarity === 4 || w.rarity === 5);

            const results = [];
            for (const w6 of sixStars) {
                const currentMatches = candidates.filter(w =>
                    w.s1 === w6.s1 &&
                    w.s2 === w6.s2 &&
                    w.s3 === w6.s3
                );
                if (currentMatches.length > 0) {
                    results.push({
                        source: w6,
                        matches: currentMatches
                    });
                }
            }
            return results;
        });

        // Expose to state
        state.matcherViewMode = viewMode;
        state.matcherAllMatches = allMatches;
        state.matcherSelected6StarName = selected6StarName;
        state.matcherSearchQuery = searchQuery;
        // state.matcherSixStarWeapons = sixStarWeapons; // Use filtered instead
        state.matcherFilteredSixStarWeapons = filteredSixStarWeapons;
        state.matcherSelected6Star = selected6Star;
        // state.matcherTargetStats = targetStats; // Not really needed in template if we have selected6Star
        state.matcherMatches = matches;
    };

    window.AppModules = window.AppModules || {};
    window.AppModules.initMatcher = initMatcher;
})();
