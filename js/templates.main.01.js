(function () {
  window.__APP_TEMPLATE_MAIN_PARTS = window.__APP_TEMPLATE_MAIN_PARTS || [];
  window.__APP_TEMPLATE_MAIN_PARTS.push(`
<header class="hero">
        <div class="hero-title">
          <h1>{{ t("nav.endfield_essence_planner") }}</h1>
        </div>
        <div class="hero-actions">
          <div class="lang-switch" ref="langSwitchRef" @click.stop>
            <button
              class="lang-button"
              type="button"
              aria-label="Language"
              aria-haspopup="listbox"
              :aria-expanded="showLangMenu ? 'true' : 'false'"
              @click="toggleLangMenu"
            >
              <span class="lang-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                  <circle cx="12" cy="12" r="9"></circle>
                  <path d="M3 12h18"></path>
                  <path d="M12 3a13 13 0 0 1 0 18"></path>
                  <path d="M12 3a13 13 0 0 0 0 18"></path>
                </svg>
              </span>
              <span class="lang-label">Language</span>
            </button>
            <div v-if="showLangMenu" class="lang-menu" :class="'align-' + langMenuPlacement" role="listbox">
              <button
                v-for="option in languageOptions"
                :key="option.value"
                class="lang-option"
                :class="{ active: option.value === locale }"
                role="option"
                :aria-selected="option.value === locale"
                @click="setLocale(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
          <div class="theme-switch" @click.stop>
            <label class="theme-label" for="theme-mode-select">{{ t("nav.theme") }}</label>
            <select
              id="theme-mode-select"
              class="theme-select"
              :value="themePreference"
              @change="setThemeMode($event.target.value)"
            >
              <option value="auto">{{ t("nav.auto") }}</option>
              <option value="light">{{ t("nav.light") }}</option>
              <option value="dark">{{ t("nav.dark") }}</option>
            </select>
          </div>
          <button class="about-button notice-button" @click="openNotice">{{ t("nav.announcement") }}</button>
          <button class="about-button" @click="openChangelog">{{ t("nav.changelog") }}</button>
          <button class="about-button" @click="openAbout">{{ t("nav.about") }}</button>
          <div class="secondary-menu">
            <button class="about-button menu-toggle" @click="showSecondaryMenu = !showSecondaryMenu">
              {{ t("nav.more_settings") }}
            </button>
            <div v-if="showSecondaryMenu" class="secondary-panel">
              <div class="secondary-item">
                <div class="secondary-label">{{ t("nav.performance_mode") }}</div>
                <select class="secondary-select" :value="perfPreference" @change="setPerfMode($event.target.value)">
                  <option value="auto">{{ t("nav.auto") }}</option>
                  <option value="standard">{{ t("nav.standard") }}</option>
                  <option value="low">{{ t("nav.low_gpu") }}</option>
                </select>
                <div v-if="perfPreference === 'auto'" class="secondary-hint">
                  {{ t("nav.auto_now") }}{{ lowGpuEnabled ? t("nav.low_gpu") : t("nav.standard") }}
                </div>
              </div>
              <div class="secondary-item secondary-desc">
                {{ t("nav.auto_mode_temporarily_switches_to_low_gpu_based_on_rende") }}
              </div>
              <div class="secondary-item">
                <div class="secondary-label">{{ t("nav.background_display") }}</div>
                <button
                  class="ghost-button toggle-button switch-toggle"
                  :class="{ 'is-active': backgroundDisplayEnabled }"
                  role="switch"
                  :aria-checked="backgroundDisplayEnabled ? 'true' : 'false'"
                  :disabled="lowGpuEnabled"
                  @click="toggleBackgroundDisplayEnabled"
                >
                  <span class="switch-label">{{ backgroundDisplayEnabled ? t("nav.enabled") : t("button.disabled") }}</span>
                  <span class="switch-track" :class="{ on: backgroundDisplayEnabled }">
                    <span class="switch-thumb"></span>
                  </span>
                </button>
                <div class="secondary-hint">
                  {{
                    lowGpuEnabled
                      ? t("button.background_is_forced_off_in_low_gpu_mode_this_switch_onl")
                      : t("button.when_disabled_only_a_plain_color_background_is_shown")
                  }}
                </div>
              </div>
              <div class="secondary-item">
                <div class="secondary-label">{{ t("nav.background_image") }}</div>
                <div class="secondary-actions">
                  <label class="ghost-button secondary-upload">
                    {{ t("button.import_image") }}
                    <input type="file" accept="image/*" @change="handleBackgroundFile" />
                  </label>
                  <button
                    class="ghost-button"
                    @click="clearCustomBackground"
                    :disabled="!customBackground && !customBackgroundApi"
                  >
                    {{ t("button.restore_default") }}
                  </button>
                </div>
                <div v-if="customBackgroundName" class="secondary-hint secondary-file">
                  {{ t("nav.current") }}{{ customBackgroundName }}
                </div>
                <div v-else class="secondary-hint">{{ t("button.use_random_background_when_no_image_is_imported") }}</div>
                <input
                  class="secondary-input"
                  type="text"
                  v-model.trim.lazy="customBackgroundApi"
                  :placeholder="t('nav.custom_image_api_returns_image')"
                />
                <div v-if="customBackgroundApi" class="secondary-hint secondary-file">
                  {{ t("API：") }}{{ customBackgroundApi }}
                </div>
                <div v-else class="secondary-hint">{{ t("nav.use_random_background_when_no_api_is_set") }}</div>
                <div v-if="customBackground" class="secondary-hint">
                  {{ t("button.local_image_imported_local_background_will_be_used_first") }}
                </div>
                <div v-if="customBackgroundError" class="secondary-hint secondary-warning">
                  {{ customBackgroundError }}
                </div>
              </div>
              <div class="secondary-item">
                <div class="secondary-label">{{ t("tutorial.tutorial") }}</div>
                <button class="ghost-button" @click="startTutorial(true)">{{ t("nav.try_again") }}</button>
              </div>
              <div class="secondary-item secondary-desc">
                <label class="notice-skip">
                  <input type="checkbox" v-model="tutorialSkipAll" />
                  {{ t("tutorial.don_t_auto_open_this_version_s_tutorial") }}
                </label>
              </div>
              <div v-if="hasOptionalFailureHistory" class="secondary-item">
                <div class="secondary-label">{{ t("error.optional_feature_load_failed") }}</div>
                <div class="secondary-actions">
                  <button class="ghost-button secondary-warning-action" @click="openLatestOptionalFailureDetail">
                    {{ t("error.view_optional_failure_details") }}
                  </button>
                </div>
                <div class="secondary-hint secondary-warning">
                  {{ t("warning.some_optional_features_could_not_be_loaded_core_page_usa") }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="hero-nav-stack">
          <nav class="main-nav hero-nav" :aria-label="t('nav.main_navigation')">
          <button 
            class="nav-item" 
            :class="{ active: currentView === 'planner' }" 
            @click="setView('planner')"
          >
            {{ t("nav.essence_planner") }}
          </button>
          <button 
            class="nav-item" 
            :class="{ active: currentView === 'strategy' }" 
            @click="setView('strategy')"
          >
            {{ t("nav.character_guide") }}
          </button>
          <button 
            class="nav-item" 
            :class="{ active: currentView === 'match' }" 
            @click="setView('match')"
          >
            {{ t("nav.trait_match") }}
          </button>
          <button 
            class="nav-item" 
            :class="{ active: currentView === 'gear-refining' }" 
            @click="setView('gear-refining')"
          >
            <span
              v-if="showGearRefiningNavHintDot"
              class="nav-hint-dot"
              aria-hidden="true"
            >NEW</span>
            {{ t("nav.gear_refining") }}
          </button>
          <button
            class="nav-item"
            :class="{ active: currentView === 'rerun-ranking' }"
            @click="setView('rerun-ranking')"
          >
            <span
              v-if="showRerunRankingNavHintDot"
              class="nav-hint-dot"
              aria-hidden="true"
            >NEW</span>
            {{ t("nav.rerun_ranking") }}
          </button>
          </nav>
        </div>
      </header>
      <div v-if="showAiNotice" class="ai-notice">
        <span class="ai-chip">{{ t("AI") }}</span>
        <span>{{ t("error.this_language_is_ai_translated_and_may_be_inaccurate_if_") }}</span>
      </div>
      <div v-if="lowGpuEnabled" class="perf-status">
        <div class="perf-status-text">
          {{ t("nav.low_gpu_mode_enabled") }}{{ perfPreference === "auto" ? t("nav.auto_2") : t("nav.manual") }}
        </div>
        <button class="ghost-button" @click.stop="showSecondaryMenu = true">
          {{ t("nav.more_settings") }}
        </button>
      </div>
      <div v-if="showPerfNotice" class="perf-notice">
        <div class="perf-notice-text">
          {{ t("error.low_rendering_performance_detected_switched_to_low_gpu_m") }}
        </div>
        <div class="perf-notice-actions">
          <button class="ghost-button" @click="setPerfMode('standard')">{{ t("button.restore_effects") }}</button>
          <button class="about-button perf-keep" @click="setPerfMode('low')">{{ t("button.keep_low_gpu") }}</button>
        </div>
      </div>
      <main class="layout">
        <transition name="view-switch" mode="out-in">
          <div v-if="currentView === 'planner'" key="planner" class="view-shell planner-shell">
        <div class="mobile-tabs">
          <button
            class="mobile-tab"
            :class="{ active: mobilePanel === 'weapons' }"
            @click="mobilePanel = 'weapons'"
          >
            {{ t("nav.weapons") }} <span class="count">{{ selectedNames.length }}</span>
          </button>
          <button
            class="mobile-tab"
            ref="tutorialPlansTab"
            :class="{
              active: mobilePanel === 'plans',
              'tutorial-highlight':
                tutorialActive &&
                tutorialStepKey === 'base-pick' &&
                isPortrait &&
                mobilePanel !== 'plans'
            }"
            @click="mobilePanel = 'plans'"
          >
            {{ t("nav.plans") }} <span class="count">{{ recommendations.length }}</span>
          </button>
        </div>
        <div class="mobile-hint">
          <span>{{ t("nav.on_mobile_switch_between_weapons_plans_via_the_tabs_abov") }}</span>
        </div>
        <section class="panel" :class="{ 'panel-hidden': mobilePanel !== 'weapons' }">
          <div class="panel-title">
            <h2>{{ t("nav.weapon_selector") }}</h2>
            <div v-if="isPortrait" class="panel-actions">
              <plan-config-control
                :t="t"
                :t-term="tTerm"
                :recommendation-config="recommendationConfig"
                :show-plan-config="showPlanConfig"
                :show-plan-config-hint-dot="showPlanConfigHintDot"
                :region-options="regionOptions"
                :t-region-priority-mode-options="tRegionPriorityModeOptions"
                :t-ownership-priority-mode-options="tOwnershipPriorityModeOptions"
                :t-strict-priority-order-options="tStrictPriorityOrderOptions"
                @toggle="togglePlanConfig"
              ></plan-config-control>
            </div>
          </div>

          <div class="weapon-list-anchor" aria-hidden="true"></div>
          <label class="search-box">
            <span>🔍</span>
            <input v-model="searchQuery" :placeholder="t('nav.search_weapons_attributes_characters')" />
          </label>

          <div class="filter-toolbar">
            <div class="filter-toolbar-main">
              <button
                class="ghost-button"
                :class="{
                  'is-active': showWeaponAttrs,
                  'tutorial-highlight': tutorialActive && tutorialStepKey === 'show-attrs',
                  'attr-hint-target': showAttrHint
                }"
                @click="toggleShowWeaponAttrs"
              >
                {{ showWeaponAttrs ? t("nav.hide_attributes_ownership_notes") : t("nav.show_attributes_ownership_notes") }}
              </button>
              <button class="ghost-button" @click="toggleFilterPanel">
                {{ showFilterPanel ? t("nav.collapse_filters") : t("button.expand_filters") }}
              </button>
            </div>
            <button
              class="ghost-button filter-toolbar-clear"
              :disabled="!hasAttributeFilters"
              @click="clearAttributeFilters"
            >
              {{ t("button.clear_attribute_filters") }}
            </button>
          </div>
          <div v-if="hasPreviewWeapons" class="attr-hint weapon-attr-warning">
            <span class="attr-hint-text weapon-attr-warning-text">
              {{ t("error.weapon_attribute_data_preview_detected") }}
            </span>
            <button class="ghost-button attr-hint-dismiss weapon-attr-warning-action" @click="openWeaponAttrDataModal">
              {{ t("button.manage_weapon_attribute_data") }}
            </button>
          </div>
          <div v-if="hasDataIntegrityWeaponAttrs" class="attr-hint weapon-attr-warning">
            <span class="attr-hint-text weapon-attr-warning-text">
              {{ t("error.weapon_data_integrity_detected_count", { count: dataIntegrityWeaponAttrRows.length }) }}
            </span>
            <button class="ghost-button attr-hint-dismiss weapon-attr-warning-action" @click="openWeaponDataIntegrityDetails">
              {{ t("button.view_data_exception_details") }}
            </button>
          </div>
          <transition name="fade-scale">
            <div v-if="showAttrHint" class="attr-hint">
              <span class="attr-hint-text">
                {{
                  t("button.tip_click_label_to_toggle_attribute_and_ownership_displa", {
                    label: t("nav.show_attributes_ownership_notes")
                  })
                }}
              </span>
              <button class="ghost-button attr-hint-dismiss" @click="dismissAttrHint">
                {{ t("button.got_it") }}
              </button>
            </div>
          </transition>
          <div class="filter-panel" :class="{ 'is-collapsed': !showFilterPanel }">
            <div class="filter-group">
              <div class="filter-title">{{ t("nav.base_attributes") }}</div>
              <div class="filter-chips">
                <button
                  v-for="option in s1Options"
                  :key="option.value"
                  class="filter-chip"
                  :class="{
                    'is-active': filterS1.includes(option.value),
                    'is-disabled': option.isDisabled && !filterS1.includes(option.value),
                  }"
                  :title="
                    option.isDisabled && !filterS1.includes(option.value)
                      ? option.disabledHintTitle
                      : ''
                  "
                  @click="
                    option.isDisabled && !filterS1.includes(option.value)
                      ? null
                      : toggleFilterValue('s1', option.value)
                  "
                >
                  <span>{{ formatS1(option.value) }}</span>
                  <span v-if="option.isDisabled && !filterS1.includes(option.value)" class="chip-meta">
                    {{ option.disabledHintLabel }}
                  </span>
                </button>
              </div>
            </div>
            <div class="filter-group">
              <div class="filter-title">{{ t("nav.extra_attributes") }}</div>
              <div class="filter-chips">
                <button
                  v-for="option in s2Options"
                  :key="option.value"
                  class="filter-chip"
                  :class="{
                    'is-active': filterS2.includes(option.value),
                    'is-disabled': option.isDisabled && !filterS2.includes(option.value),
                  }"
                  :title="
                    option.isDisabled && !filterS2.includes(option.value)
                      ? option.disabledHintTitle
                      : ''
                  "
                  @click="
                    option.isDisabled && !filterS2.includes(option.value)
                      ? null
                      : toggleFilterValue('s2', option.value)
                  "
                >
                  <span>{{ tTerm("s2", option.value) }}</span>
                  <span v-if="option.isDisabled && !filterS2.includes(option.value)" class="chip-meta">
                    {{ option.disabledHintLabel }}
                  </span>
                </button>
              </div>
            </div>
            <div class="filter-group">
              <div class="filter-title">{{ t("nav.skill_attributes") }}</div>
              <div class="filter-chips">
                <button
                  v-for="option in s3OptionEntries"
                  :key="option.value"
                  class="filter-chip"
                  :class="{
                    'is-active': filterS3.includes(option.value),
                    'is-disabled': option.isDisabled && !filterS3.includes(option.value),
                  }"
                  :title="
                    option.isDisabled && !filterS3.includes(option.value)
                      ? option.disabledHintTitle
                      : ''
                  "
                  @click="
                    option.isDisabled && !filterS3.includes(option.value)
                      ? null
                      : toggleFilterValue('s3', option.value)
                  "
                >
                  <span>{{ tTerm("s3", option.value) }}</span>
                  <span v-if="option.isDisabled && !filterS3.includes(option.value)" class="chip-meta">
                    {{ option.disabledHintLabel }}
                  </span>
                </button>
              </div>
              <div class="filter-hint">{{ t("error.gray_attributes_mean_no_weapons_under_current_filters") }}</div>
            </div>
          </div>

          <div class="tag-row">
            <div class="tag-list">
              <span v-if="!selectedNames.length" class="tag tag-empty">{{ t("nav.no_weapons_selected") }}</span>
              <span
                v-for="weapon in selectedWeaponRows"
                :key="weapon.name"
                class="tag"
                :class="{ 'is-unowned': weapon.isUnowned, 'is-essence-owned': weapon.isEssenceOwned }"
                :title="weapon.note ? \`\${t('nav.note')}\${weapon.note}\` : ''"
              >
                <span class="tag-name">{{ tTerm("weapon", weapon.name) }}</span>
                <span v-if="weapon.isUnowned" class="tag-note is-unowned">{{ t("nav.not_owned") }}</span>
                <span v-if="weapon.isEssenceOwned" class="tag-note is-essence-owned">{{ t("nav.essence_owned") }}</span>
                <button @click.stop="toggleWeapon(weapon, 'tag')">✕</button>
              </span>
            </div>
            <div class="tag-actions">
              <button
                class="ghost-button tag-select"
                @click="selectAllWeapons"
                :disabled="!filteredWeapons.length || allFilteredSelected"
              >
                {{ t("nav.select_all_weapons") }}
              </button>
              <button class="ghost-button tag-clear" @click="clearSelection" :disabled="!selectedNames.length">
                {{ t("button.clear_selected_weapons") }}
              </button>
            </div>
          </div>

          <div v-if="!showWeaponAttrs" class="weapon-list">
            <div
              v-if="weaponGridTopSpacer > 0"
              class="virtual-spacer"
              :style="{ height: \`\${weaponGridTopSpacer}px\`, gridColumn: '1 / -1' }"
            ></div>
            <div
              v-for="weapon in visibleFilteredWeapons"
              :key="weapon.name"
              class="weapon-item"
              v-memo="[locale, localeRenderVersion, selectedNameSet.has(weapon.name), isWeaponOwned(weapon.name), isEssenceOwned(weapon.name), weaponUpBadgeMemoKey, selectorHiddenMemoKey]"
              :class="{
                'is-selected': selectedNameSet.has(weapon.name),
                'is-unowned': isUnowned(weapon.name),
                'is-essence-owned': isEssenceOwned(weapon.name),
                'rarity-6': weapon.rarity === 6,
                'rarity-5': weapon.rarity === 5,
                'rarity-4': weapon.rarity === 4,
              }"
              @click="toggleWeapon(weapon, 'grid')"
            >
              <div class="weapon-art">
                <img
                  v-if="hasImage(weapon)"
                  class="weapon-figure"
                  v-lazy-src="weaponImageSrc(weapon)"
                  :alt="weapon.name"
                  loading="lazy"
                  decoding="async"
                />
                <span v-else class="weapon-fallback-large">{{ weapon.rarity }}★</span>
              </div>
              <div v-if="weaponCharacters(weapon).length" class="weapon-avatars">
                <img
                  v-for="(character, index) in weaponCharacters(weapon)"
                  :key="\`\${weapon.name}-character-\${index}\`"
                  class="weapon-avatar"
                  v-lazy-src="characterImageSrc(character)"
                  :alt="tTerm('character', character)"
                  loading="lazy"
                  decoding="async"
                  @error="handleCharacterImageError"
                />
              </div>
              <div class="weapon-band"></div>
              <div class="weapon-corner-stack">
                <div v-if="isWeaponUpActive(weapon.name)" class="weapon-up-chip">
                  <img
                    class="weapon-up-chip-icon"
                    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIQAAAA8CAMAAACQA+KNAAAAw1BMVEX/8gD/8gD/8QD/8QD/8QH/8QH/8QH/8QH/8gL/8gP/8gP/9ib/8QH/8AH/8QH/8gz/8wL/8QD/8QX/8QD/9Av/8QFBQCTh1gX/8QD/8gH/7wH/8wb/8gF1bxv/9AH/8gCOiBWqoRD/8Ab/8AD/8wD/7wP/8AD/7gT/8QD/7Q1aVyBCQCSpohHFvAv/8gH/7wI1NCb/8wJnYx3/6glOSyK3rg6CfBjw4wL/8wL/8wCclRPUyQn/8wD/7wGpohD/7wApKSmAwyqyAAAAQHRSTlPl2M7FlIt4ZVtINQSBnm4OPuEhsRio/Oi7p1IrUfYYsfLvI+ErP7srug75/O7rnW/9UvcY++3054GB8epuUe5v8HZtSQAAApxJREFUWMPFmdlygkAQRcm+xywo2VBQowaEGIyaxCz8/1cFmIE7oVJFU0PZ/WQmL8ee7nt7WuOkZV7dH18cPRwenO+f7u2etXs3O9tbl8Ym4+Spm0HcSYjwlglinEC85Jm47Y02D9Eyc4hPAcGUieHxY3EdZ+3rFGJgbCIAYfbHeU28p5nggGjNr+75M9FFi/LVhJm36LOAuB4xXEe3PxSZAARHi6YQX0pNMECoiim6gycTQqx+ZCYmDDWR6oTaoiw1IRQT3cGTCdQEZ3eoYhVWdYfVyWKBk6U4yT53lPAi16rhHYCo9g4rzsLFiS1Oss9xKWyrTotCJ3oTfQiEv6ZlQigmRazoEIjZmuaixXW8NQeB8Fck70isXM3EqFmI+IOumNAJfQg7SGJhSwiPBAHFxDyhBeGIf3zLqqBaOca7dnMQxqv40yJMVn2IlTCwxiAiQBAUE9cRojD1IXxAUFy0nIlBExBOjZpovjCjaRIfXp3uIExWWjrhElsUELI7Bg0qJnXaxoM4bBrCt2jj3ZC8GgCEg5NI+cK1GdTxrjCwsMLKC2XGgZCk1/8gZs6qxgtMQlDGuw76Tk1NpED4Xhr2MqjxIMZ1VLooSqCY7xx4JXRCY1NDehAvZKblZbuxCEsHojUvzxMVEKtZPj8ugmAKRdKCEJmgGRjyX45AD8LsYzVAqAk4tBpLQw8CVk59lVt+jEB/amcCYgUXpVPYK32IcX4d7+SdlatgeJADQGzmLRosvU4SkfNHkaZZrOvXRGl7x7HRfSoU81Ma2IRtU3PHvdseKooZsixJpIuq3sG0LlLFiiETECvWndUcPzW8Me4xpYtKA+sxQaA7uDIBF+XcY2KykgbGvsfk+6nhr4FNGLsDss32C/ED45b/F5MPF3B+XRSlAAAAAElFTkSuQmCC"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    @load="$event.target.closest('.weapon-up-chip')?.classList.remove('is-fallback')"
                    @error="$event.target.style.display = 'none'; $event.target.closest('.weapon-up-chip')?.classList.add('is-fallback')"
                  />
                  <span class="weapon-up-chip-fallback">{{ t("up_badge_text") }}</span>
                </div>
                <div v-if="getSelectorHiddenReason(weapon)" class="weapon-hidden-chip">
                  {{ t("nav.hidden") }}
                </div>
              </div>
              <div class="weapon-name">
                <div class="weapon-title">{{ tTerm("weapon", weapon.name) }}</div>
              </div>
            </div>
            <div
              v-if="weaponGridBottomSpacer > 0"
              class="virtual-spacer"
              :style="{ height: \`\${weaponGridBottomSpacer}px\`, gridColumn: '1 / -1' }"
            ></div>
          </div>

          <div v-else class="weapon-attr-list">
          <div
            v-if="tutorialActive && (tutorialStepKey === 'essence-owned' || tutorialStepKey === 'note')"
            class="scheme-weapon-item weapon-attr-item tutorial-weapon-item"
            ref="tutorialWeaponTarget"
          >
              <div class="scheme-weapon-title">
                <div class="weapon-mini" :style="rarityBadgeStyle(tutorialWeapon.rarity, false)">
                  <span class="weapon-fallback">{{ tutorialWeapon.rarity }}★</span>
                </div>
                <span v-if="weaponCharacters(tutorialWeapon).length" class="weapon-avatars">
                  <img
                    v-for="(character, index) in weaponCharacters(tutorialWeapon)"
                    :key="\`\${tutorialWeapon.name}-character-\${index}\`"
                    class="weapon-avatar"
                    v-lazy-src="characterImageSrc(character)"
                    :alt="tTerm('character', character)"
                    loading="lazy"
                    decoding="async"
                    @error="handleCharacterImageError"
                  />
                </span>
                <span class="weapon-name-block">
                  <span class="weapon-main-name">{{ tutorialWeapon.name }}</span>
                  <span class="weapon-type-subtitle">{{ tTerm("type", tutorialWeapon.type) }}</span>
                </span>
                <span class="rarity" :style="rarityTextStyle(tutorialWeapon.rarity)">
                  {{ tutorialWeapon.rarity }}★
                </span>
                <span class="badge tutorial-badge">{{ t("nav.tutorial") }}</span>
                <span class="badge muted" v-if="tutorialEssenceOwned">{{ t("nav.essence_owned") }}</span>
                <span v-if="tutorialWeapon.short" class="weapon-short">
                  {{ tTerm("short", tutorialWeapon.short) }}
                </span>
              </div>
              <div class="scheme-weapon-attrs">
                <span class="attr-value">{{ formatS1(tutorialWeapon.s1) }}</span>
                <span class="attr-value">{{ t(tutorialWeapon.s2) }}</span>
                <span class="attr-value">{{ t(tutorialWeapon.s3) }}</span>
              </div>
              <div class="weapon-exclude-row" @click.stop>
                <button
                  class="exclude-toggle small"
                  :class="{
                    active: tutorialEssenceOwned,
                    'intent-alert': !tutorialEssenceOwned,
                    'tutorial-highlight': tutorialStepKey === 'essence-owned'
                  }"
                  @click.stop="toggleTutorialEssenceOwned"
                >
                  {{ tutorialEssenceOwned ? t("button.mark_essence_not_owned") : t("button.mark_essence_owned") }}
                </button>
                <textarea
                  class="exclude-note-input"
                  :class="{
                    'is-essence-owned': tutorialEssenceOwned,
                    'tutorial-highlight': tutorialStepKey === 'note'
                  }"
                  rows="1"
                  maxlength="30"
                  :placeholder="t('warning.note_optional')"
                  :value="tutorialNote"
                  @focus="markTutorialNoteTouched(); resizeNoteTextarea($event)"
                  @input="resizeNoteTextarea($event); updateTutorialNote($event.target.value)"
                ></textarea>
              </div>
            </div>
            <div class="weapon-attr-anchor"></div>
            <div
              v-if="weaponGridTopSpacer > 0"
              class="virtual-spacer"
              :style="{ height: \`\${weaponGridTopSpacer}px\` }"
            ></div>
            <div
              v-for="weapon in visibleFilteredWeapons"
              :key="weapon.name"
              class="scheme-weapon-item weapon-attr-item"
              v-memo="[
                locale,
                localeRenderVersion,
                selectedNameSet.has(weapon.name),
                isWeaponOwned(weapon.name),
                isEssenceOwned(weapon.name),
                filterS1.includes(weapon.s1),
                filterS2.includes(weapon.s2),
                filterS3.includes(weapon.s3),
                getWeaponNote(weapon.name),
                selectorHiddenMemoKey,
              ]"
              :class="{
                'is-selected': selectedNameSet.has(weapon.name),
                'is-unowned': isUnowned(weapon.name),
                'is-essence-owned': isEssenceOwned(weapon.name),
              }"
              @click="toggleWeapon(weapon, 'attrs')"
            >
              <div class="scheme-weapon-title">
                <div
                  class="weapon-mini"
                  :style="rarityBadgeStyle(weapon.rarity, hasImage(weapon))"
                >
                  <img
                    v-if="hasImage(weapon)"
                    v-lazy-src="weaponImageSrc(weapon)"
                    :alt="weapon.name"
                    loading="lazy"
                    decoding="async"
                  />
                  <span v-else class="weapon-fallback">{{ weapon.rarity }}★</span>
                </div>
                <span v-if="weaponCharacters(weapon).length" class="weapon-avatars">
                  <img
                    v-for="(character, index) in weaponCharacters(weapon)"
                    :key="\`\${weapon.name}-character-\${index}\`"
                    class="weapon-avatar"
                    v-lazy-src="characterImageSrc(character)"
                    :alt="tTerm('character', character)"
                    loading="lazy"
                    decoding="async"
                    @error="handleCharacterImageError"
                  />
                </span>
                <span class="weapon-name-block">
                  <span class="weapon-main-name">{{ tTerm("weapon", weapon.name) }}</span>
                  <span class="weapon-type-subtitle">{{ tTerm("type", weapon.type) }}</span>
                </span>
                <span class="rarity" :style="rarityTextStyle(weapon.rarity)">
                  {{ weapon.rarity }}★
                </span>
                <span class="badge" v-if="selectedNameSet.has(weapon.name)">{{ t("nav.selected") }}</span>
                <span class="badge muted" v-if="isUnowned(weapon.name)">{{ t("nav.not_owned") }}</span>
                <span class="badge muted" v-if="isEssenceOwned(weapon.name)">{{ t("nav.essence_owned") }}</span>
                <span v-if="getSelectorHiddenReason(weapon)" class="badge warn weapon-hidden-note">
                  {{ getSelectorHiddenReason(weapon) }}
                </span>
                <span v-if="weapon.short" class="weapon-short">
                  {{ tTerm("short", weapon.short) }}
                </span>
              </div>
              <div class="scheme-weapon-attrs">
                <span
                  class="attr-value"
                  :class="{ 'base-lock': filterS1.length && filterS1.includes(weapon.s1) }"
                >
                  {{ formatS1(weapon.s1) }}
                </span>
                <span
                  class="attr-value"
                  :class="{ locked: filterS2.length && filterS2.includes(weapon.s2) }"
                >
                  {{ tTerm("s2", weapon.s2) }}
                </span>
                <span
                  class="attr-value"
                  :class="{ locked: filterS3.length && filterS3.includes(weapon.s3) }"
                >
                  {{ tTerm("s3", weapon.s3) }}
                </span>
              </div>
              <div class="weapon-exclude-row" @click.stop>
                <button
                  class="exclude-toggle small"
                  :class="{ active: isWeaponOwned(weapon.name), 'intent-alert': !isWeaponOwned(weapon.name) }"
                  @click.stop="toggleWeaponOwned(weapon)"
                >
                  {{ isWeaponOwned(weapon.name) ? t("button.mark_weapon_not_owned") : t("button.mark_weapon_owned") }}
                </button>
                <button
                  class="exclude-toggle small"
                  :class="{ active: isEssenceOwned(weapon.name), 'intent-alert': !isEssenceOwned(weapon.name) }"
                  @click.stop="toggleEssenceOwned(weapon)"
                >
                  {{ isEssenceOwned(weapon.name) ? t("button.mark_essence_not_owned") : t("button.mark_essence_owned") }}
                </button>
                <textarea
                  class="exclude-note-input"
                  :class="{ 'is-essence-owned': isEssenceOwned(weapon.name), 'is-unowned': isUnowned(weapon.name) }"
                  rows="1"
                  maxlength="30"
                  :placeholder="t('warning.note_optional')"
                  :value="getWeaponNote(weapon.name)"
                  @focus="resizeNoteTextarea($event)"
                  @input="resizeNoteTextarea($event); updateWeaponNote(weapon, $event.target.value)"
                ></textarea>
              </div>
            </div>
            <div
              v-if="weaponGridBottomSpacer > 0"
              class="virtual-spacer"
              :style="{ height: \`\${weaponGridBottomSpacer}px\` }"
            ></div>
          </div>
        </section>

        <section class="panel" :class="{ 'panel-hidden': mobilePanel !== 'plans' }">
          <div class="panel-title">
            <h2>{{ t("nav.plan_recommendations") }}</h2>
            <div class="panel-actions">
              <plan-config-control
                :t="t"
                :t-term="tTerm"
                :recommendation-config="recommendationConfig"
                :show-plan-config="showPlanConfig"
                :show-plan-config-hint-dot="showPlanConfigHintDot"
                :region-options="regionOptions"
                :t-region-priority-mode-options="tRegionPriorityModeOptions"
                :t-ownership-priority-mode-options="tOwnershipPriorityModeOptions"
                :t-strict-priority-order-options="tStrictPriorityOrderOptions"
                @toggle="togglePlanConfig"
              ></plan-config-control>
              <div class="pill">{{ t("nav.selected") }} {{ selectedCount }} / {{ t("nav.pending") }} {{ pendingCount }} {{ t("nav.weapons_2") }}</div>
              <button
                v-if="extraRecommendations.length"
                class="ghost-button"
                @click="showAllSchemes = !showAllSchemes"
              >
                {{
                  showAllSchemes
                    ? t("button.collapse_other_plans")
                    : t("button.show_other_plans_count", { count: extraRecommendations.length })
                }}
              </button>
            </div>
          </div>

          <div v-if="!selectedCount" class="empty">
            {{ t("nav.select_at_least_one_weapon_and_the_system_will_recommend") }}
          </div>

          <div v-else-if="recommendationEmptyReason === 'filteredOut'" class="empty">
            {{ t("nav.item") }}
          </div>

          <div v-else-if="recommendationEmptyReason === 'noScheme'" class="recommendations">
            <div class="card">
              <div class="card-header">
                <div>
                  <div class="card-title">
                    {{
                      recommendationDataIssue && recommendationDataIssue.kind === "dataIntegrityMissingAttr"
                        ? t("error.no_available_plan_for_data_integrity")
                        : t("error.no_available_plan_for_current_selection")
                    }}
                  </div>
                  <div class="hint">{{ t("nav.extra_skill_attributes_cannot_be_unified_or_no_dungeon_p") }}</div>
                  <div class="hint" v-if="recommendationDataIssue && recommendationDataIssue.weaponNames && recommendationDataIssue.weaponNames.length">
                    {{
                      t(
                        recommendationDataIssue.kind === "dataIntegrityMissingAttr"
                          ? "error.recommendation_data_integrity_issue_weapons"
                          : "error.recommendation_data_issue_weapons",
                        {
                          weapons: recommendationDataIssue.weaponNames.map((name) => tTerm("weapon", name)).join(" / "),
                        }
                      )
                    }}
                  </div>
                </div>
              </div>
              <div class="about-actions">
                <button
                  v-if="recommendationDataIssue && recommendationDataIssue.kind === 'previewMissingAttr'"
                  class="about-button"
                  @click="openWeaponAttrDataModal"
                >
                  {{ t("button.manage_weapon_attribute_data") }}
                </button>
                <button
                  v-else-if="recommendationDataIssue && recommendationDataIssue.kind === 'dataIntegrityMissingAttr'"
                  class="about-button"
                  @click="openWeaponDataIntegrityDetails"
                >
                  {{ t("button.view_data_exception_details") }}
                </button>
              </div>

              <div class="lock-summary" v-if="fallbackPlan">
                <div class="lock-title">{{ t("nav.locked_plan_conflicts_only") }}</div>
                <div class="lock-items">
                  <span class="lock-chip" :class="{ warn: fallbackPlan.baseOverflow }">
                    {{ fallbackPlan.baseOverflow ? t("nav.base_attribute_conflict") : t("nav.base_attributes") }}：
                    {{
                      (fallbackPlan.baseOverflow ? fallbackPlan.baseAllLabels : fallbackPlan.basePickLabels).join(
                        " / "
                      )
                    }}
                  </span>
                  <span class="lock-chip warn" v-if="fallbackPlan.s2Conflict">
                    {{ t("nav.extra_attribute_conflict_cannot_unify") }}
                  </span>
                  <span class="lock-chip warn" v-if="fallbackPlan.s3Conflict">
                    {{ t("nav.skill_attribute_conflict_cannot_unify") }}
                  </span>
                </div>
              </div>

              <div v-if="fallbackPlan" class="hint">{{ t("nav.selected_weapons_conflicts_in_red") }}</div>
              <div v-if="fallbackPlan" class="scheme-weapon-list">
                <div
                  v-for="weapon in fallbackPlan.weaponRows"
                  :key="weapon.name"
                  class="scheme-weapon-item is-selected"
                  v-memo="[
                    locale,
                    localeRenderVersion,
                    weapon.baseLocked,
                    weapon.baseConflict,
                    fallbackPlan.s2Conflict,
                    fallbackPlan.s3Conflict,
                    isWeaponOwned(weapon.name),
                    isUnowned(weapon.name),
                    isEssenceOwned(weapon.name),
                    getWeaponNote(weapon.name),
                  ]"
                >
                  <div class="scheme-weapon-title">
                    <span v-if="weaponCharacters(weapon).length" class="weapon-avatars">
                      <img
                        v-for="(character, index) in weaponCharacters(weapon)"
                        :key="\`\${weapon.name}-fallback-character-\${index}\`"
                        class="weapon-avatar"
                        v-lazy-src="characterImageSrc(character)"
                        :alt="tTerm('character', character)"
                        loading="lazy"
                        decoding="async"
                        @error="handleCharacterImageError"
                      />
                    </span>
                    <span class="weapon-name-block">
                      <span class="weapon-main-name">{{ tTerm("weapon", weapon.name) }}</span>
                      <span class="weapon-type-subtitle">{{ tTerm("type", weapon.type) }}</span>
                    </span>
                    <span class="rarity" :style="rarityTextStyle(weapon.rarity)">
                      {{ weapon.rarity }}★
                    </span>
                    <span class="badge">{{ t("nav.selected") }}</span>
                    <span v-if="weapon.short" class="weapon-short">
                      {{ tTerm("short", weapon.short) }}
                    </span>
                  </div>
                  <div class="scheme-weapon-attrs">
                    <span
                      class="attr-value"
                      :class="{
                        'base-lock': weapon.baseLocked,
                        conflict: weapon.baseConflict,
                      }"
                    >
                      <span class="attr-label">{{ t("nav.base_attributes") }}：</span>{{ formatS1(weapon.s1) }}
                    </span>
                    <span class="attr-value" :class="{ conflict: fallbackPlan.s2Conflict }">
                      <span class="attr-label">{{ t("nav.extra_attributes") }}：</span>{{ tTerm("s2", weapon.s2) }}
                    </span>
                    <span class="attr-value" :class="{ conflict: fallbackPlan.s3Conflict }">
                      <span class="attr-label">{{ t("nav.skill_attributes") }}：</span>{{ tTerm("s3", weapon.s3) }}
                    </span>
                  </div>
                  <div class="weapon-exclude-row" @click.stop>
                    <button
                      class="exclude-toggle small"
                      :class="{ active: isWeaponOwned(weapon.name), 'intent-alert': !isWeaponOwned(weapon.name) }"
                      @click.stop="toggleWeaponOwned(weapon)"
                    >
                      {{ isWeaponOwned(weapon.name) ? t("button.mark_weapon_not_owned") : t("button.mark_weapon_owned") }}
                    </button>
                    <button
                      class="exclude-toggle small"
                      :class="{ active: isEssenceOwned(weapon.name), 'intent-alert': !isEssenceOwned(weapon.name) }"
                      @click.stop="toggleEssenceOwned(weapon)"
                    >
                      {{ isEssenceOwned(weapon.name) ? t("button.mark_essence_not_owned") : t("button.mark_essence_owned") }}
                    </button>
                    <textarea
                      class="exclude-note-input"
                      :class="{ 'is-essence-owned': isEssenceOwned(weapon.name), 'is-unowned': isUnowned(weapon.name) }"
                      rows="1"
                      maxlength="30"
                      :placeholder="t('warning.note_optional')"
                      :value="getWeaponNote(weapon.name)"
                      @focus="resizeNoteTextarea($event)"
                      @input="resizeNoteTextarea($event); updateWeaponNote(weapon, $event.target.value)"
                    ></textarea>
                  </div>
`);
})();
