import os

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()
    
    head_end_index = -1
    tail_start_index = -1
    
    for i, line in enumerate(lines):
        if '<main class="layout">' in line:
            head_end_index = i
        if '</main>' in line:
             if head_end_index != -1 and i > head_end_index:
                 tail_start_index = i + 1 
                 break
                 
    if head_end_index == -1 or tail_start_index == -1:
        print("Error parsing index.html")
        exit(1)
        
    head = lines[:head_end_index] 
    tail = lines[tail_start_index:]

    # Filter out the matcher link from the head section for the matcher page itself
    matcher_link_start_index = -1
    for i, line in enumerate(head):
        if 'class="matcher-link"' in line:
            matcher_link_start_index = i
            break
    
    if matcher_link_start_index != -1:
        head = head[:matcher_link_start_index]


middle = """
      <main style="max-width: 1200px; margin: 0 auto; padding: 20px;">
        <div class="panel">
            <div class="panel-title">
               <h2>{{ t("低星武器词条匹配") }}</h2>
            </div>
            <div class="panel-body">
                <p>{{ t("选择一个六星武器，查找具有完全一致词条组合的四/五星武器（用于获取“终极武器奖章”镀层）。") }}</p>
                
                <div style="text-align: center; margin-bottom: 24px;">
                     <button class="ghost-button" 
                        @click="matcherViewMode = (matcherViewMode === 'search' ? 'all' : 'search')"
                     >
                        {{ matcherViewMode === 'search' ? t("显示所有已知匹配组合") : t("返回搜索") }}
                     </button>
                </div>

                <div v-if="matcherViewMode === 'search'">
                    <div class="search-box">
                        <span>🔍</span>
                        <input 
                            v-model="matcherSearchQuery" 
                            :placeholder="t('搜索六星武器...')" 
                        />
                    </div>

                    <div class="weapon-list" style="margin-bottom: 32px; max-height: 480px; overflow-y: auto; padding-right: 8px;">
                        <div 
                            v-for="w in matcherFilteredSixStarWeapons" 
                            :key="w.name" 
                            class="weapon-item" 
                            :class="{ 
                                'is-selected': matcherSelected6StarName === w.name,
                                'rarity-6': w.rarity === 6,
                                'rarity-5': w.rarity === 5
                            }"
                            :title="w.name + '\\n' + w.s1 + ' / ' + w.s2 + ' / ' + w.s3"
                            @click="matcherSelected6StarName = w.name"
                        >
                          <div class="weapon-art">
                            <img
                              v-if="hasImage(w)"
                              class="weapon-figure"
                              :src="weaponImageSrc(w)"
                              :alt="w.name"
                              loading="lazy"
                            />
                            <span v-else class="weapon-fallback-large">{{ w.rarity }}★</span>
                          </div>
                          <div v-if="weaponCharacters(w).length" class="weapon-avatars">
                            <img
                              v-for="(character, index) in weaponCharacters(w)"
                              :key="index"
                              class="weapon-avatar"
                              :src="characterImageSrc(character)"
                              :alt="character"
                              loading="lazy"
                            />
                          </div>
                          <div class="weapon-band"></div>
                          <div class="weapon-name">
                            <div class="weapon-title">{{ w.name }}</div>
                          </div>
                        </div>
                    </div>

                    <div v-if="matcherSelected6Star" class="result-section" style="margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px;">
                        <h3 style="margin-bottom: 16px; font-size: 1.25em;">
                            {{ t("匹配结果") }} 
                            <span style="font-size: 0.8em; opacity: 0.6; font-weight: normal; display: block; margin-top: 4px;">
                                {{ matcherSelected6Star.name }} : {{matcherSelected6Star.s1}} / {{matcherSelected6Star.s2}} / {{matcherSelected6Star.s3}}
                            </span>
                        </h3>
                        
                        <div v-if="matcherMatches.length === 0" class="empty-state">
                            {{ t("没有找到完全匹配的武器。") }}
                        </div>
                        <div class="weapon-list">
                            <div v-for="w in matcherMatches" :key="w.name" 
                                 class="weapon-item"
                                 :class="{ 
                                    'rarity-6': w.rarity === 6,
                                    'rarity-5': w.rarity === 5
                                 }"
                                 :title="w.name + '\\n' + w.s1 + ' / ' + w.s2 + ' / ' + w.s3"
                            >
                                  <div class="weapon-art">
                                    <img
                                      v-if="hasImage(w)"
                                      class="weapon-figure"
                                      :src="weaponImageSrc(w)"
                                      :alt="w.name"
                                      loading="lazy"
                                    />
                                    <span v-else class="weapon-fallback-large">{{ w.rarity }}★</span>
                                  </div>
                                  <div v-if="weaponCharacters(w).length" class="weapon-avatars">
                                    <img
                                      v-for="(character, index) in weaponCharacters(w)"
                                      :key="index"
                                      class="weapon-avatar"
                                      :src="characterImageSrc(character)"
                                      :alt="character"
                                      loading="lazy"
                                    />
                                  </div>
                                  <div class="weapon-band"></div>
                                  <div class="weapon-name">
                                    <div class="weapon-title">{{ w.name }}</div>
                                  </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="matcherViewMode === 'all'" style="margin-top: 16px;">
                    <div v-if="matcherAllMatches.length === 0" class="empty-state">
                        {{ t("当前数据中没有发现任何完全匹配的组合。") }}
                    </div>
                    <div v-for="group in matcherAllMatches" :key="group.source.name" style="margin-bottom: 32px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 24px;">
                        <h3 style="margin-bottom: 12px; font-size: 1.1em; display:flex; align-items:center; gap: 8px;">
                             <img v-if="hasImage(group.source)" :src="weaponImageSrc(group.source)" style="width: 32px; height: 32px; object-fit:contain; border-radius:4px; background: rgba(0,0,0,0.3);" />
                             <span>{{ group.source.name }}</span>
                             <span style="font-size: 0.8em; opacity: 0.6; font-weight: normal;">
                                {{group.source.s1}}/{{group.source.s2}}/{{group.source.s3}}
                            </span>
                        </h3>
                        <div class="weapon-list">
                             <div v-for="w in group.matches" :key="w.name" 
                                 class="weapon-item"
                                 :class="{ 
                                    'rarity-6': w.rarity === 6,
                                    'rarity-5': w.rarity === 5
                                 }"
                                 :title="w.name + '\\n' + w.s1 + ' / ' + w.s2 + ' / ' + w.s3"
                            >
                                  <div class="weapon-art">
                                    <img
                                      v-if="hasImage(w)"
                                      class="weapon-figure"
                                      :src="weaponImageSrc(w)"
                                      :alt="w.name"
                                      loading="lazy"
                                    />
                                    <span v-else class="weapon-fallback-large">{{ w.rarity }}★</span>
                                  </div>
                                  <div v-if="weaponCharacters(w).length" class="weapon-avatars">
                                    <img
                                      v-for="(character, index) in weaponCharacters(w)"
                                      :key="index"
                                      class="weapon-avatar"
                                      :src="characterImageSrc(character)"
                                      :alt="character"
                                      loading="lazy"
                                    />
                                  </div>
                                  <div class="weapon-band"></div>
                                  <div class="weapon-name">
                                    <div class="weapon-title">{{ w.name }}</div>
                                  </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 48px; text-align: center;">
                     <a href="index.html" class="ghost-button" style="text-decoration: none; display: inline-block;">{{ t("返回基质规划器") }}</a>
                </div>
            </div>
        </div>
      </main>
"""

with open("matcher.html", "w", encoding="utf-8") as f:
    for line in head:
        f.write(line)
    f.write(middle)
    for line in tail:
        f.write(line)

with open("matcher.html", "r", encoding="utf-8") as f:
    content = f.read()
    
content = content.replace('./js/app.js', './js/matcher_loader.js')

with open("matcher.html", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated matcher.html with local header filtering")
