(function () {
  window.__APP_TEMPLATES = window.__APP_TEMPLATES || {};
  window.__APP_TEMPLATES.strategyGuideDetail = `
          <div class="character-detail">
            <div class="detail-content" v-if="currentCharacter">
              <div class="character-hero">
                <div class="hero-left">
                  <button v-if="showBackButton" class="ghost-button back-button hero-back" @click="backToCharacterList">
                    ← {{ t("plan.item_2") }}
                  </button>
                  <div class="hero-identity">
                    <img
                      v-lazy-src="characterImageSrc(currentCharacter.name || currentCharacter.id)"
                      :alt="currentCharacter.name"
                      class="detail-avatar hero-avatar"
                    />
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
                              :class="{ 'has-icon': hasItemImage(mat) }"
                            >
                              <img
                                v-if="hasItemImage(mat)"
                                class="material-icon"
                                v-lazy-src="itemImageSrc(mat)"
                                :alt="resolveItemLabel(mat)"
                                loading="lazy"
                                decoding="async"
                                @error="handleCharacterImageError"
                              />
                              <span class="material-name">{{ resolveItemLabel(mat) }}</span>
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
                      <div v-for="(skill, skillIdx) in currentCharacter.skills" :key="'skill-' + skillIdx + '-' + skill.name" class="skill-item">
                        <div class="skill-header">
                          <img v-if="skill.icon" v-lazy-src="skill.icon" class="skill-icon" alt="" />
                          <div class="skill-title">
                            <span class="skill-name">{{ skill.name }}</span>
                            <span v-if="skill.type" class="skill-type">{{ skill.type }}</span>
                          </div>
                        </div>
                        <markdown-text :content="skill.description" class-name="skill-desc"></markdown-text>
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
                      <div v-for="(bs, bsIdx) in currentCharacter.baseSkills" :key="'bs-' + bsIdx + '-' + bs.name" class="base-skill-card">
                        <div class="base-skill-name">{{ bs.name }}</div>
                        <markdown-text :content="bs.description" class-name="base-skill-desc"></markdown-text>
                      </div>
                    </div>
                  </div>
                  <div class="detail-section">
                    <h3>{{ t("guide.item_15") }}</h3>
                    <div class="talents-list">
                      <div v-for="(talent, talentIdx) in currentCharacter.talents" :key="'talent-' + talentIdx + '-' + talent.name" class="talent-item">
                        <div class="talent-header">
                          <img v-if="talent.icon" v-lazy-src="talent.icon" class="talent-icon" alt="" />
                          <div class="talent-name">{{ talent.name }}</div>
                        </div>
                        <markdown-text :content="talent.description" class-name="talent-desc"></markdown-text>
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
                        <div class="potential-name">{{ resolvePotentialName(p) }}</div>
                        <markdown-text
                          v-if="resolvePotentialDescription(p)"
                          :content="resolvePotentialDescription(p)"
                          class-name="potential-desc"
                        ></markdown-text>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-show="strategyCategory === 'guide' && strategyTab === 'analysis'" class="detail-panel">
                  <div class="detail-section">
                    <h3>{{ t("guide.item_10") }}</h3>
                    <markdown-text
                      :content="(currentGuide && currentGuide.analysis) || t('plan.item_18')"
                      class-name="strategy-text"
                    ></markdown-text>
                  </div>
                  <div class="detail-section" v-if="currentGuide">
                    <h3>{{ t("guide.item_17") }}</h3>
                    <div class="equip-table" v-if="guideRows.length">
                      <div class="equip-row equip-row-head">
                        <div class="equip-row-label"></div>
                        <div class="equip-row-main">
                          <div class="equip-cell equip-weapon">{{ t("guide.item_5") }}</div>
                          <div class="equip-cell">{{ t("plan.item_19") }}</div>
                          <div class="equip-cell">{{ t("plan.item_20") }}</div>
                          <div class="equip-cell">{{ t("plan.item_21") }}</div>
                          <div class="equip-cell">{{ t("plan.item_21") }}</div>
                        </div>
                      </div>
                      <div v-for="(row, idx) in guideRows" :key="idx" class="equip-row">
                        <div class="equip-row-label">
                          <div class="equip-tag-block">
                            <span
                              class="equip-tag"
                              :class="idx === 0 ? 'equip-tag-primary' : 'equip-tag-secondary'"
                            >
                              {{ idx === 0 ? t("plan.item_22") : t("plan.item_23") }}
                            </span>
                            <span class="equip-tag-desc">
                              {{ idx === 0 ? t("badge.item") : t("badge.item_2") }}
                            </span>
                          </div>
                        </div>
                        <div class="equip-row-main">
                          <div class="equip-cell equip-weapon">
                            <div class="equip-items">
                              <div v-for="(weapon, wIdx) in row.weapons" :key="wIdx" class="equip-item">
                                <div
                                  class="equip-icon-frame"
                                  :class="weapon.rarity === 6 ? 'weapon-rarity-6' : weapon.rarity === 5 ? 'weapon-rarity-5' : weapon.rarity === 4 ? 'weapon-rarity-4' : ''"
                                >
                                  <img
                                    v-if="hasImage(weapon)"
                                    v-lazy-src="weaponImageSrc(weapon)"
                                    class="equip-icon"
                                    alt=""
                                  />
                                </div>
                                <div class="equip-text">
                                  <div class="equip-name">{{ weapon.name }}</div>
                                  <div class="equip-note" v-if="weapon.note">{{ weapon.note }}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div v-for="(equip, eIdx) in row.equipment" :key="eIdx" class="equip-cell">
                            <div v-if="equip" class="equip-item">
                              <div
                                class="equip-icon-frame"
                                :class="equip.rarity === 5 ? 'equip-rarity-5' : equip.rarity === 4 ? 'equip-rarity-4' : ''"
                              >
                                <img
                                  v-if="hasEquipImage(equip)"
                                  v-lazy-src="equipImageSrc(equip)"
                                  class="equip-icon"
                                  alt=""
                                />
                              </div>
                              <div class="equip-text">
                                <div class="equip-name">{{ equip.name }}</div>
                                <div class="equip-note" v-if="equip.note">{{ equip.note }}</div>
                              </div>
                            </div>
                            <div v-else class="equip-empty">-</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="equip-empty" v-else>{{ t("badge.item_3") }}</div>
                  </div>
                </div>

                <div v-show="strategyCategory === 'guide' && strategyTab === 'team'" class="detail-panel">
                  <div class="detail-section">
                    <h3>{{ t("plan.item_8") }}</h3>
                    <markdown-text
                      :content="(currentGuide && currentGuide.teamTips) || t('badge.item_4')"
                      class-name="strategy-text"
                    ></markdown-text>
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
                                    <img
                                      v-if="hasImage(weapon)"
                                      v-lazy-src="weaponImageSrc(weapon)"
                                      class="team-icon"
                                      alt=""
                                    />
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
                                  :class="equip.rarity === 5 ? 'equip-rarity-5' : equip.rarity === 4 ? 'equip-rarity-4' : ''"
                                >
                                  <img
                                    v-if="hasEquipImage(equip)"
                                    v-lazy-src="equipImageSrc(equip)"
                                    class="team-icon"
                                    alt=""
                                  />
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
                    <markdown-text
                      :content="(currentGuide && currentGuide.operationTips) || t('badge.item_4')"
                      class-name="strategy-text"
                    ></markdown-text>
                  </div>
                </div>
              </div>

            </div>
              </div>
`;
})();
