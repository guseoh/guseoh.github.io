import { buildSearchIndex } from "../utils/search";
import { getPublishedPostsSorted } from "../utils/content/posts";

export async function GET() {
  const posts = await getPublishedPostsSorted();

  // This route is prerendered to a static file on GitHub Pages. Response
  // Cache-Control is not deployed; the hosting platform sets its own policy.
  return new Response(JSON.stringify(buildSearchIndex(posts)), {
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
