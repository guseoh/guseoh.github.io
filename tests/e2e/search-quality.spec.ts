import { expect, test } from "@playwright/test";

test("검색 색인은 본문과 코드만 별도로 담고 중복된 전체 searchText를 포함하지 않는다", async ({ request }) => {
  const response = await request.get("/search-index.json");
  expect(response.ok()).toBe(true);
  const posts = await response.json() as Array<{
    url: string;
    bodyText: string;
    codeText: string;
    searchText?: string;
  }>;

  expect(posts.length).toBeGreaterThan(0);
  for (const post of posts) {
    expect(typeof post.bodyText).toBe("string");
    expect(typeof post.codeText).toBe("string");
    expect(post).not.toHaveProperty("searchText");
  }

  const mapping = posts.find((post) => post.url === "/blog/jpa/relationship-mapping/");
  expect(mapping?.codeText).toContain("@ManyToOne");
  expect(mapping?.codeText).toContain("public class Order");
  const flyway = posts.find((post) => post.url === "/blog/db/flyway/flyway/");
  expect(flyway?.codeText).toContain("V2_1__create_member_email_index.sql");
  expect(flyway?.bodyText).not.toContain("V2_1__create_member_email_index.sql");
});

test("본문 일치는 해당 문맥을 보여주며 원문 검색어를 강조한다", async ({ page }) => {
  await page.goto("/search/?q=비영속");
  const jpa = page.locator('[data-search-list] [data-post-slug="jpa/persistence-context"]');
  await expect(jpa).toBeVisible();
  const snippet = jpa.locator('[data-search-snippet-source="body"]');
  await expect(snippet).toContainText("비영속");
  await expect(snippet.locator("mark")).toContainText("비영속");
  await expect(jpa.getByRole("list", { name: "검색 일치 이유" })).toContainText("본문에서 일치");
});

test("SQL 마이그레이션 파일명처럼 코드에만 있는 키워드를 검색하고 코드 문맥을 표시한다", async ({ page }) => {
  await page.goto("/search/?q=V2_1__create_member_email_index.sql");
  await expect(page.locator("[data-search-meta]")).toContainText("1개 결과");
  const card = page.locator('[data-search-list] [data-post-slug="db/flyway/flyway"]');
  await expect(card).toBeVisible();
  const snippet = card.locator('[data-search-snippet-source="code"]');
  await expect(snippet).toContainText("V2_1__create_member_email_index.sql");
  await expect(snippet.locator("mark")).toContainText("V2_1__create_member_email_index.sql");
  await expect(card.getByRole("list", { name: "검색 일치 이유" })).toContainText("코드에서 일치");
});

test("코드에서 검색해도 필터와 URL 상태가 유지되고 테마별 레이아웃이 안정적이다", async ({ page }) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["light", "dark", "planner"]) {
      await page.goto("/search/?q=V2_1__create_member_email_index.sql&category=DB");
      await page.evaluate((value) => localStorage.setItem("theme", value), mode);
      await page.reload();
      await expect(page.locator("#search-category-filter")).toHaveValue("DB");
      const snippet = page.locator('[data-search-list] [data-search-snippet-source="code"]');
      await expect(snippet).toBeVisible();
      expect(await snippet.locator("mark").count()).toBeGreaterThan(0);
      await expect(page).toHaveURL(/category=DB/);
      const bounds = await snippet.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(-2);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 2);
    }
  }
});

test("메타정보만 일치하는 경우에도 설명을 유지하며 HTML을 주입하지 않는다", async ({ page }) => {
  await page.goto("/search/?q=Association%20Mapping");
  const mapping = page.locator('[data-search-list] [data-post-slug="jpa/relationship-mapping"]');
  await expect(mapping).toBeVisible();
  await expect(mapping.locator('[data-search-snippet-source="description"]')).toBeVisible();

  const input = page.getByRole("searchbox", { name: "검색어", exact: true });
  await input.fill('<img src=x onerror="alert(1)">');
  await expect(page.locator("[data-search-meta]")).toContainText("0개 결과");
  await expect(page.locator('[data-search-list] img')).toHaveCount(0);
});
test("인라인 코드 검색 결과에 주변 문맥을 표시한다", async ({ page }) => {
  await page.goto("/search/?q=detach%28%29");
  const card = page.locator('[data-search-list] [data-post-slug="jpa/persistence-context"]');
  await expect(card).toBeVisible();

  const snippet = card.locator('[data-search-snippet-source="body"]');
  await expect(snippet).toContainText("특정 엔티티만 분리");
  const highlightedText = await snippet.locator("mark").allTextContents();
  expect(highlightedText).toContain("detach()");
});


test("검색 색인 로드 실패는 결과 없음 상태와 구분해 안내한다", async ({ page }) => {
  await page.route("**/search-index.json", (route) => route.abort());
  await page.goto("/search/?q=Spring");
  await expect(page.locator("[data-search-meta]")).toContainText("검색 데이터를 불러오지 못했습니다");
  await expect(page.locator("[data-search-empty]")).toBeHidden();
  await expect(page.locator("#search-status")).toContainText("검색 결과를 표시할 수 없습니다");
  await expect(page.locator("[data-search-form]")).toHaveAttribute("aria-busy", "false");
});


test("검색 결과에서 현재 카테고리와 같은 태그를 중복 노출하지 않는다", async ({ page }) => {
  await page.goto("/search/?q=JPA");
  const card = page.locator('[data-search-list] [data-post-slug="jpa/persistence-context"]');
  await expect(card).toBeVisible();
  await expect(card.locator(".badge--category")).toContainText("JPA");
  await expect(card.locator(".badge--tag").filter({ hasText: /^#?JPA$/i })).toHaveCount(0);
});


test("검색 로딩 상태와 실제 공개 주제 예시를 알려준다", async ({ page }) => {
  await page.route("**/search-index.json", async (route) => {
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({ response });
  });
  await page.goto("/search/");
  const form = page.locator("[data-search-form]");
  const input = page.getByRole("searchbox", { name: "검색어", exact: true });
  await expect(input).toHaveAttribute("placeholder", "예: JPA, Spring Security, Flyway");
  await expect(page.locator("#search-status")).toHaveText("검색 데이터를 불러오는 중입니다.");
  await expect(form).toHaveAttribute("aria-busy", "true");
  await expect(page.locator("[data-search-meta]")).toBeHidden();
  await expect(form).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("[data-search-meta]")).toBeVisible();
});

test("검색 결과가 없으면 구체적인 안내와 탐색 경로를 보여준다", async ({ page }) => {
  await page.goto("/search/");
  await page.getByRole("searchbox", { name: "검색어", exact: true }).fill("no-results-token-xyz");
  const empty = page.locator("[data-search-empty]");
  await expect(page.locator("[data-search-meta]")).toContainText("0개 결과");
  await expect(empty).toBeVisible();
  await expect(empty.locator(".search-empty__title")).toHaveText("조건에 맞는 글이 없습니다.");
  await expect(empty.getByRole("link", { name: "조건 초기화" })).toHaveAttribute("href", "/search/");
  await expect(empty.getByRole("link", { name: "카테고리별 탐색" })).toHaveAttribute("href", "/categories/");
  await expect(empty.getByRole("link", { name: "태그별 탐색" })).toHaveAttribute("href", "/tags/");
});
