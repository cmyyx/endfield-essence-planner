(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initGearRefining = function initGearRefining(ctx, state) {
    const { ref, computed, onMounted, onBeforeUnmount, watch } = ctx;
    const source = Array.isArray(window.GEARS) ? window.GEARS : [];
    const partRank = new Map([
      ["护甲", 0],
      ["护手", 1],
      ["配件", 2],
    ]);
    const slotMeta = [
      { key: "sub1", label: "gear_refining.sub_attr_1" },
      { key: "sub2", label: "gear_refining.sub_attr_2" },
      { key: "special", label: "gear_refining.special_effect" },
    ];
    const slotLabelMap = slotMeta.reduce((acc, item) => {
      acc[item.key] = item.label;
      return acc;
    }, {});

    const parseAttr = (raw) => {
      const text = String(raw || "").trim();
      if (!text) return null;
      const normalized = text.replace(/\s+/g, " ").trim();
      const match = normalized.match(/^(.*?)([-+]?\d+(?:\.\d+)?)(%)?$/);
      if (!match) {
        return {
          display: normalized,
          key: normalized,
          value: null,
          unit: "",
        };
      }
      const key = String(match[1] || "")
        .replace(/\+$/g, "")
        .trim();
      const value = Number(match[2]);
      const unit = match[3] || "";
      return {
        display: normalized,
        key: key || normalized,
        value: Number.isFinite(value) ? value : null,
        unit,
      };
    };

    const normalizeGearAttrText = (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .replace(/\s*([+＋])\s*/g, "+")
        .replace(/\s*%\s*/g, "%")
        .trim();

    const normalizeGear = (gear) => {
      const setName = String((gear && gear.set) || "").trim();
      const part = String((gear && gear.type) || "").trim();
      const sub1 = parseAttr(normalizeGearAttrText(gear && gear.sub1));
      const sub2 = parseAttr(normalizeGearAttrText(gear && gear.sub2));
      const special = parseAttr(normalizeGearAttrText(gear && gear.special));
      const searchEntry = buildSearchEntry([
        { value: gear && gear.name, typo: true },
        { value: setName, typo: false },
        { value: part, typo: false },
        { value: sub1 ? sub1.display : "", tier: "secondary" },
        { value: sub2 ? sub2.display : "", tier: "secondary" },
        { value: special ? special.display : "", tier: "secondary" },
        { value: sub1 ? sub1.key : "", tier: "secondary" },
        { value: sub2 ? sub2.key : "", tier: "secondary" },
        { value: special ? special.key : "", tier: "secondary" },
      ]);
      return {
        ...gear,
        rarity: Number(gear && gear.rarity) || 5,
        setName,
        part,
        sub1,
        sub2,
        special,
        searchText: searchEntry.searchText || "",
        searchEntry,
      };
    };

    const gearSorter = (a, b) => {
      const setDiff = compareText(a.setName, b.setName);
      if (setDiff !== 0) return setDiff;
      const partDiff = (partRank.get(a.part) ?? 99) - (partRank.get(b.part) ?? 99);
      if (partDiff !== 0) return partDiff;
      return compareText(a.name, b.name);
    };

    const gearList = source.slice().map(normalizeGear).sort(gearSorter);
    const gearMap = new Map(gearList.map((gear) => [gear.name, gear]));
    const refinableSlotKeys = slotMeta.map((item) => item.key);
    const imageErrorNameSet = ref(new Set());
    const gearRefiningQuery = ref("");
    const gearRefiningCollapsedSetMap = ref({});
    const gearRefiningExpandedRecommendationMap = ref({});
    const isGearRefiningCompact = ref(false);
    const gearRefiningMobileListScrollY = ref(0);
    const recommendationRowCapacity = ref(1);
    const selectedGearRefiningGearName = ref(gearList.length ? gearList[0].name : "");

    const hasGearRefiningGearImage = (gear) =>
      Boolean(gear && gear.name) && !imageErrorNameSet.value.has(gear.name);
    const gearRefiningGearImageSrc = (gear) =>
      gear && gear.name
        ? encodeURI(`./image/gear/5/${gear.name}.png`)
        : "";
    const handleGearRefiningGearImageError = (event, gear) => {
      if (!gear || !gear.name) return;
      const next = new Set(imageErrorNameSet.value);
      next.add(gear.name);
      imageErrorNameSet.value = next;
      if (event && event.target) {
        event.target.style.display = "none";
      }
    };

    const selectedGearRefiningGear = computed(() => {
      if (!selectedGearRefiningGearName.value) return null;
      return gearMap.get(selectedGearRefiningGearName.value) || null;
    });

    const detectCompactLayout = () => {
      if (typeof window === "undefined") return false;
      if (typeof window.matchMedia === "function") {
        return window.matchMedia("(max-width: 1024px)").matches;
      }
      return window.innerWidth <= 1024;
    };
    const syncCompactLayout = () => {
      const compact = detectCompactLayout();
      isGearRefiningCompact.value = compact;
      if (state.gearRefiningMobilePanel && !state.gearRefiningMobilePanel.value) {
        state.gearRefiningMobilePanel.value = "gears";
      }
    };
    const fallbackRecommendationRowCapacity = () => {
      if (typeof window === "undefined") return isGearRefiningCompact.value ? 2 : 4;
      const viewportWidth = Number(window.innerWidth) || 0;
      if (viewportWidth <= 1024) return 2;
      if (viewportWidth <= 1280) return 3;
      return 4;
    };
    const syncRecommendationRowCapacity = () => {
      let next = fallbackRecommendationRowCapacity();
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        const candidateList = document.querySelector(".gear-refining-candidate-list");
        if (candidateList) {
          const gridText = window.getComputedStyle(candidateList).gridTemplateColumns || "";
          const columns = gridText
            .split(" ")
            .map((item) => item.trim())
            .filter(Boolean).length;
          if (columns > 0) {
            next = columns;
          }
        }
      }
      recommendationRowCapacity.value = Math.max(1, next);
    };
    const scheduleRecommendationRowCapacitySync = () => {
      if (typeof window === "undefined") {
        syncRecommendationRowCapacity();
        return;
      }
      window.requestAnimationFrame(syncRecommendationRowCapacity);
    };
    const syncGearRefiningLayout = () => {
      syncCompactLayout();
      syncRecommendationRowCapacity();
    };

    onMounted(() => {
      syncGearRefiningLayout();
      if (typeof window !== "undefined") {
        window.addEventListener("resize", syncGearRefiningLayout);
      }
    });
    onBeforeUnmount(() => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", syncGearRefiningLayout);
      }
    });

    const isGearRefiningSetCollapsed = (setName) =>
      Boolean((gearRefiningCollapsedSetMap.value || {})[setName || ""]);

    const toggleGearRefiningSetCollapsed = (setName) => {
      const key = String(setName || "");
      if (!key) return;
      const next = { ...(gearRefiningCollapsedSetMap.value || {}) };
      next[key] = !Boolean(next[key]);
      gearRefiningCollapsedSetMap.value = next;
    };

    const selectGearRefiningGear = (gear) => {
      if (!gear || !gear.name || !gearMap.has(gear.name)) return;
      if (selectedGearRefiningGearName.value === gear.name) {
        selectedGearRefiningGearName.value = "";
        return;
      }
      selectedGearRefiningGearName.value = gear.name;
      if (isGearRefiningCompact.value) setGearRefiningMobilePanel("recommend");
    };

    const setGearRefiningMobilePanel = (panel, options) => {
      const target = panel === "recommend" ? "recommend" : "gears";
      if (!state.gearRefiningMobilePanel) return;
      const panelRef = state.gearRefiningMobilePanel;
      const current = panelRef.value === "recommend" ? "recommend" : "gears";
      if (current === target) return;
      if (!isGearRefiningCompact.value) {
        panelRef.value = target;
        return;
      }
      const shouldRestoreScroll = !(options && options.skipRestore === true);
      if (target === "recommend") {
        if (typeof window !== "undefined") {
          gearRefiningMobileListScrollY.value = window.scrollY || window.pageYOffset || 0;
        }
        panelRef.value = "recommend";
        scheduleRecommendationRowCapacitySync();
        return;
      }
      panelRef.value = "gears";
      if (shouldRestoreScroll && typeof window !== "undefined") {
        const top = Math.max(0, Number(gearRefiningMobileListScrollY.value) || 0);
        window.requestAnimationFrame(() => {
          window.scrollTo({ top, behavior: "auto" });
        });
      }
    };

    const gearRefiningFilteredGears = computed(() => {
      const queryMeta = createSearchQueryMeta(gearRefiningQuery.value);
      if (!queryMeta.active) return gearList;
      const matched = [];
      gearList.forEach((gear, index) => {
        const score = scoreSearchEntry(gear.searchEntry, queryMeta);
        if (score <= 0) return;
        matched.push({ gear, score, index });
      });
      matched.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.index - b.index;
      });
      return matched.map((item) => item.gear);
    });

    const gearRefiningGroupedSets = computed(() => {
      const groups = [];
      const map = new Map();
      gearRefiningFilteredGears.value.forEach((gear) => {
        const key = gear.setName || "未分类";
        if (!map.has(key)) {
          const bucket = { setName: key, gears: [] };
          map.set(key, bucket);
          groups.push(bucket);
        }
        map.get(key).gears.push(gear);
      });
      return groups;
    });

    const getCandidateBestMatch = (gear, targetAttr) => {
      if (!gear || !targetAttr || !targetAttr.key || !Number.isFinite(targetAttr.value)) return null;
      const targetUnit = String(targetAttr.unit == null ? "" : targetAttr.unit).trim();
      let best = null;
      for (let i = 0; i < refinableSlotKeys.length; i += 1) {
        const slotKey = refinableSlotKeys[i];
        const slotAttr = gear[slotKey];
        if (!slotAttr || slotAttr.key !== targetAttr.key) continue;
        const slotUnit = String(slotAttr.unit == null ? "" : slotAttr.unit).trim();
        if (slotUnit !== targetUnit) continue;
        if (!Number.isFinite(slotAttr.value) || slotAttr.value <= targetAttr.value) continue;
        if (!best || slotAttr.value > best.matchAttr.value) {
          best = {
            matchAttr: slotAttr,
            matchSlotKey: slotKey,
          };
        }
      }
      return best;
    };

    const buildSlotRecommendation = (gear, slotInfo) => {
      const targetAttr = gear ? gear[slotInfo.key] : null;
      if (!targetAttr) {
        return {
          slotKey: slotInfo.key,
          slotLabel: slotInfo.label,
          targetAttr: null,
          recommendSelf: true,
          topValueDisplay: "",
          candidates: [],
        };
      }
      if (!targetAttr.key || !Number.isFinite(targetAttr.value)) {
        return {
          slotKey: slotInfo.key,
          slotLabel: slotInfo.label,
          targetAttr,
          recommendSelf: true,
          topValueDisplay: targetAttr.display,
          candidates: [
            {
              gear,
              matchAttr: targetAttr,
              matchSlotKey: slotInfo.key,
              matchSlotLabel: slotInfo.label,
            },
          ],
        };
      }

      const candidates = [];
      for (let i = 0; i < gearList.length; i += 1) {
        const candidateGear = gearList[i];
        if (candidateGear.name === gear.name) continue;
        if (candidateGear.part !== gear.part) continue;
        const bestMatch = getCandidateBestMatch(candidateGear, targetAttr);
        if (!bestMatch) continue;
        candidates.push({
          gear: candidateGear,
          matchAttr: bestMatch.matchAttr,
          matchSlotKey: bestMatch.matchSlotKey,
          matchSlotLabel: slotLabelMap[bestMatch.matchSlotKey] || bestMatch.matchSlotKey,
        });
      }

      if (!candidates.length) {
        return {
          slotKey: slotInfo.key,
          slotLabel: slotInfo.label,
          targetAttr,
          recommendSelf: true,
          topValueDisplay: targetAttr.display,
          candidates: [
            {
              gear,
              matchAttr: targetAttr,
              matchSlotKey: slotInfo.key,
              matchSlotLabel: slotInfo.label,
            },
          ],
        };
      }

      const topValue = candidates.reduce(
        (max, item) =>
          Number.isFinite(item.matchAttr.value) && item.matchAttr.value > max
            ? item.matchAttr.value
            : max,
        -Infinity
      );
      const topCandidates = candidates
        .filter((item) => item.matchAttr.value === topValue)
        .sort((a, b) => compareText(a.gear.name, b.gear.name));

      return {
        slotKey: slotInfo.key,
        slotLabel: slotInfo.label,
        targetAttr,
        recommendSelf: false,
        topValueDisplay: topCandidates[0] ? topCandidates[0].matchAttr.display : "",
        candidates: topCandidates,
      };
    };

    const gearRefiningRecommendations = computed(() => {
      const selected = selectedGearRefiningGear.value;
      if (!selected) return [];
      return slotMeta.map((slotInfo) => buildSlotRecommendation(selected, slotInfo));
    });

    const recommendationExpandKey = (slotKey) => `${selectedGearRefiningGearName.value || ""}::${slotKey || ""}`;
    const isRecommendationExpanded = (slotKey) =>
      Boolean((gearRefiningExpandedRecommendationMap.value || {})[recommendationExpandKey(slotKey)]);
    const toggleRecommendationExpanded = (slotKey) => {
      const key = recommendationExpandKey(slotKey);
      if (!key) return;
      const next = { ...(gearRefiningExpandedRecommendationMap.value || {}) };
      next[key] = !Boolean(next[key]);
      gearRefiningExpandedRecommendationMap.value = next;
    };
    const hasMoreRecommendationCandidates = (recommendation) => {
      if (!recommendation || !Array.isArray(recommendation.candidates)) return false;
      return recommendation.candidates.length > recommendationRowCapacity.value;
    };
    const visibleRecommendationCandidates = (recommendation) => {
      if (!recommendation || !Array.isArray(recommendation.candidates)) return [];
      if (!hasMoreRecommendationCandidates(recommendation)) return recommendation.candidates;
      if (isRecommendationExpanded(recommendation.slotKey)) return recommendation.candidates;
      return recommendation.candidates.slice(0, recommendationRowCapacity.value);
    };

    if (typeof watch === "function") {
      watch(
        [selectedGearRefiningGearName, gearRefiningRecommendations],
        () => {
          scheduleRecommendationRowCapacitySync();
        },
        { deep: false }
      );
    }

    const gearRefiningGearCount = computed(() => gearList.length);

    state.gearRefiningQuery = gearRefiningQuery;
    state.gearRefiningGearCount = gearRefiningGearCount;
    state.isGearRefiningCompact = isGearRefiningCompact;
    state.setGearRefiningMobilePanel = setGearRefiningMobilePanel;
    state.gearRefiningCollapsedSetMap = gearRefiningCollapsedSetMap;
    state.isGearRefiningSetCollapsed = isGearRefiningSetCollapsed;
    state.toggleGearRefiningSetCollapsed = toggleGearRefiningSetCollapsed;
    state.isRecommendationExpanded = isRecommendationExpanded;
    state.toggleRecommendationExpanded = toggleRecommendationExpanded;
    state.hasMoreRecommendationCandidates = hasMoreRecommendationCandidates;
    state.visibleRecommendationCandidates = visibleRecommendationCandidates;
    state.gearRefiningGroupedSets = gearRefiningGroupedSets;
    state.selectedGearRefiningGearName = selectedGearRefiningGearName;
    state.selectedGearRefiningGear = selectedGearRefiningGear;
    state.selectGearRefiningGear = selectGearRefiningGear;
    state.gearRefiningRecommendations = gearRefiningRecommendations;
    state.gearRefiningGearImageSrc = gearRefiningGearImageSrc;
    state.hasGearRefiningGearImage = hasGearRefiningGearImage;
    state.handleGearRefiningGearImageError = handleGearRefiningGearImageError;
  };
})();
