import { expect, test } from "@playwright/test";

test("댓글 외부 스크립트가 차단되면 GitHub 대체 경로를 안내한다", async ({ page }) => {
  await page.route("https://utteranc.es/client.js", (route) => route.abort());
  await page.goto("/blog/security/basic1/");
  const comments = page.locator(".comments-wrap");
  await expect(comments.getByRole("heading", { name: "댓글" })).toBeVisible();
  await comments.scrollIntoViewIfNeeded();
  await expect(comments.locator("[data-comments-fallback]")).toBeVisible();
  await expect(comments.locator("[data-comments-loading]")).toBeHidden();
  await expect(comments.locator("#utterances-comments")).not.toHaveAttribute("aria-busy", "true");
  await expect(comments.getByRole("link", { name: "GitHub에서 확인하기" })).toBeVisible();
});
