import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_DESCRIPTION, SITE_TITLE, sortPostsByDate } from "../utils/posts";

export async function GET(context: { site?: URL }) {
  const posts = sortPostsByDate(await getCollection("blog", ({ data }) => !data.draft));

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site ?? new URL("https://guseoh.github.io"),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/blog/${post.slug}/`
    }))
  });
}
