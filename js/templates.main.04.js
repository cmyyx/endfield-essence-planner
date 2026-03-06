(function () {
  window.__APP_TEMPLATE_MAIN_PARTS = window.__APP_TEMPLATE_MAIN_PARTS || [];
  window.__APP_TEMPLATE_MAIN_PARTS.push(`<transition name="fade-scale">
          <div v-if="tutorialActive" class="tutorial-float">
          <div class="tutorial-card">
            <div class="tutorial-head-row">
              <div class="tutorial-step">
                {{ t("tutorial.tutorial_current_total", {
                  current: tutorialStepIndex + 1,
                  total: tutorialTotalSteps,
                }) }}
              </div>
              <button
                v-if="tutorialBodyCanCollapse"
                class="ghost-button tutorial-collapse"
                :class="{ 'tutorial-highlight': tutorialCollapseHighlight }"
                @click="toggleTutorialBody"
              >
                {{ tutorialBodyCollapsed ? t("gear_refining.expand_details") : t("gear_refining.collapse_details") }}
              </button>
            </div>
            <h3>{{ tutorialStep.title }}</h3>
            <p
              v-for="(line, index) in tutorialVisibleLines"
              :key="\`tutorial-line-\${index}\`"
              :class="{
                'tutorial-line-cut':
                  tutorialBodyCollapsed &&
                  isPortrait &&
                  index === tutorialVisibleLines.length - 1
              }"
            >
              {{ line }}
            </p>
            <div class="tutorial-status">
              <span v-if="tutorialStepReady">{{ t("gear_refining.completed_you_can_continue") }}</span>
              <span v-else>{{ t("gear_refining.follow_the_prompt_to_complete_this_step") }}</span>
            </div>
            <div class="tutorial-actions">
              <button
                class="ghost-button"
                @click="prevTutorialStep"
                :disabled="tutorialStepIndex === 0"
              >
                {{ t("gear_refining.previous") }}
              </button>
              <button class="ghost-button" @click="openTutorialSkipConfirm">
                {{ t("gear_refining.skip_all") }}
              </button>
              <button
                v-if="tutorialStepKey === 'base-pick' && !tutorialStepReady"
                class="ghost-button"
                @click="skipTutorialStep"
              >
                {{ t("gear_refining.skip_this_step") }}
              </button>
              <button
                class="about-button"
                @click="nextTutorialStep"
                :disabled="!tutorialStepReady"
              >
                {{
                  tutorialStepIndex + 1 >= tutorialTotalSteps
                    ? t("gear_refining.finish")
                    : t("gear_refining.next")
                }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showTutorialSkipConfirm" class="about-overlay" @click.self="closeTutorialSkipConfirm">
          <div class="about-card tutorial-modal">
            <h3>{{ t("tutorial.skip_tutorial") }}</h3>
            <p>{{ t("tutorial.are_you_sure_you_want_to_skip_this_version_s_tutorial_th") }}</p>
            <p class="tutorial-note">{{ t("gear_refining.you_can_replay_it_later_in_more_settings") }}</p>
            <div class="about-actions">
              <button class="ghost-button" @click="closeTutorialSkipConfirm">{{ t("button.cancel") }}</button>
              <button class="about-button" @click="confirmTutorialSkipAll">
                {{ t("gear_refining.skip_all") }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showTutorialComplete" class="tutorial-float">
          <div class="tutorial-card tutorial-complete-card">
            <div class="tutorial-step">{{ t("tutorial.tutorial_complete") }}</div>
            <h3>{{ t("tutorial.congrats_on_finishing_the_tutorial") }}</h3>
            <p>{{ t("tutorial.you_ve_completed_this_version_s_tutorial") }}</p>
            <p>{{ t("tutorial.if_you_think_the_tutorial_needs_improvement_feedback_is_") }}</p>
            <p class="tutorial-note">{{ t("gear_refining.you_can_replay_it_in_more_settings") }}</p>
            <div class="tutorial-actions">
              <button class="about-button" @click="closeTutorialComplete">{{ t("button.got_it") }}</button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showUnifiedExceptionModal" class="about-overlay storage-error-overlay">
          <div class="about-card storage-error-card">
            <h3>
              {{
                activeUnifiedExceptionKind === "runtime"
                  ? (unifiedExceptionCurrent && unifiedExceptionCurrent.title) || t("error.page_init_title")
                  : t("storage.local_storage_error")
              }}
            </h3>
            <p class="storage-error-warning" v-if="activeUnifiedExceptionKind === 'runtime'">
              {{
                (unifiedExceptionCurrent && unifiedExceptionCurrent.summary) ||
                  t("error.page_init_summary")
              }}
              {{ t("update.refresh_and_try_again_if_it_persists_report_it_with_cons") }}
            </p>
            <p class="storage-error-warning" v-else>
              {{ t("storage.a_browser_local_data_read_write_error_was_detected_conti") }}
            </p>
            <p class="storage-error-warning">
              {{
                t("storage.failed_operation_operation", {
                  operation: (unifiedExceptionCurrent && unifiedExceptionCurrent.operation) || t("gear_refining.unknown")
                })
              }}
            </p>
            <p class="storage-error-warning" v-if="activeUnifiedExceptionKind === 'runtime'">
              {{
                t("storage.source_scope", {
                  scope: (unifiedExceptionCurrent && unifiedExceptionCurrent.scope) || t("gear_refining.unknown")
                })
              }}
            </p>
            <p class="storage-error-warning">
              {{
                t("storage.failed_key_key", {
                  key: (unifiedExceptionCurrent && unifiedExceptionCurrent.key) || t("gear_refining.unknown")
                })
              }}
            </p>

            <div class="storage-error-meta" v-if="unifiedExceptionCurrent">
              <div class="storage-error-meta-line">
                <span class="storage-error-label">{{ t("storage.error") }}</span>
                <span class="storage-error-value">
                  {{ unifiedExceptionCurrent.errorName }}: {{ unifiedExceptionCurrent.errorMessage }}
                </span>
              </div>
              <div class="storage-error-meta-line">
                <span class="storage-error-label">{{ t("gear_refining.time") }}</span>
                <span class="storage-error-value">{{ unifiedExceptionCurrent.occurredAt }}</span>
              </div>
            </div>

            <div class="storage-error-preview">
              <div class="storage-error-preview-title">{{ t("storage.diagnostic_preview_truncated") }}</div>
              <pre class="storage-error-preview-content">{{ unifiedExceptionPreviewText || t("storage.no_preview_data") }}</pre>
            </div>

            <div class="storage-error-log">
              <div class="storage-error-log-title">
                {{ t("storage.recent_error_logs") }}（{{ unifiedExceptionLogs.length }}）
              </div>
              <ul class="storage-error-log-list">
                <li
                  v-for="item in unifiedExceptionLogs"
                  :key="item.id || [item.__kind, item.occurredAt, item.operation, item.key].join('|')"
                  class="storage-error-log-item"
                  role="button"
                  tabindex="0"
                  @click="openUnifiedExceptionFromLog(item)"
                  @keydown.enter.prevent="openUnifiedExceptionFromLog(item)"
                  @keydown.space.prevent="openUnifiedExceptionFromLog(item)"
                >
                  <span class="storage-error-log-time">{{ item.occurredAt }}</span>
                  <span class="storage-error-log-op">{{ item.operation }}</span>
                  <span class="storage-error-log-key">{{ item.key }}</span>
                </li>
              </ul>
            </div>

            <div class="about-actions storage-error-actions">
              <button class="about-button storage-export-button" @click="exportUnifiedExceptionDiagnostic">
                {{ t("storage.export_data_and_diagnostics") }}
              </button>
              <button class="about-button migration-action migration-action-warn" @click="refreshUnifiedException">
                {{ activeUnifiedExceptionKind === "runtime" ? t("update.refresh_page") : t("storage.clear_data_and_refresh") }}
              </button>
              <a class="storage-feedback-button" :href="storageFeedbackUrl" target="_blank" rel="noreferrer">
                {{ t("gear_refining.report_issue") }}
              </a>
              <button class="ghost-button" @click="ignoreUnifiedException">
                {{ t("storage.ignore_error_continue") }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showRuntimeIgnoreConfirmModal" class="about-overlay storage-error-confirm-overlay">
          <div class="about-card storage-confirm-card">
            <h3>{{ t("storage.confirm_ignore_error") }}</h3>
            <p class="storage-clear-confirm-warning">
              {{
                t(
                  "storage.after_confirmation_this_warning_will_not_appear_again_in"
                )
              }}
            </p>
            <div class="about-actions storage-error-actions storage-clear-actions">
              <button class="ghost-button" @click="cancelIgnoreRuntimeWarnings">
                {{ t("button.cancel") }}
              </button>
              <button class="about-button migration-action migration-action-warn" @click="confirmIgnoreRuntimeWarnings">
                {{ t("storage.confirm_ignore_and_continue") }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showStorageClearConfirmModal" class="about-overlay storage-error-confirm-overlay">
          <div class="about-card storage-confirm-card">
            <h3>{{ t("storage.confirm_clear_data_and_refresh") }}</h3>
            <p class="storage-clear-confirm-warning">
              {{
                t(
                  "storage.only_the_local_data_keys_detected_as_problematic_will_be"
                )
              }}
            </p>
            <div class="storage-clear-targets" v-if="storageErrorClearTargetKeys.length">
              <div class="storage-clear-target-title">
                {{ t("storage.the_following_keys_will_be_cleared") }}
              </div>
              <ul class="storage-clear-target-list">
                <li v-for="key in storageErrorClearTargetKeys" :key="key" class="storage-clear-target-item">
                  {{ key }}
                </li>
              </ul>
            </div>
            <p v-else class="storage-clear-confirm-warning">
              {{ t("storage.no_explicit_problematic_key_was_identified_this_action_w") }}
            </p>
            <div class="about-actions storage-error-actions storage-clear-actions">
              <button class="ghost-button" @click="cancelStorageDataClear">
                {{ t("button.cancel") }}
              </button>
              <button
                class="about-button migration-action migration-action-danger"
                :disabled="storageErrorClearCountdown > 0"
                @click="confirmStorageDataClearAndReload"
              >
                {{ t("storage.confirm_clear_and_refresh") }}
                <span v-if="storageErrorClearCountdown > 0">
                  {{ t("storage.countdown_seconds", { count: storageErrorClearCountdown }) }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showStorageIgnoreConfirmModal" class="about-overlay storage-error-confirm-overlay">
          <div class="about-card storage-confirm-card">
            <h3>{{ t("storage.confirm_ignore_error") }}</h3>
            <p class="storage-clear-confirm-warning">
              {{
                t(
                  "storage.after_confirmation_this_warning_will_not_appear_again_in"
                )
              }}
            </p>
            <div class="about-actions storage-error-actions storage-clear-actions">
              <button class="ghost-button" @click="cancelIgnoreStorageErrors">
                {{ t("button.cancel") }}
              </button>
              <button class="about-button migration-action migration-action-warn" @click="confirmIgnoreStorageErrors">
                {{ t("storage.confirm_ignore_and_continue") }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showWeaponAttrDataModal" class="about-overlay weapon-attr-overlay" @click.self="closeWeaponAttrDataModal">
          <div class="about-card weapon-attr-card">
            <h3>{{ t("modal.weapon_attribute_data_fix_title") }}</h3>
            <p>{{ t("modal.weapon_attribute_data_fix_desc") }}</p>
            <p class="storage-clear-confirm-warning">{{ t("modal.weapon_attribute_data_fix_tip") }}</p>
            <div class="weapon-attr-disclaimer">
              <div class="weapon-attr-disclaimer-title">{{ t("modal.weapon_attribute_data_fix_disclaimer_title") }}</div>
              <p>{{ t("modal.weapon_attribute_data_fix_disclaimer") }}</p>
            </div>
            <div v-if="!weaponAttrIssueRows.length" class="weapon-attr-empty">
              {{ t("modal.weapon_attribute_data_fix_empty") }}
            </div>
            <div v-else class="weapon-attr-list">
              <article v-for="row in weaponAttrIssueRows" :key="row.name" class="weapon-attr-item">
                <div class="weapon-attr-item-head">
                  <div>
                    <div class="weapon-attr-item-title">{{ tTerm("weapon", row.name) }}</div>
                    <div class="weapon-attr-item-sub">{{ row.rarity }}★ · {{ tTerm("type", row.type) }}</div>
                  </div>
                  <span v-if="row.isPreview" class="weapon-attr-item-preview-badge">
                    {{ t("modal.weapon_attribute_data_fix_preview_badge") }}
                  </span>
                  <span class="weapon-attr-item-status" :class="{ 'is-resolved': !row.hasUnresolvedFields }">
                    {{
                      row.hasUnresolvedFields
                        ? t("modal.weapon_attribute_data_fix_status_pending")
                        : t("modal.weapon_attribute_data_fix_status_done")
                    }}
                  </span>
                </div>
                <div class="weapon-attr-item-missing">
                  {{
                    t("modal.weapon_attribute_data_fix_raw_missing", {
                      fields: row.rawMissingFields
                        .map((field) =>
                          field === "s1"
                            ? t("nav.base_attributes")
                            : field === "s2"
                            ? t("nav.extra_attributes")
                            : t("nav.skill_attributes")
                        )
                        .join(" / "),
                    })
                  }}
                </div>
                <div class="weapon-attr-editor-grid">
                  <label class="weapon-attr-editor-field">
                    <span>{{ t("nav.base_attributes") }}</span>
                    <select
                      :value="getWeaponAttrEditorValue(row.name, 's1')"
                      :disabled="!isWeaponRawAttrMissingField(row.name, 's1')"
                      @change="setWeaponAttrOverride(row.name, 's1', $event.target.value)"
                    >
                      <option value="">{{ t("modal.weapon_attribute_data_fix_unset") }}</option>
                      <option v-for="value in weaponAttrS1Options" :key="['s1', value].join('|')" :value="value">
                        {{ formatS1(value) }}
                      </option>
                    </select>
                  </label>
                  <label class="weapon-attr-editor-field">
                    <span>{{ t("nav.extra_attributes") }}</span>
                    <select
                      :value="getWeaponAttrEditorValue(row.name, 's2')"
                      :disabled="!isWeaponRawAttrMissingField(row.name, 's2')"
                      @change="setWeaponAttrOverride(row.name, 's2', $event.target.value)"
                    >
                      <option value="">{{ t("modal.weapon_attribute_data_fix_unset") }}</option>
                      <option v-for="value in weaponAttrS2Options" :key="['s2', value].join('|')" :value="value">
                        {{ tTerm("s2", value) }}
                      </option>
                    </select>
                  </label>
                  <label class="weapon-attr-editor-field">
                    <span>{{ t("nav.skill_attributes") }}</span>
                    <select
                      :value="getWeaponAttrEditorValue(row.name, 's3')"
                      :disabled="!isWeaponRawAttrMissingField(row.name, 's3')"
                      @change="setWeaponAttrOverride(row.name, 's3', $event.target.value)"
                    >
                      <option value="">{{ t("modal.weapon_attribute_data_fix_unset") }}</option>
                      <option v-for="value in weaponAttrS3Options" :key="['s3', value].join('|')" :value="value">
                        {{ tTerm("s3", value) }}
                      </option>
                    </select>
                  </label>
                </div>
                <div class="weapon-attr-item-actions">
                  <button class="ghost-button" @click="clearWeaponAttrOverride(row.name)">
                    {{ t("button.clear_manual_fill") }}
                  </button>
                </div>
              </article>
            </div>
            <div class="about-actions">
              <button class="about-button" @click="closeWeaponAttrDataModal">{{ t("button.got_it") }}</button>
            </div>
          </div>
        </div>
      </transition>

      <div class="version-debug-badge-wrap" :class="{ 'is-update-toast-active': showUpdatePrompt }">
        <transition name="version-badge-expand">
          <div
            v-if="showGameCompatWarning"
            class="version-debug-badge-panel-float"
            role="status"
            aria-live="polite"
          >
            <p class="version-debug-badge-panel-title">
              {{ t("update.current_site_compatible_version_version", { version: gameCompatSupportedVersion || t("gear_refining.unknown") }) }}
            </p>
            <p class="version-debug-badge-panel-text">
              {{ t("update.if_the_game_has_been_updated_to_version_please_wait_for_", { version: gameCompatNextVersion || t("gear_refining.unknown") }) }}
            </p>
            <div class="version-debug-badge-panel-actions">
              <button type="button" class="ghost-button version-compat-ack" @click="dismissGameCompatWarning">
                {{ t("button.got_it_2") }}
              </button>
            </div>
          </div>
        </transition>
        <button
          type="button"
          class="version-debug-badge"
          :title="versionCopyFeedbackText || t('update.click_to_copy_full_version_info')"
          @click="copyCurrentVersionInfo"
        >
          {{ versionBadgeDisplayText || updateCurrentVersionText || t("storage.failed_to_load_current_version") }}
        </button>
      </div>
      <div
        v-if="versionCopyFeedbackText"
        class="version-debug-copy-tip"
        :class="{ 'is-update-toast-active': showUpdatePrompt }"
        aria-live="polite"
      >
        {{ versionCopyFeedbackText }}
      </div>

      <div
        class="planner-bottom-right-overlays"
        :class="{
          'has-update-toast': showUpdatePrompt,
          'has-optional-toast': optionalFailureNotices && optionalFailureNotices.length > 0,
        }"
      >
        <transition-group name="fade-scale" tag="div" class="optional-toast-stack">
          <div
            v-for="(notice, index) in optionalFailureNotices"
            :key="notice.id || ['optional-failure', index].join('|')"
            class="update-toast optional-failure-toast"
            :class="'optional-failure-toast-' + index"
            role="status"
            aria-live="polite"
          >
            <div
              class="update-toast-card optional-failure-toast-card"
              role="button"
              tabindex="0"
              :aria-label="t('error.view_optional_failure_details')"
              @click="openOptionalFailureDetailByLogId((notice && (notice.logId || notice.id)) || '')"
              @keydown.enter.prevent="openOptionalFailureDetailByLogId((notice && (notice.logId || notice.id)) || '')"
              @keydown.space.prevent="openOptionalFailureDetailByLogId((notice && (notice.logId || notice.id)) || '')"
            >
              <div class="optional-failure-toast-main">
                <span class="optional-failure-toast-icon" aria-hidden="true">!</span>
                <div class="optional-failure-toast-text">
                  <strong>{{ notice.title || t("error.optional_feature_load_failed") }}</strong>
                  <span>{{ t("gear_refining.tap_the_notification_to_view_details") }}</span>
                </div>
              </div>
              <div class="optional-failure-toast-actions">
                <button
                  type="button"
                  class="optional-failure-close-button"
                  :aria-label="t('plan_config.close')"
                  :title="t('plan_config.close')"
                  @click.stop="dismissOptionalFailureNotice(notice.id)"
                >
                  &times;
                </button>
              </div>
            </div>
          </div>
        </transition-group>

        <transition name="fade-scale">
          <div v-if="showUpdatePrompt" class="update-toast update-version-toast" role="status" aria-live="polite">
          <div class="update-toast-card">
            <h3>{{ t("update.new_version_detected") }}</h3>
            <p class="update-check-desc">
              {{ t("update.a_newer_site_version_is_available_refresh_to_get_the_lat") }}
            </p>
            <div class="update-version-grid">
              <div class="update-version-row">
                <span class="update-version-label">{{ t("update.current_version") }}</span>
                <span class="update-version-value">{{ updateCurrentVersionText || t("storage.failed_to_load_current_version") }}</span>
              </div>
              <div class="update-version-row">
                <span class="update-version-label">{{ t("update.latest_version") }}</span>
                <span class="update-version-value">{{ updateLatestVersionText || t("gear_refining.unknown") }}</span>
              </div>
              <div class="update-version-row" v-if="updateLatestPublishedAt">
                <span class="update-version-label">{{ t("update.published_at") }}</span>
                <span class="update-version-value">{{ updateLatestPublishedAt }}</span>
              </div>
            </div>
            <div class="about-actions update-check-actions">
              <button class="about-button update-action-primary" @click="reloadToLatestVersion">
                {{ t("update.refresh_now") }}
              </button>
              <button class="about-button update-action-secondary" @click="dismissUpdatePrompt">
                {{ t("button.remind_me_later") }}
              </button>
            </div>
          </div>
          </div>
        </transition>
      </div>

      <div v-if="showDomainWarning" class="domain-overlay">
        <div class="domain-card">
          <h3>{{ t("embed.unofficial_domain_warning") }}</h3>
          <p>
            {{ t("embed.the_current_domain_is_not") }}
            <a class="domain-link" href="https://end.canmoe.com" target="_blank" rel="noreferrer">
              end.canmoe.com
            </a>
            {{ t("embed.please_ensure_this_source_is_trusted_to_avoid_malicious_") }}
          </p>
          <p class="domain-chip">{{ t("embed.current_domain_host", { host: currentHost }) }}</p>
          <p v-if="isEmbedded" class="domain-chip">
            {{ t("embed.parent_page_domain_host", { host: embedHostLabel }) }}
          </p>
          <p v-if="isEmbedded && !isEmbedTrusted">{{ t("embed.this_domain_is_not_on_the_embed_allowlist") }}</p>
          <p v-if="isEmbedded">{{ t("embed.this_page_is_opened_inside_an_iframe_this_warning_can_t_") }}</p>
          <div class="about-actions domain-actions">
            <a
              class="repo-link domain-primary"
              href="https://end.canmoe.com"
              target="_blank"
              rel="noreferrer"
            >
              <span class="repo-chip">{{ t("embed.official") }}</span>
              <span>{{ t("embed.visit_official_domain") }}</span>
              <span class="repo-arrow">↗</span>
            </a>
            <button
              v-if="!isEmbedded"
              class="ghost-button"
              :disabled="warningCountdown > 0"
              @click="dismissDomainWarning"
            >
              {{
                warningCountdown > 0
                  ? t("gear_refining.i_understand_count_s", { count: warningCountdown })
                  : t("gear_refining.i_understand")
              }}
            </button>
          </div>
        </div>
      </div>

      <footer v-if="showIcpFooter" class="icp-footer">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
          {{ icpNumber }}
        </a>
      </footer>
`);
})();
