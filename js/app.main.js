(function () {
  const { createApp, ref, computed, onMounted, onBeforeUnmount, watch, nextTick } = Vue || {};

  const showBootError = (payload) => {
    if (typeof window !== "undefined" && typeof window.__renderBootError === "function") {
      window.__renderBootError(payload);
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

  if (!dungeons.length || !weapons.length || !gears.length) {
    finishPreload();
    showBootError({
      title: "数据文件缺失",
      summary: "核心数据未加载完成，当前无法进入页面。",
      details: [
        `副本数据：${dungeons.length ? "已加载" : "缺失"}`,
        `武器数据：${weapons.length ? "已加载" : "缺失"}`,
        `装备数据：${gears.length ? "已加载" : "缺失"}`,
        "请确认 ./data/dungeons.js、./data/weapons.js 与 ./data/gears.js 可访问",
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
  const gearRefiningListTemplate =
    typeof appTemplates.gearRefiningList === "string" && appTemplates.gearRefiningList.trim()
      ? appTemplates.gearRefiningList.trim()
      : "<div></div>";
  const gearRefiningDetailTemplate =
    typeof appTemplates.gearRefiningDetail === "string" && appTemplates.gearRefiningDetail.trim()
      ? appTemplates.gearRefiningDetail.trim()
      : "<div></div>";
  const gearRefiningRecommendationTemplate =
    typeof appTemplates.gearRefiningRecommendation === "string" &&
    appTemplates.gearRefiningRecommendation.trim()
      ? appTemplates.gearRefiningRecommendation.trim()
      : "<div></div>";

  const planConfigControl = {
    props: {
      t: { type: Function, required: true },
      recommendationConfig: { type: Object, required: true },
      showPlanConfig: { type: Boolean, required: true },
      showPlanConfigHintDot: { type: Boolean, required: true },
      regionOptions: { type: Array, required: true },
      tRegionPriorityModeOptions: { type: Array, required: true },
      tOwnershipPriorityModeOptions: { type: Array, required: true },
      tStrictPriorityOrderOptions: { type: Array, required: true },
      tTerm: { type: Function, required: true },
    },
    emits: ["toggle"],
    template: planConfigTemplate,
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
    class="match-status-chip"
    :class="{ 'is-owned': isWeaponOwned(weaponName), 'is-unowned': !isWeaponOwned(weaponName) }"
  >
    {{ isWeaponOwned(weaponName) ? t("badge.owned") : t("nav.not_owned") }}
  </span>
  <span
    class="match-status-chip"
    :class="{ 'is-essence-owned': isEssenceOwned(weaponName) }"
  >
    {{ isEssenceOwned(weaponName) ? t("nav.essence_owned") : t("badge.essence_not_owned") }}
  </span>
</div>`,
  };

  const gearRefiningList = {
    props: {
      t: { type: Function, required: true },
      mobilePanel: { type: String, required: true },
      query: { type: String, required: true },
      groupedSets: { type: Array, required: true },
      selectedGearName: { type: String, default: "" },
      isSetCollapsed: { type: Function, required: true },
      toggleSetCollapsed: { type: Function, required: true },
      selectGear: { type: Function, required: true },
      hasGearImage: { type: Function, required: true },
      gearImageSrc: { type: Function, required: true },
      onGearImageError: { type: Function, required: true },
    },
    emits: ["update:query"],
    template: gearRefiningListTemplate,
  };

  const gearRefiningRecommendation = {
    props: {
      t: { type: Function, required: true },
      recommendation: { type: Object, required: true },
      visibleCandidates: { type: Array, required: true },
      hasMoreCandidates: { type: Boolean, required: true },
      expanded: { type: Boolean, required: true },
      toggleExpanded: { type: Function, required: true },
      hasGearImage: { type: Function, required: true },
      gearImageSrc: { type: Function, required: true },
      onGearImageError: { type: Function, required: true },
    },
    template: gearRefiningRecommendationTemplate,
  };

  const gearRefiningDetail = {
    props: {
      t: { type: Function, required: true },
      mobilePanel: { type: String, required: true },
      selectedGear: { type: Object, default: null },
      recommendations: { type: Array, required: true },
      visibleRecommendationCandidates: { type: Function, required: true },
      hasMoreRecommendationCandidates: { type: Function, required: true },
      isRecommendationExpanded: { type: Function, required: true },
      toggleRecommendationExpanded: { type: Function, required: true },
      hasGearImage: { type: Function, required: true },
      gearImageSrc: { type: Function, required: true },
      onGearImageError: { type: Function, required: true },
    },
    template: gearRefiningDetailTemplate,
  };

  const app = createApp({
    template: mainAppTemplate,
    setup() {
      const ctx = { ref, computed, onMounted, onBeforeUnmount, watch, nextTick };
      const state = {};
      const fallbackInterpolate = (key, params) => {
        const text = String(key || "");
        if (!params || typeof params !== "object") return text;
        return text.replace(/\{(\w+)\}/g, (match, name) =>
          Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
        );
      };
      state.t = (key, params) => fallbackInterpolate(key, params);
      state.tTerm = (category, value) => String(value || "");
      state.loadScriptOnce = loadScriptOnce;
      state.createUiScheduler = createUiScheduler;
      const runtimeEnv = readRuntimeEnv();
      if (typeof window !== "undefined") {
        window.__APP_RUNTIME_ENV__ = runtimeEnv;
      }
      announceStrictRuntimeEnv(runtimeEnv);
      const initializedModules = new Set();
      const providedCapabilities = new Set();
      const pendingInitContractWarnings = [];
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
        "initAnalytics",
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
        "initMedia",
        "initStrategy",
        "initGearRefining",
      ];

      initExecutionOrder.forEach((name) => {
        runInitWithContract(name);
      });

      const weaponCatalog =
        typeof window !== "undefined" && Array.isArray(window.WEAPONS) ? window.WEAPONS : [];
      const weaponNameSet = new Set(weaponCatalog.map((weapon) => weapon.name));
      const parseWeaponNames = (params) => {
        if (!params) return [];
        const entries = [];
        const packed = params.get("weapons");
        if (packed) {
          entries.push(...packed.split(","));
        }
        const repeated = params.getAll("weapon");
        if (repeated.length) {
          entries.push(...repeated);
        }
        if (!entries.length) return [];
        const unique = Array.from(
          new Set(entries.map((name) => (name || "").trim()).filter(Boolean))
        );
        return unique.filter((name) => weaponNameSet.has(name));
      };

      const parseRoute = () => {
        if (typeof window === "undefined") {
          return { view: state.currentView.value };
        }
        const params = new URLSearchParams(window.location.search || "");
        const view = params.get("view") || "planner";
        const characterId = params.get("operator");
        const hasWeaponParam = params.has("weapons") || params.has("weapon");
        const weaponNames = hasWeaponParam ? parseWeaponNames(params) : [];
        if (view === "strategy") {
          return { view: "strategy", characterId, weaponNames, hasWeaponParam };
        }
        if (view === "gear-refining") {
          return { view: "gear-refining", weaponNames, hasWeaponParam };
        }
        if (view === "rerun-ranking") {
          return { view: "rerun-ranking" };
        }
        if (view === "match") {
          return { view: "match" };
        }
        return { view: "planner", weaponNames, hasWeaponParam };
      };

      let applyingRoute = false;

      const applyRoute = (route) => {
        if (!route) return;
        applyingRoute = true;
        state.currentView.value = route.view || "planner";
        if (route.view === "strategy") {
          state.selectedCharacterId.value = route.characterId || null;
        }
        if (route.view === "planner" && route.hasWeaponParam) {
          state.selectedNames.value = Array.isArray(route.weaponNames) ? route.weaponNames : [];
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
          const id = state.selectedCharacterId.value;
          if (id) params.set("operator", id);
        }
        if (view === "planner") {
          const selected = Array.isArray(state.selectedNames.value)
            ? state.selectedNames.value.filter((name) => weaponNameSet.has(name))
            : [];
          if (selected.length) {
            params.set("weapons", selected.join(","));
          }
        }
        const query = params.toString();
        return query ? `?${query}` : "";
      };

      const buildAnalyticsPath = () => {
        const view = state.currentView.value;
        if (view === "strategy") {
          const id = state.selectedCharacterId.value;
          if (id) return `/strategy/${encodeURIComponent(id)}`;
          return "/strategy";
        }
        if (view === "gear-refining") {
          return "/gear-refining";
        }
        if (view === "rerun-ranking") {
          return "/rerun-ranking";
        }
        if (view === "match") {
          return "/match";
        }
        return "/planner";
      };

      const legacyScrollbarHiddenViews = new Set([
        "planner",
        "match",
        "strategy",
        "gear-refining",
        "rerun-ranking",
      ]);
      const syncLegacyScrollbarMode = () => {
        if (typeof document === "undefined" || !document.documentElement) return;
        const root = document.documentElement;
        const currentView = String(state.currentView.value || "planner");
        root.classList.toggle("legacy-scrollbar-hidden", legacyScrollbarHiddenViews.has(currentView));
      };

      const buildAnalyticsUrl = () => {
        if (typeof window === "undefined") return "";
        const pathname = window.location.pathname || "";
        const base = pathname.endsWith("/")
          ? pathname.slice(0, -1)
          : pathname.endsWith(".html")
          ? pathname.replace(/\/[^/]*$/, "")
          : pathname;
        const path = buildAnalyticsPath();
        if (!base) return path;
        return `${base}${path}`;
      };

      const trackPageview = () => {
        if (typeof state.trackPageview !== "function") return;
        if (typeof window === "undefined") return;
        state.trackPageview({
          url: buildAnalyticsUrl(),
          path: buildAnalyticsPath(),
          view: state.currentView.value,
          title: document.title,
        });
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
        trackPageview();
      };

      onMounted(() => {
        const route = parseRoute();
        applyRoute(route);
        syncLegacyScrollbarMode();
        syncQuery(true);
        trackPageview();
        if (typeof window !== "undefined") {
          window.addEventListener("popstate", onPopState);
        }
      });

      onBeforeUnmount(() => {
        if (typeof window !== "undefined") {
          window.removeEventListener("popstate", onPopState);
        }
        if (typeof document === "undefined" || !document.documentElement) return;
        document.documentElement.classList.remove("legacy-scrollbar-hidden");
      });

      watch([state.currentView, state.selectedCharacterId], () => {
        syncLegacyScrollbarMode();
        syncQuery(false);
        trackPageview();
      });

      watch(
        state.selectedNames,
        () => {
          if (state.currentView.value !== "planner") return;
          syncQuery(true);
        },
        { deep: true }
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
          scope === "i18n.missing-key" ||
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

      return {
        currentView: state.currentView,
        setView: (view) => {
          if (
            view === "gear-refining" &&
            typeof state.markGearRefiningNavHintSeen === "function"
          ) {
            state.markGearRefiningNavHintSeen();
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
        locale: state.locale,
        languageOptions: state.languageOptions,
        langSwitchRef: state.langSwitchRef,
        showLangMenu: state.showLangMenu,
        langMenuPlacement: state.langMenuPlacement,
        toggleLangMenu: state.toggleLangMenu,
        setLocale: state.setLocale,
        t: state.t,
        tTerm: state.tTerm,
        localeRenderVersion: state.localeRenderVersion,
        tRegionPriorityModeOptions: state.tRegionPriorityModeOptions,
        tOwnershipPriorityModeOptions: state.tOwnershipPriorityModeOptions,
        tStrictPriorityOrderOptions: state.tStrictPriorityOrderOptions,
        showAiNotice: state.showAiNotice,
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
        showAttrHint: state.showAttrHint,
        dismissAttrHint: state.dismissAttrHint,
        showFilterPanel: state.showFilterPanel,
        toggleFilterPanel: state.toggleFilterPanel,
        showAllSchemes: state.showAllSchemes,
        showPlanConfig: state.showPlanConfig,
        showWeaponAttrDataModal: state.showWeaponAttrDataModal,
        showPlanConfigHintDot: state.showPlanConfigHintDot,
        showGearRefiningNavHintDot: state.showGearRefiningNavHintDot,
        showRerunRankingNavHintDot: state.showRerunRankingNavHintDot,
        togglePlanConfig: state.togglePlanConfig,
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
        setWeaponAttrOverride: state.setWeaponAttrOverride,
        clearWeaponAttrOverride: state.clearWeaponAttrOverride,
        getWeaponAttrEditorValue: state.getWeaponAttrEditorValue,
        isWeaponRawAttrMissingField: state.isWeaponRawAttrMissingField,
        recommendationConfig: state.recommendationConfig,
        regionOptions: state.regionOptions,
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
        clearAttributeFilters: state.clearAttributeFilters,
        hasAttributeFilters: state.hasAttributeFilters,
        filteredWeapons: state.filteredWeapons,
        visibleFilteredWeapons: state.visibleFilteredWeapons,
        hiddenInSelectorSummary: state.hiddenInSelectorSummary,
        getSelectorHiddenReason: state.getSelectorHiddenReason,
        weaponGridTopSpacer: state.weaponGridTopSpacer,
        weaponGridBottomSpacer: state.weaponGridBottomSpacer,
        allFilteredSelected: state.allFilteredSelected,
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
        gearRefiningMobilePanel: state.gearRefiningMobilePanel,
        isGearRefiningCompact: state.isGearRefiningCompact,
        setGearRefiningMobilePanel: state.setGearRefiningMobilePanel,
        gearRefiningQuery: state.gearRefiningQuery,
        gearRefiningGearCount: state.gearRefiningGearCount,
        isGearRefiningSetCollapsed: state.isGearRefiningSetCollapsed,
        toggleGearRefiningSetCollapsed: state.toggleGearRefiningSetCollapsed,
        isRecommendationExpanded: state.isRecommendationExpanded,
        toggleRecommendationExpanded: state.toggleRecommendationExpanded,
        hasMoreRecommendationCandidates: state.hasMoreRecommendationCandidates,
        visibleRecommendationCandidates: state.visibleRecommendationCandidates,
        gearRefiningGroupedSets: state.gearRefiningGroupedSets,
        selectedGearRefiningGearName: state.selectedGearRefiningGearName,
        selectedGearRefiningGear: state.selectedGearRefiningGear,
        selectGearRefiningGear: state.selectGearRefiningGear,
        gearRefiningRecommendations: state.gearRefiningRecommendations,
        gearRefiningGearImageSrc: state.gearRefiningGearImageSrc,
        hasGearRefiningGearImage: state.hasGearRefiningGearImage,
        handleGearRefiningGearImageError: state.handleGearRefiningGearImageError,
        hasImage: state.hasImage,
        weaponImageSrc: state.weaponImageSrc,
        weaponCharacters: state.weaponCharacters,
        characterImageSrc: state.characterImageSrc,
        characterCardSrc: state.characterCardSrc,
        handleCharacterImageError: state.handleCharacterImageError,
        handleCharacterCardError: state.handleCharacterCardError,
        announcement: state.announcement,
        formatNoticeItem: state.formatNoticeItem,
        changelog: state.changelog,
        aboutContent: state.aboutContent,
        contentLoading: state.contentLoading,
        showAbout: state.showAbout,
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
        optionalFailureNotices: state.optionalFailureNotices,
        optionalFailureNotice: state.optionalFailureNotice,
        hasOptionalFailureHistory: state.hasOptionalFailureHistory,
        dismissOptionalFailureNotice: state.dismissOptionalFailureNotice,
        openOptionalFailureDetailByLogId: state.openOptionalFailureDetailByLogId,
        openLatestOptionalFailureDetail: state.openLatestOptionalFailureDetail,
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
        closeNotice: state.closeNotice,
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
        showPerfNotice: state.showPerfNotice,
        setPerfMode: state.setPerfMode,
        setThemeMode: state.setThemeMode,
        customBackground: state.customBackground,
        customBackgroundName: state.customBackgroundName,
        customBackgroundError: state.customBackgroundError,
        customBackgroundApi: state.customBackgroundApi,
        backgroundDisplayEnabled: state.backgroundDisplayEnabled,
        toggleBackgroundDisplayEnabled: state.toggleBackgroundDisplayEnabled,
        handleBackgroundFile: state.handleBackgroundFile,
        clearCustomBackground: state.clearCustomBackground,
        // Strategy Module
        characters: state.characters,
        visibleCharacters: state.visibleCharacters,
        characterGridTopSpacer: state.characterGridTopSpacer,
        characterGridBottomSpacer: state.characterGridBottomSpacer,
        charactersLoading: state.charactersLoading,
        charactersLoaded: state.charactersLoaded,
        selectedCharacterId: state.selectedCharacterId,
        currentCharacter: state.currentCharacter,
        currentGuide: state.currentGuide,
        skillLevelLabels: state.skillLevelLabels,
        getSkillTables: state.getSkillTables,
        guideRows: state.guideRows,
        teamSlots: state.teamSlots,
        strategyCategory: state.strategyCategory,
        strategyTab: state.strategyTab,
        selectCharacter: state.selectCharacter,
        setStrategyCategory: state.setStrategyCategory,
        setStrategyTab: state.setStrategyTab,
        backToCharacterList: state.backToCharacterList,
        guideBeforeLeave: state.guideBeforeLeave,
        guideEnter: state.guideEnter,
      };
    },
  });

  app.component("PlanConfigControl", planConfigControl);
  app.component("MatchStatusLine", matchStatusLine);
  app.component("GearRefiningList", gearRefiningList);
  app.component("GearRefiningDetail", gearRefiningDetail);
  app.component("GearRefiningRecommendation", gearRefiningRecommendation);
  app.directive("lazy-src", lazyImageDirective);
  app.mount("#app");
})();
