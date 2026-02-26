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
          ></span>
          <span>{{ t("方案推荐设置") }}</span>
        </button>
        <div v-if="showPlanConfig" class="plan-config-panel">
          <div class="plan-config-item">
            <div class="secondary-label">{{ t("方案显示") }}</div>
            <button
              class="ghost-button toggle-button switch-toggle"
              :class="{ 'is-active': recommendationConfig.hideEssenceOwnedWeapons }"
              :title="t('开启后，方案中将隐藏“基质已有武器”。')"
              role="switch"
              :aria-checked="recommendationConfig.hideEssenceOwnedWeapons ? 'true' : 'false'"
              @click="recommendationConfig.hideEssenceOwnedWeapons = !recommendationConfig.hideEssenceOwnedWeapons"
            >
              <span class="switch-label">{{ t("隐藏基质已有武器") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideEssenceOwnedWeapons }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
            <button
              v-if="recommendationConfig.hideEssenceOwnedWeapons"
              class="ghost-button toggle-button switch-toggle switch-sub-toggle"
              :class="{ 'is-active': recommendationConfig.hideEssenceOwnedOwnedOnly }"
              :title="t('开启后，仅隐藏“已拥有且基质已有”的武器；未拥有但基质已有的武器仍会显示。')"
              role="switch"
              :aria-checked="recommendationConfig.hideEssenceOwnedOwnedOnly ? 'true' : 'false'"
              @click="recommendationConfig.hideEssenceOwnedOwnedOnly = !recommendationConfig.hideEssenceOwnedOwnedOnly"
            >
              <span class="switch-label">{{ t("仅隐藏已拥有且基质已有") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideEssenceOwnedOwnedOnly }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
            <button
              v-if="recommendationConfig.hideEssenceOwnedWeapons"
              class="ghost-button toggle-button switch-toggle switch-sub-toggle"
              :class="{ 'is-active': recommendationConfig.hideEssenceOwnedWeaponsInSelector }"
              :title="t('开启后，武器选择列表也会按“隐藏基质已有武器 / 仅隐藏已拥有且基质已有”的当前组合来隐藏。')"
              role="switch"
              :aria-checked="recommendationConfig.hideEssenceOwnedWeaponsInSelector ? 'true' : 'false'"
              @click="recommendationConfig.hideEssenceOwnedWeaponsInSelector = !recommendationConfig.hideEssenceOwnedWeaponsInSelector"
            >
              <span class="switch-label">{{ t("同时应用到武器列表") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideEssenceOwnedWeaponsInSelector }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
            <button
              class="ghost-button toggle-button switch-toggle"
              :class="{ 'is-active': recommendationConfig.hideUnownedWeapons }"
              :title="t('开启后，方案中将隐藏“未拥有”武器。')"
              role="switch"
              :aria-checked="recommendationConfig.hideUnownedWeapons ? 'true' : 'false'"
              @click="recommendationConfig.hideUnownedWeapons = !recommendationConfig.hideUnownedWeapons"
            >
              <span class="switch-label">{{ t("隐藏未拥有武器") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideUnownedWeapons }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
            <button
              v-if="recommendationConfig.hideUnownedWeapons"
              class="ghost-button toggle-button switch-toggle switch-sub-toggle"
              :class="{ 'is-active': recommendationConfig.hideUnownedWeaponsInSelector }"
              :title="t('开启后，武器选择列表也会隐藏未拥有武器。')"
              role="switch"
              :aria-checked="recommendationConfig.hideUnownedWeaponsInSelector ? 'true' : 'false'"
              @click="recommendationConfig.hideUnownedWeaponsInSelector = !recommendationConfig.hideUnownedWeaponsInSelector"
            >
              <span class="switch-label">{{ t("同时应用到武器列表") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideUnownedWeaponsInSelector }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
            <button
              class="ghost-button toggle-button switch-toggle"
              :class="{ 'is-active': recommendationConfig.hideFourStarWeapons }"
              :title="t('开启后，四星武器将不会出现在方案推荐列表中。')"
              role="switch"
              :aria-checked="recommendationConfig.hideFourStarWeapons ? 'true' : 'false'"
              @click="recommendationConfig.hideFourStarWeapons = !recommendationConfig.hideFourStarWeapons"
            >
              <span class="switch-label">{{ t("隐藏四星武器") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideFourStarWeapons }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
            <button
              v-if="recommendationConfig.hideFourStarWeapons"
              class="ghost-button toggle-button switch-toggle switch-sub-toggle"
              :class="{ 'is-active': recommendationConfig.hideFourStarWeaponsInSelector }"
              :title="t('开启后，武器选择列表也会隐藏四星武器。')"
              role="switch"
              :aria-checked="recommendationConfig.hideFourStarWeaponsInSelector ? 'true' : 'false'"
              @click="recommendationConfig.hideFourStarWeaponsInSelector = !recommendationConfig.hideFourStarWeaponsInSelector"
            >
              <span class="switch-label">{{ t("同时应用到武器列表") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideFourStarWeaponsInSelector }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
            <button
              class="ghost-button toggle-button switch-toggle"
              :class="{ 'is-active': recommendationConfig.attributeFilterAffectsHiddenWeapons }"
              :title="t('开启后，属性筛选按武器列表实际显示结果计算（受“同时应用到武器列表”开关影响）；关闭后按真实匹配数计算。')"
              role="switch"
              :aria-checked="recommendationConfig.attributeFilterAffectsHiddenWeapons ? 'true' : 'false'"
              @click="recommendationConfig.attributeFilterAffectsHiddenWeapons = !recommendationConfig.attributeFilterAffectsHiddenWeapons"
            >
              <span class="switch-label">{{ t("属性筛选受“同时应用到武器列表”影响") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.attributeFilterAffectsHiddenWeapons }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
          </div>
          <div class="plan-config-item">
            <div class="secondary-label">{{ t("地区优先级") }}</div>
            <div class="secondary-hint">{{ t("优先地区1（最高）") }}</div>
            <select class="secondary-select" v-model="recommendationConfig.preferredRegion1">
              <option value="">{{ t("不设置") }}</option>
              <option v-for="region in regionOptions" :key="'region-1-' + region" :value="region">
                {{ tTerm("dungeon", region) }}
              </option>
            </select>
            <div class="secondary-hint">{{ t("优先地区2（次高）") }}</div>
            <select class="secondary-select" v-model="recommendationConfig.preferredRegion2">
              <option value="">{{ t("不设置") }}</option>
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
            <div class="secondary-label">{{ t("地区优先策略") }}</div>
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
            <div class="secondary-label">{{ t("已拥有武器优先策略") }}</div>
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
            <div class="secondary-label">{{ t("严格优先顺序") }}</div>
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
            <button class="ghost-button plan-config-close" type="button" @click="$emit('toggle')">
              {{ t("关闭") }}
            </button>
          </div>
        </div>
      </div>
`
  });
})();
