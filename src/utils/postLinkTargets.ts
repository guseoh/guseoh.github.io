/**
 * Published-post link parsing: no framework dependencies, usable in Node tests
 * and Astro's build. Treat every URL as data, never as executable markup.
 */
export function resolveInternalBlogPath(href: string, sourcePath: string, siteUrl: string): string | undefined {
  if (!href.trim() || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(href.trim())) return;
  try {
    const site = new URL(siteUrl);
    const url = new URL(href.trim().replace(/^<|>$/g, ""), new URL(sourcePath, site));
    if (url.origin !== site.origin || !url.pathname.startsWith("/blog/")) return;
    return decodeURI(url.pathname).replace(/\/{2,}/g, "/").replace(/\/?$/, "/");
  } catch {
    return;
  }
}

/** Ignore fenced and inline code so example URLs are not real links. */
export function extractPostLinkTargets(body: string): string[] {
  const clean = body
    .replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "")
    .replace(/(?:^|\n)[ \t]*(\x60{3,}|~{3,})[^\n]*\n[\s\S]*?\n[ \t]*\1[^\n]*(?=\n|$)/g, "\n")
    .replace(/!\[([^\]]*)\]\((?:<[^>]*>|[^)]*)\)/g, "")
    .replace(/\x60[^\x60\n]*\x60/g, "");
  const links: string[] = [];
  for (const match of clean.matchAll(/\[[^\]]+\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+["'][^"']*["'])?\s*\)/g)) {
    links.push(match[1]);
  }
  for (const match of clean.matchAll(/<a\s+[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>/gi)) {
    links.push(match[2]);
  }
  return links;
}
