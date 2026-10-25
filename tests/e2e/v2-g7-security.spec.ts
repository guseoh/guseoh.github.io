import { expect, test } from "@playwright/test";

test("모르는 참고 사이트를 렌더링해도 외부 favicon 요청이 발생하지 않는다", async ({ page }) => {
  const externalFavicons: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/^https?:\/\//.test(url) && /\/favicon\.ico(?:\?|$)/.test(url)
      && !url.startsWith("http://127.0.0.1")) externalFavicons.push(url);
  });
  await page.route("**/blog/security/basic1/", async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    const marker = '<div class="post__content">';
    if (!html.includes(marker)) throw new Error("Article content marker missing");
    const injection = '<h2>참고 자료</h2><p><a href="https://example.org/guide">Unknown reference</a>' +
      '<a href="https://docs.spring.io/spring-framework/reference/">Spring Docs</a></p>';
    await route.fulfill({ response, body: html.replace(marker, marker + injection) });
  });
  await page.goto("/blog/security/basic1/");
  const reference = page.locator(".reference-link").filter({ hasText: "Unknown reference" });
  await expect(reference).toBeVisible();
  await expect(reference.locator(".reference-link__icon--generic svg")).toHaveCount(1);
  await expect(reference.locator("img")).toHaveCount(0);
  expect(externalFavicons).toEqual([]);
});

test("Mermaid 렌더러가 외부 이미지를 포함한 SVG를 반환하면 원문을 유지한다", async ({ page }) => {
  await page.route("**/blog/security/basic1/", async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    const marker = '<div class="post__content">';
    if (!html.includes(marker)) throw new Error("Article content marker missing");
    const injection = '<section class="learning-block learning-block--mermaid"><figure data-learning-mermaid>' +
      '<pre data-learning-mermaid-source>flowchart LR\nA-->B</pre></figure></section>';
    await route.fulfill({ response, body: html.replace(marker, marker + injection) });
  });
  await page.route("https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.esm.min.mjs", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/javascript",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: 'export default { initialize(){}, async render(){return {svg: "<svg xmlns=\\"http://www.w3.org/2000/svg\\"><image href=\\"https://example.org/tracker.png\\"/></svg>"}} }'
    })
  );
  await page.goto("/blog/security/basic1/");
  const mermaid = page.locator("[data-learning-mermaid]");
  await expect(mermaid).toHaveAttribute("data-mermaid-failed", "true");
  await expect(mermaid.locator("[data-learning-mermaid-source]")).toContainText("flowchart LR");
  await expect(mermaid.locator("svg")).toHaveCount(0);
});
