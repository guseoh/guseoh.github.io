import type { CollectionEntry } from "astro:content";
import { getLearningPathPosts } from "./postNavigation";
import { extractPostLinkTargets, resolveInternalBlogPath } from "./postLinkTargets";
export { extractPostLinkTargets } from "./postLinkTargets";
import { getPostAliases, getPostDescription, getPostPath, SITE_URL } from "./posts";

type Post = CollectionEntry<"blog">;
export type Relationship = { post: Post; kind: "linked" | "previous" | "next" };
export type PostRelationIndex = {
  byPath: Map<string, Post>;
  incoming: Map<string, Post[]>;
  outgoing: Map<string, Post[]>;
  posts: Post[];
};

/** Resolve only a known published post. Canonical/alias mapping is built elsewhere. */
export function resolveInternalPostLink(
  href: string,
  sourcePath: string,
  byPath: Map<string, Post>,
  siteUrl: string = SITE_URL
): Post | undefined {
  const resolved = resolveInternalBlogPath(href, sourcePath, siteUrl);
  return resolved ? byPath.get(resolved) : undefined;
}

export function buildPostRelationIndex(allPosts: Post[]): PostRelationIndex {
  const posts = allPosts.filter((post) => !post.data.draft);
  const canonical = new Map<string, Post>();
  const byPath = new Map<string, Post>();
  for (const post of posts) {
    const key = getPostPath(post);
    if (canonical.has(key)) throw new Error("Duplicate canonical post path: " + key);
    canonical.set(key, post);
    byPath.set(key, post);
  }
  for (const post of posts) {
    for (const alias of getPostAliases(post)) {
      if (byPath.has(alias) && byPath.get(alias)?.id !== post.id) {
        throw new Error("Conflicting post alias: " + alias);
      }
      byPath.set(alias, post);
    }
  }
  const incoming = new Map<string, Post[]>();
  const outgoing = new Map<string, Post[]>();
  for (const post of posts) {
    const source = getPostPath(post);
    const unique = new Map<string, Post>();
    for (const rawHref of extractPostLinkTargets(post.body ?? "")) {
      const target = resolveInternalPostLink(rawHref, source, byPath);
      if (!target || target.id === post.id) continue;
      unique.set(getPostPath(target), target);
    }
    const targets = [...unique.values()];
    outgoing.set(source, targets);
    for (const target of targets) {
      const key = getPostPath(target);
      const list = incoming.get(key) ?? [];
      list.push(post);
      incoming.set(key, list);
    }
  }
  return { posts, byPath, incoming, outgoing };
}

/** Connect only authored links or Series/category chapter relationships. */
export function getPostRelations(index: PostRelationIndex, current: Post) {
  const key = getPostPath(current);
  const incoming = index.incoming.get(key) ?? [];
  const outgoing = index.outgoing.get(key) ?? [];
  const ordered = getLearningPathPosts(index.posts, current);
  const at = ordered.findIndex((post) => post.id === current.id);
  const previous = at > 0 ? ordered[at - 1] : undefined;
  const next = at >= 0 && at < ordered.length - 1 ? ordered[at + 1] : undefined;
  const seen = new Set([current.id]);
  const connections: Relationship[] = [];
  const candidates: Array<[Post | undefined, Relationship["kind"]]> = [
    [previous, "previous"], [next, "next"], ...outgoing.map((post): [Post, "linked"] => [post, "linked"])
  ];
  for (const [post, kind] of candidates) {
    if (!post || seen.has(post.id)) continue;
    seen.add(post.id);
    connections.push({ post, kind });
  }
  return { incoming, outgoing, previous, next, connections };
}

export type PreviewEntry = {
  title: string;
  path: string;
  aliases: string[];
  description: string;
  category: string;
  tags: string[];
};

export function buildPostPreviewCatalog(index: PostRelationIndex): PreviewEntry[] {
  return index.posts.map((post) => ({
    title: post.data.title,
    path: getPostPath(post),
    aliases: getPostAliases(post),
    description: getPostDescription(post),
    category: post.data.category,
    tags: post.data.tags
  }));
}
