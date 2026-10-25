import { expect, test } from "@playwright/test";

const jpa = "/blog/jpa/persistence-context/";
const security = "/blog/security/basic1/";

test("V2 사이드바는 선택된 하위 분류만 강조하고 상위 그룹·태그는 보조로 표시한다", async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 950 });
  for (const [route, category] of [[jpa, "Spring Data JPA"], [security, "Spring Security"]] as const) {
    await page.goto(route);
    await page.evaluate(() => localStorage.setItem("blog-left-sidebar-collapsed", "false"));
    await page.reload();

    const child = page.locator(".category-menu--sidebar .category-menu__child[aria-current='page']");
    await expect(child).toHaveCount(1);
    await expect(child).toContainText(category);
    const group = child.locator("xpath=ancestor::div[contains(@class, 'category-menu__group')]");
    const parent = group.locator(".category-menu__parent-link");
    await expect(parent).not.toHaveAttribute("aria-current", "page");
    const backgrounds = await page.evaluate(() => {
      const selected = document.querySelector(".category-menu--sidebar .category-menu__child[aria-current='page']");
      const ancestor = selected?.closest(".category-menu__group");
      const parentLink = ancestor?.querySelector(".category-menu__parent-link");
      if (!(selected instanceof HTMLElement) || !(parentLink instanceof HTMLElement)) throw new Error("Missing sidebar category");
      return {
        child: getComputedStyle(selected).backgroundColor,
        parent: getComputedStyle(parentLink).backgroundColor,
        border: getComputedStyle(selected).borderLeftColor
      };
    });
    expect(backgrounds.child).not.toBe(backgrounds.parent);
    await expect(page.locator("#sidebar-search-input")).toBeAttached();
    await expect(page.getByRole("navigation", { name: "태그 탐색" })).toBeVisible();
  }
});

test("V2 TOC는 어절 줄바꿈, H2/H3 계층, 현재 위치 라인을 보존한다", async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 950 });
  for (const route of [jpa, security]) {
    await page.goto(route);
    await page.evaluate(() => localStorage.setItem("blog-left-sidebar-collapsed", "false"));
    await page.reload();
    const toc = page.locator(".post-view > .post-toc");
    await expect(toc).toBeVisible();
    const metrics = await toc.evaluate((element) => {
      const primary = element.querySelector(".post-toc__item.depth-2 a");
      const secondary = element.querySelector(".post-toc__item.depth-3 a");
      const active = element.querySelector(".post-toc__item a.is-active");
      if (!(primary instanceof HTMLAnchorElement) || !(active instanceof HTMLAnchorElement)) {
        throw new Error("TOC heading missing");
      }
      return {
        width: element.getBoundingClientRect().width,
        wordBreak: getComputedStyle(primary).wordBreak,
        wrap: getComputedStyle(primary).overflowWrap,
        activeBorder: getComputedStyle(active).borderLeftColor,
        idleBorder: getComputedStyle(primary === active ? element.querySelector(".post-toc__item a:not(.is-active)")! : primary).borderLeftColor,
        primaryWeight: Number(getComputedStyle(primary).fontWeight),
        secondaryWeight: secondary ? Number(getComputedStyle(secondary).fontWeight) : null
      };
    });
    expect(metrics.width).toBeGreaterThan(230);
    expect(metrics.wordBreak).toBe("keep-all");
    expect(metrics.wrap).toBe("anywhere");
    expect(metrics.activeBorder).not.toBe(metrics.idleBorder);
    if (metrics.secondaryWeight !== null) expect(metrics.primaryWeight).toBeGreaterThan(metrics.secondaryWeight);
  }
});

test("V2 TOC 반응형 경계는 기존 접이식 이동·Escape와 3열 배치를 보존한다", async ({ page }) => {
  await page.goto(jpa);
  await page.evaluate(() => localStorage.setItem("blog-left-sidebar-collapsed", "false"));
  await page.reload();
  for (const width of [980, 981, 1280, 1439, 1440, 1480, 1800]) {
    await page.setViewportSize({ width, height: 900 });
    const wide = width >= 1480;
    await expect(page.locator(".post-view > .post-toc")).toBeVisible({ visible: wide });
    if (!wide) {
      const button = page.getByRole("button", { name: "이 글의 목차" });
      await expect(button).toBeVisible();
      await button.click();
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(button).toHaveAttribute("aria-expanded", "false");
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, String(width)).toBeLessThanOrEqual(2);
  }
});

test("맨 위로 버튼은 스크롤 후에만 나타나며 클릭하면 다시 숨는다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(security);
  const topButton = page.getByRole("button", { name: "페이지 맨 위로 이동", includeHidden: true });
  await expect(topButton).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 1000));
  await expect(topButton).toBeVisible();
  await topButton.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
  await expect(topButton).toBeHidden();
});
