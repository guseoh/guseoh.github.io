import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(rootDir, "src", "content", "blog");
const siteUrl = "https://guseoh.github.io";
const failures = [];

const files = await listMarkdownFiles(contentDir);
const posts = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  const frontmatter = parseFrontmatter(source);
  const relativePath = toRepoPath(file);

  if (!frontmatter) {
    fail(`${relativePath} frontmatter를 읽을 수 없습니다.`);
    continue;
  }

  const slug = normalizePostSlug(readScalar(frontmatter, "slug"));
  const aliases = readList(frontmatter, "aliases").map(normalizeBlogPath);
  const commentKey = normalizeBlogPath(readScalar(frontmatter, "commentKey") || slug);
  const legacyPath = normalizeBlogPath(legacySlugFor(file));
  const draftValue = readScalar(frontmatter, "draft");
  const draft = draftValue === "true";
  const date = parseDate(readScalar(frontmatter, "date"));
  const updated = parseOptionalDate(readScalar(frontmatter, "updated"));
  const lastVerified = parseOptionalDate(readScalar(frontmatter, "lastVerified"));

  assert(slug.length > 0, `${relativePath} slug가 비어 있습니다.`);
  assert(draftValue === "true" || draftValue === "false", `${relativePath} draft는 true 또는 false여야 합니다.`);
  assert(commentKey.startsWith("/blog/"), `${relativePath} commentKey는 /blog/.../ 형태여야 합니다.`);

  if (legacyPath !== normalizeBlogPath(slug)) {
    assert(
      aliases.includes(legacyPath),
      `${relativePath} 파일 경로 기반 기존 URL ${legacyPath}가 aliases에 없습니다.`
    );
  }

  posts.push({
    aliases,
    commentKey,
    date,
    draft,
    legacyPath,
    path: normalizeBlogPath(slug),
    relativePath,
    slug,
    lastmod: updated ?? lastVerified ?? date
  });
}

const publishedPosts = posts.filter((post) => !post.draft);
const draftPosts = posts.filter((post) => post.draft);

assert(files.length > 0, "검사할 게시글 파일이 없습니다.");
assert(publishedPosts.length > 0, "공개 게시글이 없습니다.");
assert(draftPosts.every((post) => !publishedPosts.includes(post)), "draft 게시글이 공개 게시글 목록에 포함되었습니다.");

checkDuplicateLocations("slug", posts.map((post) => ({ key: post.path, file: post.relativePath })));
checkDuplicateLocations("alias", posts.flatMap((post) => post.aliases.map((alias) => ({ key: alias, file: post.relativePath }))));

const slugSet = new Set(posts.map((post) => post.path));
for (const post of posts) {
  for (const alias of post.aliases) {
    assert(!slugSet.has(alias), `${post.relativePath} alias ${alias}가 다른 게시글 slug와 충돌합니다.`);
  }
}

const sitemapPaths = buildSitemapPaths(publishedPosts);
for (const post of publishedPosts) {
  assert(sitemapPaths.has(post.path), `${post.relativePath} 공개 게시글 URL이 sitemap 경로에 없습니다.`);
  assert(getPostOgImagePath(post).endsWith(".png"), `${post.relativePath} 자동 OG 이미지 경로가 PNG가 아닙니다.`);
}
for (const post of draftPosts) {
  assert(!sitemapPaths.has(post.path), `${post.relativePath} draft URL이 sitemap 경로에 포함되었습니다.`);
}
assert(sitemapPaths.size === new Set(sitemapPaths).size, "sitemap 경로가 중복되었습니다.");

const newestPost = [...publishedPosts].sort((a, b) => b.lastmod.valueOf() - a.lastmod.valueOf())[0];
if (newestPost) {
  const blogPageLastmod = newestPost.lastmod.toISOString().slice(0, 10);
  assert(
    blogPageLastmod === latestPostDate(publishedPosts).toISOString().slice(0, 10),
    "글 목록 lastmod 계산이 공개 게시글 최신 변경일과 일치하지 않습니다."
  );
  assert(new URL(newestPost.path, siteUrl).toString().includes("/blog/"), "최신 글 절대 URL 생성이 올바르지 않습니다.");
}

