import type { CollectionEntry } from "astro:content";
import { getPostDescription, getPostPath, getPostSlug, getReadingTime } from "./posts";

export type SearchIndexItem = {
  title: string;
  description: string;
  category: string;
  tags: string[];
  series: string;
  date: string;
  slug: string;
  url: string;
  readingTime: string;
  excerpt: string;
  bodyText: string;
  codeText: string;
};

export type SearchMatch = {
  score: number;
  reasons: string[];
};

const MAX_EXCERPT_LENGTH = 280;

export function buildSearchIndex(posts: CollectionEntry<"blog">[]): SearchIndexItem[] {
  return posts.map((post) => {
    const description = getPostDescription(post);
    const category = post.data.category?.trim() || "Uncategorized";
    const series = post.data.series?.trim() || "";
    // Keep prose and code separately: the result can show the actual matching
    // passage without serializing the same article twice in the JSON index.
    const { bodyText, codeText } = extractSearchableContent(post.body ?? "");
    const excerpt = truncateText(bodyText || description, MAX_EXCERPT_LENGTH);

    return {
      title: post.data.title,
      description,
      category,
      tags: post.data.tags,
      series,
      date: post.data.date.toISOString(),
      slug: getPostSlug(post),
      url: getPostPath(post),
      readingTime: getReadingTime(post),
      excerpt,
      bodyText,
      codeText
    };
  });
}

export function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

export function scoreSearchItem(post: SearchIndexItem, rawQuery: string): SearchMatch {
  const query = normalizeSearchText(rawQuery);
  if (!query) return { score: 0, reasons: [] };

  const reasons: string[] = [];
  let score = 0;
  const title = normalizeSearchText(post.title);
  const description = normalizeSearchText(post.description || post.excerpt);
  const category = normalizeSearchText(post.category);
  const series = normalizeSearchText(post.series);
  const tags = post.tags.map((tag) => ({ raw: tag, value: normalizeSearchText(tag) }));

  if (title === query) {
    score += 1000;
    reasons.push("제목이 정확히 일치");
  } else if (title.includes(query)) {
    score += 650;
    reasons.push("제목에서 일치");
  }

  const matchedTags = tags.filter((tag) => tag.value.includes(query));
  if (matchedTags.length > 0) {
    score += 420 + matchedTags.length * 20;
    reasons.push(`태그 ${matchedTags.map((tag) => tag.raw).join(", ")}에서 일치`);
  }

  if (category.includes(query)) {
    score += 320;
    reasons.push(`카테고리 ${post.category}에서 일치`);
  }

  if (series && series.includes(query)) {
    score += 260;
    reasons.push("시리즈에서 일치");
  }

  if (description.includes(query)) {
    score += 160;
    reasons.push("설명에서 일치");
  }

  if (normalizeSearchText(post.codeText).includes(query)) {
    score += 70;
    reasons.push("코드에서 일치");
  }

  if (normalizeSearchText(post.bodyText).includes(query)) {
    score += 40;
    reasons.push("본문에서 일치");
  }

  return { score, reasons };
}

// The result snippet is selected from an actual match, not the article's first
// paragraph. Search ordering remains title > tag > category > series >
// description > code > prose, with recent posts breaking ties.
export function getSearchSnippet(post: SearchIndexItem, rawQuery: string) {
  const query = normalizeSearchText(rawQuery);
  const description = post.description || post.excerpt;

  if (!query || normalizeSearchText(description).includes(query)) {
    return { source: "description" as const, text: description };
  }
  if (normalizeSearchText(post.bodyText).includes(query)) {
    return { source: "body" as const, text: matchingExcerpt(post.bodyText, query) };
  }
  if (normalizeSearchText(post.codeText).includes(query)) {
    return { source: "code" as const, text: matchingExcerpt(post.codeText, query) };
  }

  return { source: "description" as const, text: description };
}

function matchingExcerpt(source: string, query: string) {
  const index = normalizeSearchText(source).indexOf(query);
  if (index < 0) return truncateText(source, MAX_EXCERPT_LENGTH);

  const start = Math.max(0, index - 60);
  const end = Math.min(source.length, index + query.length + 100);
  const excerpt = source.slice(start, end).trim();
  return (start > 0 ? "…" : "") + excerpt + (end < source.length ? "…" : "");
}

export function sortSearchResults(posts: SearchIndexItem[], query: string) {
  const normalizedQuery = normalizeSearchText(query);
  const scored = posts
    .map((post) => ({ post, match: scoreSearchItem(post, normalizedQuery) }))
    .filter(({ match }) => !normalizedQuery || match.score > 0)
    .sort((a, b) => {
      if (b.match.score !== a.match.score) return b.match.score - a.match.score;
      return new Date(b.post.date).valueOf() - new Date(a.post.date).valueOf();
    });

  return scored;
}

function extractSearchableContent(source: string) {
  const codeFragments: string[] = [];
  const normalizedSource = source.replace(/\r\n?/g, "\n");

  // Fenced blocks support both backticks and tildes, with language metadata.
  const withoutFences = normalizedSource.replace(
    /(^|\n)[ \t]*(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n[ \t]*\2[ \t]*(?=\n|$)/g,
    (_whole, prefix: string, _fence: string, code: string) => {
      codeFragments.push(code);
      return prefix + " ";
    }
  );

  // Inline code is searchable even when the token never appears in prose.
  const withoutInlineCode = withoutFences.replace(/(`+)([^\n]*?)\1/g, (_whole, _ticks: string, code: string) => {
    codeFragments.push(code);
    return code;
  });

  const bodyText = withoutInlineCode
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, " ")
    .replace(/^>\s?/gm, " ")
    .replace(/[*_~>#|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const codeText = codeFragments.join(" ").replace(/\s+/g, " ").trim();
  return { bodyText, codeText };
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength).trim() + "...";
}
