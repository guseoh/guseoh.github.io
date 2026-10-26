import { expect, test } from "@playwright/test";

const article = "/blog/security/basic1/";

async function useTheme(page: import("@playwright/test").Page, theme: string) {
  await page.goto(article);
  await page.evaluate((mode) => localStorage.setItem("theme", mode), theme);
  await page.reload();
}

test("dark uses neutral charcoal, while light and planner retain distinct palettes", async ({ page }) => {
  await useTheme(page, "dark");
  const dark = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      bg: styles.getPropertyValue("--bg").trim(),
      card: styles.getPropertyValue("--card-bg").trim(),
      code: styles.getPropertyValue("--code-block-bg").trim(),
      inline: styles.getPropertyValue("--code-inline-bg").trim(),
      mode: document.documentElement.getAttribute("data-theme-mode")
    };
  });
  expect(dark).toMatchObject({ bg: "#191919", card: "#202020", inline: "#292929", mode: "dark" });
  expect(["#222", "#222222"]).toContain(dark.code);

  await useTheme(page, "planner");
  await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "planner");
  const planner = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg").trim());
  expect(planner).toBe("#091625");

  await useTheme(page, "light");
  const light = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg").trim());
  expect(light).toBe("#f7f9fc");
});

test("desktop article uses narrower text, restrained inline code and normal font weight", async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 900 });
  await useTheme(page, "dark");
  const articleMetrics = await page.evaluate(() => {
    const column = document.querySelector(".post-column");
    const prose = document.querySelector(".post__content");
    const paragraph = prose?.querySelector("p");
    const heading = prose?.querySelector("h2");
    const inline = prose?.querySelector(":not(pre) > code");
    if (!(column instanceof HTMLElement) || !(paragraph instanceof HTMLElement)
      || !(heading instanceof HTMLElement) || !(inline instanceof HTMLElement)) throw new Error("Missing article elements");
    const code = getComputedStyle(inline);
    const p = getComputedStyle(paragraph);
    return {
      width: column.getBoundingClientRect().width,
      textSize: parseFloat(p.fontSize),
      inlineWeight: code.fontWeight,
      inlineBorder: parseFloat(code.borderTopWidth),
      inlineBackground: code.backgroundColor,
      inlineSize: parseFloat(code.fontSize),
      inlineParentSize: parseFloat(getComputedStyle(inline.parentElement!).fontSize),
      headingSize: parseFloat(getComputedStyle(heading).fontSize)
    };
  });
  expect(articleMetrics.width).toBeGreaterThan(680);
  expect(articleMetrics.width).toBeLessThan(820);
  expect(articleMetrics.textSize).toBeGreaterThan(13);
  expect(articleMetrics.textSize).toBeLessThan(15);
  expect(articleMetrics.inlineWeight).toBe("400");
  expect(articleMetrics.inlineBorder).toBe(0);
  expect(articleMetrics.inlineBackground).toBe("rgb(41, 41, 41)");
  expect(articleMetrics.inlineSize).toBeLessThan(articleMetrics.inlineParentSize);
  expect(articleMetrics.headingSize).toBeLessThan(24);
});

test("ordinary diagram stays below 640px; explicit full-width can expand and lightbox survives", async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.goto(article);
  const image = page.locator(".post__content img.post-lightbox-trigger").first();
  await expect(image).toBeVisible();
  const wideSvg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="480"><rect width="1200" height="480" fill="#ddd"/></svg>');
  await image.evaluate((img, src) => { (img as HTMLImageElement).src = src; }, wideSvg);
  await expect.poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(1200);
  const regular = await image.boundingBox();
  const column = await page.locator(".post-column").boundingBox();
  expect(regular).not.toBeNull();
  expect(column).not.toBeNull();
  expect(regular!.width).toBeGreaterThan(450);
  expect(regular!.width).toBeLessThanOrEqual(640);
  expect(column!.width).toBeGreaterThan(regular!.width + 60);

  await image.evaluate((img) => (img as HTMLElement).classList.add("full-width"));
  const wide = await image.boundingBox();
  expect(wide!.width).toBeGreaterThan(regular!.width + 40);

  await image.click();
  await expect(page.locator("#post-image-lightbox")).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(image).toBeFocused();
});

test("explicit full-width fills the reading column even for a small linked image", async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.goto(article);
  await page.evaluate(() => {
    const content = document.querySelector(".post__content");
    if (!content) throw new Error("Post content missing");
    const paragraph = document.createElement("p");
    const anchor = document.createElement("a");
    anchor.href = "#";
    const image = document.createElement("img");
    image.className = "full-width";
    image.alt = "Linked sample diagram";
    image.src = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="128"><rect width="320" height="128" fill="#ddd"/></svg>');
    anchor.append(image);
    paragraph.append(anchor);
    content.replaceChildren(paragraph);
  });
  const image = page.locator(".post__content > p > a > img.full-width");
  await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBe(320);
  const [imageBox, proseBox] = await Promise.all([image.boundingBox(), page.locator(".post__content").boundingBox()]);
  expect(imageBox).not.toBeNull();
  expect(proseBox).not.toBeNull();
  expect(Math.abs(imageBox!.width - proseBox!.width)).toBeLessThanOrEqual(2);
});

test("mobile article keeps readable type and images fit the viewport in all themes", async ({ page }) => {
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["light", "dark", "planner"]) {
      await useTheme(page, mode);
      const metrics = await page.evaluate(() => {
        const paragraph = document.querySelector(".post__content > p");
        const img = document.querySelector(".post__content img");
        if (!(paragraph instanceof HTMLElement) || !(img instanceof HTMLElement)) throw new Error("Missing content");
        return {
          text: parseFloat(getComputedStyle(paragraph).fontSize),
          imageWidth: img.getBoundingClientRect().width,
          overflow: document.documentElement.scrollWidth - innerWidth
        };
      });
      expect(metrics.text, mode + " " + width).toBeGreaterThanOrEqual(15);
      expect(metrics.imageWidth, mode + " " + width).toBeLessThanOrEqual(width);
      expect(metrics.overflow, mode + " " + width).toBeLessThanOrEqual(2);
    }
  }
});

test("global navigation stays outside article density rules", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".post__content")).toHaveCount(0);
  const homeBg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg").trim());
  expect(homeBg).toBeTruthy();
  await page.goto("/blog/security/basic1/");
  await expect(page.locator(".post-toc-mobile, .post-toc").first()).toHaveCount(1);
});
