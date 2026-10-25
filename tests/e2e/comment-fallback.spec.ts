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


test("댓글 iframe이 도착하지 않으면 10초 뒤 로딩 표시를 GitHub 대체 경로로 바꾼다", async ({ page }) => {
  await page.route("https://utteranc.es/client.js", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "/* iframe intentionally omitted */" })
  );
  const clientRequest = page.waitForRequest("https://utteranc.es/client.js");
  await page.goto("/blog/security/basic1/");
  const comments = page.locator(".comments-wrap");
  await comments.scrollIntoViewIfNeeded();
  await clientRequest;
  await expect(comments.locator("[data-comments-loading]")).toBeVisible();
  await expect(comments.locator("[data-comments-fallback]")).toBeHidden();

  await page.waitForTimeout(8_000);
  await expect(comments.locator("[data-comments-loading]")).toBeVisible();
  await page.waitForTimeout(3_000);
  await expect(comments.locator("[data-comments-fallback]")).toBeVisible();
  await expect(comments.locator("[data-comments-loading]")).toBeHidden();
  await expect(comments.locator("#utterances-comments")).not.toHaveAttribute("aria-busy", "true");
  await expect(comments.getByRole("link", { name: "GitHub에서 확인하기" })).toBeVisible();
});

// A retry should make another request rather than leaving the page permanently stuck.
test("댓글 서비스가 차단된 뒤 수동 재시도로 로딩을 복구할 수 있다", async ({ page }) => {
  let attempts = 0;
  await page.route("https://utteranc.es/client.js", (route) => {
    attempts += 1;
    if (attempts === 1) return route.abort();
    return route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "/* retry response intentionally has no iframe */"
    });
  });
  await page.goto("/blog/security/basic1/");
  const comments = page.locator(".comments-wrap");
  await comments.scrollIntoViewIfNeeded();
  await expect(comments.locator("[data-comments-fallback]")).toBeVisible();
  await comments.getByRole("button", { name: "다시 시도" }).click();
  await expect.poll(() => attempts).toBe(2);
  await expect(comments.locator("[data-comments-fallback]")).toBeHidden();
  await expect(comments.locator("[data-comments-loading]")).toBeVisible();
  await expect(comments.locator("#utterances-comments")).toHaveAttribute("aria-busy", "true");
  await expect(comments.getByRole("link", { name: "GitHub에서 확인하기", includeHidden: true }))
    .toHaveAttribute("rel", /noopener/);
});
