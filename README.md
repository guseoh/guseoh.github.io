# devjune.dev

Java, Spring, JPA, HTTP, 네트워크, 데이터베이스와 인프라를 공부하며 확인한 내용을 기록하는 개인 기술 블로그입니다. 완성된 지식을 전시하기보다 학습 과정에서 이해한 개념, 프로젝트에서 확인한 문제, 다시 검토할 내용을 오래 축적하는 것을 목적으로 합니다.

## 사용 기술

- Astro 7
- Astro Content Collections + Markdown
- TypeScript
- `@astrojs/rss`
- GitHub Actions
- GitHub Pages

## 주요 기능

- 홈: 블로그 활동과 GitHub contributions, 최근 글
- 글 목록: 페이지네이션, 그리드·리스트 보기 전환
- 글 상세: 메타데이터, 태그, 목차, 관련 글, 읽기 진행률, 이미지 확대, 코드 복사, 이전·다음 글
- Books: 직접 등록한 Book 단위의 학습 글 묶음
- Series: 메타데이터에 정의한 순서에 따른 연재 목록
- 검색: `/search-index.json` 기반 본문 검색과 카테고리·태그 필터
- SEO: canonical, Open Graph, Twitter Card, RSS, sitemap
- UX: 라이트·다크 모드, 사이드바 상태 저장, 모바일 대응

## 로컬 실행

```bash
npm ci
npm run dev
```

빌드 전 검증:

```bash
npm run content:check
npm run check
npm test
npm run links:check
npm run build
```

로컬 preview와 smoke test:

```bash
npm run preview
npm run smoke
```

배포 사이트를 검사하려면 기준 URL을 지정합니다.

```bash
SMOKE_BASE_URL=https://guseoh.github.io npm run smoke
```

## 글 작성 규칙

새 글은 `src/content/blog` 아래에 Markdown 파일로 추가합니다. URL은 frontmatter의 `slug`로 고정하며, 파일이나 폴더를 옮길 때 기존 공개 URL을 함께 바꾸지 않습니다.

```yaml
---
title: "예시 글"
description: "글에서 설명할 핵심 내용을 한 문장으로 작성한다."
date: 2026-07-23
updated: 2026-07-23
lastVerified: 2026-07-23
slug: "java/example"
aliases: []
commentKey: "/blog/java/example/"
category: "Java"
tags:
    - Java
    - Example
testedWith:
    java: "17"
series: "data-structure"
chapter: 1
heroImage: "/og-image.svg"
draft: true
---
```

- `title`은 상세 페이지의 유일한 `h1`로 렌더링하며 카테고리 접두사를 붙이지 않습니다.
- 본문 제목은 `##`부터 시작하고 `## 1. ...`, `### 1.1 ...`처럼 계층 번호를 사용합니다.
- `description`에는 글이 답하는 핵심 질문이나 다루는 범위를 적습니다.
- `date`는 최초 작성일, `updated`는 마지막 내용 수정일입니다.
- `lastVerified`는 코드, 설명과 링크를 실제로 다시 확인한 날짜입니다. 검증하지 않았다면 생략합니다.
- `slug`와 `commentKey`는 발행 후 가능한 한 바꾸지 않습니다.
- 과거 URL을 유지해야 하면 `aliases`에 `/blog/.../` 형식으로 추가합니다.
- `testedWith`에는 실제로 확인한 버전만 기록하며 검증 환경이 없다면 생략합니다.
- `book`과 `series`에는 각각 `src/data/books.json`, `src/data/series.json`에 등록한 `id`를 사용합니다.
- `chapter`는 Book 또는 Series 안에서 글의 순서를 정할 때만 작성합니다.
- 글이 Book이나 Series에 속하지 않으면 `book`, `series`와 `chapter`를 생략합니다. 모든 글의 선택 필드 수를 억지로 맞추지 않습니다.
- `draft: true`인 글은 목록, 검색, RSS, sitemap과 상세 페이지 생성에서 제외됩니다.

### 작성 순서

