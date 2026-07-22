import type { CollectionEntry } from "astro:content";
import { BLOG_LIMITS, CORE_TECH_TAGS as CONFIGURED_CORE_TECH_TAGS, SITE } from "../config/site";

export const SITE_TITLE = SITE.title;
export const SITE_DESCRIPTION = SITE.description;
export const SITE_AUTHOR = SITE.author;
export const SITE_URL = SITE.siteUrl;
export const SITE_OG_IMAGE = SITE.defaultOgImage;
export const GITHUB_URL = SITE.githubUrl;
export const REPOSITORY_URL = SITE.repositoryUrl;
export const COMMENT_REPOSITORY = SITE.commentRepository;
export const HOME_POST_LIMIT = BLOG_LIMITS.homePostLimit;
export const POSTS_PER_PAGE = BLOG_LIMITS.postsPerPage;
export const SIDEBAR_TAG_LIMIT = BLOG_LIMITS.sidebarTagLimit;
export const DETAIL_TAG_LIMIT = BLOG_LIMITS.detailTagLimit;
export const POST_STALE_MONTHS = BLOG_LIMITS.postStaleMonths;

export const CORE_TECH_TAGS = [...CONFIGURED_CORE_TECH_TAGS];

type ContentEntryWithFilePath = CollectionEntry<"blog"> & {
  filePath?: string;
};

export function normalizePostSlug(value: string) {
  return value
    .trim()
    .replace(/^\/+/, "")
    .replace(/^blog\/+/i, "")
    .replace(/\/+$/, "");
}

export function normalizeBlogPath(value: string) {
  const slug = normalizePostSlug(value);
  return slug ? `/blog/${slug}/` : "/blog/";
}

export function getPostSlug(post: CollectionEntry<"blog">) {
  return normalizePostSlug(post.data.slug || post.id);
}

export function getPostPath(post: CollectionEntry<"blog">) {
  return normalizeBlogPath(getPostSlug(post));
}

export function getPostUrl(post: CollectionEntry<"blog">, siteUrl: string | URL = SITE_URL) {
  return new URL(getPostPath(post), siteUrl).toString();
}

export function getPostAliases(post: CollectionEntry<"blog">) {
  const canonical = getPostPath(post);
  const aliases = post.data.aliases ?? [];

  return Array.from(new Set(aliases.map(normalizeBlogPath).filter((alias) => alias !== canonical)));
}

export function getPostCommentKey(post: CollectionEntry<"blog">) {
  const key = post.data.commentKey?.trim();
  return key ? normalizeBlogPath(key) : getPostPath(post);
}

export function getPostSourcePath(post: CollectionEntry<"blog">) {
  const entry = post as ContentEntryWithFilePath;
  const filePath = entry.filePath?.replace(/\\/g, "/");

  if (filePath) {
    const srcIndex = filePath.indexOf("src/content/blog/");
    return srcIndex >= 0 ? filePath.slice(srcIndex) : filePath;
  }

  return `src/content/blog/${post.id}.md`;
}

export function getPostEditUrl(post: CollectionEntry<"blog">) {
  return `${REPOSITORY_URL}/edit/main/${encodeURIComponent(getPostSourcePath(post)).replace(/%2F/g, "/")}`;
}

export function getPostActivityDate(post: CollectionEntry<"blog">) {
  return post.data.updated ?? post.data.lastVerified ?? post.data.date;
}

export function getPostOgImagePath(post: CollectionEntry<"blog">) {
  if (post.data.heroImage && post.data.heroImage !== SITE_OG_IMAGE) {
    return post.data.heroImage;
  }

  return `/og/${encodeURIComponent(getPostSlug(post)).replace(/%2F/g, "/")}.svg`;
}

export function sortPostsByDate(posts: CollectionEntry<"blog">[]) {
  return [...posts].sort((a, b) => {
    const aDate = (a.data.updated ?? a.data.date).valueOf();
    const bDate = (b.data.updated ?? b.data.date).valueOf();
    const dateDifference = bDate - aDate;

    if (dateDifference !== 0) return dateDifference;

    return getPostSourcePath(a).localeCompare(getPostSourcePath(b));
  });
}

export function formatPostDate(date: Date) {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).replace(/\s/g, "").replace(/\.$/, "");
}

export function getPostDescription(post: CollectionEntry<"blog">) {
  const description = post.data.description?.trim();
  return description && description.length > 0
    ? description
    : "학습 과정과 구현 맥락을 정리한 기록입니다.";
}

export function getPostVerificationDate(post: CollectionEntry<"blog">) {
  return post.data.lastVerified ?? post.data.updated ?? post.data.date;
}

export function isPostContentStale(post: CollectionEntry<"blog">, now: Date = new Date()) {
  const verifiedAt = startOfUtcDay(getPostVerificationDate(post));
  const staleBefore = startOfUtcDay(now);
  staleBefore.setUTCMonth(staleBefore.getUTCMonth() - POST_STALE_MONTHS);

  return verifiedAt <= staleBefore;
}

export function getReadingTime(post: CollectionEntry<"blog">) {
  const source = post.body ?? "";
  const codeBlocks = source.match(/```[\s\S]*?```/g) ?? [];
  const codeWeightedWords = codeBlocks.reduce((total, block) => total + block.length / 220, 0);
  const plainText = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/<[^>]+>/g, " ");
  const latinWords = plainText.match(/[A-Za-z0-9_]+/g)?.length ?? 0;
  const koreanCharacters = plainText.match(/[\u3131-\u318E\uAC00-\uD7A3]/g)?.length ?? 0;
  const cjkCharacters = plainText.match(/[\u3040-\u30ff\u3400-\u9fff]/g)?.length ?? 0;
  const estimatedWords = latinWords + koreanCharacters / 3.1 + cjkCharacters / 2.4 + codeWeightedWords;
  const minutes = Math.max(1, Math.ceil(estimatedWords / 240));

  return `${minutes}분 읽기`;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
