import type { CollectionEntry } from "astro:content";
import navigationData from "../data/navigation.json";
import type { CategoryTreeGroup } from "./categories";
import { getCategorySlug } from "./categories";
import { resolveSeriesId } from "./series";
import { resolveTagSlug } from "./tags";

export type NavigationItemType = "category" | "tag" | "series" | "url" | "search";

export type NavigationItem = {
  title: string;
  slug?: string;
  type: NavigationItemType;
  description?: string;
  url?: string;
  query?: string;
  icon?: string;
  planned?: boolean;
};

export type NavigationGroup = {
  title: string;
  slug: string;
  description: string;
  items: NavigationItem[];
};

export type NavigationItemView = NavigationItem & {
  href?: string;
  count: number;
};

export type NavigationGroupView = Omit<NavigationGroup, "items"> & {
  href: string;
  count: number;
  items: NavigationItemView[];
};

const NAVIGATION_GROUPS = navigationData as NavigationGroup[];

export function getNavigationItemsByType(type: NavigationItemType) {
  return NAVIGATION_GROUPS.flatMap((group) => group.items)
    .filter((item) => item.type === type);
}

export function buildNavigationGroups(posts: CollectionEntry<"blog">[]): NavigationGroupView[] {
  return NAVIGATION_GROUPS.map((group) => {
    const groupPostIds = new Set<string>();
    const items = group.items.map((item) => {
      const matchingPosts = filterPostsByNavigationItem(posts, item);
      for (const post of matchingPosts) {
        groupPostIds.add(post.id);
      }

      return {
        ...item,
        // Navigation entries remain reachable even before their first post is
        // published. The destination page renders an explicit empty state.
        href: getNavigationItemHref(item),
        count: matchingPosts.length
      };
    });

    return {
      ...group,
      href: `/search/?group=${group.slug}`,
      count: groupPostIds.size,
      items
    };
  });
}

export function buildSidebarNavigation(posts: CollectionEntry<"blog">[]): CategoryTreeGroup[] {
  // Preserve planned navigation entries in data, but hide empty destinations
  // from the reader-facing sidebar until a published post matches.
  return buildNavigationGroups(posts)
    .filter((group) => group.count > 0)
    .map((group) => ({
      name: group.title,
      slug: group.slug,
      href: group.href,
      count: group.count,
      children: group.items
        .filter((item) => item.count > 0)
        .map((item) => ({
          name: item.title,
          slug: item.slug ?? item.title,
          href: item.href,
          count: item.count,
          // CategoryIcon ignores unregistered keys, so categories and tags
          // can share this path without reserving placeholder icon space.
          categoryIcon: item.icon ?? item.slug,
          description: item.description,
          planned: false
        }))
    }));
}

function filterPostsByNavigationItem(posts: CollectionEntry<"blog">[], item: NavigationItem) {
  if (item.type === "category") {
    return posts.filter((post) => getCategorySlug(post) === item.slug);
  }

  if (item.type === "tag") {
    const slug = resolveTagSlug(item.slug ?? "");
    return posts.filter((post) => post.data.tags.some((tag) => resolveTagSlug(tag) === slug));
  }

  if (item.type === "series") {
    return posts.filter((post) =>
      post.data.series ? resolveSeriesId(post.data.series) === item.slug : false
    );
  }

  if (item.type === "search") {
    const query = (item.query ?? item.title).trim().toLowerCase();

    return posts.filter((post) =>
      [
        post.data.title,
        post.data.description ?? "",
        post.data.category ?? "",
        post.data.series ?? "",
        ...post.data.tags
      ].join(" ").toLowerCase().includes(query)
    );
  }

  return [];
}

function getNavigationItemHref(item: NavigationItem) {
  if (item.url) return item.url;
  if (item.type === "category" && item.slug) return `/categories/${item.slug}/`;
  if (item.type === "tag" && item.slug) return `/tags/${item.slug}/`;
  if (item.type === "series" && item.slug) return `/series/${item.slug}/`;
  if (item.type === "search") return `/search/?q=${encodeURIComponent(item.query ?? item.title)}`;

  return undefined;
}
