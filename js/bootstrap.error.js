(function (globalObject) {
  var ensureErrorRenderer = function (options) {
    if (typeof window.__renderBootError === "function") return;
    var root = options && options.root ? options.root : document.documentElement;
    var bt = options && typeof options.bt === "function" ? options.bt : function (key) { return key; };

    var teardownPreloadOverlay = function () {
      if (root && root.classList) {
        root.classList.remove("preload");
      }
      var overlay = document.getElementById("app-preload");
      if (!overlay) return;
      overlay.classList.add("preload-hide");
      overlay.style.pointerEvents = "none";
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    };

    window.__renderBootError = function renderBootError(payload) {
      if (!document.body) {
        document.addEventListener(
          "DOMContentLoaded",
          function () {
            window.__renderBootError(payload);
          },
          { once: true }
        );
        return;
      }
      var title = String((payload && payload.title) || bt("error_title_page_load"));
      var summary = String((payload && payload.summary) || bt("error_summary_unknown"));
      var details = Array.isArray(payload && payload.details)
        ? payload.details.filter(Boolean).map(String)
        : [];
      var suggestions = Array.isArray(payload && payload.suggestions)
        ? payload.suggestions.filter(Boolean).map(String)
        : [];

      teardownPreloadOverlay();
      var existing = document.getElementById("boot-error-overlay");
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }
      var page = document.createElement("div");
      page.id = "boot-error-overlay";
      page.style.cssText =
        "position:fixed;inset:0;z-index:2147483647;overflow:auto;display:flex;align-items:center;justify-content:center;padding:24px;background:#0b0f14;color:#e6e9ef;font-family:'Microsoft YaHei UI','PingFang SC',sans-serif;";
      var card = document.createElement("div");
      card.style.cssText =
        "width:min(680px,92vw);border:1px solid rgba(243,108,108,0.42);border-radius:14px;padding:18px 18px 16px;background:rgba(26,14,18,0.84);box-shadow:0 14px 34px rgba(0,0,0,0.38);";

      var titleEl = document.createElement("div");
      titleEl.style.cssText = "font-size:16px;font-weight:700;letter-spacing:0.03em;color:#ff9e9e;";
      titleEl.textContent = title;
      card.appendChild(titleEl);

      var summaryEl = document.createElement("div");
      summaryEl.style.cssText = "margin-top:8px;line-height:1.7;color:#ffd7d7;";
      summaryEl.textContent = summary;
      card.appendChild(summaryEl);

      if (details.length) {
        var detailWrap = document.createElement("div");
        detailWrap.style.cssText =
          "margin-top:12px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);";
        var detailTitle = document.createElement("div");
        detailTitle.style.cssText = "font-weight:600;color:#ffd1d1;";
        detailTitle.textContent = bt("error_details_title");
        detailWrap.appendChild(detailTitle);
        var detailUl = document.createElement("ul");
        detailUl.style.cssText = "margin:8px 0 0 18px;padding:0;line-height:1.65;";
        details.forEach(function (item) {
          var li = document.createElement("li");
          li.textContent = item;
          detailUl.appendChild(li);
        });
        detailWrap.appendChild(detailUl);
        card.appendChild(detailWrap);
      }

      if (suggestions.length) {
        var suggestWrap = document.createElement("div");
        suggestWrap.style.cssText =
          "margin-top:12px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);";
        var suggestTitle = document.createElement("div");
        suggestTitle.style.cssText = "font-weight:600;color:#f2e5c9;";
        suggestTitle.textContent = bt("error_suggestions_title");
        suggestWrap.appendChild(suggestTitle);
        var suggestOl = document.createElement("ol");
        suggestOl.style.cssText = "margin:8px 0 0 18px;padding:0;line-height:1.65;";
        suggestions.forEach(function (item) {
          var li = document.createElement("li");
          li.textContent = item;
          suggestOl.appendChild(li);
        });
        suggestWrap.appendChild(suggestOl);
        card.appendChild(suggestWrap);
      }

      var actionRow = document.createElement("div");
      actionRow.style.cssText = "margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;";

      var retryButton = document.createElement("button");
      retryButton.type = "button";
      retryButton.style.cssText =
        "cursor:pointer;border:1px solid rgba(77,214,201,0.45);border-radius:999px;padding:6px 14px;background:rgba(12,18,28,0.9);color:#c9fff7;";
      retryButton.textContent = bt("action_retry");
      retryButton.addEventListener("click", function () {
        var current = document.getElementById("boot-error-overlay");
        if (current && current.parentNode) {
          current.parentNode.removeChild(current);
        }
        if (typeof window.__startBootstrapEntry === "function") {
          window.__startBootstrapEntry({ fromRetry: true });
          return;
        }
        window.location.reload();
      });
      actionRow.appendChild(retryButton);

      var refreshButton = document.createElement("button");
      refreshButton.type = "button";
      refreshButton.style.cssText =
        "cursor:pointer;border:1px solid rgba(255,255,255,0.45);border-radius:999px;padding:6px 14px;background:rgba(12,18,28,0.9);color:#fff;";
      refreshButton.textContent = bt("action_refresh");
      refreshButton.addEventListener("click", function () {
        window.location.reload();
      });
      actionRow.appendChild(refreshButton);

      var feedbackLink = document.createElement("a");
      feedbackLink.href = "https://github.com/cmyyx/endfield-essence-planner/issues";
      feedbackLink.target = "_blank";
      feedbackLink.rel = "noreferrer";
      feedbackLink.style.cssText =
        "display:inline-flex;align-items:center;text-decoration:none;border:1px solid rgba(77,214,201,0.45);border-radius:999px;padding:6px 14px;background:rgba(12,18,28,0.85);color:#c9fff7;";
      feedbackLink.textContent = bt("action_feedback");
      actionRow.appendChild(feedbackLink);

      card.appendChild(actionRow);
      page.appendChild(card);
      document.body.appendChild(page);
    };
  };

  var ensureLoadErrorReporter = function (options) {
    var bt = options && typeof options.bt === "function" ? options.bt : function (key) { return key; };
    var resolveResourceSummary =
      options && typeof options.resolveResourceSummary === "function"
        ? options.resolveResourceSummary
        : function (status, fallbackKey) { return fallbackKey || String(status || ""); };
    var explainHttpStatus =
      options && typeof options.explainHttpStatus === "function"
        ? options.explainHttpStatus
        : function () { return ""; };

    if (typeof window.__reportScriptChainMissing !== "function") {
      window.__reportScriptChainMissing = function reportScriptChainMissing() {
        window.__renderBootError({
          title: bt("error_title_resource"),
          summary: bt("error_summary_script_chain_missing"),
          details: [bt("error_detail_missing_chain"), bt("error_detail_confirm_chain")],
          suggestions: [bt("suggestion_retry"), bt("suggestion_hard_refresh")],
        });
      };
    }
    if (typeof window.__reportScriptLoadFailure !== "function") {
      window.__reportScriptLoadFailure = function reportScriptLoadFailure(failedScript, diagnostics) {
        var failed = String(failedScript || "").trim();
        var status = diagnostics && diagnostics.status ? Number(diagnostics.status) : 0;
        var onlineState = navigator.onLine ? bt("error_network_online") : bt("error_network_offline");
        var details = [
          bt("error_detail_failed_resource", { name: failed || bt("unknown_item") }),
          bt("error_detail_network_state", { state: onlineState }),
        ];
        if (status) {
          var hint = explainHttpStatus(status);
          details.push(
            bt("error_detail_http_status", {
              status: status,
              hint: hint ? " (" + hint + ")" : "",
            })
          );
        }
        details.push(bt("error_hint_flaky"));
        window.__renderBootError({
          title: bt("error_title_resource"),
          summary: resolveResourceSummary(status, "error_summary_core_script"),
          details: details,
          suggestions: [bt("suggestion_retry"), bt("suggestion_hard_refresh"), bt("suggestion_issue_screenshot")],
        });
      };
    }
  };

  var handleBootFailure = function (options) {
    var bt = options && typeof options.bt === "function" ? options.bt : function (key) { return key; };
    var resolveResourceSummary =
      options && typeof options.resolveResourceSummary === "function"
        ? options.resolveResourceSummary
        : function (status, fallbackKey) { return fallbackKey || String(status || ""); };
    var explainHttpStatus =
      options && typeof options.explainHttpStatus === "function"
        ? options.explainHttpStatus
        : function () { return ""; };
    var describeStyleFailureReason =
      options && typeof options.describeStyleFailureReason === "function"
        ? options.describeStyleFailureReason
        : function () { return ""; };

    var error = options && options.error;
    var failedMessage = String((error && error.message) || "");
    var resourceMeta = error && error.resource ? error.resource : null;
    var probe = resourceMeta && resourceMeta.probe ? resourceMeta.probe : null;
    var status = probe && probe.status ? Number(probe.status) : 0;
    var statusHint = explainHttpStatus(status);
    var failedScript = failedMessage.replace(/^Failed to load:\s*/i, "");
    if (resourceMeta && resourceMeta.kind === "script" && resourceMeta.src) {
      failedScript = resourceMeta.src;
    }

    if (resourceMeta && resourceMeta.kind === "startup-stall") {
      window.__renderBootError({
        title: bt("error_title_resource"),
        summary: bt("error_summary_core_resource"),
        details: [
          bt("error_detail_failed_reason", { reason: bt("error_reason_stalled") }),
          bt("error_hint_flaky"),
        ],
        suggestions: [bt("suggestion_retry"), bt("suggestion_hard_refresh"), bt("suggestion_issue_screenshot")],
      });
      return;
    }

    var failedStyle = failedMessage.replace(/^Failed to load stylesheet(?: \([^)]+\))?:\s*/i, "").trim();
    if (resourceMeta && resourceMeta.kind === "style" && resourceMeta.src) {
      failedStyle = resourceMeta.src;
    }
    var failureReason = resourceMeta && resourceMeta.reason ? String(resourceMeta.reason) : "";
    var isCssFailure =
      (resourceMeta && resourceMeta.kind === "style") || failedMessage.indexOf("stylesheet") !== -1;

    if (isCssFailure) {
      var cssDetails = [bt("error_detail_failed_style", { name: failedStyle || bt("unknown_item") })];
      if (status) {
        cssDetails.push(
          bt("error_detail_http_status", {
            status: status,
            hint: statusHint ? " (" + statusHint + ")" : "",
          })
        );
      }
      if (failureReason) {
        cssDetails.push(
          bt("error_detail_failed_reason", {
            reason: describeStyleFailureReason(failureReason, status),
          })
        );
      }
      window.__renderBootError({
        title: bt("error_title_style"),
        summary: resolveResourceSummary(status, "error_summary_style"),
        details: cssDetails,
        suggestions: [bt("suggestion_retry"), bt("suggestion_hard_refresh")],
      });
      return;
    }

    if (typeof window.__reportScriptLoadFailure === "function") {
      window.__reportScriptLoadFailure(failedScript, { status: status });
      return;
    }

    var scriptDetails = [
      bt("error_detail_failed_resource", { name: failedScript || bt("unknown_item") }),
    ];
    if (status) {
      scriptDetails.push(
        bt("error_detail_http_status", {
          status: status,
          hint: statusHint ? " (" + statusHint + ")" : "",
        })
      );
    }
    window.__renderBootError({
      title: bt("error_title_resource"),
      summary: resolveResourceSummary(status, "error_summary_core_resource"),
      details: scriptDetails,
      suggestions: [bt("suggestion_retry"), bt("suggestion_hard_refresh")],
    });
  };

  var api = {
    ensureErrorRenderer: ensureErrorRenderer,
    ensureLoadErrorReporter: ensureLoadErrorReporter,
    handleBootFailure: handleBootFailure,
  };

  globalObject.__BOOTSTRAP_ERROR__ = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
      ? window
      : this
);
