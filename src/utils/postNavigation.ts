import type { CollectionEntry } from "astro:content";
import { resolveSeriesId } from "./series";
import { compareLearningOrder } from "./postOrder";

export function getAdjacentPosts(posts: CollectionEntry<"blog">[], currentPostId: string) {
  const currentIndex = posts.findIndex((entry) => entry.id === currentPostId);

  return {
    newerPost: currentIndex > 0 ? posts[currentIndex - 1] : undefined,
    olderPost: currentIndex >= 0 && currentIndex < posts.length - 1 ? posts[currentIndex + 1] : undefined
  };
}

export function getSeriesPosts(posts: CollectionEntry<"blog">[], seriesName?: string) {
  const normalizedSeriesName = seriesName?.trim();
  if (!normalizedSeriesName) return [];
  const seriesId = resolveSeriesId(normalizedSeriesName);

  return posts
    .filter((entry) => {
      const entrySeries = entry.data.series?.trim();
      return entrySeries ? resolveSeriesId(entrySeries) === seriesId : false;
    })
    .sort(compareLearningOrder);
}

export function getLearningPathPosts(
  posts: CollectionEntry<"blog">[],
  currentPost: CollectionEntry<"blog">
) {
  const seriesName = currentPost.data.series?.trim();
  if (seriesName) return getSeriesPosts(posts, seriesName);
  if (typeof currentPost.data.chapter !== "number") return [];

  const categoryName = currentPost.data.category?.trim().toLocaleLowerCase("ko-KR");
  if (!categoryName) return [];

  const categoryPosts = posts.filter((entry) => {
    const entryCategory = entry.data.category?.trim().toLocaleLowerCase("ko-KR");
    return entryCategory === categoryName && typeof entry.data.chapter === "number";
  });

  // Without an explicit series, duplicate chapter numbers are ambiguous.
  // Do not invent a reading order from publication dates in that case.
  const chapters = categoryPosts.map((entry) => entry.data.chapter);
  if (new Set(chapters).size !== chapters.length) return [];

  return categoryPosts.sort(compareLearningOrder);
}

