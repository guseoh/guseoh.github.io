import { expect, test } from "@playwright/test";

const blog = "/blog/security/basic1/";

test("소제목 링크·복사 동작은 경량 아이콘과 접근 가능한 이름을 유지한다", async ({ page }) => {
  await page.goto(blog);
  const heading = page.locator(".post__content h2[id]").first();
  const link = heading.getByRole("link", { name: /제목 링크로 이동/ });
  const copy = heading.getByRole("button", { name: /제목 URL 복사/ });
  await expect(link).toHaveAttribute("href", /^#/);
  await expect(link.locator("svg")).toHaveCount(1);
  await expect(copy.locator("svg")).toHaveCount(1);
  const style = await copy.evaluate((element) => ({
    border: getComputedStyle(element).borderTopColor,
    background: getComputedStyle(element).backgroundColor
  }));
  expect(style.background).toBe("rgba(0, 0, 0, 0)");
  await copy.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#heading-copy-status")).toContainText(/제목 URL/);
});

test("전체 글 공유 UI는 정확한 canonical URL과 별개의 소제목 앵커를 사용한다", async ({ page }) => {
  await page.goto(blog);
  await expect(page.getByRole("navigation", { name: "글 읽기 및 공유" })).toBeVisible();
  const copy = page.getByRole("button", { name: "이 글 주소 복사" });
  await copy.click();
  await expect(page.locator("[data-post-action-status]")).toContainText(/주소/);
  await expect(page.getByRole("button", { name: "이 글 공유하기", includeHidden: true })).toHaveCount(1);
  const url = await page.evaluate(() => document.querySelector("link[rel='canonical']")?.getAttribute("href"));
  expect(url).toContain(blog);
});

test("집중 읽기는 사이드바·TOC를 잠시 숨기고 Esc로 복귀하며 저장 상태를 보존한다", async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.goto(blog);
  await page.evaluate(() => localStorage.setItem("blog-left-sidebar-collapsed", "false"));
  await page.reload();
  const mode = page.locator("[data-post-focus-toggle]");
  await expect(mode).toHaveAttribute("aria-label", "집중 읽기 켜기");
  const sidebar = page.locator("#site-sidebar");
  const toc = page.locator(".post-view > .post-toc");
  await expect(sidebar).toBeVisible();
  await expect(toc).toBeVisible();
  await mode.click();
  await expect(page.locator("body")).toHaveClass(/reading-focus-mode/);
  await expect(sidebar).toBeHidden();
  await expect(toc).toBeHidden();
  await expect(mode).toHaveAttribute("aria-pressed", "true");
  await expect(mode).toHaveAttribute("aria-label", "집중 읽기 해제");
  expect(await page.evaluate(() => localStorage.getItem("blog-left-sidebar-collapsed"))).toBe("false");
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveClass(/reading-focus-mode/);
  await expect(sidebar).toBeVisible();
  await expect(toc).toBeVisible();
  await expect(mode).toHaveAttribute("aria-pressed", "false");
  await expect(mode).toHaveAttribute("aria-label", "집중 읽기 켜기");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});

test("홈 대표 글과 최근 글은 중복되지 않고 대표 글은 최대 2개만 표시한다", async ({ page }) => {
  await page.goto("/");
  const featured = await page.locator(".home-featured-card").evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLAnchorElement).pathname)
  );
  const recent = await page.locator("#home-latest-post-list .post-card").evaluateAll((nodes) =>
    nodes.map((node) => (node.querySelector("a[href^='/blog/']") as HTMLAnchorElement | null)?.pathname)
      .filter(Boolean)
  );
  expect(featured.length).toBeLessThanOrEqual(2);
  expect(new Set(featured).size).toBe(featured.length);
  expect(new Set(recent).size).toBe(recent.length);
  for (const path of featured) expect(recent).not.toContain(path);
});
