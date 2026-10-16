import { expect, test } from "@playwright/test";

test("읽기 위치는 로컬에 저장하되 재방문 시 자동으로 스크롤하지 않는다", async ({ page }) => {
  await page.goto("/blog/security/basic2/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator("[data-reading-resume]")).toBeHidden();

  await page.evaluate(() => {
    const content = document.querySelector(".post__content");
    if (!(content instanceof HTMLElement)) throw new Error("Missing article");
    const start = content.getBoundingClientRect().top + scrollY;
    const max = Math.max(start, start + content.scrollHeight - innerHeight);
    scrollTo(0, start + (max - start) * 0.45);
  });
  await expect.poll(() => page.evaluate(() => {
    const stored = localStorage.getItem("guseo:reading:last");
    return stored ? JSON.parse(stored).fraction as number : 0;
  })).toBeGreaterThan(0.08);

  await page.goto("/");
  const home = page.locator("[data-home-reading-resume]");
  await expect(home).toBeVisible();
  await expect(home.locator("[data-home-reading-link]")).toHaveAttribute("href", "/blog/security/basic2/");
  await expect(home.locator("[data-home-reading-progress]")).toContainText("이어 읽기");

  await home.locator("[data-home-reading-link]").click();
  await expect(page).toHaveURL(/\/blog\/security\/basic2\/$/);
  const banner = page.locator("[data-reading-resume]");
  await expect(banner).toBeVisible();
  const before = await page.evaluate(() => scrollY);
  expect(before).toBeLessThan(300);
  await banner.getByRole("button", { name: "저장한 위치로" }).click();
  await expect(banner).toBeHidden();
  await expect.poll(() => page.evaluate(() => {
    const content = document.querySelector(".post__content")!;
    return scrollY - (content.getBoundingClientRect().top + scrollY);
  })).toBeGreaterThan(100);

  await page.goto("/");
  await expect(home).toBeVisible();
  await home.getByRole("button", { name: "최근 읽던 글 기록 삭제" }).click();
  await expect(home).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("guseo:reading:last"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("guseo:reading:position:/blog/security/basic2/"))).toBeNull();
});

test("해시 앵커 접근과 만료된 읽기 기록은 복원 안내를 표시하지 않는다", async ({ page }) => {
  await page.goto("/blog/security/basic2/");
  await page.evaluate(() => {
    localStorage.setItem("guseo:reading:position:/blog/security/basic2/", JSON.stringify({
      fraction: 0.4, updatedAt: Date.now() - 40 * 24 * 60 * 60 * 1000
    }));
  });
  await page.reload();
  await expect(page.locator("[data-reading-resume]")).toBeHidden();

  await page.evaluate(() => localStorage.setItem("guseo:reading:position:/blog/security/basic2/", JSON.stringify({
    fraction: 0.4, updatedAt: Date.now()
  })));
  const heading = await page.locator(".post__content h2[id]").first().getAttribute("id");
  expect(heading).toBeTruthy();
  await page.goto("/blog/security/basic2/#" + heading);
  await expect(page.locator("[data-reading-resume]")).toBeHidden();
});

test("일반 코드 블록과 Copy·언어 표시줄은 접기 기능의 영향을 받지 않는다", async ({ page }) => {
  await page.goto("/blog/security/basic3/");
  await expect(page.locator(".post__content .code-block").first()).toBeVisible();
  await expect(page.locator(".code-block--collapsible")).toHaveCount(0);
  await expect(page.locator(".post__content .code-block__expand")).toHaveCount(0);
  await expect(page.locator(".code-copy-button").first()).toBeVisible();
});

test("20줄 초과 코드만 접고 펼치며 복사 버튼은 전체 코드를 유지한다", async ({ page }) => {
  await page.route("**/blog/jpa/persistence-context/", async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    const lines = Array.from({ length: 30 }, (_, i) => "long_java_line_" + i).join("\n");
    const insertion = '<div class="post__content"><pre><code class="language-java">' + lines + "</code></pre>";
    if (!html.includes('<div class="post__content">')) throw new Error("Content marker missing");
    await route.fulfill({ response, body: html.replace('<div class="post__content">', insertion) });
  });
  await page.goto("/blog/jpa/persistence-context/");
  const block = page.locator(".code-block--collapsible");
  await expect(block).toHaveCount(1);
  await expect(block).toHaveClass(/is-collapsed/);
  await expect(block.locator(".code-block__language")).toHaveText("Java");
  const toggle = block.locator(".code-block__expand");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveAttribute("aria-controls", /code-content-/);

  const collapsed = await block.locator("pre").evaluate((node) => node.getBoundingClientRect().height);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toHaveText("접기");
  const expanded = await block.locator("pre").evaluate((node) => node.getBoundingClientRect().height);
  expect(expanded).toBeGreaterThan(collapsed + 20);

  const copy = block.locator(".code-copy-button");
  await copy.click();
  await expect(copy).toHaveText(/Copied|Selected/);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(block).toHaveClass(/is-collapsed/);
  // Collapsing is visual only: the original code text stays in the DOM.
  await expect(block.locator("pre code")).toContainText("long_java_line_29");
});

test("Spring Security의 학습 경로는 상세 글에서도 명시된 순서로 존재한다", async ({ page }) => {
  await page.goto("/blog/security/basic1/");
  const path = page.locator(".post-learning-path");
  await expect(path).toBeVisible();
  await expect(path.locator(".post-series__list li")).toHaveCount(3);
  await expect(path.locator(".post-learning-path__head")).toContainText("1 / 3");
});


test("학습 경로 이동과 전체 게시글 이동은 다른 탐색으로 구분된다", async ({ page }) => {
  await page.goto("/blog/security/basic1/");
  const learning = page.locator(".post-learning-path");
  await expect(learning.locator(".post-learning-path__nav")).toBeVisible();
  await expect(learning.getByRole("link", { name: /다음 단계/ })).toHaveAttribute("href", "/blog/security/basic2/");
  await expect(page.locator(".post-adjacent-context")).toContainText("최근 수정일 순서");
  await expect(page.getByRole("navigation", { name: "전체 게시글의 이전 글과 다음 글" })).toBeVisible();
  await page.goto("/blog/security/basic3/");
  await expect(page.locator(".post-learning-path__nav").getByRole("link", { name: /이전 단계/ }))
    .toHaveAttribute("href", "/blog/security/basic2/");
  await expect(page.locator(".post-learning-path__nav .post-learning-path__next")).toHaveCount(0);
});
