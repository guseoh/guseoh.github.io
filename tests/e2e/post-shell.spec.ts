import { expect, test } from "@playwright/test";

test("Planner uses the shared desktop article, sidebar, and TOC layout", async ({ page }, testInfo) => {
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
      if (
        !(sidebarElement instanceof HTMLElement) ||
        !(articleElement instanceof HTMLElement) ||
        !(tocElement instanceof HTMLElement)
      ) {
        throw new Error("post shell elements are missing");
      }

      const sidebarRect = sidebarElement.getBoundingClientRect();
      const articleRect = articleElement.getBoundingClientRect();
      const tocRect = tocElement.getBoundingClientRect();
      return {
        sidebarRight: sidebarRect.right,
        articleLeft: articleRect.left,
        articleRight: articleRect.right,
        tocLeft: tocRect.left
      };
    });

    expect(geometry.sidebarRight).toBeLessThanOrEqual(geometry.articleLeft + 1);
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

for (const route of ["/blog/jpa/persistence-context/", "/blog/security/basic2/"]) {
  test("article images match prose width and preserve proportions: " + route, async ({ page }, testInfo) => {
    if (testInfo.project.name.startsWith("desktop")) {
      await page.setViewportSize({ width: 1800, height: 1000 });
    }
    await page.goto(route);
    const images = page.locator(".post__content > figure img, .post__content > p > img:only-child, .post__content > p > a:only-child > img:only-child");
    expect(await images.count()).toBeGreaterThan(1);

    for (const theme of ["light", "dark", "planner"]) {
      await page.evaluate((value) => localStorage.setItem("theme", value), theme);
      await page.reload();
      for (const image of await images.all()) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      }
      const measurements = await images.evaluateAll((elements) => {
        const content = document.querySelector(".post__content")!;
        const contentRect = content.getBoundingClientRect();
        return elements.map((element) => {
          const image = element as HTMLImageElement;
          const rect = image.getBoundingClientRect();
          const style = getComputedStyle(image);
          const innerWidth = rect.width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth) - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
          const innerHeight = rect.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth) - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
          return {
            widthDelta: Math.abs(rect.width - contentRect.width),
            leftDelta: Math.abs(rect.left - contentRect.left),
            rightDelta: Math.abs(rect.right - contentRect.right),
            height: rect.height,
            ratioDelta: Math.abs(innerWidth / innerHeight - image.naturalWidth / image.naturalHeight),
            maxHeight: style.maxHeight
          };
        });
      });
      for (const geometry of measurements) {
        expect(geometry.widthDelta).toBeLessThanOrEqual(2);
        expect(geometry.leftDelta).toBeLessThanOrEqual(2);
        expect(geometry.rightDelta).toBeLessThanOrEqual(2);
        expect(geometry.height).toBeGreaterThan(0);
        expect(geometry.ratioDelta).toBeLessThanOrEqual(0.02);
        expect(geometry.maxHeight).toBe("none");
      }
    }
  });
}

test("plain, linked, captioned and full-width images share the article width", async ({ page }) => {
  await page.goto("/blog/security/basic2/");
  await page.evaluate(() => {
    const content = document.querySelector(".post__content")!;
    const source = content.querySelector("img")!.getAttribute("src")!;
    const fixtures = document.createElement("div");
    fixtures.innerHTML = [
      '<p><img src="' + source + '"></p>',
      '<p><a href="#"><img src="' + source + '"></a></p>',
      '<figure><img src="' + source + '"><figcaption>Caption</figcaption></figure>',
      '<figure><a href="#"><img src="' + source + '"></a><figcaption>Linked caption</figcaption></figure>',
      '<p><img class="full-width" src="' + source + '"></p>'
    ].join("");
    content.replaceChildren(...Array.from(fixtures.children));
  });
  const images = page.locator(".post__content img");
  await expect(images).toHaveCount(5);
  const contentBox = await page.locator(".post__content").boundingBox();
  expect(contentBox).not.toBeNull();
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const box = await image.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.width - contentBox!.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(box!.x - contentBox!.x)).toBeLessThanOrEqual(2);
  }
});
