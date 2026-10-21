import { expect, test } from "@playwright/test";
import { getCommonCanonicalTags } from "../../src/utils/relatedTagMatches";

// The real related-posts algorithm provides resolveTagSlug with the tag
// metadata's aliases; this isolated contract avoids importing Astro JSON data
// into Playwright's Node test runner.
const resolve = (tag: string) => {
  const normalized = tag.trim().toLowerCase();
  return normalized === "aws-ec2" ? "aws" : normalized;
};

test("추천용 공통 태그는 별칭과 원래 태그를 하나의 일치로 계산한다", () => {
  expect(getCommonCanonicalTags(["AWS"], ["aws-ec2"], resolve)).toEqual(["aws-ec2"]);
  expect(getCommonCanonicalTags(["AWS"], ["aws-ec2", "AWS"], resolve)).toEqual(["aws-ec2"]);
  expect(getCommonCanonicalTags(["aws-ec2"], ["AWS"], resolve)).toEqual(["AWS"]);
  expect(getCommonCanonicalTags(["AWS"], ["JPA"], resolve)).toEqual([]);
  expect(getCommonCanonicalTags([], ["AWS"], resolve)).toEqual([]);
  expect(getCommonCanonicalTags(["AWS"], ["", "aws-ec2"], resolve)).toEqual(["aws-ec2"]);
});