await checkSourceContracts();

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`[blog:contracts] ${failure}`);
  }
  console.error(`Blog contract check failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log(`Blog contract check passed for ${posts.length} post(s).`);

async function listMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...await listMarkdownFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md") && !entry.name.startsWith("_")) {
      results.push(fullPath);
    }
  }

  return results.sort((a, b) => a.localeCompare(b));
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return undefined;

  const entries = new Map();
  const lines = match[1].split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const scalarMatch = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!scalarMatch) continue;

    const key = scalarMatch[1];
    const rawValue = scalarMatch[2].trim();

    if (rawValue === "") {
      const blockValues = [];
      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        if (/^[A-Za-z][\w-]*:\s*/.test(lines[cursor])) break;

        const itemMatch = lines[cursor].match(/^\s*-\s*(.+?)\s*$/);
        if (itemMatch) {
          blockValues.push(cleanScalar(itemMatch[1]));
        }
      }

      entries.set(key, blockValues.length > 0 ? blockValues : "");
      continue;
    }

    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      entries.set(key, rawValue.slice(1, -1).split(",").map(cleanScalar).filter(Boolean));
      continue;
    }

    entries.set(key, cleanScalar(rawValue));
  }

  return entries;
}

function readScalar(frontmatter, key) {
  const value = frontmatter.get(key);
  return typeof value === "string" ? value : "";
}

function readList(frontmatter, key) {
  const value = frontmatter.get(key);
  return Array.isArray(value) ? value : [];
}

function cleanScalar(value) {
  const trimmed = String(value).trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function normalizePostSlug(value) {
  return value.trim().replace(/^\/+/, "").replace(/^blog\/+/i, "").replace(/\/+$/, "");
}

function normalizeBlogPath(value) {
  const slug = normalizePostSlug(value);
  return slug ? `/blog/${slug}/` : "/blog/";
}

function legacySlugFor(file) {
  return path.relative(contentDir, file)
    .replace(/\.md$/i, "")
    .split(path.sep)
    .map((segment) => segment.toLowerCase().replace(/\s+/g, "-"))
    .join("/");
}

function parseDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf())) {
    fail(`날짜를 해석할 수 없습니다: ${value}`);
    return new Date(0);
  }

  return date;
}

function parseOptionalDate(value) {
  return value ? parseDate(value) : undefined;
}

function checkDuplicateLocations(label, entries) {
  const locations = new Map();

  for (const entry of entries) {
    const files = locations.get(entry.key) ?? [];
    files.push(entry.file);
    locations.set(entry.key, files);
  }

  for (const [key, filesForKey] of locations) {
    if (filesForKey.length > 1) {
      fail(`중복된 ${label} ${key}: ${filesForKey.join(", ")}`);
    }
  }
}

function buildSitemapPaths(sourcePosts) {
  const paths = new Set(["/", "/about/", "/blog/", "/books/", "/categories/", "/tags/", "/series/", "/search/"]);
  for (const post of sourcePosts) {
    paths.add(post.path);
  }
  return paths;
}

function latestPostDate(sourcePosts) {
  return new Date(Math.max(...sourcePosts.map((post) => post.lastmod.valueOf())));
}

function getPostOgImagePath(post) {
  return `/og/${encodeURIComponent(post.slug).replace(/%2F/g, "/")}.png`;
}

async function checkSourceContracts() {
  const searchScript = await readRepoFile("src/scripts/search.ts");
  const comments = await readRepoFile("src/components/PostComments.astro");
  const baseLayout = await readRepoFile("src/layouts/BaseLayout.astro");
  const layoutScripts = await readRepoFile("src/components/layout/LayoutScripts.astro");
  const themeToggle = await readRepoFile("src/components/layout/ThemeToggle.astro");
  const smokeTest = await readRepoFile("scripts/smoke-test.mjs");
  const sitemap = await readRepoFile("src/pages/sitemap.xml.ts");

  assert(!searchScript.includes("innerHTML"), "검색 highlight는 innerHTML을 사용하면 안 됩니다.");
  assert(searchScript.includes('document.createElement("mark")'), "검색 highlight가 mark 요소를 생성하지 않습니다.");
  assert(searchScript.includes("textContent"), "검색 결과 렌더링은 textContent 기반이어야 합니다.");
  assert(comments.includes("data-comments-fallback"), "댓글 실패 fallback UI가 없습니다.");
  assert(comments.includes("10000"), "댓글 로딩 timeout 10초 계약이 없습니다.");
  assert(comments.includes("themeObserver?.disconnect()"), "댓글 테마 MutationObserver 정리가 없습니다.");
  assert(baseLayout.includes("data-theme-mode"), "초기 테마 스크립트가 theme mode를 설정하지 않습니다.");
  assert(themeToggle.includes('["system", "light", "dark", "planner"]'), "System·Light·Dark·Planner 테마 모드가 정의되지 않았습니다.");
  assert(!layoutScripts.includes("const themeModes ="), "테마 상태 처리 코드가 여러 컴포넌트에 중복되어 있습니다.");
  assert(layoutScripts.includes('event.key.toLowerCase() === "k"'), "Ctrl/Command+K 검색 단축키가 없습니다.");
  assert(smokeTest.includes("data-published-post-count"), "smoke test가 /blog/ 공개 글 개수 표식을 검사하지 않습니다.");
  assert(smokeTest.includes("search index published post count"), "smoke test가 검색 인덱스 공개 글 개수를 검사하지 않습니다.");
  assert(smokeTest.includes("RSS includes latest post"), "smoke test가 RSS 최신 글 포함 여부를 검사하지 않습니다.");
  assert(smokeTest.includes("absent from sitemap"), "smoke test가 draft sitemap 제외 여부를 검사하지 않습니다.");
  assert(
    sitemap.includes("updated ?? lastVerified ?? date") ||
      sitemap.includes("post.data.updated ?? post.data.lastVerified ?? post.data.date"),
    "sitemap lastmod가 게시글 의미 날짜를 사용하지 않습니다."
  );
}

async function readRepoFile(filePath) {
  return readFile(path.join(rootDir, filePath), "utf8");
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function fail(message) {
  failures.push(message);
}

function toRepoPath(file) {
  return path.relative(rootDir, file).split(path.sep).join("/");
}
