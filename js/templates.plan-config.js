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
          <section class="plan-config-section">
            <button
              type="button"
              class="plan-config-section-header"
              :aria-expanded="!isPlanConfigSectionCollapsed('transfer')"
              @click="togglePlanConfigSectionCollapsed('transfer')"
            >
              <div class="plan-config-section-title">
                <span class="secondary-label">{{ t("plan_config.marks_import_export") }}</span>
              </div>
              <span
                class="plan-config-section-chevron"
                :class="{ 'is-open': !isPlanConfigSectionCollapsed('transfer') }"
                aria-hidden="true"
              >
                &gt;
              </span>
            </button>
            <transition name="plan-config-collapse">
              <div
                v-show="!isPlanConfigSectionCollapsed('transfer')"
                class="plan-config-section-body plan-config-transfer"
              >
                <div class="secondary-actions">
                  <button class="ghost-button" type="button" @click="exportWeaponMarks">
                    {{ t("plan_config.marks_export") }}
                  </button>
                  <button class="ghost-button" type="button" @click="triggerMarksImport">
                    {{ t("plan_config.marks_import") }}
                  </button>
                  <input
                    ref="marksImportInput"
                    class="marks-import-input"
                    type="file"
                    accept="application/json,.json"
                    tabindex="-1"
                    aria-hidden="true"
                    @change="handleMarksImportFile"
                  />
                </div>
                <div v-if="marksImportFileName" class="secondary-hint secondary-file">
                  {{ t("plan_config.marks_import_selected_file", { file: marksImportFileName }) }}
                </div>
                <div v-if="marksImportSummary" class="secondary-hint">
                  {{ t("plan_config.marks_import_pending", { count: marksImportSummary.total }) }}
                </div>
                <div v-if="marksImportError" class="secondary-hint secondary-warning">
                  {{ marksImportError }}
                </div>
              </div>
            </transition>
          </section>
          <section class="plan-config-section">
            <button
              type="button"
              class="plan-config-section-header"
              :aria-expanded="!isPlanConfigSectionCollapsed('customWeapons')"
              @click="togglePlanConfigSectionCollapsed('customWeapons')"
            >
              <div class="plan-config-section-title">
                <span class="secondary-label">{{ t("plan_config.custom_weapons") }}</span>
              </div>
              <span
                class="plan-config-section-chevron"
                :class="{ 'is-open': !isPlanConfigSectionCollapsed('customWeapons') }"
                aria-hidden="true"
              >
                &gt;
              </span>
            </button>
            <transition name="plan-config-collapse">
              <div v-show="!isPlanConfigSectionCollapsed('customWeapons')" class="plan-config-section-body plan-config-custom-weapons">
                <div v-if="hasPreviewWeapons" class="attr-hint weapon-attr-warning">
                  <span class="attr-hint-text weapon-attr-warning-text">
                    {{ t("error.weapon_attribute_data_preview_detected") }}
                  </span>
                  <button class="ghost-button attr-hint-dismiss weapon-attr-warning-action" @click="openWeaponAttrDataModal">
                    {{ t("button.manage_weapon_attribute_data") }}
                  </button>
                </div>
                <div class="custom-weapon-grid">
                  <div class="custom-weapon-main">
                    <label class="custom-weapon-field">
                      <span class="secondary-hint">{{ t("plan_config.custom_weapon_name") }}</span>
                      <input
                        class="secondary-input"
                        type="text"
                        v-model.trim="customWeaponDraft.name"
                        :placeholder="t('plan_config.custom_weapon_name_placeholder')"
                      />
                    </label>
                    <label class="custom-weapon-field">
                      <span class="secondary-hint">{{ t("plan_config.custom_weapon_rarity") }}</span>
                      <select class="secondary-select" v-model.number="customWeaponDraft.rarity">
                        <option :value="6">6</option>
                        <option :value="5">5</option>
                        <option :value="4">4</option>
                      </select>
                    </label>
                  </div>
                  <div class="custom-weapon-attrs">
                    <label class="custom-weapon-field">
                      <span class="secondary-hint">{{ t("plan_config.custom_weapon_s1") }}</span>
                      <select class="secondary-select" v-model="customWeaponDraft.s1">
                        <option value="">{{ t("plan_config.custom_weapon_select") }}</option>
                        <option
                          v-for="option in weaponAttrS1Options"
                          :key="'custom-s1-' + option"
                          :value="option"
                        >
                          {{ tTerm("s1", option) }}
                        </option>
                      </select>
                    </label>
                    <label class="custom-weapon-field">
                      <span class="secondary-hint">{{ t("plan_config.custom_weapon_s2") }}</span>
                      <select class="secondary-select" v-model="customWeaponDraft.s2">
                        <option value="">{{ t("plan_config.custom_weapon_select") }}</option>
                        <option
                          v-for="option in weaponAttrS2Options"
                          :key="'custom-s2-' + option"
                          :value="option"
                        >
                          {{ tTerm("s2", option) }}
                        </option>
                      </select>
                    </label>
                    <label class="custom-weapon-field">
                      <span class="secondary-hint">{{ t("plan_config.custom_weapon_s3") }}</span>
                      <select class="secondary-select" v-model="customWeaponDraft.s3">
                        <option value="">{{ t("plan_config.custom_weapon_select") }}</option>
                        <option
                          v-for="option in weaponAttrS3Options"
                          :key="'custom-s3-' + option"
                          :value="option"
                        >
                          {{ tTerm("s3", option) }}
                        </option>
                      </select>
                    </label>
                  </div>
                </div>
                <div v-if="customWeaponError" class="secondary-hint secondary-warning">
                  {{ resolveCustomWeaponError(customWeaponError) }}
                </div>
                <div class="secondary-actions">
                  <button class="ghost-button" type="button" @click="addCustomWeapon">
                    {{ t("plan_config.custom_weapon_add") }}
                  </button>
                  <button class="ghost-button" type="button" @click="resetCustomWeaponDraft">
                    {{ t("plan_config.custom_weapon_clear") }}
                  </button>
                </div>
                <div class="custom-weapon-list">
                  <div v-if="!customWeapons.length" class="secondary-hint">
                    {{ t("plan_config.custom_weapon_empty") }}
                  </div>
                  <div v-for="weapon in customWeapons" :key="'custom-' + weapon.name" class="custom-weapon-row">
                    <div class="custom-weapon-info">
                      <div class="custom-weapon-title">
                        <span class="custom-weapon-name">{{ weapon.name }}</span>
                        <span class="custom-weapon-rarity">{{ weapon.rarity }}★</span>
                      </div>
                      <div class="custom-weapon-meta">
                        <span>{{ tTerm("s1", weapon.s1) }}</span>
                        <span> / </span>
                        <span>{{ tTerm("s2", weapon.s2) }}</span>
                        <span> / </span>
                        <span>{{ tTerm("s3", weapon.s3) }}</span>
                      </div>
                    </div>
                    <button
                      class="ghost-button secondary-warning-action"
                      type="button"
                      @click="removeCustomWeapon(weapon.name)"
                    >
                      {{ t("plan_config.custom_weapon_delete") }}
                    </button>
                  </div>
                </div>
              </div>
            </transition>
          </section>
          <section class="plan-config-section">
            <button
              type="button"
              class="plan-config-section-header"
              :aria-expanded="!isPlanConfigSectionCollapsed('displayRules')"
              @click="togglePlanConfigSectionCollapsed('displayRules')"
            >
              <div class="plan-config-section-title">
                <span class="secondary-label">{{ t("plan_config.display_and_filters") }}</span>
              </div>
              <span
                class="plan-config-section-chevron"
                :class="{ 'is-open': !isPlanConfigSectionCollapsed('displayRules') }"
                aria-hidden="true"
              >
                &gt;
              </span>
            </button>
            <transition name="plan-config-collapse">
              <div v-show="!isPlanConfigSectionCollapsed('displayRules')" class="plan-config-section-body">
                <div class="plan-config-rule-table">
                  <div class="plan-config-rule-row plan-config-rule-head">
                    <div class="plan-config-rule-label"></div>
                    <div class="plan-config-rule-col plan-config-rule-head-cell">
                      {{ t("plan_config.rule_scope_weapon_list") }}
                    </div>
                    <div class="plan-config-rule-col plan-config-rule-head-cell">
                      {{ t("plan_config.rule_scope_plan_recommendations") }}
                    </div>
                  </div>
                  <div class="plan-config-rule-row">
                    <div class="plan-config-rule-label">{{ t("plan_config.hide_essence_owned_weapons") }}</div>
                    <div class="plan-config-rule-col">
                      <button
                        class="ghost-button toggle-button switch-toggle switch-compact"
                        :class="{ 'is-active': recommendationConfig.hideEssenceOwnedWeaponsInSelector }"
                        :title="t('plan_config.when_enabled_rule_applies_to_weapon_list')"
                        :aria-label="t('plan_config.apply_to_weapon_list')"
                        role="switch"
                        :aria-checked="recommendationConfig.hideEssenceOwnedWeaponsInSelector ? 'true' : 'false'"
                        @click="recommendationConfig.hideEssenceOwnedWeaponsInSelector = !recommendationConfig.hideEssenceOwnedWeaponsInSelector"
                      >
                        <span class="switch-label">{{ t("plan_config.apply_to_weapon_list") }}</span>
                        <span class="switch-track" :class="{ on: recommendationConfig.hideEssenceOwnedWeaponsInSelector }" aria-hidden="true">
                          <span class="switch-thumb"></span>
                        </span>
                      </button>
                    </div>
                    <div class="plan-config-rule-col">
                      <button
                        class="ghost-button toggle-button switch-toggle switch-compact"
                        :class="{ 'is-active': recommendationConfig.hideEssenceOwnedWeaponsInPlans }"
                        :title="t('plan_config.when_enabled_rule_applies_to_plan_recommendations')"
                        :aria-label="t('plan_config.apply_to_plan_recommendations')"
                        role="switch"
                        :aria-checked="recommendationConfig.hideEssenceOwnedWeaponsInPlans ? 'true' : 'false'"
                        @click="recommendationConfig.hideEssenceOwnedWeaponsInPlans = !recommendationConfig.hideEssenceOwnedWeaponsInPlans"
                      >
                        <span class="switch-label">{{ t("plan_config.apply_to_plan_recommendations") }}</span>
                        <span class="switch-track" :class="{ on: recommendationConfig.hideEssenceOwnedWeaponsInPlans }" aria-hidden="true">
                          <span class="switch-thumb"></span>
                        </span>
                      </button>
                    </div>
                  </div>
                  <div
                    class="plan-config-rule-row plan-config-rule-sub"
                    v-if="recommendationConfig.hideEssenceOwnedWeaponsInPlans || recommendationConfig.hideEssenceOwnedWeaponsInSelector"
                  >
                    <div class="plan-config-rule-label secondary-hint">{{ t("plan_config.hide_only_owned_essence_owned") }}</div>
                    <div class="plan-config-rule-col plan-config-rule-col-span">
                      <button
                        class="ghost-button toggle-button switch-toggle switch-compact"
                        :class="{ 'is-active': recommendationConfig.hideEssenceOwnedOwnedOnly }"
                        :title="t('plan_config.when_enabled_only_weapons_that_are_both_owned_and_essenc')"
                        :aria-label="t('plan_config.hide_only_owned_essence_owned')"
                        role="switch"
                        :aria-checked="recommendationConfig.hideEssenceOwnedOwnedOnly ? 'true' : 'false'"
                        @click="recommendationConfig.hideEssenceOwnedOwnedOnly = !recommendationConfig.hideEssenceOwnedOwnedOnly"
                      >
                        <span class="switch-label">{{ t("plan_config.hide_only_owned_essence_owned") }}</span>
                        <span class="switch-track" :class="{ on: recommendationConfig.hideEssenceOwnedOwnedOnly }" aria-hidden="true">
                          <span class="switch-thumb"></span>
                        </span>
                      </button>
                    </div>
                  </div>
                  <div class="plan-config-rule-row">
                    <div class="plan-config-rule-label">{{ t("plan_config.hide_unowned_weapons") }}</div>
                    <div class="plan-config-rule-col">
                      <button
                        class="ghost-button toggle-button switch-toggle switch-compact"
                        :class="{ 'is-active': recommendationConfig.hideUnownedWeaponsInSelector }"
                        :title="t('plan_config.when_enabled_rule_applies_to_weapon_list')"
                        :aria-label="t('plan_config.apply_to_weapon_list')"
                        role="switch"
                        :aria-checked="recommendationConfig.hideUnownedWeaponsInSelector ? 'true' : 'false'"
                        @click="recommendationConfig.hideUnownedWeaponsInSelector = !recommendationConfig.hideUnownedWeaponsInSelector"
                      >
                        <span class="switch-label">{{ t("plan_config.apply_to_weapon_list") }}</span>
                        <span class="switch-track" :class="{ on: recommendationConfig.hideUnownedWeaponsInSelector }" aria-hidden="true">
                          <span class="switch-thumb"></span>
                        </span>
                      </button>
                    </div>
                    <div class="plan-config-rule-col">
                      <button
                        class="ghost-button toggle-button switch-toggle switch-compact"
                        :class="{ 'is-active': recommendationConfig.hideUnownedWeaponsInPlans }"
                        :title="t('plan_config.when_enabled_rule_applies_to_plan_recommendations')"
                        :aria-label="t('plan_config.apply_to_plan_recommendations')"
                        role="switch"
                        :aria-checked="recommendationConfig.hideUnownedWeaponsInPlans ? 'true' : 'false'"
                        @click="recommendationConfig.hideUnownedWeaponsInPlans = !recommendationConfig.hideUnownedWeaponsInPlans"
                      >
                        <span class="switch-label">{{ t("plan_config.apply_to_plan_recommendations") }}</span>
                        <span class="switch-track" :class="{ on: recommendationConfig.hideUnownedWeaponsInPlans }" aria-hidden="true">
                          <span class="switch-thumb"></span>
                        </span>
                      </button>
                    </div>
                  </div>
                  <div class="plan-config-rule-row">
                    <div class="plan-config-rule-label">{{ t("plan_config.hide_4_star_weapons") }}</div>
                    <div class="plan-config-rule-col">
                      <button
                        class="ghost-button toggle-button switch-toggle switch-compact"
                        :class="{ 'is-active': recommendationConfig.hideFourStarWeaponsInSelector }"
                        :title="t('plan_config.when_enabled_rule_applies_to_weapon_list')"
                        :aria-label="t('plan_config.apply_to_weapon_list')"
                        role="switch"
                        :aria-checked="recommendationConfig.hideFourStarWeaponsInSelector ? 'true' : 'false'"
                        @click="recommendationConfig.hideFourStarWeaponsInSelector = !recommendationConfig.hideFourStarWeaponsInSelector"
                      >
                        <span class="switch-label">{{ t("plan_config.apply_to_weapon_list") }}</span>
                        <span class="switch-track" :class="{ on: recommendationConfig.hideFourStarWeaponsInSelector }" aria-hidden="true">
                          <span class="switch-thumb"></span>
                        </span>
                      </button>
                    </div>
                    <div class="plan-config-rule-col">
                      <button
                        class="ghost-button toggle-button switch-toggle switch-compact"
                        :class="{ 'is-active': recommendationConfig.hideFourStarWeaponsInPlans }"
                        :title="t('plan_config.when_enabled_rule_applies_to_plan_recommendations')"
                        :aria-label="t('plan_config.apply_to_plan_recommendations')"
                        role="switch"
                        :aria-checked="recommendationConfig.hideFourStarWeaponsInPlans ? 'true' : 'false'"
                        @click="recommendationConfig.hideFourStarWeaponsInPlans = !recommendationConfig.hideFourStarWeaponsInPlans"
                      >
                        <span class="switch-label">{{ t("plan_config.apply_to_plan_recommendations") }}</span>
                        <span class="switch-track" :class="{ on: recommendationConfig.hideFourStarWeaponsInPlans }" aria-hidden="true">
                          <span class="switch-thumb"></span>
                        </span>
                      </button>
                    </div>
                  </div>
                  <div class="plan-config-rule-row">
                    <div class="plan-config-rule-label">{{ t("plan_config.show_weapon_ownership_tags") }}</div>
                    <div class="plan-config-rule-col">
                      <button
                        class="ghost-button toggle-button switch-toggle switch-compact"
                        :class="{ 'is-active': showWeaponOwnership }"
                        :title="t('plan_config.when_enabled_weapon_list_shows_ownership_tags')"
                        :aria-label="t('plan_config.show_weapon_ownership_tags')"
                        role="switch"
                        :aria-checked="showWeaponOwnership ? 'true' : 'false'"
                        @click="toggleShowWeaponOwnership"
                      >
                        <span class="switch-label">{{ t("plan_config.show_weapon_ownership_tags") }}</span>
                        <span class="switch-track" :class="{ on: showWeaponOwnership }" aria-hidden="true">
                          <span class="switch-thumb"></span>
                        </span>
                      </button>
                    </div>
                    <div class="plan-config-rule-col">
                      <span class="plan-config-rule-empty">-</span>
                    </div>
                  </div>
                  <div class="plan-config-rule-row">
                    <div class="plan-config-rule-label">{{ t("filter.attribute_filters_follow_also_apply_to_weapon_list") }}</div>
                    <div class="plan-config-rule-col">
                      <button
                        class="ghost-button toggle-button switch-toggle switch-compact"
                        :class="{ 'is-active': recommendationConfig.attributeFilterAffectsHiddenWeapons }"
                        :title="t('filter.when_enabled_attribute_filters_are_calculated_from_curre')"
                        :aria-label="t('filter.attribute_filters_follow_also_apply_to_weapon_list')"
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
                    <div class="plan-config-rule-col">
                      <span class="plan-config-rule-empty">-</span>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </section>
          <section class="plan-config-section">
            <button
              type="button"
              class="plan-config-section-header"
              :aria-expanded="!isPlanConfigSectionCollapsed('regionPriority')"
              @click="togglePlanConfigSectionCollapsed('regionPriority')"
            >
              <div class="plan-config-section-title">
                <span class="secondary-label">{{ t("filter.region_priority") }}</span>
              </div>
              <span
                class="plan-config-section-chevron"
                :class="{ 'is-open': !isPlanConfigSectionCollapsed('regionPriority') }"
                aria-hidden="true"
              >
                &gt;
              </span>
            </button>
            <transition name="plan-config-collapse">
              <div v-show="!isPlanConfigSectionCollapsed('regionPriority')" class="plan-config-section-body">
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
            </transition>
          </section>
          <section class="plan-config-section">
            <button
              type="button"
              class="plan-config-section-header"
              :aria-expanded="!isPlanConfigSectionCollapsed('regionPriorityMode')"
              @click="togglePlanConfigSectionCollapsed('regionPriorityMode')"
            >
              <div class="plan-config-section-title">
                <span class="secondary-label">{{ t("filter.region_priority_strategy") }}</span>
              </div>
              <span
                class="plan-config-section-chevron"
                :class="{ 'is-open': !isPlanConfigSectionCollapsed('regionPriorityMode') }"
                aria-hidden="true"
              >
                &gt;
              </span>
            </button>
            <transition name="plan-config-collapse">
              <div v-show="!isPlanConfigSectionCollapsed('regionPriorityMode')" class="plan-config-section-body">
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
            </transition>
          </section>
          <section class="plan-config-section">
            <button
              type="button"
              class="plan-config-section-header"
              :aria-expanded="!isPlanConfigSectionCollapsed('ownershipPriorityMode')"
              @click="togglePlanConfigSectionCollapsed('ownershipPriorityMode')"
            >
              <div class="plan-config-section-title">
                <span class="secondary-label">{{ t("filter.owned_weapon_priority_strategy") }}</span>
              </div>
              <span
                class="plan-config-section-chevron"
                :class="{ 'is-open': !isPlanConfigSectionCollapsed('ownershipPriorityMode') }"
                aria-hidden="true"
              >
                &gt;
              </span>
            </button>
            <transition name="plan-config-collapse">
              <div v-show="!isPlanConfigSectionCollapsed('ownershipPriorityMode')" class="plan-config-section-body">
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
            </transition>
          </section>
          <section
            class="plan-config-section"
            v-if="recommendationConfig.regionPriorityMode === 'strict' && recommendationConfig.ownershipPriorityMode === 'strict'"
          >
            <button
              type="button"
              class="plan-config-section-header"
              :aria-expanded="!isPlanConfigSectionCollapsed('strictPriorityOrder')"
              @click="togglePlanConfigSectionCollapsed('strictPriorityOrder')"
            >
              <div class="plan-config-section-title">
                <span class="secondary-label">{{ t("filter.strict_priority_order") }}</span>
              </div>
              <span
                class="plan-config-section-chevron"
                :class="{ 'is-open': !isPlanConfigSectionCollapsed('strictPriorityOrder') }"
                aria-hidden="true"
              >
                &gt;
              </span>
            </button>
            <transition name="plan-config-collapse">
              <div v-show="!isPlanConfigSectionCollapsed('strictPriorityOrder')" class="plan-config-section-body">
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
            </transition>
          </section>
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
