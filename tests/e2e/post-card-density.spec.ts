import { expect, test } from "@playwright/test";

test("게시글 카드가 공통 컴팩트 규격으로 렌더링된다", async ({ page }) => {
  for (const width of [375, 768, 1280, 1800]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/blog/");
    const card = page.locator("#blog-post-list .post-card").first();
    await expect(card).toBeVisible();

    const layout = await card.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        paddingTop: parseFloat(style.paddingTop),
        left: rect.left,
        right: rect.right,
        viewport: window.innerWidth
      };
    });

    expect(layout.paddingTop).toBeGreaterThan(0);
    expect(layout.paddingTop).toBeLessThan(15);
    expect(layout.left).toBeGreaterThanOrEqual(0);
    expect(layout.right).toBeLessThanOrEqual(layout.viewport + 2);
  }
});

test("그리드와 리스트 전환 상태는 카드 디자인 조정 후에도 유지된다", async ({ page }) => {
  await page.goto("/blog/");

  const list = page.locator("#blog-post-list");
  const switcher = page.locator('[data-view-list-id="blog-post-list"]');
  await switcher.getByRole("button", { name: "목록 보기" }).click();
  await expect(list).toHaveAttribute("data-view", "list");
  await expect(switcher.getByRole("button", { name: "목록 보기" })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(list).toHaveAttribute("data-view", "list");
  await switcher.getByRole("button", { name: "그리드 보기" }).click();
  await expect(list).toHaveAttribute("data-view", "grid");
});

test("검색 결과에도 동일한 카드 밀도가 적용된다", async ({ page }) => {
  await page.goto("/search/?q=Spring");
  const card = page.locator("[data-search-list] .post-card").first();
  await expect(card).toBeVisible();
  const padding = await card.evaluate((element) => parseFloat(getComputedStyle(element).paddingTop));
  expect(padding).toBeGreaterThan(0);
  expect(padding).toBeLessThan(15);
});


test("게시글 카드에서 현재 카테고리와 같은 태그를 중복 노출하지 않는다", async ({ page }) => {
  await page.goto("/blog/");
  const card = page.locator('#blog-post-list [data-post-slug="jpa/persistence-context"]');
  await expect(card).toBeVisible();
  await expect(card.locator(".badge--category")).toContainText("JPA");
  await expect(card.locator(".badge--tag").filter({ hasText: /^#?JPA$/i })).toHaveCount(0);
});
