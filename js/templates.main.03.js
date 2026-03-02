(function () {
  window.__APP_TEMPLATE_MAIN_PARTS = window.__APP_TEMPLATE_MAIN_PARTS || [];
  window.__APP_TEMPLATE_MAIN_PARTS.push(`
                              {{ idx === 0 ? t("优先推荐") : t("可替代") }}
                            </span>
                          </div>
                        </div>
                        <div class="gear-row-main">
                          <div class="gear-cell gear-weapon">
                            <div class="gear-items">
                              <div v-for="(weapon, wIdx) in row.weapons" :key="wIdx" class="gear-item">
                                <div
                                  class="gear-icon-frame"
                                  :class="weapon.rarity === 6 ? 'weapon-rarity-6' : weapon.rarity === 5 ? 'weapon-rarity-5' : weapon.rarity === 4 ? 'weapon-rarity-4' : ''"
                                >
                                  <img v-if="weapon.icon" v-lazy-src="weapon.icon" class="gear-icon" alt="" />
                                </div>
                                <div class="gear-text">
                                  <div class="gear-name">{{ weapon.name }}</div>
                                  <div class="gear-note" v-if="weapon.note">{{ weapon.note }}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div v-for="(equip, eIdx) in row.equipment" :key="eIdx" class="gear-cell">
                            <div v-if="equip" class="gear-item">
                              <div
                                class="gear-icon-frame"
                                :class="equip.rarity === 5 ? 'gear-rarity-5' : equip.rarity === 4 ? 'gear-rarity-4' : ''"
                              >
                                <img v-if="equip.icon" v-lazy-src="equip.icon" class="gear-icon" alt="" />
                              </div>
                              <div class="gear-text">
                                <div class="gear-name">{{ equip.name }}</div>
                                <div class="gear-note" v-if="equip.note">{{ equip.note }}</div>
                              </div>
                            </div>
                            <div v-else class="gear-empty">-</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="gear-empty" v-else>{{ t("暂无配装") }}</div>
                  </div>
                </div>

                <div v-show="strategyCategory === 'guide' && strategyTab === 'team'" class="detail-panel">
                  <div class="detail-section">
                    <h3>{{ t("配队思路") }}</h3>
                    <p class="strategy-text">{{ (currentGuide && currentGuide.teamTips) || t("暂无建议") }}</p>
                  </div>

                  <div class="detail-section">
                    <h3>{{ t("队伍推荐") }}</h3>
                    <div class="team-table" v-if="teamSlots.length">
                      <div v-for="(slot, sIdx) in teamSlots" :key="'team-slot-' + sIdx" class="team-cell">
                        <div v-if="slot" class="team-slot">
                          <div
                            v-for="(entry, eIdx) in (slot.options || [])"
                            :key="'team-entry-' + sIdx + '-' + eIdx"
                            class="team-card"
                            :class="{
                              'is-alt': eIdx > 0,
                              'is-self': currentCharacter && entry.name === currentCharacter.name,
                            }"
                          >
                            <div class="team-name-row">
                              <img v-if="entry.avatar" v-lazy-src="entry.avatar" class="team-member-avatar" alt="" loading="lazy" />
                              <div class="team-name">{{ entry.name }}</div>
                              <span
                                v-if="currentCharacter && entry.name === currentCharacter.name"
                                class="team-badge"
                              >
                                {{ t("当前") }}
                              </span>
                              <span v-if="entry.tag" class="team-badge muted">{{ entry.tag }}</span>
                            </div>
                            <div class="team-section">
                              <span class="team-label">{{ t("武器") }}</span>
                              <div class="team-items">
                                <div v-for="(weapon, wIdx) in (entry.weapons || [])" :key="wIdx" class="team-item">
                                  <div
                                    class="team-icon-frame"
                                    :class="weapon.rarity === 6 ? 'weapon-rarity-6' : weapon.rarity === 5 ? 'weapon-rarity-5' : weapon.rarity === 4 ? 'weapon-rarity-4' : ''"
                                  >
                                    <img v-if="weapon.icon" v-lazy-src="weapon.icon" class="team-icon" alt="" />
                                  </div>
                                  <div class="team-text">
                                    <div class="team-item-name">{{ weapon.name }}</div>
                                    <div class="team-note" v-if="weapon.note">{{ weapon.note }}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div class="team-section">
                              <span class="team-label">{{ t("装备") }}</span>
                              <div class="team-items">
                                <div v-for="(equip, eIdx) in (entry.equipment || [])" :key="eIdx" class="team-item">
                                  <div
                                    class="team-icon-frame"
                                    :class="equip.rarity === 5 ? 'gear-rarity-5' : equip.rarity === 4 ? 'gear-rarity-4' : ''"
                                  >
                                    <img v-if="equip.icon" v-lazy-src="equip.icon" class="team-icon" alt="" />
                                  </div>
                                  <div class="team-text">
                                    <div class="team-item-name">{{ equip.name }}</div>
                                    <div class="team-note" v-if="equip.note">{{ equip.note }}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div v-else class="team-empty">-</div>
                      </div>
                    </div>
                    <div class="empty-guide" v-else>
                      <p class="empty-guide-text">{{ t("暂无推荐") }}</p>
                    </div>
                  </div>
                </div>

                <div v-show="strategyCategory === 'guide' && strategyTab === 'operation'" class="detail-panel">
                  <div class="detail-section">
                    <h3>{{ t("手法教学") }}</h3>
                    <p class="strategy-text">{{ (currentGuide && (currentGuide.operationTips || currentGuide.skillTips)) || t("暂无建议") }}</p>
                  </div>
                </div>
              </div>

            </div>
              </div>
            </transition>
          </div>

          <div v-else-if="currentView === 'match'" key="match" class="view-shell match-view">
            <div class="mobile-tabs">
              <button
                class="mobile-tab"
                :class="{ active: matchMobilePanel === 'source' }"
                @click="matchMobilePanel = 'source'"
              >
                {{ t("武器选择") }} <span class="count">{{ matchSourceList.length }}</span>
              </button>
              <button
                class="mobile-tab"
                :class="{ active: matchMobilePanel === 'result' }"
                @click="matchMobilePanel = 'result'"
              >
                {{ t("词条对照") }} <span class="count">{{ matchResults.length }}</span>
              </button>
            </div>
            <div class="mobile-hint">
              {{ t("手机端可通过上方标签切换“武器选择 / 词条对照”，并可下滑继续浏览列表。") }}
            </div>
            <div class="match-grid">
              <section class="panel match-panel" :class="{ 'panel-hidden': matchMobilePanel !== 'source' }">
                <div class="panel-title">
                  <h2>{{ t("武器选择") }}</h2>
                </div>
                <label class="search-box match-search">
                  <span>🔍</span>
                  <input v-model="matchQuery" :placeholder="t('搜索武器（仅中文支持拼音/首字母）...')" />
                </label>
                <div class="weapon-list match-weapon-grid match-source-grid">
                  <button
                    v-for="weapon in matchSourceList"
                    :key="weapon.name"
                    type="button"
                    class="weapon-item match-weapon-item"
                    :class="{
                      'is-selected': matchSourceName === weapon.name,
                      'rarity-6': weapon.rarity === 6,
                      'rarity-5': weapon.rarity === 5,
                      'rarity-4': weapon.rarity === 4,
                    }"
                    @click="selectMatchSource(weapon)"
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
                        :key="\`\${weapon.name}-match-character-\${index}\`"
                        class="weapon-avatar"
                        v-lazy-src="characterImageSrc(character)"
                        :alt="tTerm('character', character)"
                        loading="lazy"
                        decoding="async"
                        @error="handleCharacterImageError"
                      />
                    </div>
                    <div class="weapon-band"></div>
                    <div class="weapon-name">
                      <div class="weapon-title">{{ tTerm("weapon", weapon.name) }}</div>
                      <match-status-line
                        :weapon-name="weapon.name"
                        :t="t"
                        :is-weapon-owned="isWeaponOwned"
                        :is-essence-owned="isEssenceOwned"
                      ></match-status-line>
                    </div>
                  </button>
                </div>
              </section>
              <section class="panel match-panel" :class="{ 'panel-hidden': matchMobilePanel !== 'result' }">
                <div class="panel-title">
                  <h2>{{ t("词条对照") }}</h2>
                </div>
                <div class="match-info">
                  <div class="match-info-title">{{ t("功能说明") }}</div>
                  <p class="match-info-text">
                    {{
                      t(
                        "用于查找与目标武器相同词条的其他武器，帮助完成“终极武器奖章”的镀层条件（RANK 需要达到 25），可借助低星同词条武器提升潜能并补足第三词条等级。"
                      )
                    }}
                  </p>
                  <p class="match-info-text">
                    {{ t("此界面不支持修改武器/基质拥有状态；如需修改请前往“基质规划”。") }}
                  </p>
                </div>
                <div v-if="!matchSourceWeapon" class="empty-state match-empty">
                  <h2>{{ t("请选择一把武器") }}</h2>
                </div>
                <div v-else class="match-result">
                  <div class="match-selection">
                    <div class="match-selection-label">{{ t("已选武器") }}</div>
                    <div class="match-selection-card">
                      <div
                        class="weapon-item match-weapon-item match-selected-card is-selected"
                        :class="{
                          'rarity-6': matchSourceWeapon.rarity === 6,
                          'rarity-5': matchSourceWeapon.rarity === 5,
                          'rarity-4': matchSourceWeapon.rarity === 4,
                        }"
                      >
                        <div class="weapon-art">
                          <img
                            v-if="hasImage(matchSourceWeapon)"
                            class="weapon-figure"
                            v-lazy-src="weaponImageSrc(matchSourceWeapon)"
                            :alt="matchSourceWeapon.name"
                            loading="lazy"
                            decoding="async"
                          />
                          <span v-else class="weapon-fallback-large">
                            {{ matchSourceWeapon.rarity }}★
                          </span>
                        </div>
                        <div
                          v-if="weaponCharacters(matchSourceWeapon).length"
                          class="weapon-avatars"
                        >
                          <img
                            v-for="(character, index) in weaponCharacters(matchSourceWeapon)"
                            :key="\`\${matchSourceWeapon.name}-match-selected-\${index}\`"
                            class="weapon-avatar"
                            v-lazy-src="characterImageSrc(character)"
                            :alt="tTerm('character', character)"
                            loading="lazy"
                            decoding="async"
                            @error="handleCharacterImageError"
                          />
                        </div>
                        <div class="weapon-band"></div>
                        <div class="weapon-name">
                          <div class="weapon-title">
                            {{ tTerm("weapon", matchSourceWeapon.name) }}
                          </div>
                          <div class="weapon-type-subtitle">
                            {{ tTerm("type", matchSourceWeapon.type) }}
                          </div>
                          <match-status-line
                            :weapon-name="matchSourceWeapon.name"
                            :t="t"
                            :is-weapon-owned="isWeaponOwned"
                            :is-essence-owned="isEssenceOwned"
                          ></match-status-line>
                        </div>
                      </div>
                      <div class="scheme-weapon-attrs match-selection-attrs">
                        <span class="attr-value">{{ formatS1(matchSourceWeapon.s1) }}</span>
                        <span class="attr-value">{{ t(matchSourceWeapon.s2) }}</span>
                        <span class="attr-value">{{ t(matchSourceWeapon.s3) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="match-result-header">
                    <div class="match-result-title">{{ t("相同词条的武器") }}</div>
                    <div class="match-result-count">{{ matchResults.length }}</div>
                  </div>
                  <div v-if="!matchResults.length" class="match-empty">
                    {{ t("暂无匹配的武器") }}
                  </div>
                  <div v-else class="weapon-list match-weapon-grid match-result-grid">
                    <div
                      v-for="weapon in matchResults"
                      :key="weapon.name"
                      class="weapon-item match-weapon-item"
                      :class="{
                        'rarity-6': weapon.rarity === 6,
                        'rarity-5': weapon.rarity === 5,
                        'rarity-4': weapon.rarity === 4,
                      }"
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
                          :key="\`\${weapon.name}-match-result-\${index}\`"
                          class="weapon-avatar"
                          v-lazy-src="characterImageSrc(character)"
                          :alt="tTerm('character', character)"
                          loading="lazy"
                          decoding="async"
                          @error="handleCharacterImageError"
                        />
                      </div>
                      <div class="weapon-band"></div>
                      <div class="weapon-name">
                        <div class="weapon-title">{{ tTerm("weapon", weapon.name) }}</div>
                        <match-status-line
                          :weapon-name="weapon.name"
                          :t="t"
                          :is-weapon-owned="isWeaponOwned"
                          :is-essence-owned="isEssenceOwned"
                        ></match-status-line>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
          <div v-else key="gear-refining" class="view-shell planner-shell gear-refining-shell">
            <div class="mobile-tabs">
              <button
                class="mobile-tab"
                type="button"
                :class="{ active: gearRefiningMobilePanel === 'gears' }"
                @click="setGearRefiningMobilePanel('gears')"
              >
                {{ t("装备列表") }} <span class="count">{{ gearRefiningGearCount }}</span>
              </button>
              <button
                class="mobile-tab"
                type="button"
                :class="{ active: gearRefiningMobilePanel === 'recommend' }"
                @click="setGearRefiningMobilePanel('recommend')"
              >
                {{ t("精锻推荐") }}
                <span class="count">{{ selectedGearRefiningGear ? gearRefiningRecommendations.length : 0 }}</span>
              </button>
            </div>
            <gear-refining-list
              :t="t"
              :mobile-panel="gearRefiningMobilePanel"
              :query="gearRefiningQuery"
              :grouped-sets="gearRefiningGroupedSets"
              :selected-gear-name="selectedGearRefiningGearName"
              :is-set-collapsed="isGearRefiningSetCollapsed"
              :toggle-set-collapsed="toggleGearRefiningSetCollapsed"
              :select-gear="selectGearRefiningGear"
              :has-gear-image="hasGearRefiningGearImage"
              :gear-image-src="gearRefiningGearImageSrc"
              :on-gear-image-error="handleGearRefiningGearImageError"
              @update:query="gearRefiningQuery = $event"
            />
            <gear-refining-detail
              :t="t"
              :mobile-panel="gearRefiningMobilePanel"
              :selected-gear="selectedGearRefiningGear"
              :recommendations="gearRefiningRecommendations"
              :visible-recommendation-candidates="visibleRecommendationCandidates"
              :has-more-recommendation-candidates="hasMoreRecommendationCandidates"
              :is-recommendation-expanded="isRecommendationExpanded"
              :toggle-recommendation-expanded="toggleRecommendationExpanded"
              :has-gear-image="hasGearRefiningGearImage"
              :gear-image-src="gearRefiningGearImageSrc"
              :on-gear-image-error="handleGearRefiningGearImageError"
            />
          </div>
        </transition>
      </main>

      <footer class="site-footer" :aria-label="t('页脚')">
        <div class="site-footer-inner">
          <span class="footer-item">
            <span class="footer-label">{{ t("版权所有") }}</span>
            <span class="footer-value">© 2026 璨梦踏月</span>
          </span>
          <span class="footer-sep">·</span>
          <span class="footer-item">
            <span class="footer-label">{{ t("许可证") }}</span>
            <a
              class="footer-link"
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              target="_blank"
              rel="noreferrer"
            >
              AGPL-3.0
            </a>
          </span>
          <span class="footer-sep">·</span>
          <span class="footer-item">
            <span class="footer-label">{{ t("源码") }}</span>
            <a
              class="footer-link"
              href="https://github.com/cmyyx/endfield-essence-planner"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </span>
          <span class="footer-sep">·</span>
          <span class="footer-item">
            <span class="footer-label">{{ t("联系") }}</span>
            <a class="footer-link" href="mailto:contact@canmoe.com">
              contact@canmoe.com
            </a>
          </span>
          <span class="footer-item footer-item-disclaimer">
            <span class="footer-label">{{ t("素材声明") }}</span>
            <span class="footer-value footer-disclaimer-text">
              {{
                t(
                  "当前图片素材均来源于上海鹰角网络科技有限公司及其游戏《明日方舟：终末地》，相关版权归原权利方所有。本工具仅供玩家交流与辅助规划使用。"
                )
              }}
            </span>
          </span>
        </div>
      </footer>

      <button
        class="back-to-top"
        :class="{ 'is-visible': showBackToTop }"
        :title="t('回到顶部')"
        :aria-label="t('回到顶部')"
        @click="scrollToTop"
      >
        ↑
      </button>

      <transition name="fade-scale">
        <div v-if="showNotice" class="about-overlay notice-overlay" @click.self="closeNotice">
          <div v-if="contentLoading" class="about-card notice-card">{{ t("内容加载中...") }}</div>
          <div v-else class="about-card notice-card">
            <h3>{{ announcement.title }}</h3>
            <div class="notice-body">
              <p class="notice-meta">
                {{ t("更新日期：{date}", { date: announcement.date }) }}
              </p>
              <ul class="notice-list">
                <li
                  v-for="(item, index) in announcement.items"
                  :key="\`\${item}-\${index}\`"
                  v-html="formatNoticeItem(item)"
                ></li>
              </ul>
            </div>
            <div class="notice-footer">
              <div class="notice-qq" v-if="announcement.qqGroup">
                <a
                  class="ghost-button notice-join"
                  href="https://qm.qq.com/q/FBNLBtEPy8"
                  target="_blank"
                  rel="noopener"
                >
                  {{ t("加入 QQ 群") }}
                </a>
                <div class="notice-qq-info">
                  {{ t("QQ 群：{group}", { group: announcement.qqGroup }) }}
                  <span v-if="announcement.qqNote">（{{ announcement.qqNote }}）</span>
                </div>
              </div>
              <label class="notice-skip">
                <input type="checkbox" v-model="skipNotice" />
                {{ t("本次公告不再显示") }}
              </label>
              <div class="about-actions">
                <button class="ghost-button" @click="closeNotice">{{ t("关闭") }}</button>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showMigrationModal" class="about-overlay migration-overlay">
          <div class="about-card migration-card">
            <div class="migration-content">
              <h3>{{ t("检测到旧版武器标记数据") }}</h3>
            <p class="migration-warning-text">
              {{ t("建议尽快完成迁移或放弃旧数据，以免后续编辑时造成冲突或未来不再兼容该数据结构。") }}
            </p>
            <p class="migration-warning-text">
              {{ t("警告：该迁移功能尚未经过充分测试，可能存在异常或结果偏差。") }}
            </p>

            <div class="migration-preview">
              <div class="migration-preview-item">
                <span class="migration-preview-label">{{ t("旧数据条目") }}</span>
                <span class="migration-preview-value">{{ migrationPreview.totalLegacyCount }}</span>
              </div>
              <div class="migration-preview-item">
                <span class="migration-preview-label">{{ t("将影响条目") }}</span>
                <span class="migration-preview-value">{{ migrationPreview.effectCount }}</span>
              </div>
              <div class="migration-preview-item">
                <span class="migration-preview-label">{{ t("状态变更") }}</span>
                <span class="migration-preview-value">{{ migrationPreview.statusChangeCount }}</span>
              </div>
              <div class="migration-preview-item">
                <span class="migration-preview-label">{{ t("备注变更") }}</span>
                <span class="migration-preview-value">{{ migrationPreview.noteChangeCount }}</span>
              </div>
              <div class="migration-preview-item warn">
                <span class="migration-preview-label">{{ t("冲突条目") }}</span>
                <span class="migration-preview-value">{{ migrationPreview.conflictCount }}</span>
              </div>
            </div>

            <div class="migration-block migration-detail-block">
              <div class="migration-detail-head">
                <div class="migration-block-title">
                  {{ t("迁移预览详情") }}
                </div>
                <button class="ghost-button migration-detail-toggle" @click="toggleMigrationPreviewDetails">
                  {{ migrationPreviewExpanded ? t("收起详情") : t("展开详情") }}
                </button>
              </div>
              <p v-if="migrationModalScrollable" class="migration-scroll-tip">
                {{ t("提示：当前弹窗内容较多，可上下滑动查看。") }}
              </p>
              <div v-if="migrationPreviewExpanded" class="migration-detail-columns">
                <div class="migration-detail-column">
                  <div class="migration-detail-title">{{ t("冲突条目预览") }}</div>
                  <div v-if="!migrationPreview.conflictItems.length" class="migration-detail-empty">
                    {{ t("暂无冲突条目") }}
                  </div>
                  <ul v-else class="migration-detail-list">
                    <li
                      v-for="item in migrationPreview.conflictItems"
                      :key="'migration-conflict-preview-' + item.name"
                      class="migration-detail-item warn"
                    >
                      <div class="migration-detail-item-head">
                        <span class="migration-detail-name">{{ tTerm("weapon", item.name) }}</span>
                        <span class="migration-detail-tags">
                          <span
                            v-for="field in item.conflictFields"
                            :key="'migration-conflict-field-' + item.name + '-' + field"
                            class="migration-detail-chip warn"
                          >
                            {{
                              field === 'weaponOwned'
                                ? t("武器状态")
                                : field === 'essenceOwned'
                                ? t("基质状态")
                                : t("备注")
                            }}
                          </span>
                        </span>
                      </div>
                      <div v-if="item.changes && item.changes.length" class="migration-detail-changes">
                        <div
                          v-for="change in item.changes"
                          :key="'migration-conflict-change-' + item.name + '-' + change.field"
                          class="migration-detail-change-line"
                        >
                          <span class="migration-detail-change-field">
                            {{
                              change.field === 'weaponOwned'
                                ? t("武器状态")
                                : change.field === 'essenceOwned'
                                ? t("基质状态")
                                : t("备注")
                            }}
                          </span>
                          <span class="migration-detail-change-arrow">:</span>
                          <span class="migration-detail-change-value is-from">
                            {{
                              change.field === 'note'
                                ? (change.from || t("空"))
                                : change.field === 'essenceOwned'
                                ? (change.from ? t("基质已有") : t("基质未有"))
                                : (change.from ? t("已拥有") : t("未拥有"))
                            }}
                          </span>
                          <span class="migration-detail-change-arrow">→</span>
                          <span class="migration-detail-change-value is-to">
                            {{
                              change.field === 'note'
                                ? (change.to || t("空"))
                                : change.field === 'essenceOwned'
                                ? (change.to ? t("基质已有") : t("基质未有"))
                                : (change.to ? t("已拥有") : t("未拥有"))
                            }}
                          </span>
                        </div>
                      </div>
                      <div v-else class="migration-detail-meta-text">
                        {{ t("当前字段已存在，按冲突策略处理。") }}
                      </div>
                    </li>
                  </ul>
                </div>

                <div class="migration-detail-column">
                  <div class="migration-detail-title">{{ t("变更条目预览") }}</div>
                  <div v-if="!migrationPreview.effectItems.length" class="migration-detail-empty">
                    {{ t("暂无变更条目") }}
                  </div>
                  <ul v-else class="migration-detail-list">
                    <li
                      v-for="item in migrationPreview.effectItems"
                      :key="'migration-effect-preview-' + item.name"
                      class="migration-detail-item"
                    >
                      <div class="migration-detail-item-head">
                        <span class="migration-detail-name">{{ tTerm("weapon", item.name) }}</span>
                        <span v-if="item.conflict" class="migration-detail-chip warn">
                          {{ t("冲突") }}
                        </span>
                      </div>
                      <div class="migration-detail-changes">
                        <div
                          v-for="change in item.changes"
                          :key="'migration-effect-change-' + item.name + '-' + change.field"
                          class="migration-detail-change-line"
                        >
                          <span class="migration-detail-change-field">
                            {{
                              change.field === 'weaponOwned'
                                ? t("武器状态")
                                : change.field === 'essenceOwned'
                                ? t("基质状态")
                                : t("备注")
                            }}
                          </span>
                          <span class="migration-detail-change-arrow">:</span>
                          <span class="migration-detail-change-value is-from">
                            {{
                              change.field === 'note'
                                ? (change.from || t("空"))
                                : change.field === 'essenceOwned'
                                ? (change.from ? t("基质已有") : t("基质未有"))
                                : (change.from ? t("已拥有") : t("未拥有"))
                            }}
                          </span>
                          <span class="migration-detail-change-arrow">→</span>
                          <span class="migration-detail-change-value is-to">
                            {{
                              change.field === 'note'
                                ? (change.to || t("空"))
                                : change.field === 'essenceOwned'
                                ? (change.to ? t("基质已有") : t("基质未有"))
                                : (change.to ? t("已拥有") : t("未拥有"))
                            }}
                          </span>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="migration-block">
              <div class="migration-block-title">{{ t("迁移映射方案") }}</div>
              <div class="migration-option-grid">
                <button
                  class="ghost-button migration-option"
                  :class="{ 'is-active': migrationMappingMode === 'essenceOwned' }"
                  @click="migrationMappingMode = 'essenceOwned'"
                >
                  <span class="migration-option-title">{{ t("旧版“排除”标记 → 基质已拥有") }}</span>
                  <span class="migration-option-desc">{{ t("将旧版“排除”标记理解为“基质已有，不再需要刷基质”。") }}</span>
                </button>
                <button
                  class="ghost-button migration-option"
                  :class="{ 'is-active': migrationMappingMode === 'weaponUnowned' }"
                  @click="migrationMappingMode = 'weaponUnowned'"
                >
                  <span class="migration-option-title">{{ t("旧版“排除”标记 → 武器未拥有") }}</span>
                  <span class="migration-option-desc">{{ t("将旧版“排除”标记理解为“武器未拥有”，其余武器视为“武器已拥有”。") }}</span>
                </button>
              </div>
            </div>

            <div v-if="shouldShowConflictStrategy" class="migration-block">
              <div class="migration-block-title">
                {{ t("检测到冲突，请先选择冲突处理策略") }}
              </div>
              <div class="migration-option-grid">
                <button
                  v-for="option in migrationConflictOptions"
                  :key="'migration-conflict-' + option.value"
                  class="ghost-button migration-option"
                  :class="{ 'is-active': migrationConflictStrategy === option.value }"
                  @click="migrationConflictStrategy = option.value"
                >
                  <span class="migration-option-title">{{ t(option.label) }}</span>
                  <span class="migration-option-desc">{{ t(option.description) }}</span>
                </button>
              </div>
            </div>

            </div>

            <div class="about-actions migration-actions">
              <button
                class="about-button migration-action migration-action-warn"
                @click="openMigrationConfirm('apply')"
              >
                {{ t("开始迁移") }}
              </button>
              <button
                class="about-button migration-action migration-action-danger"
                @click="openMigrationConfirm('discard')"
              >
                {{ t("放弃旧数据") }}
              </button>
              <button
                class="ghost-button migration-action migration-action-secondary"
                @click="openMigrationConfirm('defer')"
              >
                {{ t("稍后再说") }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showMigrationConfirmModal" class="about-overlay migration-overlay migration-confirm-overlay">
          <div class="about-card migration-card migration-confirm-card">
            <div class="migration-content">
              <h3>
                {{
                  migrationConfirmAction === 'apply'
                    ? t("确认开始迁移？")
                    : migrationConfirmAction === 'discard'
                    ? t("确认放弃旧数据？")
                    : t("确认稍后再说？")
                }}
              </h3>

              <p class="migration-warning-text">
                {{ t("警告：该迁移功能尚未经过充分测试，可能存在异常或结果偏差。但仍建议尽快完成迁移或放弃旧数据。") }}
              </p>

              <div v-if="migrationConfirmAction === 'apply'" class="migration-confirm-summary">
                <div class="migration-confirm-row">
                  <span class="migration-confirm-label">{{ t("迁移映射方案") }}</span>
                  <span class="migration-confirm-value migration-confirm-highlight">
                    {{
                      migrationMappingMode === 'weaponUnowned'
                        ? t("旧版“排除”标记 → 武器未拥有")
                        : t("旧版“排除”标记 → 基质已拥有")
                    }}
                  </span>
                </div>
                <div v-if="shouldShowConflictStrategy" class="migration-confirm-row">
                  <span class="migration-confirm-label">{{ t("冲突处理策略") }}</span>
                  <span class="migration-confirm-value migration-confirm-highlight">
                    {{
                      migrationConflictStrategy === 'overwriteLegacy'
                        ? t("旧数据覆盖新数据")
                        : migrationConflictStrategy === 'keepCurrent'
                        ? t("保留新数据，跳过冲突")
                        : t("优先补全（推荐）")
                    }}
                  </span>
                </div>
              </div>

            </div>

            <div class="about-actions migration-actions">
              <button class="ghost-button migration-action migration-action-secondary" @click="closeMigrationConfirm">
                {{ t("取消") }}
              </button>
              <button
                class="about-button migration-action migration-action-danger"
                :disabled="migrationConfirmCountdown > 0"
                @click="confirmMigrationAction"
              >
                {{
                  migrationConfirmAction === 'apply'
                    ? t("确认迁移")
                    : migrationConfirmAction === 'discard'
                    ? t("确认放弃")
                    : t("确认稍后")
                }}
                <span v-if="migrationConfirmCountdown > 0">（{{ migrationConfirmCountdown }}s）</span>
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div
          v-if="showChangelog"
          class="about-overlay changelog-overlay"
          @click.self="showChangelog = false"
        >
          <div v-if="contentLoading" class="about-card notice-card">{{ t("内容加载中...") }}</div>
          <div v-else class="about-card changelog-card">
            <h3>{{ changelog.title }}</h3>
            <div class="changelog-body">
              <div v-if="!changelog.entries || !changelog.entries.length" class="empty">
                {{ t("暂无更新日志。") }}
              </div>
              <div
                v-else
                v-for="(entry, index) in changelog.entries"
                :key="entry.date || \`changelog-\${index}\`"
                class="changelog-section"
              >
                <div class="changelog-date">{{ entry.date }}</div>
                <ul class="changelog-list">
                  <li v-for="item in entry.items" :key="item">{{ item }}</li>
                </ul>
              </div>
            </div>
            <div class="about-actions">
              <button class="ghost-button" @click="showChangelog = false">{{ t("关闭") }}</button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
                <div v-if="showAbout" class="about-overlay about-overlay-main" @click.self="showAbout = false">
                  <div v-if="contentLoading" class="about-card notice-card">{{ t("内容加载中...") }}</div>
                  <div v-else class="about-card about-main">
                    <h3>{{ aboutContent.title }}</h3>
                    <div class="about-body">
              <p v-for="(line, index) in aboutContent.paragraphs" :key="\`about-line-\${index}\`">
                {{ line }}
              </p>
                      <p v-if="aboutContent.author">
                        {{ t("作者：{name}", { name: aboutContent.author }) }}
                      </p>
                      <div
                        class="about-material-note"
                        v-if="aboutContent.materialNotice || aboutContent.materialDisclaimer"
                      >
                        <h4>{{ t("素材说明与免责声明") }}</h4>
                        <p v-if="aboutContent.materialNotice">{{ t(aboutContent.materialNotice) }}</p>
                        <p v-if="aboutContent.materialDisclaimer" class="about-material-disclaimer">
                          {{ t(aboutContent.materialDisclaimer) }}
                        </p>
                      </div>
                      <div class="about-links" v-if="aboutContent.links && aboutContent.links.length">
                <a
                  v-for="link in aboutContent.links"
                  :key="link.href || link.text"
                  class="repo-link"
                  :href="link.href"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span class="repo-chip">{{ link.chip }}</span>
                  <span>{{ link.text }}</span>
                  <span class="repo-arrow">↗</span>
                </a>
              </div>
              <div class="about-thanks" v-if="aboutContent.thanks && aboutContent.thanks.length">
                <h4>{{ t("感谢") }}</h4>
                <ul class="about-thanks-list">
                  <li
                    v-for="(entry, index) in aboutContent.thanks"
                    :key="entry.name || \`about-thanks-\${index}\`"
                    class="about-thanks-item"
                  >
                    <div class="about-thanks-name">
                      <a v-if="entry.href" :href="entry.href" target="_blank" rel="noreferrer">
                        {{ entry.name }}
                        <span class="about-thanks-arrow">↗</span>
                      </a>
                      <span v-else>{{ entry.name }}</span>
                    </div>
                    <div v-if="entry.note" class="about-thanks-note">{{ entry.note }}</div>
                  </li>
                </ul>
              </div>
              <div
                class="about-sponsor"
                v-if="aboutContent.sponsor && aboutContent.sponsor.items && aboutContent.sponsor.items.length"
              >
                <h4>{{ t(aboutContent.sponsor.title || "赞助支持") }}</h4>
                <p v-if="aboutContent.sponsor.text" class="about-sponsor-text">
                  {{ t(aboutContent.sponsor.text) }}
                </p>
              <div class="about-sponsor-grid">
                <div
                  v-for="(item, index) in aboutContent.sponsor.items"
                  :key="item.label || item.src || \`about-sponsor-\${index}\`"
                  class="about-sponsor-item"
                >
                  <img
                    v-lazy-src="item.src"
                    :alt="item.label ? t(item.label) : ''"
                    loading="lazy"
                    decoding="async"
                  />
                  <div v-if="item.label" class="about-sponsor-label">
                    {{ t(item.label) }}
                  </div>
                </div>
              </div>
              <div
                v-if="aboutContent.sponsor.list && aboutContent.sponsor.list.length"
                class="about-sponsor-list"
              >
                <h5>{{ t("赞助列表") }}</h5>
                <ul class="about-sponsor-list-items">
                  <li
                    v-for="(entry, index) in aboutContent.sponsor.list"
                    :key="entry.name || \`about-sponsor-entry-\${index}\`"
                    class="about-sponsor-entry"
                  >
                    <div class="about-sponsor-entry-name">{{ entry.name }}</div>
                    <div
                      v-if="entry.amount || entry.date"
                      class="about-sponsor-entry-meta"
                    >
                      <span v-if="entry.amount" class="about-sponsor-entry-amount">
                        {{ entry.amount }}
                      </span>
                      <span v-if="entry.date" class="about-sponsor-entry-date">
                        {{ entry.date }}
                      </span>
                    </div>
                    <div v-if="entry.note" class="about-sponsor-entry-note">
                      {{ entry.note }}
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            </div>

            <div class="about-actions">
              <button class="ghost-button" @click="showAbout = false">{{ t("关闭") }}</button>
            </div>
          </div>
        </div>
      </transition>

      `);
})();
