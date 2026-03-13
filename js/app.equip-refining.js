(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initEquipRefining = function initEquipRefining(ctx, state) {
    const { ref, computed, onMounted, onBeforeUnmount, watch } = ctx;
    const source = Array.isArray(window.EQUIPS) ? window.EQUIPS : [];
    const partRank = new Map([
      ["护甲", 0],
      ["护手", 1],
      ["配件", 2],
    ]);
    const slotMeta = [
      { key: "sub1", label: "equip_refining.sub_attr_1" },
      { key: "sub2", label: "equip_refining.sub_attr_2" },
      { key: "special", label: "equip_refining.special_effect" },
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

    const normalizeEquipAttrText = (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .replace(/\s*([+＋])\s*/g, "+")
        .replace(/\s*%\s*/g, "%")
        .trim();

    const normalizeEquip = (equip) => {
      const setName = String((equip && equip.set) || "").trim();
      const part = String((equip && equip.type) || "").trim();
      const sub1 = parseAttr(normalizeEquipAttrText(equip && equip.sub1));
      const sub2 = parseAttr(normalizeEquipAttrText(equip && equip.sub2));
      const special = parseAttr(normalizeEquipAttrText(equip && equip.special));
      const searchEntry = buildSearchEntry([
        { value: equip && equip.name, typo: true },
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
        ...equip,
        rarity: Number(equip && equip.rarity) || 5,
        setName,
        part,
        sub1,
        sub2,
        special,
        searchText: searchEntry.searchText || "",
        searchEntry,
      };
    };

    const equipSorter = (a, b) => {
      const setDiff = compareText(a.setName, b.setName);
      if (setDiff !== 0) return setDiff;
      const partDiff = (partRank.get(a.part) ?? 99) - (partRank.get(b.part) ?? 99);
      if (partDiff !== 0) return partDiff;
      return compareText(a.name, b.name);
    };

    const equipList = source.slice().map(normalizeEquip).sort(equipSorter);
    const equipMap = new Map(equipList.map((equip) => [equip.name, equip]));
    const refinableSlotKeys = slotMeta.map((item) => item.key);
    const imageErrorNameSet = ref(new Set());
    const equipRefiningQuery = ref("");
    const equipRefiningCollapsedSetMap = ref({});
    const equipRefiningExpandedRecommendationMap = ref({});
    const isEquipRefiningCompact = ref(false);
    const equipRefiningMobileListScrollY = ref(0);
    const recommendationRowCapacity = ref(1);
    const selectedEquipRefiningEquipName = ref(equipList.length ? equipList[0].name : "");

    const equipImageMap =
      window.EQUIP_IMAGES && typeof window.EQUIP_IMAGES === "object"
        ? window.EQUIP_IMAGES
        : {};
    const hasEquipRefiningEquipImage = (equip) =>
      Boolean(equip && equip.name && equipImageMap[equip.name]) &&
      !imageErrorNameSet.value.has(equip.name);
    const equipRefiningEquipImageSrc = (equip) => {
      if (!equip || !equip.name) return "";
      const internalName = equipImageMap[equip.name];
      if (!internalName) return "";
      return encodeURI(`./image/equip/${internalName}.avif`);
    };
    const handleEquipRefiningEquipImageError = (event, equip) => {
      if (!equip || !equip.name) return;
      const next = new Set(imageErrorNameSet.value);
      next.add(equip.name);
      imageErrorNameSet.value = next;
      if (event && event.target) {
        event.target.style.display = "none";
      }
    };

    const selectedEquipRefiningEquip = computed(() => {
      if (!selectedEquipRefiningEquipName.value) return null;
      return equipMap.get(selectedEquipRefiningEquipName.value) || null;
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
      isEquipRefiningCompact.value = compact;
      if (state.equipRefiningMobilePanel && !state.equipRefiningMobilePanel.value) {
        state.equipRefiningMobilePanel.value = "equips";
      }
    };
    const fallbackRecommendationRowCapacity = () => {
      if (typeof window === "undefined") return isEquipRefiningCompact.value ? 2 : 4;
      const viewportWidth = Number(window.innerWidth) || 0;
      if (viewportWidth <= 1024) return 2;
      if (viewportWidth <= 1280) return 3;
      return 4;
    };
    const syncRecommendationRowCapacity = () => {
      let next = fallbackRecommendationRowCapacity();
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        const candidateList = document.querySelector(".equip-refining-candidate-list");
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
    const syncEquipRefiningLayout = () => {
      syncCompactLayout();
      syncRecommendationRowCapacity();
    };

    onMounted(() => {
      syncEquipRefiningLayout();
      if (typeof window !== "undefined") {
        window.addEventListener("resize", syncEquipRefiningLayout);
      }
    });
    onBeforeUnmount(() => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", syncEquipRefiningLayout);
      }
    });

    const isEquipRefiningSetCollapsed = (setName) =>
      Boolean((equipRefiningCollapsedSetMap.value || {})[setName || ""]);

    const toggleEquipRefiningSetCollapsed = (setName) => {
      const key = String(setName || "");
      if (!key) return;
      const next = { ...(equipRefiningCollapsedSetMap.value || {}) };
      next[key] = !Boolean(next[key]);
      equipRefiningCollapsedSetMap.value = next;
    };

    const selectEquipRefiningEquip = (equip) => {
      if (!equip || !equip.name || !equipMap.has(equip.name)) return;
      if (selectedEquipRefiningEquipName.value === equip.name) {
        selectedEquipRefiningEquipName.value = "";
        return;
      }
      selectedEquipRefiningEquipName.value = equip.name;
      if (isEquipRefiningCompact.value) setEquipRefiningMobilePanel("recommend");
    };

    const setEquipRefiningMobilePanel = (panel, options) => {
      const target = panel === "recommend" ? "recommend" : "equips";
      if (!state.equipRefiningMobilePanel) return;
      const panelRef = state.equipRefiningMobilePanel;
      const current = panelRef.value === "recommend" ? "recommend" : "equips";
      if (current === target) return;
      if (!isEquipRefiningCompact.value) {
        panelRef.value = target;
        return;
      }
      const shouldRestoreScroll = !(options && options.skipRestore === true);
      if (target === "recommend") {
        if (typeof window !== "undefined") {
          equipRefiningMobileListScrollY.value = window.scrollY || window.pageYOffset || 0;
        }
        panelRef.value = "recommend";
        scheduleRecommendationRowCapacitySync();
        return;
      }
      panelRef.value = "equips";
      if (shouldRestoreScroll && typeof window !== "undefined") {
        const top = Math.max(0, Number(equipRefiningMobileListScrollY.value) || 0);
        window.requestAnimationFrame(() => {
          window.scrollTo({ top, behavior: "auto" });
        });
      }
    };

    const equipRefiningFilteredEquips = computed(() => {
      const queryMeta = createSearchQueryMeta(equipRefiningQuery.value);
      if (!queryMeta.active) return equipList;
      const matched = [];
      equipList.forEach((equip, index) => {
        const score = scoreSearchEntry(equip.searchEntry, queryMeta);
        if (score <= 0) return;
        matched.push({ equip, score, index });
      });
      matched.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.index - b.index;
      });
      return matched.map((item) => item.equip);
    });

    const equipRefiningGroupedSets = computed(() => {
      const groups = [];
      const map = new Map();
      equipRefiningFilteredEquips.value.forEach((equip) => {
        const key = equip.setName || "未分类";
        if (!map.has(key)) {
          const bucket = { setName: key, equips: [] };
          map.set(key, bucket);
          groups.push(bucket);
        }
        map.get(key).equips.push(equip);
      });
      return groups;
    });

    const getCandidateBestMatch = (equip, targetAttr) => {
      if (!equip || !targetAttr || !targetAttr.key || !Number.isFinite(targetAttr.value)) return null;
      const targetUnit = String(targetAttr.unit == null ? "" : targetAttr.unit).trim();
      let best = null;
      for (let i = 0; i < refinableSlotKeys.length; i += 1) {
        const slotKey = refinableSlotKeys[i];
        const slotAttr = equip[slotKey];
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

    const buildSlotRecommendation = (equip, slotInfo) => {
      const targetAttr = equip ? equip[slotInfo.key] : null;
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
              equip,
              matchAttr: targetAttr,
              matchSlotKey: slotInfo.key,
              matchSlotLabel: slotInfo.label,
            },
          ],
        };
      }

      const candidates = [];
      for (let i = 0; i < equipList.length; i += 1) {
        const candidateEquip = equipList[i];
        if (candidateEquip.name === equip.name) continue;
        if (candidateEquip.part !== equip.part) continue;
        const bestMatch = getCandidateBestMatch(candidateEquip, targetAttr);
        if (!bestMatch) continue;
        candidates.push({
          equip: candidateEquip,
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
              equip,
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
        .sort((a, b) => compareText(a.equip.name, b.equip.name));

      return {
        slotKey: slotInfo.key,
        slotLabel: slotInfo.label,
        targetAttr,
        recommendSelf: false,
        topValueDisplay: topCandidates[0] ? topCandidates[0].matchAttr.display : "",
        candidates: topCandidates,
      };
    };

    const equipRefiningRecommendations = computed(() => {
      const selected = selectedEquipRefiningEquip.value;
      if (!selected) return [];
      return slotMeta.map((slotInfo) => buildSlotRecommendation(selected, slotInfo));
    });

    const recommendationExpandKey = (slotKey) => `${selectedEquipRefiningEquipName.value || ""}::${slotKey || ""}`;
    const isRecommendationExpanded = (slotKey) =>
      Boolean((equipRefiningExpandedRecommendationMap.value || {})[recommendationExpandKey(slotKey)]);
    const toggleRecommendationExpanded = (slotKey) => {
      const key = recommendationExpandKey(slotKey);
      if (!key) return;
      const next = { ...(equipRefiningExpandedRecommendationMap.value || {}) };
      next[key] = !Boolean(next[key]);
      equipRefiningExpandedRecommendationMap.value = next;
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
        [selectedEquipRefiningEquipName, equipRefiningRecommendations],
        () => {
          scheduleRecommendationRowCapacitySync();
        },
        { deep: false }
      );
    }

    const equipRefiningEquipCount = computed(() => equipList.length);

    state.equipRefiningQuery = equipRefiningQuery;
    state.equipRefiningEquipCount = equipRefiningEquipCount;
    state.isEquipRefiningCompact = isEquipRefiningCompact;
    state.setEquipRefiningMobilePanel = setEquipRefiningMobilePanel;
    state.equipRefiningCollapsedSetMap = equipRefiningCollapsedSetMap;
    state.isEquipRefiningSetCollapsed = isEquipRefiningSetCollapsed;
    state.toggleEquipRefiningSetCollapsed = toggleEquipRefiningSetCollapsed;
    state.isRecommendationExpanded = isRecommendationExpanded;
    state.toggleRecommendationExpanded = toggleRecommendationExpanded;
    state.hasMoreRecommendationCandidates = hasMoreRecommendationCandidates;
    state.visibleRecommendationCandidates = visibleRecommendationCandidates;
    state.equipRefiningGroupedSets = equipRefiningGroupedSets;
    state.selectedEquipRefiningEquipName = selectedEquipRefiningEquipName;
    state.selectedEquipRefiningEquip = selectedEquipRefiningEquip;
    state.selectEquipRefiningEquip = selectEquipRefiningEquip;
    state.equipRefiningRecommendations = equipRefiningRecommendations;
    state.equipRefiningEquipImageSrc = equipRefiningEquipImageSrc;
    state.hasEquipRefiningEquipImage = hasEquipRefiningEquipImage;
    state.handleEquipRefiningEquipImageError = handleEquipRefiningEquipImageError;
  };
})();
