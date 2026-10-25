import { render } from "astro:content";
import { buildSearchIndex } from "../utils/search";
import { getPublishedPostsSorted } from "../utils/content/posts";

export async function GET() {
  const posts = await getPublishedPostsSorted();
  // Rendered Astro headings supply the real IDs; avoid guessing slugger rules.
  // Keep only compact navigation metadata in the existing static index.
  const headingsById = new Map(await Promise.all(posts.map(async (post) => {
    const result = await render(post);
    return [post.id, result.headings
      .filter((heading) => heading.depth >= 2 && heading.depth <= 3)
      .slice(0, 60)
      .map(({ slug, text }) => ({ id: slug, text: text.slice(0, 130) }))] as const;
  })));

  return new Response(JSON.stringify(buildSearchIndex(posts, headingsById)), {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
