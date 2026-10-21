import assert from "node:assert/strict";
import { normalizeTaxonomySlug } from "../src/utils/taxonomySlug.ts";
import { compareLearningOrder } from "../src/utils/postOrder.ts";

const slugCases = [
  [" Spring Security ", "spring-security"],
  ["자료구조!!", "자료구조"],
  [" CI/CD ", "ci-cd"],
  ["AWS_EC2", "aws-ec2"],
  ["MySQL 8.0", "mysql-8-0"],
  ["---", ""]
];
for (const [input, expected] of slugCases) {
  assert.equal(normalizeTaxonomySlug(input), expected, `Taxonomy slug: ${input}`);
}

function mockPost(date, chapter, seriesOrder) {
  return { data: { date: new Date(date), chapter, seriesOrder } };
}

const firstChapter = mockPost("2024-01-01", 1);
const secondChapter = mockPost("2025-01-01", 2);
const legacyChapter = mockPost("2024-01-01", undefined, 3);
const noChapter = mockPost("2025-01-01");

assert.ok(compareLearningOrder(firstChapter, secondChapter) < 0, "chapter wins over date");
assert.ok(compareLearningOrder(secondChapter, legacyChapter) < 0, "legacy seriesOrder follows chapter");
assert.ok(compareLearningOrder(legacyChapter, noChapter) < 0, "missing chapter sorts last");
assert.ok(compareLearningOrder(mockPost("2024-02-01", 1), firstChapter) < 0, "newer date wins same chapter");

const originals = [secondChapter, noChapter, firstChapter, legacyChapter];
assert.deepEqual([...originals].sort(compareLearningOrder), [firstChapter, secondChapter, legacyChapter, noChapter]);
assert.deepEqual(originals, [secondChapter, noChapter, firstChapter, legacyChapter], "inputs unchanged");

console.log("Taxonomy slug and reading-order contracts passed.");
