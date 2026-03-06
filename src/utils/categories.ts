import type { CollectionEntry } from "astro:content";

export type CategorySummary = {
  slug: string;
  name: string;
  count: number;
};

export function normalizeCategory(category: string): string {
  return category.trim().toLowerCase().replace(/\s+/g, "-");
}

export function getCategoryName(post: CollectionEntry<"blog">): string {
  const raw = post.data.category?.trim();
  return raw && raw.length > 0 ? raw : "미분류";
}

export function getCategorySlug(post: CollectionEntry<"blog">): string {
  return normalizeCategory(getCategoryName(post));
}

export function buildCategorySummary(posts: CollectionEntry<"blog">[]): CategorySummary[] {
  const counts = new Map<string, CategorySummary>();

  for (const post of posts) {
    const name = getCategoryName(post);
    const slug = normalizeCategory(name);
    const entry = counts.get(slug);

    if (entry) {
      entry.count += 1;
      continue;
    }

    counts.set(slug, { slug, name, count: 1 });
  }

  return Array.from(counts.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function filterPostsByCategory(posts: CollectionEntry<"blog">[], categorySlug: string) {
  return posts.filter((post) => getCategorySlug(post) === categorySlug);
}
