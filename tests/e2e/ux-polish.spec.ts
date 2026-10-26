import { expect, test } from "@playwright/test";

test("홈의 최근 글 강조와 주요 CTA가 정상적으로 보인다", async ({ page }) => {
  await page.goto("/");
  const latest = page.locator("#home-latest-post-list .post-card");
  await expect(latest.first()).toHaveClass(/post-card--featured/);
  await expect(latest.first().locator(".post-card__eyebrow")).toHaveText("최근 발행");
  await expect(latest.nth(1)).not.toHaveClass(/post-card--featured/);

  const cta = page.getByRole("link", { name: "최근 글 읽기" });
  await expect(cta).toHaveAttribute("href", "#home-latest-posts");
  const bg = await cta.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(bg).not.toBe("rgba(0, 0, 0, 0)");
});

test("홈 최근 글은 균형 잡힌 2열, 전체 글은 3열 그리드를 사용한다", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ["/", "/blog/"]) {
    await page.goto(route);
    const grid = route === "/" ? page.locator("#home-latest-post-list") : page.locator("#blog-post-list");
    const toggle = route === "/"
      ? page.locator('[data-view-list-id="home-latest-post-list"]')
      : page.locator('[data-view-list-id="blog-post-list"]');
    await toggle.getByRole("button", { name: "그리드 보기" }).click();
    await expect(grid).toHaveAttribute("data-view", "grid");
    const widths = await grid.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length);
    expect(widths).toBe(route === "/" ? 2 : 3);
  }
});

test("데스크톱 목록 보기는 제목과 메타 정보의 두 영역으로 구성된다", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/blog/");
  await page.locator('[data-view-list-id="blog-post-list"]').getByRole("button", { name: "목록 보기" }).click();
  const list = page.locator("#blog-post-list");
  await expect(list).toHaveAttribute("data-view", "list");
  const card = list.locator(".post-card").first();
  const state = await card.evaluate((element) => {
    const header = element.querySelector(".post-card__header")?.getBoundingClientRect();
    const footer = element.querySelector(".post-card__footer")?.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { display: style.display, columns: style.gridTemplateColumns.split(" ").length, headerRight: header?.right ?? 0, footerLeft: footer?.left ?? 0 };
  });
  expect(state.display).toBe("grid");
  expect(state.columns).toBe(2);
  expect(state.footerLeft).toBeGreaterThan(state.headerRight);
  await page.reload();
  await expect(list).toHaveAttribute("data-view", "list");
});

test("테마·좁은 화면에서 콘텐츠·검색·목차를 읽고 조작할 수 있다", async ({ page }) => {
  for (const width of [375, 768, 1280, 1800]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["light", "dark", "planner"]) {
      await page.goto("/blog/security/basic3/");
      await page.evaluate((value) => localStorage.setItem("theme", value), mode);
      await page.reload();
      await expect(page.locator(".post__content")).toBeVisible();
      const geometry = await page.locator(".post-column").boundingBox();
      expect(geometry).not.toBeNull();
      expect(geometry!.x).toBeGreaterThanOrEqual(-2);
      expect(geometry!.x + geometry!.width).toBeLessThanOrEqual(width + 2);
    }
  }
});

test("모바일 검색·목차 토글은 충분한 터치 크기를 갖는다", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/blog/security/basic3/");
  const toc = page.getByRole("button", { name: "이 글의 목차" });
  const tocBox = await toc.boundingBox();
  expect(tocBox).not.toBeNull();
  expect(tocBox!.height).toBeGreaterThanOrEqual(40);
  await toc.click();
  await expect(toc).toHaveAttribute("aria-expanded", "true");

  await page.goto("/search/");
  const input = page.getByRole("searchbox", { name: "검색어", exact: true });
  const inputBox = await input.boundingBox();
  expect(inputBox).not.toBeNull();
  expect(inputBox!.height).toBeGreaterThanOrEqual(40);
});

