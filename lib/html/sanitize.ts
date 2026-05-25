const blockedContentElementNames = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
].join("|");

const allowedElementNames = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "dd",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "section",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

const dangerousElementPattern = new RegExp(
  `<\\s*(${blockedContentElementNames})\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>`,
  "gi",
);
const commentPattern = /<!--[\s\S]*?-->/g;
const documentBodyPattern = /<body\b[^>]*>([\s\S]*?)<\/body\s*>/i;
const documentBodyOpenPattern = /<body\b[^>]*>([\s\S]*)/i;
const documentHeadPattern = /<head\b[^>]*>[\s\S]*?<\/head\s*>/i;
const documentShellPattern =
  /<!doctype\b|<\/?(?:html|head|body|meta|title|style)\b/i;
const doctypePattern = /<!doctype[^>]*>/i;
const eventHandlerAttributePattern =
  /\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const forbiddenAttributePattern =
  /\s+(?:formaction|srcdoc|srcset|style|xmlns(?::[a-zA-Z0-9_-]+)?)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;
const urlAttributePattern =
  /\s+(href|src|xlink:href)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;

export const defaultEmptyDocumentHtml =
  "<p class='muted'>Nessun contenuto disponibile.</p>";

export function sanitizeDocumentHtml(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const renderableValue = getRenderableDocumentSource(value);

  if (!renderableValue.trim()) {
    return null;
  }

  const sanitized = renderableValue
    .replace(commentPattern, "")
    .replace(dangerousElementPattern, "")
    .replace(tagPattern, (tag, elementName: string) => {
      return allowedElementNames.has(elementName.toLowerCase()) ? tag : "";
    })
    .replace(eventHandlerAttributePattern, "")
    .replace(forbiddenAttributePattern, "")
    .replace(
      urlAttributePattern,
      (
        _match,
        attributeName: string,
        _rawValue: string,
        doubleQuotedValue?: string,
        singleQuotedValue?: string,
        unquotedValue?: string,
      ) => {
        const valueToCheck =
          doubleQuotedValue ?? singleQuotedValue ?? unquotedValue ?? "";

        if (!isSafeUrlAttribute(attributeName, valueToCheck)) {
          return "";
        }

        return ` ${attributeName.toLowerCase()}="${escapeHtmlAttribute(valueToCheck)}"`;
      },
    )
    .trim();

  return sanitized || null;
}

function getRenderableDocumentSource(value: string) {
  const closedBodyMatch = value.match(documentBodyPattern);
  const closedBodyHtml = closedBodyMatch?.[1]?.trim();

  if (closedBodyHtml) {
    return closedBodyHtml;
  }

  const openBodyMatch = value.match(documentBodyOpenPattern);
  const openBodyHtml = openBodyMatch?.[1]?.replace(/<\/html\s*>/gi, "").trim();

  if (openBodyHtml) {
    return openBodyHtml;
  }

  if (!documentShellPattern.test(value)) {
    return value;
  }

  return value
    .replace(doctypePattern, "")
    .replace(documentHeadPattern, "")
    .replace(/<\/?(?:html|body)\b[^>]*>/gi, "");
}

export function getSanitizedDocumentHtml(
  value: string | null | undefined,
  fallback = defaultEmptyDocumentHtml,
) {
  return sanitizeDocumentHtml(value) ?? fallback;
}

function isSafeUrlAttribute(attributeName: string, value: string) {
  const normalized = normalizeUrlForSafetyCheck(value);

  if (!normalized || normalized.startsWith("//") || normalized.includes("<")) {
    return false;
  }

  if (
    normalized.startsWith("#") ||
    normalized.startsWith("/") ||
    normalized.startsWith("./") ||
    normalized.startsWith("../") ||
    normalized.startsWith("?")
  ) {
    return true;
  }

  const colonIndex = normalized.indexOf(":");

  if (colonIndex === -1) {
    return true;
  }

  const scheme = normalized.slice(0, colonIndex);

  if (attributeName.toLowerCase() === "src") {
    return scheme === "http" || scheme === "https";
  }

  return (
    scheme === "http" ||
    scheme === "https" ||
    scheme === "mailto" ||
    scheme === "tel"
  );
}

function normalizeUrlForSafetyCheck(value: string) {
  return decodeBasicHtmlEntities(value)
    .trim()
    .replace(/[\u0000-\u001F\u007F\s]+/g, "")
    .toLowerCase();
}

function decodeBasicHtmlEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|colon|tab|newline);?/gi, (match, entity) => {
    const normalizedEntity = String(entity).toLowerCase();

    if (normalizedEntity === "colon") {
      return ":";
    }

    if (normalizedEntity === "tab" || normalizedEntity === "newline") {
      return "";
    }

    if (normalizedEntity.startsWith("#x")) {
      const codePoint = Number.parseInt(normalizedEntity.slice(2), 16);
      return isValidCodePoint(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    if (normalizedEntity.startsWith("#")) {
      const codePoint = Number.parseInt(normalizedEntity.slice(1), 10);
      return isValidCodePoint(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return match;
  });
}

function isValidCodePoint(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff;
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
