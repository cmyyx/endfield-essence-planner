(function () {
  window.__APP_TEMPLATE_MAIN_PARTS = window.__APP_TEMPLATE_MAIN_PARTS || [];
  window.__APP_TEMPLATE_MAIN_PARTS.push(`
                              {{ idx === 0 ? t("badge.item") : t("badge.item_2") }}
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
                    <div class="gear-empty" v-else>{{ t("badge.item_3") }}</div>
                  </div>
                </div>

                <div v-show="strategyCategory === 'guide' && strategyTab === 'team'" class="detail-panel">
                  <div class="detail-section">
                    <h3>{{ t("plan.item_8") }}</h3>
                    <p class="strategy-text">{{ (currentGuide && currentGuide.teamTips) || t("badge.item_4") }}</p>
                  </div>

                  <div class="detail-section">
                    <h3>{{ t("badge.item_5") }}</h3>
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
                                {{ t("badge.item_6") }}
                              </span>
                              <span v-if="entry.tag" class="team-badge muted">{{ entry.tag }}</span>
                            </div>
                            <div class="team-section">
                              <span class="team-label">{{ t("guide.item_5") }}</span>
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
                              <span class="team-label">{{ t("badge.item_7") }}</span>
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
                      <p class="empty-guide-text">{{ t("badge.item_8") }}</p>
                    </div>
                  </div>
                </div>

                <div v-show="strategyCategory === 'guide' && strategyTab === 'operation'" class="detail-panel">
                  <div class="detail-section">
                    <h3>{{ t("guide.item_11") }}</h3>
                    <p class="strategy-text">{{ (currentGuide && (currentGuide.operationTips || currentGuide.skillTips)) || t("badge.item_4") }}</p>
                  </div>
                </div>
              </div>

            </div>
              </div>
            </transition>
          </div>

          <div v-else-if="currentView === 'rerun-ranking'" key="rerun-ranking" class="view-shell rerun-ranking-view">
            <section class="panel rerun-ranking-panel">
              <div class="panel-title">
                <h2>{{ t("nav.rerun_ranking") }}</h2>
              </div>
              <div v-if="!hasRerunRankingRows" class="rerun-ranking-empty">
                {{ t("rerun.no_rerun_ranking_data") }}
              </div>
              <div v-else class="rerun-ranking-list">
                <article
                  v-for="row in rerunRankingRows"
                  :key="row.characterName"
                  class="rerun-ranking-card"
                >
                  <div class="rerun-ranking-avatar-shell">
                    <img
                      v-if="row.avatarSrc"
                      class="rerun-ranking-avatar"
                      v-lazy-src="row.avatarSrc"
                      :alt="tTerm('character', row.characterName)"
                      loading="lazy"
                      decoding="async"
                      @error="handleCharacterImageError"
                    />
                    <div v-else class="rerun-ranking-avatar-fallback">
                      {{ tTerm("character", row.characterName).slice(0, 1) }}
                    </div>
                  </div>
                  <div class="rerun-ranking-main">
                    <div class="rerun-ranking-name">{{ tTerm("character", row.characterName) }}</div>
                    <div class="rerun-ranking-meta">
                      {{ t("badge.gap_days_days", { days: row.hasEndedHistory ? row.gapDays : "-" }) }}
                    </div>
                    <div class="rerun-ranking-meta">
                      {{ t("badge.count_count", { count: row.rerunCount > 0 ? row.rerunCount : "-" }) }}
                    </div>
                    <div class="rerun-ranking-meta">
                      {{
                        t("badge.last_date", {
                          date: row.hasEndedHistory
                            ? new Date(row.lastEndMs).toLocaleDateString(locale || undefined)
                            : "-",
                        })
                      }}
                    </div>
                    <div class="rerun-ranking-meta" v-if="row.isUpcoming && row.nextStartMs">
                      {{
                        t("rerun.expected_start_date", {
                          date: new Date(row.nextStartMs).toLocaleDateString(locale || undefined),
                        })
                      }}
                    </div>
                  </div>
                  <span v-if="row.isActive" class="weapon-up-chip rerun-ranking-up-chip">
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
                  </span>
                  <span v-else-if="row.isUpcoming" class="weapon-up-chip rerun-ranking-up-chip rerun-ranking-upcoming-chip is-fallback">
                    <span class="weapon-up-chip-fallback">{{ t("rerun.upcoming_badge") }}</span>
                  </span>
                </article>
              </div>
            </section>
          </div>

          <div v-else-if="currentView === 'match'" key="match" class="view-shell match-view">
            <div class="mobile-tabs">
              <button
                class="mobile-tab"
                :class="{ active: matchMobilePanel === 'source' }"
                @click="matchMobilePanel = 'source'"
              >
                {{ t("nav.weapons") }} <span class="count">{{ matchSourceList.length }}</span>
              </button>
              <button
                class="mobile-tab"
                :class="{ active: matchMobilePanel === 'result' }"
                @click="matchMobilePanel = 'result'"
              >
                {{ t("nav.trait_match") }} <span class="count">{{ matchResults.length }}</span>
              </button>
            </div>
            <div class="mobile-hint">
              {{ t("badge.on_mobile_switch_between_weapon_selection_trait_match_vi") }}
            </div>
            <div class="match-grid">
              <section class="panel match-panel" :class="{ 'panel-hidden': matchMobilePanel !== 'source' }">
                <div class="panel-title">
                  <h2>{{ t("nav.weapons") }}</h2>
                </div>
                <label class="search-box match-search">
                  <span>🔍</span>
                  <input v-model="matchQuery" :placeholder="t('badge.search_weapons')" />
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
                  <h2>{{ t("nav.trait_match") }}</h2>
                </div>
                <div class="match-info">
                  <div class="match-info-title">{{ t("badge.purpose") }}</div>
                  <p class="match-info-text">
                    {{
                      t(
                        "badge.find_other_weapons_with_identical_traits_to_meet_the_ult"
                      )
                    }}
                  </p>
                  <p class="match-info-text">
                    {{ t("badge.this_page_does_not_support_editing_weapon_essence_owners") }}
                  </p>
                </div>
                <div v-if="!matchSourceWeapon" class="empty-state match-empty">
                  <h2>{{ t("badge.pick_a_weapon") }}</h2>
                </div>
                <div v-else class="match-result">
                  <div class="match-selection">
                    <div class="match-selection-label">{{ t("badge.selected_weapon") }}</div>
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
                        <span class="attr-value">{{ tTerm("s2", matchSourceWeapon.s2) }}</span>
                        <span class="attr-value">{{ tTerm("s3", matchSourceWeapon.s3) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="match-result-header">
                    <div class="match-result-title">{{ t("badge.weapons_with_identical_traits") }}</div>
                    <div class="match-result-count">{{ matchResults.length }}</div>
                  </div>
                  <div v-if="!matchResults.length" class="match-empty">
                    {{ t("badge.no_matching_weapons") }}
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
                {{ t("badge.gear_list") }} <span class="count">{{ gearRefiningGearCount }}</span>
              </button>
              <button
                class="mobile-tab"
                type="button"
                :class="{ active: gearRefiningMobilePanel === 'recommend' }"
                @click="setGearRefiningMobilePanel('recommend')"
              >
                {{ t("badge.refining_recommendations") }}
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

      <footer class="site-footer" :aria-label="t('badge.footer')">
        <div class="site-footer-inner">
          <span class="footer-item">
            <span class="footer-label">{{ t("badge.copyright") }}</span>
            <span class="footer-value">© 2026 璨梦踏月</span>
          </span>
          <span class="footer-sep">·</span>
          <span class="footer-item">
            <span class="footer-label">{{ t("badge.license") }}</span>
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
            <span class="footer-label">{{ t("badge.source") }}</span>
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
            <span class="footer-label">{{ t("badge.contact") }}</span>
            <a class="footer-link" href="mailto:contact@canmoe.com">
              contact@canmoe.com
            </a>
          </span>
          <span class="footer-item footer-item-disclaimer">
            <span class="footer-label">{{ t("badge.item_9") }}</span>
            <span class="footer-value footer-disclaimer-text">
              {{
                t(
                  "badge.item_10"
                )
              }}
            </span>
          </span>
        </div>
      </footer>

      <button
        class="back-to-top"
        :class="{ 'is-visible': showBackToTop }"
        :title="t('badge.item_11')"
        :aria-label="t('badge.item_11')"
        @click="scrollToTop"
      >
        ↑
      </button>

      <transition name="fade-scale">
        <div v-if="showNotice" class="about-overlay notice-overlay" @click.self="closeNotice">
          <div v-if="contentLoading" class="about-card notice-card">{{ t("badge.item_12") }}</div>
          <div v-else class="about-card notice-card">
            <h3>{{ announcement.title }}</h3>
            <div class="notice-body">
              <p class="notice-meta">
                {{ t("badge.updated_date", { date: announcement.date }) }}
              </p>
              <ul class="notice-list">
                <li
                  v-for="(item, index) in announcement.items"
                  :key="\`\${item}-\${index}\`"
                >
                  <template
                    v-for="(token, tokenIndex) in formatNoticeItem(item)"
                    :key="\`\${index}-\${tokenIndex}-\${token.type}\`"
                  >
                    <a
                      v-if="token.type === 'link'"
                      class="notice-link"
                      :href="token.href"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {{ token.text }}
                    </a>
                    <mark v-else-if="token.type === 'mark'" class="notice-highlight">
                      {{ token.text }}
                    </mark>
                    <span v-else>{{ token.text }}</span>
                  </template>
                </li>
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
                  {{ t("badge.join_qq_group") }}
                </a>
                <div class="notice-qq-info">
                  {{ t("badge.qq_group_group", { group: announcement.qqGroup }) }}
                  <span v-if="announcement.qqNote">（{{ announcement.qqNote }}）</span>
                </div>
              </div>
              <label class="notice-skip">
                <input type="checkbox" v-model="skipNotice" />
                {{ t("badge.don_t_show_this_announcement_again") }}
              </label>
              <div class="about-actions">
                <button class="ghost-button" @click="closeNotice">{{ t("plan_config.close") }}</button>
              </div>
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
          <div v-if="contentLoading" class="about-card notice-card">{{ t("badge.item_12") }}</div>
          <div v-else class="about-card changelog-card">
            <h3>{{ changelog.title }}</h3>
            <div class="changelog-body">
              <div v-if="!changelog.entries || !changelog.entries.length" class="empty">
                {{ t("badge.no_changelog_yet") }}
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
              <button class="ghost-button" @click="showChangelog = false">{{ t("plan_config.close") }}</button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
                <div v-if="showAbout" class="about-overlay about-overlay-main" @click.self="showAbout = false">
                  <div v-if="contentLoading" class="about-card notice-card">{{ t("badge.item_12") }}</div>
                  <div v-else class="about-card about-main">
                    <h3>{{ aboutContent.title }}</h3>
                    <div class="about-body">
              <p v-for="(line, index) in aboutContent.paragraphs" :key="\`about-line-\${index}\`">
                {{ line }}
              </p>
                      <p v-if="aboutContent.author">
                        {{ t("badge.author_name", { name: aboutContent.author }) }}
                      </p>
                      <div
                        class="about-material-note"
                        v-if="aboutContent.materialNotice || aboutContent.materialDisclaimer"
                      >
                        <h4>{{ t("badge.item_14") }}</h4>
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
                <h4>{{ t("badge.thanks") }}</h4>
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
                <h5>{{ t("badge.sponsors") }}</h5>
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
              <button class="ghost-button" @click="showAbout = false">{{ t("plan_config.close") }}</button>
            </div>
          </div>
        </div>
      </transition>

      `);
})();
