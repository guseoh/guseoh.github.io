import type { APIContext } from "astro";
import type { CollectionEntry } from "astro:content";
import { getRenderablePosts } from "../../utils/content/posts";
import { renderPostOgSvg } from "../../utils/ogImage";
import { getPostSlug } from "../../utils/posts";

export async function getStaticPaths() {
  const posts = await getRenderablePosts();
  return posts.map((post) => ({
    params: { slug: getPostSlug(post) },
    props: { post }
  }));
}

export function GET(context: APIContext) {
  const { post } = context.props as { post: CollectionEntry<"blog"> };
  return new Response(renderPostOgSvg(post), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
