import type { CollectionEntry } from "astro:content";

// Series archives and learning paths share the same chapter/date ordering.
export function compareLearningOrder(a: CollectionEntry<"blog">, b: CollectionEntry<"blog">) {
  const orderA = a.data.chapter ?? a.data.seriesOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.data.chapter ?? b.data.seriesOrder ?? Number.MAX_SAFE_INTEGER;

  if (orderA !== orderB) return orderA - orderB;
  return b.data.date.valueOf() - a.data.date.valueOf();
}
