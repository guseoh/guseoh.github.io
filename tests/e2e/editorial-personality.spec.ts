import { expect, test } from "@playwright/test";

const sample = "/blog/ui-preview/code-and-table/";

async function useMode(page: import("@playwright/test").Page, mode: string) {
  await page.goto("/");
  await page.evaluate((next) => localStorage.setItem("theme", next), mode);
  await page.reload();
}

test("홈은 백엔드 핵심 기술 허브와 읽기 동선을 제공한다", async ({ page }) => {
  await page.goto("/");
  const links = page.locator(".archive-hero__stack a");
  await expect(links).toHaveCount(4);
  await expect(links).toHaveText(["01Java", "02Spring", "03Database", "04Security"]);
  await expect(links.first()).toHaveAttribute("href", "/tags/java/");
  await expect(page.locator(".home-featured-card").first()).toBeVisible();
  await expect(page.locator(".home-post-list .post-card--featured")).toHaveCount(1);
  const first = page.locator(".archive-hero__stack a").first();
  await first.focus();
  await expect(first).toBeFocused();
});

test("깊어진 다크 팔레트와 선셋 블로그 잔디가 GitHub 그린과 구분된다", async ({ page }) => {
  await useMode(page, "dark");
  const colors = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries([
      "--bg", "--card-bg", "--home-glow", "--accent", "--accent-strong",
      "--link", "--link-hover", "--post-link", "--post-link-hover",
      "--muted-readable", "--border", "--tag-text", "--code-copy-text",
      "--blog-grass-2", "--blog-grass-4", "--github-grass-4"
    ].map((name) => [name, style.getPropertyValue(name).trim()]));
  });
  expect(colors["--bg"]).toBe("#101010");
  expect(colors["--card-bg"]).toBe("#1a1a1a");
  expect(["#ffffff09", "rgba(255, 255, 255, 0.035)"]).toContain(colors["--home-glow"]);
  for (const name of [
    "--accent", "--accent-strong", "--link", "--link-hover",
    "--post-link", "--post-link-hover", "--muted-readable", "--border",
    "--tag-text", "--code-copy-text"
  ]) {
    const value = colors[name];
    expect(value, name).toMatch(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
    const pairs = value.slice(1).match(/../g);
    expect(new Set(pairs).size, `${name}: ${value}`).toBe(1);
  }
  expect(colors["--blog-grass-2"]).toBe("#a45b24");
  expect(colors["--blog-grass-4"]).toBe("#ffa64b");
  expect(colors["--github-grass-4"]).toBe("#78d9a5");
  await page.locator(".activity-section__details summary").click();
  const blogSample = page.locator(".blog-grass .grass-legend .grass-cell[data-level='4']");
  const githubSample = page.locator(".github-grass .grass-legend .grass-cell[data-level='4']");
  await expect(blogSample).toHaveCSS("background-color", "rgb(255, 166, 75)");
  await expect(githubSample).toHaveCSS("background-color", "rgb(120, 217, 165)");
});

test("코드 복사는 아이콘과 한국어 피드백을 보여주고 초점을 유지한다", async ({ page }) => {
  await page.goto(sample);
  const copy = page.locator(".post__content .code-copy-button").first();
  await expect(copy).toBeVisible();
  await expect(copy.locator("svg")).toHaveCount(1);
  await expect(copy).toHaveAttribute("data-copy-state", "idle");
  await expect(copy).toHaveAttribute("aria-label", "코드 블록 복사");
  await copy.focus();
  await page.keyboard.press("Enter");
  await expect(copy).toHaveAttribute("data-copy-state", /copied|selected/);
  await expect(copy.locator("svg")).toHaveCount(1);
  await expect(copy).toBeFocused();
});

test("모바일·다크·플래너에서 읽기와 홈 카드가 화면을 넘지 않는다", async ({ page }) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 840 });
    for (const mode of ["light", "dark", "planner"]) {
      await useMode(page, mode);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow, mode + " home " + width).toBeLessThanOrEqual(2);
      await page.goto("/blog/ui-preview/typography-and-toc/");
      const articleOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(articleOverflow, mode + " post " + width).toBeLessThanOrEqual(2);
    }
  }
});
