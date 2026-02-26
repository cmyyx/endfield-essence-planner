(function () {
  window.__APP_TEMPLATE_MAIN_PARTS = window.__APP_TEMPLATE_MAIN_PARTS || [];
  window.__APP_TEMPLATE_MAIN_PARTS.push(`
                </div>
              </div>
              <div v-else class="empty">
                {{ t("当前组合无可用方案") }}
              </div>
            </div>
          </div>

          <div v-else class="recommendations">
            <div v-if="coverageSummary && coverageSummary.hasGap" class="card">
              <div class="card-header">
                <div>
                  <div class="card-title">{{ t("当前组合需要分批刷取") }}</div>
                  <div class="hint">
                    {{ t("该组合无法在同一批次完成，已生成 {count} 套方案覆盖全部已选武器，并按效率优先排序。", {
                      count: recommendations.length,
                    }) }}
                    <span class="hint-accent">
                      {{ t("当前展示 {count} 套方案已满足全部已选武器刷取要求", {
                        count: displayRecommendations.length,
                      }) }}
                    </span>
                    {{ t("请在下方查看。如需查看更多方案请点击展开其他方案按钮。") }}
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
                <span>{{ t("其他方案") }}</span>
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
                    {{ t("附加属性池 / 技能属性池 均已满足已选武器需求") }}
                  </div>
                  <div class="hint" v-else>
                    {{
                      t("已覆盖 {match} / {total} 把已选武器，剩余需拆分刷取。", {
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
                      {{ t("未覆盖") }} {{ card.displaySelectedMissingNames.length }} {{ t("把") }}（{{
                        t("基础属性")
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
                      t("可同时刷武器：{count} 把（覆盖已选 {match} 把）", {
                        count: card.displayWeaponCount,
                        match: card.displaySelectedMatchCount,
                      })
                    }}
                  </span>
                  <span class="pill" v-if="card.maxWeaponCount !== card.displayWeaponCount">
                    {{ t("最多可刷：{count} 把", { count: card.maxWeaponCount }) }}
                  </span>
                  <span class="pill warn" v-if="card.displaySelectedMissingNames.length && !card.baseOverflow">
                    {{
                      t("未覆盖 {count}", { count: card.displaySelectedMissingNames.length })
                    }}
                  </span>
                  <span
                    class="pill warn"
                    v-if="card.conflictSelected && card.conflictSelected.length"
                  >
                    {{ t("冲突 {count}", { count: card.conflictSelected.length }) }}
                  </span>
                </div>
              </div>
              <div class="lock-summary">
                <div class="lock-title">{{ t("锁定方案") }}</div>
                <div class="lock-items">
                  <span
                    class="lock-chip"
                    :class="{ warn: card.manualPickNeeded || card.manualPickOverflow }"
                  >
                    {{ t("基础属性") }}：{{
                      card.basePickLabels
                        .map((label) =>
                          label === "请手动选择" || label === "任意属性" ? t(label) : formatS1(label)
                        )
                        .join(" / ")
                    }}
                  </span>
                  <span class="lock-chip attr">{{
                    t("锁定{label}：{value}", {
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
                    <span class="hint-line">{{ t("已选择超过三种基础属性，请放弃一种属性。") }}</span>
                    <span class="hint-line hint-accent">
                      {{
                        t("请在下方黄色高亮的武器中点击武器选择你想要放弃的基础属性（还需放弃 {count} 个）", {
                          count: card.manualPickOverflowCount,
                        })
                      }}
                    </span>
                  </template>
                  <template v-else-if="card.manualPickNeeded">
                    <span class="hint-line">{{ t("基础属性超过三选。") }}</span>
                    <span class="hint-line hint-accent">
                      {{
                        t("请在下方黄色高亮的武器中点击武器选择你想要刷取的基础属性（还需选择 {count} 个）", {
                          count: card.manualPickNeeded,
                        })
                      }}
                    </span>
                  </template>
                  <template v-else>
                    <span class="hint-line">{{ t("基础属性已锁定，可同时刷范围已更新。") }}</span>
                    <span class="hint-line hint-accent">{{ t("可点击武器来选中/取消基础属性。") }}</span>
                  </template>
                </div>
              </div>

              <div v-if="card.conflictSelected && card.conflictSelected.length" class="conflict-section">
                <button class="ghost-button" @click="toggleConflictOpen(card.schemeKey)">
                  {{
                    isConflictOpen(card.schemeKey)
                      ? t("点击收起冲突已选武器")
                      : t("点击展开冲突已选武器（{count}）", { count: card.conflictSelected.length })
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
                        <span class="weapon-main-name">{{ tTerm("weapon", weapon.name) }}</span>
                        <span class="rarity" :style="rarityTextStyle(weapon.rarity)">
                          {{ weapon.rarity }}★
                        </span>
                        <span class="badge warn">{{ t("冲突") }}</span>
                        <span v-if="weapon.short" class="weapon-short">
                          {{ tTerm("short", weapon.short) }}
                        </span>
                      </div>
                      <div class="scheme-weapon-attrs">
                        <span class="attr-value attr-type">
                          <span class="attr-label">{{ t("类型") }}：</span>{{ tTerm("type", weapon.type) }}
                        </span>
                        <span class="attr-value">
                          <span class="attr-label">{{ t("基础属性") }}：</span>{{ formatS1(weapon.s1) }}
                        </span>
                        <span class="attr-value" :class="{ conflict: weapon.conflictS2 }">
                          <span class="attr-label">{{ t("附加属性") }}：</span>{{ tTerm("s2", weapon.s2) }}
                        </span>
                        <span class="attr-value" :class="{ conflict: weapon.conflictS3 }">
                          <span class="attr-label">{{ t("技能属性") }}：</span>{{ tTerm("s3", weapon.s3) }}
                        </span>
                      </div>
                      <div class="conflict-reason">
                        {{ t("冲突原因：{reason}", { reason: weapon.conflictReason }) }}
                      </div>
                      <div class="weapon-exclude-row" @click.stop>
                        <button
                          class="exclude-toggle small"
                          :class="{ active: weapon.isUnowned, 'intent-alert': !weapon.isUnowned }"
                          @click.stop="toggleWeaponOwned(weapon)"
                        >
                          {{ weapon.isUnowned ? t("标记武器拥有") : t("标记武器未有") }}
                        </button>
                        <button
                          class="exclude-toggle small"
                          :class="{ active: weapon.isEssenceOwnedReal, 'intent-alert': !weapon.isEssenceOwnedReal }"
                          @click.stop="toggleEssenceOwned(weapon)"
                        >
                          {{ weapon.isEssenceOwnedReal ? t("标记基质未有") : t("标记基质已有") }}
                        </button>
                        <textarea
                          class="exclude-note-input"
                          :class="{ 'is-essence-owned': weapon.isEssenceOwnedReal, 'is-unowned': weapon.isUnowned }"
                          rows="1"
                          maxlength="30"
                          :placeholder="t('备注（可选）')"
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
                  :title="card.baseOverflow ? t('点击选择基础属性') : ''"
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
                    <span class="weapon-main-name">{{ tTerm("weapon", weapon.name) }}</span>
                    <span class="rarity" :style="rarityTextStyle(weapon.rarity)">
                      {{ weapon.rarity }}★
                    </span>
                    <span v-if="weapon.isSelected" class="badge">{{ t("已选") }}</span>
                    <span v-if="weapon.isUnowned" class="badge muted">{{ t("未拥有") }}</span>
                    <span v-if="weapon.isEssenceOwnedReal" class="badge muted">{{ t("基质已有") }}</span>
                    <span v-if="weapon.short" class="weapon-short">
                      {{ tTerm("short", weapon.short) }}
                    </span>
                  </div>
                  <div class="scheme-weapon-attrs">
                    <span class="attr-value attr-type">
                      <span class="attr-label">{{ t("类型") }}：</span>{{ tTerm("type", weapon.type) }}
                    </span>
                    <span
                      class="attr-value"
                      :class="{ 'base-lock': weapon.baseLocked, conflict: weapon.baseConflict }"
                    >
                      <span class="attr-label">{{ t("基础属性") }}：</span>{{ formatS1(weapon.s1) }}
                    </span>
                    <span class="attr-value" :class="{ locked: card.lockType === 's2' }">
                      <span class="attr-label">{{ t("附加属性") }}：</span>{{ tTerm("s2", weapon.s2) }}
                    </span>
                    <span class="attr-value" :class="{ locked: card.lockType === 's3' }">
                      <span class="attr-label">{{ t("技能属性") }}：</span>{{ tTerm("s3", weapon.s3) }}
                    </span>
                  </div>
                  <div class="weapon-exclude-row" @click.stop>
                    <button
                      class="exclude-toggle small"
                      :class="{ active: weapon.isUnowned, 'intent-alert': !weapon.isUnowned }"
                      @click.stop="toggleWeaponOwned(weapon)"
                    >
                      {{ weapon.isUnowned ? t("标记武器拥有") : t("标记武器未有") }}
                    </button>
                    <button
                      class="exclude-toggle small"
                      :class="{ active: weapon.isEssenceOwnedReal, 'intent-alert': !weapon.isEssenceOwnedReal }"
                      @click.stop="toggleEssenceOwned(weapon)"
                    >
                      {{ weapon.isEssenceOwnedReal ? t("标记基质未有") : t("标记基质已有") }}
                    </button>
                    <textarea
                      class="exclude-note-input"
                      :class="{ 'is-essence-owned': weapon.isEssenceOwnedReal, 'is-unowned': weapon.isUnowned }"
                      rows="1"
                      maxlength="30"
                      :placeholder="t('备注（可选）')"
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
                    ? t("收起其他方案")
                    : t("展开其他方案（{count}）", { count: extraRecommendations.length })
                }}
              </button>
            </div>
          </div>
        </section>
          </div>

          <div v-else-if="currentView === 'strategy'" key="strategy" class="view-shell strategy-view">
            <div class="strategy-notice">
              {{ t("攻略尚未完成，内容持续更新中。") }}
            </div>
            <transition name="guide-switch" mode="out-in" @before-leave="guideBeforeLeave" @enter="guideEnter">
              <div v-if="!selectedCharacterId" key="guide-list" class="character-list">
             <div class="panel-title">
               <h2>{{ t("角色列表") }}</h2>
             </div>
             <div v-if="charactersLoading" class="strategy-loading">
               {{ t("角色数据加载中...") }}
             </div>
             <div v-else-if="!characters.length" class="strategy-empty">
               {{ t("暂无角色数据") }}
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
                    ← {{ t("返回列表") }}
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
                      <span class="meta-label">{{ t("武器") }}</span>
                      <span class="meta-value">{{ currentCharacter.weaponType || "-" }}</span>
                    </div>
                    <div class="hero-meta-pair">
                      <span class="meta-label">{{ t("元素") }}</span>
                      <span class="meta-value">{{ currentCharacter.element || "-" }}</span>
                    </div>
                    <div class="hero-meta-pair">
                      <span class="meta-label">{{ t("主能力") }}</span>
                      <span class="meta-value">{{ currentCharacter.mainAbility || "-" }}</span>
                    </div>
                    <div class="hero-meta-pair">
                      <span class="meta-label">{{ t("副能力") }}</span>
                      <span class="meta-value">{{ currentCharacter.subAbility || "-" }}</span>
                    </div>
                    <div class="hero-meta-pair">
                      <span class="meta-label">{{ t("职业") }}</span>
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
                  {{ t("干员信息") }}
                </button>
                <button
                  class="detail-tab"
                  :class="{ active: strategyCategory === 'guide' }"
                  @click="setStrategyCategory('guide')"
                >
                  {{ t("干员攻略") }}
                </button>
              </div>

              <div class="detail-tabs detail-tabs-sub">
                <div class="detail-sub-header">
                  <span class="detail-sub-label">{{ t("当前栏目") }}</span>
                  <span class="detail-sub-title">
                    {{ strategyCategory === 'guide' ? t("干员攻略") : t("干员信息") }}
                  </span>
                </div>
                <div class="detail-sub-tabs">
                  <button
                    v-if="strategyCategory === 'info'"
                    class="detail-tab"
                    :class="{ active: strategyTab === 'base' }"
                    @click="setStrategyTab('base')"
                  >
                    {{ t("基础属性") }}
                  </button>
                  <button
                    v-if="strategyCategory === 'info'"
                    class="detail-tab"
                    :class="{ active: strategyTab === 'skillsTalents' }"
                    @click="setStrategyTab('skillsTalents')"
                  >
                    {{ t("技能天赋") }}
                  </button>
                  <button
                    v-if="strategyCategory === 'info'"
                    class="detail-tab"
                    :class="{ active: strategyTab === 'potentials' }"
                    @click="setStrategyTab('potentials')"
                  >
                    {{ t("干员潜能") }}
                  </button>
                  <button
                    v-if="strategyCategory === 'guide'"
                    class="detail-tab"
                    :class="{ active: strategyTab === 'analysis' }"
                    @click="setStrategyTab('analysis')"
                  >
                    {{ t("干员解析") }}
                  </button>
                  <button
                    v-if="strategyCategory === 'guide'"
                    class="detail-tab"
                    :class="{ active: strategyTab === 'team' }"
                    @click="setStrategyTab('team')"
                  >
                    {{ t("配队思路") }}
                  </button>
                  <button
                    v-if="strategyCategory === 'guide'"
                    class="detail-tab"
                    :class="{ active: strategyTab === 'operation' }"
                    @click="setStrategyTab('operation')"
                  >
                    {{ t("手法教学") }}
                  </button>
                </div>
              </div>

              <div class="detail-tab-panels">
                <div v-show="strategyCategory === 'info' && strategyTab === 'base'" class="detail-panel">
                  <div class="detail-section">
                    <h3>{{ t("基础属性") }}</h3>
                    <div class="stat-grid">
                      <div class="stat-item">
                        <div class="stat-label">{{ t("力量") }}</div>
                        <div class="stat-value">{{ (currentCharacter.stats && currentCharacter.stats.strength) || "-" }}</div>
                      </div>
                      <div class="stat-item">
                        <div class="stat-label">{{ t("敏捷") }}</div>
                        <div class="stat-value">{{ (currentCharacter.stats && currentCharacter.stats.agility) || "-" }}</div>
                      </div>
                      <div class="stat-item">
                        <div class="stat-label">{{ t("智识") }}</div>
                        <div class="stat-value">{{ (currentCharacter.stats && currentCharacter.stats.intellect) || "-" }}</div>
                      </div>
                      <div class="stat-item">
                        <div class="stat-label">{{ t("意志") }}</div>
                        <div class="stat-value">{{ (currentCharacter.stats && currentCharacter.stats.will) || "-" }}</div>
                      </div>
                      <div class="stat-item">
                        <div class="stat-label">{{ t("攻击力") }}</div>
                        <div class="stat-value">{{ (currentCharacter.stats && currentCharacter.stats.attack) || "-" }}</div>
                      </div>
                      <div class="stat-item">
                        <div class="stat-label">{{ t("血量") }}</div>
                        <div class="stat-value">{{ (currentCharacter.stats && currentCharacter.stats.hp) || "-" }}</div>
                      </div>
                    </div>
                  </div>

                  <div class="detail-section">
                    <h3>{{ t("精英化材料") }}</h3>
                    <div class="materials-list">
                      <div
                        v-for="level in ['elite1', 'elite2', 'elite3', 'elite4']"
                        :key="level"
                        class="material-row"
                      >
                        <div class="material-level">{{ t("精英化") }} {{ level.replace('elite', '') }}</div>
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
                    <h3>{{ t("技能") }}</h3>
                    <div class="skills-list">
                      <div v-for="skill in currentCharacter.skills" :key="skill.name" class="skill-item">
                        <div class="skill-header">
                          <img v-if="skill.icon" v-lazy-src="skill.icon" class="skill-icon" alt="" />
                          <span class="skill-name">{{ skill.name }}</span>
                        </div>
                        <p>{{ skill.description }}</p>
                        <div v-if="getSkillTables(skill).length" class="skill-data">
                          <details>
                            <summary class="skill-data-summary">{{ t("技能数据") }}</summary>
                            <div class="skill-data-content">
                              <div v-for="(table, tIdx) in getSkillTables(skill)" :key="tIdx" class="skill-data-table">
                                <div class="skill-data-scroll">
                                  <table class="skill-data-grid">
                                    <thead>
                                      <tr>
                                        <th class="skill-data-name">{{ t("数据项") }}</th>
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
                    <h3>{{ t("后勤技能") }}</h3>
                    <div class="base-skills-grid">
                      <div v-for="bs in currentCharacter.baseSkills" :key="bs.name" class="base-skill-card">
                        <div class="base-skill-name">{{ bs.name }}</div>
                        <div class="base-skill-desc">{{ bs.description }}</div>
                      </div>
                    </div>
                  </div>
                  <div class="detail-section">
                    <h3>{{ t("天赋") }}</h3>
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
                    <h3>{{ t("干员潜能") }}</h3>
                    <div class="potential-grid">
                      <div v-for="(p, i) in currentCharacter.potentials" :key="i" class="potential-card">
                        <div class="potential-index">{{ t("潜能") }} {{ i + 1 }}</div>
                        <div class="potential-desc">{{ p }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-show="strategyCategory === 'guide' && strategyTab === 'analysis'" class="detail-panel">
                  <div class="detail-section">
                    <h3>{{ t("干员解析") }}</h3>
                    <p class="strategy-text">{{ (currentGuide && currentGuide.analysis) || t("暂无解析") }}</p>
                  </div>
                  <div class="detail-section" v-if="currentGuide">
                    <h3>{{ t("配装推荐") }}</h3>
                    <div class="gear-table" v-if="guideRows.length">
                      <div class="gear-row gear-row-head">
                        <div class="gear-row-label"></div>
                        <div class="gear-row-main">
                          <div class="gear-cell gear-weapon">{{ t("武器") }}</div>
                          <div class="gear-cell">{{ t("护甲") }}</div>
                          <div class="gear-cell">{{ t("手套") }}</div>
                          <div class="gear-cell">{{ t("配件") }}</div>
                          <div class="gear-cell">{{ t("配件") }}</div>
                        </div>
                      </div>
                      <div v-for="(row, idx) in guideRows" :key="idx" class="gear-row">
                        <div class="gear-row-label">
                          <div class="gear-tag-block">
                            <span
                              class="gear-tag"
                              :class="idx === 0 ? 'gear-tag-primary' : 'gear-tag-secondary'"
                            >
                              {{ idx === 0 ? t("主选") : t("备选") }}
                            </span>
                            <span class="gear-tag-desc">
`);
})();
