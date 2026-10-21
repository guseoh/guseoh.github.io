import assert from "node:assert/strict";
import { getPageCount, getPageHref, getPageItems } from "../src/utils/pagination.ts";

for (const [count, expected] of [[0, 1], [1, 1], [12, 1], [13, 2], [25, 3]]) {
  assert.equal(getPageCount(count, 12), expected);
}
const posts = Array.from({ length: 25 }, (_, i) => i + 1);
assert.deepEqual(getPageItems(posts, 1, 12), posts.slice(0, 12));
assert.deepEqual(getPageItems(posts, 2, 12), posts.slice(12, 24));
assert.deepEqual(getPageItems(posts, 3, 12), [25]);
assert.deepEqual(getPageItems(posts, 4, 12), []);
assert.deepEqual(posts, Array.from({ length: 25 }, (_, i) => i + 1));
assert.equal(getPageHref("/blog", 1), "/blog/");
assert.equal(getPageHref("/blog/", 2), "/blog/page/2/");
assert.throws(() => getPageCount(-1, 12), RangeError);
assert.throws(() => getPageCount(10, 0), RangeError);
assert.throws(() => getPageItems(posts, 0, 12), RangeError);
assert.throws(() => getPageHref("/blog/", 0), RangeError);
console.log("Blog pagination boundary and link contracts passed.");
