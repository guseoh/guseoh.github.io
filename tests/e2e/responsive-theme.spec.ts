import { expect, test } from "@playwright/test";

test("980px와 981px 경계에서 기본 글자 크기가 갑자기 바뀌지 않는다", async ({ page }) => {
  await page.goto("/blog/jpa/persistence-context/");

  const measurements: Record<number, number> = {};
  for (const width of [375, 768, 980, 981, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    measurements[width] = await page.evaluate(
      () => Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
    );

    // Dense desktop targets about 90% of the former 15px baseline;
    // mobile remains closer to its previous reading scale.
    expect(measurements[width]).toBeGreaterThanOrEqual(13.45);
    expect(measurements[width]).toBeLessThanOrEqual(15.55);
  }

  expect(Math.abs(measurements[980] - measurements[981])).toBeLessThan(0.25);
  expect(measurements[375]).toBeGreaterThan(measurements[981]);
  expect(measurements[1920]).toBeCloseTo(13.5, 1);
});

test("테마 전환은 한 번 클릭에 한 번만 발생하고 Planner 설정을 유지한다", async ({ page }) => {
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

  for (const [index, mode, resolvedTheme] of [
    [1, "light", "light"],
    [2, "dark", "dark"],
    [3, "planner", "dark"],
    [4, "system", null]
  ] as const) {
    await toggle.click();
    await expect(root).toHaveAttribute("data-theme-mode", mode);
    if (resolvedTheme) {
      await expect(root).toHaveAttribute("data-theme", resolvedTheme);
    }
    await expect(page.locator("body")).toHaveAttribute("data-theme-events", String(index));
    await expect(toggle.locator(".theme-toggle__label")).toHaveText(
      mode === "system" ? "System" : mode === "planner" ? "Planner" : mode === "dark" ? "Dark" : "Light"
    );
  }

  await page.evaluate(() => localStorage.setItem("theme", "planner"));
  await page.reload();
  await expect(root).toHaveAttribute("data-theme-mode", "planner");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(toggle.locator(".theme-toggle__label")).toHaveText("Planner");
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
