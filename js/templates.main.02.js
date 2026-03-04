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
                  <div class="card-title">{{ t("plan.current_selection_needs_batch_farming") }}</div>
                  <div class="hint">
                    {{ t("guide.this_selection_can_t_be_completed_in_a_single_batch_gene", {
                      count: recommendations.length,
                    }) }}
                    <span class="hint-accent">
                      {{ t("guide.the_count_plans_shown_already_cover_all_selected_weapons", {
                        count: displayRecommendations.length,
                      }) }}
                    </span>
                    {{ t("plan.see_details_below_to_view_more_plans_click_show_other_pl") }}
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
                <div>
                  <div class="card-title">{{ tTerm("dungeon", card.dungeon.name) }}</div>
                  <div class="hint" v-if="card.displaySelectedMatchCount === card.targetCount">
                    {{ t("guide.extra_skill_pools_already_satisfy_selected_weapons") }}
                  </div>
                  <div class="hint" v-else>
                    {{
                      t("guide.covers_match_total_selected_weapons_the_rest_need_separa", {
                        match: card.displaySelectedMatchCount,
                        total: card.targetCount,
                      })
                    }}
                  </div>
                  <details
                    v-if="card.displaySelectedMissingNames.length && !card.baseOverflow"
                    class="missing-details"
                    :open="card.targetCount > 1"
                  >
                    <summary>
                      {{ t("plan.item") }} {{ card.displaySelectedMissingNames.length }} {{ t("nav.weapons_2") }}（{{
                        t("nav.base_attributes")
                      }}）
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
                </div>
                <div class="strategy-row">
                  <span class="pill wide">
                    {{
                      t("guide.can_farm_together_count_weapons_covers_match_selected", {
                        count: card.displayWeaponCount,
                        match: card.displaySelectedMatchCount,
                      })
                    }}
                  </span>
                  <span class="pill" v-if="card.maxWeaponCount !== card.displayWeaponCount">
                    {{ t("label.max_farmable_count", { count: card.maxWeaponCount }) }}
                  </span>
                  <span class="pill warn" v-if="card.displaySelectedMissingNames.length && !card.baseOverflow">
                    {{
                      t("plan.uncovered_count", { count: card.displaySelectedMissingNames.length })
                    }}
                  </span>
                  <span
                    class="pill warn"
                    v-if="card.conflictSelected && card.conflictSelected.length"
                  >
                    {{ t("plan.conflicts_count", { count: card.conflictSelected.length }) }}
                  </span>
                </div>
              </div>
              <div class="lock-summary">
                <div class="lock-title">{{ t("plan.locked_plan") }}</div>
                <div class="lock-items">
                  <span
                    class="lock-chip"
                    :class="{ warn: card.manualPickNeeded || card.manualPickOverflow }"
                  >
                    {{ t("nav.base_attributes") }}：{{
                      card.basePickLabels
                        .map((label) =>
                          label === "请手动选择" || label === "任意属性" ? t(label) : formatS1(label)
                        )
                        .join(" / ")
                    }}
                  </span>
                  <span class="lock-chip attr">{{
                    t("plan.lock_label_value", {
                      label: t(card.lockLabel),
                      value: tTerm(card.lockType, card.lockValue),
                    })
                  }}</span>
                </div>
                <div
                  class="hint"
                  v-if="card.baseOverflow"
                  :class="{ 'status-warn': card.manualPickOverflow }"
                >
                  <template v-if="card.manualPickOverflow">
                    <span class="hint-line">{{ t("label.more_than_three_base_attributes_selected_please_drop_one") }}</span>
                    <span class="hint-line hint-accent">
                      {{
                        t("guide.click_a_yellow_highlighted_weapon_below_to_drop_the_base", {
                          count: card.manualPickOverflowCount,
                        })
                      }}
                    </span>
                  </template>
                  <template v-else-if="card.manualPickNeeded">
                    <span class="hint-line">{{ t("label.more_than_three_base_attributes") }}</span>
                    <span class="hint-line hint-accent">
                      {{
                        t("guide.item", {
                          count: card.manualPickNeeded,
                        })
                      }}
                    </span>
                  </template>
                  <template v-else>
                    <span class="hint-line">{{ t("label.base_attributes_locked_simultaneous_farming_range_update") }}</span>
                    <span class="hint-line hint-accent">{{ t("guide.click_weapons_to_select_deselect_base_attributes") }}</span>
                  </template>
                </div>
              </div>

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
                      <div class="weapon-exclude-row" @click.stop>
                        <button
                          class="exclude-toggle small"
                          :class="{ active: !weapon.isUnowned, 'intent-alert': weapon.isUnowned }"
                          @click.stop="toggleWeaponOwned(weapon)"
                        >
                          {{ weapon.isUnowned ? t("button.mark_weapon_owned") : t("button.mark_weapon_not_owned") }}
                        </button>
                        <button
                          class="exclude-toggle small"
                          :class="{ active: weapon.isEssenceOwnedReal, 'intent-alert': !weapon.isEssenceOwnedReal }"
                          @click.stop="toggleEssenceOwned(weapon)"
                        >
                          {{ weapon.isEssenceOwnedReal ? t("button.mark_essence_not_owned") : t("button.mark_essence_owned") }}
                        </button>
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
                  ]"
                  :class="{
                    'is-selected': weapon.isSelected,
                    'base-selectable': card.baseOverflow,
                    'base-choice':
                      card.baseOverflow &&
                      !weapon.isEssenceOwned &&
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
                  <div class="weapon-exclude-row" @click.stop>
                    <button
                      class="exclude-toggle small"
                      :class="{ active: !weapon.isUnowned, 'intent-alert': weapon.isUnowned }"
                      @click.stop="toggleWeaponOwned(weapon)"
                    >
                      {{ weapon.isUnowned ? t("button.mark_weapon_owned") : t("button.mark_weapon_not_owned") }}
                    </button>
                    <button
                      class="exclude-toggle small"
                      :class="{ active: weapon.isEssenceOwnedReal, 'intent-alert': !weapon.isEssenceOwnedReal }"
                      @click.stop="toggleEssenceOwned(weapon)"
                    >
                      {{ weapon.isEssenceOwnedReal ? t("button.mark_essence_not_owned") : t("button.mark_essence_owned") }}
                    </button>
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
            <div class="strategy-notice">
              {{ t("guide.guide_is_not_finished_yet_content_is_still_being_updated") }}
            </div>
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
                   <img v-lazy-src="char.avatar" :alt="char.name" loading="lazy" />
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
          <div v-else key="guide-detail" class="character-detail">
            <div class="detail-content" v-if="currentCharacter">
              <div class="character-hero">
                <div class="hero-left">
                  <button class="ghost-button back-button hero-back" @click="backToCharacterList">
                    ← {{ t("plan.item_2") }}
                  </button>
                  <div class="hero-identity">
                    <img v-lazy-src="currentCharacter.avatar" :alt="currentCharacter.name" class="detail-avatar hero-avatar" />
                    <div class="hero-title">
                      <div class="hero-name-row">
                        <h1>{{ currentCharacter.name }}</h1>
                      </div>
                      <div class="hero-stars">
                        <span v-for="i in (currentCharacter.rarity || 0)" :key="i">★</span>
                      </div>
                    </div>
                  </div>

                  <div class="hero-meta-row">
                    <div class="hero-meta-pair">
                      <span class="meta-label">{{ t("guide.item_5") }}</span>
                      <span class="meta-value">{{ currentCharacter.weaponType || "-" }}</span>
                    </div>
                    <div class="hero-meta-pair">
                      <span class="meta-label">{{ t("plan.item_3") }}</span>
                      <span class="meta-value">{{ currentCharacter.element || "-" }}</span>
                    </div>
                    <div class="hero-meta-pair">
                      <span class="meta-label">{{ t("plan.item_4") }}</span>
                      <span class="meta-value">{{ currentCharacter.mainAbility || "-" }}</span>
                    </div>
                    <div class="hero-meta-pair">
                      <span class="meta-label">{{ t("plan.item_5") }}</span>
                      <span class="meta-value">{{ currentCharacter.subAbility || "-" }}</span>
                    </div>
                    <div class="hero-meta-pair">
                      <span class="meta-label">{{ t("plan.item_6") }}</span>
                      <span class="meta-value">{{ currentCharacter.profession || currentCharacter.role || "-" }}</span>
                    </div>
                  </div>
                </div>
                <div class="hero-right">
                  <div class="character-card-frame">
                    <img
                      v-lazy-src="characterCardSrc(currentCharacter)"
                      :alt="currentCharacter.name"
                      class="character-card-image"
                      loading="lazy"
                      decoding="async"
                      @error="handleCharacterCardError"
                    />
                  </div>
                </div>
              </div>

              <div class="detail-tabs detail-tabs-main">
                <button
                  class="detail-tab"
                  :class="{ active: strategyCategory === 'info' }"
                  @click="setStrategyCategory('info')"
                >
                  {{ t("guide.item_6") }}
                </button>
                <button
                  class="detail-tab"
                  :class="{ active: strategyCategory === 'guide' }"
                  @click="setStrategyCategory('guide')"
                >
                  {{ t("guide.item_7") }}
                </button>
              </div>

              <div class="detail-tabs detail-tabs-sub">
                <div class="detail-sub-header">
                  <span class="detail-sub-label">{{ t("plan.item_7") }}</span>
                  <span class="detail-sub-title">
                    {{ strategyCategory === 'guide' ? t("guide.item_7") : t("guide.item_6") }}
                  </span>
                </div>
                <div class="detail-sub-tabs">
                  <button
                    v-if="strategyCategory === 'info'"
                    class="detail-tab"
                    :class="{ active: strategyTab === 'base' }"
                    @click="setStrategyTab('base')"
                  >
                    {{ t("nav.base_attributes") }}
                  </button>
                  <button
                    v-if="strategyCategory === 'info'"
                    class="detail-tab"
                    :class="{ active: strategyTab === 'skillsTalents' }"
                    @click="setStrategyTab('skillsTalents')"
                  >
                    {{ t("guide.item_8") }}
                  </button>
                  <button
                    v-if="strategyCategory === 'info'"
                    class="detail-tab"
                    :class="{ active: strategyTab === 'potentials' }"
                    @click="setStrategyTab('potentials')"
                  >
                    {{ t("guide.item_9") }}
                  </button>
                  <button
                    v-if="strategyCategory === 'guide'"
                    class="detail-tab"
                    :class="{ active: strategyTab === 'analysis' }"
                    @click="setStrategyTab('analysis')"
                  >
                    {{ t("guide.item_10") }}
                  </button>
                  <button
                    v-if="strategyCategory === 'guide'"
                    class="detail-tab"
                    :class="{ active: strategyTab === 'team' }"
                    @click="setStrategyTab('team')"
                  >
                    {{ t("plan.item_8") }}
                  </button>
                  <button
                    v-if="strategyCategory === 'guide'"
                    class="detail-tab"
                    :class="{ active: strategyTab === 'operation' }"
                    @click="setStrategyTab('operation')"
                  >
                    {{ t("guide.item_11") }}
                  </button>
                </div>
              </div>

              <div class="detail-tab-panels">
                <div v-show="strategyCategory === 'info' && strategyTab === 'base'" class="detail-panel">
                  <div class="detail-section">
                    <h3>{{ t("nav.base_attributes") }}</h3>
                    <div class="stat-grid">
                      <div class="stat-item">
                        <div class="stat-label">{{ t("plan.item_9") }}</div>
                        <div class="stat-value">{{ (currentCharacter.stats && currentCharacter.stats.strength) || "-" }}</div>
                      </div>
                      <div class="stat-item">
                        <div class="stat-label">{{ t("plan.item_10") }}</div>
                        <div class="stat-value">{{ (currentCharacter.stats && currentCharacter.stats.agility) || "-" }}</div>
                      </div>
                      <div class="stat-item">
                        <div class="stat-label">{{ t("plan.item_11") }}</div>
                        <div class="stat-value">{{ (currentCharacter.stats && currentCharacter.stats.intellect) || "-" }}</div>
                      </div>
                      <div class="stat-item">
                        <div class="stat-label">{{ t("plan.item_12") }}</div>
                        <div class="stat-value">{{ (currentCharacter.stats && currentCharacter.stats.will) || "-" }}</div>
                      </div>
                      <div class="stat-item">
                        <div class="stat-label">{{ t("plan.item_13") }}</div>
                        <div class="stat-value">{{ (currentCharacter.stats && currentCharacter.stats.attack) || "-" }}</div>
                      </div>
                      <div class="stat-item">
                        <div class="stat-label">{{ t("plan.item_14") }}</div>
                        <div class="stat-value">{{ (currentCharacter.stats && currentCharacter.stats.hp) || "-" }}</div>
                      </div>
                    </div>
                  </div>

                  <div class="detail-section">
                    <h3>{{ t("guide.item_12") }}</h3>
                    <div class="materials-list">
                      <div
                        v-for="level in ['elite1', 'elite2', 'elite3', 'elite4']"
                        :key="level"
                        class="material-row"
                      >
                        <div class="material-level">{{ t("guide.item_13") }} {{ level.replace('elite', '') }}</div>
                        <div class="material-items">
                          <template
                            v-if="currentCharacter.materials && currentCharacter.materials[level] && currentCharacter.materials[level].length"
                          >
                            <span
                              v-for="(mat, idx) in currentCharacter.materials[level]"
                              :key="idx"
                              class="material-tag"
                            >
                              {{ mat }}
                            </span>
                          </template>
                          <span v-else class="material-tag is-empty">-</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-show="strategyCategory === 'info' && strategyTab === 'skillsTalents'" class="detail-panel">
                  <div class="detail-section">
                    <h3>{{ t("plan.item_15") }}</h3>
                    <div class="skills-list">
                      <div v-for="skill in currentCharacter.skills" :key="skill.name" class="skill-item">
                        <div class="skill-header">
                          <img v-if="skill.icon" v-lazy-src="skill.icon" class="skill-icon" alt="" />
                          <span class="skill-name">{{ skill.name }}</span>
                        </div>
                        <p>{{ skill.description }}</p>
                        <div v-if="getSkillTables(skill).length" class="skill-data">
                          <details>
                            <summary class="skill-data-summary">{{ t("plan.item_16") }}</summary>
                            <div class="skill-data-content">
                              <div v-for="(table, tIdx) in getSkillTables(skill)" :key="tIdx" class="skill-data-table">
                                <div class="skill-data-scroll">
                                  <table class="skill-data-grid">
                                    <thead>
                                      <tr>
                                        <th class="skill-data-name">{{ t("plan.item_17") }}</th>
                                        <th v-for="label in skillLevelLabels" :key="label" class="skill-data-level">
                                          {{ label }}
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr
                                        v-for="(row, rIdx) in table.rows"
                                        :key="rIdx"
                                        class="skill-data-row"
                                        :class="{ 'is-uniform': row.uniformValue !== null }"
                                      >
                                        <td class="skill-data-name">
                                          <span class="skill-data-label">{{ row.name }}</span>
                                          <span v-if="row.uniformValue !== null" class="skill-data-uniform">{{ row.uniformValue }}</span>
                                        </td>
                                        <td
                                          v-for="(seg, sIdx) in row.segments"
                                          :key="sIdx"
                                          class="skill-data-value"
                                          :colspan="seg.span"
                                        >
                                          {{ seg.value }}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </details>
                        </div>
                        <div v-else class="skill-multipliers">
                          <span v-for="(m, i) in skill.multipliers" :key="i">Lv{{i+1}}: {{m}}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="detail-section" v-if="currentCharacter.baseSkills">
                    <h3>{{ t("guide.item_14") }}</h3>
                    <div class="base-skills-grid">
                      <div v-for="bs in currentCharacter.baseSkills" :key="bs.name" class="base-skill-card">
                        <div class="base-skill-name">{{ bs.name }}</div>
                        <div class="base-skill-desc">{{ bs.description }}</div>
                      </div>
                    </div>
                  </div>
                  <div class="detail-section">
                    <h3>{{ t("guide.item_15") }}</h3>
                    <div class="talents-list">
                      <div v-for="talent in currentCharacter.talents" :key="talent.name" class="talent-item">
                        <div class="talent-header">
                          <img v-if="talent.icon" v-lazy-src="talent.icon" class="talent-icon" alt="" />
                          <div class="talent-name">{{ talent.name }}</div>
                        </div>
                        <p>{{ talent.description }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-show="strategyCategory === 'info' && strategyTab === 'potentials'" class="detail-panel">
                  <div class="detail-section">
                    <h3>{{ t("guide.item_9") }}</h3>
                    <div class="potential-grid">
                      <div v-for="(p, i) in currentCharacter.potentials" :key="i" class="potential-card">
                        <div class="potential-index">{{ t("guide.item_16") }} {{ i + 1 }}</div>
                        <div class="potential-desc">{{ p }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-show="strategyCategory === 'guide' && strategyTab === 'analysis'" class="detail-panel">
                  <div class="detail-section">
                    <h3>{{ t("guide.item_10") }}</h3>
                    <p class="strategy-text">{{ (currentGuide && currentGuide.analysis) || t("plan.item_18") }}</p>
                  </div>
                  <div class="detail-section" v-if="currentGuide">
                    <h3>{{ t("guide.item_17") }}</h3>
                    <div class="gear-table" v-if="guideRows.length">
                      <div class="gear-row gear-row-head">
                        <div class="gear-row-label"></div>
                        <div class="gear-row-main">
                          <div class="gear-cell gear-weapon">{{ t("guide.item_5") }}</div>
                          <div class="gear-cell">{{ t("plan.item_19") }}</div>
                          <div class="gear-cell">{{ t("plan.item_20") }}</div>
                          <div class="gear-cell">{{ t("plan.item_21") }}</div>
                          <div class="gear-cell">{{ t("plan.item_21") }}</div>
                        </div>
                      </div>
                      <div v-for="(row, idx) in guideRows" :key="idx" class="gear-row">
                        <div class="gear-row-label">
                          <div class="gear-tag-block">
                            <span
                              class="gear-tag"
                              :class="idx === 0 ? 'gear-tag-primary' : 'gear-tag-secondary'"
                            >
                              {{ idx === 0 ? t("plan.item_22") : t("plan.item_23") }}
                            </span>
                            <span class="gear-tag-desc">
`);
})();
