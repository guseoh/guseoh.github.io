import { expect, test } from "@playwright/test";
import type { CollectionEntry } from "astro:content";
import { getRelatedPosts } from "../../src/utils/relatedPosts";

type Post = CollectionEntry<"blog">;

function post(id: string, tags: string[], draft = false): Post {
  return {
    id,
    data: {
      category: "Different",
      tags,
      date: new Date("2025-01-01T00:00:00.000Z"),
      draft
    }
  } as unknown as Post;
}

test("관련 글은 별칭을 정규 태그로 취급하고 중복 점수·초안을 제외한다", () => {
  const current = post("current", ["AWS"]);
  const aliased = post("aliased", ["aws-ec2"]);
  const duplicated = post("duplicated", ["AWS", "aws-ec2"]);
  const draft = post("draft", ["AWS"], true);
  const different = post("different", ["JPA"]);
  const results = getRelatedPosts(current, [current, aliased, duplicated, draft, different], {
    limit: 5,
    categoryScore: 0
  });

  expect(new Set(results.map(({ post: item }) => item.id))).toEqual(new Set(["aliased", "duplicated"]));
  expect(results.map((result) => result.score)).toEqual([3, 3]);
  expect(results.map((result) => result.commonTags.length)).toEqual([1, 1]);
  expect(results.map((result) => result.reasons)).toEqual([
    ["공통 태그 1개"],
    ["공통 태그 1개"]
  ]);
});
