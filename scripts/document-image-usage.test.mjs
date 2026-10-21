import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { inspectDocumentImages, resolveDocumentImage } from "./document-image-usage.mjs";

const root = await mkdtemp(path.join(os.tmpdir(), "blog-document-images-"));
try {
  await mkdir(path.join(root, "docs", "images"), { recursive: true });
  await mkdir(path.join(root, "public", "assets"), { recursive: true });
  const doc = path.join(root, "docs", "review.md");
  const realImage = path.join(root, "docs", "images", "참고 이미지.svg");
  const publicImage = path.join(root, "public", "assets", "logo.png");
  await writeFile(realImage, "<svg></svg>");
  await writeFile(publicImage, "png");

  const source = [
    "![도식](<./images/참고 이미지.svg>)",
    '<img src="/assets/logo.png" alt="logo">',
    "![외부](https://example.org/external.webp)",
    "<!-- ![주석](./images/placeholder.png) -->",
    "```md",
    "![코드 예제](./images/only-example.svg)",
    "```"
  ].join("\n");
  const correct = await inspectDocumentImages(source, doc, root);
  assert.deepEqual(correct.errors, []);
  assert.deepEqual(correct.referenced, [realImage, publicImage]);

  const bad = await inspectDocumentImages("![없는 파일](./images/missing.png)", doc, root);
  assert.match(bad.errors[0], /Missing local image/);
  assert.equal(resolveDocumentImage("./images/%EC%B0%B8%EA%B3%A0%20%EC%9D%B4%EB%AF%B8%EC%A7%80.svg", doc, root), realImage);
  assert.equal(resolveDocumentImage("https://example.org/a.png", doc, root), null);
  assert.equal(resolveDocumentImage("/og-image.svg", doc, root), null);
  assert.throws(() => resolveDocumentImage("%ZZ.svg", doc, root), /Invalid image URL encoding/);
  assert.throws(() => resolveDocumentImage("../../outside/file.png", path.join(root, "README.md"), root), /escapes repository/);
  console.log("Document image references, missing assets, comments and path boundaries passed.");
} finally {
  await rm(root, { recursive: true, force: true });
}
