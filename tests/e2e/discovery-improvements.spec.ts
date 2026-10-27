import { test, expect } from "@playwright/test";

test("발행순과 아카이브에서 실제 글을 찾고 학습 경로로 이동한다", async ({ page }) => {
  await page.goto("/blog/");
  await page.getByRole("link", { name: "최근 발행순" }).click();
  await expect(page).toHaveURL(/\/blog\/published\/$/);
  const dates = await page.locator("#published-post-list time").evaluateAll((items) => items.map((item) => item.getAttribute("datetime") ?? ""));
  expect(dates.length).toBeGreaterThan(1);
  expect(dates).toEqual([...dates].sort().reverse());
  await page.getByRole("link", { name: "발행 아카이브" }).click();
  await expect(page.getByRole("heading", { name: /발행 아카이브/ })).toBeVisible();
  await expect(page.locator(".archive-entry[open] a").first()).toBeVisible();
  await page.goto("/series/");
  await expect(page.getByRole("heading", { name: "학습 경로", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "첫 글 읽기" }).first()).toHaveAttribute("href", /\/blog\//);
});

test("인증 예시가 사용자 선택에 따라 결과를 안내한다", async ({ page }) => {
  await page.goto("/blog/security/basic1/");
  const example = page.locator(".security-example");
  await expect(example.getByRole("status")).toContainText("401");
  await example.getByLabel("사용자 상태").selectOption("member");
  await expect(example.getByRole("status")).toContainText("403");
  await example.getByLabel("사용자 상태").selectOption("admin");
  await expect(example.getByRole("status")).toContainText("관리자");
});

test("UI 검증 글은 목록에서 빠지지만 직접 볼 수 있다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /상세 글 UI 검증/ })).toHaveCount(0);
  await page.goto("/blog/ui-preview/media-learning-components/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");
  await expect(page.locator(".post-image-zoom-hint").first()).toBeVisible();
});

test("목차의 하위 항목을 선택적으로 펼칠 수 있다", async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 900 });
  await page.goto("/blog/security/basic2/");
  const toc = page.locator(".post-toc");
  const button = toc.locator(".post-toc__expand");
  await expect(button).toBeVisible();
  await expect(toc.locator(".depth-3[hidden]").first()).toBeAttached();
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(toc.locator(".depth-3[hidden]")).toHaveCount(0);
});

test("Mermaid 로드가 차단되어도 원문과 실패 안내를 보여준다", async ({ page }) => {
  await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
  await page.goto("/blog/ui-preview/media-learning-components/");
  const diagram = page.locator("[data-learning-mermaid]");
  await diagram.scrollIntoViewIfNeeded();
  await expect(diagram.locator(".learning-mermaid-fallback")).toContainText("원본");
  await expect(diagram.locator("[data-learning-mermaid-source]")).toContainText("flowchart");
});
