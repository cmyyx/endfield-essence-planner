(function () {
  window.__APP_TEMPLATE_MAIN_PARTS = window.__APP_TEMPLATE_MAIN_PARTS || [];
  window.__APP_TEMPLATE_MAIN_PARTS.push(`
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
                    <div v-if="row.hasEndedHistory" class="rerun-ranking-gap-bar">
                      <span
                        class="rerun-ranking-gap-bar-fill"
                        :style="{ width: (row.gapRatio * 100) + '%' }"
                      ></span>
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
                      <div class="weapon-title">
                        <span class="weapon-title-text">{{ tTerm("weapon", weapon.name) }}</span>
                      </div>
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
                            <span class="weapon-title-text">
                              {{ tTerm("weapon", matchSourceWeapon.name) }}
                            </span>
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
                        <div class="weapon-title">
                          <span class="weapon-title-text">{{ tTerm("weapon", weapon.name) }}</span>
                        </div>
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
          </template>
          <div v-else key="equip-refining" class="view-shell planner-shell equip-refining-shell">
            <div
              v-if="isViewBundleLoading('equip-refining') || isViewBundleFailed('equip-refining')"
              class="panel view-load-panel"
            >
              <div v-if="isViewBundleLoading('equip-refining')" class="empty-state view-load-state">
                <h2>{{ t("error.view_loading_title") }}</h2>
                <p>{{ t("error.view_loading_summary") }}</p>
              </div>
              <div v-else class="empty-state view-load-state">
                <h2>{{ t("error.view_load_failed_title") }}</h2>
                <p>{{ t("error.view_load_failed_summary") }}</p>
          <button class="ghost-button" @click="retryViewLoad('equip-refining')">
            {{ t("action_retry") }}
          </button>
          <button class="ghost-button" @click="refreshPage">
            {{ t("action_refresh") }}
          </button>
              </div>
            </div>
            <template v-else>
            <div class="mobile-tabs">
              <button
                class="mobile-tab"
                type="button"
                :class="{ active: equipRefiningMobilePanel === 'equips' }"
                @click="setEquipRefiningMobilePanel('equips')"
              >
                {{ t("badge.equip_list") }} <span class="count">{{ equipRefiningEquipCount }}</span>
              </button>
              <button
                class="mobile-tab"
                type="button"
                :class="{ active: equipRefiningMobilePanel === 'recommend' }"
                @click="setEquipRefiningMobilePanel('recommend')"
              >
                {{ t("badge.refining_recommendations") }}
                <span class="count">{{ selectedEquipRefiningEquip ? equipRefiningRecommendations.length : 0 }}</span>
              </button>
            </div>
            <equip-refining-list
              :t="t"
              :mobile-panel="equipRefiningMobilePanel"
              :query="equipRefiningQuery"
              :filter-sub1="equipRefiningFilterSub1"
              :filter-sub2="equipRefiningFilterSub2"
              :filter-special="equipRefiningFilterSpecial"
              :filter-option-entries="equipRefiningFilterOptionEntries"
              :filter-panel-collapsed="equipRefiningFilterPanelCollapsed"
              :grouped-sets="equipRefiningGroupedSets"
              :selected-equip-name="selectedEquipRefiningEquipName"
              :is-set-collapsed="isEquipRefiningSetCollapsed"
              :toggle-set-collapsed="toggleEquipRefiningSetCollapsed"
              :toggle-filter-value="toggleEquipRefiningFilterValue"
              :clear-filters="clearEquipRefiningFilters"
              :toggle-filter-panel-collapsed="toggleEquipRefiningFilterPanelCollapsed"
              :select-equip="selectEquipRefiningEquip"
              :has-equip-image="hasEquipRefiningEquipImage"
              :equip-image-src="equipRefiningEquipImageSrc"
              :on-equip-image-error="handleEquipRefiningEquipImageError"
              @update:query="equipRefiningQuery = $event"
            />
            <equip-refining-detail
              :t="t"
              :mobile-panel="equipRefiningMobilePanel"
              :selected-equip="selectedEquipRefiningEquip"
              :recommendations="equipRefiningRecommendations"
              :visible-recommendation-candidates="visibleRecommendationCandidates"
              :has-more-recommendation-candidates="hasMoreRecommendationCandidates"
              :is-recommendation-expanded="isRecommendationExpanded"
              :toggle-recommendation-expanded="toggleRecommendationExpanded"
              :has-equip-image="hasEquipRefiningEquipImage"
              :equip-image-src="equipRefiningEquipImageSrc"
              :on-equip-image-error="handleEquipRefiningEquipImageError"
            />
          </template>
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
            <a class="footer-link" href="mailto:admin@canmoe.com">
              admin@canmoe.com
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
      <footer v-if="showIcpFooter" class="icp-footer">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
          {{ icpNumber }}
        </a>
      </footer>
    </div>
    <div
      v-else
      key="background"
      class="background-view"
      role="region"
      :aria-label="t('nav.background_view')"
    ></div>
  </transition>

      <transition name="fade-scale">
        <div
          v-if="showSyncModal"
          class="about-overlay sync-overlay"
          @pointerdown.self="beginOverlayPointerClose('sync-modal', $event)"
          @pointerup.self="finishOverlayPointerClose('sync-modal', closeSyncModal, $event)"
          @pointercancel.self="cancelOverlayPointerClose('sync-modal')"
        >
          <div class="about-card notice-card sync-card">
            <!-- 极简登录卡片 -->
            <div v-if="!syncAuthenticated" class="sync-login-card">
              <!-- 标题区域 -->
              <div class="sync-login-header">
                <h2 class="sync-login-title">{{ syncAuthMode === 'login' ? t("sync.login_title") : t("sync.register_title") }}</h2>
                <p class="sync-login-subtitle">{{ syncAuthMode === 'login' ? t("sync.login_subtitle") : t("sync.register_subtitle") }}</p>
              </div>

              <!-- 登录/注册切换标签 -->
              <div class="sync-auth-tabs-minimal">
                <button
                  class="sync-tab-button"
                  :class="{ 'is-active': syncAuthMode === 'login' }"
                  :disabled="syncBusy || syncSessionChecking || syncFrontendBlocked"
                  @click="syncAuthMode = 'login'"
                >
                  {{ t("sync.login_tab") }}
                </button>
                <button
                  class="sync-tab-button"
                  :class="{ 'is-active': syncAuthMode === 'register' }"
                  :disabled="syncBusy || syncSessionChecking || syncFrontendBlocked"
                  @click="syncAuthMode = 'register'"
                >
                  {{ t("sync.register_tab") }}
                </button>
              </div>

              <!-- 错误/提示信息 -->
              <div v-if="syncFrontendBlocked" class="sync-error-banner">
                <span>{{ syncFrontendBlockedMessage }}</span>
              </div>

              <!-- 登录表单 -->
              <form class="sync-form" @submit.prevent="submitSyncAuth">
                <!-- 用户名（仅注册模式） -->
                <div v-if="syncAuthMode === 'register'" class="sync-field-group">
                  <label class="sync-label" for="sync-username">{{ t("sync.username_label") }}</label>
                  <input
                    id="sync-username"
                    v-model.trim="syncUsernameInput"
                    class="sync-input"
                    type="text"
                    autocomplete="username"
                    maxlength="24"
                    :placeholder="t('sync.username_hint')"
                    :disabled="syncBusy || syncSessionChecking || syncFrontendBlocked"
                  />
                </div>

                <!-- 账号/邮箱输入 -->
                <div class="sync-field-group">
                  <label class="sync-label" for="sync-account">
                    {{ syncAuthMode === 'login' ? t("sync.account_label") : t("sync.email_label") }}
                  </label>
                  <input
                    id="sync-account"
                    v-model.trim="syncAuthMode === 'login' ? syncAccountInput : syncEmailInput"
                    class="sync-input"
                    :type="syncAuthMode === 'login' ? 'text' : 'email'"
                    :autocomplete="syncAuthMode === 'login' ? 'username' : 'email'"
                    maxlength="191"
                    :placeholder="syncAuthMode === 'login' ? t('sync.account_hint') : t('sync.email_hint')"
                    :disabled="syncBusy || syncSessionChecking || syncFrontendBlocked"
                  />
                </div>

                <!-- 密码输入 + 忘记密码链接 -->
                <div class="sync-field-group">
                  <div class="sync-password-header">
                    <label class="sync-label" for="sync-password">{{ t("sync.password_label") }}</label>
                    <a
                      v-if="syncAuthMode === 'login'"
                      class="sync-forgot-link"
                      href="#"
                      @click.prevent="openSyncPasswordModal()"
                    >
                      {{ t("sync.forgot_password_action") }}
                    </a>
                  </div>
                  <input
                    id="sync-password"
                    v-model="syncPasswordInput"
                    class="sync-input"
                    type="password"
                    :autocomplete="syncAuthMode === 'register' ? 'new-password' : 'current-password'"
                    minlength="6"
                    :placeholder="t('sync.password_hint')"
                    :disabled="syncBusy || syncSessionChecking || syncFrontendBlocked"
                    @keydown.enter="submitSyncAuth"
                  />
                </div>

                <!-- 确认密码（仅注册模式） -->
                <div v-if="syncAuthMode === 'register'" class="sync-field-group">
                  <label class="sync-label" for="sync-password-confirm">{{ t("sync.password_confirm_label") }}</label>
                  <input
                    id="sync-password-confirm"
                    v-model="syncPasswordConfirmInput"
                    class="sync-input"
                    type="password"
                    autocomplete="new-password"
                    minlength="6"
                    :placeholder="t('sync.password_confirm_hint')"
                    :disabled="syncBusy || syncSessionChecking || syncFrontendBlocked"
                    @keydown.enter="submitSyncAuth"
                  />
                </div>

                <!-- 人机验证 Turnstile -->
                <div v-if="syncTurnstileEnabled" class="sync-field-group sync-turnstile-field">
                  <label class="sync-label">{{ t("sync.turnstile_label") }}</label>
                  <div
                    class="sync-turnstile-container"
                    :class="{
                      'is-loading': syncTurnstileLoading,
                      'is-unavailable': syncTurnstileUnavailable,
                      'is-warning': syncTurnstileMessageTone === 'warning',
                      'is-error': syncTurnstileMessageTone === 'error'
                    }"
                  >
                    <div
                      v-if="!syncTurnstileMounted"
                      class="sync-turnstile-placeholder"
                    >
                      {{
                        syncTurnstileLoading
                          ? t("sync.turnstile_loading")
                          : (syncTurnstileUnavailable ? t("sync.error_turnstile_unavailable") : t("sync.turnstile_placeholder"))
                      }}
                    </div>
                    <div ref="syncTurnstileRef" class="sync-turnstile-widget"></div>
                  </div>
                  <div
                    v-if="syncTurnstileMessage"
                    class="sync-hint-text"
                    :class="{ 'is-warning': syncTurnstileMessageTone === 'warning', 'is-error': syncTurnstileMessageTone === 'error' }"
                  >
                    {{ syncTurnstileMessage }}
                  </div>
                </div>

                <!-- 表单错误提示 -->
                <div v-if="syncError || syncNotice" class="sync-form-feedback">
                  <div v-if="syncError" class="sync-error-message">
                    {{ syncError }}
                    <details v-if="syncErrorDetails" class="sync-error-details">
                      <summary>{{ t("button.view_details") }}</summary>
                      <pre>{{ syncErrorDetails }}</pre>
                    </details>
                  </div>
                  <div v-else-if="syncNotice" class="sync-notice-message">{{ syncNotice }}</div>
                </div>

                <!-- 登录/注册提交按钮 -->
                <button
                  type="submit"
                  class="sync-submit-btn"
                  :disabled="syncBusy || syncSessionChecking || syncFrontendBlocked || syncTurnstileLoading || !syncTurnstileReadyToSubmit"
                >
                  {{ syncBusy ? (syncAuthMode === 'register' ? t("sync.registering_action") : t("sync.logging_in_action")) : (syncAuthMode === 'register' ? t("sync.register_action") : t("sync.login_action")) }}
                </button>
              </form>

              <!-- 底部辅助提示 -->
              <p class="sync-footer-hint">{{ t("sync.credentials_hint") }}</p>
            </div>

            <!-- 已登录状态卡片 -->
            <div v-if="syncAuthenticated" class="sync-logged-in-card">
              <div class="sync-user-info">
                <div class="sync-avatar">{{ syncUser && syncUser.username ? syncUser.username.slice(0, 1) : "?" }}</div>
                <div class="sync-user-details">
                  <h3 class="sync-username">{{ syncUser && syncUser.username ? syncUser.username : "-" }}</h3>
                  <p class="sync-account-id">{{ t("sync.account_id_hint", { id: syncUser && syncUser.id != null ? syncUser.id : "-" }) }}</p>
                </div>
              </div>

              <div class="sync-actions-grid">
                <button class="sync-action-btn primary" :disabled="syncBusy || syncFrontendBlocked" @click="performManualSync">
                  {{ t("sync.manual_sync_action") }}
                </button>
                <button class="sync-action-btn ghost" :disabled="syncBusy || syncFrontendBlocked" @click="logoutSync">
                  {{ t("sync.logout_action") }}
                </button>
              </div>

              <!-- 设备信息（极小文字） -->
              <div class="sync-device-hint">
                {{ t("sync.current_device_summary") }} · {{ t("sync.summary_marks", { count: syncLocalSummary.marksCount }) }}
              </div>
            </div>

            <!-- 本地开发折叠面板 -->
            <div v-if="syncShowDevPanel" class="sync-dev-accordion">
              <button
                class="sync-dev-toggle"
                type="button"
                @click="syncDevExpanded = !syncDevExpanded"
              >
                <svg class="sync-dev-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9V5h2v4h4v2h-4v4H9v-4H5V9h4z"/>
                </svg>
                <span>{{ t("sync.dev_settings_title") }}</span>
                <svg class="sync-chevron" :class="{ 'is-expanded': syncDevExpanded }" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 7l3 3 3-3"/>
                </svg>
              </button>
              <div v-show="syncDevExpanded" class="sync-dev-content">
                <div class="sync-auth-field">
                  <label class="secondary-label">{{ t("sync.dev_api_base_label") }}</label>
                  <input
                    v-model.trim="syncApiBaseInput"
                    class="secondary-input"
                    type="text"
                    :placeholder="t('sync.dev_api_base_placeholder')"
                  />
                </div>
                <div class="sync-auth-field">
                  <label class="secondary-label">{{ t("sync.dev_header_name_label") }}</label>
                  <input
                    v-model.trim="syncDevHeaderNameInput"
                    class="secondary-input"
                    type="text"
                    :placeholder="t('sync.dev_header_name_placeholder')"
                  />
                </div>
                <div class="sync-auth-field">
                  <label class="secondary-label">{{ t("sync.dev_header_value_label") }}</label>
                  <input
                    v-model.trim="syncDevHeaderValueInput"
                    class="secondary-input"
                    type="text"
                    :placeholder="t('sync.dev_header_value_placeholder')"
                  />
                </div>
                <div class="secondary-actions">
                  <button class="ghost-button" :disabled="syncBusy" @click="saveSyncDevSettings">
                    {{ t("sync.save_dev_settings") }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 冲突处理面板（保持原逻辑） -->
            <div v-if="syncAuthenticated && syncConflictDetected" class="secondary-item sync-conflict-panel">
              <div class="secondary-label">{{ t("sync.conflict_title") }}</div>
              <div class="secondary-hint">{{ t("sync.conflict_summary") }}</div>
              <div class="sync-summary-grid sync-conflict-columns">
                <div class="sync-summary-card sync-conflict-column">
                  <div class="secondary-label">{{ t("sync.current_device_summary") }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_marks", { count: syncLocalSummary.marksCount }) }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_custom_weapons", { count: syncLocalSummary.customWeaponsCount }) }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_selected", { count: syncLocalSummary.selectedCount }) }}</div>
                  <div class="secondary-actions sync-conflict-column-actions">
                    <button
                      class="ghost-button sync-conflict-action"
                      :disabled="syncBusy || syncFrontendBlocked"
                      @click="resolveSyncConflictUseLocal"
                    >
                      {{ t("sync.conflict_keep_local_action") }}
                    </button>
                  </div>
                </div>
                <div class="sync-summary-card sync-conflict-column">
                  <div class="secondary-label">{{ t("sync.remote_summary") }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_marks", { count: syncConflictCurrentSummary.marksCount }) }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_custom_weapons", { count: syncConflictCurrentSummary.customWeaponsCount }) }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_selected", { count: syncConflictCurrentSummary.selectedCount }) }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_version", { version: syncConflictCurrentSummary.version }) }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_updated_at", { time: formatSyncDateTime(syncConflictCurrentSummary.updatedAt) || "-" }) }}</div>
                  <div class="secondary-actions sync-conflict-column-actions">
                    <button
                      class="ghost-button sync-conflict-action"
                      :disabled="syncBusy || syncFrontendBlocked"
                      @click="resolveSyncConflictUseServer"
                    >
                      {{ t("sync.conflict_keep_remote_action") }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 权益管理面板（已登录后显示） -->
            <div v-if="syncAuthenticated" class="secondary-item sync-status-card">
              <div class="secondary-label">{{ t("sync.account_rights_title") }}</div>
              <div class="sync-summary-grid">
                <div class="sync-summary-card">
                  <div class="secondary-label">{{ t("sync.rights_plan_free_title") }}</div>
                  <div class="secondary-hint">{{ t("sync.rights_plan_free_desc") }}</div>
                </div>
                <div class="sync-summary-card">
                  <div class="secondary-label">{{ t("sync.rights_plan_trial_title") }}</div>
                  <div class="secondary-hint">{{ t("sync.rights_plan_trial_desc") }}</div>
                </div>
                <div class="sync-summary-card">
                  <div class="secondary-label">{{ t("sync.rights_plan_member_title") }}</div>
                  <div class="secondary-hint">{{ t("sync.rights_plan_member_desc") }}</div>
                </div>
              </div>
              <div class="secondary-actions">
                <button class="ghost-button" @click="showSyncRightsDetails = !showSyncRightsDetails">
                  {{ showSyncRightsDetails ? t("sync.hide_rights_details_action") : t("sync.show_rights_details_action") }}
                </button>
              </div>
              <!-- 权益详情展开内容（保持原有复杂结构） -->
              <div v-if="showSyncRightsDetails" class="sync-rights-table-wrap">
                <!-- ... 保持原有的权益表格和支付表单不变 ... -->
                <table class="sync-rights-table">
                  <thead>
                    <tr>
                      <th>{{ t("sync.rights_compare_feature") }}</th>
                      <th>{{ t("sync.rights_plan_free_title") }}</th>
                      <th>{{ t("sync.rights_plan_member_title") }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{{ t("sync.rights_feature_manual_sync") }}</td>
                      <td>{{ t("sync.rights_value_supported") }}</td>
                      <td>{{ t("sync.rights_value_supported") }}</td>
                    </tr>
                    <tr>
                      <td>{{ t("sync.rights_feature_auto_sync") }}</td>
                      <td class="sync-rights-value-negative">{{ t("sync.rights_value_limited") }}</td>
                      <td class="sync-rights-value-positive">{{ t("sync.rights_value_supported") }}</td>
                    </tr>
                    <tr>
                      <td>{{ t("sync.rights_feature_custom_weapon") }}</td>
                      <td class="sync-rights-value-negative">{{ t("sync.rights_value_limited") }}</td>
                      <td class="sync-rights-value-positive">{{ t("sync.rights_value_supported") }}</td>
                    </tr>
                    <tr>
                      <td>{{ t("sync.rights_feature_ad_free") }}</td>
                      <td class="sync-rights-value-negative">{{ t("sync.rights_value_limited") }}</td>
                      <td class="sync-rights-value-positive">{{ t("sync.rights_value_supported") }}</td>
                    </tr>
                    <tr>
                      <td>{{ t("sync.rights_feature_supporter_badge") }}</td>
                      <td class="sync-rights-value-negative">{{ t("sync.rights_value_none") }}</td>
                      <td class="sync-rights-value-positive">{{ t("sync.rights_value_supported") }}</td>
                    </tr>
                  </tbody>
                </table>
                <div class="sync-rights-payment-copy">{{ t("sync.membership_payment_guide") }}</div>
                <div class="sync-summary-grid sync-rights-pricing-grid">
                  <div class="sync-summary-card sync-rights-price-card">
                    <div class="secondary-label">{{ t("sync.membership_plan_month") }}</div>
                    <div class="sync-rights-price">¥5.00</div>
                  </div>
                  <div class="sync-summary-card sync-rights-price-card">
                    <div class="secondary-label">{{ t("sync.membership_plan_quarter") }}</div>
                    <div class="sync-rights-price">¥14.25</div>
                    <div class="sync-rights-price-discount">{{ t("sync.membership_plan_quarter_discount") }}</div>
                  </div>
                  <div class="sync-summary-card sync-rights-price-card sync-rights-plan-card-member">
                    <div class="secondary-label">{{ t("sync.membership_plan_year") }}</div>
                    <div class="sync-rights-price">¥54.00</div>
                    <div class="sync-rights-price-discount">{{ t("sync.membership_plan_year_discount") }}</div>
                  </div>
                </div>
                <div class="sync-summary-grid">
                  <div class="sync-summary-card sync-rights-qr-card">
                    <div class="secondary-label">{{ t("sync.payment.alipay") }}</div>
                    <img class="sync-payment-qr" src="./sponsors/alipay.jpg" alt="Alipay QR" />
                  </div>
                  <div class="sync-summary-card sync-rights-qr-card">
                    <div class="secondary-label">{{ t("sync.payment.wechat") }}</div>
                    <img class="sync-payment-qr" src="./sponsors/wechat2.png" alt="WeChat QR" />
                  </div>
                </div>
                <div class="sync-auth-field">
                  <label class="secondary-label">{{ t("sync.payment_channel_label") }}</label>
                  <select v-model="syncPaymentChannelInput" class="secondary-input" :disabled="syncBusy || syncFrontendBlocked">
                    <option value="">{{ t("please_select") }}</option>
                    <option value="alipay">{{ t("sync.payment.alipay") }}</option>
                    <option value="wechat">{{ t("sync.payment.wechat") }}</option>
                  </select>
                </div>
                <template v-if="syncPaymentChannelInput">
                <div class="sync-auth-field">
                  <label class="secondary-label">{{ t("sync.payment_reference_label") }}</label>
                  <input
                    v-model.trim="syncPaymentReferenceInput"
                    class="secondary-input"
                    type="text"
                    :placeholder="t('sync.payment_reference_hint')"
                    :disabled="syncBusy || syncFrontendBlocked"
                    @keydown.enter="submitPaymentClaim"
                  />
                </div>
                <div v-if="syncPaymentChannelInput === 'alipay'" class="sync-auth-field">
                  <label class="secondary-label">{{ t("sync.payment_merchant_order_label") }}</label>
                  <input
                    v-model.trim="syncPaymentMerchantOrderInput"
                    class="secondary-input"
                    type="text"
                    :placeholder="t('sync.payment_merchant_order_hint')"
                    :disabled="syncBusy || syncFrontendBlocked"
                    @keydown.enter="submitPaymentClaim"
                  />
                </div>
                <div class="sync-auth-field">
                  <label class="secondary-label">{{ t("sync.payment_paid_time_label") }}</label>
                  <input
                    v-model="syncPaymentPaidTimeInput"
                    class="secondary-input"
                    type="datetime-local"
                    :placeholder="t('sync.payment_paid_time_hint')"
                    :disabled="syncBusy || syncFrontendBlocked"
                  />
                </div>
                <div class="secondary-hint">{{ t("sync.payment_claim_review_hint") }}</div>
                <div class="secondary-hint">{{ t("sync.payment_claim_privacy_hint") }}</div>
                <div class="secondary-actions">
                  <button
                    class="about-button"
                    :disabled="syncBusy || syncFrontendBlocked || !(syncPaymentReferenceInput || '').trim() || (syncPaymentChannelInput === 'alipay' && !(syncPaymentMerchantOrderInput || '').trim())"
                    @click="submitPaymentClaim"
                  >
                    {{ t("sync.submit_payment_claim_action") }}
                  </button>
                  <span v-if="!(syncPaymentReferenceInput || '').trim()" class="secondary-hint">{{ t("sync.payment_reference_required_hint") }}</span>
                  <span v-else-if="syncPaymentChannelInput === 'alipay' && !(syncPaymentMerchantOrderInput || '').trim()" class="secondary-hint">{{ t("sync.error_merchant_order_required") }}</span>
                </div>
                </template>
                <div v-if="syncUserPaymentClaims && syncUserPaymentClaims.length" class="sync-claim-history">
                  <div class="secondary-label">{{ t("sync.payment_claim_history_title") }}</div>
                  <div class="sync-status-list">
                    <div v-for="claim in syncUserPaymentClaims" :key="claim.id" class="sync-summary-card sync-claim-history-item">
                      <div class="secondary-label">#{{ claim.id }} · {{ formatSyncPaymentChannelLabel(claim.channel) }} · {{ claim.external_reference }}</div>
                      <div v-if="claim.merchant_order_no" class="secondary-hint">{{ t("sync.payment_merchant_order_label") }}：{{ claim.merchant_order_no }}</div>
                      <div class="secondary-hint">{{ t("sync.payment_claim_status_label") }}：{{ formatSyncPaymentStatusLabel(claim.status) }}</div>
                      <div class="secondary-hint">{{ t("sync.payment_claim_submitted_at_label") }}：{{ formatClaimTime(claim.submitted_at) }}</div>
                      <div v-if="claim.expires_at" class="secondary-hint">{{ t("sync.payment_claim_expires_at_label") }}：{{ formatClaimTime(claim.expires_at) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 数据摘要面板（简化版） -->
            <div class="secondary-item">
              <div class="sync-summary-grid" :class="{ 'is-single': !syncAuthenticated }">
                <div class="sync-summary-card">
                  <div class="secondary-label">{{ t("sync.local_summary") }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_marks", { count: syncLocalSummary.marksCount }) }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_custom_weapons", { count: syncLocalSummary.customWeaponsCount }) }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_selected", { count: syncLocalSummary.selectedCount }) }}</div>
                  <div class="secondary-hint">{{ t("sync.last_synced_at", { time: syncLastSyncedDisplay || t("sync.never_synced") }) }}</div>
                </div>
                <div v-if="syncAuthenticated" class="sync-summary-card">
                  <div class="secondary-label">{{ t("sync.remote_summary") }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_marks", { count: syncRemoteSummary.marksCount }) }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_custom_weapons", { count: syncRemoteSummary.customWeaponsCount }) }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_selected", { count: syncRemoteSummary.selectedCount }) }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_version", { version: syncRemoteSummary.version }) }}</div>
                  <div class="secondary-hint">{{ t("sync.summary_updated_at", { time: syncRemoteUpdatedDisplay || "-" }) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div
          v-if="showSyncModal && syncConflictConfirmMode"
          class="about-overlay sync-overlay sync-conflict-confirm-overlay"
          @pointerdown.self="beginOverlayPointerClose('sync-conflict-confirm', $event)"
          @pointerup.self="finishOverlayPointerClose('sync-conflict-confirm', cancelSyncConflictConfirmation, $event)"
          @pointercancel.self="cancelOverlayPointerClose('sync-conflict-confirm')"
        >
          <div class="about-card notice-card sync-conflict-confirm-card">
            <h3>{{ t("sync.conflict_title") }}</h3>
            <div class="about-body">
              <div class="sync-feedback sync-feedback-warning">
                {{
                  syncConflictConfirmMode === "use-local"
                    ? t("sync.conflict_confirm_use_local")
                    : t("sync.conflict_confirm_use_remote")
                }}
              </div>
            </div>
            <div class="about-actions sync-conflict-confirm-actions">
              <button
                class="about-button"
                :disabled="syncBusy || syncFrontendBlocked"
                @click="confirmSyncConflictResolution"
              >
                {{ t("sync.conflict_confirm_apply") }}
              </button>
              <button
                class="ghost-button"
                :disabled="syncBusy || syncFrontendBlocked"
                @click="cancelSyncConflictConfirmation"
              >
                {{ t("sync.conflict_confirm_cancel") }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div
          v-if="showSyncModal && syncShowPasswordModal"
          class="about-overlay sync-overlay"
          @pointerdown.self="beginOverlayPointerClose('sync-password-modal', $event)"
          @pointerup.self="finishOverlayPointerClose('sync-password-modal', closeSyncPasswordModal, $event)"
          @pointercancel.self="cancelOverlayPointerClose('sync-password-modal')"
        >
          <div class="about-card notice-card sync-conflict-confirm-card">
            <h3>{{ t("sync.change_password_title") }}</h3>
            <div class="about-body">
              <div v-if="syncAuthenticated" class="sync-auth-tabs">
                <button
                  class="ghost-button"
                  :class="{ 'is-active': syncPasswordChangeMode === 'current' }"
                  :disabled="syncBusy || syncFrontendBlocked"
                  @click="syncPasswordChangeMode = 'current'"
                >
                  {{ t("sync.change_password_mode_current") }}
                </button>
                <button
                  class="ghost-button"
                  :class="{ 'is-active': syncPasswordChangeMode === 'reset_code' }"
                  :disabled="syncBusy || syncFrontendBlocked"
                  @click="syncPasswordChangeMode = 'reset_code'"
                >
                  {{ t("sync.change_password_mode_reset") }}
                </button>
              </div>
              <div class="secondary-hint">
                {{ syncAuthenticated && syncPasswordChangeMode === 'current' ? t("sync.change_password_signout_hint") : t(syncAuthenticated ? "sync.reset_password_logged_in_hint" : "sync.reset_password_logged_out_hint") }}
              </div>
                <div v-if="!syncAuthenticated" class="sync-auth-field">
                  <label class="secondary-label">{{ t("sync.email_label") }}</label>
                  <input
                    v-model.trim="syncPasswordResetRequestAccountInput"
                    class="secondary-input"
                    type="email"
                    autocomplete="email"
                    maxlength="191"
                    :disabled="syncBusy || syncFrontendBlocked || syncResetCodeRequestCooldownSeconds > 0"
                    @keydown.enter="requestSyncResetCode"
                  />
                  <div class="secondary-actions" style="margin-top:8px;">
                    <button class="ghost-button" :disabled="syncBusy || syncFrontendBlocked || syncResetCodeRequestCooldownSeconds > 0" @click="requestSyncResetCode">
                      {{ syncResetCodeRequestCooldownSeconds > 0 ? (t("sync.send_reset_code_action") + "（" + syncResetCodeRequestCooldownSeconds + "s）") : t("sync.send_reset_code_action") }}
                    </button>
                  </div>
                  <div class="secondary-hint">{{ t("sync.reset_password_request_account_hint") }}</div>
                </div>
                <div v-else-if="syncPasswordChangeMode === 'reset_code'" class="sync-auth-field">
                  <label class="secondary-label">{{ t("sync.current_email_label") }}</label>
                  <input
                    :value="syncUser && syncUser.email ? syncUser.email : t('sync.current_email_empty')"
                    class="secondary-input"
                    type="text"
                    disabled
                  />
                  <div class="secondary-actions" style="margin-top:8px;">
                    <button class="ghost-button" :disabled="syncBusy || syncFrontendBlocked || syncResetCodeRequestCooldownSeconds > 0" @click="requestSyncResetCode">
                      {{ syncResetCodeRequestCooldownSeconds > 0 ? (t("sync.send_reset_code_action") + "（" + syncResetCodeRequestCooldownSeconds + "s）") : t("sync.send_reset_code_action") }}
                    </button>
                  </div>
                  <div class="secondary-hint">{{ t("sync.reset_password_logged_in_request_hint") }}</div>
                </div>
              <div v-if="syncAuthenticated && syncPasswordChangeMode === 'current'" class="sync-auth-field">
                <label class="secondary-label">{{ t("sync.current_password_label") }}</label>
                <input
                  v-model="syncCurrentPasswordInput"
                  class="secondary-input"
                  type="password"
                  autocomplete="current-password"
                  :placeholder="t('sync.current_password_placeholder')"
                  :disabled="syncBusy || syncFrontendBlocked"
                  @keydown.enter="submitSyncPasswordChange"
                />
                <div class="secondary-hint">{{ t("sync.current_password_hint") }}</div>
              </div>
              <div v-if="!syncAuthenticated || syncPasswordChangeMode === 'reset_code'" class="sync-auth-field">
                <label class="secondary-label">{{ t("sync.reset_code_label") }}</label>
                <input
                  v-model.trim="syncResetCodeInput"
                  class="secondary-input"
                  type="text"
                  autocomplete="one-time-code"
                  :placeholder="t('sync.reset_code_placeholder')"
                  :disabled="syncBusy || syncFrontendBlocked"
                  @keydown.enter="submitSyncPasswordChange"
                />
                <div class="secondary-hint">{{ t("sync.reset_code_hint") }}</div>
              </div>
              <div class="sync-auth-field">
                <label class="secondary-label">{{ t("sync.new_password_label") }}</label>
                <input
                  v-model="syncNewPasswordInput"
                  class="secondary-input"
                  type="password"
                  autocomplete="new-password"
                  :placeholder="t('sync.new_password_placeholder')"
                  :disabled="syncBusy || syncFrontendBlocked"
                  @keydown.enter="submitSyncPasswordChange"
                />
                <div class="secondary-hint">{{ t("sync.new_password_hint") }}</div>
              </div>
              <div class="sync-auth-field">
                <label class="secondary-label">{{ t("sync.password_confirm_label") }}</label>
                <input
                  v-model="syncChangePasswordConfirmInput"
                  class="secondary-input"
                  type="password"
                  autocomplete="new-password"
                  :placeholder="t('sync.password_confirm_placeholder')"
                  :disabled="syncBusy || syncFrontendBlocked"
                  @keydown.enter="submitSyncPasswordChange"
                />
                <div class="secondary-hint">{{ t("sync.password_confirm_hint") }}</div>
              </div>
              <div v-if="syncPasswordChangeError || syncPasswordChangeNotice" class="sync-auth-feedback-stack">
                <div v-if="syncPasswordChangeError" class="sync-feedback sync-feedback-error">
                  {{ syncPasswordChangeError }}
                  <details v-if="syncErrorDetails" class="sync-error-details">
                      <summary>{{ t("button.view_details") }}</summary>
                    <pre>{{ syncErrorDetails }}</pre>
                  </details>
                </div>
                <div v-else-if="syncPasswordChangeNotice" class="sync-feedback sync-feedback-info">
                  {{ syncPasswordChangeNotice }}
                </div>
              </div>
            </div>
            <div class="about-actions">
              <button class="about-button" :disabled="syncBusy || syncFrontendBlocked" @click="submitSyncPasswordChange">
                {{ syncPasswordChangeMode === 'current' ? t("sync.change_password_action") : t("sync.reset_password_action") }}
              </button>
              <button class="ghost-button" :disabled="syncBusy || syncFrontendBlocked" @click="closeSyncPasswordModal">
                {{ t("plan_config.close") }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div
          v-if="showSyncModal && syncShowEmailModal"
          class="about-overlay sync-overlay"
          @pointerdown.self="beginOverlayPointerClose('sync-email-modal', $event)"
          @pointerup.self="finishOverlayPointerClose('sync-email-modal', closeSyncEmailModal, $event)"
          @pointercancel.self="cancelOverlayPointerClose('sync-email-modal')"
        >
          <div class="about-card notice-card sync-conflict-confirm-card">
            <h3>{{ t("sync.email_action_title") }}</h3>
            <div class="about-body">
              <div class="sync-auth-field">
                <label class="secondary-label">{{ t("sync.current_email_label") }}</label>
                <input
                  :value="syncUser && syncUser.email ? syncUser.email : t('sync.current_email_empty')"
                  class="secondary-input"
                  type="text"
                  disabled
                />
                <div class="secondary-hint">
                  <template v-if="syncUser && syncUser.email_verified === true">{{ t("sync.current_email_verified_hint") }}</template>
                  <template v-else-if="syncUser && syncUser.email">{{ t("sync.current_email_unverified_hint") }}</template>
                  <template v-else>{{ t("sync.current_email_empty_hint") }}</template>
                </div>
              </div>
              <div class="sync-auth-section">
                <div class="secondary-label">{{ t("sync.verify_email_section_title") }}</div>
                <div class="secondary-hint">{{ t("sync.email_verify_hint") }}</div>
                <div class="secondary-hint">{{ t("sync.email_receive_reminder") }}</div>
                <div class="sync-auth-field">
                  <label class="secondary-label">{{ t("sync.email_verification_code_label") }}</label>
                  <input
                    v-model.trim="syncEmailCodeInput"
                    class="secondary-input"
                    type="text"
                    :disabled="syncBusy || syncFrontendBlocked || !(syncUser && syncUser.email) || syncUser.email_verified === true"
                    @keydown.enter="submitSyncEmailAction('verify')"
                  />
                </div>
                <div class="secondary-actions">
                  <button class="ghost-button" :disabled="syncBusy || syncFrontendBlocked || syncVerificationCooldownSeconds > 0 || !(syncUser && syncUser.email) || syncUser.email_verified === true" @click="sendSyncVerificationCode">
                    {{ syncVerificationCooldownSeconds > 0 ? (t("sync.send_verification_code_action") + "（" + syncVerificationCooldownSeconds + "s）") : t("sync.send_verification_code_action") }}
                  </button>
                  <button class="about-button" :disabled="syncBusy || syncFrontendBlocked || syncVerificationSubmitCooldownSeconds > 0 || !(syncUser && syncUser.email) || syncUser.email_verified === true || !syncEmailCodeInput || !syncEmailCodeInput.trim()" @click="submitSyncEmailAction('verify')">
                    {{ t("sync.verify_email_action") }}
                  </button>
                </div>
              </div>
              <div class="sync-auth-section">
                <div class="secondary-label">{{ t("sync.change_email_section_title") }}</div>
                <div class="secondary-hint">{{ syncUser && syncUser.email_verified === false ? t("sync.email_change_unverified_hint") : t("sync.email_change_hint") }}</div>
                <div class="sync-auth-field">
                  <label class="secondary-label">{{ t("sync.new_email_label") }}</label>
                  <input
                    v-model.trim="syncEmailActionInput"
                    class="secondary-input"
                    type="email"
                    autocomplete="email"
                    :disabled="syncBusy || syncFrontendBlocked"
                    @keydown.enter="submitSyncEmailAction('change')"
                  />
                </div>
                <div class="secondary-actions">
                  <button class="about-button" :disabled="syncBusy || syncFrontendBlocked || syncEmailChangeCooldownSeconds > 0 || !syncEmailActionInput || !syncEmailActionInput.trim()" @click="submitSyncEmailAction('change')">
                    {{ syncEmailChangeCooldownSeconds > 0 ? (t("sync.change_email_action") + "（" + syncEmailChangeCooldownSeconds + "s）") : t("sync.change_email_action") }}
                  </button>
                </div>
              </div>
              <div v-if="syncEmailActionError || syncEmailActionNotice" class="sync-auth-feedback-stack">
                <div v-if="syncEmailActionError" class="sync-feedback sync-feedback-error">{{ syncEmailActionError }}</div>
                <div v-else-if="syncEmailActionNotice" class="sync-feedback sync-feedback-info">{{ syncEmailActionNotice }}</div>
              </div>
            </div>
            <div class="about-actions">
              <button class="ghost-button" :disabled="syncBusy || syncFrontendBlocked" @click="closeSyncEmailModal">
                {{ t("plan_config.close") }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div
          v-if="showCnSyncUnavailableModal"
          class="about-overlay notice-overlay"
          @pointerdown.self="beginOverlayPointerClose('cn-sync-unavailable-modal', $event)"
          @pointerup.self="finishOverlayPointerClose('cn-sync-unavailable-modal', closeCnSyncUnavailableModal, $event)"
          @pointercancel.self="cancelOverlayPointerClose('cn-sync-unavailable-modal')"
        >
          <div class="about-card notice-card">
            <h3>{{ t("sync.cn_region_unavailable_title") }}</h3>
            <div class="notice-body">
              <p>{{ t("sync.cn_region_unavailable_summary") }}</p>
              <p>
                <span>{{ t("sync.mainland_service_redirect_notice_prefix") }}</span>
                <a
                  class="notice-link"
                  href="https://end.07070721.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ t("sync.international_site_action") }}
                </a>
              </p>
            </div>
            <div class="about-actions">
              <button class="ghost-button" @click="closeCnSyncUnavailableModal">{{ t("plan_config.close") }}</button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div
          v-if="showNotice"
          class="about-overlay notice-overlay"
          @pointerdown.self="beginOverlayPointerClose('notice-modal', $event)"
          @pointerup.self="finishOverlayPointerClose('notice-modal', closeNotice, $event)"
          @pointercancel.self="cancelOverlayPointerClose('notice-modal')"
        >
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
        <div v-if="showAdblockNotice" class="about-overlay notice-overlay">
          <div class="about-card notice-card adblock-notice-card">
            <div class="adblock-notice-hero">
              <img class="adblock-notice-logo" src="./web-app-manifest-512x512.png" alt="Site Logo" loading="eager" decoding="async" />
              <div class="adblock-notice-copy">
                <h3>{{ t("sync.adblock_notice_title") }}</h3>
                <div class="notice-body adblock-notice-body">
                  <p>{{ t("sync.adblock_notice_text") }}</p>
                </div>
              </div>
            </div>
            <div class="about-actions">
              <button class="ghost-button adblock-notice-close-button" @click="closeAdblockNotice()">{{ t("plan_config.close") }}</button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div
          v-if="showChangelog"
          class="about-overlay changelog-overlay"
          @pointerdown.self="beginOverlayPointerClose('changelog-modal', $event)"
          @pointerup.self="finishOverlayPointerClose('changelog-modal', () => { showChangelog = false; }, $event)"
          @pointercancel.self="cancelOverlayPointerClose('changelog-modal')"
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
        <div
          v-if="showFaq"
          class="about-overlay faq-overlay"
          @pointerdown.self="beginOverlayPointerClose('faq-modal', $event)"
          @pointerup.self="finishOverlayPointerClose('faq-modal', () => { showFaq = false; }, $event)"
          @pointercancel.self="cancelOverlayPointerClose('faq-modal')"
        >
          <div v-if="contentLoading" class="about-card notice-card">{{ t("badge.item_12") }}</div>
          <div v-else class="about-card faq-card">
            <h3>{{ faqContent.title }}</h3>
            <div class="faq-body">
              <div v-if="!faqItems.length" class="empty">{{ faqContent.emptyText }}</div>
              <div v-else class="faq-list">
                <details v-for="(entry, index) in faqItems" :key="'faq-' + index" class="faq-item">
                  <summary class="faq-question">{{ entry.q }}</summary>
                  <div class="faq-answer">{{ entry.a }}</div>
                </details>
              </div>
            </div>
            <div class="about-actions">
              <button class="ghost-button" @click="showFaq = false">{{ t("plan_config.close") }}</button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
                <div
                  v-if="showAbout"
                  class="about-overlay about-overlay-main"
                  @pointerdown.self="beginOverlayPointerClose('about-modal', $event)"
                  @pointerup.self="finishOverlayPointerClose('about-modal', () => { showAbout = false; }, $event)"
                  @pointercancel.self="cancelOverlayPointerClose('about-modal')"
                >
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
                    :key="entry.key || \`about-sponsor-entry-\${index}\`"
                    class="about-sponsor-entry"
                  >
                    <div class="about-sponsor-entry-name">{{ entry.displayName || entry.name }}</div>
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
