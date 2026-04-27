import type { CollectionEntry } from "astro:content";

export const SITE_TITLE = "devjune.dev";
export const SITE_DESCRIPTION = "Java/Spring 학습과 프로젝트 개선 기록";

export function sortPostsByDate(posts: CollectionEntry<"blog">[]) {
  return [...posts].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function formatPostDate(date: Date) {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

export function getReadingTime(post: CollectionEntry<"blog">) {
  const source = post.body ?? "";
  const plainText = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/<[^>]+>/g, " ");
  const latinWords = plainText.match(/[A-Za-z0-9_]+/g)?.length ?? 0;
  const koreanCharacters = plainText.match(/[가-힣]/g)?.length ?? 0;
  const estimatedWords = latinWords + koreanCharacters / 3;
  const minutes = Math.max(1, Math.ceil(estimatedWords / 220));

  return `${minutes}분 읽기`;
}
