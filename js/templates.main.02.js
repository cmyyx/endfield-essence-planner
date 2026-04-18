(function () {
  window.__APP_TEMPLATE_MAIN_PARTS = window.__APP_TEMPLATE_MAIN_PARTS || [];
  window.__APP_TEMPLATE_MAIN_PARTS.push(`
                </div>
              </div>
              <div v-else class="empty">
                {{ t("error.no_available_plan_for_current_selection") }}
              </div>
            </div>
          </div>

          <div v-else class="recommendations">
            <div v-if="coverageSummary && coverageSummary.hasGap" class="card">
              <div class="card-header">
                <div>
                  <div class="card-title">
                    {{
                      coverageSummary.cause === "regionFilter"
                        ? t("plan.region_filter_uncovered_weapons_title")
                        : t("plan.uncovered_weapons_title")
                    }}
                  </div>
                  <div class="hint">
                    {{
                      coverageSummary.cause === "regionFilter"
                        ? t("guide.current_region_filter_excludes_some_selected_weapons")
                        : t("guide.current_plans_do_not_cover_all_selected_weapons")
                    }}
                  </div>
                  <div class="missing-tags">
                    <span
                      v-for="name in coverageSummary.missingNames"
                      :key="'coverage-missing-' + name"
                      class="missing-tag"
                    >
                      {{ tTerm("weapon", name) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="scheme-list-anchor"></div>
            <div
              v-if="recommendationTopSpacer > 0"
              class="virtual-spacer"
              :style="{ height: \`\${recommendationTopSpacer}px\` }"
            ></div>
            <template v-for="(card, index) in visibleDisplayRecommendations" :key="card.schemeKey">
              <div v-if="index + recommendationVirtualStartIndex === displayDividerIndex" class="scheme-divider">
                <span>{{ t("plan.other_plans") }}</span>
              </div>
              <div
                class="card scheme-card"
                :class="{
                  'tutorial-scheme-highlight':
                    tutorialActive &&
                    tutorialStepKey === 'base-pick' &&
                    tutorialTargetSchemeKey &&
                    card.schemeKey === tutorialTargetSchemeKey,
                }"
                :ref="
                  tutorialActive &&
                  tutorialStepKey === 'base-pick' &&
                  tutorialTargetSchemeKey &&
                  card.schemeKey === tutorialTargetSchemeKey
                    ? 'tutorialSchemeTarget'
                    : null
                "
              >
              <div class="card-header">
                <div class="card-header-left">
                  <div class="card-title">{{ tTerm("dungeon", card.dungeon.name) }}</div>
                  <span class="coverage-badge" :class="{ 'is-full': card.displaySelectedMatchCount === card.targetCount }">
                    {{ card.displaySelectedMatchCount }}/{{ card.targetCount }}
                  </span>
                </div>
                <div class="card-stats">
                  <span class="stat-chip">
                    <span class="stat-chip-label">{{ t("plan.farmable") }}</span>
                    <span class="stat-chip-value">{{ card.displayWeaponCount }}</span>
                  </span>
                  <span class="stat-chip" v-if="card.maxWeaponCount !== card.displayWeaponCount">
                    <span class="stat-chip-label">{{ t("plan.max_farmable") }}</span>
                    <span class="stat-chip-value">{{ card.maxWeaponCount }}</span>
                  </span>
                  <span class="stat-chip stat-warn" v-if="card.displaySelectedMissingNames.length && !card.baseOverflow">
                    <span class="stat-chip-label">{{ t("plan.uncovered") }}</span>
                    <span class="stat-chip-value">{{ card.displaySelectedMissingNames.length }}</span>
                  </span>
                  <span class="stat-chip stat-danger" v-if="card.conflictSelected && card.conflictSelected.length">
                    <span class="stat-chip-label">{{ t("plan.conflicts") }}</span>
                    <span class="stat-chip-value">{{ card.conflictSelected.length }}</span>
                  </span>
                </div>
              </div>
              <div class="lock-summary">
                <div class="lock-items">
                  <span class="lock-kv">
                    <span class="lock-kv-label">{{ t("nav.base_attributes") }}</span>
                    <span class="lock-kv-values">
                      <span
                        v-for="(label, idx) in card.basePickLabels"
                        :key="'base-' + idx"
                        class="lock-tag"
                        :class="{ 'is-warn': card.manualPickNeeded || card.manualPickOverflow }"
                      >{{ label.type === "manual_pick" ? t("请手动选择") : label.type === "any_attribute" ? tTerm("misc", "任意属性") : formatS1(label.value) }}</span>
                    </span>
                  </span>
                  <span class="lock-kv">
                    <span class="lock-kv-label">{{ t(card.lockLabel) }}</span>
                    <span class="lock-kv-values">
                      <span class="lock-tag">{{ tTerm(card.lockType, card.lockValue) }}</span>
                    </span>
                  </span>
                </div>
                <div class="lock-hint" v-if="card.baseOverflow">
                  <template v-if="card.manualPickOverflow">
                    {{ t("guide.click_a_yellow_highlighted_weapon_below_to_drop_the_base", { count: card.manualPickOverflowCount }) }}
                  </template>
                  <template v-else-if="card.manualPickNeeded">
                    {{ t("guide.item", { count: card.manualPickNeeded }) }}
                  </template>
                  <template v-else>
                    {{ t("guide.click_weapons_to_select_deselect_base_attributes") }}
                  </template>
                </div>
              </div>
              <details
                v-if="card.displaySelectedMissingNames.length && !card.baseOverflow"
                class="missing-details"
                :open="card.targetCount > 1"
              >
                <summary>
                  {{ t("plan.item") }} {{ card.displaySelectedMissingNames.length }} {{ t("nav.weapons_2") }}（{{ t("nav.base_attributes") }}）
                </summary>
                <div class="missing-tags">
                  <span
                    v-for="name in card.displaySelectedMissingNames"
                    :key="name"
                    class="missing-tag"
                  >
                    {{ tTerm("weapon", name) }}
                  </span>
                </div>
              </details>

              <div v-if="card.conflictSelected && card.conflictSelected.length" class="conflict-section">
                <button class="ghost-button" @click="toggleConflictOpen(card.schemeKey)">
                  {{
                    isConflictOpen(card.schemeKey)
                      ? t("guide.click_to_collapse_conflicted_selected_weapons")
                      : t("guide.click_to_expand_conflicted_selected_weapons_count", { count: card.conflictSelected.length })
                  }}
                </button>
                <transition name="collapse">
                  <div
                    v-if="isConflictOpen(card.schemeKey)"
                    class="scheme-weapon-list conflict-list"
                  >
                    <div
                      v-for="weapon in card.conflictSelected"
                      :key="weapon.name"
                      class="scheme-weapon-item is-selected is-disabled"
                      v-memo="[
                        locale,
                        localeRenderVersion,
                        weapon.conflictS2,
                        weapon.conflictS3,
                        weapon.conflictReason,
                        weapon.isUnowned,
                        weapon.isEssenceOwnedReal,
                        weapon.note,
                        showWeaponOwnershipInPlans,
                      ]"
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
                            :key="\`\${weapon.name}-conflict-character-\${index}\`"
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
                        <span v-if="weapon.isCustom" class="badge custom-weapon-badge">
                          {{ t("badge.custom_weapon") }}
                        </span>
                        <span class="badge warn">{{ t("plan.conflict") }}</span>
                        <span v-if="weapon.short" class="weapon-short">
                          {{ tTerm("short", weapon.short) }}
                        </span>
                      </div>
                      <div class="scheme-weapon-attrs">
                        <span class="attr-value">
                          <span class="attr-label">{{ t("nav.base_attributes") }}：</span>{{ formatS1(weapon.s1) }}
                        </span>
                        <span class="attr-value" :class="{ conflict: weapon.conflictS2 }">
                          <span class="attr-label">{{ t("nav.extra_attributes") }}：</span>{{ tTerm("s2", weapon.s2) }}
                        </span>
                        <span class="attr-value" :class="{ conflict: weapon.conflictS3 }">
                          <span class="attr-label">{{ t("nav.skill_attributes") }}：</span>{{ tTerm("s3", weapon.s3) }}
                        </span>
                      </div>
                      <div class="conflict-reason">
                        {{ t("plan.conflict_reason_reason", { reason: weapon.conflictReason }) }}
                      </div>
                      <div v-if="showWeaponOwnershipInPlans" class="weapon-exclude-row" @click.stop>
                        <label class="exclude-checkbox-label">
                          <input
                            type="checkbox"
                            class="exclude-checkbox"
                            :checked="!weapon.isUnowned"
                            @change.stop="toggleWeaponOwned(weapon)"
                          />
                          <span>{{ t("label.weapon_owned") }}</span>
                        </label>
                        <label class="exclude-checkbox-label">
                          <input
                            type="checkbox"
                            class="exclude-checkbox"
                            :checked="weapon.isEssenceOwnedReal"
                            @change.stop="toggleEssenceOwned(weapon)"
                          />
                          <span>{{ t("label.essence_owned") }}</span>
                        </label>
                        <textarea
                          class="exclude-note-input"
                          :class="{ 'is-essence-owned': weapon.isEssenceOwnedReal, 'is-unowned': weapon.isUnowned }"
                          rows="1"
                          maxlength="30"
                          :placeholder="t('warning.note_optional')"
                          :value="getWeaponNote(weapon.name)"
                          @focus="resizeNoteTextarea($event)"
                          @input="resizeNoteTextarea($event); updateWeaponNote(weapon, $event.target.value)"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>

              <div class="scheme-weapon-list">
                <div
                  v-for="weapon in card.weaponRows"
                  :key="weapon.name"
                  class="scheme-weapon-item"
                  v-memo="[
                    locale,
                    localeRenderVersion,
                    weapon.isSelected,
                    weapon.isEssenceOwned,
                    weapon.isEssenceOwnedReal,
                    weapon.isUnowned,
                    weapon.baseDim,
                    weapon.baseConflict,
                    weapon.baseLocked,
                    weapon.note,
                    card.baseOverflow,
                    card.lockType,
                    tutorialActive,
                    tutorialStepKey,
                    tutorialTargetSchemeKey,
                    card.schemeKey,
                    isTutorialGuideWeapon(weapon.name),
                    showWeaponOwnershipInPlans,
                  ]"
                  :class="{
                    'is-selected': weapon.isSelected,
                    'base-selectable': card.baseOverflow,
                    'base-choice':
                      card.baseOverflow &&
                      ((card.manualPickOverflow && weapon.baseLocked) ||
                        (!card.manualPickOverflow && card.manualPickNeeded && !weapon.baseLocked)),
                    'is-dim': weapon.baseDim || weapon.isEssenceOwned,
                    'is-unowned': weapon.isUnowned,
                    'is-essence-owned': weapon.isEssenceOwned,
                    'tutorial-highlight':
                      tutorialActive &&
                      tutorialStepKey === 'base-pick' &&
                      tutorialTargetSchemeKey &&
                      card.schemeKey === tutorialTargetSchemeKey &&
                      isTutorialGuideWeapon(weapon.name),
                  }"
                  :title="card.baseOverflow ? t('label.click_to_choose_base_attributes') : ''"
                  @click="toggleSchemeBasePick(card, weapon)"
                >
                  <div class="scheme-weapon-title">
                    <div class="weapon-mini" :style="rarityBadgeStyle(weapon.rarity, hasImage(weapon))">
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
                        :key="\`\${weapon.name}-scheme-character-\${index}\`"
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
                    <span v-if="weapon.isCustom" class="badge custom-weapon-badge">
                      {{ t("badge.custom_weapon") }}
                    </span>
                    <span v-if="weapon.isSelected" class="badge">{{ t("nav.selected") }}</span>
                    <span v-if="weapon.isUnowned" class="badge muted">{{ t("nav.not_owned") }}</span>
                    <span v-if="weapon.isEssenceOwnedReal" class="badge muted">{{ t("nav.essence_owned") }}</span>
                    <span v-if="weapon.short" class="weapon-short">
                      {{ tTerm("short", weapon.short) }}
                    </span>
                  </div>
                  <div class="scheme-weapon-attrs">
                    <span
                      class="attr-value"
                      :class="{ 'base-lock': weapon.baseLocked, conflict: weapon.baseConflict }"
                    >
                      <span class="attr-label">{{ t("nav.base_attributes") }}：</span>{{ formatS1(weapon.s1) }}
                    </span>
                    <span class="attr-value" :class="{ locked: card.lockType === 's2' }">
                      <span class="attr-label">{{ t("nav.extra_attributes") }}：</span>{{ tTerm("s2", weapon.s2) }}
                    </span>
                    <span class="attr-value" :class="{ locked: card.lockType === 's3' }">
                      <span class="attr-label">{{ t("nav.skill_attributes") }}：</span>{{ tTerm("s3", weapon.s3) }}
                    </span>
                  </div>
                  <div v-if="showWeaponOwnershipInPlans" class="weapon-exclude-row" @click.stop>
                    <label class="exclude-checkbox-label">
                      <input
                        type="checkbox"
                        class="exclude-checkbox"
                        :checked="!weapon.isUnowned"
                        @change.stop="toggleWeaponOwned(weapon)"
                      />
                      <span>{{ t("label.weapon_owned") }}</span>
                    </label>
                    <label class="exclude-checkbox-label">
                      <input
                        type="checkbox"
                        class="exclude-checkbox"
                        :checked="weapon.isEssenceOwnedReal"
                        @change.stop="toggleEssenceOwned(weapon)"
                      />
                      <span>{{ t("label.essence_owned") }}</span>
                    </label>
                    <textarea
                      class="exclude-note-input"
                      :class="{ 'is-essence-owned': weapon.isEssenceOwnedReal, 'is-unowned': weapon.isUnowned }"
                      rows="1"
                      maxlength="30"
                      :placeholder="t('warning.note_optional')"
                      :value="getWeaponNote(weapon.name)"
                      @focus="resizeNoteTextarea($event)"
                      @input="resizeNoteTextarea($event); updateWeaponNote(weapon, $event.target.value)"
                    ></textarea>
                  </div>
                </div>
              </div>

              </div>
            </template>
            <div
              v-if="recommendationBottomSpacer > 0"
              class="virtual-spacer"
              :style="{ height: \`\${recommendationBottomSpacer}px\` }"
            ></div>
            <div class="expand-row" v-if="extraRecommendations.length">
              <button class="ghost-button" @click="showAllSchemes = !showAllSchemes">
                {{
                  showAllSchemes
                    ? t("button.collapse_other_plans")
                    : t("button.show_other_plans_count", { count: extraRecommendations.length })
                }}
              </button>
            </div>
          </div>
        </section>
          </div>

          <div v-else-if="currentView === 'strategy'" key="strategy" class="view-shell strategy-view">
            <div v-if="isViewBundleLoading('strategy')" class="empty-state view-load-state">
              <h2>{{ t("error.view_loading_title") }}</h2>
              <p>{{ t("error.view_loading_summary") }}</p>
            </div>
            <div v-else-if="isViewBundleFailed('strategy')" class="empty-state view-load-state">
              <h2>{{ t("error.view_load_failed_title") }}</h2>
              <p>{{ t("error.view_load_failed_summary") }}</p>
            <button class="ghost-button" @click="retryViewLoad('strategy')">
              {{ t("action_retry") }}
            </button>
            <button class="ghost-button" @click="refreshPage">
              {{ t("action_refresh") }}
            </button>
            </div>
            <template v-else>
            <transition name="guide-switch" mode="out-in" @before-leave="guideBeforeLeave" @enter="guideEnter">
              <div v-if="!selectedCharacterId" key="guide-list" class="character-list">
             <div class="panel-title">
               <h2>{{ t("guide.item_2") }}</h2>
             </div>
             <div v-if="charactersLoading" class="strategy-loading">
               {{ t("guide.item_3") }}
             </div>
             <div v-else-if="!characters.length" class="strategy-empty">
               {{ t("guide.item_4") }}
             </div>
             <div v-else class="character-grid">
               <div
                 v-if="characterGridTopSpacer > 0"
                 class="virtual-spacer"
                 :style="{ height: \`\${characterGridTopSpacer}px\`, gridColumn: '1 / -1' }"
               ></div>
               <div
                 v-for="char in visibleCharacters"
                 :key="char.id"
                 class="character-card"
                 @click="selectCharacter(char.id)"
               >
                 <div class="character-avatar">
                   <img
                     v-lazy-src="characterImageSrc(char.name || char.id)"
                     :alt="char.name"
                     loading="lazy"
                   />
                 </div>
                 <div class="character-info">
                   <div class="character-name">{{ char.name }}</div>
                   <div class="character-meta">
                     <span class="rarity">{{ char.rarity }}★</span>
                     <span class="element">{{ char.element }}</span>
                   </div>
                 </div>
               </div>
               <div
                 v-if="characterGridBottomSpacer > 0"
                 class="virtual-spacer"
                 :style="{ height: \`\${characterGridBottomSpacer}px\`, gridColumn: '1 / -1' }"
               ></div>
             </div>
          </div>
          <strategy-guide-detail
            v-else
            key="guide-detail"
            :t="t"
            :t-term="tTerm"
            :current-character="currentCharacter"
            :current-guide="currentGuide"
            :guide-rows="guideRows"
            :team-slots="teamSlots"
            :strategy-category="strategyCategory"
            :strategy-tab="strategyTab"
            :set-strategy-category="setStrategyCategory"
            :set-strategy-tab="setStrategyTab"
            :back-to-character-list="backToCharacterList"
            :show-back-button="true"
            :skill-level-labels="skillLevelLabels"
            :get-skill-tables="getSkillTables"
            :has-image="hasImage"
            :weapon-image-src="weaponImageSrc"
            :weapon-characters="weaponCharacters"
            :character-image-src="characterImageSrc"
            :character-card-src="characterCardSrc"
            :handle-character-card-error="handleCharacterCardError"
            :handle-character-image-error="handleCharacterImageError"
            :has-equip-image="hasEquipImage"
            :equip-image-src="equipImageSrc"
            :has-item-image="hasItemImage"
            :item-image-src="itemImageSrc"
            :resolve-item-label="resolveItemLabel"
            :resolve-potential-name="resolvePotentialName"
            :resolve-potential-description="resolvePotentialDescription"
          ></strategy-guide-detail>
            </transition>
          </div>
          <div v-else-if="currentView === 'editor'" key="editor" class="view-shell editor-view">
            <div v-if="isViewBundleLoading('editor')" class="empty-state view-load-state">
              <h2>{{ t("error.view_loading_title") }}</h2>
              <p>{{ t("error.view_loading_summary") }}</p>
            </div>
            <div v-else-if="isViewBundleFailed('editor')" class="empty-state view-load-state">
              <h2>{{ t("error.view_load_failed_title") }}</h2>
              <p>{{ t("error.view_load_failed_summary") }}</p>
            <button class="ghost-button" @click="retryViewLoad('editor')">
              {{ t("action_retry") }}
            </button>
            <button class="ghost-button" @click="refreshPage">
              {{ t("action_refresh") }}
            </button>
            </div>
            <template v-else>
            <section class="editor-shell">
              <header class="editor-header">
                <div class="editor-title">
                  <h2>角色攻略编辑器</h2>
                  <p>仅用于开发/测试环境。通过导入/导出 JS 数据更新角色攻略。</p>
                </div>
                <div class="editor-actions">
                  <span v-if="editorEnvLabel" class="editor-env">{{ editorEnvLabel }}</span>
                  <button class="ghost-button" type="button" @click="triggerEditorImport">
                    导入 JS
                  </button>
                  <button
                    class="ghost-button"
                    type="button"
                    :disabled="!editorCharacters || !editorCharacters.length"
                    @click="exportEditorData"
                  >
                    导出 JS
                  </button>
                  <button class="ghost-button" type="button" @click="runEditorValidation">
                    校验
                  </button>
                  <button
                    class="ghost-button"
                    type="button"
                    :disabled="!editorIssues || !editorIssues.length"
                    @click="applyEditorAutoFix"
                  >
                    自动修复
                  </button>
                  <button
                    class="ghost-button"
                    type="button"
                    :disabled="!editorDirty"
                    @click="resetEditorChanges"
                  >
                    重置
                  </button>
                  <input
                    ref="editorImportInput"
                    class="editor-import-input"
                    type="file"
                    accept=".js,.mjs"
                    @change="handleEditorImportFile"
                  />
                </div>
              </header>

              <div class="editor-status">
                <div class="editor-stat">
                  角色：{{ editorCharacters ? editorCharacters.length : 0 }}
                </div>
                <div class="editor-stat">
                  错误：{{ editorIssueSummary ? editorIssueSummary.errorCount : 0 }}
                </div>
                <div class="editor-stat">
                  警告：{{ editorIssueSummary ? editorIssueSummary.warnCount : 0 }}
                </div>
                <div v-if="editorImportFileName" class="editor-stat">
                  已导入：{{ editorImportFileName }}
                </div>
                <div v-if="editorImportError" class="editor-error">
                  {{ editorImportError }}
                </div>
                <div v-if="editorLoadError" class="editor-error">
                  {{ editorLoadError }}
                </div>
              </div>

              <div class="editor-panel editor-picker" :class="{ 'is-collapsed': !editorPickerOpen }">
                <div class="editor-panel-head">
                  <h3>角色选择</h3>
                  <div class="editor-section-actions">
                    <button
                      class="ghost-button small"
                      type="button"
                      @click="editorPickerOpen = !editorPickerOpen"
                    >
                      {{ editorPickerOpen ? "收起" : "展开" }}
                    </button>
                    <button class="ghost-button small" type="button" @click="addEditorCharacter">
                      新增
                    </button>
                  </div>
                </div>
                <div v-show="editorPickerOpen" class="editor-picker-body">
                  <label class="editor-search">
                    <span>🔍</span>
                    <input v-model.trim="editorSearchQuery" placeholder="搜索角色名 / ID" />
                  </label>
                  <div v-if="!editorCharacters || !editorCharacters.length" class="editor-empty">
                    还没有角色数据，请先导入。
                  </div>
                  <div v-else class="editor-list-body">
                    <button
                      v-for="(char, index) in editorFilteredCharacters"
                      :key="char.id || char.name || ('editor-' + index)"
                      class="editor-list-item"
                      :class="{
                        active: editorSelectedId === (char.id || char.name || ('editor-' + index)),
                        'has-issue': editorIssueMap && editorIssueMap[char.id || char.name || ('editor-' + index)],
                        'issue-error':
                          editorIssueMap &&
                          editorIssueMap[char.id || char.name || ('editor-' + index)] === 'error',
                      }"
                      type="button"
                      @click="selectEditorCharacter(char.id || char.name || ('editor-' + index))"
                    >
                      <div class="editor-list-name">{{ char.name || "未命名角色" }}</div>
                      <div class="editor-list-meta">
                        {{ char.id || "no-id" }} · {{ char.rarity || "-" }}★
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div class="editor-body">
                <section class="editor-panel editor-form">
                  <div class="editor-panel-head">
                    <h3>角色资料</h3>
                    <button
                      class="ghost-button small"
                      type="button"
                      :disabled="!editorSelectedCharacter"
                      @click="removeEditorCharacter"
                    >
                      删除
                    </button>
                  </div>
                  <div v-if="!editorSelectedCharacter" class="editor-empty">
                    请选择一个角色开始编辑。
                  </div>
                  <template v-else>
                    <div class="editor-section">
                      <button
                        type="button"
                        class="editor-section-toggle"
                        :aria-expanded="isEditorSectionExpanded('attributions')"
                        @click="toggleEditorSection('attributions')"
                      >
                        <span class="editor-section-title">攻略署名</span>
                        <span class="editor-section-chevron" :class="{ 'is-open': isEditorSectionExpanded('attributions') }" aria-hidden="true">&gt;</span>
                      </button>
                      <transition
                        name="editor-section-collapse"
                        @before-enter="prepareEditorSectionEnter"
                        @enter="runEditorSectionEnter"
                        @after-enter="finishEditorSectionEnter"
                        @before-leave="prepareEditorSectionLeave"
                        @leave="runEditorSectionLeave"
                        @after-leave="finishEditorSectionLeave"
                      >
                        <div v-show="isEditorSectionExpanded('attributions')" class="editor-section-body">
                          <div class="editor-section-head">
                            <div></div>
                            <div class="editor-section-actions">
                              <button class="ghost-button small" type="button" @click="addEditorGuideAttribution">
                                新增署名
                              </button>
                            </div>
                          </div>
                          <div
                            v-if="!editorSelectedCharacter.guide.attributions || !editorSelectedCharacter.guide.attributions.length"
                            class="editor-empty"
                          >
                            还没有署名条目。
                          </div>
                          <div v-else class="editor-card-list">
                            <div
                              v-for="(entry, attributionIndex) in editorSelectedCharacter.guide.attributions"
                              :key="'guide-attribution-' + attributionIndex"
                              class="editor-card editor-card-plain"
                            >
                              <div class="editor-card-head">
                                <div class="editor-card-title">署名 {{ attributionIndex + 1 }}</div>
                                <div class="editor-section-actions">
                                  <button
                                    class="ghost-button small"
                                    type="button"
                                    @click="removeEditorGuideAttribution(attributionIndex)"
                                  >
                                    删除
                                  </button>
                                </div>
                              </div>
                              <div class="editor-grid">
                                <label class="editor-field">
                                  <span>类型</span>
                                  <input
                                    v-model.trim="entry.role"
                                    list="editor-guide-attribution-role-options"
                                    placeholder="作者 / 编辑 / 自定义"
                                  />
                                </label>
                                <label class="editor-field">
                                  <span>名称</span>
                                  <input v-model.trim="entry.name" placeholder="署名显示名称" />
                                </label>
                                <label class="editor-field editor-field-span-2">
                                  <span>链接</span>
                                  <input v-model.trim="entry.url" placeholder="https://example.com" />
                                </label>
                              </div>
                              <label class="editor-field editor-field-block">
                                <span>备注</span>
                                <input v-model.trim="entry.note" placeholder="可选，如：首发文案 / 数据校正" />
                              </label>
                            </div>
                          </div>
                          <datalist id="editor-guide-attribution-role-options">
                            <option value="作者"></option>
                            <option value="编辑"></option>
                            <option value="校对"></option>
                            <option value="修正"></option>
                            <option value="数据"></option>
                            <option value="来源"></option>
                            <option value="翻译"></option>
                            <option value="排版"></option>
                          </datalist>
                        </div>
                      </transition>
                    </div>

                    <div class="editor-section">
                      <button
                        type="button"
                        class="editor-section-toggle"
                        :aria-expanded="isEditorSectionExpanded('profile')"
                        @click="toggleEditorSection('profile')"
                      >
                        <span class="editor-section-title">角色资料</span>
                        <span class="editor-section-chevron" :class="{ 'is-open': isEditorSectionExpanded('profile') }" aria-hidden="true">&gt;</span>
                      </button>
                      <transition
                        name="editor-section-collapse"
                        @before-enter="prepareEditorSectionEnter"
                        @enter="runEditorSectionEnter"
                        @after-enter="finishEditorSectionEnter"
                        @before-leave="prepareEditorSectionLeave"
                        @leave="runEditorSectionLeave"
                        @after-leave="finishEditorSectionLeave"
                      >
                      <div v-show="isEditorSectionExpanded('profile')" class="editor-section-body editor-grid">
                      <label class="editor-field">
                        <span>ID</span>
                        <input
                          :value="(editorIdentityDraft && editorIdentityDraft.id) || ''"
                          placeholder="唯一 ID"
                          @input="editorIdentityDraft && (editorIdentityDraft.id = $event.target.value)"
                          @blur="commitEditorCharacterIdentity && commitEditorCharacterIdentity('id')"
                          @keydown.enter.prevent="commitEditorCharacterIdentity && commitEditorCharacterIdentity('id')"
                        />
                      </label>
                      <label class="editor-field">
                        <span>名称</span>
                        <input
                          :value="(editorIdentityDraft && editorIdentityDraft.name) || ''"
                          placeholder="角色名称"
                          @input="editorIdentityDraft && (editorIdentityDraft.name = $event.target.value)"
                          @blur="commitEditorCharacterIdentity && commitEditorCharacterIdentity('name')"
                          @keydown.enter.prevent="commitEditorCharacterIdentity && commitEditorCharacterIdentity('name')"
                        />
                      </label>
                      <label class="editor-field">
                        <span>稀有度</span>
                        <input
                          type="number"
                          min="1"
                          max="6"
                          v-model.number="editorSelectedCharacter.rarity"
                        />
                      </label>
                      <label class="editor-field">
                        <span>元素</span>
                        <input v-model.trim="editorSelectedCharacter.element" />
                      </label>
                      <label class="editor-field">
                        <span>武器类型</span>
                        <input v-model.trim="editorSelectedCharacter.weaponType" />
                      </label>
                      <label class="editor-field">
                        <span>主属性</span>
                        <input v-model.trim="editorSelectedCharacter.mainAbility" />
                      </label>
                      <label class="editor-field">
                        <span>副属性</span>
                        <input v-model.trim="editorSelectedCharacter.subAbility" />
                      </label>
                      <label class="editor-field">
                        <span>职业</span>
                        <input v-model.trim="editorSelectedCharacter.profession" />
                      </label>
                    </div>
                      </transition>
                    </div>

                    <div class="editor-section">
                      <button
                        type="button"
                        class="editor-section-toggle"
                        :aria-expanded="isEditorSectionExpanded('stats')"
                        @click="toggleEditorSection('stats')"
                      >
                        <span class="editor-section-title">基础属性</span>
                        <span class="editor-section-chevron" :class="{ 'is-open': isEditorSectionExpanded('stats') }" aria-hidden="true">&gt;</span>
                      </button>
                      <transition
                        name="editor-section-collapse"
                        @before-enter="prepareEditorSectionEnter"
                        @enter="runEditorSectionEnter"
                        @after-enter="finishEditorSectionEnter"
                        @before-leave="prepareEditorSectionLeave"
                        @leave="runEditorSectionLeave"
                        @after-leave="finishEditorSectionLeave"
                      >
                      <div v-show="isEditorSectionExpanded('stats')" class="editor-section-body editor-grid">
                        <label class="editor-field">
                          <span>力量</span>
                          <input v-model.trim="editorSelectedCharacter.stats.strength" />
                        </label>
                        <label class="editor-field">
                          <span>敏捷</span>
                          <input v-model.trim="editorSelectedCharacter.stats.agility" />
                        </label>
                        <label class="editor-field">
                          <span>智识</span>
                          <input v-model.trim="editorSelectedCharacter.stats.intellect" />
                        </label>
                        <label class="editor-field">
                          <span>意志</span>
                          <input v-model.trim="editorSelectedCharacter.stats.will" />
                        </label>
                        <label class="editor-field">
                          <span>攻击</span>
                          <input v-model.trim="editorSelectedCharacter.stats.attack" />
                        </label>
                        <label class="editor-field">
                          <span>生命</span>
                          <input v-model.trim="editorSelectedCharacter.stats.hp" />
                        </label>
                      </div>
                    </div>

                    <div class="editor-section">
                      <button
                        type="button"
                        class="editor-section-toggle"
                        :aria-expanded="isEditorSectionExpanded('materials')"
                        @click="toggleEditorSection('materials')"
                      >
                        <span class="editor-section-title">精英材料（每行一条）</span>
                        <span class="editor-section-chevron" :class="{ 'is-open': isEditorSectionExpanded('materials') }" aria-hidden="true">&gt;</span>
                      </button>
                      <transition
                        name="editor-section-collapse"
                        @before-enter="prepareEditorSectionEnter"
                        @enter="runEditorSectionEnter"
                        @after-enter="finishEditorSectionEnter"
                        @before-leave="prepareEditorSectionLeave"
                        @leave="runEditorSectionLeave"
                        @after-leave="finishEditorSectionLeave"
                      >
                      <div v-show="isEditorSectionExpanded('materials')" class="editor-section-body editor-materials">
                        <div
                          v-for="level in editorMaterialLevels"
                          :key="level"
                          class="editor-material-block"
                        >
                          <div class="editor-material-head">
                            精英 {{ level.replace('elite', '') }}
                          </div>
                          <textarea
                            :value="editorMaterialsDraft[level]"
                            rows="3"
                            @input="updateEditorMaterialLevel(level, $event.target.value)"
                          ></textarea>
                        </div>
                      </div>
                    </div>

                    <div class="editor-section">
                      <button
                        type="button"
                        class="editor-section-toggle"
                        :aria-expanded="isEditorSectionExpanded('potentials')"
                        @click="toggleEditorSection('potentials')"
                      >
                        <span class="editor-section-title">潜能</span>
                        <span class="editor-section-chevron" :class="{ 'is-open': isEditorSectionExpanded('potentials') }" aria-hidden="true">&gt;</span>
                      </button>
                      <transition
                        name="editor-section-collapse"
                        @before-enter="prepareEditorSectionEnter"
                        @enter="runEditorSectionEnter"
                        @after-enter="finishEditorSectionEnter"
                        @before-leave="prepareEditorSectionLeave"
                        @leave="runEditorSectionLeave"
                        @after-leave="finishEditorSectionLeave"
                      >
                      <div v-show="isEditorSectionExpanded('potentials')" class="editor-section-body">
                      <div class="editor-section-head">
                        <div></div>
                        <div class="editor-section-actions">
                          <button class="ghost-button small" type="button" @click="addEditorPotential">
                            新增
                          </button>
                        </div>
                      </div>
                      <div v-if="!editorPotentialsDraft || !editorPotentialsDraft.length" class="editor-empty">
                        还没有潜能条目，请新增一条。
                      </div>
                      <div v-else class="editor-card-list">
                        <div
                          v-for="(potential, pIndex) in editorPotentialsDraft"
                          :key="potential.name || ('potential-' + pIndex)"
                          class="editor-card"
                        >
                          <div class="editor-card-head">
                            <div class="editor-card-title">潜能 {{ pIndex + 1 }}</div>
                            <div class="editor-section-actions">
                              <button
                                class="ghost-button small"
                                type="button"
                                :disabled="pIndex === 0"
                                @click="moveEditorPotential(pIndex, -1)"
                              >
                                上移
                              </button>
                              <button
                                class="ghost-button small"
                                type="button"
                                :disabled="pIndex === editorPotentialsDraft.length - 1"
                                @click="moveEditorPotential(pIndex, 1)"
                              >
                                下移
                              </button>
                              <button
                                class="ghost-button small"
                                type="button"
                                @click="removeEditorPotential(pIndex)"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                          <label class="editor-field editor-field-block">
                            <span>名称</span>
                            <input
                              :value="potential.name"
                              placeholder="潜能名称"
                              @input="updateEditorPotentialField(pIndex, 'name', $event.target.value)"
                            />
                          </label>
                          <label class="editor-field editor-field-block">
                            <span>描述（支持 Markdown）</span>
                            <textarea
                              :value="potential.description"
                              rows="3"
                              @input="updateEditorPotentialField(pIndex, 'description', $event.target.value)"
                            ></textarea>
                          </label>
                        </div>
                      </div>
                      </div>
                      </transition>
                    </div>

                    <div class="editor-section">
                      <button
                        type="button"
                        class="editor-section-toggle"
                        :aria-expanded="isEditorSectionExpanded('skills')"
                        @click="toggleEditorSection('skills')"
                      >
                        <span class="editor-section-title">技能</span>
                        <span class="editor-section-chevron" :class="{ 'is-open': isEditorSectionExpanded('skills') }" aria-hidden="true">&gt;</span>
                      </button>
                      <transition
                        name="editor-section-collapse"
                        @before-enter="prepareEditorSectionEnter"
                        @enter="runEditorSectionEnter"
                        @after-enter="finishEditorSectionEnter"
                        @before-leave="prepareEditorSectionLeave"
                        @leave="runEditorSectionLeave"
                        @after-leave="finishEditorSectionLeave"
                      >
                      <div v-show="isEditorSectionExpanded('skills')" class="editor-section-body">
                      <div class="editor-section-head">
                        <div></div>
                        <div class="editor-section-actions">
                          <button class="ghost-button small" type="button" @click="addEditorSkill">
                            新增技能
                          </button>
                        </div>
                      </div>
                      <div
                        v-if="!editorSelectedCharacter.skills || !editorSelectedCharacter.skills.length"
                        class="editor-empty"
                      >
                        还没有技能条目。
                      </div>
                      <div v-else class="editor-card-list">
                        <div
                          v-for="(skill, sIndex) in editorSelectedCharacter.skills"
                          :key="skill.name || ('skill-' + sIndex)"
                          class="editor-card"
                        >
                          <div class="editor-card-head">
                            <div class="editor-card-title">技能 {{ sIndex + 1 }}</div>
                            <div class="editor-section-actions">
                              <button
                                class="ghost-button small"
                                type="button"
                                @click="removeEditorSkill(sIndex)"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                          <div class="editor-grid">
                            <label class="editor-field">
                              <span>名称</span>
                              <input v-model.trim="skill.name" placeholder="技能名称" />
                            </label>
                            <label class="editor-field">
                              <span>图标（可选）</span>
                              <input v-model.trim="skill.icon" placeholder="image/skills/xxx.avif" />
                            </label>
                            <label class="editor-field">
                              <span>类型</span>
                              <input
                                v-model.trim="skill.type"
                                list="editor-skill-type-options"
                                placeholder="普通攻击 / 战技 / 连携技 / 终结技"
                              />
                            </label>
                          </div>
                          <label class="editor-field editor-field-block">
                            <span>描述</span>
                            <textarea v-model.trim="skill.description" rows="3"></textarea>
                          </label>

                          <div class="editor-subsection">
                            <div class="editor-section-head">
                              <h5>技能数据</h5>
                              <div class="editor-section-actions">
                                <button
                                  class="ghost-button small"
                                  type="button"
                                  @click="addEditorSkillTable(sIndex)"
                                >
                                  新增数据表
                                </button>
                              </div>
                            </div>
                            <div v-if="!skill.dataTables || !skill.dataTables.length" class="editor-empty">
                              暂无数据表。
                            </div>
                            <div v-else class="editor-card-list">
                              <div
                                v-for="(table, tIndex) in skill.dataTables"
                                :key="'skill-table-' + sIndex + '-' + tIndex"
                                class="editor-card editor-card-soft"
                              >
                                <div class="editor-card-head">
                                  <div class="editor-card-title">数据表 {{ tIndex + 1 }}</div>
                                  <div class="editor-section-actions">
                                    <button
                                      class="ghost-button small"
                                      type="button"
                                      @click="removeEditorSkillTable(sIndex, tIndex)"
                                    >
                                      删除表
                                    </button>
                                  </div>
                                </div>
                                <label class="editor-field">
                                  <span>标题</span>
                                  <input v-model.trim="table.title" placeholder="技能数据" />
                                </label>
                                <div class="editor-subsection">
                                  <div class="editor-section-head">
                                    <h5>数据行</h5>
                                    <div class="editor-section-actions">
                                      <button
                                        class="ghost-button small"
                                        type="button"
                                        @click="addEditorSkillRow(sIndex, tIndex)"
                                      >
                                        新增行
                                      </button>
                                    </div>
                                  </div>
                                  <div v-if="!table.rows || !table.rows.length" class="editor-empty">
                                    暂无数据行。
                                  </div>
                                  <div v-else class="editor-skill-rows">
                                    <div
                                      v-for="(row, rIndex) in table.rows"
                                      :key="'skill-row-' + sIndex + '-' + tIndex + '-' + rIndex"
                                      class="editor-card editor-card-plain"
                                    >
                                      <div class="editor-card-head">
                                        <div class="editor-card-title">行 {{ rIndex + 1 }}</div>
                                        <div class="editor-section-actions">
                                          <button
                                            class="ghost-button small"
                                            type="button"
                                            @click="removeEditorSkillRow(sIndex, tIndex, rIndex)"
                                          >
                                            删除行
                                          </button>
                                        </div>
                                      </div>
                                      <label class="editor-field">
                                        <span>名称</span>
                                        <input v-model.trim="row.name" placeholder="字段名称" />
                                      </label>
                                      <div class="editor-skill-values">
                                        <div
                                          v-for="(label, vIndex) in editorSkillLevelLabels"
                                          :key="'skill-value-' + vIndex"
                                          class="editor-skill-value"
                                        >
                                          <span>{{ label }}</span>
                                          <input
                                            :value="getEditorSkillValue(row, vIndex)"
                                            @input="updateEditorSkillValue(row, vIndex, $event.target.value)"
                                            placeholder="-"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <datalist id="editor-skill-type-options">
                        <option value="普通攻击"></option>
                        <option value="战技"></option>
                        <option value="连携技"></option>
                        <option value="终结技"></option>
                      </datalist>
                      </div>
                      </transition>
                    </div>

                    <div class="editor-section">
                      <button
                        type="button"
                        class="editor-section-toggle"
                        :aria-expanded="isEditorSectionExpanded('talents')"
                        @click="toggleEditorSection('talents')"
                      >
                        <span class="editor-section-title">天赋</span>
                        <span class="editor-section-chevron" :class="{ 'is-open': isEditorSectionExpanded('talents') }" aria-hidden="true">&gt;</span>
                      </button>
                      <transition
                        name="editor-section-collapse"
                        @before-enter="prepareEditorSectionEnter"
                        @enter="runEditorSectionEnter"
                        @after-enter="finishEditorSectionEnter"
                        @before-leave="prepareEditorSectionLeave"
                        @leave="runEditorSectionLeave"
                        @after-leave="finishEditorSectionLeave"
                      >
                      <div v-show="isEditorSectionExpanded('talents')" class="editor-section-body">
                      <div class="editor-section-head">
                        <div></div>
                        <div class="editor-section-actions">
                          <button class="ghost-button small" type="button" @click="addEditorTalent">
                            新增天赋
                          </button>
                        </div>
                      </div>
                      <div
                        v-if="!editorSelectedCharacter.talents || !editorSelectedCharacter.talents.length"
                        class="editor-empty"
                      >
                        还没有天赋条目。
                      </div>
                      <div v-else class="editor-card-list">
                        <div
                          v-for="(talent, tIndex) in editorSelectedCharacter.talents"
                          :key="talent.name || ('talent-' + tIndex)"
                          class="editor-card"
                        >
                          <div class="editor-card-head">
                            <div class="editor-card-title">天赋 {{ tIndex + 1 }}</div>
                            <div class="editor-section-actions">
                              <button
                                class="ghost-button small"
                                type="button"
                                @click="removeEditorTalent(tIndex)"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                          <div class="editor-grid">
                            <label class="editor-field">
                              <span>名称</span>
                              <input v-model.trim="talent.name" placeholder="天赋名称" />
                            </label>
                            <label class="editor-field">
                              <span>图标（可选）</span>
                              <input v-model.trim="talent.icon" placeholder="image/talents/xxx.avif" />
                            </label>
                          </div>
                          <label class="editor-field editor-field-block">
                            <span>描述</span>
                            <textarea v-model.trim="talent.description" rows="3"></textarea>
                          </label>
                        </div>
                      </div>
                      </div>
                      </transition>
                    </div>

                    <div class="editor-section">
                      <button
                        type="button"
                        class="editor-section-toggle"
                        :aria-expanded="isEditorSectionExpanded('baseSkills')"
                        @click="toggleEditorSection('baseSkills')"
                      >
                        <span class="editor-section-title">基建技能</span>
                        <span class="editor-section-chevron" :class="{ 'is-open': isEditorSectionExpanded('baseSkills') }" aria-hidden="true">&gt;</span>
                      </button>
                      <transition
                        name="editor-section-collapse"
                        @before-enter="prepareEditorSectionEnter"
                        @enter="runEditorSectionEnter"
                        @after-enter="finishEditorSectionEnter"
                        @before-leave="prepareEditorSectionLeave"
                        @leave="runEditorSectionLeave"
                        @after-leave="finishEditorSectionLeave"
                      >
                      <div v-show="isEditorSectionExpanded('baseSkills')" class="editor-section-body">
                      <div class="editor-section-head">
                        <div></div>
                        <div class="editor-section-actions">
                          <button class="ghost-button small" type="button" @click="addEditorBaseSkill">
                            新增基建技能
                          </button>
                        </div>
                      </div>
                      <div
                        v-if="!editorSelectedCharacter.baseSkills || !editorSelectedCharacter.baseSkills.length"
                        class="editor-empty"
                      >
                        还没有基建技能条目。
                      </div>
                      <div v-else class="editor-card-list">
                        <div
                          v-for="(baseSkill, bIndex) in editorSelectedCharacter.baseSkills"
                          :key="baseSkill.name || ('base-skill-' + bIndex)"
                          class="editor-card"
                        >
                          <div class="editor-card-head">
                            <div class="editor-card-title">基建技能 {{ bIndex + 1 }}</div>
                            <div class="editor-section-actions">
                              <button
                                class="ghost-button small"
                                type="button"
                                @click="removeEditorBaseSkill(bIndex)"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                          <div class="editor-grid">
                            <label class="editor-field">
                              <span>名称</span>
                              <input v-model.trim="baseSkill.name" placeholder="基建技能名称" />
                            </label>
                            <label class="editor-field">
                              <span>图标（可选）</span>
                              <input v-model.trim="baseSkill.icon" placeholder="image/skills/xxx.avif" />
                            </label>
                          </div>
                          <label class="editor-field editor-field-block">
                            <span>描述</span>
                            <textarea v-model.trim="baseSkill.description" rows="3"></textarea>
                          </label>
                        </div>
                      </div>
                      </div>
                      </transition>
                    </div>

                    <div class="editor-section">
                      <button
                        type="button"
                        class="editor-section-toggle"
                        :aria-expanded="isEditorSectionExpanded('guideContent')"
                        @click="toggleEditorSection('guideContent')"
                      >
                        <span class="editor-section-title">攻略内容</span>
                        <span class="editor-section-chevron" :class="{ 'is-open': isEditorSectionExpanded('guideContent') }" aria-hidden="true">&gt;</span>
                      </button>
                      <transition
                        name="editor-section-collapse"
                        @before-enter="prepareEditorSectionEnter"
                        @enter="runEditorSectionEnter"
                        @after-enter="finishEditorSectionEnter"
                        @before-leave="prepareEditorSectionLeave"
                        @leave="runEditorSectionLeave"
                        @after-leave="finishEditorSectionLeave"
                      >
                        <div v-show="isEditorSectionExpanded('guideContent')" class="editor-section-body editor-guide-grid">
                          <label class="editor-field editor-field-block">
                            <span>解析</span>
                            <textarea v-model.trim="editorSelectedCharacter.guide.analysis" rows="4"></textarea>
                          </label>
                          <label class="editor-field editor-field-block">
                            <span>队伍思路</span>
                            <textarea v-model.trim="editorSelectedCharacter.guide.teamTips" rows="3"></textarea>
                          </label>
                          <label class="editor-field editor-field-block">
                            <span>操作要点</span>
                            <textarea v-model.trim="editorSelectedCharacter.guide.operationTips" rows="3"></textarea>
                          </label>
                        </div>
                      </transition>
                    </div>

                    <div class="editor-section">
                      <button
                        type="button"
                        class="editor-section-toggle"
                        :aria-expanded="isEditorSectionExpanded('equipRows')"
                        @click="toggleEditorSection('equipRows')"
                      >
                        <span class="editor-section-title">精炼 / 装备推荐</span>
                        <span class="editor-section-chevron" :class="{ 'is-open': isEditorSectionExpanded('equipRows') }" aria-hidden="true">&gt;</span>
                      </button>
                      <transition
                        name="editor-section-collapse"
                        @before-enter="prepareEditorSectionEnter"
                        @enter="runEditorSectionEnter"
                        @after-enter="finishEditorSectionEnter"
                        @before-leave="prepareEditorSectionLeave"
                        @leave="runEditorSectionLeave"
                        @after-leave="finishEditorSectionLeave"
                      >
                        <div v-show="isEditorSectionExpanded('equipRows')" class="editor-section-body">
                          <div class="editor-section-head">
                            <div></div>
                            <div class="editor-section-actions">
                              <button class="ghost-button small" type="button" @click="addEditorEquipRow">
                                新增推荐组
                              </button>
                            </div>
                          </div>
                          <div
                            v-if="!editorSelectedCharacter.guide.equipRows || !editorSelectedCharacter.guide.equipRows.length"
                            class="editor-empty"
                          >
                            还没有推荐组。
                          </div>
                          <div v-else class="editor-card-list">
                            <div
                              v-for="(row, rowIndex) in editorSelectedCharacter.guide.equipRows"
                              :key="'equip-row-' + rowIndex"
                              class="editor-card"
                            >
                              <div class="editor-card-head">
                                <div class="editor-card-title">推荐组 {{ rowIndex + 1 }}</div>
                                <div class="editor-section-actions">
                                  <button
                                    class="ghost-button small"
                                    type="button"
                                    @click="removeEditorEquipRow(rowIndex)"
                                  >
                                    删除
                                  </button>
                                </div>
                              </div>
                              <div class="editor-subsection">
                                <div class="editor-section-head">
                                  <h5>武器</h5>
                                  <div class="editor-section-actions">
                                    <button
                                      class="ghost-button small"
                                      type="button"
                                      @click="addEditorEquipWeapon(rowIndex)"
                                    >
                                      新增武器
                                    </button>
                                  </div>
                                </div>
                                <div v-if="!row.weapons || !row.weapons.length" class="editor-empty">
                                  暂无武器。
                                </div>
                                <div v-else class="editor-card-list editor-card-list-inline">
                                  <div
                                    v-for="(weapon, wIndex) in row.weapons"
                                    :key="'equip-weapon-' + rowIndex + '-' + wIndex"
                                    class="editor-card editor-card-plain"
                                  >
                                    <div class="editor-card-head">
                                      <div class="editor-card-title">武器 {{ wIndex + 1 }}</div>
                                      <div class="editor-section-actions">
                                        <button
                                          class="ghost-button small"
                                          type="button"
                                          @click="removeEditorEquipWeapon(rowIndex, wIndex)"
                                        >
                                          删除
                                        </button>
                                      </div>
                                    </div>
                                    <div class="editor-grid">
                                      <label class="editor-field">
                                        <span>名称</span>
                                        <input v-model.trim="weapon.name" placeholder="武器名称" />
                                      </label>
                                      <label class="editor-field">
                                        <span>图标（可选）</span>
                                        <input v-model.trim="weapon.icon" placeholder="image/weapons/xxx.avif" />
                                      </label>
                                      <label class="editor-field">
                                        <span>备注</span>
                                        <input v-model.trim="weapon.note" placeholder="可选" />
                                      </label>
                                      <label class="editor-field">
                                        <span>稀有度</span>
                                        <input type="number" min="1" max="6" v-model.number="weapon.rarity" />
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div class="editor-subsection">
                                <div class="editor-section-head">
                                  <h5>装备</h5>
                                </div>
                                <div class="editor-equip-grid">
                                  <div
                                    v-for="slotIndex in 4"
                                    :key="'equip-slot-' + rowIndex + '-' + slotIndex"
                                    class="editor-card editor-card-plain"
                                  >
                                    <div class="editor-card-head">
                                      <div class="editor-card-title">槽 {{ slotIndex }}</div>
                                      <div class="editor-section-actions">
                                        <button
                                          class="ghost-button small"
                                          type="button"
                                          @click="clearEditorEquipSlot(row, slotIndex - 1)"
                                        >
                                          清空
                                        </button>
                                      </div>
                                    </div>
                                    <div class="editor-grid">
                                      <label class="editor-field">
                                        <span>名称</span>
                                        <input
                                          :value="getEditorEquipSlotValue(row, slotIndex - 1, 'name')"
                                          @input="updateEditorEquipSlotField(row, slotIndex - 1, 'name', $event.target.value)"
                                          placeholder="装备名称"
                                        />
                                      </label>
                                      <label class="editor-field">
                                        <span>图标（可选）</span>
                                        <input
                                          :value="getEditorEquipSlotValue(row, slotIndex - 1, 'icon')"
                                          @input="updateEditorEquipSlotField(row, slotIndex - 1, 'icon', $event.target.value)"
                                          placeholder="image/equip/xxx.avif"
                                        />
                                      </label>
                                      <label class="editor-field">
                                        <span>备注</span>
                                        <input
                                          :value="getEditorEquipSlotValue(row, slotIndex - 1, 'note')"
                                          @input="updateEditorEquipSlotField(row, slotIndex - 1, 'note', $event.target.value)"
                                          placeholder="可选"
                                        />
                                      </label>
                                      <label class="editor-field">
                                        <span>稀有度</span>
                                        <input
                                          type="number"
                                          min="1"
                                          max="6"
                                          :value="getEditorEquipSlotValue(row, slotIndex - 1, 'rarity')"
                                          @input="updateEditorEquipSlotField(row, slotIndex - 1, 'rarity', $event.target.value)"
                                        />
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </transition>
                    </div>

                    <div class="editor-section">
                      <button
                        type="button"
                        class="editor-section-toggle"
                        :aria-expanded="isEditorSectionExpanded('teamSlots')"
                        @click="toggleEditorSection('teamSlots')"
                      >
                        <span class="editor-section-title">队伍搭配</span>
                        <span class="editor-section-chevron" :class="{ 'is-open': isEditorSectionExpanded('teamSlots') }" aria-hidden="true">&gt;</span>
                      </button>
                      <transition
                        name="editor-section-collapse"
                        @before-enter="prepareEditorSectionEnter"
                        @enter="runEditorSectionEnter"
                        @after-enter="finishEditorSectionEnter"
                        @before-leave="prepareEditorSectionLeave"
                        @leave="runEditorSectionLeave"
                        @after-leave="finishEditorSectionLeave"
                      >
                        <div v-show="isEditorSectionExpanded('teamSlots')" class="editor-section-body">
                          <div class="editor-section-head">
                            <div></div>
                            <div class="editor-section-actions">
                              <button class="ghost-button small" type="button" @click="addEditorTeamSlot">
                                新增栏位
                              </button>
                            </div>
                          </div>
                          <div
                            v-if="!editorSelectedCharacter.guide.teamSlots || !editorSelectedCharacter.guide.teamSlots.length"
                            class="editor-empty"
                          >
                            还没有队伍栏位。
                          </div>
                          <div v-else class="editor-card-list">
                            <div
                              v-for="(slot, slotIndex) in editorSelectedCharacter.guide.teamSlots"
                              :key="'team-slot-' + slotIndex"
                              class="editor-card"
                            >
                              <div class="editor-card-head">
                                <div class="editor-card-title">栏位 {{ slotIndex + 1 }}</div>
                                <div class="editor-section-actions">
                                  <button
                                    class="ghost-button small"
                                    type="button"
                                    @click="removeEditorTeamSlot(slotIndex)"
                                  >
                                    删除
                                  </button>
                                </div>
                              </div>
                              <div class="editor-grid">
                                <label class="editor-field">
                                  <span>默认角色名</span>
                                  <input v-model.trim="slot.name" placeholder="可留空" />
                                </label>
                                <label class="editor-field">
                                  <span>说明</span>
                                  <input v-model.trim="slot.note" placeholder="可选" />
                                </label>
                              </div>
                              <div class="editor-subsection">
                                <div class="editor-section-head">
                                  <h5>候选角色</h5>
                                  <div class="editor-section-actions">
                                    <button
                                      class="ghost-button small"
                                      type="button"
                                      @click="addEditorTeamOption(slotIndex)"
                                    >
                                      新增候选
                                    </button>
                                  </div>
                                </div>
                                <div v-if="!slot.options || !slot.options.length" class="editor-empty">
                                  暂无候选角色。
                                </div>
                                <div v-else class="editor-card-list">
                                  <div
                                    v-for="(option, optionIndex) in slot.options"
                                    :key="'team-option-' + slotIndex + '-' + optionIndex"
                                    class="editor-card editor-card-soft"
                                  >
                                    <div class="editor-card-head">
                                      <div class="editor-card-title">候选 {{ optionIndex + 1 }}</div>
                                      <div class="editor-section-actions">
                                        <button
                                          class="ghost-button small"
                                          type="button"
                                          @click="removeEditorTeamOption(slotIndex, optionIndex)"
                                        >
                                          删除
                                        </button>
                                      </div>
                                    </div>
                                    <div class="editor-grid">
                                      <label class="editor-field">
                                        <span>名称</span>
                                        <input v-model.trim="option.name" placeholder="角色名称" />
                                      </label>
                                      <label class="editor-field">
                                        <span>标签</span>
                                        <input v-model.trim="option.tag" placeholder="如：副C / 备选" />
                                      </label>
                                    </div>
                                    <div class="editor-subsection">
                                      <div class="editor-section-head">
                                        <h5>武器</h5>
                                        <div class="editor-section-actions">
                                          <button
                                            class="ghost-button small"
                                            type="button"
                                            @click="addEditorTeamWeapon(slotIndex, optionIndex)"
                                          >
                                            新增武器
                                          </button>
                                        </div>
                                      </div>
                                      <div
                                        v-if="!option.weapons || !option.weapons.length"
                                        class="editor-empty"
                                      >
                                        暂无武器。
                                      </div>
                                      <div v-else class="editor-card-list editor-card-list-inline">
                                        <div
                                          v-for="(weapon, wIndex) in option.weapons"
                                          :key="'team-weapon-' + slotIndex + '-' + optionIndex + '-' + wIndex"
                                          class="editor-card editor-card-plain"
                                        >
                                          <div class="editor-card-head">
                                            <div class="editor-card-title">武器 {{ wIndex + 1 }}</div>
                                            <div class="editor-section-actions">
                                              <button
                                                class="ghost-button small"
                                                type="button"
                                                @click="removeEditorTeamWeapon(slotIndex, optionIndex, wIndex)"
                                              >
                                                删除
                                              </button>
                                            </div>
                                          </div>
                                          <div class="editor-grid">
                                            <label class="editor-field">
                                              <span>名称</span>
                                              <input v-model.trim="weapon.name" placeholder="武器名称" />
                                            </label>
                                            <label class="editor-field">
                                              <span>图标（可选）</span>
                                              <input v-model.trim="weapon.icon" placeholder="image/weapons/xxx.avif" />
                                            </label>
                                            <label class="editor-field">
                                              <span>备注</span>
                                              <input v-model.trim="weapon.note" placeholder="可选" />
                                            </label>
                                            <label class="editor-field">
                                              <span>稀有度</span>
                                              <input type="number" min="1" max="6" v-model.number="weapon.rarity" />
                                            </label>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div class="editor-subsection">
                                      <div class="editor-section-head">
                                        <h5>装备</h5>
                                        <div class="editor-section-actions">
                                          <button
                                            class="ghost-button small"
                                            type="button"
                                            @click="addEditorTeamEquip(slotIndex, optionIndex)"
                                          >
                                            新增装备
                                          </button>
                                        </div>
                                      </div>
                                      <div
                                        v-if="!option.equipment || !option.equipment.length"
                                        class="editor-empty"
                                      >
                                        暂无装备。
                                      </div>
                                      <div v-else class="editor-card-list editor-card-list-inline">
                                        <div
                                          v-for="(equip, eIndex) in option.equipment"
                                          :key="'team-equip-' + slotIndex + '-' + optionIndex + '-' + eIndex"
                                          class="editor-card editor-card-plain"
                                        >
                                          <div class="editor-card-head">
                                            <div class="editor-card-title">装备 {{ eIndex + 1 }}</div>
                                            <div class="editor-section-actions">
                                              <button
                                                class="ghost-button small"
                                                type="button"
                                                @click="removeEditorTeamEquip(slotIndex, optionIndex, eIndex)"
                                              >
                                                删除
                                              </button>
                                            </div>
                                          </div>
                                          <div class="editor-grid">
                                            <label class="editor-field">
                                              <span>名称</span>
                                              <input v-model.trim="equip.name" placeholder="装备名称" />
                                            </label>
                                            <label class="editor-field">
                                              <span>图标（可选）</span>
                                              <input v-model.trim="equip.icon" placeholder="image/equip/xxx.avif" />
                                            </label>
                                            <label class="editor-field">
                                              <span>备注</span>
                                              <input v-model.trim="equip.note" placeholder="可选" />
                                            </label>
                                            <label class="editor-field">
                                              <span>稀有度</span>
                                              <input type="number" min="1" max="6" v-model.number="equip.rarity" />
                                            </label>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </transition>
                    </div>
                  </template>
                </section>

                <section class="editor-panel editor-preview">
                  <div class="editor-panel-head">
                    <h3>实时预览</h3>
                    <div class="editor-section-actions">
                      <button
                        class="ghost-button small"
                        type="button"
                        :class="{ 'is-active': editorStrategyCategory === 'info' }"
                        @click="setEditorStrategyCategory('info')"
                      >
                        资料
                      </button>
                      <button
                        class="ghost-button small"
                        type="button"
                        :class="{ 'is-active': editorStrategyCategory === 'guide' }"
                        @click="setEditorStrategyCategory('guide')"
                      >
                        攻略
                      </button>
                    </div>
                  </div>
                  <div v-if="editorCurrentCharacter" class="editor-preview-body">
                    <strategy-guide-detail
                      :t="t"
                      :t-term="tTerm"
                      :current-character="editorCurrentCharacter"
                      :current-guide="editorCurrentGuide"
                      :guide-rows="editorGuideRows"
                      :team-slots="editorTeamSlots"
                      :strategy-category="editorStrategyCategory"
                      :strategy-tab="editorStrategyTab"
                      :set-strategy-category="setEditorStrategyCategory"
                      :set-strategy-tab="setEditorStrategyTab"
                      :back-to-character-list="() => {}"
                      :show-back-button="false"
                      :skill-level-labels="editorSkillLevelLabels"
                      :get-skill-tables="editorGetSkillTables"
                      :has-image="hasImage"
                      :weapon-image-src="weaponImageSrc"
                      :weapon-characters="weaponCharacters"
                      :character-image-src="characterImageSrc"
                      :character-card-src="characterCardSrc"
                      :handle-character-card-error="handleCharacterCardError"
                      :handle-character-image-error="handleCharacterImageError"
                      :has-equip-image="hasEquipImage"
                      :equip-image-src="equipImageSrc"
                      :has-item-image="hasItemImage"
                      :item-image-src="itemImageSrc"
                      :resolve-item-label="resolveItemLabel"
                      :resolve-potential-name="resolvePotentialName"
                      :resolve-potential-description="resolvePotentialDescription"
                    ></strategy-guide-detail>
                  </div>
                  <div v-else class="editor-empty">
                    请选择角色以查看预览。
                  </div>
                </section>
              </div>

              <section v-if="editorIssues && editorIssues.length" class="editor-panel editor-issues">
                <div class="editor-panel-head">
                  <h3>校验结果</h3>
                </div>
                <div class="editor-issue-list">
                  <div
                    v-for="(issue, idx) in editorIssues"
                    :key="'issue-' + idx"
                    class="editor-issue-item"
                    :class="issue.level ? ('issue-' + issue.level) : ''"
                  >
                    <strong>{{ issue.title }}</strong>
                    <span>{{ issue.message }}</span>
                  </div>
                </div>
              </section>
            </section>
          </template>
          </div>
`);
})();
