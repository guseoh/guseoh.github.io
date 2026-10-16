import { expect, test } from "@playwright/test";

const themeModes = ["light", "dark", "system", "planner"] as const;

test("카테고리 내비게이션 구조는 모든 색상 테마에서 동일하다", async ({ page }, testInfo) => {
  const isDesktop = testInfo.project.name.startsWith("desktop");
  const widths = isDesktop ? [981, 1280, 1800] : [375, 768, 980];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    let reference: {
      sidebarPosition: string;
      sidebarLeft: number;
      sidebarRight: number;
      sidebarWidth: number;
      contentLeft: number;
      contentWidth: number;
      gridColumns: string;
    } | undefined;

    for (const mode of themeModes) {
      await page.goto("/categories/");
      await page.evaluate((themeMode) => {
        localStorage.setItem("theme", themeMode);
        localStorage.setItem("blog-left-sidebar-collapsed", "false");
      }, mode);
      await page.reload();

      await expect(page.locator("html")).toHaveAttribute("data-theme-mode", mode);
      const sidebar = page.locator("#site-sidebar");
      if (!isDesktop) {
        await page.locator("#sidebar-open").click();
      }
      await expect(sidebar).toBeVisible();
      await expect(page.getByRole("heading", { name: "카테고리" })).toBeVisible();
      await page.waitForTimeout(250);

      const geometry = await page.evaluate(() => {
        const layout = document.querySelector(".site-layout");
        const sidebar = document.querySelector("#site-sidebar");
        const content = document.querySelector(".site-content");
        if (!(layout instanceof HTMLElement) || !(sidebar instanceof HTMLElement) || !(content instanceof HTMLElement)) {
          throw new Error("Expected category layout, sidebar, and content");
        }
        const sidebarRect = sidebar.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        return {
          sidebarPosition: getComputedStyle(sidebar).position,
          sidebarLeft: sidebarRect.left,
          sidebarRight: sidebarRect.right,
          sidebarWidth: sidebarRect.width,
          contentLeft: contentRect.left,
          contentWidth: contentRect.width,
          gridColumns: getComputedStyle(layout).gridTemplateColumns
        };
      });

      expect(geometry.sidebarPosition).toBe(width > 980 ? "sticky" : "fixed");
      if (isDesktop) {
        expect(geometry.contentLeft).toBeGreaterThanOrEqual(geometry.sidebarRight + 8);
      }

      if (!reference) {
        reference = geometry;
        continue;
      }

      expect(geometry.sidebarPosition).toBe(reference.sidebarPosition);
      expect(geometry.gridColumns).toBe(reference.gridColumns);
      for (const key of ["sidebarLeft", "sidebarRight", "sidebarWidth", "contentLeft", "contentWidth"] as const) {
        expect(Math.abs(geometry[key] - reference[key]), `${mode} ${width}px: ${key} changed with theme`)
          .toBeLessThanOrEqual(1);
      }
    }
  }
});
