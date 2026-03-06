# GitHub Pages Personal Blog (Astro)

Personal blog project powered by Astro and deployed via GitHub Pages.

## Stack

- Astro
- Content Collections (Markdown)
- GitHub Actions + GitHub Pages
- RSS / Sitemap

## Routes

- `/`: home
- `/blog`: blog list (page 1)
- `/blog/page/<page>`: paginated blog list
- `/blog/<slug>`: post detail
- `/categories`: category list
- `/categories/<category>`: posts by category
- `/tags`: tag list
- `/tags/<tag>`: posts by tag
- `/search`: search page
- `/about`: about page
- `/rss.xml`: RSS feed

## Frontmatter

```yaml
---
title: "Post title"
description: "Post summary"
pubDate: 2026-03-06
category: "Category name"        # optional, default: "미분류"
tags: ["astro", "setup"]       # optional, default: []
updatedDate: 2026-03-06           # optional
draft: false                      # optional, default: false
heroImage: "/path/image"         # optional
---
```

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Comments

- Public comments are handled by `utterances` and require GitHub sign-in.
