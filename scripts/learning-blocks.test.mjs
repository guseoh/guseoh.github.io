import assert from "node:assert/strict";
import { validateLearningFence, remarkLearningBlocks } from "../src/plugins/remark-learning-blocks.mjs";
import { rehypeLearningBlocks } from "../src/plugins/rehype-learning-blocks.mjs";
import { parseCodeMeta } from "../src/plugins/remark-code-meta.mjs";

assert.equal(parseCodeMeta('tabGroup="setup" tabTitle="Java" diffState="before"', 2, "test").tabGroup, "setup");
assert.equal(parseCodeMeta('tabGroup="setup" tabTitle="Java" diffState="before"', 2, "test").diffState, "before");
assert.throws(() => parseCodeMeta('tabGroup="../unsafe"', 2, "test"), /Invalid tabGroup/);
assert.doesNotThrow(() => validateLearningFence("learn-run", "1 + 2 * (3 - 1)"));
assert.throws(() => validateLearningFence("learn-run", "alert(1)"), /numeric arithmetic/);
assert.throws(() => validateLearningFence("mermaid", "flowchart LR\nclick A href"), /Unsupported/);
assert.throws(() => validateLearningFence("learn-tabs", '[{"title":"Only one","text":"Hi"}]'), /2–10/);
assert.throws(() => validateLearningFence("learn-tree", "root/\n child"), /pairs of spaces/);

const md = { type: "root", children: [
  { type: "inlineCode", value: "math:E=mc^2" },
  { type: "code", lang: "learn-steps", value: '["Prepare","Run"]' }
] };
remarkLearningBlocks()(md);
assert.equal(md.children[0].data.hProperties.dataLearningMath, "E=mc^2");

const pre = (lang, value) => ({
  type: "element", tagName: "pre", properties: {}, children: [
    { type: "element", tagName: "code", properties: { className: ["language-" + lang] }, children: [
      { type: "text", value }
    ] }
  ]
});
const hast = { type: "root", children: [
  pre("learn-tree", "src/\n  main/\n    Article.java\n  test/\n    ArticleTest.java"),
  pre("learn-steps", '["Prepare","Run"]'),
  pre("learn-tabs", '[{"title":"JDBC","text":"SQL"},{"title":"JPA","text":"ORM"}]'),
  pre("learn-run", "1+2*3"),
  pre("mermaid", "flowchart LR\nA-->B"),
  pre("math", "\\\\frac{1}{2}"),
  pre("java", "System.out.println(1);")
] };
rehypeLearningBlocks()(hast);
const children = hast.children;
assert.equal(children[0].properties.dataLearningBlock, "tree");
assert.equal(children[1].properties.dataLearningBlock, "steps");
assert.equal(children[2].properties.dataLearningBlock, "tabs");
assert.equal(children[3].properties.dataLearningBlock, "run");
assert.equal(children[4].properties.dataLearningBlock, "mermaid");
assert.equal(children[5].properties.dataLearningBlock, "math");
assert.equal(children[6].tagName, "pre");
const safeDump = JSON.stringify(children);
assert.ok(safeDump.includes("Article.java"));
assert.ok(safeDump.includes("Prepare"));
const unsafe = { type: "root", children: [pre("learn-tabs", '[{"title":"<img onerror=1>","text":"safe"},{"title":"B","text":"ok"}]')] };
rehypeLearningBlocks()(unsafe);
assert.ok(JSON.stringify(unsafe).includes("<img onerror=1>")); // text node, not executable HTML
assert.equal(unsafe.children[0].children[0].children[0].children[0].children[0].type, "text");
console.log("[learning-blocks] Markdown validation and safe HAST rendering passed.");