1. `src/content/blog/_template.md`를 복사합니다.
2. 현재 글이 답할 핵심 질문과 범위를 정합니다.
3. 실제 코드, 테스트, 설정, 로그와 공식 자료로 내용을 확인합니다.
4. 작성 중에는 `draft: true`를 유지합니다.
5. 본문 마지막은 `정리`, `참고 자료` 순서로 구성합니다.
6. 발행 전에 콘텐츠 검사, 타입 검사, 테스트와 빌드를 실행합니다.
7. 검증이 끝나면 `draft: false`로 변경합니다.

### 정리 장

`정리` 장은 본문에서 확인한 핵심 결론을 3~6개의 글머리 기호로 요약합니다. 각 항목은 독립적으로 이해할 수 있는 완결된 문장으로 작성하며, 본문에 없던 새로운 내용은 추가하지 않습니다.

```markdown
## 5. 정리

* 첫 번째 핵심 결론을 완결된 문장으로 정리한다.
* 두 번째 핵심 결론을 완결된 문장으로 정리한다.
* 세 번째 핵심 결론을 완결된 문장으로 정리한다.
```

본문의 정의와 설명을 그대로 반복하지 않고, 이후 다시 읽을 때 판단 기준이 되는 결론을 압축합니다.

### 코드 블록

새 글의 fenced code block에는 언어 이름만 지정합니다.

````markdown
```java
public class Member {
}
```
````

파일명과 설명은 코드 블록 밖의 일반 문단에 작성합니다. 렌더러는 기존 글과의 호환을 위해 코드 블록 제목, 줄 번호와 줄 강조 메타데이터를 처리할 수 있지만, 새 글에는 `title`, `showLineNumbers`, `id` 같은 속성을 추가하지 않습니다.

### 이미지

Markdown 이미지는 게시글 파일을 기준으로 상대 경로를 사용하고, 이미지가 전달하는 내용을 alt 텍스트로 작성합니다.

```markdown
![게시글 조회 요청과 응답 흐름](./images/request-flow.png)
```

- 원본 이미지를 임의로 확대하지 않습니다.
- 장식용 이미지보다 구조, 실행 흐름과 개념 차이를 설명하는 이미지를 우선합니다.
- 외부 이미지는 원본 문서와 이용 조건을 확인한 뒤 사용합니다.

### 표

여러 대상을 같은 기준으로 비교할 때만 표를 사용합니다. 접근 가능한 캡션이 필요하면 표 바로 앞에 주석을 둡니다.

```markdown
<!-- table-caption: HTTP 메서드의 속성 비교 -->
| 메서드 | 안전 | 멱등 |
| --- | --- | --- |
| GET | O | O |
```

## Book과 Series

- Category는 글의 주제 분류입니다.
- Book은 사용자가 직접 구성하는 학습 글 묶음입니다.
- Series는 순서대로 이어 읽는 연재 묶음입니다.
- Category, Book과 Series는 서로 독립적으로 관리합니다.
- 등록되지 않은 Book id는 콘텐츠 스키마 검증에서 오류로 처리됩니다.
- 등록되지 않은 Series id도 콘텐츠 스키마 검증에서 오류로 처리됩니다.

Book과 Series의 표시 이름, 설명과 순서는 각각 다음 파일에서 관리합니다.

```text
src/data/books.json
src/data/series.json
```

## 자동 검증과 배포

PR에서는 다음 검증을 실행합니다.

```text
content:check
astro check
test
build
local preview smoke test
```

`main` 배포에서는 GitHub Pages 배포 후 공개 경로, 검색 색인, RSS, sitemap, 공개 글 수와 최신 글 경로를 smoke test로 다시 확인합니다.

## 주요 경로

```text
src/content/blog/          게시글
src/content.config.ts      콘텐츠 스키마
src/data/                  Book, Series와 탐색 메타데이터
src/pages/                 Astro 라우트
src/components/            UI 컴포넌트
src/styles/                전역·페이지 스타일
scripts/                   콘텐츠·링크·배포 검증 스크립트
.github/workflows/         검증, 배포와 자동 갱신 워크플로
```
