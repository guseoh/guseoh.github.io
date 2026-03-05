import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context: { site?: URL }) {
  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    title: "guseo.dev",
    description: "개인 개발 블로그 RSS",
    site: context.site ?? new URL("https://guseo.github.io"),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.slug}/`
    }))
  });
}
