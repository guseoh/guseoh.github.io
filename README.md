# GitHub Pages Personal Blog (Astro)

Astro 기반 개인 블로그를 GitHub Pages에 자동 배포하는 프로젝트입니다.

## Stack

- Astro
- Content Collections (Markdown)
- GitHub Actions + GitHub Pages
- RSS / Sitemap

## URL 규약

- `/`: 홈
- `/blog`: 전체 글 목록
- `/blog/<slug>`: 글 상세
- `/tags`: 태그 목록
- `/tags/<tag>`: 태그별 목록
- `/about`: 소개
- `/rss.xml`: RSS

## 포스트 Frontmatter 규약

```yaml
---
title: "글 제목"            # required
description: "글 요약"      # required
pubDate: 2026-03-06         # required
tags: ["astro", "setup"] # required
updatedDate: 2026-03-06     # optional
draft: false                # optional (default false)
heroImage: "/path/image"   # optional
---
```

## 로컬 개발

```bash
npm install
npm run dev
```

## 빌드 확인

```bash
npm run build
npm run preview
```

## 글 작성 워크플로

1. `src/content/blog/*.md`에 새 글을 생성한다.
2. frontmatter 필수 필드(`title`, `description`, `pubDate`, `tags`)를 채운다.
3. 로컬에서 `npm run build`로 검증한다.
4. `main` 브랜치에 커밋/푸시하면 GitHub Actions가 자동 배포한다.

## GitHub Pages 설정

1. GitHub 저장소 이름을 `<github-username>.github.io`로 생성한다.
2. 이 프로젝트를 해당 저장소에 푸시한다.
3. Repository Settings > Pages > Source를 `GitHub Actions`로 설정한다.
4. `astro.config.mjs`의 `site` 값을 실제 사용자명에 맞게 수정한다.

```js
site: "https://<github-username>.github.io"
```

## 현재 기본값

이 저장소는 `https://guseo.github.io`를 기본 site URL로 설정해두었습니다.
필요 시 즉시 변경해서 사용하면 됩니다.
