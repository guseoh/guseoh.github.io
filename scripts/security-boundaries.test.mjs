import assert from "node:assert/strict";
import { remarkLinkMention } from "../src/plugins/remark-link-mention.mjs";

function renderDirective(value) {
  const tree = { type: "root", children: [
    { type: "paragraph", children: [{ type: "text", value }] }
  ] };
  remarkLinkMention({ site: "https://guseoh.github.io" })(tree);
  return tree.children[0];
}
const unsafe = renderDirective(
  '::link-mention {url="https://example.com/a" title="<img src=x onerror=alert(1)>" image="http://example.com/preview.png" icon="http://example.com/favicon.ico"}'
);
assert.equal(unsafe.type, "html");
assert.ok(unsafe.value.includes("&lt;img src=x onerror=alert(1)&gt;"));
assert.ok(!unsafe.value.includes('src="http://example.com/preview.png"'));
assert.ok(!unsafe.value.includes('src="http://example.com/favicon.ico"'));
const httpArticle = renderDirective('::link-mention {url="http://example.com/hello" title="External article"}');
assert.equal(httpArticle.type, "html"); // existing link policy is preserved
assert.ok(httpArticle.value.includes('rel="noopener noreferrer"'));

for (const url of ["//example.org/evil", "javascript:alert(1)", "data:text/html,evil"]) {
  const result = renderDirective('::link-mention {url="' + url + '" title="bad"}');
  assert.equal(result.type, "paragraph", "Unsafe URL treated as literal Markdown text");
}
const local = renderDirective('::link-mention {url="/blog/security/basic1/" image="/og-image.png"}');
assert.equal(local.type, "html");
assert.ok(local.value.includes('data-link-mention="internal"'));
assert.ok(local.value.includes('src="/og-image.png"'));

console.log("[security:boundaries] Link mention URL, image transport, HTML escaping validated.");
