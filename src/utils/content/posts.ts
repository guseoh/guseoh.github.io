import { getCollection, type CollectionEntry } from "astro:content";
import { getPostAliases, getPostSlug, normalizePostSlug, sortPostsByDate } from "../posts";

export async function getPublishedPosts() {
  return getCollection("blog", ({ data }) => !data.draft);
}

export async function getPublishedPostsSorted() {
  return sortPostsByDate(await getPublishedPosts());
}

export async function getLatestPublishedPost() {
  return (await getPublishedPostsSorted())[0];
}

export async function getPostBySlug(slug: string) {
  const normalizedSlug = normalizePostSlug(slug);
  const posts = await getPublishedPosts();

  return posts.find((post) => {
    if (getPostSlug(post) === normalizedSlug) return true;
    return getPostAliases(post).some((alias) => normalizePostSlug(alias) === normalizedSlug);
  });
}

export function findPostBySlug(posts: CollectionEntry<"blog">[], slug: string) {
  const normalizedSlug = normalizePostSlug(slug);

  return posts.find((post) => getPostSlug(post) === normalizedSlug);
}
