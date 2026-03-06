(function () {
  window.__APP_TEMPLATES = Object.assign({}, window.__APP_TEMPLATES, {
    planConfigControl: `
<div class="plan-config" @click.stop>
        <button
          class="ghost-button toggle-button"
          :class="{ 'is-active': showPlanConfig }"
          :aria-pressed="showPlanConfig ? 'true' : 'false'"
          @click="$emit('toggle')"
        >
          <span
            v-if="showPlanConfigHintDot"
            class="plan-config-hint-dot"
            aria-hidden="true"
          >{{ t("plan_config.new_badge") }}</span>
          <span>{{ t("plan_config.plan_recommendation_settings") }}</span>
        </button>
        <div v-if="showPlanConfig" class="plan-config-panel">
          <div class="plan-config-item">
            <div class="secondary-label">{{ t("plan_config.plan_display") }}</div>
            <button
              class="ghost-button toggle-button switch-toggle"
              :class="{ 'is-active': recommendationConfig.hideEssenceOwnedWeapons }"
              :title="t('plan_config.when_enabled_plans_hide_weapons_marked_as_essence_owned')"
              role="switch"
              :aria-checked="recommendationConfig.hideEssenceOwnedWeapons ? 'true' : 'false'"
              @click="recommendationConfig.hideEssenceOwnedWeapons = !recommendationConfig.hideEssenceOwnedWeapons"
            >
              <span class="switch-label">{{ t("plan_config.hide_essence_owned_weapons") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideEssenceOwnedWeapons }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
            <button
              v-if="recommendationConfig.hideEssenceOwnedWeapons"
              class="ghost-button toggle-button switch-toggle switch-sub-toggle"
              :class="{ 'is-active': recommendationConfig.hideEssenceOwnedOwnedOnly }"
              :title="t('plan_config.when_enabled_only_weapons_that_are_both_owned_and_essenc')"
              role="switch"
              :aria-checked="recommendationConfig.hideEssenceOwnedOwnedOnly ? 'true' : 'false'"
              @click="recommendationConfig.hideEssenceOwnedOwnedOnly = !recommendationConfig.hideEssenceOwnedOwnedOnly"
            >
              <span class="switch-label">{{ t("plan_config.hide_only_owned_essence_owned") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideEssenceOwnedOwnedOnly }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
            <button
              v-if="recommendationConfig.hideEssenceOwnedWeapons"
              class="ghost-button toggle-button switch-toggle switch-sub-toggle"
              :class="{ 'is-active': recommendationConfig.hideEssenceOwnedWeaponsInSelector }"
              :title="t('plan_config.when_enabled_the_weapon_selector_also_hides_by_the_curre')"
              role="switch"
              :aria-checked="recommendationConfig.hideEssenceOwnedWeaponsInSelector ? 'true' : 'false'"
              @click="recommendationConfig.hideEssenceOwnedWeaponsInSelector = !recommendationConfig.hideEssenceOwnedWeaponsInSelector"
            >
              <span class="switch-label">{{ t("plan_config.also_apply_to_weapon_list") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideEssenceOwnedWeaponsInSelector }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
            <button
              class="ghost-button toggle-button switch-toggle"
              :class="{ 'is-active': recommendationConfig.hideUnownedWeapons }"
              :title="t('plan_config.when_enabled_plans_hide_weapons_marked_as_unowned')"
              role="switch"
              :aria-checked="recommendationConfig.hideUnownedWeapons ? 'true' : 'false'"
              @click="recommendationConfig.hideUnownedWeapons = !recommendationConfig.hideUnownedWeapons"
            >
              <span class="switch-label">{{ t("plan_config.hide_unowned_weapons") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideUnownedWeapons }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
            <button
              v-if="recommendationConfig.hideUnownedWeapons"
              class="ghost-button toggle-button switch-toggle switch-sub-toggle"
              :class="{ 'is-active': recommendationConfig.hideUnownedWeaponsInSelector }"
              :title="t('plan_config.when_enabled_the_weapon_selector_also_hides_unowned_weap')"
              role="switch"
              :aria-checked="recommendationConfig.hideUnownedWeaponsInSelector ? 'true' : 'false'"
              @click="recommendationConfig.hideUnownedWeaponsInSelector = !recommendationConfig.hideUnownedWeaponsInSelector"
            >
              <span class="switch-label">{{ t("plan_config.also_apply_to_weapon_list") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideUnownedWeaponsInSelector }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
            <button
              class="ghost-button toggle-button switch-toggle"
              :class="{ 'is-active': recommendationConfig.hideFourStarWeapons }"
              :title="t('plan_config.when_enabled_4_weapons_will_not_appear_in_plan_recommend')"
              role="switch"
              :aria-checked="recommendationConfig.hideFourStarWeapons ? 'true' : 'false'"
              @click="recommendationConfig.hideFourStarWeapons = !recommendationConfig.hideFourStarWeapons"
            >
              <span class="switch-label">{{ t("plan_config.hide_4_star_weapons") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideFourStarWeapons }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
            <button
              v-if="recommendationConfig.hideFourStarWeapons"
              class="ghost-button toggle-button switch-toggle switch-sub-toggle"
              :class="{ 'is-active': recommendationConfig.hideFourStarWeaponsInSelector }"
              :title="t('plan_config.when_enabled_the_weapon_selector_also_hides_4_weapons')"
              role="switch"
              :aria-checked="recommendationConfig.hideFourStarWeaponsInSelector ? 'true' : 'false'"
              @click="recommendationConfig.hideFourStarWeaponsInSelector = !recommendationConfig.hideFourStarWeaponsInSelector"
            >
              <span class="switch-label">{{ t("plan_config.also_apply_to_weapon_list") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideFourStarWeaponsInSelector }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
            <button
              class="ghost-button toggle-button switch-toggle"
              :class="{ 'is-active': recommendationConfig.attributeFilterAffectsHiddenWeapons }"
              :title="t('filter.when_enabled_attribute_filters_are_calculated_from_curre')"
              role="switch"
              :aria-checked="recommendationConfig.attributeFilterAffectsHiddenWeapons ? 'true' : 'false'"
              @click="recommendationConfig.attributeFilterAffectsHiddenWeapons = !recommendationConfig.attributeFilterAffectsHiddenWeapons"
            >
              <span class="switch-label">{{ t("filter.attribute_filters_follow_also_apply_to_weapon_list") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.attributeFilterAffectsHiddenWeapons }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
          </div>
          <div class="plan-config-item">
            <div class="secondary-label">{{ t("filter.region_priority") }}</div>
            <div class="secondary-hint">{{ t("filter.priority_region_1_highest") }}</div>
            <select class="secondary-select" v-model="recommendationConfig.preferredRegion1">
              <option value="">{{ t("plan_config.not_set") }}</option>
              <option v-for="region in regionOptions" :key="'region-1-' + region" :value="region">
                {{ tTerm("dungeon", region) }}
              </option>
            </select>
            <div class="secondary-hint">{{ t("filter.priority_region_2_secondary") }}</div>
            <select class="secondary-select" v-model="recommendationConfig.preferredRegion2">
              <option value="">{{ t("plan_config.not_set") }}</option>
              <option
                v-for="region in regionOptions"
                :key="'region-2-' + region"
                :value="region"
                :disabled="region === recommendationConfig.preferredRegion1"
              >
                {{ tTerm("dungeon", region) }}
              </option>
            </select>
          </div>
          <div class="plan-config-item">
            <div class="secondary-label">{{ t("filter.region_priority_strategy") }}</div>
            <select class="secondary-select" v-model="recommendationConfig.regionPriorityMode">
              <option
                v-for="mode in tRegionPriorityModeOptions"
                :key="'region-mode-' + mode.value"
                :value="mode.value"
              >
                {{ mode.label }}
              </option>
            </select>
            <div class="priority-mode-guide">
              <div
                class="secondary-hint priority-mode-desc"
                :class="{ 'is-active': recommendationConfig.regionPriorityMode === mode.value }"
                v-for="mode in tRegionPriorityModeOptions"
                :key="'region-mode-desc-' + mode.value"
              >
                <span class="priority-mode-name">{{ mode.label }}：</span>{{ mode.description }}
              </div>
            </div>
          </div>
          <div class="plan-config-item">
            <div class="secondary-label">{{ t("filter.owned_weapon_priority_strategy") }}</div>
            <select class="secondary-select" v-model="recommendationConfig.ownershipPriorityMode">
              <option
                v-for="mode in tOwnershipPriorityModeOptions"
                :key="'ownership-mode-' + mode.value"
                :value="mode.value"
              >
                {{ mode.label }}
              </option>
            </select>
            <div class="priority-mode-guide">
              <div
                class="secondary-hint priority-mode-desc"
                :class="{ 'is-active': recommendationConfig.ownershipPriorityMode === mode.value }"
                v-for="mode in tOwnershipPriorityModeOptions"
                :key="'ownership-mode-desc-' + mode.value"
              >
                <span class="priority-mode-name">{{ mode.label }}：</span>{{ mode.description }}
              </div>
            </div>
          </div>
          <div
            class="plan-config-item"
            v-if="recommendationConfig.regionPriorityMode === 'strict' && recommendationConfig.ownershipPriorityMode === 'strict'"
          >
            <div class="secondary-label">{{ t("filter.strict_priority_order") }}</div>
            <select class="secondary-select" v-model="recommendationConfig.strictPriorityOrder">
              <option
                v-for="option in tStrictPriorityOrderOptions"
                :key="'strict-order-' + option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <div class="priority-mode-guide">
              <div
                class="secondary-hint priority-mode-desc"
                :class="{ 'is-active': recommendationConfig.strictPriorityOrder === option.value }"
                v-for="option in tStrictPriorityOrderOptions"
                :key="'strict-order-desc-' + option.value"
              >
                <span class="priority-mode-name">{{ option.label }}：</span>{{ option.description }}
              </div>
            </div>
          </div>
          <div class="plan-config-panel-foot">
            <span class="plan-config-close-hint">{{ t("plan_config.click_outside_the_panel_to_close") }}</span>
            <button class="ghost-button plan-config-close" type="button" @click="$emit('toggle')">
              {{ t("plan_config.close") }}
            </button>
          </div>
        </div>
      </div>
`
  });
})();
