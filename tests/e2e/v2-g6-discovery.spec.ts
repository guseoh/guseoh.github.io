import { expect, test } from "@playwright/test";
import { getSearchTargetUrl } from "../../src/utils/search";
import { buildPublicationArchive } from "../../src/utils/publicationArchive";

test("검색 이동 URL은 소제목 id를 사용하고 본문/코드는 find 매개변수로 이동하며 순위는 변경하지 않는다", () => {
  const base = {
    title: "보안", description: "설명", tags: [], category: "Security", series: "", date: "2026-01-01",
    slug: "security/basic1", url: "/blog/security/basic1/", readingTime: "1분",
    bodyText: "비영속 상태는", codeText: "Object println"
  };
  expect(getSearchTargetUrl({ ...base, headings: [{ id: "custom-heading", text: "세션 기반 인증" }] }, "세션"))
    .toBe("/blog/security/basic1/#custom-heading");
  expect(getSearchTargetUrl(base, "비영속")).toBe("/blog/security/basic1/?find=%EB%B9%84%EC%98%81%EC%86%8D");
  expect(getSearchTargetUrl(base, "없는단어")).toBe("/blog/security/basic1/");
});

test("서울 시간 발행 아카이브는 월 경계/미래/초안을 안전하게 처리한다", () => {
  const post = (id: string, date: string, draft = false) => ({
    id, data: { slug: "test/" + id, date: new Date(date), draft }
  }) as any;
  const result = buildPublicationArchive([
    post("mar", "2026-02-28T15:30:00Z"),
    post("feb", "2026-02-28T14:30:00Z"),
    post("future", "2028-01-01T00:00:00Z"),
    post("draft", "2026-02-20T00:00:00Z", true)
  ], new Date("2026-03-02T03:00:00Z"));
  expect(result.map((v) => v.year)).toEqual(["2026"]);
  expect(result[0]?.months.map((v) => v.key)).toEqual(["2026-03", "2026-02"]);
  expect(result[0]?.months.map((v) => v.posts.length)).toEqual([1, 1]);
});

test("실제 검색 결과는 Astro가 렌더링한 소제목 앵커로 이동한다", async ({ page, request }) => {
  const response = await request.get("/search-index.json");
  const index = await response.json();
  const jpa = index.find((item: any) => item.url === "/blog/jpa/persistence-context/");
  expect(jpa?.headings?.some((item: any) => item.id && item.text)).toBe(true);
  const heading = jpa.headings.find((item: any) => item.text.includes("영속성 컨텍스트가"));
  expect(heading?.id).toBeTruthy();
  await page.goto("/search/?q=" + encodeURIComponent("영속성 컨텍스트가"));
  const link = page.locator('[data-post-slug="jpa/persistence-context"] .post-card__header a');
  await expect(link).toHaveAttribute("href", "/blog/jpa/persistence-context/#" + encodeURIComponent(heading.id));
  await link.click();
  await expect(page.locator(`[id="${heading.id}"]`)).toBeVisible();
});

test("본문 검색 링크는 정확한 표현이 있는 문단을 찾아 강조한다", async ({ page }) => {
  await page.goto("/search/?q=" + encodeURIComponent("비영속"));
  const link = page.locator('[data-post-slug="jpa/persistence-context"] .post-card__header a');
  await expect(link).toHaveAttribute("href", /find=/);
  await link.click();
  await expect(page.locator(".post-search-hit")).toContainText("비영속");
});

test("Breadcrumb는 구조화 데이터 순서와 경로가 같다", async ({ page }) => {
  await page.goto("/blog/security/basic1/");
  const nav = page.getByRole("navigation", { name: "현재 위치" });
  const crumbs = nav.locator("li");
  await expect(crumbs).toHaveCount(3);
  await expect(crumbs.nth(0).getByRole("link")).toHaveAttribute("href", "/");
  await expect(crumbs.nth(1).getByRole("link")).toHaveAttribute("href", "/categories/spring-security/");
  await expect(crumbs.nth(2)).toHaveAttribute("aria-current", "page");
  const data = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(data.join(" ")).toContain("BreadcrumbList");
});

test("발행 월 아카이브와 홈 학습 큐레이션은 실제 공개 글만 사용한다", async ({ page, request }) => {
  const index = await (await request.get("/search-index.json")).json();
  await page.goto("/blog/archive/");
  const archive = page.locator(".archive-entry");
  await expect(archive.first()).toBeVisible();
  expect(await page.locator(".archive-entry li a").count()).toBe(index.length);
  await expect(page.locator('a[href="/blog/infra/pawcycle/single-ec2-production/"]')).toHaveCount(0);
  await page.goto("/");
  const curated = page.locator(".home-learning-paths");
  await expect(curated).toBeVisible();
  await expect(curated.getByRole("link", { name: "Spring Security" })).toHaveAttribute("href", "/categories/spring-security/");
  await expect(curated).toContainText("3개 글");
  const all = await curated.locator("a[href^='/blog/']").evaluateAll((els) =>
    els.map((x) => x.getAttribute("href"))
  );
  const featured = await page.locator(".home-featured-card").evaluateAll((els) =>
    els.map((x) => x.getAttribute("href"))
  );
  for (const href of all) expect(featured).not.toContain(href);
});

test("새 탐색 영역은 모바일과 3개 테마에서 가로 넘침이 없다", async ({ page }) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark", "planner"]) {
      await page.goto("/blog/archive/");
      await page.evaluate((value) => localStorage.setItem("theme", value), theme);
      await page.reload();
      expect(await page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(width + 2);
      await page.goto("/blog/security/basic1/");
      expect(await page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(width + 2);
    }
  }
});

