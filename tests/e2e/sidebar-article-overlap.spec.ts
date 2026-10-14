import { expect, test } from "@playwright/test";

// Reproduces the desktop regression where the Planner fixed sidebar styling
// leaked into Light/Dark and covered the beginning of article titles.
test("열린 데스크톱 사이드바가 테마·화면 크기별 본문을 가리지 않는다", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));

  for (const mode of ["light", "dark", "planner"]) {
    await page.goto("/blog/security/basic1/");
    await page.evaluate((themeMode) => {
      localStorage.setItem("theme", themeMode);
      localStorage.setItem("blog-left-sidebar-collapsed", "false");
    }, mode);
    await page.reload();

    for (const width of [981, 1024, 1280, 1479, 1480, 1600, 1800, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator("html")).toHaveAttribute("data-theme-mode", mode);
      await expect(page.locator("#site-sidebar")).toBeVisible();
      await expect(page.locator(".post-column")).toBeVisible();

      // Allow the sidebar's layout transition to settle before measuring.
      await page.waitForTimeout(250);
      const bounds = await page.evaluate(() => {
        const sidebar = document.querySelector("#site-sidebar");
        const article = document.querySelector(".post-column");
        const toc = document.querySelector(".post-view > .post-toc");
        if (!(sidebar instanceof HTMLElement) || !(article instanceof HTMLElement)) {
          throw new Error("Expected sidebar and article");
        }
        const sidebarRect = sidebar.getBoundingClientRect();
        const articleRect = article.getBoundingClientRect();
        const tocRect = toc?.getBoundingClientRect();
        const tocVisible = toc instanceof HTMLElement &&
          getComputedStyle(toc).display !== "none" &&
          Boolean(tocRect?.width);
        return {
          sidebarRight: sidebarRect.right,
          sidebarPosition: getComputedStyle(sidebar).position,
          articleLeft: articleRect.left,
          articleRight: articleRect.right,
          tocLeft: tocVisible && tocRect ? tocRect.left : null,
          viewportWidth: window.innerWidth
        };
      });

      expect.soft(bounds.articleLeft, `${mode} ${width}px: sidebar overlaps article`)
        .toBeGreaterThanOrEqual(bounds.sidebarRight + 8);
      expect.soft(bounds.articleRight, `${mode} ${width}px: article exceeds viewport`)
        .toBeLessThanOrEqual(bounds.viewportWidth + 2);
      if (bounds.tocLeft !== null) {
        expect.soft(bounds.tocLeft, `${mode} ${width}px: TOC overlaps article`)
          .toBeGreaterThanOrEqual(bounds.articleRight + 8);
      }
      expect.soft(bounds.sidebarPosition, `${mode} sidebar positioning`)
        .toBe(mode === "planner" ? "fixed" : "sticky");
    }
  }
});

test("다크 모드에서 데스크톱 사이드바를 접고 다시 열어도 본문을 가리지 않는다", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));
  await page.setViewportSize({ width: 1480, height: 900 });
  await page.goto("/blog/security/basic1/");
  await page.evaluate(() => {
    localStorage.setItem("theme", "dark");
    localStorage.setItem("blog-left-sidebar-collapsed", "false");
  });
  await page.reload();

  const sidebar = page.locator("#site-sidebar");
  const article = page.locator(".post-column");
  const assertClearance = async () => {
    const sidebarRight = await sidebar.evaluate((node) => node.getBoundingClientRect().right);
    const articleLeft = await article.evaluate((node) => node.getBoundingClientRect().left);
    expect(articleLeft).toBeGreaterThanOrEqual(sidebarRight + 8);
  };

  await assertClearance();
  await page.locator("#sidebar-collapse-toggle").click();
  await expect(page.locator(".site-shell")).toHaveClass(/sidebar-collapsed/);
  await page.locator("#sidebar-open").click();
  await expect(page.locator(".site-shell")).not.toHaveClass(/sidebar-collapsed/);
  await expect(sidebar).toBeVisible();
  await page.waitForTimeout(250);
  await assertClearance();
});

test("Planner 모드에서 접힌 사이드바 토글과 본문 사이에 공간을 확보한다", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));
  await page.goto("/blog/security/basic1/");
  await page.evaluate(() => {
    localStorage.setItem("theme", "planner");
    localStorage.setItem("blog-left-sidebar-collapsed", "true");
  });
  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "planner");
  await expect(page.locator(".site-shell")).toHaveClass(/sidebar-collapsed/);
  const toggle = page.locator("#sidebar-open");
  const content = page.locator(".site-content");
  await expect(toggle).toBeVisible();
  await expect(content).toBeVisible();

  for (const width of [981, 1024, 1280, 1480, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(250);
    const bounds = await page.evaluate(() => {
      const toggle = document.querySelector("#sidebar-open");
      const content = document.querySelector(".site-content");
      if (!(toggle instanceof HTMLElement) || !(content instanceof HTMLElement)) {
        throw new Error("Expected collapsed sidebar toggle and site content");
      }
      const toggleRect = toggle.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      return {
        toggleRight: toggleRect.right,
        contentLeft: contentRect.left,
        contentRight: contentRect.right,
        viewportWidth: window.innerWidth
      };
    });

    expect.soft(bounds.contentLeft, "Planner " + width + "px: content overlaps sidebar toggle")
      .toBeGreaterThanOrEqual(bounds.toggleRight + 8);
    expect.soft(bounds.contentRight, "Planner " + width + "px: content exceeds viewport")
      .toBeLessThanOrEqual(bounds.viewportWidth + 2);
  }
});
