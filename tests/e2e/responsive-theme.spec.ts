import { expect, test } from "@playwright/test";

test("980px와 981px 경계에서 기본 글자 크기가 갑자기 바뀌지 않는다", async ({ page }) => {
  await page.goto("/blog/jpa/persistence-context/");

  const measurements: Record<number, number> = {};
  for (const width of [375, 768, 980, 981, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    measurements[width] = await page.evaluate(
      () => Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
    );

    // Desktop stays at or above 15px while mobile remains close to 16px.
    expect(measurements[width]).toBeGreaterThanOrEqual(14.95);
    expect(measurements[width]).toBeLessThanOrEqual(16.05);
  }

  expect(Math.abs(measurements[980] - measurements[981])).toBeLessThan(0.25);
  expect(measurements[375]).toBeGreaterThan(measurements[1920]);
  expect(measurements[1920]).toBeCloseTo(15, 1);
});

test("테마 메뉴에서 네 모드를 직접 선택하고 키보드·Planner 설정을 유지한다", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("theme", "system"));
  await page.reload();

  await page.evaluate(() => {
    document.body.dataset.themeEvents = "0";
    window.addEventListener("themechange", () => {
      document.body.dataset.themeEvents = String(Number(document.body.dataset.themeEvents) + 1);
    });
  });

  const root = page.locator("html");
  const toggle = page.locator("#theme-toggle");
  const menu = page.getByRole("menu", { name: "테마 선택" });

  for (const [index, mode, resolvedTheme, label] of [
    [1, "light", "light", "라이트"],
    [2, "dark", "dark", "다크"],
    [3, "planner", "dark", "플래너"],
    [4, "system", null, "시스템"]
  ] as const) {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await menu.getByRole("menuitemradio", { name: label, exact: true }).click();
    await expect(root).toHaveAttribute("data-theme-mode", mode);
    if (resolvedTheme) {
      await expect(root).toHaveAttribute("data-theme", resolvedTheme);
    } else {
      expect(["light", "dark"]).toContain(await root.getAttribute("data-theme"));
    }
    await expect(page.locator("body")).toHaveAttribute("data-theme-events", String(index));
    await expect(toggle.locator(".theme-toggle__label")).toHaveText(label);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }

  await toggle.click();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitemradio", { name: "라이트", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(root).toHaveAttribute("data-theme-mode", "dark");
  await expect(page.locator("body")).toHaveAttribute("data-theme-events", "5");

  await page.evaluate(() => localStorage.setItem("theme", "planner"));
  await page.reload();
  await expect(root).toHaveAttribute("data-theme-mode", "planner");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(toggle.locator(".theme-toggle__label")).toHaveText("플래너");
});

test("좁은 화면에서 메뉴와 본문 목차의 접기 동작이 유지된다", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/blog/jpa/persistence-context/");

  const headerToggle = page.locator("#header-menu-toggle");
  await headerToggle.click();
  await expect(headerToggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(headerToggle).toHaveAttribute("aria-expanded", "false");

  const tocToggle = page.getByRole("button", { name: "이 글의 목차" });
  await tocToggle.click();
  await expect(tocToggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(tocToggle).toHaveAttribute("aria-expanded", "false");
});
