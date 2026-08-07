# devjune.dev

Java, Spring, JPA, HTTP, 네트워크, 데이터베이스와 인프라를 공부하며 확인한 내용을 기록하는 개인 기술 블로그입니다. 완성된 지식을 전시하기보다 학습 과정에서 이해한 개념, 프로젝트에서 확인한 문제와 다시 검토할 내용을 오래 축적합니다.

## 사용 기술

- Astro 7
- Astro Content Collections + Markdown
- TypeScript
- `@astrojs/rss`
- GitHub Actions
- GitHub Pages

## 주요 기능

- 홈: 현재 프로젝트, 최근 글, 최근 수정 글, 블로그·GitHub 활동
- Projects: DevPedia, PawCycle Commerce와 FutMatch 사례 페이지
- 글 목록: 페이지네이션, 그리드·리스트 보기 전환
- 글 상세: 메타데이터, 핵심 태그, 목차, 학습 경로, 관련 글, 읽기 진행률, 이미지 확대, 코드 복사, 이전·다음 글
- Books: 직접 등록한 Book 단위의 학습 글 묶음
- Series: 메타데이터에 정의한 순서에 따른 연재 목록
- 검색: `/search-index.json` 기반 본문 검색과 카테고리·태그 필터
- SEO: canonical, Open Graph, Twitter Card, JSON-LD, RSS, sitemap
- UX: 라이트·다크 모드, 사이드바 상태 저장, 모바일 대응

## 로컬 실행

```bash
npm ci
npm run dev
```

기본 검증:

```bash
npm run content:check
npm run check
npm test
npm run links:check
npm run build
```

브라우저·접근성·성능 검증 도구는 package lock을 변경하지 않고 별도로 설치합니다.

```bash
npm run quality:install
npx playwright install chromium
npm run test:e2e
npm run lighthouse
```

로컬 preview와 smoke test:

```bash
npm run preview -- --host 127.0.0.1 --port 4322
SMOKE_BASE_URL=http://127.0.0.1:4322 npm run smoke
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

- `title`은 상세 페이지의 유일한 `h1`이며 본문 제목은 `##`부터 시작합니다.
- `date`는 최초 작성일, `updated`는 마지막 내용 수정일입니다.
- `lastVerified`는 코드, 설명과 링크를 실제로 다시 확인한 경우에만 작성합니다.
- `slug`와 `commentKey`는 발행 후 가능한 한 바꾸지 않습니다.
- 과거 URL을 유지해야 하면 `aliases`에 `/blog/.../` 형식으로 추가합니다.
- `book`과 `series`에는 각각 `src/data/books.json`, `src/data/series.json`의 id를 사용합니다.
- `chapter`는 Book, Series 또는 같은 카테고리의 학습 순서를 정할 때 사용합니다.
- `draft: true`인 글은 목록, 검색, RSS, sitemap과 상세 페이지 생성에서 제외됩니다.

### 태그 정책

- `src/data/tags.json`에서 `archive: true`인 핵심 태그만 독립 태그 페이지와 sitemap에 포함됩니다.
- 세부 키워드는 게시글 배지에 계속 표시하며 클릭하면 검색 필터로 이동합니다.
- 한글·영문으로 같은 의미를 가진 태그는 canonical slug와 `aliases`로 통합합니다.
- 탐색 메뉴에 연결하는 태그는 반드시 `archive: true`여야 합니다.

### 작성 순서

1. `src/content/blog/_template.md`를 복사합니다.
2. 글이 답할 핵심 질문과 범위를 정합니다.
3. 실제 코드, 테스트, 설정, 로그와 공식 자료로 내용을 확인합니다.
4. 작성 중에는 `draft: true`를 유지합니다.
5. 본문 마지막은 `정리`, `참고 자료` 순서로 구성합니다.
6. 발행 전에 콘텐츠 검사, 타입 검사, 테스트와 빌드를 실행합니다.
7. 검증이 끝나면 `draft: false`로 변경합니다.

## 자동 검증과 배포

PR과 `main` push에서는 다음 검증을 실행합니다.

```text
content:check
astro check
test
build
Playwright + axe
Lighthouse CI
local preview smoke test
```

`main` 배포에서는 GitHub Pages 배포 후 공개 경로, 프로젝트 페이지, 검색 색인, RSS, sitemap, 공개 글 수와 최신 글 경로를 smoke test로 다시 확인합니다.

## 주요 경로

```text
src/content/blog/          게시글
src/content.config.ts      콘텐츠 스키마
src/data/                  Project, Book, Series와 탐색 메타데이터
src/pages/                 Astro 라우트
src/components/            UI 컴포넌트
src/styles/                전역·페이지 스타일
scripts/                   콘텐츠·링크·배포 검증 스크립트
tests/e2e/                 Playwright·axe 대표 화면 검증
.github/workflows/         검증, 배포와 자동 갱신 워크플로
```
