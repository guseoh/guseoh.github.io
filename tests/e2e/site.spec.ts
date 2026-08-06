import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const representativeRoutes = [
  "/",
  "/blog/",
  "/projects/",
  "/projects/devpedia/",
  "/search/",
  "/categories/",
  "/tags/",
  "/about/",
  "/blog/security/basic1/"
];

for (const route of representativeRoutes) {
  test(`${route} 기본 구조와 치명적 접근성 오류가 없다`, async ({ page }) => {
    await page.goto(route);

    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const criticalViolations = accessibility.violations.filter((violation) => violation.impact === "critical");

    expect(criticalViolations).toEqual([]);
  });
}

test("검색어와 필터가 결과에 반영된다", async ({ page }) => {
  await page.goto("/search/");
  await page.getByLabel("검색어").fill("Spring");
  await expect(page.locator("[data-search-meta]")).toContainText("결과");
  await expect(page.locator("[data-search-list] .post-card").first()).toBeVisible();
});

test("테마 전환 상태가 문서에 반영된다", async ({ page }) => {
  await page.goto("/");
  const root = page.locator("html");
  const before = await root.getAttribute("data-theme-mode");

  await page.locator("#theme-toggle").click();
  await expect(root).not.toHaveAttribute("data-theme-mode", before ?? "system");
});

test("모바일 상단 메뉴를 열고 닫을 수 있다", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await page.goto("/");

  const toggle = page.locator("[data-mobile-menu-toggle]");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("[data-top-nav]")).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});
