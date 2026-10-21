import { expect, test } from "@playwright/test";

test("홈 최근 발행 글과 최근 수정 글은 중복되지 않고 발행일 순서로 정렬된다", async ({ page }) => {
  await page.goto("/");
  const latest = page.locator("#home-latest-post-list .post-card");
  const latestSlugs = await latest.evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.postSlug));
  expect(latestSlugs.length).toBeGreaterThan(0);
  expect(new Set(latestSlugs).size).toBe(latestSlugs.length);
  const dates = await latest.locator(".post-card__meta time").evaluateAll((items) =>
    items.map((item) => new Date((item as HTMLTimeElement).dateTime).valueOf())
  );
  for (let i = 1; i < dates.length; i++) expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
  const updatedSlugs = await page.locator(".home-updated-list .post-card").evaluateAll((items) =>
    items.map((item) => (item as HTMLElement).dataset.postSlug)
  );
  for (const slug of updatedSlugs) expect(latestSlugs).not.toContain(slug);
  expect(new Set(updatedSlugs).size).toBe(updatedSlugs.length);
  await expect(page.locator(".home-updated-posts")).toHaveCount(updatedSlugs.length > 0 ? 1 : 0);
});

test("빈 카테고리와 태그 탐색에는 0건 배지를 노출하지 않고 대체 경로를 제공한다", async ({ page }) => {
  await page.goto("/categories/daily/");
  await expect(page.locator(".archive-empty")).toContainText("아직 등록된 게시글이 없습니다.");
  await expect(page.locator(".archive-empty a")).toHaveAttribute("href", "/categories/");
  await expect(page.locator(".archive-filter-pill strong").filter({ hasText: /^0$/ })).toHaveCount(0);

  await page.goto("/tags/architecture/");
  await expect(page.locator(".archive-empty")).toContainText("아직 등록된 게시글이 없습니다.");
  await expect(page.locator(".archive-empty a")).toHaveAttribute("href", "/tags/");
  await expect(page.locator(".archive-filter-pill strong").filter({ hasText: /^0$/ })).toHaveCount(0);
});

test("Spring Security 카테고리에서 명시된 순서와 첫 글을 안내한다", async ({ page }) => {
  await page.goto("/categories/spring-security/");
  const reading = page.getByRole("region", { name: "이 주제 처음부터 읽기" });
  await expect(reading).toBeVisible();
  const links = reading.locator("ol a");
  await expect(links).toHaveCount(3);
  const urls = await links.evaluateAll((items) => items.map((item) => item.getAttribute("href")));
  expect(urls).toEqual(["/blog/security/basic1/", "/blog/security/basic2/", "/blog/security/basic3/"]);
  const first = reading.getByRole("link", { name: "첫 글부터 읽기" });
  await expect(first).toHaveAttribute("href", urls[0]!);
  await first.click();
  await expect(page).toHaveURL(/\/blog\/security\/basic1\/$/);
  // 첫 글 이동과 정상 콘텐츠 렌더링을 확인합니다.
  // 상세 화면 Learning Path는 별개 기능으로 이 테스트의 전제가 아닙니다.
  await expect(page.locator(".post__header h1")).toHaveText("인증과 인가는 무엇일까?");
  await expect(page.locator(".post__content")).toBeVisible();
});

test("JPA에 chapter 번호가 중복되면 읽기 순서를 임의 생성하지 않는다", async ({ page }) => {
  await page.goto("/categories/jpa/");
  await expect(page.locator(".post-card")).toHaveCount(2);
  await expect(page.locator(".category-reading-path")).toHaveCount(0);
});

test("404에서는 공개 Book·Series만 노출하고 다른 탐색 경로를 유지한다", async ({ page }) => {
  await page.goto("/books/");
  const hasBooks = await page.locator(".book-grid .book-card").count() > 0;
  await page.goto("/series/");
  const hasSeries = await page.locator(".library-series-grid .library-series-card").count() > 0;
  await page.goto("/404.html");
  const actions = page.locator(".about-actions");
  await expect(actions.getByRole("link", { name: "홈" })).toBeVisible();
  await expect(actions.getByRole("link", { name: "카테고리" })).toBeVisible();
  await expect(actions.getByRole("link", { name: "검색" })).toBeVisible();
  await expect(actions.locator('a[href="/books/"]')).toHaveCount(hasBooks ? 1 : 0);
  await expect(actions.locator('a[href="/series/"]')).toHaveCount(hasSeries ? 1 : 0);
});

test("읽기 경로가 모바일·데스크톱, 라이트·다크 모드에서 넘치지 않는다", async ({ page }) => {
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["light", "dark"]) {
      await page.goto("/categories/spring-security/");
      await page.evaluate((value) => localStorage.setItem("theme", value), mode);
      await page.reload();
      const reading = page.locator(".category-reading-path");
      await expect(reading).toBeVisible();
      const bounds = await reading.evaluate((element) => {
        const { left, right } = element.getBoundingClientRect();
        return { left, right, width: window.innerWidth, doc: document.documentElement.scrollWidth };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(-2);
      expect(bounds.right).toBeLessThanOrEqual(bounds.width + 2);
      expect(bounds.doc).toBeLessThanOrEqual(bounds.width + 2);
      await expect(reading.getByRole("link", { name: "첫 글부터 읽기" })).toBeVisible();
    }
  }
});


test("홈 대표 글과 최근 발행 글은 중복되지 않고 활동 그래프는 필요할 때 펼친다", async ({ page }) => {
  await page.goto("/");
  const featured = page.locator(".home-featured-card");
  await expect(featured.first()).toBeVisible();
  const urls = await featured.evaluateAll((items) => items.map((item) => item.getAttribute("href")));
  expect(new Set(urls).size).toBe(urls.length);
  const latestUrls = await page.locator("#home-latest-post-list .post-card__header a")
    .evaluateAll((items) => items.map((item) => item.getAttribute("href")));
  for (const url of urls) expect(latestUrls).not.toContain(url);
  const details = page.locator(".activity-section__details");
  await expect(details).not.toHaveAttribute("open", "");
  await details.locator("summary").click();
  await expect(details).toHaveAttribute("open", "");
  await expect(details.locator(".activity-panel")).toHaveCount(2);
});


test("홈의 RSS 구독 진입점은 공개 피드와 연결된다", async ({ page, request }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "새 글 RSS 구독" });
  await expect(link).toHaveAttribute("href", "/rss.xml");
  const response = await request.get("/rss.xml");
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("<rss");
});
