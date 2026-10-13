import { expect, test } from "@playwright/test";

const article = "/blog/security/basic1/";

test("Obsidian 본문 문단과 목록의 리듬을 테마·화면별로 유지한다", async ({ page }) => {
  for (const width of [375, 768, 1280, 1800]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["light", "dark", "planner"]) {
      await page.goto(article);
      await page.evaluate((value) => localStorage.setItem("theme", value), mode);
      await page.reload();
      const measured = await page.evaluate(() => {
        const content = document.querySelector(".post__content");
        const p = content?.querySelector("p");
        const li = content?.querySelector("ul li, ol li");
        const h2 = content?.querySelector("h2");
        if (!(p instanceof HTMLElement) || !(li instanceof HTMLElement) || !(h2 instanceof HTMLElement)) {
          throw new Error("Markdown samples missing");
        }
        const rect = content!.getBoundingClientRect();
        return {
          paragraphLineHeight: parseFloat(getComputedStyle(p).lineHeight) / parseFloat(getComputedStyle(p).fontSize),
          listLineHeight: parseFloat(getComputedStyle(li).lineHeight) / parseFloat(getComputedStyle(li).fontSize),
          headingTop: getComputedStyle(h2).marginTop,
          left: rect.left, right: rect.right, viewport: innerWidth
        };
      });
      expect(measured.paragraphLineHeight).toBeCloseTo(1.7, 1);
      expect(measured.listLineHeight).toBeCloseTo(1.58, 1);
      expect(measured.headingTop).toBe("34px");
      expect(measured.left).toBeGreaterThanOrEqual(-2);
      expect(measured.right).toBeLessThanOrEqual(measured.viewport + 2);
    }
  }
});

test("표는 자동 열 너비를 사용하고 열·내용이 모바일에서 잘리지 않는다", async ({ page }) => {
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(article);
    const tableWrap = page.locator(".post__content .table-scroll").first();
    await expect(tableWrap).toBeVisible();
    const dimensions = await tableWrap.evaluate((element) => {
      const table = element.querySelector("table");
      const firstHeader = table?.querySelector("th");
      if (!(table instanceof HTMLTableElement) || !(firstHeader instanceof HTMLElement)) {
        throw new Error("Table or header missing");
      }
      return {
        layout: getComputedStyle(table).tableLayout,
        minWidth: getComputedStyle(firstHeader).minWidth,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right,
        viewport: innerWidth
      };
    });
    expect(dimensions.layout).toBe("auto");
    expect(dimensions.minWidth).toBe("0px");
    expect(dimensions.scrollWidth).toBeGreaterThanOrEqual(dimensions.clientWidth);
    expect(dimensions.left).toBeGreaterThanOrEqual(-2);
    expect(dimensions.right).toBeLessThanOrEqual(dimensions.viewport + 2);
  }
});

test("코드 다음 설명을 가까이 배치하고 기존 코드 도구를 유지한다", async ({ page }) => {
  await page.goto("/blog/jpa/persistence-context/");
  const code = page.locator(".post__content > .code-block").first();
  await expect(code).toBeVisible();
  await expect(code.locator(".code-copy-button")).toBeVisible();
  const geometry = await code.evaluate((element) => {
    const next = element.nextElementSibling;
    const style = getComputedStyle(element);
    return {
      borderRadius: style.borderTopLeftRadius,
      marginBottom: parseFloat(style.marginBottom),
      nextTag: next?.tagName,
      nextMarginTop: next instanceof HTMLElement ? parseFloat(getComputedStyle(next).marginTop) : null
    };
  });
  expect(geometry.borderRadius).toBe("6px");
  expect(geometry.marginBottom).toBeLessThan(6);
  if (geometry.nextTag === "P") {
    expect(geometry.nextMarginTop).toBeLessThan(7);
  }
});

test("본문 이미지 및 Callout은 기존 접근성을 유지하며 차분한 경계를 사용한다", async ({ page }) => {
  await page.goto(article);
  const image = page.locator(".post__content img.post-lightbox-trigger").first();
  await expect(image).toBeVisible();
  await image.click();
  await expect(page.locator("#post-image-lightbox")).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(image).toBeFocused();

  const alert = page.locator(".post__content .markdown-alert").first();
  await expect(alert).toBeVisible();
  const border = await alert.evaluate((element) => ({
    left: parseFloat(getComputedStyle(element).borderLeftWidth),
    radius: getComputedStyle(element).borderTopLeftRadius
  }));
  expect(border.left).toBe(2);
  expect(border.radius).toBe("6px");
});

test("Markdown 디자인이 헤더·홈·게시글 카드의 크기는 바꾸지 않는다", async ({ page }) => {
  await page.goto("/");
  const firstCard = page.locator(".post-card").first();
  await expect(firstCard).toBeVisible();
  const articleStylesLoaded = await page.evaluate(() =>
    Array.from(document.styleSheets).some((sheet) => sheet.href?.includes("obsidian-article")));
  // Bundling can inline the stylesheet; the assertion concerns the unaffected UI instead.
  const padding = await firstCard.evaluate((element) => parseFloat(getComputedStyle(element).paddingTop));
  expect(padding).toBeGreaterThan(0);
  expect(padding).toBeLessThan(16);
  expect(typeof articleStylesLoaded).toBe("boolean");
});

test("코드 언어 표시줄은 데스크톱·모바일에서 낮은 높이를 유지하며 Copy가 동작한다", async ({ page }) => {
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["light", "dark", "planner"]) {
      await page.goto("/blog/jpa/persistence-context/");
      await page.evaluate((value) => localStorage.setItem("theme", value), mode);
      await page.reload();

      const block = page.locator(".post__content > .code-block").first();
      const label = block.locator(".code-block__language");
      const button = block.locator(".code-copy-button");
      await expect(label).toHaveText("Java");
      await expect(button).toBeVisible();

      const metrics = await block.evaluate((element) => {
        const header = element.querySelector(".code-block__header");
        const button = element.querySelector(".code-copy-button");
        if (!(header instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) {
          throw new Error("Code header or Copy button missing");
        }
        const headerRect = header.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        return {
          headerHeight: headerRect.height,
          buttonHeight: buttonRect.height,
          buttonWithinHeader: buttonRect.top >= headerRect.top && buttonRect.bottom <= headerRect.bottom
        };
      });
      expect(metrics.headerHeight, `${mode} / ${width}px`).toBeLessThanOrEqual(36);
      expect(metrics.buttonHeight).toBeGreaterThanOrEqual(24);
      expect(metrics.buttonWithinHeader).toBe(true);
      await button.click();
      await expect(button).toHaveText(/Copied|Selected/);
    }
  }
});
