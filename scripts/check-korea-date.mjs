import assert from "node:assert/strict";
import {
  addDateKeyDays,
  getKoreaDateKey,
  getKoreaDayUtcRange
} from "./korea-date.mjs";

const cases = [
  ["2026-06-06T14:59:59.000Z", "2026-06-06"],
  ["2026-06-06T15:00:00.000Z", "2026-06-07"],
  ["2026-06-07T00:00:00.000Z", "2026-06-07"],
  ["2026-12-31T14:59:59.999Z", "2026-12-31"],
  ["2026-12-31T15:00:00.000Z", "2027-01-01"],
  ["2027-01-31T14:59:59.999Z", "2027-01-31"],
  ["2027-01-31T15:00:00.000Z", "2027-02-01"]
];

for (const [instant, expectedDateKey] of cases) {
  assert.equal(getKoreaDateKey(instant), expectedDateKey, instant);
}

assert.equal(addDateKeyDays("2026-06-06", -364), "2025-06-07");
assert.equal(addDateKeyDays("2024-03-01", -1), "2024-02-29");
assert.equal(addDateKeyDays("2026-12-31", 1), "2027-01-01");
assert.equal(addDateKeyDays("2027-01-01", -1), "2026-12-31");
for (const invalid of ["2026-02-30", "2026-13-01", "2026-00-01", "2026-02-29", "invalid"]) {
  assert.throws(() => getKoreaDayUtcRange(invalid), /Invalid date key/, invalid);
}

const range = getKoreaDayUtcRange("2026-06-06");
assert.equal(range.start.toISOString(), "2026-06-05T15:00:00.000Z");
assert.equal(range.end.toISOString(), "2026-06-06T14:59:59.999Z");
const yearEnd = getKoreaDayUtcRange("2026-12-31");
assert.equal(yearEnd.start.toISOString(), "2026-12-30T15:00:00.000Z");
assert.equal(yearEnd.end.toISOString(), "2026-12-31T14:59:59.999Z");

console.log(`Korea date boundary test passed for ${cases.length} instant(s).`);
