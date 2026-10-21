import assert from "node:assert/strict";
import path from "node:path";
import { collectImageReferences, resolveLocalImageReference } from "./image-usage.mjs";

const root = path.resolve("src/content/blog");
const post = path.join(root, "jpa", "sample.md");
const content = [
  "![본문 이미지](image.png \"caption: 설명\")",
  "![캡션 있는 이미지](<스크린샷 2026-08-20 150056.png> \"caption: 공백 경로\")",
  '<img alt="직접 지정" src="asset.webp">',
  "![중복](image.png)",
  "![외부](https://example.com/remote.png)",
  "```md",
  "![코드 예시는 실제 이미지가 아님](example-only.png)",
  "```"
].join("\n");

assert.deepEqual(collectImageReferences(content), [
  "image.png",
  "스크린샷 2026-08-20 150056.png",
  "asset.webp",
  "https://example.com/remote.png"
]);

assert.equal(resolveLocalImageReference("image.png", post, root), path.join(root, "jpa", "image.png"));
assert.equal(resolveLocalImageReference("photo%20one.png?cache=1", post, root), path.join(root, "jpa", "photo one.png"));
assert.equal(resolveLocalImageReference("/og-image.svg", post, root), null);
assert.equal(resolveLocalImageReference("https://example.com/image.png", post, root), null);
assert.equal(resolveLocalImageReference("readme.txt", post, root), null);
assert.throws(() => resolveLocalImageReference("%GG.png", post, root), /Invalid encoded/);
assert.throws(() => resolveLocalImageReference("../../../../escape.png", post, root), /escapes blog directory/);
assert.throws(() => resolveLocalImageReference("../../../elsewhere.png", post, root), /escapes blog directory/);

console.log("Image usage parsing and safe path checks passed.");
