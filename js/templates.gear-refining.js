(function () {
  window.__APP_TEMPLATES = window.__APP_TEMPLATES || {};

  window.__APP_TEMPLATES.gearRefiningList = `
<section
  class="panel gear-refining-panel gear-refining-panel-left"
  :class="{ 'panel-hidden': mobilePanel !== 'gears' }"
>
  <div class="panel-title">
    <h2>{{ t("gear_refining.list_title") }}</h2>
  </div>
  <label class="search-box">
    <span>🔍</span>
    <input
      :value="query"
      :placeholder="t('gear_refining.search_placeholder')"
      @input="$emit('update:query', $event.target.value)"
    />
  </label>
  <div v-if="groupedSets.length" class="gear-refining-set-list">
    <section
      v-for="setGroup in groupedSets"
      :key="setGroup.setName"
      class="gear-refining-set-group"
    >
      <button
        type="button"
        class="gear-refining-set-header"
        :aria-expanded="!isSetCollapsed(setGroup.setName)"
        @click="toggleSetCollapsed(setGroup.setName)"
      >
        <div class="gear-refining-set-title">
          <h3>{{ setGroup.setName }}</h3>
          <span class="gear-refining-set-count">{{ setGroup.gears.length }}</span>
        </div>
        <span
          class="gear-refining-set-chevron"
          :class="{ 'is-open': !isSetCollapsed(setGroup.setName) }"
          aria-hidden="true"
        >
          &gt;
        </span>
      </button>
      <transition name="gear-refining-set-collapse">
        <div v-show="!isSetCollapsed(setGroup.setName)" class="weapon-list gear-refining-gear-list">
          <button
            v-for="gear in setGroup.gears"
            :key="gear.name"
            type="button"
            class="weapon-item gear-refining-gear-item rarity-5"
            :class="{ 'is-selected': selectedGearName && selectedGearName === gear.name }"
            @click="selectGear(gear)"
          >
            <div class="weapon-art">
              <img
                v-if="hasGearImage(gear)"
                class="weapon-figure"
                v-lazy-src="gearImageSrc(gear)"
                :alt="gear.name"
                loading="lazy"
                decoding="async"
                @error="onGearImageError($event, gear)"
              />
              <span v-else class="weapon-fallback-large">5★</span>
            </div>
            <div class="weapon-band"></div>
            <div class="weapon-name">
              <div class="weapon-title gear-refining-name">{{ gear.name }}</div>
              <div class="gear-refining-gear-meta">{{ gear.part }}</div>
            </div>
          </button>
        </div>
      </transition>
    </section>
  </div>
  <div v-else class="empty-state match-empty">
    <h2>{{ t("gear_refining.no_matching_gear") }}</h2>
  </div>
</section>`;

  window.__APP_TEMPLATES.gearRefiningRecommendation = `
<article class="gear-refining-recommend-card">
  <header class="gear-refining-recommend-head">
    <div class="gear-refining-recommend-title">{{ t(recommendation.slotLabel) }}</div>
    <div v-if="recommendation.targetAttr" class="gear-refining-recommend-target">
      {{ recommendation.targetAttr.display }}
    </div>
  </header>
  <div v-if="!recommendation.targetAttr" class="gear-refining-recommend-empty">
    {{ t("gear_refining.missing_target_attr") }}
  </div>
  <template v-else>
    <p class="gear-refining-recommend-tip" v-if="recommendation.recommendSelf">
      {{ t("gear_refining.recommend_self") }}
    </p>
    <p class="gear-refining-recommend-tip" v-else>
      {{ t("gear_refining.recommend_other_gear") }}（<span class="gear-refining-tip-value">{{ recommendation.topValueDisplay }}</span>）
    </p>
    <div class="weapon-list gear-refining-candidate-list">
      <div
        v-for="candidate in visibleCandidates"
        :key="candidate.gear.name"
        class="weapon-item gear-refining-candidate-item rarity-5"
      >
        <div class="weapon-art">
          <img
            v-if="hasGearImage(candidate.gear)"
            class="weapon-figure"
            v-lazy-src="gearImageSrc(candidate.gear)"
            :alt="candidate.gear.name"
            loading="lazy"
            decoding="async"
            @error="onGearImageError($event, candidate.gear)"
          />
          <span v-else class="weapon-fallback-large">5★</span>
        </div>
        <div class="weapon-band"></div>
        <div class="weapon-name">
          <div class="weapon-title gear-refining-name">{{ candidate.gear.name }}</div>
          <div class="gear-refining-gear-meta">{{ candidate.gear.part }}</div>
        </div>
      </div>
    </div>
    <button
      v-if="hasMoreCandidates"
      type="button"
      class="ghost-button gear-refining-candidate-toggle"
      @click="toggleExpanded(recommendation.slotKey)"
    >
      {{
        expanded
          ? t("gear_refining.collapse_other_candidates")
          : t("gear_refining.expand_other_candidates")
      }}
    </button>
  </template>
</article>`;

  window.__APP_TEMPLATES.gearRefiningDetail = `
<section
  class="panel gear-refining-panel gear-refining-panel-right"
  :class="{ 'panel-hidden': mobilePanel !== 'recommend' }"
>
  <div class="panel-title">
    <h2>{{ t("gear_refining.recommendation_title") }}</h2>
  </div>
  <div v-if="!selectedGear" class="empty-state match-empty">
    <h2>{{ t("gear_refining.select_one_gear") }}</h2>
  </div>
  <div v-else class="gear-refining-detail">
    <div class="gear-refining-selected">
      <div class="weapon-item gear-refining-selected-card rarity-5">
        <div class="weapon-art">
          <img
            v-if="hasGearImage(selectedGear)"
            class="weapon-figure"
            v-lazy-src="gearImageSrc(selectedGear)"
            :alt="selectedGear.name"
            loading="lazy"
            decoding="async"
            @error="onGearImageError($event, selectedGear)"
          />
          <span v-else class="weapon-fallback-large">5★</span>
        </div>
        <div class="weapon-band"></div>
        <div class="weapon-name">
          <div class="weapon-title gear-refining-name">{{ selectedGear.name }}</div>
          <div class="gear-refining-gear-meta">{{ selectedGear.part }}</div>
        </div>
      </div>
      <div class="gear-refining-attrs">
        <div class="gear-refining-attr-row">
          <span class="gear-refining-attr-label">{{ t("gear_refining.sub_attr_1") }}</span>
          <span class="gear-refining-attr-value">
            {{ selectedGear.sub1 ? selectedGear.sub1.display : t("gear_refining.none") }}
          </span>
        </div>
        <div class="gear-refining-attr-row">
          <span class="gear-refining-attr-label">{{ t("gear_refining.sub_attr_2") }}</span>
          <span class="gear-refining-attr-value">
            {{ selectedGear.sub2 ? selectedGear.sub2.display : t("gear_refining.none") }}
          </span>
        </div>
        <div class="gear-refining-attr-row">
          <span class="gear-refining-attr-label">{{ t("gear_refining.special_effect") }}</span>
          <span class="gear-refining-attr-value">
            {{ selectedGear.special ? selectedGear.special.display : t("gear_refining.none") }}
          </span>
        </div>
      </div>
    </div>
    <div class="gear-refining-recommend-list">
      <gear-refining-recommendation
        v-for="recommendation in recommendations"
        :key="recommendation.slotKey"
        :t="t"
        :recommendation="recommendation"
        :visible-candidates="visibleRecommendationCandidates(recommendation)"
        :has-more-candidates="hasMoreRecommendationCandidates(recommendation)"
        :expanded="isRecommendationExpanded(recommendation.slotKey)"
        :toggle-expanded="toggleRecommendationExpanded"
        :has-gear-image="hasGearImage"
        :gear-image-src="gearImageSrc"
        :on-gear-image-error="onGearImageError"
      />
    </div>
  </div>
</section>`;
})();
