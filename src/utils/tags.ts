import type { CollectionEntry } from "astro:content";
import tagMetadata from "../data/tags.json";

export type TagType = "tech" | "project" | "topic" | "post";

export type TagMetadata = {
  slug: string;
  name: string;
  type: TagType;
  archive?: boolean;
  aliases?: string[];
};

export type TagSummary = {
  tag: string;
  name: string;
  count: number;
  type: TagType;
};

const TAG_METADATA_LIST = tagMetadata as TagMetadata[];
const TAG_METADATA = new Map(TAG_METADATA_LIST.map((entry) => [entry.slug, entry]));
const TAG_ALIAS_TO_SLUG = new Map<string, string>();

for (const entry of TAG_METADATA_LIST) {
  TAG_ALIAS_TO_SLUG.set(entry.slug, entry.slug);
  for (const alias of entry.aliases ?? []) {
    TAG_ALIAS_TO_SLUG.set(normalizeTag(alias), entry.slug);
  }
}

export function normalizeTag(tag: string) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveTagSlug(tag: string) {
  const normalized = normalizeTag(tag);
  return TAG_ALIAS_TO_SLUG.get(normalized) ?? normalized;
}

export function formatTagName(tag: string) {
  const trimmed = tag.trim();
  const metadata = TAG_METADATA.get(resolveTagSlug(trimmed));
  return metadata?.name ?? trimmed;
}

export function getTagType(tag: string): TagType {
  return TAG_METADATA.get(resolveTagSlug(tag))?.type ?? "topic";
}

export function isTagArchiveEnabled(tag: string) {
  return TAG_METADATA.get(resolveTagSlug(tag))?.archive === true;
}

export function getTagHref(tag: string) {
  const trimmed = tag.trim();
  const slug = resolveTagSlug(trimmed);

  return isTagArchiveEnabled(slug)
    ? `/tags/${slug}/`
    : `/search/?tag=${encodeURIComponent(trimmed)}`;
}

export function getArchiveTagMetadata() {
  return TAG_METADATA_LIST.filter((entry) => entry.archive === true);
}

export function buildTagSummary(posts: CollectionEntry<"blog">[]): TagSummary[] {
  const counts = new Map<string, number>();

  for (const post of posts) {
    for (const rawTag of post.data.tags) {
      const tag = resolveTagSlug(rawTag);
      if (!tag) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => {
      const metadata = TAG_METADATA.get(tag);
      return {
        tag,
        count,
        name: metadata?.name ?? formatTagName(tag),
        type: metadata?.type ?? "topic"
      } satisfies TagSummary;
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko-KR"));
}

export function buildArchiveTagSummary(
  posts: CollectionEntry<"blog">[],
  options: { includeEmpty?: boolean } = {}
): TagSummary[] {
  const summaries = new Map(
    buildTagSummary(posts)
      .filter((entry) => isTagArchiveEnabled(entry.tag))
      .map((entry) => [entry.tag, entry])
  );

  if (options.includeEmpty) {
    for (const metadata of getArchiveTagMetadata()) {
      if (!summaries.has(metadata.slug)) {
        summaries.set(metadata.slug, {
          tag: metadata.slug,
          name: metadata.name,
          count: 0,
          type: metadata.type
        });
      }
    }
  }

  return Array.from(summaries.values())
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko-KR"));
}
