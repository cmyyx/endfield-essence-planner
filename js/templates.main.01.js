(function () {
  window.__APP_TEMPLATE_MAIN_PARTS = window.__APP_TEMPLATE_MAIN_PARTS || [];
  window.__APP_TEMPLATE_MAIN_PARTS.push(`
<header class="hero">
        <div class="hero-title">
          <h1>{{ t("终末地基质规划器") }}</h1>
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
            <label class="theme-label" for="theme-mode-select">{{ t("主题") }}</label>
            <select
              id="theme-mode-select"
              class="theme-select"
              :value="themePreference"
              @change="setThemeMode($event.target.value)"
            >
              <option value="auto">{{ t("自动") }}</option>
              <option value="light">{{ t("日间") }}</option>
              <option value="dark">{{ t("夜间") }}</option>
            </select>
          </div>
          <button class="about-button notice-button" @click="openNotice">{{ t("公告") }}</button>
          <button class="about-button" @click="openChangelog">{{ t("更新日志") }}</button>
          <button class="about-button" @click="openAbout">{{ t("关于") }}</button>
          <div class="secondary-menu">
            <button class="about-button menu-toggle" @click="showSecondaryMenu = !showSecondaryMenu">
              {{ t("更多设置") }}
            </button>
            <div v-if="showSecondaryMenu" class="secondary-panel">
              <div class="secondary-item">
                <div class="secondary-label">{{ t("性能模式") }}</div>
                <select class="secondary-select" :value="perfPreference" @change="setPerfMode($event.target.value)">
                  <option value="auto">{{ t("自动") }}</option>
                  <option value="standard">{{ t("标准") }}</option>
                  <option value="low">{{ t("低GPU") }}</option>
                </select>
                <div v-if="perfPreference === 'auto'" class="secondary-hint">
                  {{ t("当前自动：") }}{{ lowGpuEnabled ? t("低GPU") : t("标准") }}
                </div>
              </div>
              <div class="secondary-item secondary-desc">
                {{ t("自动模式会根据渲染性能临时切换低GPU模式。") }}
              </div>
              <div class="secondary-item">
                <div class="secondary-label">{{ t("背景显示") }}</div>
                <button
                  class="ghost-button toggle-button switch-toggle"
                  :class="{ 'is-active': backgroundDisplayEnabled }"
                  role="switch"
                  :aria-checked="backgroundDisplayEnabled ? 'true' : 'false'"
                  :disabled="lowGpuEnabled"
                  @click="toggleBackgroundDisplayEnabled"
                >
                  <span class="switch-label">{{ backgroundDisplayEnabled ? t("已开启") : t("已关闭") }}</span>
                  <span class="switch-track" :class="{ on: backgroundDisplayEnabled }">
                    <span class="switch-thumb"></span>
                  </span>
                </button>
                <div class="secondary-hint">
                  {{
                    lowGpuEnabled
                      ? t("低GPU模式下背景固定关闭，此开关仅在标准模式生效。")
                      : t("关闭后仅显示纯色背景。")
                  }}
                </div>
              </div>
              <div class="secondary-item">
                <div class="secondary-label">{{ t("背景图片") }}</div>
                <div class="secondary-actions">
                  <label class="ghost-button secondary-upload">
                    {{ t("导入图片") }}
                    <input type="file" accept="image/*" @change="handleBackgroundFile" />
                  </label>
                  <button
                    class="ghost-button"
                    @click="clearCustomBackground"
                    :disabled="!customBackground && !customBackgroundApi"
                  >
                    {{ t("恢复默认") }}
                  </button>
                </div>
                <div v-if="customBackgroundName" class="secondary-hint secondary-file">
                  {{ t("当前：") }}{{ customBackgroundName }}
                </div>
                <div v-else class="secondary-hint">{{ t("未导入时使用随机背景") }}</div>
                <input
                  class="secondary-input"
                  type="text"
                  v-model.trim.lazy="customBackgroundApi"
                  :placeholder="t('自定义图片API（返回图片）')"
                />
                <div v-if="customBackgroundApi" class="secondary-hint secondary-file">
                  {{ t("API：") }}{{ customBackgroundApi }}
                </div>
                <div v-else class="secondary-hint">{{ t("未设置API时使用随机背景") }}</div>
                <div v-if="customBackground" class="secondary-hint">
                  {{ t("已导入本地图片，将优先使用本地背景。") }}
                </div>
                <div v-if="customBackgroundError" class="secondary-hint secondary-warning">
                  {{ customBackgroundError }}
                </div>
              </div>
              <div class="secondary-item">
                <div class="secondary-label">{{ t("新手教程") }}</div>
                <button class="ghost-button" @click="startTutorial(true)">{{ t("再次体验") }}</button>
              </div>
              <div class="secondary-item secondary-desc">
                <label class="notice-skip">
                  <input type="checkbox" v-model="tutorialSkipAll" />
                  {{ t("不再自动弹出当前版本新手教程") }}
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="hero-nav-stack">
          <div v-if="canShowAds && isAdPortrait" class="slot-hero-shell" :aria-label="t('广告位（移动端）')">
            <div class="slot-ad-tip">{{ t("广告位") }}</div>
            <button
              class="slot-close-button"
              type="button"
              :title="t('关闭广告')"
              :aria-label="t('关闭广告')"
              @click.stop="dismissAdsForSession"
            >
              &times;
            </button>
            <div v-if="adPreviewMode" class="slot-preview-banner">
              {{ t("广告预览模式（本地）") }}
            </div>
            <div
              v-else
              class="adwork-net adwork-auto slot-provider-net slot-provider-auto"
              data-id="1050"
              data-placeholder="none"
            ></div>
          </div>
          <nav class="main-nav hero-nav" :aria-label="t('主导航')">
          <button 
            class="nav-item" 
            :class="{ active: currentView === 'planner' }" 
            @click="setView('planner')"
          >
            {{ t("基质规划") }}
          </button>
          <button 
            class="nav-item" 
            :class="{ active: currentView === 'strategy' }" 
            @click="setView('strategy')"
          >
            {{ t("角色攻略") }}
          </button>
          <button 
            class="nav-item" 
            :class="{ active: currentView === 'match' }" 
            @click="setView('match')"
          >
            {{ t("词条对照") }}
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
            ></span>
            {{ t("装备精锻") }}
          </button>
          </nav>
        </div>
      </header>
      <div v-if="showAiNotice" class="ai-notice">
        <span class="ai-chip">{{ t("AI") }}</span>
        <span>{{ t("当前语言内容由 AI 翻译，可能存在不准确。如发现错误，请前往 GitHub 反馈。") }}</span>
      </div>
      <div v-if="lowGpuEnabled" class="perf-status">
        <div class="perf-status-text">
          {{ t("低GPU模式已开启") }}{{ perfPreference === "auto" ? t("（自动）") : t("（手动）") }}
        </div>
        <button class="ghost-button" @click.stop="showSecondaryMenu = true">
          {{ t("更多设置") }}
        </button>
      </div>
      <div v-if="showPerfNotice" class="perf-notice">
        <div class="perf-notice-text">
          {{ t("检测到当前渲染性能较低，已自动切换到低GPU模式以提升滚动流畅度（可在“更多设置”调整）。") }}
        </div>
        <div class="perf-notice-actions">
          <button class="ghost-button" @click="setPerfMode('standard')">{{ t("恢复效果") }}</button>
          <button class="about-button perf-keep" @click="setPerfMode('low')">{{ t("保持低GPU") }}</button>
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
            {{ t("武器选择") }} <span class="count">{{ selectedNames.length }}</span>
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
            {{ t("方案推荐") }} <span class="count">{{ recommendations.length }}</span>
          </button>
        </div>
        <div class="mobile-hint">
          <span>{{ t("手机端可通过上方标签切换“武器选择 / 方案推荐”，并可下滑继续浏览列表。") }}</span>
        </div>
        <section class="panel" :class="{ 'panel-hidden': mobilePanel !== 'weapons' }">
          <div class="panel-title">
            <h2>{{ t("武器选择器") }}</h2>
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
            <input v-model="searchQuery" :placeholder="t('搜索武器 / 属性 / 角色（仅中文支持拼音/首字母）...')" />
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
                {{ showWeaponAttrs ? t("隐藏属性/拥有/备注") : t("显示属性/拥有/备注") }}
              </button>
              <button class="ghost-button" @click="toggleFilterPanel">
                {{ showFilterPanel ? t("折叠属性筛选") : t("展开属性筛选") }}
              </button>
            </div>
            <button
              class="ghost-button filter-toolbar-clear"
              :disabled="!hasAttributeFilters"
              @click="clearAttributeFilters"
            >
              {{ t("清空属性筛选") }}
            </button>
          </div>
          <transition name="fade-scale">
            <div v-if="showAttrHint" class="attr-hint">
              <span class="attr-hint-text">
                {{
                  t("提示：点击“{label}”按钮，可切换显示属性与拥有状态功能。", {
                    label: t("显示属性/拥有/备注")
                  })
                }}
              </span>
              <button class="ghost-button attr-hint-dismiss" @click="dismissAttrHint">
                {{ t("知道了") }}
              </button>
            </div>
          </transition>
          <div class="filter-panel" :class="{ 'is-collapsed': !showFilterPanel }">
            <div class="filter-group">
              <div class="filter-title">{{ t("基础属性") }}</div>
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
              <div class="filter-title">{{ t("附加属性") }}</div>
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
              <div class="filter-title">{{ t("技能属性") }}</div>
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
              <div class="filter-hint">{{ t("灰色属性代表当前筛选下暂无武器") }}</div>
            </div>
          </div>

          <div class="tag-row">
            <div class="tag-list">
              <span v-if="!selectedNames.length" class="tag tag-empty">{{ t("未选择任何武器") }}</span>
              <span
                v-for="weapon in selectedWeaponRows"
                :key="weapon.name"
                class="tag"
                :class="{ 'is-unowned': weapon.isUnowned, 'is-essence-owned': weapon.isEssenceOwned }"
                :title="weapon.note ? \`\${t('备注：')}\${weapon.note}\` : ''"
              >
                <span class="tag-name">{{ tTerm("weapon", weapon.name) }}</span>
                <span v-if="weapon.isUnowned" class="tag-note is-unowned">{{ t("未拥有") }}</span>
                <span v-if="weapon.isEssenceOwned" class="tag-note is-essence-owned">{{ t("基质已有") }}</span>
                <button @click.stop="toggleWeapon(weapon, 'tag')">✕</button>
              </span>
            </div>
            <div class="tag-actions">
              <button
                class="ghost-button tag-select"
                @click="selectAllWeapons"
                :disabled="!filteredWeapons.length || allFilteredSelected"
              >
                {{ t("全选武器") }}
              </button>
              <button class="ghost-button tag-clear" @click="clearSelection" :disabled="!selectedNames.length">
                {{ t("清空已选武器") }}
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
              v-memo="[locale, localeRenderVersion, selectedNameSet.has(weapon.name), isWeaponOwned(weapon.name), isEssenceOwned(weapon.name), selectorHiddenMemoKey]"
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
              <div v-if="getSelectorHiddenReason(weapon)" class="weapon-hidden-chip">
                {{ t("被隐藏") }}
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
                <span class="badge tutorial-badge">{{ t("教学示例") }}</span>
                <span class="badge muted" v-if="tutorialEssenceOwned">{{ t("基质已有") }}</span>
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
                  {{ tutorialEssenceOwned ? t("标记基质未有") : t("标记基质已有") }}
                </button>
                <textarea
                  class="exclude-note-input"
                  :class="{
                    'is-essence-owned': tutorialEssenceOwned,
                    'tutorial-highlight': tutorialStepKey === 'note'
                  }"
                  rows="1"
                  maxlength="30"
                  :placeholder="t('备注（可选）')"
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
                <span class="badge" v-if="selectedNameSet.has(weapon.name)">{{ t("已选") }}</span>
                <span class="badge muted" v-if="isUnowned(weapon.name)">{{ t("未拥有") }}</span>
                <span class="badge muted" v-if="isEssenceOwned(weapon.name)">{{ t("基质已有") }}</span>
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
                  {{ isWeaponOwned(weapon.name) ? t("标记武器未有") : t("标记武器拥有") }}
                </button>
                <button
                  class="exclude-toggle small"
                  :class="{ active: isEssenceOwned(weapon.name), 'intent-alert': !isEssenceOwned(weapon.name) }"
                  @click.stop="toggleEssenceOwned(weapon)"
                >
                  {{ isEssenceOwned(weapon.name) ? t("标记基质未有") : t("标记基质已有") }}
                </button>
                <textarea
                  class="exclude-note-input"
                  :class="{ 'is-essence-owned': isEssenceOwned(weapon.name), 'is-unowned': isUnowned(weapon.name) }"
                  rows="1"
                  maxlength="30"
                  :placeholder="t('备注（可选）')"
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
            <h2>{{ t("方案推荐列表") }}</h2>
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
              <div class="pill">{{ t("已选") }} {{ selectedCount }} / {{ t("待刷") }} {{ pendingCount }} {{ t("把") }}</div>
              <button
                v-if="extraRecommendations.length"
                class="ghost-button"
                @click="showAllSchemes = !showAllSchemes"
              >
                {{
                  showAllSchemes
                    ? t("收起其他方案")
                    : t("展开其他方案（{count}）", { count: extraRecommendations.length })
                }}
              </button>
            </div>
          </div>

          <div v-if="canShowAds && !isAdPortrait" class="card slot-inline-card slot-inline-top" :aria-label="t('广告位（桌面端）')">
            <div class="slot-ad-tip">{{ t("广告位") }}</div>
            <button
              class="slot-close-button"
              type="button"
              :title="t('关闭广告')"
              :aria-label="t('关闭广告')"
              @click.stop="dismissAdsForSession"
            >
              &times;
            </button>
            <div v-if="adPreviewMode" class="slot-preview-banner">
              {{ t("广告预览模式（本地）") }}
            </div>
            <div
              v-else
              class="adwork-net adwork-auto slot-provider-net slot-provider-auto"
              data-id="1050"
              data-placeholder="none"
            ></div>
          </div>

          <div v-if="!selectedCount" class="empty">
            {{ t("请选择至少一把武器，系统将自动推荐可共刷的副本方案。") }}
          </div>

          <div v-else-if="recommendationEmptyReason === 'filteredOut'" class="empty">
            {{ t("当前筛选已隐藏全部结果，请调整筛选开关。") }}
          </div>

          <div v-else-if="recommendationEmptyReason === 'noScheme'" class="recommendations">
            <div class="card">
              <div class="card-header">
                <div>
                  <div class="card-title">{{ t("当前组合无可用方案") }}</div>
                  <div class="hint">{{ t("附加/技能属性无法统一锁定，或副本池不覆盖所需词条。") }}</div>
                </div>
              </div>

              <div class="lock-summary" v-if="fallbackPlan">
                <div class="lock-title">{{ t("锁定方案（仅显示冲突提示）") }}</div>
                <div class="lock-items">
                  <span class="lock-chip" :class="{ warn: fallbackPlan.baseOverflow }">
                    {{ fallbackPlan.baseOverflow ? t("基础属性冲突") : t("基础属性") }}：
                    {{
                      (fallbackPlan.baseOverflow ? fallbackPlan.baseAllLabels : fallbackPlan.basePickLabels).join(
                        " / "
                      )
                    }}
                  </span>
                  <span class="lock-chip warn" v-if="fallbackPlan.s2Conflict">
                    {{ t("附加属性冲突（无法统一锁定）") }}
                  </span>
                  <span class="lock-chip warn" v-if="fallbackPlan.s3Conflict">
                    {{ t("技能属性冲突（无法统一锁定）") }}
                  </span>
                </div>
              </div>

              <div v-if="fallbackPlan" class="hint">{{ t("已选武器（冲突项标红）") }}</div>
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
                    <span class="badge">{{ t("已选") }}</span>
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
                      <span class="attr-label">{{ t("基础属性") }}：</span>{{ formatS1(weapon.s1) }}
                    </span>
                    <span class="attr-value" :class="{ conflict: fallbackPlan.s2Conflict }">
                      <span class="attr-label">{{ t("附加属性") }}：</span>{{ tTerm("s2", weapon.s2) }}
                    </span>
                    <span class="attr-value" :class="{ conflict: fallbackPlan.s3Conflict }">
                      <span class="attr-label">{{ t("技能属性") }}：</span>{{ tTerm("s3", weapon.s3) }}
                    </span>
                  </div>
                  <div class="weapon-exclude-row" @click.stop>
                    <button
                      class="exclude-toggle small"
                      :class="{ active: isWeaponOwned(weapon.name), 'intent-alert': !isWeaponOwned(weapon.name) }"
                      @click.stop="toggleWeaponOwned(weapon)"
                    >
                      {{ isWeaponOwned(weapon.name) ? t("标记武器未有") : t("标记武器拥有") }}
                    </button>
                    <button
                      class="exclude-toggle small"
                      :class="{ active: isEssenceOwned(weapon.name), 'intent-alert': !isEssenceOwned(weapon.name) }"
                      @click.stop="toggleEssenceOwned(weapon)"
                    >
                      {{ isEssenceOwned(weapon.name) ? t("标记基质未有") : t("标记基质已有") }}
                    </button>
                    <textarea
                      class="exclude-note-input"
                      :class="{ 'is-essence-owned': isEssenceOwned(weapon.name), 'is-unowned': isUnowned(weapon.name) }"
                      rows="1"
                      maxlength="30"
                      :placeholder="t('备注（可选）')"
                      :value="getWeaponNote(weapon.name)"
                      @focus="resizeNoteTextarea($event)"
                      @input="resizeNoteTextarea($event); updateWeaponNote(weapon, $event.target.value)"
                    ></textarea>
                  </div>
`);
})();
