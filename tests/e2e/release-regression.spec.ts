import { expect, test } from "@playwright/test";

// Final UI regression coverage for the 0–5 phase changes. Keep the cases
// independent of article counts and GitHub contribution totals.
const routes = [
  { path: "/", kind: "home" },
  { path: "/blog/", kind: "cards" },
  { path: "/search/?q=JPA", kind: "search" },
  { path: "/blog/jpa/persistence-context/", kind: "article" }
] as const;
const viewports = [375, 768, 980, 981, 1280, 1440, 1800, 1920];
const modes = ["light", "dark", "planner"] as const;

for (const { path, kind } of routes) {
  test(`${path} — 테마와 반응형에서 가로 넘침·본문 잘림이 없다`, async ({ page }) => {
    await page.goto("/");

    for (const mode of modes) {
      await page.evaluate((value) => localStorage.setItem("theme", value), mode);

      for (const width of viewports) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme-mode", mode);
        await expect(page.locator("main h1")).toHaveCount(1);

        const focal = kind === "article"
          ? page.locator(".post-column")
          : kind === "search"
            ? page.locator("[data-search-list] .post-card").first()
            : page.locator(".post-card").first();

        await expect(focal).toBeVisible();
        const geometry = await page.evaluate((article) => {
          const main = document.getElementById("main-content");
          const focalElement = document.querySelector(article);
          if (!(main instanceof HTMLElement) || !(focalElement instanceof HTMLElement)) {
            throw new Error("UI regression target is missing");
          }

          const mainRect = main.getBoundingClientRect();
          const focalRect = focalElement.getBoundingClientRect();
          return {
            width: window.innerWidth,
            mainLeft: mainRect.left,
            mainRight: mainRect.right,
            focalLeft: focalRect.left,
            focalRight: focalRect.right,
            focalWidth: focalRect.width
          };
        }, kind === "article" ? ".post-column" : kind === "search" ? "[data-search-list] .post-card" : ".post-card");

        expect(geometry.mainLeft).toBeGreaterThanOrEqual(-2);
        expect(geometry.mainRight).toBeLessThanOrEqual(geometry.width + 2);
        expect(geometry.focalLeft).toBeGreaterThanOrEqual(-2);
        expect(geometry.focalRight).toBeLessThanOrEqual(geometry.width + 2);
        expect(geometry.focalWidth).toBeGreaterThan(100);
      }
    }
  });
}

test("글 목록 → 상세 글 → 카테고리 → 태그 링크를 이동할 수 있다", async ({ page }) => {
  await page.goto("/blog/");
  const firstPost = page.locator("#blog-post-list .post-card").first();
  const title = await firstPost.locator(".post-card__header a").textContent();
  await firstPost.locator(".post-card__header a").click();
  await expect(page.locator(".post__header h1")).toHaveText(title?.trim() ?? "");
  await expect(page.locator(".post__content")).toBeVisible();

  await page.goto("/blog/jpa/persistence-context/");
  const category = page.locator(".post-meta-grid a.tag--category");
  await expect(category).toHaveAttribute("href", "/categories/jpa/");
  await category.click();
  await expect(page.locator("main h1")).toHaveText("JPA");
  await expect(page.locator(".post-card").first()).toBeVisible();

  await page.goto("/blog/jpa/persistence-context/");
  const tag = page.locator('.post-meta-tags a[href="/tags/jpa/"]');
  await expect(tag).toBeVisible();
  await tag.click();
  await expect(page.locator("main h1")).toHaveText("#JPA");
});

test("검색의 쿼리와 카테고리 조건을 적용해 실제 게시글로 이동한다", async ({ page }) => {
  await page.goto("/search/?q=JPA");
  const list = page.locator("[data-search-list]");
  await expect(list.locator(".post-card").first()).toBeVisible();
  await page.locator("[data-search-category]").selectOption("JPA");
  await expect(page).toHaveURL(/category=JPA/);
  await expect(list.locator(".post-card").first()).toBeVisible();

  const firstResult = list.locator(".post-card__header a").first();
  const title = (await firstResult.textContent())?.trim() ?? "";
  await firstResult.click();
  await expect(page.locator(".post__header h1")).toHaveText(title);
});

test("본문 이미지 라이트박스는 Escape로 닫히고 포커스가 복원된다", async ({ page }) => {
  await page.goto("/blog/jpa/persistence-context/");
  const opener = page.locator(".post__content img.post-lightbox-trigger").first();
  await expect(opener).toBeVisible();
  await opener.click();
  const dialog = page.locator("#post-image-lightbox");
  await expect(dialog).toHaveAttribute("open", "");
  await expect(page.locator("html")).toHaveClass(/post-lightbox-open/);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toHaveAttribute("open", "");
  await expect(page.locator("html")).not.toHaveClass(/post-lightbox-open/);
  await expect(opener).toBeFocused();
});

test("상단 건너뛰기 링크와 검색 단축키가 동작한다", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "본문으로 건너뛰기" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await page.keyboard.press("Control+k");
  // Search can normalize the query string after focus=1 is consumed.
  await expect(page).toHaveURL(/\/search\//);
  await expect(page.getByRole("searchbox", { name: "검색어", exact: true })).toBeFocused();
});
