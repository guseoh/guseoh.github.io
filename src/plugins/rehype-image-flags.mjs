const filterOptOutPattern = /\s*\{(?:no-dark-filter|theme-safe|data-theme-safe)\}\s*/gi;
const lightboxOptOutPattern = /\s*\{(?:no-lightbox|lightbox-false)\}\s*/gi;
const lightBackgroundPattern = /\s*\{(?:light-bg|light-background)\}\s*/gi;
const fullWidthPattern = /\s*\{(?:full-width|wide-image)\}\s*/gi;
const darkSourcePattern = /\s*\{dark-src=(?:"([^"]+)"|'([^']+)'|([^}\s]+))\}\s*/gi;
const titleTokenPattern = /(?:^|\s)(?:no-dark-filter|theme-safe|data-theme-safe)(?=\s|$)/gi;
const lightboxTitleTokenPattern = /(?:^|\s)(?:no-lightbox|lightbox-false)(?=\s|$)/gi;
const captionTitlePattern = /^caption:\s*(.+)$/i;

function getOnlyImage(node) {
  if (node?.type !== "element") return undefined;
  if (node.tagName === "img") return node;

  if (
    node.tagName === "a" &&
    Array.isArray(node.children) &&
    node.children.length === 1 &&
    node.children[0]?.type === "element" &&
    node.children[0].tagName === "img"
  ) {
    return node.children[0];
  }

  return undefined;
}

function applyCaption(paragraph, state) {
  if (
    paragraph?.type !== "element" ||
    paragraph.tagName !== "p" ||
    !Array.isArray(paragraph.children) ||
    paragraph.children.length !== 1
  ) {
    return;
  }

  const image = getOnlyImage(paragraph.children[0]);
  if (!image) return;

  const properties = image.properties ?? {};
  const title = typeof properties.title === "string" ? properties.title.trim() : "";
  const match = title.match(captionTitlePattern);
  const caption = match?.[1]?.trim();
  if (!caption) return;

  state.captionIndex += 1;
  const captionId = `post-image-caption-${state.captionIndex}`;

  image.properties = {
    ...properties,
    "data-caption-id": captionId
  };
  delete image.properties.title;

  paragraph.tagName = "figure";
  paragraph.properties = { className: ["post-figure", "post-figure--captioned"] };
  paragraph.children = [
    paragraph.children[0],
    {
      type: "element",
      tagName: "figcaption",
      properties: { id: captionId },
      children: [{ type: "text", value: caption }]
    }
  ];
}

function visit(node, state) {
  if (!Array.isArray(node?.children)) return;

  for (const child of node.children) {
    if (child?.type === "element" && child.tagName === "img") {
      applyImageFlags(child);
    }

    visit(child, state);
  }

  applyCaption(node, state);
}

function testPattern(pattern, value) {
  const matches = pattern.test(value);
  pattern.lastIndex = 0;
  return matches;
}

function getDarkSource(value) {
  const match = darkSourcePattern.exec(value);
  darkSourcePattern.lastIndex = 0;
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function cleanMarkers(value) {
  return value
    .replace(filterOptOutPattern, " ")
    .replace(lightboxOptOutPattern, " ")
    .replace(lightBackgroundPattern, " ")
    .replace(fullWidthPattern, " ")
    .replace(darkSourcePattern, " ")
    .replace(titleTokenPattern, " ")
    .replace(lightboxTitleTokenPattern, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function applyImageFlags(image) {
  const properties = image.properties ?? {};
  const alt = typeof properties.alt === "string" ? properties.alt : "";
  const title = typeof properties.title === "string" ? properties.title : "";
  const hasAltMarker = testPattern(filterOptOutPattern, alt);
  const hasLightboxAltMarker = testPattern(lightboxOptOutPattern, alt);
  const hasTitleMarker = testPattern(filterOptOutPattern, title) || testPattern(titleTokenPattern, title);
  const hasLightboxTitleMarker = testPattern(lightboxOptOutPattern, title) || testPattern(lightboxTitleTokenPattern, title);
  const hasLightBackground = testPattern(lightBackgroundPattern, alt) || testPattern(lightBackgroundPattern, title);
  const hasFullWidth = testPattern(fullWidthPattern, alt) || testPattern(fullWidthPattern, title);
  const darkSource = getDarkSource(alt) ?? getDarkSource(title);

  if (
    !hasAltMarker &&
    !hasTitleMarker &&
    !hasLightboxAltMarker &&
    !hasLightboxTitleMarker &&
    !hasLightBackground &&
    !hasFullWidth &&
    !darkSource
  ) {
    return;
  }

  const className = Array.isArray(properties.className)
    ? properties.className
    : typeof properties.className === "string"
      ? properties.className.split(/\s+/).filter(Boolean)
      : [];
  const classNames = new Set(className);
  const cleanAlt = cleanMarkers(alt);
  const cleanTitle = cleanMarkers(title);

  image.properties = {
    ...properties,
    alt: cleanAlt
  };

  if (hasAltMarker || hasTitleMarker) {
    classNames.add("no-dark-filter");
    image.properties.dataThemeSafe = "true";
  }

  if (hasLightboxAltMarker || hasLightboxTitleMarker) {
    classNames.add("no-lightbox");
    image.properties["data-lightbox"] = "false";
    image.properties.dataLightbox = "false";
  }

  if (hasLightBackground) {
    classNames.add("light-bg");
    image.properties.dataLightBackground = "true";
  }

  if (hasFullWidth) {
    classNames.add("full-width");
    image.properties.dataFullWidth = "true";
  }

  if (darkSource) {
    classNames.add("theme-source");
    image.properties.dataDarkSrc = darkSource;
  }

  if (classNames.size > 0) {
    image.properties.className = [...classNames];
  }

  if (cleanTitle) {
    image.properties.title = cleanTitle;
  } else {
    delete image.properties.title;
  }
}

export function rehypeImageFlags() {
  return (tree) => {
    visit(tree, { captionIndex: 0 });
  };
}
