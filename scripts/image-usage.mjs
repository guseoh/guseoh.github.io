import path from "node:path";

const imageSuffix = /\.(?:png|jpe?g|gif|webp|avif)$/i;

// Preserve image captions/paths with spaces and skip examples inside code fences.
export function collectImageReferences(source) {
  const withoutFences = source.replace(
    /(^|\n)[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n[ \t]*\2[ \t]*(?=\n|$)/g,
    "$1"
  );
  const references = new Set();

  // One scan keeps Markdown and HTML image references in document order.
  const imagePattern = /!\[[^\]]*]\(\s*(?:<([^>]+)>|([^)\s]+))|<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  for (const match of withoutFences.matchAll(imagePattern)) {
    references.add(match[1] ?? match[2] ?? match[3]);
  }

  return [...references];
}

export function resolveLocalImageReference(reference, markdownFile, blogRoot) {
  if (!reference || /^(?:[a-z][\w+.-]*:|\/\/|\/|#)/i.test(reference)) return null;

  let decoded;
  try {
    decoded = decodeURIComponent(reference.split(/[?#]/)[0]);
  } catch {
    throw new Error("Invalid encoded image reference: " + reference);
  }

  const resolved = path.resolve(path.dirname(markdownFile), decoded);
  if (!resolved.startsWith(path.resolve(blogRoot) + path.sep)) {
    throw new Error("Image reference escapes blog directory: " + reference);
  }

  return imageSuffix.test(resolved) ? resolved : null;
}
