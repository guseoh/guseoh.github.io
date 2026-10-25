import { expect, test } from "@playwright/test";

const pagePath = "/blog/security/basic1/";
const fixtures = [
  '<pre data-language="java" data-code-tab-group="example" data-code-tab-title="Java" data-code-diff-state="before"><code class="language-java"><span class="line">int a = 1;</span></code></pre>',
  '<pre data-language="java" data-code-tab-group="example" data-code-tab-title="수정 후" data-code-diff-state="after"><code class="language-java"><span class="line">int a = 2;</span></code></pre>',
  '<section class="learning-block" data-learning-block="tabs"><div data-learning-tabs>',
  '<section class="learning-tabs__panel" data-learning-panel><h4>JDBC</h4><p>SQL</p></section>',
  '<section class="learning-tabs__panel" data-learning-panel><h4>JPA</h4><p>ORM</p></section>',
  '</div></section>',
  '<section class="learning-block" data-learning-block="tree"><ul class="learning-tree"><li><details open><summary>src/</summary><ul><li>Article.java</li></ul></details></li></ul></section>',
  '<section class="learning-block" data-learning-block="steps"><ol class="learning-steps"><li>Prepare</li><li>Run</li></ol></section>',
  '<section class="learning-block" data-learning-block="run"><div data-learning-run><pre data-learning-expression>1 + 2 * 3</pre><div class="learning-run__actions"><button type="button" data-learning-execute>실행</button><button type="button" data-learning-reset>초기화</button></div><output data-learning-output role="status">실행 전</output></div></section>',
  '<section class="learning-block" data-learning-block="mermaid"><figure data-learning-mermaid><pre data-learning-mermaid-source>flowchart LR\nA-->B</pre><figcaption>Mermaid 원본</figcaption></figure></section>',
  '<section class="learning-block" data-learning-block="math"><div class="learning-math" data-learning-math="E=mc^2" data-math-display="true">E=mc^2</div></section>'
].join("");

test.beforeEach(async ({ page }) => {
  await page.route("**" + pagePath, async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    const marker = '<div class="post__content">';
    if (!html.includes(marker)) throw new Error("Post content marker missing");
    await route.fulfill({ response, body: html.replace(marker, marker + fixtures) });
  });
  // CDN-independent: the semantic Mermaid/LaTeX source must remain readable.
  await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
  await page.goto(pagePath);
});

test("기존 코드 Copy/줄 번호와 공존하는 인접 코드 탭은 키보드로 전환된다", async ({ page }) => {
  const tabs = page.getByRole("tablist", { name: "코드 버전" });
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole("tab")).toHaveCount(2);
  const java = tabs.getByRole("tab", { name: "Java" });
  await expect(java).toHaveAttribute("aria-selected", "true");
  await java.focus();
  await page.keyboard.press("ArrowRight");
  const after = tabs.getByRole("tab", { name: "수정 후" });
  await expect(after).toHaveAttribute("aria-selected", "true");
  const panel = page.locator(".code-tab-group > [role='tabpanel']:not([hidden])");
  await expect(panel).toContainText("int a = 2;");
  await expect(panel.locator("code > .line.is-added")).toHaveCount(1);
  await expect(panel.getByRole("button", { name: "코드 블록 복사" })).toBeVisible();
});

test("일반 본문 탭과 파일 트리/단계 가이드는 스크립트 없이도 텍스트 의미가 보존된다", async ({ page }) => {
  const tabs = page.getByRole("tablist", { name: "설명 내용 선택" });
  await expect(tabs.getByRole("tab")).toHaveCount(2);
  await tabs.getByRole("tab", { name: "JPA" }).click();
  await expect(page.locator(".learning-tabs__panel:not([hidden])")).toContainText("ORM");
  const tree = page.locator(".learning-tree");
  await expect(tree.getByText("Article.java")).toBeVisible();
  await tree.getByText("src/").click();
  await expect(tree.getByText("Article.java")).toBeHidden();
  await expect(page.locator(".learning-steps li")).toHaveText(["Prepare", "Run"]);
});

test("숫자 수식 실행은 sandbox 프레임과 결과/초기화 제어를 제공한다", async ({ page }) => {
  const runner = page.locator("[data-learning-run]");
  await runner.getByRole("button", { name: "실행" }).click();
  await expect(runner.locator("[data-learning-output]")).toContainText("결과: 7");
  await runner.getByRole("button", { name: "초기화" }).click();
  await expect(runner.locator("[data-learning-output]")).toHaveText("실행 전");
});

test("Mermaid/LaTeX CDN 실패 시 원본을 남겨 본문을 읽을 수 있다", async ({ page }) => {
  await expect(page.locator("[data-learning-mermaid-source]")).toContainText("flowchart LR");
  await expect(page.locator("[data-learning-math]")).toContainText("E=mc^2");
  await expect(page.locator(".post__content")).toBeVisible();
});
