(function () {
  const { createApp, ref, computed, onMounted, onBeforeUnmount, watch, nextTick } = Vue || {};

  const readBootProtocol = (protocolName) => {
    if (typeof window === "undefined") return undefined;
    const appBoot = window.__APP_BOOT__;
    if (!appBoot || typeof appBoot.readProtocol !== "function") {
      return undefined;
    }
    return appBoot.readProtocol(protocolName);
  };

  const showBootError = (payload) => {
    const renderError = readBootProtocol("renderBootError");
    if (typeof renderError === "function") {
      renderError(payload);
      return;
    }
    const fallback = document.createElement("div");
    fallback.style.cssText = "padding:24px;color:#f36c6c;font-family:Microsoft YaHei UI;";
    fallback.textContent = "页面启动失败，请刷新后重试。";
    document.body.textContent = "";
    document.body.appendChild(fallback);
  };

  if (!createApp) {
    finishPreload();
    showBootError({
      title: "运行依赖缺失",
      summary: "未检测到 Vue 3 运行时，页面无法初始化。",
      details: [
        "缺失文件：./vendor/vue.global.prod.js",
        "请确认构建产物或静态资源已完整部署",
      ],
      suggestions: ["检查 vendor 目录是否完整", "清理缓存后刷新页面并重试"],
    });
    return;
  }

  if (!dungeons.length || !weapons.length || !equips.length) {
    finishPreload();
    showBootError({
      title: "数据文件缺失",
      summary: "核心数据未加载完成，当前无法进入页面。",
      details: [
        `副本数据：${dungeons.length ? "已加载" : "缺失"}`,
        `武器数据：${weapons.length ? "已加载" : "缺失"}`,
        `装备数据：${equips.length ? "已加载" : "缺失"}`,
        "请确认 ./data/dungeons.js、./data/weapons.js 与 ./data/equip.js 可访问",
      ],
      suggestions: ["检查 data 目录与发布路径", "强制刷新页面后重试"],
    });
    return;
  }

  const lazyImageObserver = (() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return null;
    }
    return new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && entry.intersectionRatio <= 0) return;
          const img = entry.target;
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.removeAttribute("data-src");
          }
          observer.unobserve(img);
        });
      },
      { rootMargin: "200px 0px" }
    );
  })();

  const applyLazyImage = (el, src) => {
    if (!src) return;
    if (el && el.style && el.style.display === "none") {
      el.style.display = "";
    }
    if (!lazyImageObserver) {
      if (el.src !== src) {
        el.src = src;
      }
      return;
    }
    if (el.dataset.src !== src) {
      el.dataset.src = src;
    }
    lazyImageObserver.observe(el);
  };

  const lazyImageDirective = {
    mounted(el, binding) {
      applyLazyImage(el, binding.value);
    },
    updated(el, binding) {
      if (binding.value !== binding.oldValue) {
        applyLazyImage(el, binding.value);
      }
    },
    unmounted(el) {
      if (lazyImageObserver) {
        lazyImageObserver.unobserve(el);
      }
    },
  };

  const scriptLoadRegistry = new Map();

  const normalizeScriptSrc = (src) => {
    if (!src) return "";
    if (typeof window === "undefined") return src;
    try {
      return new URL(src, window.location.href).href;
    } catch (error) {
      return src;
    }
  };

  if (typeof document !== "undefined") {
    Array.from(document.scripts || []).forEach((script) => {
      const key = normalizeScriptSrc(script.getAttribute("src") || script.src || "");
      if (!key || scriptLoadRegistry.has(key)) return;
      scriptLoadRegistry.set(key, Promise.resolve());
      script.dataset.loaded = "true";
    });
  }

  const loadScriptOnce = (src) => {
    const key = normalizeScriptSrc(src);
    if (!key) {
      return Promise.reject(new Error("Script src is required"));
    }
    if (scriptLoadRegistry.has(key)) {
      return scriptLoadRegistry.get(key);
    }
    const pending = new Promise((resolve, reject) => {
      if (typeof document === "undefined") {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      const cleanup = () => {
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
      };
      const onLoad = () => {
        script.dataset.loaded = "true";
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        scriptLoadRegistry.delete(key);
        reject(new Error(`Failed to load: ${src}`));
      };
      script.addEventListener("load", onLoad);
      script.addEventListener("error", onError);
      document.body.appendChild(script);
    });
    scriptLoadRegistry.set(key, pending);
    return pending;
  };

  const scheduleBackgroundAnalyticsBootstrap = () => {
    if (typeof window === "undefined") return;
    if (window.__APP_BACKGROUND_ANALYTICS_BOOTSTRAP_SCHEDULED__) return;
    window.__APP_BACKGROUND_ANALYTICS_BOOTSTRAP_SCHEDULED__ = true;

    const inject = () => {
      loadScriptOnce("./js/analytics.bootstrap.js").catch(() => {
        // Analytics is intentionally best-effort and must stay silent.
      });
    };

    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(inject, { timeout: 4000 });
        return;
      }
      setTimeout(inject, 1200);
    };

    if (document.readyState === "complete") {
      schedule();
      return;
    }

    window.addEventListener(
      "load",
      () => {
        schedule();
      },
      { once: true }
    );
  };

  const createUiScheduler = (updateFn) => () => {
    if (typeof window === "undefined") return;
    const run = () => updateFn();
    if (typeof nextTick === "function") {
      nextTick(() => {
        if (typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(run);
        } else {
          run();
        }
      });
      return;
    }
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(run);
    } else {
      run();
    }
  };

  const modules = window.AppModules || {};
      const readRuntimeEnv = () => {
    const normalizeEnv = (value) => String(value || "").trim().toLowerCase();
    if (typeof window !== "undefined" && window.location && typeof window.location.search === "string") {
      try {
        const params = new URLSearchParams(window.location.search);
        const fromQuery = normalizeEnv(params.get("app_env"));
        if (fromQuery) return fromQuery;
      } catch (error) {
        // ignore malformed query
      }
    }
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        const fromStorage = normalizeEnv(localStorage.getItem("planner-app-env:v1"));
        if (fromStorage) return fromStorage;
      } catch (error) {
        // ignore storage read failures
      }
    }
    if (typeof window !== "undefined" && typeof window.__APP_ENV__ === "string") {
      const fromWindow = normalizeEnv(window.__APP_ENV__);
      if (fromWindow) return fromWindow;
    }
    if (
      typeof process !== "undefined" &&
      process &&
      process.env &&
      typeof process.env.NODE_ENV === "string"
    ) {
      const fromProcess = normalizeEnv(process.env.NODE_ENV);
      if (fromProcess) return fromProcess;
    }
    if (typeof window !== "undefined" && window.location && typeof window.location.hostname === "string") {
      const host = normalizeEnv(window.location.hostname);
      if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
        return "development";
      }
    }
    return "production";
  };
  const strictInitContractEnvs = new Set(["development", "test"]);
  const announceStrictRuntimeEnv = (runtimeEnv) => {
    const normalized = String(runtimeEnv || "").trim().toLowerCase();
    if (!strictInitContractEnvs.has(normalized)) return;
    if (typeof console === "undefined" || typeof console.info !== "function") return;
    const envText = normalized.toUpperCase();
    const titleText =
      normalized === "test"
        ? "████████████████\nTEST MODE\n████████████████\n测试模式"
        : "████████████████████\nDEVELOPMENT MODE\n████████████████████\n开发模式";
    const storageKey = "planner-app-env:v1";
    console.info(
      "%c" + titleText,
      "display:block;background:linear-gradient(135deg,#0b1220,#1d4ed8);color:#f8fafc;padding:12px 14px;border:1px solid #38bdf8;border-radius:12px;font-weight:900;font-size:21px;line-height:1.12;letter-spacing:1px;text-shadow:0 1px 0 #0b1220,0 0 14px rgba(56,189,248,0.45);"
    );
    console.info(
      "%cRuntime: " +
        envText +
        "\n切换环境 / How to switch" +
        "\n1) 临时(当前链接): 在 URL 末尾加 ?app_env=development 或 ?app_env=test" +
        "\n   Temporary (current URL): append ?app_env=development or ?app_env=test" +
        "\n2) 持久(当前浏览器): localStorage.setItem('" +
        storageKey +
        "','development')" +
        "\n   Persistent (this browser): localStorage.setItem('" +
        storageKey +
        "','development')" +
        "\n3) 恢复生产: localStorage.removeItem('" +
        storageKey +
        "')" +
        "\n   Back to production: localStorage.removeItem('" +
        storageKey +
        "')" +
        "\n4) 查看当前环境: window.__APP_RUNTIME_ENV__" +
        "\n   Show current env: window.__APP_RUNTIME_ENV__",
      "display:block;background:#0b1220;color:#a5f3fc;padding:10px 12px;border:1px dashed #155e75;border-radius:10px;line-height:1.6;font-weight:600;"
    );
  };
  const parseInitContractList = (value) =>
    Array.isArray(value)
      ? Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean)))
      : [];
  const appTemplates =
    typeof window !== "undefined" && window.__APP_TEMPLATES ? window.__APP_TEMPLATES : {};
  const templateMainParts =
    typeof window !== "undefined" && Array.isArray(window.__APP_TEMPLATE_MAIN_PARTS)
      ? window.__APP_TEMPLATE_MAIN_PARTS
      : [];
  const directMainTemplate =
    typeof appTemplates.main === "string" && appTemplates.main.trim() ? appTemplates.main : "";
  const mainAppTemplate = (directMainTemplate || templateMainParts.join("\n") || "<div></div>").trim();
  const planConfigTemplate =
    typeof appTemplates.planConfigControl === "string" && appTemplates.planConfigControl.trim()
      ? appTemplates.planConfigControl.trim()
      : "<div></div>";
  const planConfigPanelTemplate =
    typeof appTemplates.planConfigPanel === "string" && appTemplates.planConfigPanel.trim()
      ? appTemplates.planConfigPanel.trim()
      : "<div></div>";
  const equipRefiningListTemplate =
    typeof appTemplates.equipRefiningList === "string" && appTemplates.equipRefiningList.trim()
      ? appTemplates.equipRefiningList.trim()
      : "<div></div>";
  const equipRefiningDetailTemplate =
    typeof appTemplates.equipRefiningDetail === "string" && appTemplates.equipRefiningDetail.trim()
      ? appTemplates.equipRefiningDetail.trim()
      : "<div></div>";
  const equipRefiningRecommendationTemplate =
    typeof appTemplates.equipRefiningRecommendation === "string" &&
    appTemplates.equipRefiningRecommendation.trim()
      ? appTemplates.equipRefiningRecommendation.trim()
      : "<div></div>";
  const strategyGuideDetailTemplate =
    typeof appTemplates.strategyGuideDetail === "string" && appTemplates.strategyGuideDetail.trim()
      ? appTemplates.strategyGuideDetail.trim()
      : "<div></div>";

  const formatMarkdownBlocks = (() => {
    if (
      typeof window !== "undefined" &&
      window.__APP_SANITIZER__ &&
      typeof window.__APP_SANITIZER__.tokenizeMarkdownBlocks === "function"
    ) {
      return window.__APP_SANITIZER__.tokenizeMarkdownBlocks;
    }
    return (value) => {
      const text = String(value || "");
      if (!text.trim()) return [];
      return [
        {
          type: "paragraph",
          tokens: [{ type: "text", text }],
        },
      ];
    };
  })();

  const planConfigControl = {
    props: {
      t: { type: Function, required: true },
      showPlanConfig: { type: Boolean, required: true },
      showPlanConfigHintDot: { type: Boolean, required: true },
    },
    emits: ["toggle"],
    template: planConfigTemplate,
  };

  const planConfigPanel = {
    props: {
      t: { type: Function, required: true },
      recommendationConfig: { type: Object, required: true },
      showPlanConfig: { type: Boolean, required: true },
      showPlanConfigHintDot: { type: Boolean, required: true },
      showPlanConfigOwnershipHintDot: { type: Boolean, required: true },
      showWeaponAttrs: { type: Boolean, required: true },
      showWeaponOwnershipInList: { type: Boolean, required: true },
      showWeaponOwnershipInPlans: { type: Boolean, required: true },
      toggleShowWeaponOwnershipInList: { type: Function, required: true },
      toggleShowWeaponOwnershipInPlans: { type: Function, required: true },
      markPlanConfigOwnershipHintSeen: { type: Function, required: true },
      exportWeaponMarks: { type: Function, required: true },
      handleMarksImportFile: { type: Function, required: true },
      marksImportFileName: { type: String, default: "" },
      marksImportSummary: { type: Object, default: null },
      marksImportError: { type: String, default: "" },
      regionOptions: { type: Array, required: true },
      tRegionPriorityModeOptions: { type: Array, required: true },
      tOwnershipPriorityModeOptions: { type: Array, required: true },
      tStrictPriorityOrderOptions: { type: Array, required: true },
      tTerm: { type: Function, required: true },
      weaponAttrS1Options: { type: Array, required: true },
      weaponAttrS2Options: { type: Array, required: true },
      weaponAttrS3Options: { type: Array, required: true },
      customWeapons: { type: Array, default: () => [] },
      customWeaponDraft: {
        type: Object,
        default: () => ({
          name: "",
          rarity: 6,
          type: "自定义",
          s1: "",
          s2: "",
          s3: "",
        }),
      },
      customWeaponError: { type: [String, Object], default: null },
      addCustomWeapon: { type: Function, required: true },
      removeCustomWeapon: { type: Function, required: true },
      resetCustomWeaponDraft: { type: Function, required: true },
      isPlanConfigSectionCollapsed: { type: Function, required: true },
      togglePlanConfigSectionCollapsed: { type: Function, required: true },
      hasPreviewWeapons: { type: Boolean, required: true },
      openWeaponAttrDataModal: { type: Function, required: true },
    },
    emits: ["toggle"],
    methods: {
      triggerMarksImport() {
        const input = this.$refs && this.$refs.marksImportInput;
        if (input && typeof input.click === "function") {
          input.click();
        }
      },
      resolveCustomWeaponError(error) {
        if (!error) return "";
        if (typeof error === "string") return error;
        const key = error.key || "";
        const params = error.params || null;
        if (key && typeof this.t === "function") {
          const resolved = this.t(key, params);
          if (resolved && resolved !== key) {
            return resolved;
          }
        }
        return error.fallback || String(key || "");
      },
    },
    template: planConfigPanelTemplate,
  };

  const matchStatusLine = {
    props: {
      weaponName: { type: String, required: true },
      t: { type: Function, required: true },
      isWeaponOwned: { type: Function, required: true },
      isEssenceOwned: { type: Function, required: true },
    },
    template: `
<div class="match-status-line">
  <span
    class="weapon-ownership-badge match-status-badge"
    :class="{ 'is-owned': isWeaponOwned(weaponName), 'is-unowned': !isWeaponOwned(weaponName) }"
  >
    {{ isWeaponOwned(weaponName) ? t("badge.owned") : t("nav.not_owned") }}
  </span>
  <span
    class="weapon-ownership-badge match-status-badge"
    :class="{ 'is-owned': isEssenceOwned(weaponName), 'is-unowned': !isEssenceOwned(weaponName) }"
  >
    {{ isEssenceOwned(weaponName) ? t("nav.essence_owned") : t("badge.essence_not_owned") }}
  </span>
</div>`,
  };

  const equipRefiningList = {
    props: {
      t: { type: Function, required: true },
      mobilePanel: { type: String, required: true },
      query: { type: String, required: true },
      filterSub1: { type: Array, required: true },
      filterSub2: { type: Array, required: true },
      filterSpecial: { type: Array, required: true },
      filterOptionEntries: { type: Object, required: true },
      filterPanelCollapsed: { type: Boolean, required: true },
      groupedSets: { type: Array, required: true },
      selectedEquipName: { type: String, default: "" },
      isSetCollapsed: { type: Function, required: true },
      toggleSetCollapsed: { type: Function, required: true },
      toggleFilterValue: { type: Function, required: true },
      clearFilters: { type: Function, required: true },
      toggleFilterPanelCollapsed: { type: Function, required: true },
      selectEquip: { type: Function, required: true },
      hasEquipImage: { type: Function, required: true },
      equipImageSrc: { type: Function, required: true },
      onEquipImageError: { type: Function, required: true },
    },
    emits: ["update:query"],
    template: equipRefiningListTemplate,
  };

  const equipRefiningRecommendation = {
    props: {
      t: { type: Function, required: true },
      recommendation: { type: Object, required: true },
      visibleCandidates: { type: Array, required: true },
      hasMoreCandidates: { type: Boolean, required: true },
      expanded: { type: Boolean, required: true },
      toggleExpanded: { type: Function, required: true },
      hasEquipImage: { type: Function, required: true },
      equipImageSrc: { type: Function, required: true },
      onEquipImageError: { type: Function, required: true },
    },
    template: equipRefiningRecommendationTemplate,
  };

  const equipRefiningDetail = {
    props: {
      t: { type: Function, required: true },
      mobilePanel: { type: String, required: true },
      selectedEquip: { type: Object, default: null },
      recommendations: { type: Array, required: true },
      visibleRecommendationCandidates: { type: Function, required: true },
      hasMoreRecommendationCandidates: { type: Function, required: true },
      isRecommendationExpanded: { type: Function, required: true },
      toggleRecommendationExpanded: { type: Function, required: true },
      hasEquipImage: { type: Function, required: true },
      equipImageSrc: { type: Function, required: true },
      onEquipImageError: { type: Function, required: true },
    },
    template: equipRefiningDetailTemplate,
  };

  const markdownText = {
    props: {
      content: { type: String, default: "" },
      className: { type: String, default: "" },
    },
    setup(props) {
      const blocks = computed(() => formatMarkdownBlocks(props.content));
      return { blocks };
    },
    template: `
<div v-if="blocks.length" class="markdown-text" :class="className">
  <template v-for="(block, blockIndex) in blocks" :key="blockIndex">
    <p v-if="block.type === 'paragraph'" class="markdown-paragraph">
      <template v-for="(token, tokenIndex) in block.tokens" :key="tokenIndex">
        <br v-if="token.type === 'break'" />
        <strong v-else-if="token.type === 'strong'">{{ token.text }}</strong>
        <em v-else-if="token.type === 'em'">{{ token.text }}</em>
        <code v-else-if="token.type === 'code'">{{ token.text }}</code>
        <a
          v-else-if="token.type === 'link'"
          :href="token.href"
          target="_blank"
          rel="noopener"
        >
          {{ token.text }}
        </a>
        <span v-else>{{ token.text }}</span>
      </template>
    </p>
    <ul v-else-if="block.type === 'list' && !block.ordered" class="markdown-list">
      <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
        <template v-for="(token, tokenIndex) in item.tokens" :key="tokenIndex">
          <br v-if="token.type === 'break'" />
          <strong v-else-if="token.type === 'strong'">{{ token.text }}</strong>
          <em v-else-if="token.type === 'em'">{{ token.text }}</em>
          <code v-else-if="token.type === 'code'">{{ token.text }}</code>
          <a
            v-else-if="token.type === 'link'"
            :href="token.href"
            target="_blank"
            rel="noopener"
          >
            {{ token.text }}
          </a>
          <span v-else>{{ token.text }}</span>
        </template>
      </li>
    </ul>
    <ol v-else-if="block.type === 'list' && block.ordered" class="markdown-list">
      <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
        <template v-for="(token, tokenIndex) in item.tokens" :key="tokenIndex">
          <br v-if="token.type === 'break'" />
          <strong v-else-if="token.type === 'strong'">{{ token.text }}</strong>
          <em v-else-if="token.type === 'em'">{{ token.text }}</em>
          <code v-else-if="token.type === 'code'">{{ token.text }}</code>
          <a
            v-else-if="token.type === 'link'"
            :href="token.href"
            target="_blank"
            rel="noopener"
          >
            {{ token.text }}
          </a>
          <span v-else>{{ token.text }}</span>
        </template>
      </li>
    </ol>
  </template>
</div>`,
  };

  const strategyGuideDetail = {
    props: {
      t: { type: Function, required: true },
      tTerm: { type: Function, required: true },
      currentCharacter: { type: Object, default: null },
      currentGuide: { type: Object, default: null },
      guideRows: { type: Array, required: true },
      teamSlots: { type: Array, required: true },
      strategyCategory: { type: String, required: true },
      strategyTab: { type: String, required: true },
      setStrategyCategory: { type: Function, required: true },
      setStrategyTab: { type: Function, required: true },
      backToCharacterList: { type: Function, required: true },
      showBackButton: { type: Boolean, default: true },
      skillLevelLabels: { type: Array, required: true },
      getSkillTables: { type: Function, required: true },
      hasImage: { type: Function, required: true },
      weaponImageSrc: { type: Function, required: true },
      weaponCharacters: { type: Function, required: true },
      characterImageSrc: { type: Function, required: true },
      characterCardSrc: { type: Function, required: true },
      handleCharacterCardError: { type: Function, required: true },
      handleCharacterImageError: { type: Function, required: true },
      hasEquipImage: { type: Function, required: true },
      equipImageSrc: { type: Function, required: true },
      hasItemImage: { type: Function, required: true },
      itemImageSrc: { type: Function, required: true },
      resolveItemLabel: { type: Function, required: true },
      resolvePotentialName: { type: Function, required: true },
      resolvePotentialDescription: { type: Function, required: true },
    },
    template: strategyGuideDetailTemplate,
  };

  const app = createApp({
    template: mainAppTemplate,
    setup() {
      const ctx = { ref, computed, onMounted, onBeforeUnmount, watch, nextTick };
      const state = {};
      state.editorIdentityDraft = ref({ id: "", name: "" });
      state.commitEditorCharacterIdentity = () => {};
      const fallbackInterpolate = (key, params) => {
        const text = String(key || "");
        if (!params || typeof params !== "object") return text;
        return text.replace(/\{(\w+)\}/g, (match, name) =>
          Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
        );
      };
      state.t = (key, params) => fallbackInterpolate(key, params);
      state.tTerm = (category, value) => String(value || "");
      state.formatMarkdownBlocks = formatMarkdownBlocks;
      state.loadScriptOnce = loadScriptOnce;
      state.createUiScheduler = createUiScheduler;
      scheduleBackgroundAnalyticsBootstrap();
      const runtimeEnv = readRuntimeEnv();
      if (typeof window !== "undefined") {
        window.__APP_RUNTIME_ENV__ = runtimeEnv;
      }
      announceStrictRuntimeEnv(runtimeEnv);
      const showEditorEntry = runtimeEnv === "development" || runtimeEnv === "test";
      state.showEditorEntry = showEditorEntry;
      // Keep the hero ad banner codepath available, but disable both rendering
      // and related detection until this area is needed again.
      state.heroAdBannerEnabled = ref(false);
      const initializedModules = new Set();
      const providedCapabilities = new Set();
      const pendingInitContractWarnings = [];
      const deferredInitModules = new Set();
      const viewBundleRegistry = (() => {
        if (typeof window === "undefined") return {};
        const manifest =
          window.__APP_RESOURCE_MANIFEST && typeof window.__APP_RESOURCE_MANIFEST === "object"
            ? window.__APP_RESOURCE_MANIFEST
            : null;
        const raw =
          manifest && manifest.app && typeof manifest.app === "object"
            ? manifest.app.viewBundles
            : null;
        if (!raw || typeof raw !== "object") return {};
        const normalized = {};
        Object.keys(raw).forEach((viewKey) => {
          const entry = raw[viewKey];
          if (Array.isArray(entry)) {
            normalized[viewKey] = { scripts: entry.slice(), init: [] };
            return;
          }
          if (!entry || typeof entry !== "object") return;
          const scripts = Array.isArray(entry.scripts) ? entry.scripts.slice() : [];
          const init = Array.isArray(entry.init) ? entry.init.slice() : [];
          if (!scripts.length && !init.length) return;
          normalized[viewKey] = { scripts, init };
        });
        return normalized;
      })();
      Object.keys(viewBundleRegistry).forEach((viewKey) => {
        const bundle = viewBundleRegistry[viewKey];
        if (!bundle || !Array.isArray(bundle.init)) return;
        bundle.init.forEach((name) => {
          if (name) deferredInitModules.add(name);
        });
      });
      const markProvidedCapabilities = (fn) => {
        parseInitContractList(fn && fn.provides).forEach((capability) => {
          providedCapabilities.add(capability);
        });
      };
      const flushPendingInitContractWarnings = () => {
        if (
          typeof state.reportRuntimeWarning !== "function" ||
          !Array.isArray(pendingInitContractWarnings) ||
          !pendingInitContractWarnings.length
        ) {
          return;
        }
        const queue = pendingInitContractWarnings.splice(0, pendingInitContractWarnings.length);
        queue.forEach((runReporter) => {
          try {
            runReporter();
          } catch (error) {
            if (typeof console !== "undefined" && typeof console.warn === "function") {
              console.warn("[init-contract] failed to flush pending warning", error);
            }
          }
        });
      };
      const resolveMissingContracts = (declaredList, seenSet) =>
        declaredList.filter((item) => !seenSet.has(item));
      const reportInitContractWarning = (name, kind, details) => {
        const normalizedName = String(name || "unknown");
        const missingRequired = Array.isArray(details && details.missingRequired)
          ? details.missingRequired
          : [];
        const missingOptional = Array.isArray(details && details.missingOptional)
          ? details.missingOptional
          : [];
        const missingRequiredProviders = Array.isArray(details && details.missingRequiredProviders)
          ? details.missingRequiredProviders
          : [];
        const missingOptionalProviders = Array.isArray(details && details.missingOptionalProviders)
          ? details.missingOptionalProviders
          : [];
        const detailLines = [
          `env: ${runtimeEnv}`,
          `module: ${normalizedName}`,
        ];
        if (missingRequired.length) {
          detailLines.push(`missing required modules: ${missingRequired.join(", ")}`);
        }
        if (missingRequiredProviders.length) {
          detailLines.push(`missing required providers: ${missingRequiredProviders.join(", ")}`);
        }
        if (missingOptional.length) {
          detailLines.push(`missing optional modules: ${missingOptional.join(", ")}`);
        }
        if (missingOptionalProviders.length) {
          detailLines.push(`missing optional providers: ${missingOptionalProviders.join(", ")}`);
        }
        const summaryText =
          kind === "required"
            ? typeof state.t === "function"
              ? state.t("warning.init_contract_required_summary")
              : "Critical module dependencies are missing; this module was skipped in degraded mode."
            : typeof state.t === "function"
            ? state.t("warning.init_contract_optional_summary")
            : "Optional dependencies are missing; module initialization continues.";
        const warningKeyParts = [
          kind,
          normalizedName,
          missingRequired.join("|"),
          missingRequiredProviders.join("|"),
          missingOptional.join("|"),
          missingOptionalProviders.join("|"),
        ];
        const warningText = `[init-contract] ${warningKeyParts.filter(Boolean).join("::")}`;
        const warnConsole = () => {
          if (typeof console !== "undefined" && typeof console.warn === "function") {
            console.warn(warningText, detailLines.join("\n"));
          }
        };
        const sendReporter = () => {
          const warningError = new Error(warningText);
          warningError.name = "InitContractWarning";
          state.reportRuntimeWarning(warningError, {
            scope: "init.contract",
            operation: "init.contract-check",
            key: `${kind}:${normalizedName}`,
            title:
              typeof state.t === "function"
                ? state.t("warning.init_contract_title")
                : "Module Init Dependency Warning",
            summary: summaryText,
            note: detailLines.join("\n"),
            asToast: true,
            optionalSignature: warningText,
          });
        };
        if (typeof state.reportRuntimeWarning === "function") {
          sendReporter();
          return;
        }
        warnConsole();
        pendingInitContractWarnings.push(sendReporter);
      };
      const reportInitExecutionWarning = (name, error) => {
        const normalizedName = String(name || "unknown");
        const errorName = String((error && error.name) || "Error");
        const errorMessage = String((error && error.message) || "module init failed");
        const detailLines = [
          `env: ${runtimeEnv}`,
          `module: ${normalizedName}`,
          `error: ${errorName}: ${errorMessage}`,
        ];
        if (error && error.stack) {
          detailLines.push(`stack: ${String(error.stack)}`);
        }
        const warningText = `[init-exec] ${normalizedName}::${errorName}::${errorMessage}`;
        const warnConsole = () => {
          if (typeof console !== "undefined" && typeof console.warn === "function") {
            console.warn(warningText, detailLines.join("\n"));
          }
        };
        const sendReporter = () => {
          const warningError = error instanceof Error ? error : new Error(errorMessage);
          warningError.name = errorName;
          state.reportRuntimeWarning(warningError, {
            scope: "init.execution",
            operation: "init.module-run",
            key: normalizedName,
            title:
              typeof state.t === "function"
                ? state.t("warning.init_execution_title")
                : "Module Init Execution Error",
            summary:
              typeof state.t === "function"
                ? state.t("warning.init_execution_summary")
                : "Module initialization failed; this module was skipped in degraded mode.",
            note: detailLines.join("\n"),
            asToast: true,
            optionalSignature: warningText,
          });
        };
        if (typeof state.reportRuntimeWarning === "function") {
          sendReporter();
          return;
        }
        warnConsole();
        pendingInitContractWarnings.push(sendReporter);
      };
      const runInitWithContract = (name) => {
        if (deferredInitModules.has(name)) {
          return "deferred";
        }
        const fn = modules[name];
        if (typeof fn !== "function") {
          const missingError = new Error(`[init-contract] missing module initializer: ${name}`);
          missingError.name = "InitModuleMissingError";
          reportInitExecutionWarning(name, missingError);
          if (strictInitContractEnvs.has(runtimeEnv)) {
            throw missingError;
          }
          return "degraded";
        }
        const required = parseInitContractList(fn.required);
        const optional = parseInitContractList(fn.optional);
        const requiredProviders = parseInitContractList(fn.requiredProviders);
        const optionalProviders = parseInitContractList(fn.optionalProviders);
        const missingRequired = resolveMissingContracts(required, initializedModules);
        const missingRequiredProviders = resolveMissingContracts(requiredProviders, providedCapabilities);
        if (missingRequired.length || missingRequiredProviders.length) {
          const messageParts = [`[init-contract] ${name} missing required dependencies`];
          if (missingRequired.length) {
            messageParts.push(`modules=${missingRequired.join(",")}`);
          }
          if (missingRequiredProviders.length) {
            messageParts.push(`providers=${missingRequiredProviders.join(",")}`);
          }
          if (strictInitContractEnvs.has(runtimeEnv)) {
            throw new Error(messageParts.join(" | "));
          }
          reportInitContractWarning(name, "required", {
            missingRequired,
            missingRequiredProviders,
          });
          return "degraded";
        }

        const missingOptional = resolveMissingContracts(optional, initializedModules);
        const missingOptionalProviders = resolveMissingContracts(optionalProviders, providedCapabilities);
        if (missingOptional.length || missingOptionalProviders.length) {
          reportInitContractWarning(name, "optional", {
            missingOptional,
            missingOptionalProviders,
          });
        }

        try {
          fn(ctx, state);
        } catch (error) {
          reportInitExecutionWarning(name, error);
          if (strictInitContractEnvs.has(runtimeEnv)) {
            throw error;
          }
          return "degraded";
        }
        initializedModules.add(name);
        markProvidedCapabilities(fn);
        flushPendingInitContractWarnings();
        return "ok";
      };

      const initExecutionOrder = [
        "initState",
        "initI18n",
        "initContent",
        "initSearch",
        "initUi",
        "initUpSchedule",
        "initRerunRanking",
        "initStorage",
        "initEmbed",
        "initPerf",
        "initBackground",
        "initWeapons",
        "initWeaponMatch",
        "initRecommendations",
        "initTutorial",
        "initRecommendationDisplay",
        "initModals",
        "initUpdate",
        "initSync",
        "initMedia",
        "initStrategy",
        "initEquipRefining",
        "initEditor",
      ];

      initExecutionOrder.forEach((name) => {
        runInitWithContract(name);
      });

      const prepareToastLeave = (el) => {
        if (!el || typeof window === "undefined") return;
        let rect = null;
        const parsedTop = el.dataset ? Number.parseFloat(el.dataset.toastTop) : Number.NaN;
        const parsedLeft = el.dataset ? Number.parseFloat(el.dataset.toastLeft) : Number.NaN;
        const parsedWidth = el.dataset ? Number.parseFloat(el.dataset.toastWidth) : Number.NaN;
        const parsedHeight = el.dataset ? Number.parseFloat(el.dataset.toastHeight) : Number.NaN;
        if (Number.isFinite(parsedTop) && Number.isFinite(parsedLeft)) {
          rect = {
            top: parsedTop,
            left: parsedLeft,
            width: Number.isFinite(parsedWidth) ? parsedWidth : el.getBoundingClientRect().width,
            height: Number.isFinite(parsedHeight) ? parsedHeight : el.getBoundingClientRect().height,
          };
        }
        if (!rect && el.querySelector && state.toastLeaveRects && typeof state.toastLeaveRects.get === "function") {
          const card = el.querySelector(".toast-card[data-toast-id]");
          const toastId = card ? card.getAttribute("data-toast-id") : "";
          if (toastId) {
            const cached = state.toastLeaveRects.get(String(toastId));
            if (cached) {
              rect = cached;
            }
          }
        }
        if (!rect && typeof el.getBoundingClientRect === "function") {
          rect = el.getBoundingClientRect();
        }
        if (!rect) return;
        const computed = window.getComputedStyle ? window.getComputedStyle(el) : null;
        const computedTransform = computed ? computed.transform : "";
        el.style.position = "fixed";
        el.style.top = `${rect.top}px`;
        el.style.left = `${rect.left}px`;
        el.style.width = `${rect.width}px`;
        el.style.height = `${rect.height}px`;
        el.style.margin = "0";
        el.style.right = "auto";
        el.style.bottom = "auto";
        el.style.pointerEvents = "none";
        if (computedTransform && computedTransform !== "none") {
          el.style.transform = computedTransform;
        } else {
          el.style.transform = "translateX(0) translateY(0)";
        }
      };

      const viewLoadState = ref({});
      const normalizeViewKey = (view) => String(view || "").trim();
      const isViewBundleRegistered = (view) => {
        const key = normalizeViewKey(view);
        const bundle = key ? viewBundleRegistry[key] : null;
        return Boolean(bundle && Array.isArray(bundle.scripts) && bundle.scripts.length);
      };
      const getViewLoadEntry = (view) => {
        const key = normalizeViewKey(view);
        const entry = key && viewLoadState.value ? viewLoadState.value[key] : null;
        if (entry && typeof entry === "object") return entry;
        return { status: "idle", error: "" };
      };
      const setViewLoadEntry = (view, patch) => {
        const key = normalizeViewKey(view);
        if (!key) return;
        const base = viewLoadState.value && viewLoadState.value[key] ? viewLoadState.value[key] : {};
        viewLoadState.value = {
          ...(viewLoadState.value || {}),
          [key]: { ...base, ...(patch || {}) },
        };
      };
      const isViewBundleLoading = (view) =>
        isViewBundleRegistered(view) && getViewLoadEntry(view).status === "loading";
      const isViewBundleFailed = (view) =>
        isViewBundleRegistered(view) && getViewLoadEntry(view).status === "error";
      const isViewBundleReady = (view) =>
        !isViewBundleRegistered(view) || getViewLoadEntry(view).status === "ready";
      const getViewBundleError = (view) =>
        isViewBundleRegistered(view) ? String(getViewLoadEntry(view).error || "") : "";

      const viewLoadRegistry = new Map();
      const viewLoadRetryRegistry = new Set();
      const describeViewLoadError = (error) => {
        const message = String((error && error.message) || "");
        const failed = message.replace(/^Failed to load:\\s*/i, "").trim();
        return failed && failed !== message ? failed : message || "unknown";
      };

      let pendingStrategyCharacterId = null;

      const ensureViewBundleLoaded = (view, options) => {
        const key = normalizeViewKey(view);
        if (!key) return Promise.resolve(false);
        const bundle = viewBundleRegistry[key];
        if (!bundle || !Array.isArray(bundle.scripts) || !bundle.scripts.length) {
          if (isViewBundleRegistered(key) && !isViewBundleReady(key)) {
            setViewLoadEntry(key, { status: "ready", error: "" });
          }
          return Promise.resolve(true);
        }
        const runViewInit = () => {
          let initFailed = false;
          if (Array.isArray(bundle.init)) {
            bundle.init.forEach((name) => {
              if (!name) return;
              deferredInitModules.delete(name);
              if (initializedModules.has(name)) return;
              const result = runInitWithContract(name);
              if (result !== "ok") initFailed = true;
            });
          }
          if (key === "strategy" && pendingStrategyCharacterId !== null) {
            if (state.selectedCharacterId && state.selectedCharacterId.value !== undefined) {
              state.selectedCharacterId.value = pendingStrategyCharacterId;
              pendingStrategyCharacterId = null;
            }
          }
          if (initFailed) {
            throw new Error("View init failed");
          }
        };
        const handleViewLoadFailure = (error) => {
          const detail = describeViewLoadError(error);
          setViewLoadEntry(key, { status: "error", error: detail });
          viewLoadRegistry.delete(key);
          if (typeof console !== "undefined" && typeof console.warn === "function") {
            console.warn("[view-bundle] load failed", key, error);
          }
          return false;
        };
        const scheduleForceRetry = (task) => {
          if (!task || viewLoadRetryRegistry.has(key)) return;
          viewLoadRetryRegistry.add(key);
          Promise.resolve(task).then((result) => {
            if (!viewLoadRetryRegistry.has(key)) return;
            viewLoadRetryRegistry.delete(key);
            if (!result) return;
            try {
              setViewLoadEntry(key, { status: "loading", error: "" });
              runViewInit();
              setViewLoadEntry(key, { status: "ready", error: "" });
            } catch (error) {
              handleViewLoadFailure(error);
            }
          });
        };
        if (viewLoadRegistry.has(key)) {
          const existing = viewLoadRegistry.get(key);
          if (options && options.force) {
            scheduleForceRetry(existing);
          }
          return existing;
        }
        const task = (async () => {
          setViewLoadEntry(key, { status: "loading", error: "" });
          for (let index = 0; index < bundle.scripts.length; index += 1) {
            await loadScriptOnce(bundle.scripts[index]);
          }
          runViewInit();
          setViewLoadEntry(key, { status: "ready", error: "" });
          return true;
        })().catch(handleViewLoadFailure);
        viewLoadRegistry.set(key, task);
        return task;
      };

      const retryViewLoad = (view) => ensureViewBundleLoaded(view, { force: true });
      const refreshPage = () => {
        if (typeof window === "undefined") return;
        if (typeof state.reloadBypassCache === "function") {
          const url = new URL(window.location.href);
          if (!url.searchParams.has("__reload_ts")) {
            state.reloadBypassCache();
            return;
          }
        }
        window.location.reload();
      };

      const weaponCatalog =
        typeof window !== "undefined" && Array.isArray(window.WEAPONS) ? window.WEAPONS : [];
      const weaponNameSet = new Set(weaponCatalog.map((weapon) => weapon.name));
const parseRoute = () => {
        if (typeof window === "undefined") {
          return { view: state.currentView.value };
        }
        const params = new URLSearchParams(window.location.search || "");
        const view = params.get("view") || "planner";
        const characterId = params.get("operator");
        if (view === "strategy") {
          return { view: "strategy", characterId };
        }
        if (view === "editor") {
          return { view: "editor" };
        }
        if (view === "equip-refining") {
          return { view: "equip-refining" };
        }
        if (view === "rerun-ranking") {
          return { view: "rerun-ranking" };
        }
        if (view === "match") {
          return { view: "match" };
        }
        if (view === "background") {
          return { view: "background" };
        }
return { view: "planner" };
      };

      let applyingRoute = false;

      const applyRoute = (route) => {
        if (!route) return;
        applyingRoute = true;
        state.currentView.value = route.view || "planner";
        if (route.view === "strategy") {
          if (state.selectedCharacterId && state.selectedCharacterId.value !== undefined) {
            state.selectedCharacterId.value = route.characterId || null;
          } else {
            pendingStrategyCharacterId = route.characterId || null;
          }
        }
        applyingRoute = false;
      };

      const buildQuery = () => {
        const view = state.currentView.value;
        const params = new URLSearchParams();
        if (view && view !== "planner") {
          params.set("view", view);
        }
        if (view === "strategy") {
          const id =
            state.selectedCharacterId && state.selectedCharacterId.value
              ? state.selectedCharacterId.value
              : pendingStrategyCharacterId || "";
          if (id) params.set("operator", id);
        }
        const query = params.toString();
        return query ? `?${query}` : "";
      };

      const legacyScrollbarHiddenViews = new Set([]);
      const syncLegacyScrollbarMode = () => {
        if (typeof document === "undefined" || !document.documentElement) return;
        const root = document.documentElement;
        const currentView = String(state.currentView.value || "planner");
        root.classList.toggle("legacy-scrollbar-hidden", legacyScrollbarHiddenViews.has(currentView));
      };

      const resizeNoteTextarea = (event) => {
        const target = event && event.target ? event.target : null;
        if (!target || typeof target.tagName !== "string" || target.tagName.toLowerCase() !== "textarea") {
          return;
        }
        const computedStyle =
          typeof window !== "undefined" && typeof window.getComputedStyle === "function"
            ? window.getComputedStyle(target)
            : null;
        const minHeight = Math.max(20, computedStyle ? parseFloat(computedStyle.minHeight || "0") : 0);
        target.style.height = "auto";
        const maxHeight = 96;
        const contentHeight = target.scrollHeight;
        const nextHeight = Math.max(minHeight, Math.min(contentHeight || 0, maxHeight));
        target.style.height = `${nextHeight}px`;
        target.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
      };

      const notePopoverKey = ref(null);
      const toggleNotePopover = (weaponName) => {
        notePopoverKey.value = notePopoverKey.value === weaponName ? null : weaponName;
      };
      const closeNotePopover = () => {
        notePopoverKey.value = null;
      };

      const syncQuery = (replace = false) => {
        if (typeof window === "undefined") return;
        if (applyingRoute) return;
        const nextQuery = buildQuery();
        const nextUrl = `${window.location.pathname}${nextQuery}`;
        const currentUrl = `${window.location.pathname}${window.location.search || ""}`;
        if (nextUrl === currentUrl) return;
        if (replace) {
          window.history.replaceState(null, "", nextUrl);
        } else {
          window.history.pushState(null, "", nextUrl);
        }
        return nextUrl;
      };

      const onPopState = () => {
        applyRoute(parseRoute());
        syncLegacyScrollbarMode();
      };

      const handleDocumentClick = (event) => {
        const target = event && event.target;
        if (!target || !target.closest) return;
        const isDropdownClick = target.closest(".filter-dropdown-wrapper");
        if (!isDropdownClick && state.closeAllDropdowns) {
          state.closeAllDropdowns();
        }
      };

      onMounted(() => {
        const route = parseRoute();
        applyRoute(route);
        syncLegacyScrollbarMode();
        syncQuery(true);
        if (typeof window !== "undefined") {
          window.addEventListener("popstate", onPopState);
        }
        if (typeof document !== "undefined") {
          document.addEventListener("click", handleDocumentClick);
        }
      });

      onBeforeUnmount(() => {
        if (typeof window !== "undefined") {
          window.removeEventListener("popstate", onPopState);
        }
        if (typeof document !== "undefined") {
          document.removeEventListener("click", handleDocumentClick);
        }
        if (typeof document === "undefined" || !document.documentElement) return;
        document.documentElement.classList.remove("legacy-scrollbar-hidden");
      });

      if (typeof watch === "function") {
        watch(
          state.currentView,
          (view) => {
            ensureViewBundleLoaded(view);
          },
          { immediate: true }
        );
      }

      watch([state.currentView, () => (state.selectedCharacterId ? state.selectedCharacterId.value : null)], () => {
        syncLegacyScrollbarMode();
        syncQuery(false);
      });

      watch(
        () => {
          const selectedNames = state.selectedNames;
          return selectedNames && Array.isArray(selectedNames.value) ? selectedNames.value.length : 0;
        },
        (len) => {
          const showSelectedWeaponsPopup = state.showSelectedWeaponsPopup;
          if (!showSelectedWeaponsPopup) return;
          if (len <= 5 && showSelectedWeaponsPopup.value) {
            showSelectedWeaponsPopup.value = false;
          }
        }
      );

      const parseExceptionTime = (value) => {
        const time = Date.parse(String(value || ""));
        return Number.isFinite(time) ? time : 0;
      };
      const toExceptionKey = (entry, kind) => {
        if (!entry || typeof entry !== "object") return `${kind}:unknown`;
        const optionalSignature = String(
          entry.optionalSignature || entry.signature || ""
        ).trim();
        if (optionalSignature) {
          return `${kind}:sig:${optionalSignature}`;
        }
        if (kind === "runtime") {
          return [
            kind,
            entry.operation || "",
            entry.key || "",
            entry.errorName || "",
            entry.errorMessage || "",
          ].join("|");
        }
        if (entry.id) return `${kind}:${entry.id}`;
        return [
          kind,
          entry.occurredAt || "",
          entry.operation || "",
          entry.key || "",
          entry.errorName || "",
          entry.errorMessage || "",
        ].join("|");
      };
      const unifiedExceptionCurrent = computed(() => {
        const storageShown = Boolean(state.showStorageErrorModal && state.showStorageErrorModal.value);
        const runtimeShown = Boolean(state.showRuntimeWarningModal && state.showRuntimeWarningModal.value);
        const storageCurrent = state.storageErrorCurrent ? state.storageErrorCurrent.value : null;
        const runtimeCurrent = state.runtimeWarningCurrent ? state.runtimeWarningCurrent.value : null;
        if (!storageShown && !runtimeShown) return null;
        if (storageShown && !runtimeShown) {
          return storageCurrent ? { ...storageCurrent, __kind: "storage" } : null;
        }
        if (!storageShown && runtimeShown) {
          return runtimeCurrent ? { ...runtimeCurrent, __kind: "runtime" } : null;
        }
        const storageTime = parseExceptionTime(storageCurrent && storageCurrent.occurredAt);
        const runtimeTime = parseExceptionTime(runtimeCurrent && runtimeCurrent.occurredAt);
        if (runtimeTime >= storageTime) {
          return runtimeCurrent
            ? { ...runtimeCurrent, __kind: "runtime" }
            : storageCurrent
            ? { ...storageCurrent, __kind: "storage" }
            : null;
        }
        return storageCurrent
          ? { ...storageCurrent, __kind: "storage" }
          : runtimeCurrent
          ? { ...runtimeCurrent, __kind: "runtime" }
          : null;
      });
      const activeUnifiedExceptionKind = computed(() => {
        const current = unifiedExceptionCurrent.value;
        return current && current.__kind === "runtime" ? "runtime" : "storage";
      });
      const showUnifiedExceptionModal = computed(() =>
        Boolean(
          (state.showStorageErrorModal && state.showStorageErrorModal.value) ||
            (state.showRuntimeWarningModal && state.showRuntimeWarningModal.value)
        )
      );
      const isOptionalUnifiedException = computed(() => {
        const current = unifiedExceptionCurrent.value;
        if (!current || current.__kind !== "runtime") return false;
        const operation = String(current.operation || "");
        const scope = String(current.scope || "");
        const errorName = String(current.errorName || "");
        return (
          operation === "optional.load" ||
          scope === "boot.optional-resource" ||
          scope === "compat.avif" ||
          operation === "media.avif-check" ||
          scope === "i18n.missing-key" ||
          errorName === "AvifUnsupportedError" ||
          errorName === "I18nMissingKeyError"
        );
      });
      const unifiedExceptionLogs = computed(() => {
        const runtimeLogs =
          state.runtimeWarningLogs && Array.isArray(state.runtimeWarningLogs.value)
            ? state.runtimeWarningLogs.value
            : [];
        const storageLogs =
          state.storageErrorLogs && Array.isArray(state.storageErrorLogs.value)
            ? state.storageErrorLogs.value
            : [];
        const merged = [];
        runtimeLogs.forEach((entry) => {
          if (!entry || typeof entry !== "object") return;
          merged.push({ ...entry, __kind: "runtime" });
        });
        storageLogs.forEach((entry) => {
          if (!entry || typeof entry !== "object") return;
          merged.push({ ...entry, __kind: "storage" });
        });
        const storageCurrent = state.storageErrorCurrent ? state.storageErrorCurrent.value : null;
        const runtimeCurrent = state.runtimeWarningCurrent ? state.runtimeWarningCurrent.value : null;
        if (runtimeCurrent && typeof runtimeCurrent === "object") {
          merged.push({ ...runtimeCurrent, __kind: "runtime" });
        }
        if (storageCurrent && typeof storageCurrent === "object") {
          merged.push({ ...storageCurrent, __kind: "storage" });
        }
        const dedup = new Map();
        merged.forEach((entry) => {
          const key = toExceptionKey(entry, entry.__kind || "storage");
          if (!dedup.has(key)) {
            dedup.set(key, entry);
          }
        });
        return Array.from(dedup.values())
          .sort((a, b) => parseExceptionTime(b.occurredAt) - parseExceptionTime(a.occurredAt))
          .slice(0, 20);
      });
      const unifiedExceptionPreviewText = computed(() => {
        const current = unifiedExceptionCurrent.value;
        if (!current) return "";
        if (current.__kind === "runtime") {
          return state.runtimeWarningPreviewText ? state.runtimeWarningPreviewText.value || "" : "";
        }
        return state.storageErrorPreviewText ? state.storageErrorPreviewText.value || "" : "";
      });
      const exportUnifiedExceptionDiagnostic = () => {
        if (
          activeUnifiedExceptionKind.value === "runtime" &&
          typeof state.exportRuntimeDiagnosticBundle === "function"
        ) {
          state.exportRuntimeDiagnosticBundle();
          return;
        }
        if (typeof state.exportStorageDiagnosticBundle === "function") {
          state.exportStorageDiagnosticBundle();
        }
      };
      const refreshUnifiedException = () => {
        if (
          activeUnifiedExceptionKind.value === "runtime" &&
          typeof state.reloadBypassCache === "function"
        ) {
          state.reloadBypassCache();
          return;
        }
        if (typeof state.requestStorageDataClear === "function") {
          state.requestStorageDataClear();
        }
      };
      const ignoreUnifiedException = () => {
        if (
          activeUnifiedExceptionKind.value === "runtime" &&
          isOptionalUnifiedException.value &&
          typeof state.dismissRuntimeWarning === "function"
        ) {
          state.dismissRuntimeWarning();
          return;
        }
        if (
          activeUnifiedExceptionKind.value === "runtime" &&
          typeof state.requestIgnoreRuntimeWarnings === "function"
        ) {
          state.requestIgnoreRuntimeWarnings();
          return;
        }
        if (typeof state.requestIgnoreStorageErrors === "function") {
          state.requestIgnoreStorageErrors();
        }
      };
      const buildRuntimeWarningPreviewFromEntry = (entry) => {
        if (!entry) return "";
        const lines = [
          `scope: ${entry.scope || "unknown"}`,
          `operation: ${entry.operation || "unknown"}`,
          `key: ${entry.key || "unknown"}`,
          `error: ${entry.errorName || "Error"}: ${entry.errorMessage || "unknown"}`,
        ];
        if (entry.note) {
          lines.push(`note: ${entry.note}`);
        }
        if (entry.errorStack) {
          lines.push("", "stack:", String(entry.errorStack));
        }
        return lines.join("\n");
      };
      const buildStorageErrorPreviewFromEntry = (entry) => {
        if (!entry) return "";
        if (typeof entry.previewText === "string" && entry.previewText) {
          return entry.previewText;
        }
        const lines = [
          `operation: ${entry.operation || "unknown"}`,
          `key: ${entry.key || "unknown"}`,
          `error: ${entry.errorName || "Error"}: ${entry.errorMessage || "unknown"}`,
        ];
        if (entry.scope) {
          lines.push(`scope: ${entry.scope}`);
        }
        if (entry.note) {
          lines.push(`note: ${entry.note}`);
        }
        return lines.join("\n");
      };
      const openUnifiedExceptionFromLog = (item) => {
        if (!item || typeof item !== "object") return;
        const kind = String(item.__kind || "runtime");
        if (kind === "storage") {
          const storageEntry = { ...item };
          delete storageEntry.__kind;
          if (state.storageErrorCurrent) {
            state.storageErrorCurrent.value = storageEntry;
          }
          if (state.storageErrorPreviewText) {
            state.storageErrorPreviewText.value = buildStorageErrorPreviewFromEntry(storageEntry);
          }
          if (state.showRuntimeWarningModal) {
            state.showRuntimeWarningModal.value = false;
          }
          if (state.showStorageErrorModal) {
            state.showStorageErrorModal.value = true;
          }
          return;
        }
        const runtimeEntry = { ...item };
        delete runtimeEntry.__kind;
        if (!runtimeEntry.errorName && runtimeEntry.code) {
          runtimeEntry.errorName = String(runtimeEntry.code);
        }
        if (!runtimeEntry.errorMessage && runtimeEntry.message) {
          runtimeEntry.errorMessage = String(runtimeEntry.message);
        }
        if (state.runtimeWarningCurrent) {
          state.runtimeWarningCurrent.value = runtimeEntry;
        }
        if (state.runtimeWarningPreviewText) {
          state.runtimeWarningPreviewText.value = buildRuntimeWarningPreviewFromEntry(runtimeEntry);
        }
        if (state.runtimeWarningLogs && Array.isArray(state.runtimeWarningLogs.value)) {
          const runtimeKey = toExceptionKey(runtimeEntry, "runtime");
          const nextLogs = [runtimeEntry].concat(
            state.runtimeWarningLogs.value.filter(
              (entry) => toExceptionKey(entry, "runtime") !== runtimeKey
            )
          );
          state.runtimeWarningLogs.value = nextLogs.slice(0, 20);
        }
        if (state.showStorageErrorModal) {
          state.showStorageErrorModal.value = false;
        }
        if (state.showRuntimeWarningModal) {
          state.showRuntimeWarningModal.value = true;
        }
      };
      state.openUnifiedExceptionFromLog = openUnifiedExceptionFromLog;

      if (!state.showFaq) {
        state.showFaq = ref(false);
      }
      if (!state.faqContent) {
        state.faqContent = computed(() => ({
          title: "常见问题",
          emptyText: "暂无常见问题",
          items: [],
        }));
      }
      if (!state.faqItems) {
        state.faqItems = computed(() => []);
      }
      const openFaq =
        typeof state.openFaq === "function"
          ? state.openFaq
          : async () => {
              if (state.showFaq && state.showFaq.value !== undefined) {
                state.showFaq.value = true;
              }
              if (typeof state.ensureContentLoaded === "function") {
                await state.ensureContentLoaded({ withSponsors: false });
              }
            };

      const formatSourceInfo = (source) => {
        if (!source || typeof source !== "object") return "";

        if (source.type === "planner-web") {
          const ua = source.userAgent || "";
          let platform = null;
          if (ua.includes("Windows")) platform = "Windows";
          else if (ua.includes("Mac OS")) platform = "macOS";
          else if (ua.includes("Linux")) platform = "Linux";
          else if (ua.includes("Android")) platform = "Android";
          else if (ua.includes("iPhone") || ua.includes("iPad")) platform = "iOS";

          const browserText = state.t ? state.t("plan_config.marks_import_source_browser") : "浏览器导出";
          return platform ? `${browserText} (${platform})` : browserText;
        }

        return source.version ? `${source.type} v${source.version}` : source.type;
      };

      return {
        currentView: state.currentView,
        setView: (view) => {
          if (
            view === "equip-refining" &&
            typeof state.markEquipRefiningNavHintSeen === "function"
          ) {
            state.markEquipRefiningNavHintSeen();
          }
          if (
            view === "rerun-ranking" &&
            typeof state.markRerunRankingNavHintSeen === "function"
          ) {
            state.markRerunRankingNavHintSeen();
          }
          state.currentView.value = view;
          window.scrollTo(0, 0);
        },
        isViewBundleLoading,
        isViewBundleFailed,
        isViewBundleReady,
        getViewBundleError,
        retryViewLoad,
        refreshPage,
        locale: state.locale,
        languageOptions: state.languageOptions,
        langSwitchRef: state.langSwitchRef,
        showLangMenu: state.showLangMenu,
        langMenuPlacement: state.langMenuPlacement,
        toggleLangMenu: state.toggleLangMenu,
        setLocale: state.setLocale,
        cycleLocale: state.cycleLocale,
        t: state.t,
        tTerm: state.tTerm,
        localeRenderVersion: state.localeRenderVersion,
        tRegionPriorityModeOptions: state.tRegionPriorityModeOptions,
        tOwnershipPriorityModeOptions: state.tOwnershipPriorityModeOptions,
        tStrictPriorityOrderOptions: state.tStrictPriorityOrderOptions,
        showAiNotice: state.showAiNotice,
        heroAdBannerEnabled: state.heroAdBannerEnabled,
        searchQuery: state.searchQuery,
        selectedNames: state.selectedNames,
        selectedCount: state.selectedCount,
        pendingCount: state.pendingCount,
        selectedWeaponRows: state.selectedWeaponRows,
        pendingSelectedWeapons: state.pendingSelectedWeapons,
        selectedWeapons: state.selectedWeapons,
        selectedNameSet: state.selectedNameSet,
        isWeaponOwned: state.isWeaponOwned,
        isUnowned: state.isUnowned,
        isEssenceOwned: state.isEssenceOwned,
        isEssenceOwnedForPlanning: state.isEssenceOwnedForPlanning,
        toggleWeaponOwned: state.toggleWeaponOwned,
        toggleEssenceOwned: state.toggleEssenceOwned,
        getWeaponNote: state.getWeaponNote,
        updateWeaponNote: state.updateWeaponNote,
        toggleShowWeaponAttrs: state.toggleShowWeaponAttrs,
        showWeaponAttrs: state.showWeaponAttrs,
        toggleShowWeaponOwnershipInList: state.toggleShowWeaponOwnershipInList,
        toggleShowWeaponOwnershipInPlans: state.toggleShowWeaponOwnershipInPlans,
        showWeaponOwnershipInList: state.showWeaponOwnershipInList,
        showWeaponOwnershipInPlans: state.showWeaponOwnershipInPlans,
        showAttrHint: state.showAttrHint,
        dismissAttrHint: state.dismissAttrHint,
        showFilterPanel: state.showFilterPanel,
        toggleFilterPanel: state.toggleFilterPanel,
        showAllSchemes: state.showAllSchemes,
        showPlanConfig: state.showPlanConfig,
        showWeaponAttrDataModal: state.showWeaponAttrDataModal,
        showPlanConfigHintDot: state.showPlanConfigHintDot,
        showPlanConfigOwnershipHintDot: state.showPlanConfigOwnershipHintDot,
        marksImportError: state.marksImportError,
        marksImportFileName: state.marksImportFileName,
        marksImportSummary: state.marksImportSummary,
        marksImportMeta: state.marksImportMeta,
        marksImportConfirmCountdown: state.marksImportConfirmCountdown,
        showMarksImportConfirmModal: state.showMarksImportConfirmModal,
        exportWeaponMarks: state.exportWeaponMarks,
        handleMarksImportFile: state.handleMarksImportFile,
        cancelMarksImport: state.cancelMarksImport,
        confirmMarksImport: state.confirmMarksImport,
        formatSourceInfo,
        showEquipRefiningNavHintDot: state.showEquipRefiningNavHintDot,


        showRerunRankingNavHintDot: state.showRerunRankingNavHintDot,
        showEditorEntry: state.showEditorEntry,
        togglePlanConfig: state.togglePlanConfig,
        markPlanConfigOwnershipHintSeen: state.markPlanConfigOwnershipHintSeen,
        isPlanConfigSectionCollapsed: state.isPlanConfigSectionCollapsed,
        togglePlanConfigSectionCollapsed: state.togglePlanConfigSectionCollapsed,
        openWeaponAttrDataModal: state.openWeaponAttrDataModal,
        openWeaponDataIntegrityDetails: state.openWeaponDataIntegrityDetails,
        closeWeaponAttrDataModal: state.closeWeaponAttrDataModal,
        hasWeaponAttrIssues: state.hasWeaponAttrIssues,
        weaponAttrIssueRows: state.weaponAttrIssueRows,
        previewWeaponRows: state.previewWeaponRows,
        hasPreviewWeapons: state.hasPreviewWeapons,
        dataIntegrityWeaponAttrRows: state.dataIntegrityWeaponAttrRows,
        hasDataIntegrityWeaponAttrs: state.hasDataIntegrityWeaponAttrs,
        weaponAttrS1Options: state.weaponAttrS1Options,
        weaponAttrS2Options: state.weaponAttrS2Options,
        weaponAttrS3Options: state.weaponAttrS3Options,
        customWeapons: state.customWeapons,
        customWeaponDraft: state.customWeaponDraft,
        customWeaponError: state.customWeaponError,
        addCustomWeapon: state.addCustomWeapon,
        removeCustomWeapon: state.removeCustomWeapon,
        resetCustomWeaponDraft: state.resetCustomWeaponDraft,
        setWeaponAttrOverride: state.setWeaponAttrOverride,
        clearWeaponAttrOverride: state.clearWeaponAttrOverride,
        getWeaponAttrEditorValue: state.getWeaponAttrEditorValue,
        isWeaponRawAttrMissingField: state.isWeaponRawAttrMissingField,
        recommendationConfig: state.recommendationConfig,
        regionOptions: state.regionOptions,
        availableRegions: state.availableRegions,
        showBackToTop: state.showBackToTop,
        scrollToTop: state.scrollToTop,
        tutorialActive: state.tutorialActive,
        tutorialStep: state.tutorialStep,
        tutorialVisibleLines: state.tutorialVisibleLines,
        tutorialStepIndex: state.tutorialStepIndex,
        tutorialTotalSteps: state.tutorialTotalSteps,
        tutorialStepKey: state.tutorialStepKey,
        tutorialStepReady: state.tutorialStepReady,
        tutorialWeapon: state.tutorialWeapon,
        tutorialEssenceOwned: state.tutorialEssenceOwned,
        tutorialNote: state.tutorialNote,
        tutorialBodyCanCollapse: state.tutorialBodyCanCollapse,
        tutorialBodyCollapsed: state.tutorialBodyCollapsed,
        tutorialCollapseHighlight: state.tutorialCollapseHighlight,
        tutorialSkipAll: state.tutorialSkipAll,
        showTutorialSkipConfirm: state.showTutorialSkipConfirm,
        showTutorialComplete: state.showTutorialComplete,
        tutorialTargetSchemeKey: state.tutorialTargetSchemeKey,
        isTutorialGuideWeapon: state.isTutorialGuideWeapon,
        isPortrait: state.isPortrait,
        startTutorial: state.startTutorial,
        nextTutorialStep: state.nextTutorialStep,
        prevTutorialStep: state.prevTutorialStep,
        skipTutorialStep: state.skipTutorialStep,
        skipTutorialAll: state.skipTutorialAll,
        openTutorialSkipConfirm: state.openTutorialSkipConfirm,
        closeTutorialSkipConfirm: state.closeTutorialSkipConfirm,
        confirmTutorialSkipAll: state.confirmTutorialSkipAll,
        closeTutorialComplete: state.closeTutorialComplete,
        finishTutorial: state.finishTutorial,
        toggleTutorialBody: state.toggleTutorialBody,
        toggleTutorialEssenceOwned: state.toggleTutorialEssenceOwned,
        updateTutorialNote: state.updateTutorialNote,
        resizeNoteTextarea,
        markTutorialNoteTouched: state.markTutorialNoteTouched,
        tutorialWeaponTarget: state.tutorialWeaponTarget,
        tutorialSchemeTarget: state.tutorialSchemeTarget,
        tutorialPlansTab: state.tutorialPlansTab,
        filterS1: state.filterS1,
        filterS2: state.filterS2,
        filterS3: state.filterS3,
        dropdownOpenS1: state.dropdownOpenS1,
        dropdownOpenS2: state.dropdownOpenS2,
        dropdownOpenS3: state.dropdownOpenS3,
        s1Options: state.s1Options,
        s2Options: state.s2Options,
        s3OptionEntries: state.s3OptionEntries,
        selectorHiddenMemoKey: state.selectorHiddenMemoKey,
        weaponUpBadgeMemoKey: state.weaponUpBadgeMemoKey,
        isWeaponUpActive: state.isWeaponUpActive,
        rerunRankingRows: state.rerunRankingRows,
        hasRerunRankingRows: state.hasRerunRankingRows,
        rerunRankingGeneratedAt: state.rerunRankingGeneratedAt,
        toggleFilterValue: state.toggleFilterValue,
        toggleDropdown: state.toggleDropdown,
        closeAllDropdowns: state.closeAllDropdowns,
        clearAttributeFilters: state.clearAttributeFilters,
        hasAttributeFilters: state.hasAttributeFilters,
        isRegionSelected: state.isRegionSelected,
        toggleRegionFilter: state.toggleRegionFilter,
        filteredWeapons: state.filteredWeapons,
        visibleFilteredWeapons: state.visibleFilteredWeapons,
        hiddenInSelectorSummary: state.hiddenInSelectorSummary,
        getSelectorHiddenReason: state.getSelectorHiddenReason,
        weaponGridTopSpacer: state.weaponGridTopSpacer,
        weaponGridBottomSpacer: state.weaponGridBottomSpacer,
        allFilteredSelected: state.allFilteredSelected,
        allWeaponsSelected: state.allWeaponsSelected,
        recommendations: state.recommendations,
        recommendationDataIssue: state.recommendationDataIssue,
        recommendationEmptyReason: state.recommendationEmptyReason,
        coverageSummary: state.coverageSummary,
        primaryRecommendations: state.primaryRecommendations,
        extraRecommendations: state.extraRecommendations,
        visibleRecommendations: state.visibleRecommendations,
        displayRecommendations: state.displayRecommendations,
        displayDividerIndex: state.displayDividerIndex,
        visibleDisplayRecommendations: state.visibleDisplayRecommendations,
        recommendationVirtualStartIndex: state.recommendationVirtualStartIndex,
        recommendationTopSpacer: state.recommendationTopSpacer,
        recommendationBottomSpacer: state.recommendationBottomSpacer,
        fallbackPlan: state.fallbackPlan,
        toggleWeapon: state.toggleWeapon,
        toggleSchemeBasePick: state.toggleSchemeBasePick,
        isConflictOpen: state.isConflictOpen,
        toggleConflictOpen: state.toggleConflictOpen,
        selectAllWeapons: state.selectAllWeapons,
        clearSelection: state.clearSelection,
        formatS1: state.formatS1,
        rarityBadgeStyle: state.rarityBadgeStyle,
        rarityTextStyle: state.rarityTextStyle,
        matchQuery: state.matchQuery,
        matchSourceName: state.matchSourceName,
        matchSourceList: state.matchSourceList,
        matchSourceWeapon: state.matchSourceWeapon,
        matchResults: state.matchResults,
        selectMatchSource: state.selectMatchSource,
        equipRefiningMobilePanel: state.equipRefiningMobilePanel,
        get isEquipRefiningCompact() {
          return state.isEquipRefiningCompact;
        },
        get setEquipRefiningMobilePanel() {
          return state.setEquipRefiningMobilePanel;
        },
        get equipRefiningQuery() {
          return state.equipRefiningQuery;
        },
        set equipRefiningQuery(value) {
          if (state.equipRefiningQuery) {
            state.equipRefiningQuery.value = value;
          }
        },
        get equipRefiningFilterSub1() {
          return state.equipRefiningFilterSub1;
        },
        get equipRefiningFilterSub2() {
          return state.equipRefiningFilterSub2;
        },
        get equipRefiningFilterSpecial() {
          return state.equipRefiningFilterSpecial;
        },
        get equipRefiningFilterOptionEntries() {
          return state.equipRefiningFilterOptionEntries;
        },
        get equipRefiningFilterPanelCollapsed() {
          return state.equipRefiningFilterPanelCollapsed;
        },
        get toggleEquipRefiningFilterValue() {
          return state.toggleEquipRefiningFilterValue;
        },
        get clearEquipRefiningFilters() {
          return state.clearEquipRefiningFilters;
        },
        get toggleEquipRefiningFilterPanelCollapsed() {
          return state.toggleEquipRefiningFilterPanelCollapsed;
        },
        get equipRefiningEquipCount() {
          return state.equipRefiningEquipCount;
        },
        get isEquipRefiningSetCollapsed() {
          return state.isEquipRefiningSetCollapsed;
        },
        get toggleEquipRefiningSetCollapsed() {
          return state.toggleEquipRefiningSetCollapsed;
        },
        get isRecommendationExpanded() {
          return state.isRecommendationExpanded;
        },
        get toggleRecommendationExpanded() {
          return state.toggleRecommendationExpanded;
        },
        get hasMoreRecommendationCandidates() {
          return state.hasMoreRecommendationCandidates;
        },
        get visibleRecommendationCandidates() {
          return state.visibleRecommendationCandidates;
        },
        get equipRefiningGroupedSets() {
          return state.equipRefiningGroupedSets;
        },
        get selectedEquipRefiningEquipName() {
          return state.selectedEquipRefiningEquipName;
        },
        get selectedEquipRefiningEquip() {
          return state.selectedEquipRefiningEquip;
        },
        get selectEquipRefiningEquip() {
          return state.selectEquipRefiningEquip;
        },
        get equipRefiningRecommendations() {
          return state.equipRefiningRecommendations;
        },
        get equipRefiningEquipImageSrc() {
          return state.equipRefiningEquipImageSrc;
        },
        get hasEquipRefiningEquipImage() {
          return state.hasEquipRefiningEquipImage;
        },
        get handleEquipRefiningEquipImageError() {
          return state.handleEquipRefiningEquipImageError;
        },
        hasImage: state.hasImage,
        weaponImageSrc: state.weaponImageSrc,
        hasEquipImage: state.hasEquipImage,
        equipImageSrc: state.equipImageSrc,
        resolveItemLabel: state.resolveItemLabel,
        resolvePotentialName: state.resolvePotentialName,
        resolvePotentialDescription: state.resolvePotentialDescription,
        hasItemImage: state.hasItemImage,
        itemImageSrc: state.itemImageSrc,
        weaponCharacters: state.weaponCharacters,
        characterImageSrc: state.characterImageSrc,
        characterCardSrc: state.characterCardSrc,
        handleCharacterImageError: state.handleCharacterImageError,
        handleCharacterCardError: state.handleCharacterCardError,
        announcement: state.announcement,
        formatNoticeItem: state.formatNoticeItem,
        changelog: state.changelog,
        aboutContent: state.aboutContent,
        faqContent: state.faqContent,
        faqItems: state.faqItems,
        contentLoading: state.contentLoading,
        showAbout: state.showAbout,
        showFaq: state.showFaq,
        showSyncModal: state.showSyncModal,
        showCnSyncUnavailableModal: state.showCnSyncUnavailableModal,
        showNotice: state.showNotice,
        showChangelog: state.showChangelog,
        hasLegacyMigrationData: state.hasLegacyMigrationData,
        showStorageErrorModal: state.showStorageErrorModal,
        showRuntimeWarningModal: state.showRuntimeWarningModal,
        showRuntimeIgnoreConfirmModal: state.showRuntimeIgnoreConfirmModal,
        showStorageClearConfirmModal: state.showStorageClearConfirmModal,
        showStorageIgnoreConfirmModal: state.showStorageIgnoreConfirmModal,
        storageErrorCurrent: state.storageErrorCurrent,
        storageErrorLogs: state.storageErrorLogs,
        storageErrorPreviewText: state.storageErrorPreviewText,
        runtimeWarningCurrent: state.runtimeWarningCurrent,
        runtimeWarningLogs: state.runtimeWarningLogs,
        runtimeWarningPreviewText: state.runtimeWarningPreviewText,
        storageErrorClearCountdown: state.storageErrorClearCountdown,
        storageErrorClearTargetKeys: state.storageErrorClearTargetKeys,
        storageFeedbackUrl: state.storageFeedbackUrl,
        dismissRuntimeWarning: state.dismissRuntimeWarning,
        toastNotices: state.toastNotices,
        toastNotice: state.toastNotice,
        toastDefaultDurationMs: state.toastDefaultDurationMs,
        dismissToastNotice: state.dismissToastNotice,
        pauseToastNotice: state.pauseToastNotice,
        resumeToastNotice: state.resumeToastNotice,
        isToastNoticePaused: state.isToastNoticePaused,
        resumeToastNoticeIfNotHovered: state.resumeToastNoticeIfNotHovered,
        pauseAllToastNotices: state.pauseAllToastNotices,
        resumeAllToastNotices: state.resumeAllToastNotices,
        prepareToastLeave,
        runToastAction: state.runToastAction,
        activateToastNotice: state.activateToastNotice,
        hasRuntimeWarningHistory: state.hasRuntimeWarningHistory,
        dismissOptionalFailureNotice: state.dismissOptionalFailureNotice,
        openOptionalFailureDetailByLogId: state.openOptionalFailureDetailByLogId,
        openLatestRuntimeWarningDetail: state.openLatestRuntimeWarningDetail,
        ignoreRuntimeWarnings: state.ignoreRuntimeWarnings,
        requestIgnoreRuntimeWarnings: state.requestIgnoreRuntimeWarnings,
        cancelIgnoreRuntimeWarnings: state.cancelIgnoreRuntimeWarnings,
        confirmIgnoreRuntimeWarnings: state.confirmIgnoreRuntimeWarnings,
        reloadBypassCache: state.reloadBypassCache,
        exportRuntimeDiagnosticBundle: state.exportRuntimeDiagnosticBundle,
        showUnifiedExceptionModal,
        unifiedExceptionCurrent,
        activeUnifiedExceptionKind,
        unifiedExceptionLogs,
        unifiedExceptionPreviewText,
        exportUnifiedExceptionDiagnostic,
        refreshUnifiedException,
        ignoreUnifiedException,
        openUnifiedExceptionFromLog,
        ignoreStorageErrors: state.ignoreStorageErrors,
        requestIgnoreStorageErrors: state.requestIgnoreStorageErrors,
        cancelIgnoreStorageErrors: state.cancelIgnoreStorageErrors,
        confirmIgnoreStorageErrors: state.confirmIgnoreStorageErrors,
        exportStorageDiagnosticBundle: state.exportStorageDiagnosticBundle,
        requestStorageDataClear: state.requestStorageDataClear,
        cancelStorageDataClear: state.cancelStorageDataClear,
        confirmStorageDataClearAndReload: state.confirmStorageDataClearAndReload,
        showUpdatePrompt: state.showUpdatePrompt,
        updateCurrentVersionText: state.updateCurrentVersionText,
        updateLatestVersionText: state.updateLatestVersionText,
        updateLatestPublishedAt: state.updateLatestPublishedAt,
        versionBadgeDisplayText: state.versionBadgeDisplayText,
        gameCompatSupportedVersion: state.gameCompatSupportedVersion,
        gameCompatNextVersion: state.gameCompatNextVersion,
        gameCompatNextVersionAtText: state.gameCompatNextVersionAtText,
        showGameCompatWarning: state.showGameCompatWarning,
        versionCopyFeedbackText: state.versionCopyFeedbackText,
        copyCurrentVersionInfo: state.copyCurrentVersionInfo,
        dismissGameCompatWarning: state.dismissGameCompatWarning,
        dismissUpdatePrompt: state.dismissUpdatePrompt,
        reloadToLatestVersion: state.reloadToLatestVersion,
        skipNotice: state.skipNotice,
        openNotice: state.openNotice,
        openChangelog: state.openChangelog,
        openAbout: state.openAbout,
        openFaq,
        openCnSyncUnavailableModal: state.openCnSyncUnavailableModal,
        openSyncModal: state.openSyncModal,
        closeCnSyncUnavailableModal: state.closeCnSyncUnavailableModal,
        closeSyncModal: state.closeSyncModal,
        closeNotice: state.closeNotice,
        closeAdblockNotice: state.closeAdblockNotice,
        appReady: state.appReady,
        mobilePanel: state.mobilePanel,
        matchMobilePanel: state.matchMobilePanel,
        showDomainWarning: state.showDomainWarning,
        currentHost: state.currentHost,
        embedHostLabel: state.embedHostLabel,
        isEmbedTrusted: state.isEmbedTrusted,
        isEmbedded: state.isEmbedded,
        warningCountdown: state.warningCountdown,
        dismissDomainWarning: state.dismissDomainWarning,
        showIcpFooter: state.showIcpFooter,
        icpNumber: state.icpNumber,
        lowGpuEnabled: state.lowGpuEnabled,
        perfPreference: state.perfPreference,
        themePreference: state.themePreference,
        resolvedTheme: state.resolvedTheme,
        showSecondaryMenu: state.showSecondaryMenu,
        syncRegionAccessMode: state.syncRegionAccessMode,
        syncAuthMode: state.syncAuthMode,
        syncBusy: state.syncBusy,
        syncAuthenticated: state.syncAuthenticated,
        syncUser: state.syncUser,
        syncAccountInput: state.syncAccountInput,
        syncUsernameInput: state.syncUsernameInput,
        syncEmailInput: state.syncEmailInput,
        syncPasswordInput: state.syncPasswordInput,
        syncPasswordConfirmInput: state.syncPasswordConfirmInput,
        syncCurrentPasswordInput: state.syncCurrentPasswordInput,
        syncResetCodeInput: state.syncResetCodeInput,
        syncPasswordChangeMode: state.syncPasswordChangeMode,
        syncNewPasswordInput: state.syncNewPasswordInput,
        syncChangePasswordConfirmInput: state.syncChangePasswordConfirmInput,
        syncPasswordChangeError: state.syncPasswordChangeError,
        syncPasswordChangeNotice: state.syncPasswordChangeNotice,
        syncPasswordResetRequestAccountInput: state.syncPasswordResetRequestAccountInput,
        syncShowPasswordModal: state.syncShowPasswordModal,
        syncShowEmailModal: state.syncShowEmailModal,
        syncEmailActionMode: state.syncEmailActionMode,
        syncEmailActionInput: state.syncEmailActionInput,
        syncEmailCodeInput: state.syncEmailCodeInput,
        syncEmailActionError: state.syncEmailActionError,
        syncEmailActionNotice: state.syncEmailActionNotice,
        syncVerificationCooldownSeconds: state.syncVerificationCooldownSeconds,
        syncVerificationSubmitCooldownSeconds: state.syncVerificationSubmitCooldownSeconds,
        syncEmailChangeCooldownSeconds: state.syncEmailChangeCooldownSeconds,
        syncResetCodeRequestCooldownSeconds: state.syncResetCodeRequestCooldownSeconds,
        syncPaymentChannelInput: state.syncPaymentChannelInput,
        syncPaymentReferenceInput: state.syncPaymentReferenceInput,
        syncPaymentMerchantOrderInput: state.syncPaymentMerchantOrderInput,
        syncPaymentPaidTimeInput: state.syncPaymentPaidTimeInput,
        syncPaymentClaimError: state.syncPaymentClaimError,
        syncPaymentClaimNotice: state.syncPaymentClaimNotice,
        syncUserPaymentClaims: state.syncUserPaymentClaims,
        showSyncRightsDetails: state.showSyncRightsDetails,
        syncTurnstileRef: state.syncTurnstileRef,
        syncTurnstileLoading: state.syncTurnstileLoading,
        syncTurnstileUnavailable: state.syncTurnstileUnavailable,
        syncTurnstileEnabled: state.syncTurnstileEnabled,
        syncTurnstileMounted: state.syncTurnstileMounted,
        syncTurnstileReadyToSubmit: state.syncTurnstileReadyToSubmit,
        syncTurnstileVerified: state.syncTurnstileVerified,
        syncTurnstileMessage: state.syncTurnstileMessage,
        syncTurnstileMessageTone: state.syncTurnstileMessageTone,
        syncSessionChecking: state.syncSessionChecking,
        syncError: state.syncError,
        syncErrorDetails: state.syncErrorDetails,
        syncNotice: state.syncNotice,
        syncConflictDetected: state.syncConflictDetected,
        syncFrontendBlocked: state.syncFrontendBlocked,
        syncFrontendBlockedMessage: state.syncFrontendBlockedMessage,
        syncAutoSyncText: state.syncAutoSyncText,
        syncConflictCurrentSummary: state.syncConflictCurrentSummary,
        syncConflictConfirmMode: state.syncConflictConfirmMode,
        syncLocalSummary: state.syncLocalSummary,
        syncRemoteSummary: state.syncRemoteSummary,
        syncSuccessToastEnabled: state.syncSuccessToastEnabled,
        syncAutoSyncEnabled: state.syncAutoSyncEnabled,
        syncIsLocalhostMode: state.syncIsLocalhostMode,
        syncShowDevPanel: state.syncShowDevPanel,
        syncDevExpanded: state.syncDevExpanded,
        syncApiBaseInput: state.syncApiBaseInput,
        syncDevHeaderNameInput: state.syncDevHeaderNameInput,
        syncDevHeaderValueInput: state.syncDevHeaderValueInput,
        syncLastSyncedAt: state.syncLastSyncedAt,
        syncLastSyncedDisplay: state.syncLastSyncedDisplay,
        syncRemoteUpdatedDisplay: state.syncRemoteUpdatedDisplay,
        formatSyncDateTime: state.formatSyncDateTime,
        submitSyncAuth: state.submitSyncAuth,
        submitSyncPasswordChange: state.submitSyncPasswordChange,
        openSyncPasswordModal: state.openSyncPasswordModal,
        requestSyncResetCode: state.requestSyncResetCode,
        closeSyncPasswordModal: state.closeSyncPasswordModal,
        openSyncEmailModal: state.openSyncEmailModal,
        closeSyncEmailModal: state.closeSyncEmailModal,
        beginOverlayPointerClose: state.beginOverlayPointerClose,
        finishOverlayPointerClose: state.finishOverlayPointerClose,
        cancelOverlayPointerClose: state.cancelOverlayPointerClose,
        submitSyncEmailAction: state.submitSyncEmailAction,
        sendSyncVerificationCode: state.sendSyncVerificationCode,
        submitPaymentClaim: state.submitPaymentClaim,
        formatSyncPaymentChannelLabel: state.formatSyncPaymentChannelLabel,
        formatSyncPaymentStatusLabel: state.formatSyncPaymentStatusLabel,
        formatClaimTime: state.formatClaimTime,
        logoutSync: state.logoutSync,
        performManualSync: state.performManualSync,
        resolveSyncConflictUseServer: state.resolveSyncConflictUseServer,
        resolveSyncConflictUseLocal: state.resolveSyncConflictUseLocal,
        confirmSyncConflictResolution: state.confirmSyncConflictResolution,
        cancelSyncConflictConfirmation: state.cancelSyncConflictConfirmation,
        clearSyncFeedback: state.clearSyncFeedback,
        saveSyncDevSettings: state.saveSyncDevSettings,
        aboutAdLoaded: state.aboutAdLoaded,
        showAdblockNotice: state.showAdblockNotice,
        showPerfNotice: state.showPerfNotice,
        setPerfMode: state.setPerfMode,
        setThemeMode: state.setThemeMode,
        customBackground: state.customBackground,
        customBackgroundName: state.customBackgroundName,
        customBackgroundError: state.customBackgroundError,
        customBackgroundApi: state.customBackgroundApi,
        backgroundDisplayEnabled: state.backgroundDisplayEnabled,
        backgroundBlurEnabled: state.backgroundBlurEnabled,
        toggleBackgroundDisplayEnabled: state.toggleBackgroundDisplayEnabled,
        toggleBackgroundBlurEnabled: state.toggleBackgroundBlurEnabled,
        handleBackgroundFile: state.handleBackgroundFile,
        clearCustomBackground: state.clearCustomBackground,
        // Strategy Module
        get characters() {
          return state.characters;
        },
        get visibleCharacters() {
          return state.visibleCharacters;
        },
        get characterGridTopSpacer() {
          return state.characterGridTopSpacer;
        },
        get characterGridBottomSpacer() {
          return state.characterGridBottomSpacer;
        },
        charactersLoading: state.charactersLoading,
        charactersLoaded: state.charactersLoaded,
        get selectedCharacterId() {
          return state.selectedCharacterId;
        },
        get currentCharacter() {
          return state.currentCharacter;
        },
        get currentGuide() {
          return state.currentGuide;
        },
        get skillLevelLabels() {
          return state.skillLevelLabels;
        },
        get getSkillTables() {
          return state.getSkillTables;
        },
        get guideRows() {
          return state.guideRows;
        },
        get teamSlots() {
          return state.teamSlots;
        },
        get strategyCategory() {
          return state.strategyCategory;
        },
        get strategyTab() {
          return state.strategyTab;
        },
        get selectCharacter() {
          return state.selectCharacter;
        },
        get setStrategyCategory() {
          return state.setStrategyCategory;
        },
        get setStrategyTab() {
          return state.setStrategyTab;
        },
        get backToCharacterList() {
          return state.backToCharacterList;
        },
        get guideBeforeLeave() {
          return state.guideBeforeLeave;
        },
        get guideEnter() {
          return state.guideEnter;
        },
        // Editor Module
        get editorReady() {
          return state.editorReady;
        },
        get editorEnvLabel() {
          return state.editorEnvLabel;
        },
        get editorCharacters() {
          return state.editorCharacters;
        },
        get editorFilteredCharacters() {
          return state.editorFilteredCharacters;
        },
        get editorSelectedId() {
          return state.editorSelectedId;
        },
        get editorSelectedCharacter() {
          return state.editorSelectedCharacter;
        },
        get editorSearchQuery() {
          return state.editorSearchQuery;
        },
        get editorPickerOpen() {
          return state.editorPickerOpen;
        },
        get editorIssues() {
          return state.editorIssues;
        },
        get editorIssueMap() {
          return state.editorIssueMap;
        },
        get editorIssueSummary() {
          return state.editorIssueSummary;
        },
        get editorDirty() {
          return state.editorDirty;
        },
        get editorImportFileName() {
          return state.editorImportFileName;
        },
        get editorImportError() {
          return state.editorImportError;
        },
        get editorImportInput() {
          return state.editorImportInput;
        },
        get editorLoadError() {
          return state.editorLoadError;
        },
        get editorJsonDraft() {
          return state.editorJsonDraft;
        },
        get editorJsonErrors() {
          return state.editorJsonErrors;
        },
        get editorPotentialsDraft() {
          return state.editorPotentialsDraft;
        },
        get editorMaterialsDraft() {
          return state.editorMaterialsDraft;
        },
        get editorIdentityDraft() {
          return state.editorIdentityDraft;
        },
        get commitEditorCharacterIdentity() {
          return state.commitEditorCharacterIdentity;
        },
        get editorMaterialLevels() {
          return state.editorMaterialLevels;
        },
        get editorStrategyCategory() {
          return state.editorStrategyCategory;
        },
        get editorStrategyTab() {
          return state.editorStrategyTab;
        },
        get editorSectionState() {
          return state.editorSectionState;
        },
        get editorCurrentCharacter() {
          return state.editorCurrentCharacter;
        },
        get editorCurrentGuide() {
          return state.editorCurrentGuide;
        },
        get editorGuideRows() {
          return state.editorGuideRows;
        },
        get editorTeamSlots() {
          return state.editorTeamSlots;
        },
        get editorSkillLevelLabels() {
          return state.editorSkillLevelLabels;
        },
        get editorGetSkillTables() {
          return state.editorGetSkillTables;
        },
        get getEditorSkillValue() {
          return state.getEditorSkillValue;
        },
        get updateEditorSkillValue() {
          return state.updateEditorSkillValue;
        },
        get setEditorStrategyCategory() {
          return state.setEditorStrategyCategory;
        },
        get setEditorStrategyTab() {
          return state.setEditorStrategyTab;
        },
        get isEditorSectionExpanded() {
          return state.isEditorSectionExpanded;
        },
        get toggleEditorSection() {
          return state.toggleEditorSection;
        },
        get prepareEditorSectionEnter() {
          return state.prepareEditorSectionEnter;
        },
        get runEditorSectionEnter() {
          return state.runEditorSectionEnter;
        },
        get finishEditorSectionEnter() {
          return state.finishEditorSectionEnter;
        },
        get prepareEditorSectionLeave() {
          return state.prepareEditorSectionLeave;
        },
        get runEditorSectionLeave() {
          return state.runEditorSectionLeave;
        },
        get finishEditorSectionLeave() {
          return state.finishEditorSectionLeave;
        },
        get triggerEditorImport() {
          return state.triggerEditorImport;
        },
        get handleEditorImportFile() {
          return state.handleEditorImportFile;
        },
        get exportEditorData() {
          return state.exportEditorData;
        },
        get runEditorValidation() {
          return state.runEditorValidation;
        },
        get applyEditorAutoFix() {
          return state.applyEditorAutoFix;
        },
        get resetEditorChanges() {
          return state.resetEditorChanges;
        },
        get selectEditorCharacter() {
          return state.selectEditorCharacter;
        },
        get addEditorCharacter() {
          return state.addEditorCharacter;
        },
        get removeEditorCharacter() {
          return state.removeEditorCharacter;
        },
        get addEditorSkill() {
          return state.addEditorSkill;
        },
        get removeEditorSkill() {
          return state.removeEditorSkill;
        },
        get addEditorSkillTable() {
          return state.addEditorSkillTable;
        },
        get removeEditorSkillTable() {
          return state.removeEditorSkillTable;
        },
        get addEditorSkillRow() {
          return state.addEditorSkillRow;
        },
        get removeEditorSkillRow() {
          return state.removeEditorSkillRow;
        },
        get addEditorTalent() {
          return state.addEditorTalent;
        },
        get removeEditorTalent() {
          return state.removeEditorTalent;
        },
        get addEditorBaseSkill() {
          return state.addEditorBaseSkill;
        },
        get removeEditorBaseSkill() {
          return state.removeEditorBaseSkill;
        },
        get addEditorEquipRow() {
          return state.addEditorEquipRow;
        },
        get removeEditorEquipRow() {
          return state.removeEditorEquipRow;
        },
        get addEditorEquipWeapon() {
          return state.addEditorEquipWeapon;
        },
        get removeEditorEquipWeapon() {
          return state.removeEditorEquipWeapon;
        },
        get getEditorEquipSlotValue() {
          return state.getEditorEquipSlotValue;
        },
        get updateEditorEquipSlotField() {
          return state.updateEditorEquipSlotField;
        },
        get clearEditorEquipSlot() {
          return state.clearEditorEquipSlot;
        },
        get addEditorTeamSlot() {
          return state.addEditorTeamSlot;
        },
        get removeEditorTeamSlot() {
          return state.removeEditorTeamSlot;
        },
        get addEditorTeamOption() {
          return state.addEditorTeamOption;
        },
        get removeEditorTeamOption() {
          return state.removeEditorTeamOption;
        },
        get addEditorTeamWeapon() {
          return state.addEditorTeamWeapon;
        },
        get removeEditorTeamWeapon() {
          return state.removeEditorTeamWeapon;
        },
        get addEditorTeamEquip() {
          return state.addEditorTeamEquip;
        },
        get removeEditorTeamEquip() {
          return state.removeEditorTeamEquip;
        },
        get syncEditorJsonField() {
          return state.syncEditorJsonField;
        },
        get applyEditorJsonField() {
          return state.applyEditorJsonField;
        },
        get formatEditorJsonField() {
          return state.formatEditorJsonField;
        },
        get updateEditorPotentials() {
          return state.updateEditorPotentials;
        },
        get addEditorPotential() {
          return state.addEditorPotential;
        },
        get addEditorGuideAttribution() {
          return state.addEditorGuideAttribution;
        },
        get removeEditorGuideAttribution() {
          return state.removeEditorGuideAttribution;
        },
        get removeEditorPotential() {
          return state.removeEditorPotential;
        },
        get moveEditorPotential() {
          return state.moveEditorPotential;
        },
        get updateEditorPotentialField() {
          return state.updateEditorPotentialField;
        },
        get updateEditorMaterialLevel() {
          return state.updateEditorMaterialLevel;
        },
      };
    },
  });

  app.component("PlanConfigControl", planConfigControl);
  app.component("PlanConfigPanel", planConfigPanel);
  app.component("MatchStatusLine", matchStatusLine);
  app.component("MarkdownText", markdownText);
  app.component("EquipRefiningList", equipRefiningList);
  app.component("EquipRefiningDetail", equipRefiningDetail);
  app.component("EquipRefiningRecommendation", equipRefiningRecommendation);
  app.component("StrategyGuideDetail", strategyGuideDetail);
  app.directive("lazy-src", lazyImageDirective);
  app.mount("#app");
})();
