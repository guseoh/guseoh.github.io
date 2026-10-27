import { expect, test } from "@playwright/test";

test("검은 글씨의 투명 도식은 다크 테마에서도 흰 배경과 원본 색상을 유지한다", async ({ page }) => {
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    for (const mode of ["light", "dark", "planner"]) {
      await page.goto("/blog/ui-preview/media-learning-components/");
      await page.evaluate((value) => localStorage.setItem("theme", value), mode);
      await page.reload();
      const image = page.locator('.post__content img[src*="adadada"]').first();
      await expect(image).toBeVisible();
      await expect(image).toHaveClass(/light-bg/);
      await expect(image).toHaveClass(/no-dark-filter/);
      await expect(image).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(image).toHaveCSS("filter", "none");
      await image.click();
      const dialog = page.locator("#post-image-lightbox");
      await expect(dialog).toHaveAttribute("open", "");
      await expect(dialog).toHaveAttribute("data-light-background", "true");
      await expect(dialog.locator(".post-lightbox__frame")).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await page.keyboard.press("Escape");
      await expect(dialog).not.toHaveAttribute("open", "");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
    }
  }
});

test("실제 인증 글도 같은 도식에 밝은 캔버스를 적용한다", async ({ page }) => {
  await page.goto("/blog/security/basic1/");
  await page.evaluate(() => localStorage.setItem("theme", "dark"));
  await page.reload();
  const image = page.locator('.post__content img[src*="adadada"]').first();
  await expect(image).toHaveClass(/light-bg/);
  await expect(image).toHaveCSS("background-color", "rgb(255, 255, 255)");
});
