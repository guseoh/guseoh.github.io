---
title: "Local Markdown workflow"
description: "Practical writing and deploy flow with git commits"
pubDate: 2026-03-05
updatedDate: 2026-03-06
category: "Writing Workflow"
tags:
  - markdown
  - workflow
  - git
---

Writing locally and deploying by commit keeps operations simple and reliable.

## Template

```md
---
title: "Post title"
description: "Short summary"
pubDate: 2026-03-06
category: "Category name"
tags:
  - topic-a
  - topic-b
---

Body
```

## Checklist

- Keep title and description concise.
- Use consistent tags for discoverability.
- Run `npm run build` before pushing.
