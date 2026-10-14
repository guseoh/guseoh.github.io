import type { APIContext } from "astro";
import type { CollectionEntry } from "astro:content";
import sharp from "sharp";
import { getPublishedPostsSorted } from "../../utils/content/posts";
import { renderPostOgSvg } from "../../utils/ogImage";
import { getPostSlug } from "../../utils/posts";

export async function getStaticPaths() {
  const posts = await getPublishedPostsSorted();
  return posts.map((post) => ({
    params: { slug: getPostSlug(post) },
    props: { post }
  }));
}

export async function GET(context: APIContext) {
  const { post } = context.props as { post: CollectionEntry<"blog"> };
  const png = await sharp(new TextEncoder().encode(renderPostOgSvg(post)))
    .png({ compressionLevel: 9 })
    .toBuffer();
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
