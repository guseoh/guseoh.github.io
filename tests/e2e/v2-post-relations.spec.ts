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

test("명시된 chapter 연결만 그래프와 텍스트 목록에 나타난다", async ({ page }) => {
  await page.goto("/blog/security/basic2/");
  const relationships = page.locator(".post-knowledge");
  await expect(relationships).toBeVisible();
  await expect(relationships.getByRole("heading", { name: "실제 글 연결" })).toBeVisible();
  await expect(relationships.getByRole("list", { name: "연결된 글 텍스트 목록" }).getByRole("link")).toHaveCount(2);
  await expect(relationships.locator("svg[role=img]")).toBeVisible();
  const refs = await relationships.getByRole("list", { name: "연결된 글 텍스트 목록" })
    .locator("a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  expect(refs).toContain("/blog/security/basic1/");
  expect(refs).toContain("/blog/security/basic3/");
  await page.goto("/blog/jpa/relationship-mapping/");
  await expect(page.locator(".post-knowledge")).toHaveCount(0);
});

test("내부 링크의 미리보기는 등록된 공개 글 정보만 보여 주고 Escape로 닫힌다", async ({ page }) => {
  await page.goto("/blog/security/basic2/");
  const next = page.locator(".post-knowledge__list a[href='/blog/security/basic3/']");
  await next.focus();
  const popup = page.locator("[data-post-preview]");
  await expect(popup).toBeVisible();
  await expect(popup.locator("[data-preview-title]")).toContainText("Spring Security");
  await expect(popup.locator("[data-preview-description]")).not.toBeEmpty();
  await expect(popup.locator("[data-preview-link]")).toHaveAttribute("href", "/blog/security/basic3/");
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
  await expect(next).toBeFocused();
  await next.evaluate((element) => (element as HTMLElement).blur());
  await next.focus();
  await expect(popup).toBeVisible();
  await popup.getByRole("button", { name: "미리보기 닫기" }).click();
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
