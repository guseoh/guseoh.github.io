import assert from "node:assert/strict";
import { findContentStyleIssues } from "./content-style-rules.mjs";

const validPost = `---
title: "예시"
description: "예시"
date: 2026-07-23
slug: "java/example"
commentKey: "/blog/java/example/"
category: "Java"
tags:
    - Java
draft: false
---

## 1. 들어가기 전

본문이다.

\`\`\`java
class Example {}
\`\`\`

## 2. 정리

핵심을 정리한다.

## 3. 참고 자료

### 공식 자료

* [Java](https://dev.java/)

### 한글 참고 링크

* [우아한형제들 기술 블로그](https://techblog.woowahan.com/)
`;

assert.deepEqual(findContentStyleIssues(validPost), []);

const invalidPost = `---
title: "예시"
description: "예시"
date: 2026-07-23
slug: "java/example"
commentKey: "/blog/java/example/"
category: "Java"
tags:
  - Java
draft: false
---

## 들어가기 전

다음 글에서 자세히 다룬다.

\`\`\`java title="Example.java"
class Example {}
\`\`\`

## 참고 자료

* https://example.com
* [위키백과](https://ko.wikipedia.org/wiki/Java)
`;

const rules = findContentStyleIssues(invalidPost).map((entry) => entry.rule);
assert(rules.includes("tag-indent"));
assert(rules.includes("heading-number"));
assert(rules.includes("forward-looking"));
assert(rules.includes("code-fence-meta"));
assert(rules.includes("raw-url"));
assert(rules.includes("forbidden-source"));
assert(rules.includes("final-summary"));

const draftPost = `---
title: "작성 중"
description: "작성 중"
date: 2026-07-23
slug: "draft/example"
commentKey: "/blog/draft/example/"
category: "Daily"
tags: ["Daily"]
draft: true
---

## 1. 메모
`;
assert.equal(findContentStyleIssues(draftPost).some((entry) => entry.rule.startsWith("final-")), false);

console.log("Content style rule tests passed.");
