(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initEmbed = function initEmbed(ctx, state) {
    const { ref } = ctx;

    const content =
      state.content && typeof state.content === "object" && "value" in state.content
        ? state.content.value || {}
        : state.content || window.CONTENT || {};
    const currentHost = ref(window.location.hostname);
    const isFileProtocol = window.location.protocol === "file:";
    const allowedHosts = new Set(["end.canmoe.com", "127.0.0.1", "localhost"]);
    const embedAllowedHosts = new Set(
      Array.isArray(content.embed?.allowedHosts) ? content.embed.allowedHosts : []
    );
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
          embedHost.value = new URL(embedOrigin).hostname;
        } catch (error) {
          embedHost.value = "";
        }
      }
      embedHostLabel.value = embedHost.value || state.t("未知来源");
      isEmbedTrusted.value =
        embedHost.value && embedAllowedHosts.size
          ? embedAllowedHosts.has(embedHost.value)
          : false;
    }

    const showDomainWarning = ref(
      isFileProtocol
        ? false
        : isEmbedded.value
          ? !(isCurrentHostTrusted && isEmbedTrusted.value)
          : !isCurrentHostTrusted
    );
    const warningCountdown = ref(10);
    let warningTimer = null;

    const startWarningCountdown = () => {
      if (warningTimer || isEmbedded.value || !showDomainWarning.value) return;
      warningTimer = setInterval(() => {
        if (warningCountdown.value > 0) {
          warningCountdown.value -= 1;
        }
        if (warningCountdown.value <= 0) {
          warningCountdown.value = 0;
          clearInterval(warningTimer);
          warningTimer = null;
        }
      }, 1000);
    };

    const dismissDomainWarning = () => {
      if (isEmbedded.value || warningCountdown.value > 0) return;
      showDomainWarning.value = false;
    };

    if (!isEmbedded.value && showDomainWarning.value) {
      startWarningCountdown();
    }

    const showIcpFooter = ref(
      currentHost.value === "end.canmoe.com" && !isEmbedded.value
    );
    const icpNumber = ref("苏ICP备2026000659号");

    state.currentHost = currentHost;
    state.embedHostLabel = embedHostLabel;
    state.isEmbedTrusted = isEmbedTrusted;
    state.isEmbedded = isEmbedded;
    state.showDomainWarning = showDomainWarning;
    state.warningCountdown = warningCountdown;
    state.dismissDomainWarning = dismissDomainWarning;
    state.showIcpFooter = showIcpFooter;
    state.icpNumber = icpNumber;
  };
})();
