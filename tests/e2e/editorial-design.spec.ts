import { expect, test } from "@playwright/test";

test("상세 글의 제목·설명·메타정보는 모든 테마에서 한 시작선에 정렬된다", async ({ page }) => {
  for (const width of [375, 768, 1280, 1800]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["light", "dark", "planner"]) {
      await page.goto("/blog/security/basic1/");
      await page.evaluate((m) => localStorage.setItem("theme", m), mode);
      await page.reload();

      const bounds = await page.evaluate(() => {
        const selectors = [
          ".post__header h1",
          ".post__header > .post__description",
          ".post__header > .post-meta-grid",
          ".post__header > .post-meta-tags"
        ];
        return selectors.map((selector) => {
          const element = document.querySelector(selector);
          if (!(element instanceof HTMLElement)) throw new Error("Missing: " + selector);
          const rectangle = element.getBoundingClientRect();
          return { x: rectangle.left, right: rectangle.right, width: rectangle.width };
        });
      });

      for (const block of bounds.slice(1)) {
        expect(Math.abs(block.x - bounds[0].x), `${mode} / ${width}px`).toBeLessThanOrEqual(3);
        expect(block.right, `${mode} / ${width}px`).toBeLessThanOrEqual(width + 2);
      }
    }
  }
});

test("메인 소개는 실제 주제 탐색과 결합되고 모바일에서는 한 열로 정렬된다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const hero = page.locator(".archive-hero--simple");
  const topics = page.getByRole("navigation", { name: "주제 바로가기" });
  await expect(topics.locator(".archive-hero__topic-link")).toHaveCount(3);
  expect(await hero.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length)).toBe(2);
  const firstTopic = topics.locator(".archive-hero__topic-link").first();
  const href = await firstTopic.getAttribute("href");
  expect(href).toMatch(/^\/categories\/.+\/$/);
  await firstTopic.click();
  await expect(page).toHaveURL(new RegExp(href!.replaceAll("/", "\\/")));

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  expect(await hero.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length)).toBe(1);
  await expect(topics).toBeVisible();
});

test("다크 모드는 단색 회색 대신 단계적 배경과 차분한 강조색을 사용한다", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("theme", "dark"));
  await page.reload();
  const palette = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(["--bg", "--surface", "--surface-2", "--card-bg", "--accent", "--link"]
      .map((name) => [name, style.getPropertyValue(name).trim()]));
  });
  expect(new Set([palette["--bg"], palette["--surface"], palette["--surface-2"]]).size).toBe(3);
  expect(palette["--accent"]).not.toBe("#c7c7c7");
  expect(palette["--link"]).not.toBe("#d8d8d8");
  await expect(page.locator(".archive-hero--simple")).toBeVisible();
});

test("SQL·Java·HTTP·YAML 언어 코드 블록은 어두운 코드 테마를 공통 사용한다", async ({ page }) => {
  const cases = [
    { path: "/blog/jpa/relationship-mapping/", language: /java/i },
    { path: "/blog/jpa/relationship-mapping/", language: /sql/i },
    { path: "/blog/security/basic2/", language: /http/i },
    { path: "/blog/db/flyway/flyway/", language: /yaml/i }
  ];
  for (const entry of cases) {
    await page.goto(entry.path);
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();
    const code = page.locator(".code-block").filter({ has: page.locator(".code-block__language").filter({ hasText: entry.language }) }).first();
    await expect(code).toBeVisible();
    const colors = await code.locator(".astro-code span").evaluateAll((nodes) => [
      ...new Set(nodes.slice(0, 300).map((node) => getComputedStyle(node).color))
    ]);
    expect(colors.length, entry.language.source).toBeGreaterThan(1);
    await expect(code.locator(".code-copy-button")).toBeVisible();
  }
});
