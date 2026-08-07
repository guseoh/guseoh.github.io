import { PROJECTS } from "../data/projects";
import { buildBookSummaries } from "../utils/books";
import { buildCategorySummary, filterPostsByCategory } from "../utils/categories";
import { getPublishedPostsSorted } from "../utils/content/posts";
import { buildSeriesSummary } from "../utils/series";
import { buildArchiveTagSummary, resolveTagSlug } from "../utils/tags";
import { getPostActivityDate, getPostPath, POSTS_PER_PAGE, SITE_URL } from "../utils/posts";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

function formatLastmod(date?: Date) {
  return date?.toISOString().slice(0, 10);
}

function latestPostDate(posts: { data: { date: Date; lastVerified?: Date; updated?: Date } }[]) {
  if (posts.length === 0) return undefined;

  return new Date(Math.max(...posts.map((post) => {
    const date = post.data.updated ?? post.data.lastVerified ?? post.data.date;
    return date.valueOf();
  })));
}

export async function GET() {
  const posts = await getPublishedPostsSorted();
  const categories = buildCategorySummary(posts);
  const books = buildBookSummaries(posts);
  const series = buildSeriesSummary(posts);
  const tags = buildArchiveTagSummary(posts);
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);

  const urlsByPath = new Map<string, string | undefined>();
  const addUrl = (path: string, lastmod?: Date) => {
    if (!urlsByPath.has(path)) {
      urlsByPath.set(path, formatLastmod(lastmod));
    }
  };

  addUrl("/", latestPostDate(posts));
  addUrl("/about/");
  addUrl("/blog/", latestPostDate(posts.slice(0, POSTS_PER_PAGE)));
  addUrl("/books/", latestPostDate(posts.filter((post) => post.data.book?.trim())));
  addUrl("/categories/", latestPostDate(posts));
  addUrl("/projects/");
  addUrl("/tags/", latestPostDate(posts));
  addUrl("/series/", latestPostDate(posts.filter((post) => post.data.series?.trim())));
  addUrl("/search/");

  for (const project of PROJECTS) {
    addUrl(`/projects/${project.slug}/`);
  }

  if (totalPages > 1) {
    for (let index = 1; index < totalPages; index += 1) {
      const pagePosts = posts.slice(index * POSTS_PER_PAGE, (index + 1) * POSTS_PER_PAGE);
      addUrl(`/blog/page/${index + 1}/`, latestPostDate(pagePosts));
    }
  }

  for (const post of posts) {
    addUrl(getPostPath(post), getPostActivityDate(post));
  }

  for (const category of categories) {
    addUrl(`/categories/${category.slug}/`, latestPostDate(filterPostsByCategory(posts, category.slug)));
  }

  for (const book of books) {
    addUrl(`/books/${book.id}/`, book.latestDate);
  }

  for (const tag of tags) {
    addUrl(`/tags/${tag.tag}/`, latestPostDate(posts.filter((post) =>
      post.data.tags.some((postTag) => resolveTagSlug(postTag) === tag.tag)
    )));
  }

  for (const entry of series) {
    addUrl(`/series/${entry.id}/`, entry.latestDate);
  }

  const urls = [...urlsByPath.entries()]
    .map(([path, lastmod]) => {
      const lastmodNode = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";

      return [
        "  <url>",
        `    <loc>${escapeXml(buildUrl(path))}</loc>${lastmodNode}`,
        "  </url>"
      ].join("\n");
    })
    .join("\n");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}
