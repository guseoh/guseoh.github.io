import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const representativeRoutes = [
  "/",
  "/blog/",
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

test("테마 전환에 Planner 모드가 포함된다", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("theme", "system"));
  await page.reload();

  const root = page.locator("html");
  const toggle = page.locator("#theme-toggle");

  await expect(root).toHaveAttribute("data-theme-mode", "system");
  await toggle.click();
  await expect(root).toHaveAttribute("data-theme-mode", "light");
  await toggle.click();
  await expect(root).toHaveAttribute("data-theme-mode", "dark");
  await toggle.click();
  await expect(root).toHaveAttribute("data-theme-mode", "planner");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(toggle.locator(".theme-toggle__label")).toHaveText("Planner");
  await toggle.click();
  await expect(root).toHaveAttribute("data-theme-mode", "system");
});

test("데스크톱 사이드바는 축소 후 hover로 임시 확장하고 고정할 수 있다", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));
  await page.goto("/blog/");

  const shell = page.locator(".site-shell");
  const rail = page.locator("#sidebar-rail");

  await page.locator("#sidebar-collapse-toggle").click();
  await expect(shell).toHaveClass(/sidebar-collapsed/);
  await expect(rail).toBeVisible();

  await rail.hover();
  await expect(shell).toHaveClass(/sidebar-hover-expanded/);
  await page.locator("#sidebar-pin-toggle").click();
  await expect(shell).not.toHaveClass(/sidebar-collapsed/);
});

test("모바일 상단 메뉴를 열고 닫을 수 있다", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await page.goto("/");

  const toggle = page.locator("#header-menu-toggle");
  const navigation = page.locator("#top-nav");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(navigation).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(navigation).not.toHaveClass(/is-open/);
});
