import { expect, test } from "@playwright/test";

test("홈의 최근 글 강조와 주요 CTA가 정상적으로 보인다", async ({ page }) => {
  await page.goto("/");
  const latest = page.locator("#home-latest-post-list .post-card");
  await expect(latest.first()).toHaveClass(/post-card--featured/);
  await expect(latest.first().locator(".post-card__eyebrow")).toHaveText("최근 발행");
  await expect(latest.nth(1)).not.toHaveClass(/post-card--featured/);

  const cta = page.getByRole("link", { name: "최근 글 읽기" });
  await expect(cta).toHaveAttribute("href", "#home-latest-posts");
  const bg = await cta.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(bg).not.toBe("rgba(0, 0, 0, 0)");
});

test("넓은 화면에서는 게시글 카드가 읽기 편한 3열로 정렬된다", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ["/", "/blog/"]) {
    await page.goto(route);
    const grid = route === "/" ? page.locator("#home-latest-post-list") : page.locator("#blog-post-list");
    const toggle = route === "/"
      ? page.locator('[data-view-list-id="home-latest-post-list"]')
      : page.locator('[data-view-list-id="blog-post-list"]');
    await toggle.getByRole("button", { name: "Grid view" }).click();
    await expect(grid).toHaveAttribute("data-view", "grid");
    const widths = await grid.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length);
    expect(widths).toBe(3);
  }
});

test("데스크톱 목록 보기는 제목과 메타 정보의 두 영역으로 구성된다", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/blog/");
  await page.locator('[data-view-list-id="blog-post-list"]').getByRole("button", { name: "List view" }).click();
  const list = page.locator("#blog-post-list");
  await expect(list).toHaveAttribute("data-view", "list");
  const card = list.locator(".post-card").first();
  const state = await card.evaluate((element) => {
    const header = element.querySelector(".post-card__header")?.getBoundingClientRect();
    const footer = element.querySelector(".post-card__footer")?.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { display: style.display, columns: style.gridTemplateColumns.split(" ").length, headerRight: header?.right ?? 0, footerLeft: footer?.left ?? 0 };
  });
  expect(state.display).toBe("grid");
  expect(state.columns).toBe(2);
  expect(state.footerLeft).toBeGreaterThan(state.headerRight);
  await page.reload();
  await expect(list).toHaveAttribute("data-view", "list");
});

test("테마·좁은 화면에서 콘텐츠·검색·목차를 읽고 조작할 수 있다", async ({ page }) => {
  for (const width of [375, 768, 1280, 1800]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["light", "dark", "planner"]) {
      await page.goto("/blog/security/basic3/");
      await page.evaluate((value) => localStorage.setItem("theme", value), mode);
      await page.reload();
      await expect(page.locator(".post__content")).toBeVisible();
      const geometry = await page.locator(".post-column").boundingBox();
      expect(geometry).not.toBeNull();
      expect(geometry!.x).toBeGreaterThanOrEqual(-2);
      expect(geometry!.x + geometry!.width).toBeLessThanOrEqual(width + 2);
    }
  }
});

test("모바일 검색·목차 토글은 충분한 터치 크기를 갖는다", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/blog/security/basic3/");
  const toc = page.getByRole("button", { name: "이 글의 목차" });
  const tocBox = await toc.boundingBox();
  expect(tocBox).not.toBeNull();
  expect(tocBox!.height).toBeGreaterThanOrEqual(40);
  await toc.click();
  await expect(toc).toHaveAttribute("aria-expanded", "true");

  await page.goto("/search/");
  const input = page.getByRole("searchbox", { name: "검색어", exact: true });
  const inputBox = await input.boundingBox();
  expect(inputBox).not.toBeNull();
  expect(inputBox!.height).toBeGreaterThanOrEqual(40);
});

// Keep viewable screenshots in CI artifacts for manual before/after review.
// Screenshots complement geometry assertions; they do not alone prove visual quality.
test("대표 화면 스크린샷을 수집한다", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));
  const cases = [
    { route: "/", slug: "home", width: 1440, mode: "dark" },
    { route: "/blog/", slug: "posts", width: 1440, mode: "light" },
    { route: "/search/?q=JPA", slug: "search", width: 1440, mode: "dark" },
    { route: "/blog/security/basic3/", slug: "article", width: 1800, mode: "dark" },
    { route: "/blog/security/basic3/", slug: "article-mobile", width: 375, mode: "light" },
    { route: "/blog/security/basic3/", slug: "article-planner", width: 1440, mode: "planner" }
  ] as const;

  for (const item of cases) {
    await page.setViewportSize({ width: item.width, height: 900 });
    await page.goto(item.route);
    await page.evaluate((mode) => {
      localStorage.setItem("theme", mode);
      localStorage.setItem("blog-left-sidebar-collapsed", "false");
    }, item.mode);
    await page.reload();
    await expect(page.locator("main h1")).toBeVisible();
    await page.screenshot({ path: `test-results/ui-review/${item.slug}-${item.mode}-${item.width}.png`, fullPage: false, animations: "disabled" });
  }
});
