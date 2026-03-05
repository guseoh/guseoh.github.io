import type { CollectionEntry } from "astro:content";

export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

export function buildTagSummary(posts: CollectionEntry<"blog">[]) {
  const counts = new Map<string, number>();

  for (const post of posts) {
    for (const rawTag of post.data.tags) {
      const tag = normalizeTag(rawTag);
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}
