import assert from "node:assert/strict";
import { buildPostActivityDateCounts } from "../src/utils/postActivityCounts.ts";
import { getKoreaDateKey } from "../src/utils/koreaDate.ts";

const day = (value) => new Date(value + "T00:00:00.000Z");
const posts = [
  { date: day("2026-12-30"), updated: day("2027-01-01"), lastVerified: day("2027-01-02"), draft: false },
  { date: day("2027-01-01"), lastVerified: day("2027-02-01"), draft: false },
  { date: day("2026-12-31"), updated: day("2027-01-01"), draft: false },
  { date: day("2027-01-01"), updated: day("2027-01-03"), draft: true }
];
const counts = buildPostActivityDateCounts(posts);
assert.deepEqual(counts, { "2027-01-01": 3 }, "one event per public post, using update before creation");
assert.equal(buildPostActivityDateCounts([])["2027-01-01"], undefined, "empty archive");
assert.equal(buildPostActivityDateCounts([{ date: day("2026-12-31"), draft: false }])["2026-12-31"], 1);

assert.equal(getKoreaDateKey("2026-12-31T14:59:59.999Z"), "2026-12-31");
assert.equal(getKoreaDateKey("2026-12-31T15:00:00.000Z"), "2027-01-01");
assert.equal(getKoreaDateKey("2027-01-31T15:00:00.000Z"), "2027-02-01");
assert.throws(() => getKoreaDateKey("not-a-date"), /Invalid date input/);
console.log("Published post activity, verification date and KST year/month boundaries passed.");
