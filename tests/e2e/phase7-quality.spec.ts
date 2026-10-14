import { expect, test } from "@playwright/test";

const pngMagic = [137, 80, 78, 71, 13, 10, 26, 10];

test("홈 공유 이미지는 1200×630 PNG로 제공하며 OG/Twitter 메타가 일치한다", async ({ page, request }) => {
  await page.goto("/");
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  const twitter = await page.locator('meta[name="twitter:image"]').getAttribute("content");
  expect(og).toMatch(/\/og-image\.png$/);
  expect(twitter).toBe(og);
  await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute("content", "image/png");
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");

  const response = await request.get(og!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const bytes = await response.body();
  expect([...bytes.subarray(0, 8)]).toEqual(pngMagic);
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.readUInt32BE(20)).toBe(630);
  expect(bytes.length).toBeLessThan(600000);
});

test("게시글마다 제목에 맞는 PNG OG 이미지와 기존 SVG 주소를 함께 제공한다", async ({ page, request }) => {
  await page.goto("/blog/security/basic1/");
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(og).toMatch(/\/og\/security\/basic1\.png$/);
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /인증과 인가는 무엇일까/);
  await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute("content", "image/png");

  const png = await request.get(og!);
  expect(png.ok()).toBe(true);
  const bytes = await png.body();
  expect([...bytes.subarray(0, 8)]).toEqual(pngMagic);
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.readUInt32BE(20)).toBe(630);
  expect(bytes.length).toBeLessThan(600000);

  const svg = await request.get("/og/security/basic1.svg");
  expect(svg.ok()).toBe(true);
  const svgText = await svg.text();
  expect(svgText).toContain("<svg");
  expect(svgText).not.toMatch(/#0f7285|#0a7185/i);
});

test("본문 이미지에는 지연 로딩과 비동기 디코딩을 적용하고 대체 텍스트를 유지한다", async ({ page }) => {
  await page.goto("/blog/jpa/persistence-context/");
  const images = page.locator(".post__content img");
  expect(await images.count()).toBeGreaterThan(0);
  for (const image of await images.all()) {
    await expect(image).toHaveAttribute("loading", "lazy");
    await expect(image).toHaveAttribute("decoding", "async");
    await expect(image).toHaveAttribute("alt", /.+/);
  }
  const first = images.first();
  await first.scrollIntoViewIfNeeded();
  await expect(first).toBeVisible();
});

test("320px 모바일과 200% 텍스트 확대에서 주요 조작 요소와 게시글이 보인다", async ({ page }) => {
  const paths = ["/", "/blog/", "/search/?q=JPA", "/blog/jpa/persistence-context/"];
  for (const width of [320, 400]) {
    await page.setViewportSize({ width, height: 812 });
    for (const path of paths) {
      await page.goto(path);
      if (width === 400) {
        await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      }
      await expect(page.locator("main h1")).toHaveCount(1);
      const geometry = await page.evaluate(() => ({
        width: innerWidth,
        pageWidth: document.documentElement.scrollWidth,
        mainWidth: document.getElementById("main-content")?.getBoundingClientRect().width ?? 0
      }));
      expect(geometry.pageWidth, path + " " + width).toBeLessThanOrEqual(width + 2);
      expect(geometry.mainWidth).toBeGreaterThan(100);
      if (path.includes("/blog/jpa")) {
        await expect(page.locator(".post__header h1")).toBeVisible();
        await expect(page.locator(".post-back-to-top")).toBeVisible();
      }
    }
  }
});
