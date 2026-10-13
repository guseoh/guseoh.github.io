import { expect, test } from "@playwright/test";

for (const width of [375, 768, 980, 1280]) {
  test(`검색 필터는 ${width}px에서 겹치거나 페이지 가로 스크롤을 만들지 않는다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/search/");

    const form = page.locator(".search-page-form");
    const controls = form.locator("input, select, button, a.search-reset-link");
    await expect(controls).toHaveCount(5);

    const rectangles = await controls.evaluateAll((elements) =>
      elements.map((element) => {
        const { left, right, top, bottom } = element.getBoundingClientRect();
        return { left, right, top, bottom };
      })
    );

    for (let index = 0; index < rectangles.length; index += 1) {
      const current = rectangles[index];
      expect(current.left).toBeGreaterThanOrEqual(-1);
      expect(current.right).toBeLessThanOrEqual(width + 1);

      for (const other of rectangles.slice(index + 1)) {
        const overlapping = current.left < other.right - 1
          && current.right > other.left + 1
          && current.top < other.bottom - 1
          && current.bottom > other.top + 1;
        expect(overlapping).toBe(false);
      }
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);

    await page.getByRole("searchbox", { name: "검색어", exact: true }).fill("Spring");
    await expect(page.locator("[data-search-meta]")).toContainText("결과");
    await expect(page.locator("[data-search-list] .post-card").first()).toBeVisible();
  });
}

for (const width of [375, 768]) {
  for (const [path, label] of [
    ["/categories/spring-security/", "카테고리 선택"],
    ["/tags/spring-security/", "태그 선택"]
  ] as const) {
    test(`${width}px ${label}: 현재 필터가 보이고 키보드로 접근 가능하다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);

      const nav = page.getByRole("navigation", { name: label });
      const active = nav.locator('a[aria-current="page"]');
      await expect(active).toHaveCount(1);
      await expect(active).toHaveClass(/is-active/);

      const bounds = await active.evaluate((element) => {
        const item = element.getBoundingClientRect();
        const container = element.parentElement?.getBoundingClientRect();
        return container ? {
          itemLeft: item.left,
          itemRight: item.right,
          containerLeft: container.left,
          containerRight: container.right
        } : null;
      });
      expect(bounds).not.toBeNull();
      expect(bounds!.itemLeft).toBeGreaterThanOrEqual(bounds!.containerLeft - 2);
      expect(bounds!.itemRight).toBeLessThanOrEqual(bounds!.containerRight + 2);

      await active.focus();
      await expect(active).toBeFocused();
    });
  }
}

test("카테고리의 일반 태그는 존재하지 않는 태그 URL 대신 검색 결과로 연결된다", async ({ page }) => {
  await page.goto("/categories/");

  const jpaGroup = page.locator(".category-menu--page .category-menu__group").filter({
    has: page.locator('.category-menu__parent-link[href="/categories/jpa/"]')
  });
  await expect(jpaGroup).toHaveCount(1);

  const toggle = jpaGroup.locator("[data-category-toggle]");
  if (await toggle.getAttribute("aria-expanded") === "false") {
    await toggle.click();
  }

  const hibernate = jpaGroup.getByRole("link", { name: /Hibernate/ });
  await expect(hibernate).toHaveAttribute("href", "/search/?tag=Hibernate");
  await hibernate.click();

  await expect(page).toHaveURL(/\/search\/\?tag=Hibernate$/);
  await expect(page.locator("[data-search-meta]")).toContainText("결과");
  await expect(page.locator("[data-search-list] .post-card").first()).toBeVisible();
});
