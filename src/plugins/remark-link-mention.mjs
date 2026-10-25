import { visit } from "unist-util-visit";

const directivePattern = /^::link-mention\s*\{\s*([\s\S]*?)\s*\}$/;
const attributePattern = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|“([^”]*)”|‘([^’]*)’)/g;

function nodeText(node) {
  if (!node) return "";

  if (node.type === "text" || node.type === "inlineCode") {
    return node.value;
  }

  if (node.type === "break") {
    return "\n";
  }

  if (Array.isArray(node.children)) {
    return node.children.map(nodeText).join("");
  }

  return "";
}

function paragraphText(node) {
  return (node.children ?? []).map(nodeText).join("");
}

function parseAttributes(source) {
  const attributes = new Map();

  for (const match of source.matchAll(attributePattern)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? match[5] ?? "");
  }

  return attributes;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeUrl(value, baseUrl) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    const base = new URL(baseUrl);
    const url = new URL(trimmed, base);
    const isRootRelative = trimmed.startsWith("/") && !trimmed.startsWith("//");
    const isAbsoluteHttp = /^https?:\/\//i.test(trimmed);

    if (!isRootRelative && !isAbsoluteHttp) return undefined;

    return {
      href: isRootRelative ? `${url.pathname}${url.search}${url.hash}` : url.href,
      display: isRootRelative
        ? `${base.hostname}${url.pathname}${url.search}${url.hash}`.replace(/\/$/, "")
        : `${url.hostname}${url.pathname}${url.search}${url.hash}`.replace(/\/$/, ""),
      host: isRootRelative ? base.hostname : url.hostname,
      isInternal: isRootRelative || url.origin === base.origin
    };
  } catch {
    return undefined;
  }
}

function normalizeImageUrl(value, baseUrl) {
  if (!value) return undefined;
  const normalized = normalizeUrl(value, baseUrl);
  if (!normalized) return undefined;
  const candidate = new URL(normalized.href, baseUrl);
  if (candidate.protocol !== "https:" && candidate.origin !== new URL(baseUrl).origin) return undefined;
  return normalized.href;
}

function firstLetter(value) {
  return value.trim().replace(/^www\./, "").charAt(0).toUpperCase() || "L";
}

function renderPreviewPlaceholder(data) {
  return `<span class="link-mention__placeholder">
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.14-1.14"></path>
    </svg>
    <span>${escapeHtml(firstLetter(data.host))}</span>
  </span>`;
}

function renderLinkMention(data) {
  const description = data.description
    ? `<span class="link-mention__description">${escapeHtml(data.description)}</span>`
    : "";
  const externalAttributes = data.isInternal ? "" : ' target="_blank" rel="noopener noreferrer"';
  const icon = data.icon
    ? `<img class="link-mention__favicon" src="${escapeHtml(data.icon)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`
    : "";
  const placeholder = renderPreviewPlaceholder(data);
  const preview = data.image
    ? `<span class="link-mention__media" aria-hidden="true" data-link-preview>
    ${placeholder}
    <img class="link-mention__preview" src="${escapeHtml(data.image)}" alt="" width="640" height="360" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
  </span>`
    : `<span class="link-mention__media link-mention__media--fallback" aria-hidden="true">${placeholder}</span>`;

  return `<a class="link-mention" href="${escapeHtml(data.href)}" data-link-mention="${data.isInternal ? "internal" : "external"}"${externalAttributes}>
  <span class="link-mention__content">
    <span class="link-mention__title">${escapeHtml(data.title)}</span>
    ${description}
    <span class="link-mention__meta">
      <span class="link-mention__source">
        <span class="link-mention__icon" aria-hidden="true">
          <span class="link-mention__icon-fallback">${escapeHtml(firstLetter(data.host))}</span>
          ${icon}
        </span>
        <span>${escapeHtml(data.source)}</span>
      </span>
      <span class="link-mention__url">${escapeHtml(data.display)}</span>
    </span>
  </span>
  ${preview}
</a>`;
}

function parseLinkMention(value, options) {
  const match = value.trim().match(directivePattern);
  if (!match) return undefined;

  const attributes = parseAttributes(match[1]);
  const url = normalizeUrl(attributes.get("url") ?? attributes.get("href") ?? "", options.site);
  if (!url) return undefined;

  return {
    href: url.href,
    display: attributes.get("display")?.trim() || url.display,
    host: url.host,
    icon: normalizeImageUrl(attributes.get("icon") ?? attributes.get("favicon") ?? "", options.site),
    image: normalizeImageUrl(attributes.get("image") ?? attributes.get("preview") ?? "", options.site),
    isInternal: url.isInternal,
    title: attributes.get("title")?.trim() || url.host,
    description: attributes.get("description")?.trim() || "",
    source: attributes.get("source")?.trim() || url.host.replace(/^www\./, "")
  };
}

export function remarkLinkMention(options = {}) {
  const settings = {
    site: "https://guseoh.github.io",
    ...options
  };

  return (tree) => {
    visit(tree, "paragraph", (node, index, parent) => {
      if (!parent || typeof index !== "number") return;

      const mention = parseLinkMention(paragraphText(node), settings);
      if (!mention) return;

      parent.children[index] = {
        type: "html",
        value: renderLinkMention(mention)
      };
    });
  };
}
