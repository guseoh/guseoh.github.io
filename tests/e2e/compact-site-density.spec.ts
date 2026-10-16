import { expect, test } from "@playwright/test";

test("90% 브라우저 축소에 가까운 화면 밀도를 기본 데스크톱에 적용한다", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));
  await page.goto("/blog/security/basic3/");
  await page.evaluate(() => {
    localStorage.setItem("theme", "dark");
    localStorage.setItem("blog-left-sidebar-collapsed", "false");
  });
  await page.reload();

  for (const width of [981, 1280, 1480, 1800, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".post-column")).toBeVisible();

    const size = await page.evaluate(() => {
      const layout = document.querySelector(".site-layout");
      const sidebar = document.querySelector("#site-sidebar");
      const article = document.querySelector(".post-column");
      const header = document.querySelector(".site-header__inner");
      if (!(layout instanceof HTMLElement) || !(sidebar instanceof HTMLElement)
        || !(article instanceof HTMLElement) || !(header instanceof HTMLElement)) {
        throw new Error("Missing desktop layout");
      }
      return {
        root: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
        sidebar: sidebar.getBoundingClientRect().width,
        sidebarRight: sidebar.getBoundingClientRect().right,
        articleLeft: article.getBoundingClientRect().left,
        articleRight: article.getBoundingClientRect().right,
        headerHeight: header.getBoundingClientRect().height,
        viewport: innerWidth
      };
    });

    expect(size.root).toBeGreaterThanOrEqual(14.95);
    expect(size.root).toBeLessThanOrEqual(15.55);
    expect(size.sidebar).toBeGreaterThanOrEqual(233);
    expect(size.sidebar).toBeLessThanOrEqual(272);
    expect(size.articleLeft).toBeGreaterThanOrEqual(size.sidebarRight + 8);
    expect(size.articleRight).toBeLessThanOrEqual(size.viewport + 2);
    expect(size.headerHeight).toBeGreaterThanOrEqual(51);
    expect(size.headerHeight).toBeLessThanOrEqual(56);
  }
});

test("모바일은 읽기 가능한 글자 크기를 유지하고 테마에 따라 크기가 바뀌지 않는다", async ({ page }) => {
  for (const width of [375, 768, 980]) {
    await page.setViewportSize({ width, height: 900 });
    const sizes: number[] = [];
    for (const mode of ["light", "dark", "planner"]) {
      await page.goto("/blog/security/basic3/");
      await page.evaluate((m) => localStorage.setItem("theme", m), mode);
      await page.reload();
      const size = await page.evaluate(() =>
        Number.parseFloat(getComputedStyle(document.documentElement).fontSize));
      sizes.push(size);
      await expect(page.locator(".post__content")).toBeVisible();
    }
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThan(0.1);
    expect(sizes[0]).toBeGreaterThanOrEqual(15.4);
  }
});
