import type { CollectionEntry } from "astro:content";
import { formatTagName, getTagHref, resolveTagSlug } from "./tags";
import { normalizeTaxonomySlug } from "./taxonomySlug";

export type CategorySummary = {
  slug: string;
  name: string;
  count: number;
};

export type CategoryTreeChild = {
  name: string;
  slug: string;
  href?: string;
  count: number;
  categoryIcon?: string;
  description?: string;
  planned?: boolean;
};

export type CategoryTreeGroup = {
  name: string;
  slug: string;
  href: string;
  count: number;
  children: CategoryTreeChild[];
};

export function normalizeCategory(category: string): string {
  return normalizeTaxonomySlug(category);
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

  return Array.from(counts.values()).sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    return a.name.localeCompare(b.name, "ko");
  });
}

export function filterPostsByCategory(posts: CollectionEntry<"blog">[], categorySlug: string) {
  return posts.filter((post) => getCategorySlug(post) === categorySlug);
}

export function buildCategoryHierarchy(posts: CollectionEntry<"blog">[]): CategoryTreeGroup[] {
  return buildCategorySummary(posts).map(({ slug, name, count }) => {
    const categoryPosts = posts.filter((post) => getCategorySlug(post) === slug);
    const tagCounts = new Map<string, CategoryTreeChild>();

    for (const post of categoryPosts) {
      for (const rawTag of post.data.tags) {
        const tagSlug = resolveTagSlug(rawTag);
        if (!tagSlug || tagSlug === slug) continue;

        const entry = tagCounts.get(tagSlug);

        if (entry) {
          entry.count += 1;
          continue;
        }

        tagCounts.set(tagSlug, {
          name: formatTagName(rawTag),
          slug: tagSlug,
          href: getTagHref(rawTag),
          count: 1,
          // CategoryIcon renders only keys registered in its icon map. Unknown
          // tags therefore remain text-only without reserving icon space.
          categoryIcon: tagSlug
        });
      }
    }

    const children = Array.from(tagCounts.values()).sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return a.name.localeCompare(b.name, "ko");
    });

    return {
      name,
      slug,
      href: `/categories/${slug}/`,
      count,
      children
    };
  });
}
