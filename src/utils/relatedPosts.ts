import type { CollectionEntry } from "astro:content";
import { normalizeCategory } from "./categories";
import { resolveSeriesId } from "./series";
import { resolveTagSlug } from "./tags";
import { getCommonCanonicalTags } from "./relatedTagMatches";

export interface RelatedPostResult {
  post: CollectionEntry<"blog">;
  score: number;
  commonTags: string[];
  reasons: string[];
}

export interface RelatedPostOptions {
  limit?: number;
  tagScore?: number;
  categoryScore?: number;
  excludeSameSeries?: boolean;
}

const DEFAULT_LIMIT = 3;
const DEFAULT_TAG_SCORE = 3;
const DEFAULT_CATEGORY_SCORE = 2;

export function getRelatedPosts(
  currentPost: CollectionEntry<"blog">,
  allPosts: CollectionEntry<"blog">[],
  options: RelatedPostOptions = {}
): RelatedPostResult[] {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const tagScore = options.tagScore ?? DEFAULT_TAG_SCORE;
  const categoryScore = options.categoryScore ?? DEFAULT_CATEGORY_SCORE;
  const excludeSameSeries = options.excludeSameSeries ?? true;
  const currentCategory = normalizeOptionalCategory(currentPost.data.category);
  const currentSeries = normalizeOptionalSeries(currentPost.data.series);


  return allPosts
    .filter((post) => post.id !== currentPost.id && !post.data.draft)
    .map((post) => {
      const candidateSeries = normalizeOptionalSeries(post.data.series);
      if (excludeSameSeries && currentSeries && candidateSeries === currentSeries) {
        return undefined;
      }

      const commonTags = getCommonCanonicalTags(currentPost.data.tags, post.data.tags, resolveTagSlug);
      const candidateCategory = normalizeOptionalCategory(post.data.category);
      const sameCategory = Boolean(currentCategory && candidateCategory === currentCategory);
      const score = commonTags.length * tagScore + (sameCategory ? categoryScore : 0);

      if (score <= 0) return undefined;

      return {
        post,
        score,
        commonTags,
        reasons: [
          sameCategory ? "같은 카테고리" : undefined,
          commonTags.length > 0 ? `공통 태그 ${commonTags.length}개` : undefined
        ].filter((reason): reason is string => Boolean(reason))
      };
    })
    .filter((result): result is RelatedPostResult => Boolean(result))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.post.data.date.valueOf() - a.post.data.date.valueOf();
    })
    .slice(0, limit);
}

function normalizeOptionalCategory(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalizeCategory(normalized) : "";
}

function normalizeOptionalSeries(value?: string) {
  const normalized = value?.trim();
  return normalized ? resolveSeriesId(normalized) : "";
}
