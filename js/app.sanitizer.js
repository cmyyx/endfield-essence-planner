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

  var tokenizeInlineMarkdown = function (value) {
    var source = String(value || "");
    if (!source) return [];
    var tokens = [];
    var pattern = /(\*\*[^*\n]+?\*\*|`[^`\n]+`|\*[^*\n]+?\*|\[[^\]\n]+]\([^) \n]+?\))/g;
    var lastIndex = 0;
    var match = null;
    while ((match = pattern.exec(source))) {
      if (match.index > lastIndex) {
        tokens.push({ type: "text", text: source.slice(lastIndex, match.index) });
      }
      var chunk = match[0];
      if (chunk.slice(0, 2) === "**" && chunk.slice(-2) === "**") {
        tokens.push({ type: "strong", text: chunk.slice(2, -2) });
      } else if (chunk.slice(0, 1) === "*" && chunk.slice(-1) === "*") {
        tokens.push({ type: "em", text: chunk.slice(1, -1) });
      } else if (chunk.slice(0, 1) === "`" && chunk.slice(-1) === "`") {
        tokens.push({ type: "code", text: chunk.slice(1, -1) });
      } else if (chunk.slice(0, 1) === "[") {
        var parts = chunk.match(/^\[([^\]\n]+)\]\(([^)\s\n]+)\)$/);
        if (parts) {
          var safeHref = toSafeHttpUrl(parts[2]);
          if (safeHref) {
            tokens.push({ type: "link", href: safeHref, text: String(parts[1] || "") });
          } else {
            tokens.push({ type: "text", text: String(parts[1] || "") });
          }
        } else {
          tokens.push({ type: "text", text: chunk });
        }
      } else {
        tokens.push({ type: "text", text: chunk });
      }
      lastIndex = match.index + chunk.length;
    }
    if (lastIndex < source.length) {
      tokens.push({ type: "text", text: source.slice(lastIndex) });
    }
    return tokens;
  };

  var tokenizeParagraphLines = function (lines) {
    var tokens = [];
    lines.forEach(function (line, index) {
      if (index > 0) {
        tokens.push({ type: "break" });
      }
      tokenizeInlineMarkdown(line).forEach(function (token) {
        tokens.push(token);
      });
    });
    return tokens;
  };

  var tokenizeMarkdownBlocks = function (value) {
    var source = String(value || "");
    if (!source.trim()) return [];
    var lines = source.split(/\r?\n/);
    var blocks = [];
    var paragraphLines = [];
    var flushParagraph = function () {
      if (!paragraphLines.length) return;
      blocks.push({ type: "paragraph", tokens: tokenizeParagraphLines(paragraphLines) });
      paragraphLines = [];
    };
    var index = 0;
    while (index < lines.length) {
      var line = lines[index];
      if (!line.trim()) {
        flushParagraph();
        index += 1;
        continue;
      }
      var unorderedMatch = line.match(/^\s*[-*+]\s+(.+)$/);
      var orderedMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);
      if (unorderedMatch || orderedMatch) {
        flushParagraph();
        var ordered = Boolean(orderedMatch);
        var start = ordered ? parseInt(orderedMatch[1], 10) : undefined;
        var items = [];
        while (index < lines.length) {
          var current = lines[index];
          var nextUnordered = current.match(/^\s*[-*+]\s+(.+)$/);
          var nextOrdered = current.match(/^\s*(\d+)\.\s+(.+)$/);
          if (ordered && nextOrdered) {
            items.push({ tokens: tokenizeInlineMarkdown(nextOrdered[2]) });
            index += 1;
            continue;
          }
          if (!ordered && nextUnordered) {
            items.push({ tokens: tokenizeInlineMarkdown(nextUnordered[1]) });
            index += 1;
            continue;
          }
          break;
        }
        blocks.push({ type: "list", ordered: ordered, start: start, items: items });
        continue;
      }
      paragraphLines.push(line);
      index += 1;
    }
    flushParagraph();
    return blocks;
  };

  var api = {
    toSafeHttpUrl: toSafeHttpUrl,
    tokenizeNoticeItem: tokenizeNoticeItem,
    tokenizeMarkdownBlocks: tokenizeMarkdownBlocks,
  };

  if (typeof window !== "undefined") {
    window.__APP_SANITIZER__ = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
