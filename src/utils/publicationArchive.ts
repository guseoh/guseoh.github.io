import type { CollectionEntry } from "astro:content";
import { getKoreaDateKey } from "./koreaDate";
import { getPostPath } from "./posts";

type Post = CollectionEntry<"blog">;
export type ArchiveMonth = { key: string; title: string; posts: Post[] };
export type ArchiveYear = { year: string; months: ArchiveMonth[]; count: number };

/** Publication date only; updated/verified date never changes archive placement. */
export function buildPublicationArchive(posts: Post[], now: Date = new Date()): ArchiveYear[] {
  const today = getKoreaDateKey(now);
  const map = new Map<string, Map<string, Post[]>>();
  for (const post of posts) {
    if (post.data.draft) continue;
    const dateKey = getKoreaDateKey(post.data.date);
    if (dateKey > today) continue;
    const year = dateKey.slice(0, 4);
    const month = dateKey.slice(5, 7);
    const months = map.get(year) ?? new Map<string, Post[]>();
    months.set(month, [...(months.get(month) ?? []), post]);
    map.set(year, months);
  }
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([year, months]) => {
    const sorted = Array.from(months.entries()).sort(([a], [b]) => b.localeCompare(a))
      .map(([month, entries]) => ({
        key: year + "-" + month,
        title: Number(month) + "월",
        posts: entries.sort((a, b) => getKoreaDateKey(b.data.date).localeCompare(getKoreaDateKey(a.data.date))
          || getPostPath(a).localeCompare(getPostPath(b)))
      }));
    return { year, months: sorted, count: sorted.reduce((n, m) => n + m.posts.length, 0) };
  });
}
