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

test("다크 모드는 청록색 없이 중립 차콜 계층과 충분한 대비를 유지한다", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("theme", "dark"));
  await page.reload();
  const palette = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const names = [
      "--bg", "--bg-deep", "--surface", "--surface-2", "--card-bg", "--post-bg",
      "--ink", "--heading", "--muted-readable", "--accent", "--accent-strong",
      "--link", "--link-hover", "--post-link", "--post-link-hover",
      "--tag-bg", "--tag-border", "--tag-text", "--code-copy-text",
      "--code-inline-bg", "--code-inline-text", "--blog-grass-1", "--blog-grass-2",
      "--blog-grass-3", "--blog-grass-4"
    ];
    return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name).trim()]));
  });
  const rgb = (hex: string): number[] => {
    expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  };
  const brightness = (hex: string): number => {
    const [r, g, b] = rgb(hex).map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string): number => {
    const la = brightness(a), lb = brightness(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  // Dark surfaces should have subtle brightness layers, not blue/green casts.
  const surfaces = ["--bg", "--bg-deep", "--surface", "--surface-2", "--card-bg", "--post-bg"];
  expect(new Set(surfaces.map((name) => palette[name])).size).toBeGreaterThanOrEqual(4);
  for (const name of surfaces) {
    const channels = rgb(palette[name]);
    expect(Math.max(...channels) - Math.min(...channels), name).toBeLessThanOrEqual(10);
  }
  // UI semantic tokens may be neutral or muted violet/blue, never turquoise.
  const isTeal = (hex: string): boolean => {
    const [red, green, blue] = rgb(hex);
    return green > red + 20 && blue > red + 18 && Math.abs(green - blue) < 58;
  };
  for (const [name, color] of Object.entries(palette)) {
    expect(isTeal(color), `${name} should not be teal: ${color}`).toBe(false);
  }
  for (const [fg, bg] of [
    ["--ink", "--bg"], ["--heading", "--post-bg"], ["--muted-readable", "--surface"],
    ["--link", "--card-bg"], ["--tag-text", "--tag-bg"],
    ["--code-inline-text", "--code-inline-bg"]
  ]) {
    expect(contrast(palette[fg], palette[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  }
  await expect(page.locator(".archive-hero--simple")).toBeVisible();
});

test("다크 팔레트 변경은 Light와 Planner 모드를 변경하지 않는다", async ({ page }) => {
  await page.goto("/");
  for (const [mode, expectedBackground] of [
    ["light", "#f7f9fc"],
    ["planner", "#131517"]
  ]) {
    await page.evaluate((value) => localStorage.setItem("theme", value), mode);
    await page.reload();
    const theme = await page.evaluate(() => ({
      mode: document.documentElement.dataset.themeMode,
      bg: getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()
    }));
    expect(theme.mode).toBe(mode);
    expect(theme.bg).toBe(expectedBackground);
  }
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
