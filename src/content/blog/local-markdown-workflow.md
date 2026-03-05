---
title: "로컬 Markdown 워크플로로 글 쓰는 법"
description: "Git 커밋 기반으로 블로그 글을 안정적으로 운영하는 실전 흐름"
pubDate: 2026-03-05
updatedDate: 2026-03-06
tags:
  - markdown
  - workflow
  - git
---

로컬에서 작성하고 커밋 후 배포하는 흐름은 단순하지만 강력합니다.

## 작성 템플릿

```md
---
title: "글 제목"
description: "짧은 설명"
pubDate: 2026-03-06
tags:
  - topic-a
  - topic-b
---

본문
```

## 체크리스트

- 제목/설명은 검색 결과에서 바로 이해되도록 짧게 유지
- 태그는 검색 가능한 키워드 위주로 통일
- 푸시 전에 `npm run build`로 정적 빌드 검증
