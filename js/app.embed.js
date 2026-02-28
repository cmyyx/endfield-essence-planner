(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initEmbed = function initEmbed(ctx, state) {
    const { ref, onMounted, onBeforeUnmount } = ctx;

    const normalizeHost = (value) => String(value || "").trim().toLowerCase();
    const readContent = () => {
      if (state.content && typeof state.content === "object" && "value" in state.content) {
        return state.content.value || window.CONTENT || {};
      }
      return state.content || window.CONTENT || {};
    };
    const readEmbedAllowedHosts = () => {
      const content = readContent();
      const hosts = Array.isArray(content.embed?.allowedHosts) ? content.embed.allowedHosts : [];
      return new Set(hosts.map(normalizeHost).filter(Boolean));
    };

    const currentHost = ref(normalizeHost(window.location.hostname));
    const isFileProtocol = window.location.protocol === "file:";
    const allowedHosts = new Set(["end.canmoe.com", "127.0.0.1", "localhost"]);
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
    const isCurrentHostTrusted = allowedHosts.has(currentHost.value);
    const recomputeEmbedTrust = () => {
      if (!isEmbedded.value) {
        isEmbedTrusted.value = false;
        return;
      }
      const embedAllowedHosts = readEmbedAllowedHosts();
      const host = normalizeHost(embedHost.value);
      isEmbedTrusted.value = host && embedAllowedHosts.size ? embedAllowedHosts.has(host) : false;
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
          embedHost.value = "";
        }
      }
      embedHostLabel.value = embedHost.value || state.t("未知来源");
      recomputeEmbedTrust();
    }

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
        ? !(isCurrentHostTrusted && isEmbedTrusted.value)
        : !isCurrentHostTrusted;
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
        });
        if (!response || !response.headers || response.status === 405) {
          response = await fetch(window.location.href, {
            method: "GET",
            cache: "no-store",
          });
        }
        const marker = (response.headers.get(officialSignalHeader) || "").trim();
        return marker === "1";
      } catch (error) {
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

    const showIcpFooter = ref(
      false
    );
    const icpNumber = ref("苏ICP备2026000659号");

    onMounted(async () => {
      if (typeof state.ensureContentLoaded === "function") {
        try {
          await state.ensureContentLoaded({ withSponsors: false });
        } catch (error) {
          // ignore content prefetch errors and keep fallback behavior
        }
      }
      recomputeEmbedTrust();
      isOfficialDeployment.value = await detectOfficialDeployment();
      recomputeDomainWarning();
      if (!isEmbedded.value && showDomainWarning.value) {
        warningCountdown.value = 10;
        startWarningCountdown();
      }
      showIcpFooter.value =
        isOfficialDeployment.value && currentHost.value === "end.canmoe.com" && !isEmbedded.value;
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
