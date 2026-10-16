import { expect, test } from "@playwright/test";

test("대표 글 카드와 개념도는 화면 크기와 세 테마에서 넘치지 않는다", async ({ page }) => {
  for (const mode of ["light", "dark", "planner"]) {
    await page.goto("/");
    await page.evaluate((value) => localStorage.setItem("theme", value), mode);
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.locator(".home-featured-card")).toHaveCount(2);
      const homeWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(homeWidth, `home ${mode} / ${width}`).toBeLessThanOrEqual(width + 2);
      await page.goto("/blog/jpa/relationship-mapping/");
      await expect(page.locator(".post__content .code-block--diagram")).toHaveCount(7);
      const articleWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(articleWidth, `article ${mode} / ${width}`).toBeLessThanOrEqual(width + 2);
    }
  }
});
