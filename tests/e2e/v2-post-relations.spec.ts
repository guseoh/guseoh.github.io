import { expect, test } from "@playwright/test";
import {
  buildPostRelationIndex,
  extractPostLinkTargets,
  getPostRelations,
  resolveInternalPostLink
} from "../../src/utils/postRelations";

const fakePost = (id: string, slug: string, body: string, chapter: number, draft = false, aliases: string[] = []) => ({
  id, body,
  data: {
    slug, title: id, description: id + "에 대한 설명", category: "Spring Security",
    date: new Date("2026-08-01T00:00:00Z"), tags: ["Security"],
    chapter, draft, aliases, series: ""
  }
}) as any;

test("정적 관계 인덱스는 공개 글·정규 URL·별칭만 대상으로 하고 중복과 외부 주소를 제외한다", () => {
  const a = fakePost("A", "security/a",
    "[b](/blog/security/b/) [alias](https://guseoh.github.io/blog/legacy-b/#top) " +
    "[fake](https://evil.example/blog/security/b/) [draft](/blog/security/private/) " +
    "\n\n" + "~~~md\n[code](/blog/security/b/)\n~~~", 1);
  const b = fakePost("B", "security/b", "[a](/blog/security/a/)", 2, false, ["/blog/legacy-b/"]);
  const draft = fakePost("Draft", "security/private", "", 3, true);
  const index = buildPostRelationIndex([a, b, draft]);
  expect(index.posts).toHaveLength(2);
  expect(index.outgoing.get("/blog/security/a/")).toEqual([b]);
  expect(index.incoming.get("/blog/security/b/")).toEqual([a]);
  expect(resolveInternalPostLink("/blog/legacy-b/?src=ref#heading", "/blog/security/a/", index.byPath)).toBe(b);
  expect(resolveInternalPostLink("https://evil.example/blog/security/b/", "/blog/security/a/", index.byPath)).toBeUndefined();
  expect(extractPostLinkTargets("~~~md\n[code](/blog/security/b/)\n~~~")).toEqual([]);
  const related = getPostRelations(index, b);
  expect(related.previous?.id).toBe("A");
  expect(related.incoming.map((post) => post.id)).toEqual(["A"]);
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
