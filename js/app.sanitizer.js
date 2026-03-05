(function () {
  var appendTextToken = function (tokens, text) {
    if (!text) return;
    var last = tokens[tokens.length - 1];
    if (last && last.type === "text") {
      last.text += text;
      return;
    }
    tokens.push({ type: "text", text: text });
  };

  var toSafeHttpUrl = function (value) {
    var raw = String(value || "").trim();
    if (!raw) return "";
    if (!/^https?:\/\//i.test(raw)) return "";
    try {
      var parsed = new URL(raw);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
      return parsed.href;
    } catch (error) {
      return "";
    }
  };

  var parseInlineTokens = function (text) {
    var source = String(text || "");
    if (!source) return [];
    var tokens = [];
    var pattern = /(==[^=\n]+==|https?:\/\/[^\s<]+)/g;
    var lastIndex = 0;
    var match = null;
    while ((match = pattern.exec(source))) {
      if (match.index > lastIndex) {
        appendTextToken(tokens, source.slice(lastIndex, match.index));
      }
      var chunk = match[0];
      if (chunk.slice(0, 2) === "==" && chunk.slice(-2) === "==") {
        var markText = chunk.slice(2, -2);
        if (markText) {
          tokens.push({ type: "mark", text: markText });
        } else {
          appendTextToken(tokens, chunk);
        }
      } else {
        var trimmed = chunk.replace(/[),.;!?，。！？、]+$/g, "");
        var tail = chunk.slice(trimmed.length);
        var safeHref = toSafeHttpUrl(trimmed);
        if (safeHref) {
          tokens.push({ type: "link", href: safeHref, text: trimmed });
        } else {
          appendTextToken(tokens, chunk);
        }
        if (tail) appendTextToken(tokens, tail);
      }
      lastIndex = match.index + chunk.length;
    }
    if (lastIndex < source.length) {
      appendTextToken(tokens, source.slice(lastIndex));
    }
    return tokens;
  };

  var tokenizeNoticeItem = function (value) {
    var source = String(value || "");
    if (!source) return [{ type: "text", text: "" }];
    var tokens = [];
    var markdownLinkPattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
    var lastIndex = 0;
    var match = null;
    while ((match = markdownLinkPattern.exec(source))) {
      if (match.index > lastIndex) {
        parseInlineTokens(source.slice(lastIndex, match.index)).forEach(function (token) {
          tokens.push(token);
        });
      }
      var safeHref = toSafeHttpUrl(match[2]);
      if (safeHref) {
        tokens.push({
          type: "link",
          href: safeHref,
          text: String(match[1] || ""),
        });
      } else {
        appendTextToken(tokens, String(match[1] || ""));
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < source.length) {
      parseInlineTokens(source.slice(lastIndex)).forEach(function (token) {
        tokens.push(token);
      });
    }
    return tokens.length ? tokens : [{ type: "text", text: source }];
  };

  var api = {
    toSafeHttpUrl: toSafeHttpUrl,
    tokenizeNoticeItem: tokenizeNoticeItem,
  };

  if (typeof window !== "undefined") {
    window.__APP_SANITIZER__ = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
