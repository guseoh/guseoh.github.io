import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

async function collectMarkdown(root: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await collectMarkdown(file));
    else if (entry.isFile() && entry.name.endsWith(".md") && !entry.name.startsWith("_")) files.push(file);
  }
  return files;
}

test("공개 글만 검색·RSS·sitemap에 등록되고 개별 canonical을 가진다", async ({ request }) => {
  const posts = await request.get("/search-index.json");
  expect(posts.ok()).toBe(true);
  const index = await posts.json() as Array<{ slug: string; url: string }>;
  const sitemapResponse = await request.get("/sitemap.xml");
  const rssResponse = await request.get("/rss.xml");
  expect(sitemapResponse.ok()).toBe(true);
  expect(rssResponse.ok()).toBe(true);
  const sitemap = await sitemapResponse.text();
  const rss = await rssResponse.text();
  const paths = new Set(index.map((post) => post.url));

  const files = await collectMarkdown(path.resolve("src/content/blog"));
  const published: string[] = [];
  const drafts: string[] = [];
  const fixtures: string[] = [];
  for (const file of files) {
    const markdown = await readFile(file, "utf8");
    const meta = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
    const slug = meta.match(/^slug:\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1];
    const draft = meta.match(/^draft:\s*(true|false)\s*$/m)?.[1];
    expect(slug, file).toBeTruthy();
    expect(draft, file).toMatch(/^(true|false)$/);
    (draft === "true" ? drafts : slug?.startsWith("ui-preview/") ? fixtures : published).push(`/blog/${slug}/`);
  }

  expect(index.length).toBe(published.length);
  expect(paths).toEqual(new Set(published));
  for (const url of published) {
    const response = await request.get(url);
    expect(response.ok(), url).toBe(true);
    const html = await response.text();
    expect(html).toContain(`rel="canonical" href="https://guseoh.github.io${url}"`);
    expect(sitemap).toContain(`https://guseoh.github.io${url}`);
    expect(rss).toContain(`https://guseoh.github.io${url}`);
  }
  for (const url of fixtures) {
    expect(paths.has(url)).toBe(false);
    expect(sitemap).not.toContain(`https://guseoh.github.io${url}`);
    expect(rss).not.toContain(`https://guseoh.github.io${url}`);
    const response = await request.get(url);
    expect(response.ok(), url).toBe(true);
    expect(await response.text()).toContain('content="noindex,follow"');
  }
  for (const url of drafts) {
    expect(paths.has(url)).toBe(false);
    expect(sitemap).not.toContain(`https://guseoh.github.io${url}`);
    expect(rss).not.toContain(`https://guseoh.github.io${url}`);
  }
});

test("별칭은 canonical·noindex 안내를 유지하고 댓글 키는 원본 게시글에만 연결된다", async ({ page, request }) => {
  const canonical = "/blog/security/basic1/";
  const legacy = "/blog/spring-security/";
  const aliasResponse = await request.get(legacy);
  expect(aliasResponse.ok()).toBe(true);
  const aliasHtml = await aliasResponse.text();
  expect(aliasHtml).toContain(`rel="canonical" href="https://guseoh.github.io${canonical}"`);
  expect(aliasHtml).toContain('content="noindex,follow"');
  expect(aliasHtml).toContain(canonical);

  await page.goto(canonical);
  await expect(page.locator('link[rel="canonical"]'))
    .toHaveAttribute("href", `https://guseoh.github.io${canonical}`);
  await expect(page.locator(".comments-wrap")).toHaveAttribute("data-comment-key", canonical);
  await expect(page.locator(".post__header h1")).toHaveCount(1);
});

test("공개 글 목록은 페이지 크기와 페이지 경계를 보존한다", async ({ page, request }) => {
  const response = await request.get("/search-index.json");
  const posts = await response.json() as Array<{ slug: string }>;
  await page.goto("/blog/");
  const cards = page.locator("#blog-post-list [data-post-slug]");
  const firstPageSize = Math.min(posts.length, 12);
  await expect(cards).toHaveCount(firstPageSize);
  expect(await cards.evaluateAll((items) => items.map((item) => item.getAttribute("data-post-slug"))))
    .toEqual(posts.slice(0, firstPageSize).map((post) => post.slug));

  const pageCount = Math.max(1, Math.ceil(posts.length / 12));
  const pagination = page.getByRole("navigation", { name: "페이지 번호 이동" });
  if (pageCount === 1) {
    await expect(pagination).toHaveCount(0);
  } else {
    await expect(pagination.locator(".pagination__item:not(.pagination__item--arrow)")).toHaveCount(pageCount);
    await expect(pagination.getByRole("link", { name: "2", exact: true }))
      .toHaveAttribute("href", "/blog/page/2/");
    await pagination.getByRole("link", { name: "2", exact: true }).click();
    await expect(page).toHaveURL(/\/blog\/page\/2\/$/);
    const page2 = page.locator("#blog-post-list-2 [data-post-slug]");
    expect(await page2.evaluateAll((items) => items.map((item) => item.getAttribute("data-post-slug"))))
      .toEqual(posts.slice(12, 24).map((post) => post.slug));
  }
});
