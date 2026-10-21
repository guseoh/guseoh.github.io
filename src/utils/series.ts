import type { CollectionEntry } from "astro:content";
import seriesMetadata from "../data/series.json";
import { getCategoryName } from "./categories";
import { getPostActivityDate } from "./posts";
import { compareLearningOrder } from "./postOrder";
import { normalizeTaxonomySlug } from "./taxonomySlug";

export type SeriesStatus = "planned" | "ongoing" | "completed";

export type SeriesMetadata = {
  id: string;
  title: string;
  description: string;
  order: number;
  status: SeriesStatus;
  featured: boolean;
};

export type SeriesSummary = {
  id: string;
  title: string;
  description: string;
  order: number;
  status: SeriesStatus;
  featured: boolean;
  count: number;
  latestDate: Date;
  category: string;
  posts: CollectionEntry<"blog">[];
};

const SERIES = seriesMetadata as SeriesMetadata[];
const SERIES_BY_ID = new Map(SERIES.map((metadata) => [metadata.id, metadata]));

function getRepresentativeCategory(posts: CollectionEntry<"blog">[]) {
  const counts = new Map<string, number>();

  for (const post of posts) {
    const category = getCategoryName(post);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))[0]?.[0] ?? "Uncategorized";
}

export function normalizeSeriesName(seriesName: string) {
  return normalizeTaxonomySlug(seriesName);
}

const SERIES_BY_LEGACY_NAME = new Map(SERIES.map((metadata) => [normalizeSeriesName(metadata.title), metadata]));

export function getSeriesMetadata(seriesValue: string): SeriesMetadata | undefined {
  const value = seriesValue.trim();
  return SERIES_BY_ID.get(value) ?? SERIES_BY_LEGACY_NAME.get(normalizeSeriesName(value));
}

export function resolveSeriesId(seriesValue: string) {
  return getSeriesMetadata(seriesValue)?.id ?? normalizeSeriesName(seriesValue);
}

export function getSeriesContinuationMessage(seriesName: string) {
  const metadata = getSeriesMetadata(seriesName);

  if (metadata) {
    return `${metadata.description} 다음 글이 발행되면 이 시리즈에 이어서 연결됩니다.`;
  }

  return `다음 ${seriesName} 기록이 발행되면 이 시리즈 목록에 이어서 연결됩니다.`;
}

export function buildSeriesSummary(posts: CollectionEntry<"blog">[]): SeriesSummary[] {
  const seriesMap = new Map<string, SeriesSummary>();

  for (const post of posts) {
    const seriesValue = post.data.series?.trim();
    if (!seriesValue) continue;

    const metadata = getSeriesMetadata(seriesValue);
    const id = metadata?.id ?? normalizeSeriesName(seriesValue);
    const entry = seriesMap.get(id);

    if (entry) {
      entry.posts.push(post);
      entry.count += 1;
      if (getPostActivityDate(post) > entry.latestDate) {
        entry.latestDate = getPostActivityDate(post);
      }
      continue;
    }

    seriesMap.set(id, {
      id,
      title: metadata?.title ?? seriesValue,
      description: metadata?.description ?? `${seriesValue} 시리즈 글을 모아둔 목록입니다.`,
      order: metadata?.order ?? Number.MAX_SAFE_INTEGER,
      status: metadata?.status ?? "ongoing",
      featured: metadata?.featured ?? false,
      count: 1,
      latestDate: getPostActivityDate(post),
      category: getCategoryName(post),
      posts: [post]
    });
  }

  return Array.from(seriesMap.values())
    .map((series) => ({
      ...series,
      category: getRepresentativeCategory(series.posts),
      posts: [...series.posts].sort(compareLearningOrder)
    }))
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      if (a.latestDate.valueOf() !== b.latestDate.valueOf()) {
        return b.latestDate.valueOf() - a.latestDate.valueOf();
      }

      return a.title.localeCompare(b.title, "ko");
    });
}
