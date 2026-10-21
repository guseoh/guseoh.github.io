import { expect, test } from "@playwright/test";

test("모바일 사이드바를 빠르게 닫고 다시 열어도 배경막이 유지된다", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/blog/");
  const open = page.locator("#sidebar-open");
  const close = page.locator("#sidebar-close");
  const backdrop = page.locator("#sidebar-backdrop");
  await expect(open).toBeVisible();
  await open.click();
  await expect(backdrop).toBeVisible();
  await close.click();
  await open.click();
  await page.waitForTimeout(340);
  await expect(backdrop).toBeVisible();
  await expect(backdrop).toHaveClass(/is-visible/);
  await expect(page.locator("body")).toHaveClass(/has-sidebar-open/);
  await page.keyboard.press("Escape");
  await expect(backdrop).toBeHidden();
  await expect(open).toBeFocused();
});

test("검색에 삽입한 탐색 JSON을 브라우저가 파싱하고 기존 검색을 표시한다", async ({ page }) => {
  await page.goto("/search/");
  const json = await page.locator("#search-navigation-groups").textContent();
  expect(json).toBeTruthy();
  expect(() => JSON.parse(json!)).not.toThrow();
  expect(Array.isArray(JSON.parse(json!))).toBe(true);
  await expect(page.getByRole("searchbox", { name: "검색어", exact: true })).toBeVisible();
});

test("읽기 진행률은 스크롤에 반응하고 맨 위로 버튼은 키보드로 작동한다", async ({ page }) => {
  await page.goto("/blog/security/basic2/");
  const bar = page.locator("[data-reading-progress-bar]");
  const initial = await bar.evaluate((node) => getComputedStyle(node).transform);
  await page.evaluate(() => window.scrollTo(0, Math.round(document.body.scrollHeight * 0.6)));
  await expect.poll(() => bar.evaluate((node) => getComputedStyle(node).transform)).not.toBe(initial);
  const button = page.locator("[data-post-back-to-top]");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
});
