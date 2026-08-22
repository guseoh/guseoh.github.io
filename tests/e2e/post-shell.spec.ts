import { expect, test } from "@playwright/test";

test("planner wide post keeps left sidebar, centered article, and right TOC separated", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));
  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.goto("/blog/jpa/persistence-context/");
  await page.evaluate(() => {
    localStorage.setItem("theme", "planner");
    localStorage.setItem("blog-left-sidebar-collapsed", "false");
  });
  await page.reload();

  const sidebar = page.locator("#site-sidebar");
  const toc = page.locator(".post-view > .post-toc");
  const shell = page.locator(".site-shell");

  await expect(sidebar).toBeVisible();
  await expect(toc).toBeVisible();
  await expect(toc).toHaveCSS("position", "fixed");

  const assertDesktopRails = async () => {
    const geometry = await page.evaluate(() => {
      const sidebarElement = document.querySelector("#site-sidebar");
      const articleElement = document.querySelector(".post-column");
      const tocElement = document.querySelector(".post-view > .post-toc");
      if (!(sidebarElement instanceof HTMLElement) || !(articleElement instanceof HTMLElement) || !(tocElement instanceof HTMLElement)) {
        throw new Error("post shell elements are missing");
      }

      const sidebarRect = sidebarElement.getBoundingClientRect();
      const articleRect = articleElement.getBoundingClientRect();
      const tocRect = tocElement.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        sidebarRight: sidebarRect.right,
        articleLeft: articleRect.left,
        articleRight: articleRect.right,
        articleCenter: articleRect.left + articleRect.width / 2,
        tocLeft: tocRect.left
      };
    });

    expect(geometry.sidebarRight).toBeLessThanOrEqual(geometry.articleLeft + 1);
    expect(Math.abs(geometry.articleCenter - geometry.viewportWidth / 2)).toBeLessThanOrEqual(2);
    expect(geometry.tocLeft).toBeGreaterThan(geometry.articleRight);
  };

  await assertDesktopRails();

  await page.locator("#sidebar-collapse-toggle").click();
  await expect(shell).toHaveClass(/sidebar-collapsed/);
  await expect(page.locator("#sidebar-open")).toBeVisible();
  await assertDesktopRails();

  await page.locator("#sidebar-open").click();
  await expect(shell).not.toHaveClass(/sidebar-collapsed/);
  await expect(sidebar).toBeVisible();
  await assertDesktopRails();
});

test("post images use the standard centered width unless marked full-width", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));
  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.goto("/blog/jpa/persistence-context/");

  const image = page.locator(".post__content > p > img:not(.full-width)").first();
  const content = page.locator(".post__content");
  await expect(image).toBeVisible();

  const standard = await page.evaluate(() => {
    const imageElement = document.querySelector(".post__content > p > img:not(.full-width)");
    const contentElement = document.querySelector(".post__content");
    if (!(imageElement instanceof HTMLImageElement) || !(contentElement instanceof HTMLElement)) {
      throw new Error("post image or content is missing");
    }

    const imageRect = imageElement.getBoundingClientRect();
    const contentRect = contentElement.getBoundingClientRect();
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    return {
      imageWidth: imageRect.width,
      expectedWidth: Math.min(contentRect.width, rootFontSize * 48),
      imageCenter: imageRect.left + imageRect.width / 2,
      contentCenter: contentRect.left + contentRect.width / 2
    };
  });

  expect(Math.abs(standard.imageWidth - standard.expectedWidth)).toBeLessThanOrEqual(2);
  expect(Math.abs(standard.imageCenter - standard.contentCenter)).toBeLessThanOrEqual(2);

  await image.evaluate((element) => element.classList.add("full-width"));
  const fullWidthImage = page.locator(".post__content > p > img.full-width").first();
  await expect(fullWidthImage).toBeVisible();

  const [fullWidthBox, contentBox] = await Promise.all([fullWidthImage.boundingBox(), content.boundingBox()]);
  expect(fullWidthBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(Math.abs((fullWidthBox?.width ?? 0) - (contentBox?.width ?? 0))).toBeLessThanOrEqual(2);
});
