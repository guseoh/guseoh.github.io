import type { CollectionEntry } from "astro:content";
import { SITE } from "../config/site";

export function renderPostOgSvg(post: CollectionEntry<"blog">) {
  return renderOgSvg({
    titleLines: wrapText(post.data.title, 24).slice(0, 3),
    category: post.data.category,
    tags: post.data.tags.slice(0, 3),
    author: SITE.author,
    siteTitle: SITE.title
  });
}

function renderOgSvg({
  author,
  category,
  siteTitle,
  tags,
  titleLines
}: {
  author: string;
  category: string;
  siteTitle: string;
  tags: string[];
  titleLines: string[];
}) {
  const tagText = tags.length > 0 ? tags.map((tag) => `#${tag}`).join("  ") : "#Blog";
  const titleNodes = titleLines
    .map((line, index) => `<text x="92" y="${228 + index * 76}" class="title">${escapeSvg(line)}</text>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeSvg(siteTitle)} 게시글 공유 이미지">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#121315" />
      <stop offset="1" stop-color="#23262a" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect x="48" y="48" width="1104" height="534" rx="28" fill="#1c1e21" stroke="#444951" stroke-width="2" />
  <text x="92" y="126" class="eyebrow">${escapeSvg(category)}</text>
  ${titleNodes}
  <text x="92" y="484" class="tags">${escapeSvg(tagText)}</text>
  <line x1="92" y1="524" x2="1108" y2="524" stroke="#444951" stroke-width="2" />
  <text x="92" y="560" class="meta">${escapeSvg(siteTitle)}</text>
  <text x="1108" y="560" class="author" text-anchor="end">${escapeSvg(author)}</text>
  <style>
    text { font-family: Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif; }
    .eyebrow { fill: #d6dbe2; font-size: 30px; font-weight: 800; letter-spacing: 0; }
    .title { fill: #f2f3f4; font-size: 58px; font-weight: 850; letter-spacing: 0; }
    .tags { fill: #bec4cb; font-size: 28px; font-weight: 700; letter-spacing: 0; }
    .meta, .author { fill: #d2d5db; font-size: 26px; font-weight: 800; letter-spacing: 0; }
  </style>
</svg>`;
}

function wrapText(value: string, maxLength: number) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [value];
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
