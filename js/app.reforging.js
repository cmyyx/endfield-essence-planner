(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initReforging = function initReforging(ctx, state) {
    const { ref, computed, onMounted, onBeforeUnmount, watch } = ctx;
    const coreSource = typeof gears !== "undefined" && Array.isArray(gears) ? gears : [];
    const source = Array.isArray(window.GEARS) ? window.GEARS : coreSource;
    const partRank = new Map([
      ["护甲", 0],
      ["护手", 1],
      ["配件", 2],
    ]);
    const slotMeta = [
      { key: "sub1", label: "副属性1", sourceKey: "s1" },
      { key: "sub2", label: "副属性2", sourceKey: "s2" },
      { key: "special", label: "特殊效果", sourceKey: "s3" },
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

    const formatMainAttr = (defenceText) => {
      const valueText = String(defenceText || "").trim();
      if (!valueText) {
        return {
          display: "防御力",
          key: "防御力",
          value: null,
          unit: "",
        };
      }
      return {
        display: `防御力${valueText}`,
        key: "防御力",
        value: null,
        unit: "",
      };
    };

    const normalizeGear = (gear) => {
      const setName = String((gear && gear.set) || "").trim();
      const part = String((gear && gear.type) || "").trim();
      const sub1 = parseAttr(gear && gear.s1);
      const sub2 = parseAttr(gear && gear.s2);
      const special = parseAttr(gear && gear.s3);
      const main = formatMainAttr(gear && gear.defence);
      const searchText = normalizeText(
        [
          gear && gear.name,
          setName,
          part,
          main.display,
          sub1 ? sub1.display : "",
          sub2 ? sub2.display : "",
          special ? special.display : "",
          sub1 ? sub1.key : "",
          sub2 ? sub2.key : "",
          special ? special.key : "",
        ].join(" ")
      );
      return {
        ...gear,
        rarity: 5,
        setName,
        part,
        main,
        sub1,
        sub2,
        special,
        searchText,
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
    const reforgingQuery = ref("");
    const reforgingCollapsedSetMap = ref({});
    const reforgingExpandedRecommendationMap = ref({});
    const isReforgingCompact = ref(false);
    const reforgingMobileListScrollY = ref(0);
    const recommendationRowCapacity = ref(1);
    const selectedReforgingGearName = ref(gearList.length ? gearList[0].name : "");

    const hasReforgingGearImage = (gear) =>
      Boolean(gear && gear.name) && !imageErrorNameSet.value.has(gear.name);
    const reforgingGearImageSrc = (gear) =>
      gear && gear.name
        ? encodeURI(`./image/gear/5/${gear.name}.png`)
        : "";
    const handleReforgingGearImageError = (event, gear) => {
      if (!gear || !gear.name) return;
      const next = new Set(imageErrorNameSet.value);
      next.add(gear.name);
      imageErrorNameSet.value = next;
      if (event && event.target) {
        event.target.style.display = "none";
      }
    };

    const selectedReforgingGear = computed(() => {
      if (!selectedReforgingGearName.value) return null;
      return gearMap.get(selectedReforgingGearName.value) || null;
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
      isReforgingCompact.value = compact;
      if (state.reforgingMobilePanel && !state.reforgingMobilePanel.value) {
        state.reforgingMobilePanel.value = "gears";
      }
    };
    const fallbackRecommendationRowCapacity = () => {
      if (typeof window === "undefined") return isReforgingCompact.value ? 2 : 4;
      const viewportWidth = Number(window.innerWidth) || 0;
      if (viewportWidth <= 1024) return 2;
      if (viewportWidth <= 1280) return 3;
      return 4;
    };
    const syncRecommendationRowCapacity = () => {
      let next = fallbackRecommendationRowCapacity();
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        const candidateList = document.querySelector(".reforging-candidate-list");
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
    const syncReforgingLayout = () => {
      syncCompactLayout();
      syncRecommendationRowCapacity();
    };

    onMounted(() => {
      syncReforgingLayout();
      if (typeof window !== "undefined") {
        window.addEventListener("resize", syncReforgingLayout);
      }
    });
    onBeforeUnmount(() => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", syncReforgingLayout);
      }
    });

    const isReforgingSetCollapsed = (setName) =>
      Boolean((reforgingCollapsedSetMap.value || {})[setName || ""]);

    const toggleReforgingSetCollapsed = (setName) => {
      const key = String(setName || "");
      if (!key) return;
      const next = { ...(reforgingCollapsedSetMap.value || {}) };
      next[key] = !Boolean(next[key]);
      reforgingCollapsedSetMap.value = next;
    };

    const selectReforgingGear = (gear) => {
      if (!gear || !gear.name || !gearMap.has(gear.name)) return;
      if (selectedReforgingGearName.value === gear.name) {
        selectedReforgingGearName.value = "";
        return;
      }
      selectedReforgingGearName.value = gear.name;
      if (isReforgingCompact.value) setReforgingMobilePanel("recommend");
    };

    const setReforgingMobilePanel = (panel, options) => {
      const target = panel === "recommend" ? "recommend" : "gears";
      if (!state.reforgingMobilePanel) return;
      const panelRef = state.reforgingMobilePanel;
      const current = panelRef.value === "recommend" ? "recommend" : "gears";
      if (current === target) return;
      if (!isReforgingCompact.value) {
        panelRef.value = target;
        return;
      }
      const shouldRestoreScroll = !(options && options.skipRestore === true);
      if (target === "recommend") {
        if (typeof window !== "undefined") {
          reforgingMobileListScrollY.value = window.scrollY || window.pageYOffset || 0;
        }
        panelRef.value = "recommend";
        scheduleRecommendationRowCapacitySync();
        return;
      }
      panelRef.value = "gears";
      if (shouldRestoreScroll && typeof window !== "undefined") {
        const top = Math.max(0, Number(reforgingMobileListScrollY.value) || 0);
        window.requestAnimationFrame(() => {
          window.scrollTo({ top, behavior: "auto" });
        });
      }
    };

    const reforgingFilteredGears = computed(() => {
      const query = normalizeText(reforgingQuery.value);
      if (!query) return gearList;
      return gearList.filter((gear) => gear.searchText.includes(query));
    });

    const reforgingGroupedSets = computed(() => {
      const groups = [];
      const map = new Map();
      reforgingFilteredGears.value.forEach((gear) => {
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
      let best = null;
      for (let i = 0; i < refinableSlotKeys.length; i += 1) {
        const slotKey = refinableSlotKeys[i];
        const slotAttr = gear[slotKey];
        if (!slotAttr || slotAttr.key !== targetAttr.key) continue;
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

    const reforgingRecommendations = computed(() => {
      const selected = selectedReforgingGear.value;
      if (!selected) return [];
      return slotMeta.map((slotInfo) => buildSlotRecommendation(selected, slotInfo));
    });

    const recommendationExpandKey = (slotKey) => `${selectedReforgingGearName.value || ""}::${slotKey || ""}`;
    const isRecommendationExpanded = (slotKey) =>
      Boolean((reforgingExpandedRecommendationMap.value || {})[recommendationExpandKey(slotKey)]);
    const toggleRecommendationExpanded = (slotKey) => {
      const key = recommendationExpandKey(slotKey);
      if (!key) return;
      const next = { ...(reforgingExpandedRecommendationMap.value || {}) };
      next[key] = !Boolean(next[key]);
      reforgingExpandedRecommendationMap.value = next;
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
        [selectedReforgingGearName, reforgingRecommendations],
        () => {
          scheduleRecommendationRowCapacitySync();
        },
        { deep: false }
      );
    }

    const reforgingGearCount = computed(() => gearList.length);

    state.reforgingQuery = reforgingQuery;
    state.reforgingGearCount = reforgingGearCount;
    state.isReforgingCompact = isReforgingCompact;
    state.setReforgingMobilePanel = setReforgingMobilePanel;
    state.reforgingCollapsedSetMap = reforgingCollapsedSetMap;
    state.isReforgingSetCollapsed = isReforgingSetCollapsed;
    state.toggleReforgingSetCollapsed = toggleReforgingSetCollapsed;
    state.isRecommendationExpanded = isRecommendationExpanded;
    state.toggleRecommendationExpanded = toggleRecommendationExpanded;
    state.hasMoreRecommendationCandidates = hasMoreRecommendationCandidates;
    state.visibleRecommendationCandidates = visibleRecommendationCandidates;
    state.reforgingGroupedSets = reforgingGroupedSets;
    state.selectedReforgingGearName = selectedReforgingGearName;
    state.selectedReforgingGear = selectedReforgingGear;
    state.selectReforgingGear = selectReforgingGear;
    state.reforgingRecommendations = reforgingRecommendations;
    state.reforgingGearImageSrc = reforgingGearImageSrc;
    state.hasReforgingGearImage = hasReforgingGearImage;
    state.handleReforgingGearImageError = handleReforgingGearImageError;
  };
})();