// Compare concrete computed styles and geometry instead of keeping fragile
// pixel-perfect snapshots tied to changing post dates and activity totals.
test("CSS 중복 정리 후 홈 Hero의 간격·글줄·경계가 테마와 화면 크기에 관계없이 유지된다", async ({ page }) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["light", "dark", "planner"]) {
      await page.goto("/");
      await page.evaluate((value) => localStorage.setItem("theme", value), mode);
      await page.reload();

      const layout = await page.evaluate(() => {
        const hero = document.querySelector(".archive-hero--simple");
        const title = hero?.querySelector("h1");
        const lead = hero?.querySelector(".archive-hero__lead");
        if (!(hero instanceof HTMLElement) || !(title instanceof HTMLElement)
          || !(lead instanceof HTMLElement)) throw new Error("Missing home hero");

        const heroStyle = getComputedStyle(hero);
        const titleStyle = getComputedStyle(title);
        const leadStyle = getComputedStyle(lead);
        const bounds = [hero, title, lead].map((node) => {
          const { left, right } = node.getBoundingClientRect();
          return { left, right };
        });
        return {
          radius: Number.parseFloat(heroStyle.borderTopLeftRadius),
          titleLineRatio: Number.parseFloat(titleStyle.lineHeight) / Number.parseFloat(titleStyle.fontSize),
          leadLineRatio: Number.parseFloat(leadStyle.lineHeight) / Number.parseFloat(leadStyle.fontSize),
          marginTop: Number.parseFloat(leadStyle.marginTop),
          bounds
        };
      });

      expect(layout.radius, `${mode} / ${width}px`).toBeCloseTo(14, 1);
      expect(layout.titleLineRatio).toBeCloseTo(1.29, 1);
      expect(layout.leadLineRatio).toBeCloseTo(1.62, 1);
      expect(layout.marginTop).toBeGreaterThan(0);
      for (const bounds of layout.bounds) {
        expect(bounds.left, `${mode} / ${width}px`).toBeGreaterThanOrEqual(-2);
        expect(bounds.right, `${mode} / ${width}px`).toBeLessThanOrEqual(width + 2);
      }
    }
  }
});

test("코드 블록의 언어 레이블과 Copy 버튼은 공통 테마에서 읽기 쉽고 겹치지 않는다", async ({ page }) => {
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["light", "dark", "planner"]) {
      await page.goto("/blog/jpa/relationship-mapping/");
      await page.evaluate((value) => localStorage.setItem("theme", value), mode);
      await page.reload();

      const code = page.locator(".code-block").filter({
        has: page.locator(".code-block__language").filter({ hasText: /java/i })
      }).first();
      await expect(code).toBeVisible();
      const sizes = await code.evaluate((element) => {
        const header = element.querySelector(".code-block__header");
        const label = element.querySelector(".code-block__language");
        const copy = element.querySelector(".code-copy-button");
        if (!(header instanceof HTMLElement) || !(label instanceof HTMLElement)
          || !(copy instanceof HTMLElement)) throw new Error("Missing code toolbar");
        const h = header.getBoundingClientRect();
        const l = label.getBoundingClientRect();
        const c = copy.getBoundingClientRect();
        return {
          headerHeight: h.height,
          copyHeight: c.height,
          labelFont: Number.parseFloat(getComputedStyle(label).fontSize),
          overlap: l.left < c.right - 1 && l.right > c.left + 1
            && l.top < c.bottom - 1 && l.bottom > c.top + 1
        };
      });

      expect(sizes.copyHeight).toBeGreaterThanOrEqual(24);
      expect(sizes.headerHeight).toBeGreaterThanOrEqual(sizes.copyHeight - 1);
      expect(sizes.labelFont).toBeGreaterThan(8);
      expect(sizes.labelFont).toBeLessThan(15);
      expect(sizes.overlap, `${mode} / ${width}px`).toBe(false);
    }
  }
});

// Keep viewable screenshots in CI artifacts for manual before/after review.
// Screenshots complement geometry assertions; they do not alone prove visual quality.
test("대표 화면 스크린샷을 수집한다", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));
  const cases = [
    { route: "/", slug: "home", width: 1440, mode: "dark" },
    { route: "/", slug: "home", width: 1440, mode: "light" },
    { route: "/", slug: "home-mobile", width: 375, mode: "dark" },
    { route: "/blog/", slug: "posts", width: 1440, mode: "light" },
    { route: "/blog/", slug: "posts-mobile", width: 375, mode: "dark" },
    { route: "/search/?q=JPA", slug: "search", width: 1440, mode: "dark" },
    { route: "/search/?q=JPA", slug: "search-mobile", width: 375, mode: "light" },
    { route: "/categories/", slug: "categories-mobile", width: 375, mode: "light" },
    { route: "/blog/security/basic3/", slug: "article", width: 1800, mode: "dark" },
    { route: "/blog/security/basic3/", slug: "article-wide", width: 1800, mode: "light" },
    { route: "/blog/security/basic3/", slug: "article-mobile", width: 375, mode: "light" },
    { route: "/blog/security/basic3/", slug: "article-mobile", width: 375, mode: "dark" },
    { route: "/blog/security/basic3/", slug: "article-planner", width: 1440, mode: "planner" }
  ] as const;

  for (const item of cases) {
    await page.setViewportSize({ width: item.width, height: 900 });
    await page.goto(item.route);
    await page.evaluate((mode) => {
      localStorage.setItem("theme", mode);
      localStorage.setItem("blog-left-sidebar-collapsed", "false");
    }, item.mode);
    await page.reload();
    await expect(page.locator("main h1")).toBeVisible();
    await page.screenshot({ path: `test-results/ui-review/${item.slug}-${item.mode}-${item.width}.png`, fullPage: false, animations: "disabled" });
  }
});
