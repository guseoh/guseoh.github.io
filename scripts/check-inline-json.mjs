import assert from "node:assert/strict";
import { serializeInlineJson } from "../src/utils/serializeInlineJson.ts";

const injection = '</script><script>alert("unsafe")</script><!--';
const example = {
  label: injection,
  children: ["<", "한국어", "&", '"', "\\", "\u2028", "\u2029"],
  meta: { closingTag: "</SCRIPT>", key: "/search/?q=Spring" }
};
const json = serializeInlineJson(example);
assert.equal(json.includes("<"), false, "Inline JSON must not contain raw HTML tag openings");
assert.deepEqual(JSON.parse(json), example, "Escaping must preserve all original values");
assert.deepEqual(JSON.parse(serializeInlineJson([1, null, true])), [1, null, true]);
assert.equal(serializeInlineJson({ value: "<script>" }).includes("\\u003c"), true);
console.log("Inline JSON escaping and round-trip contracts passed.");
