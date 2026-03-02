(function () {
  window.__APP_TEMPLATE_MAIN_PARTS = window.__APP_TEMPLATE_MAIN_PARTS || [];
  window.__APP_TEMPLATE_MAIN_PARTS.push(`<transition name="fade-scale">
          <div v-if="tutorialActive" class="tutorial-float">
          <div class="tutorial-card">
            <div class="tutorial-head-row">
              <div class="tutorial-step">
                {{ t("新手教程 {current} / {total}", {
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
                {{ tutorialBodyCollapsed ? t("展开说明") : t("收起说明") }}
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
              <span v-if="tutorialStepReady">{{ t("已完成，可继续。") }}</span>
              <span v-else>{{ t("请按提示完成当前操作。") }}</span>
            </div>
            <div class="tutorial-actions">
              <button
                class="ghost-button"
                @click="prevTutorialStep"
                :disabled="tutorialStepIndex === 0"
              >
                {{ t("上一步") }}
              </button>
              <button class="ghost-button" @click="openTutorialSkipConfirm">
                {{ t("跳过全部") }}
              </button>
              <button
                v-if="tutorialStepKey === 'base-pick' && !tutorialStepReady"
                class="ghost-button"
                @click="skipTutorialStep"
              >
                {{ t("跳过本步") }}
              </button>
              <button
                class="about-button"
                @click="nextTutorialStep"
                :disabled="!tutorialStepReady"
              >
                {{
                  tutorialStepIndex + 1 >= tutorialTotalSteps
                    ? t("完成")
                    : t("下一步")
                }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showTutorialSkipConfirm" class="about-overlay" @click.self="closeTutorialSkipConfirm">
          <div class="about-card tutorial-modal">
            <h3>{{ t("跳过新手教程？") }}</h3>
            <p>{{ t("确定跳过当前版本的新手教程吗？此操作仅对当前版本生效。") }}</p>
            <p class="tutorial-note">{{ t("之后可在“更多设置”中再次体验。") }}</p>
            <div class="about-actions">
              <button class="ghost-button" @click="closeTutorialSkipConfirm">{{ t("取消") }}</button>
              <button class="about-button" @click="confirmTutorialSkipAll">
                {{ t("跳过全部") }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showTutorialComplete" class="tutorial-float">
          <div class="tutorial-card tutorial-complete-card">
            <div class="tutorial-step">{{ t("新手教程完成") }}</div>
            <h3>{{ t("恭喜完成新手教程") }}</h3>
            <p>{{ t("你已完成当前版本的新手教程。") }}</p>
            <p>{{ t("如果你认为新手教程需要改进欢迎提供建议。") }}</p>
            <p class="tutorial-note">{{ t("可在“更多设置”中再次体验。") }}</p>
            <div class="tutorial-actions">
              <button class="about-button" @click="closeTutorialComplete">{{ t("知道了") }}</button>
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
                  ? t((unifiedExceptionCurrent && unifiedExceptionCurrent.title) || "页面初始化异常")
                  : t("本地存储异常")
              }}
            </h3>
            <p class="storage-error-warning" v-if="activeUnifiedExceptionKind === 'runtime'">
              {{
                t(
                  (unifiedExceptionCurrent && unifiedExceptionCurrent.summary) ||
                    "页面初始化阶段发生异常，部分功能可能不可用。"
                )
              }}
              {{ t("请刷新页面后重试；如问题持续，请附控制台日志反馈。") }}
            </p>
            <p class="storage-error-warning" v-else>
              {{ t("检测到浏览器本地数据读写异常，继续使用可能导致数据丢失。") }}
            </p>
            <p class="storage-error-warning">
              {{
                t("失败操作：{operation}", {
                  operation: (unifiedExceptionCurrent && unifiedExceptionCurrent.operation) || t("未知")
                })
              }}
            </p>
            <p class="storage-error-warning" v-if="activeUnifiedExceptionKind === 'runtime'">
              {{
                t("异常来源：{scope}", {
                  scope: (unifiedExceptionCurrent && unifiedExceptionCurrent.scope) || t("未知")
                })
              }}
            </p>
            <p class="storage-error-warning">
              {{
                t("失败键：{key}", {
                  key: (unifiedExceptionCurrent && unifiedExceptionCurrent.key) || t("未知")
                })
              }}
            </p>

            <div class="storage-error-meta" v-if="unifiedExceptionCurrent">
              <div class="storage-error-meta-line">
                <span class="storage-error-label">{{ t("错误：") }}</span>
                <span class="storage-error-value">
                  {{ unifiedExceptionCurrent.errorName }}: {{ unifiedExceptionCurrent.errorMessage }}
                </span>
              </div>
              <div class="storage-error-meta-line">
                <span class="storage-error-label">{{ t("时间：") }}</span>
                <span class="storage-error-value">{{ unifiedExceptionCurrent.occurredAt }}</span>
              </div>
            </div>

            <div class="storage-error-preview">
              <div class="storage-error-preview-title">{{ t("诊断预览（截断）") }}</div>
              <pre class="storage-error-preview-content">{{ unifiedExceptionPreviewText || t("暂无预览数据") }}</pre>
            </div>

            <div class="storage-error-log">
              <div class="storage-error-log-title">
                {{ t("最近异常记录") }}（{{ unifiedExceptionLogs.length }}）
              </div>
              <ul class="storage-error-log-list">
                <li
                  v-for="item in unifiedExceptionLogs"
                  :key="item.id || [item.__kind, item.occurredAt, item.operation, item.key].join('|')"
                  class="storage-error-log-item"
                >
                  <span class="storage-error-log-time">{{ item.occurredAt }}</span>
                  <span class="storage-error-log-op">{{ item.operation }}</span>
                  <span class="storage-error-log-key">{{ item.key }}</span>
                </li>
              </ul>
            </div>

            <div class="about-actions storage-error-actions">
              <button class="about-button storage-export-button" @click="exportUnifiedExceptionDiagnostic">
                {{ t("导出数据与诊断") }}
              </button>
              <button class="about-button migration-action migration-action-warn" @click="refreshUnifiedException">
                {{ activeUnifiedExceptionKind === "runtime" ? t("刷新页面") : t("清理数据并刷新") }}
              </button>
              <a class="storage-feedback-button" :href="storageFeedbackUrl" target="_blank" rel="noreferrer">
                {{ t("反馈问题") }}
              </a>
              <button class="ghost-button" @click="ignoreUnifiedException">
                {{ t("无视错误,继续使用") }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showRuntimeIgnoreConfirmModal" class="about-overlay storage-error-confirm-overlay">
          <div class="about-card storage-confirm-card">
            <h3>{{ t("确认无视错误") }}</h3>
            <p class="storage-clear-confirm-warning">
              {{
                t(
                  "确认后本次会话将不再弹出该异常提醒，继续使用可能导致数据丢失。"
                )
              }}
            </p>
            <div class="about-actions storage-error-actions storage-clear-actions">
              <button class="ghost-button" @click="cancelIgnoreRuntimeWarnings">
                {{ t("取消") }}
              </button>
              <button class="about-button migration-action migration-action-warn" @click="confirmIgnoreRuntimeWarnings">
                {{ t("确认无视错误,继续使用") }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showStorageClearConfirmModal" class="about-overlay storage-error-confirm-overlay">
          <div class="about-card storage-confirm-card">
            <h3>{{ t("确认清理数据并刷新") }}</h3>
            <p class="storage-clear-confirm-warning">
              {{
                t(
                  "将仅清理检测到异常的本地数据键，并尝试绕过缓存刷新页面，不会清理全部站点数据。此操作仍不可恢复。"
                )
              }}
            </p>
            <div class="storage-clear-targets" v-if="storageErrorClearTargetKeys.length">
              <div class="storage-clear-target-title">
                {{ t("将清理以下键：") }}
              </div>
              <ul class="storage-clear-target-list">
                <li v-for="key in storageErrorClearTargetKeys" :key="key" class="storage-clear-target-item">
                  {{ key }}
                </li>
              </ul>
            </div>
            <p v-else class="storage-clear-confirm-warning">
              {{ t("未识别到明确异常键，本次仅执行刷新。") }}
            </p>
            <div class="about-actions storage-error-actions storage-clear-actions">
              <button class="ghost-button" @click="cancelStorageDataClear">
                {{ t("取消") }}
              </button>
              <button
                class="about-button migration-action migration-action-danger"
                :disabled="storageErrorClearCountdown > 0"
                @click="confirmStorageDataClearAndReload"
              >
                {{ t("确认清理并刷新") }}
                <span v-if="storageErrorClearCountdown > 0">
                  {{ t("（{count}s）", { count: storageErrorClearCountdown }) }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showStorageIgnoreConfirmModal" class="about-overlay storage-error-confirm-overlay">
          <div class="about-card storage-confirm-card">
            <h3>{{ t("确认无视错误") }}</h3>
            <p class="storage-clear-confirm-warning">
              {{
                t(
                  "确认后本次会话将不再弹出该异常提醒，继续使用可能导致数据丢失。"
                )
              }}
            </p>
            <div class="about-actions storage-error-actions storage-clear-actions">
              <button class="ghost-button" @click="cancelIgnoreStorageErrors">
                {{ t("取消") }}
              </button>
              <button class="about-button migration-action migration-action-warn" @click="confirmIgnoreStorageErrors">
                {{ t("确认无视错误,继续使用") }}
              </button>
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
              {{ t("网站当前适配版本为 {version}", { version: gameCompatSupportedVersion || t("未知") }) }}
            </p>
            <p class="version-debug-badge-panel-text">
              {{ t("若游戏已更新至 {version}，请等待站点适配。", { version: gameCompatNextVersion || t("未知") }) }}
            </p>
            <div class="version-debug-badge-panel-actions">
              <button type="button" class="ghost-button version-compat-ack" @click="dismissGameCompatWarning">
                {{ t("我知道了") }}
              </button>
            </div>
          </div>
        </transition>
        <button
          type="button"
          class="version-debug-badge"
          :title="versionCopyFeedbackText || t('点击复制完整版本信息')"
          @click="copyCurrentVersionInfo"
        >
          {{ versionBadgeDisplayText || updateCurrentVersionText || t("当前版本获取失败") }}
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

      <transition name="fade-scale">
        <div v-if="showUpdatePrompt" class="update-toast" role="status" aria-live="polite">
          <div class="update-toast-card">
            <h3>{{ t("检测到新版本") }}</h3>
            <p class="update-check-desc">
              {{ t("检测到站点已有更新，刷新后可使用最新功能与修复。") }}
            </p>
            <div class="update-version-grid">
              <div class="update-version-row">
                <span class="update-version-label">{{ t("当前版本") }}</span>
                <span class="update-version-value">{{ updateCurrentVersionText || t("当前版本获取失败") }}</span>
              </div>
              <div class="update-version-row">
                <span class="update-version-label">{{ t("最新版本") }}</span>
                <span class="update-version-value">{{ updateLatestVersionText || t("未知") }}</span>
              </div>
              <div class="update-version-row" v-if="updateLatestPublishedAt">
                <span class="update-version-label">{{ t("发布时间") }}</span>
                <span class="update-version-value">{{ updateLatestPublishedAt }}</span>
              </div>
            </div>
            <div class="about-actions update-check-actions">
              <button class="about-button update-action-primary" @click="reloadToLatestVersion">
                {{ t("立即刷新") }}
              </button>
              <button class="about-button update-action-secondary" @click="dismissUpdatePrompt">
                {{ t("稍后提醒") }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <div v-if="showDomainWarning" class="domain-overlay">
        <div class="domain-card">
          <h3>{{ t("非官方域名提示") }}</h3>
          <p>
            {{ t("当前访问域名并非") }}
            <a class="domain-link" href="https://end.canmoe.com" target="_blank" rel="noreferrer">
              end.canmoe.com
            </a>
            {{ t("请确认是否为可信来源，谨防恶意映射或页面被内嵌篡改。") }}
          </p>
          <p class="domain-chip">{{ t("当前页面域名：{host}", { host: currentHost }) }}</p>
          <p v-if="isEmbedded" class="domain-chip">
            {{ t("上层页面域名：{host}", { host: embedHostLabel }) }}
          </p>
          <p v-if="isEmbedded && !isEmbedTrusted">{{ t("该域名未在内嵌白名单内。") }}</p>
          <p v-if="isEmbedded">{{ t("检测到页面被内嵌（iframe）打开，此提示无法关闭。") }}</p>
          <div class="about-actions domain-actions">
            <a
              class="repo-link domain-primary"
              href="https://end.canmoe.com"
              target="_blank"
              rel="noreferrer"
            >
              <span class="repo-chip">{{ t("官方") }}</span>
              <span>{{ t("访问官方域名") }}</span>
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
                  ? t("我已知晓（{count}s）", { count: warningCountdown })
                  : t("我已知晓")
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
