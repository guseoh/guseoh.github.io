import { expect, test } from "@playwright/test";

// Inspect the CSS actually loaded by the browser, not just the source imports.
// This prevents a route-specific Vite stylesheet from leaking into global CSS.
async function hasLibraryStyles(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(() => {
    for (const stylesheet of Array.from(document.styleSheets)) {
      try {
        if (Array.from(stylesheet.cssRules).some((rule) => rule.cssText.includes(".library-page"))) {
          return true;
        }
      } catch {
        // Cross-origin stylesheets are not readable; they are not blog CSS.
      }
    }
    return false;
  });
}

test("Book·Series CSS는 해당 화면에만 로드된다", async ({ page }) => {
  for (const route of ["/", "/blog/", "/search/"]) {
    await page.goto(route);
    expect(await hasLibraryStyles(page), route).toBe(false);
  }
  for (const route of ["/books/", "/series/"]) {
    await page.goto(route);
    await expect(page.locator(".library-page")).toBeVisible();
    expect(await hasLibraryStyles(page), route).toBe(true);
  }
});

test("Book·Series 화면은 모바일과 다크 모드에서도 너비를 유지한다", async ({ page }) => {
  for (const route of ["/books/", "/series/"]) {
    await page.setViewportSize({ width: 375, height: 820 });
    await page.goto(route);
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator(".library-page")).toBeVisible();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, route).toBeLessThanOrEqual(377);
  }
});
