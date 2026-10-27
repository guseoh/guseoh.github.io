import { expect, test } from "@playwright/test";

test("홈은 최신 글을 활동 통계보다 먼저 보여준다", async ({ page }) => {
  await page.goto("/");
  const latest = page.locator("#home-latest-posts");
  const activity = page.locator(".activity-section");

  await expect(latest).toBeVisible();
  await expect(activity).toBeVisible();
  await expect(latest.locator(".post-card").first()).toBeVisible();

  const comesFirst = await latest.evaluate((element) => {
    const activitySection = document.querySelector(".activity-section");
    return activitySection !== null &&
      Boolean(element.compareDocumentPosition(activitySection) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(comesFirst).toBe(true);

  const cta = page.getByRole("link", { name: "최근 글 읽기" });
  await expect(cta).toHaveAttribute("href", "#home-latest-posts");
  await cta.click();
  await expect(page).toHaveURL(/#home-latest-posts$/);
});

test("콘텐츠가 없는 Books·Series는 메뉴에서 제외하되 페이지는 유지한다", async ({ page }) => {
  await page.goto("/books/");
  const hasBooks = await page.locator(".book-grid .book-card").count() > 0;
  await expect(page.locator("#top-nav a[href='/books/']")).toHaveCount(hasBooks ? 1 : 0);
  await expect(page.locator("main h1")).toHaveText("Books");

  await page.goto("/series/");
  const hasSeries = await page.locator(".library-series-grid .library-series-card").count() > 0;
  await expect(page.locator("#top-nav a[href='/series/']")).toHaveCount(hasSeries ? 1 : 0);
  await expect(page.locator("main h1")).toHaveText("학습 경로");

  await expect(page.locator("#top-nav a[href='/blog/']")).toHaveCount(1);
  await expect(page.locator("#top-nav a[href='/search/']")).toHaveCount(1);
});

test("사이드바에는 글이 있는 주제만 표시하고 카테고리 목록은 유지한다", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));

  await page.goto("/blog/");
  await page.evaluate(() => localStorage.setItem("blog-left-sidebar-collapsed", "true"));
  await page.reload();

  await page.locator("#sidebar-open").click();
  const sidebar = page.locator("#site-sidebar");
  await expect(sidebar).toBeVisible();

  const groups = sidebar.locator(".category-menu__group");
  expect(await groups.count()).toBeGreaterThan(0);

  for (const count of await sidebar.locator(".category-menu__count, .category-menu__child strong").allTextContents()) {
    expect(count).not.toContain("(0)");
  }

  await expect(sidebar.getByRole("link", { name: /전체 글/ })).toBeVisible();
  await page.locator("#sidebar-collapse-toggle").click();
  await page.goto("/categories/");
  await expect(page.locator("main h1")).toHaveText("카테고리");
  await expect(page.locator(".category-menu--page .category-menu__group").first()).toBeVisible();
});
