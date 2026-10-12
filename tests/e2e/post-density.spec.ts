import { expect, test } from "@playwright/test";

test("JPA post metadata uses one compact row without duplicate dates", async ({ page }) => {
  await page.goto("/blog/jpa/persistence-context/");

  const metadata = page.locator(".post-meta-grid--compact");
  await expect(metadata).toBeVisible();
  await expect(metadata).toHaveCSS("display", "flex");
  await expect(metadata.locator(".post-meta-item")).toHaveCount(3);

  // These two JPA posts both declare chapter 1; no reading order is inferred.
  await expect(page.locator(".post-learning-path")).toHaveCount(0);
  const related = page.locator(".post-related__grid");
  await expect(related).toHaveAttribute("data-count", "1");
  await expect(related.locator(".post-related__card")).toHaveCount(1);
});

test("compact metadata stays in the article at narrow and wide widths", async ({ page }) => {
  for (const width of [375, 768, 1280, 1800]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/blog/jpa/persistence-context/");
    const metadata = page.locator(".post-meta-grid--compact");
    const article = page.locator(".post-column");
    await expect(metadata).toBeVisible();

    const [metaBox, articleBox] = await Promise.all([metadata.boundingBox(), article.boundingBox()]);
    expect(metaBox).not.toBeNull();
    expect(articleBox).not.toBeNull();
    expect(metaBox!.x).toBeGreaterThanOrEqual(articleBox!.x - 2);
    expect(metaBox!.x + metaBox!.width).toBeLessThanOrEqual(articleBox!.x + articleBox!.width + 2);
  }
});

test("mobile table of contents remains keyboard- and touch-operable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/blog/jpa/persistence-context/");
  const toggle = page.getByRole("button", { name: "이 글의 목차" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.locator(".post-toc-mobile__panel a").first().click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});
