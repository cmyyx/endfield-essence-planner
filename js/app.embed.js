(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initEmbed = function initEmbed(ctx, state) {
    const { ref, onMounted, onBeforeUnmount } = ctx;

    const normalizeHost = (value) => String(value || "").trim().toLowerCase().replace(/\.+$/, "");
    const toHostPattern = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      const wildcard = raw.startsWith("*.");
      const base = wildcard ? raw.slice(2) : raw;
      if (!base) return "";
      try {
        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(base)) {
          const hostname = normalizeHost(new URL(base).hostname);
          return hostname ? (wildcard ? `*.${hostname}` : hostname) : "";
        }
      } catch (error) {
        reportNonFatalDiagnostic({
          operation: "embed.host-pattern-parse",
          kind: "invalid-host-pattern",
          resource: base,
          errorName: String(error && error.name ? error.name : "Error"),
          errorMessage: String(error && error.message ? error.message : "invalid host pattern"),
          optionalSignature: "embed.host-pattern-parse",
        });
      }
      const hostToken = normalizeHost(base);
      return hostToken ? (wildcard ? `*.${hostToken}` : hostToken) : "";
    };
    const hostMatchesPattern = (host, pattern) => {
      if (!host || !pattern) return false;
      if (pattern.startsWith("*.")) {
        const base = pattern.slice(2);
        return host === base || host.endsWith(`.${base}`);
      }
      return host === pattern;
    };
    const readContent = () => {
      if (typeof window !== "undefined" && window.CONTENT && typeof window.CONTENT === "object") {
        return window.CONTENT;
      }
      if (state.content && typeof state.content === "object" && "value" in state.content) {
        return state.content.value || window.CONTENT || {};
      }
      return state.content || window.CONTENT || {};
    };
    const readHostPatterns = (key) => {
      const content = readContent();
      const hosts = Array.isArray(content.embed?.[key]) ? content.embed[key] : [];
      return new Set(hosts.map(toHostPattern).filter(Boolean));
    };
    const readEmbedAllowedHostPatterns = () => readHostPatterns("allowedHosts");
    const readOfficialHostPatterns = () => readHostPatterns("officialHosts");
    const readIcpHostPatterns = () => readHostPatterns("icpHosts");
    const isHostMatchedByPatterns = (host, patterns) =>
      host && patterns.size ? Array.from(patterns).some((pattern) => hostMatchesPattern(host, pattern)) : false;

    const currentHost = ref(normalizeHost(window.location.hostname));
    const isFileProtocol = window.location.protocol === "file:";
    const officialSignalHeader = "x-endfield-essence-planner-official";
    let embedded = false;
    try {
      embedded = window.self !== window.top;
    } catch (error) {
      embedded = true;
    }
    const isEmbedded = ref(embedded);
    const embedHost = ref("");
    const embedHostLabel = ref("");
    const isEmbedTrusted = ref(false);
    const isCurrentHostTrusted = ref(false);
    const reportNonFatalDiagnostic = (payload) => {
      const source = payload && typeof payload === "object" ? payload : {};
      const reporter =
        (typeof state.reportNonFatalDiagnostic === "function" && state.reportNonFatalDiagnostic) ||
        (typeof window !== "undefined" && typeof window.__reportNonFatalDiagnostic === "function"
          ? window.__reportNonFatalDiagnostic
          : null) ||
        (typeof window !== "undefined" &&
        window.__APP_DIAGNOSTICS__ &&
        typeof window.__APP_DIAGNOSTICS__.reportNonFatalDiagnostic === "function"
          ? window.__APP_DIAGNOSTICS__.reportNonFatalDiagnostic
          : null);
      if (typeof reporter !== "function") return;
      try {
        reporter({
          module: "app.embed",
          operation: String(source.operation || "embed.unknown"),
          kind: String(source.kind || "non-fatal"),
          resource: String(source.resource || window.location.href),
          timestamp: source.timestamp,
          errorName: String(source.errorName || ""),
          errorMessage: String(source.errorMessage || ""),
          note: String(source.note || ""),
          optionalSignature: String(source.optionalSignature || ""),
        });
      } catch (error) {
        // diagnostic reporter must stay non-blocking
      }
    };

    const recomputeCurrentHostTrust = () => {
      const patterns = readOfficialHostPatterns();
      const host = normalizeHost(currentHost.value);
      isCurrentHostTrusted.value = isHostMatchedByPatterns(host, patterns);
    };

    const recomputeEmbedTrust = () => {
      if (!isEmbedded.value) {
        isEmbedTrusted.value = false;
        return;
      }
      const embedAllowedHostPatterns = readEmbedAllowedHostPatterns();
      const host = normalizeHost(embedHost.value);
      isEmbedTrusted.value = isHostMatchedByPatterns(host, embedAllowedHostPatterns);
    };

    if (isEmbedded.value) {
      let embedOrigin = "";
      if (window.location.ancestorOrigins && window.location.ancestorOrigins.length) {
        embedOrigin = window.location.ancestorOrigins[0];
      } else if (document.referrer) {
        embedOrigin = document.referrer;
      } else {
        try {
          embedOrigin = window.top.location.href;
        } catch (error) {
          embedOrigin = "";
        }
      }
      if (embedOrigin) {
        try {
          embedHost.value = normalizeHost(new URL(embedOrigin).hostname);
        } catch (error) {
          reportNonFatalDiagnostic({
            operation: "embed.origin-parse",
            kind: "invalid-embed-origin",
            resource: String(embedOrigin),
            errorName: String(error && error.name ? error.name : "Error"),
            errorMessage: String(error && error.message ? error.message : "invalid embed origin"),
            optionalSignature: "embed.origin-parse",
          });
          embedHost.value = "";
        }
      }
      embedHostLabel.value = embedHost.value || state.t("embed.unknown_source");
    }

    recomputeCurrentHostTrust();
    recomputeEmbedTrust();

    const isOfficialDeployment = ref(false);
    const showDomainWarning = ref(false);
    const warningCountdown = ref(10);
    let warningTimer = null;

    const stopWarningCountdown = () => {
      if (!warningTimer) return;
      clearInterval(warningTimer);
      warningTimer = null;
    };

    const recomputeDomainWarning = () => {
      if (isFileProtocol || !isOfficialDeployment.value) {
        showDomainWarning.value = false;
        stopWarningCountdown();
        return;
      }
      const nextVisible = isEmbedded.value
        ? !(isCurrentHostTrusted.value && isEmbedTrusted.value)
        : !isCurrentHostTrusted.value;
      showDomainWarning.value = nextVisible;
      if (!nextVisible) {
        stopWarningCountdown();
        warningCountdown.value = 0;
      }
    };

    const detectOfficialDeployment = async () => {
      if (typeof window === "undefined" || typeof fetch !== "function") return false;
      try {
        let response = await fetch(window.location.href, {
          method: "HEAD",
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response || !response.headers || response.status === 405) {
          response = await fetch(window.location.href, {
            method: "GET",
            cache: "no-store",
            credentials: "same-origin",
          });
        }
        const marker = (response.headers.get(officialSignalHeader) || "").trim();
        return marker === "1";
      } catch (error) {
        reportNonFatalDiagnostic({
          operation: "embed.detect-official-deployment",
          kind: "detect-official-failed",
          resource: window.location.href,
          errorName: String(error && error.name ? error.name : "Error"),
          errorMessage: String(error && error.message ? error.message : "detect official failed"),
          optionalSignature: "embed.detect-official-deployment",
        });
        return false;
      }
    };

    const startWarningCountdown = () => {
      if (warningTimer || isEmbedded.value || !showDomainWarning.value) return;
      warningTimer = setInterval(() => {
        if (warningCountdown.value > 0) {
          warningCountdown.value -= 1;
        }
        if (warningCountdown.value <= 0) {
          warningCountdown.value = 0;
          stopWarningCountdown();
        }
      }, 1000);
    };

    const dismissDomainWarning = () => {
      if (isEmbedded.value || warningCountdown.value > 0) return;
      showDomainWarning.value = false;
      stopWarningCountdown();
    };

    const showIcpFooter = ref(false);
    const icpNumber = ref("苏ICP备2026000659号");

    onMounted(async () => {
      if (typeof state.ensureContentLoaded === "function") {
        try {
          await state.ensureContentLoaded({ withSponsors: false });
        } catch (error) {
          reportNonFatalDiagnostic({
            operation: "embed.ensure-content-loaded",
            kind: "content-prefetch-failed",
            resource: "content",
            errorName: String(error && error.name ? error.name : "Error"),
            errorMessage: String(error && error.message ? error.message : "content prefetch failed"),
            optionalSignature: "embed.ensure-content-loaded",
          });
        }
      }
      recomputeCurrentHostTrust();
      recomputeEmbedTrust();
      isOfficialDeployment.value = await detectOfficialDeployment();
      recomputeDomainWarning();
      if (!isEmbedded.value && showDomainWarning.value) {
        warningCountdown.value = 10;
        startWarningCountdown();
      }
      const icpPatterns = readIcpHostPatterns();
      showIcpFooter.value =
        isOfficialDeployment.value && !isEmbedded.value && isHostMatchedByPatterns(currentHost.value, icpPatterns);
    });

    onBeforeUnmount(() => {
      stopWarningCountdown();
    });

    state.currentHost = currentHost;
    state.embedHostLabel = embedHostLabel;
    state.isEmbedTrusted = isEmbedTrusted;
    state.isEmbedded = isEmbedded;
    state.isOfficialDeployment = isOfficialDeployment;
    state.showDomainWarning = showDomainWarning;
    state.warningCountdown = warningCountdown;
    state.dismissDomainWarning = dismissDomainWarning;
    state.showIcpFooter = showIcpFooter;
    state.icpNumber = icpNumber;
  };
})();
