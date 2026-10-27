import { expect, test } from "@playwright/test";
import { extractPostLinkTargets, resolveInternalBlogPath } from "../../src/utils/postLinkTargets";

test("정규 내부 게시글 링크만 검증하고 코드/외부 URL은 무시한다", () => {
  const markdown = "[b](/blog/security/basic2/#top) " +
    "[alias](https://guseoh.github.io/blog/spring-security/) " +
    "[external](https://evil.example/blog/security/basic2/) " +
    "\n\n~~~md\n[code](/blog/security/basic3/)\n~~~";
  expect(extractPostLinkTargets(markdown)).toEqual([
    "/blog/security/basic2/#top",
    "https://guseoh.github.io/blog/spring-security/",
    "https://evil.example/blog/security/basic2/"
  ]);
  expect(resolveInternalBlogPath("/blog/security/basic2/#top", "/blog/security/basic1/", "https://guseoh.github.io/"))
    .toBe("/blog/security/basic2/");
  expect(resolveInternalBlogPath("https://evil.example/blog/security/basic2/", "/blog/security/basic1/", "https://guseoh.github.io/"))
    .toBeUndefined();
});

test("검증된 chapter 관계는 펼침형 카드에서 요약과 원래 링크를 유지한다", async ({ page }) => {
  await page.goto("/blog/security/basic2/");
  const explorer = page.locator(".post-knowledge");
  await expect(explorer).toBeVisible();
  await expect(explorer.getByRole("heading", { name: "실제 글 연결" })).toBeVisible();
  const cards = explorer.getByRole("list", { name: "연결된 글 탐색" }).locator("details");
  await expect(cards).toHaveCount(2);
  await expect(explorer.locator("svg.post-knowledge__svg")).toHaveCount(0);
  await expect(cards.first()).toHaveAttribute("open", "");
  await expect(cards.last()).not.toHaveAttribute("open", "");
  await cards.last().locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(cards.last()).toHaveAttribute("open", "");
  await expect(cards.first()).not.toHaveAttribute("open", "");
  const links = await cards.locator("a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  expect(links).toContain("/blog/security/basic1/");
  expect(links).toContain("/blog/security/basic3/");
  await expect(cards.last().locator(".post-knowledge__detail p")).not.toBeEmpty();
  await expect(explorer.locator(".post-knowledge__list")).toHaveCount(0);
  await page.goto("/blog/jpa/relationship-mapping/");
  await expect(page.locator(".post-knowledge")).toHaveCount(0);
});

test("내부 링크의 미리보기는 등록된 공개 글 정보만 보여 주고 Escape로 닫힌다", async ({ page }) => {
  await page.goto("/blog/security/basic2/");
  const next = page.locator(".post-learning-path__nav a[href='/blog/security/basic3/']");
  await next.scrollIntoViewIfNeeded();
  await next.focus();
  const popup = page.locator("[data-post-preview]");
  await expect(popup).toBeVisible();
  await expect(popup.locator("[data-preview-title]")).toContainText("Spring Security");
  await expect(popup.locator("[data-preview-description]")).not.toBeEmpty();
  await expect(popup.locator("[data-preview-link]")).toHaveAttribute("href", "/blog/security/basic3/");
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
  await expect(next).toBeFocused();
  await next.dispatchEvent("mouseenter");
  await expect(popup).toBeVisible();
  await popup.getByRole("button", { name: "미리보기 닫기" }).focus();
  await page.keyboard.press("Enter");
  await expect(popup).toBeHidden();
  await expect(next).toBeFocused();
});

test("Series 허브는 존재하지 않는 Series ID 없이 명시된 카테고리 chapter 경로를 연결한다", async ({ page }) => {
  await page.goto("/series/");
  const path = page.locator(".library-paths");
  await expect(path).toBeVisible();
  await expect(path.getByText("Spring Security")).toBeVisible();
  await expect(path.getByRole("link", { name: "첫 글 읽기" })).toHaveAttribute("href", "/blog/security/basic1/");
  await expect(path.getByRole("link", { name: "전체 순서 보기" })).toHaveAttribute("href", "/categories/spring-security/");
  await expect(page.locator(".series-study-status")).toHaveCount(0);
});

test("글 연결 카드는 모바일·테마별로 넘침 없이 키보드로 펼칠 수 있다", async ({ page }) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 840 });
    for (const mode of ["light", "dark", "planner"]) {
      await page.goto("/blog/security/basic2/");
      await page.evaluate((value) => localStorage.setItem("theme", value), mode);
      await page.reload();
      const summary = page.locator(".post-knowledge__cards details").last().locator("summary");
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(summary.locator(".post-knowledge__title")).toBeVisible();
      await expect(summary.locator("xpath=..")).toHaveAttribute("open", "");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow, `${mode}/${width}`).toBeLessThanOrEqual(2);
    }
  }
});
