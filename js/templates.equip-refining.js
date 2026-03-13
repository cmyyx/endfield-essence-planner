(function () {
  window.__APP_TEMPLATES = window.__APP_TEMPLATES || {};

  window.__APP_TEMPLATES.equipRefiningList = `
<section
  class="panel equip-refining-panel equip-refining-panel-left"
  :class="{ 'panel-hidden': mobilePanel !== 'equips' }"
>
  <div class="panel-title">
    <h2>{{ t("equip_refining.list_title") }}</h2>
  </div>
  <label class="search-box">
    <span>🔍</span>
    <input
      :value="query"
      :placeholder="t('equip_refining.search_placeholder')"
      @input="$emit('update:query', $event.target.value)"
    />
  </label>
  <div v-if="groupedSets.length" class="equip-refining-set-list">
    <section
      v-for="setGroup in groupedSets"
      :key="setGroup.setName"
      class="equip-refining-set-group"
    >
      <button
        type="button"
        class="equip-refining-set-header"
        :aria-expanded="!isSetCollapsed(setGroup.setName)"
        @click="toggleSetCollapsed(setGroup.setName)"
      >
        <div class="equip-refining-set-title">
          <h3>{{ setGroup.setName }}</h3>
          <span class="equip-refining-set-count">{{ setGroup.equips.length }}</span>
        </div>
        <span
          class="equip-refining-set-chevron"
          :class="{ 'is-open': !isSetCollapsed(setGroup.setName) }"
          aria-hidden="true"
        >
          &gt;
        </span>
      </button>
      <transition name="equip-refining-set-collapse">
        <div v-show="!isSetCollapsed(setGroup.setName)" class="weapon-list equip-refining-equip-list">
          <button
            v-for="equip in setGroup.equips"
            :key="equip.name"
            type="button"
            class="weapon-item equip-refining-equip-item rarity-5"
            :class="{ 'is-selected': selectedEquipName && selectedEquipName === equip.name }"
            @click="selectEquip(equip)"
          >
            <div class="weapon-art">
              <img
                v-if="hasEquipImage(equip)"
                class="weapon-figure"
                v-lazy-src="equipImageSrc(equip)"
                :alt="equip.name"
                loading="lazy"
                decoding="async"
                @error="onEquipImageError($event, equip)"
              />
              <span v-else class="weapon-fallback-large">5★</span>
            </div>
            <div class="weapon-band"></div>
            <div class="weapon-name">
              <div class="weapon-title equip-refining-name">{{ equip.name }}</div>
              <div class="equip-refining-equip-meta">{{ equip.part }}</div>
            </div>
          </button>
        </div>
      </transition>
    </section>
  </div>
  <div v-else class="empty-state match-empty">
    <h2>{{ t("equip_refining.no_matching_equip") }}</h2>
  </div>
</section>`;

  window.__APP_TEMPLATES.equipRefiningRecommendation = `
<article class="equip-refining-recommend-card">
  <header class="equip-refining-recommend-head">
    <div class="equip-refining-recommend-title">{{ t(recommendation.slotLabel) }}</div>
    <div v-if="recommendation.targetAttr" class="equip-refining-recommend-target">
      {{ recommendation.targetAttr.display }}
    </div>
  </header>
  <div v-if="!recommendation.targetAttr" class="equip-refining-recommend-empty">
    {{ t("equip_refining.missing_target_attr") }}
  </div>
  <template v-else>
    <p class="equip-refining-recommend-tip" v-if="recommendation.recommendSelf">
      {{ t("equip_refining.recommend_self") }}
    </p>
    <p class="equip-refining-recommend-tip" v-else>
      {{ t("equip_refining.recommend_other_equip") }}（<span class="equip-refining-tip-value">{{ recommendation.topValueDisplay }}</span>）
    </p>
    <div class="weapon-list equip-refining-candidate-list">
      <div
        v-for="candidate in visibleCandidates"
        :key="candidate.equip.name"
        class="weapon-item equip-refining-candidate-item rarity-5"
      >
        <div class="weapon-art">
          <img
            v-if="hasEquipImage(candidate.equip)"
            class="weapon-figure"
            v-lazy-src="equipImageSrc(candidate.equip)"
            :alt="candidate.equip.name"
            loading="lazy"
            decoding="async"
            @error="onEquipImageError($event, candidate.equip)"
          />
          <span v-else class="weapon-fallback-large">5★</span>
        </div>
        <div class="weapon-band"></div>
        <div class="weapon-name">
          <div class="weapon-title equip-refining-name">{{ candidate.equip.name }}</div>
          <div class="equip-refining-equip-meta">{{ candidate.equip.part }}</div>
        </div>
      </div>
    </div>
    <button
      v-if="hasMoreCandidates"
      type="button"
      class="ghost-button equip-refining-candidate-toggle"
      @click="toggleExpanded(recommendation.slotKey)"
    >
      {{
        expanded
          ? t("equip_refining.collapse_other_candidates")
          : t("equip_refining.expand_other_candidates")
      }}
    </button>
  </template>
</article>`;

  window.__APP_TEMPLATES.equipRefiningDetail = `
<section
  class="panel equip-refining-panel equip-refining-panel-right"
  :class="{ 'panel-hidden': mobilePanel !== 'recommend' }"
>
  <div class="panel-title">
    <h2>{{ t("equip_refining.recommendation_title") }}</h2>
  </div>
  <div v-if="!selectedEquip" class="empty-state match-empty">
    <h2>{{ t("equip_refining.select_one_equip") }}</h2>
  </div>
  <div v-else class="equip-refining-detail">
    <div class="equip-refining-selected">
      <div class="weapon-item equip-refining-selected-card rarity-5">
        <div class="weapon-art">
          <img
            v-if="hasEquipImage(selectedEquip)"
            class="weapon-figure"
            v-lazy-src="equipImageSrc(selectedEquip)"
            :alt="selectedEquip.name"
            loading="lazy"
            decoding="async"
            @error="onEquipImageError($event, selectedEquip)"
          />
          <span v-else class="weapon-fallback-large">5★</span>
        </div>
        <div class="weapon-band"></div>
        <div class="weapon-name">
          <div class="weapon-title equip-refining-name">{{ selectedEquip.name }}</div>
          <div class="equip-refining-equip-meta">{{ selectedEquip.part }}</div>
        </div>
      </div>
      <div class="equip-refining-attrs">
        <div class="equip-refining-attr-row">
          <span class="equip-refining-attr-label">{{ t("equip_refining.sub_attr_1") }}</span>
          <span class="equip-refining-attr-value">
            {{ selectedEquip.sub1 ? selectedEquip.sub1.display : t("equip_refining.none") }}
          </span>
        </div>
        <div class="equip-refining-attr-row">
          <span class="equip-refining-attr-label">{{ t("equip_refining.sub_attr_2") }}</span>
          <span class="equip-refining-attr-value">
            {{ selectedEquip.sub2 ? selectedEquip.sub2.display : t("equip_refining.none") }}
          </span>
        </div>
        <div class="equip-refining-attr-row">
          <span class="equip-refining-attr-label">{{ t("equip_refining.special_effect") }}</span>
          <span class="equip-refining-attr-value">
            {{ selectedEquip.special ? selectedEquip.special.display : t("equip_refining.none") }}
          </span>
        </div>
      </div>
    </div>
    <div class="equip-refining-recommend-list">
      <equip-refining-recommendation
        v-for="recommendation in recommendations"
        :key="recommendation.slotKey"
        :t="t"
        :recommendation="recommendation"
        :visible-candidates="visibleRecommendationCandidates(recommendation)"
        :has-more-candidates="hasMoreRecommendationCandidates(recommendation)"
        :expanded="isRecommendationExpanded(recommendation.slotKey)"
        :toggle-expanded="toggleRecommendationExpanded"
        :has-equip-image="hasEquipImage"
        :equip-image-src="equipImageSrc"
        :on-equip-image-error="onEquipImageError"
      />
    </div>
  </div>
</section>`;
})();
