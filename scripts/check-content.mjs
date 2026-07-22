import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(rootDir, "src", "content", "blog");
const markdownImagePattern = /!\[([^\]]*)\]\(([^)]*)\)/g;
const htmlImagePattern = /<img\b[^>]*>/gi;
const headingPattern = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const markerPattern = /\s*\{(?:no-dark-filter|theme-safe|data-theme-safe|no-lightbox|lightbox-false)\}\s*/gi;

const failures = [];
const warnings = [];
const files = await listMarkdownFiles(contentDir);
const slugLocations = new Map();
const aliasLocations = new Map();

for (const file of files) {
  const relativePath = toRepoPath(file);
  const source = await readFile(file, "utf8");
  const lines = source.split(/\r?\n/);
  const frontmatter = readFrontmatter(lines);

  if (!frontmatter) {
    fail(relativePath, 1, "frontmatter가 없습니다.");
    continue;
  }

  checkFrontmatterIndentation(relativePath, lines);
  checkDates(relativePath, frontmatter);
  checkRequiredFrontmatter(relativePath, lines, frontmatter);
  checkTags(relativePath, lines, frontmatter);
  collectSlugAndAliases(relativePath, lines, frontmatter);
  checkImages(relativePath, lines);
  checkHeadingHierarchy(relativePath, lines);
}
checkSlugCollisions();

for (const warning of warnings) {
  console.warn(warning);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }

  console.error(`Content check failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log(`Content check passed for ${files.length} post(s).`);
if (warnings.length > 0) {
  console.log(`Content check completed with ${warnings.length} warning(s).`);
}

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

function readFrontmatter(lines) {
  if (lines[0]?.trim() !== "---") return null;

  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (endIndex === -1) return null;

  const values = new Map();
  for (let index = 1; index < endIndex; index += 1) {
    const match = lines[index].match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!match) continue;

    values.set(match[1], {
      line: index + 1,
      value: cleanScalar(match[2])
    });
  }

  return values;
}

function cleanScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function readStringList(lines, keyLine) {
  const line = lines[keyLine - 1] ?? "";
  const inlineValue = line.replace(/^[A-Za-z][\w-]*:\s*/, "").trim();

  if (inlineValue.startsWith("[") && inlineValue.endsWith("]")) {
    return inlineValue
      .slice(1, -1)
      .split(",")
      .map((item) => cleanScalar(item))
      .filter(Boolean);
  }

  if (inlineValue.length > 0) {
    return [cleanScalar(inlineValue)];
  }

  const values = [];
  for (let index = keyLine; index < lines.length; index += 1) {
    const itemMatch = lines[index].match(/^\s*-\s*(.+?)\s*$/);
    if (!itemMatch) break;
    values.push(cleanScalar(itemMatch[1]));
  }

  return values;
}

function normalizeBlogPath(value) {
  const trimmed = value.trim().replace(/^\/+/, "").replace(/^blog\/+/i, "").replace(/\/+$/, "");
  return `/blog/${trimmed}/`;
}

function addLocation(map, key, file, line) {
  const locations = map.get(key) ?? [];
  locations.push({ file, line });
  map.set(key, locations);
}

function checkFrontmatterIndentation(relativePath, lines) {
  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (endIndex === -1) return;

  let nestedMapping = null;

  for (let index = 1; index < endIndex; index += 1) {
    const line = lines[index];
    const topLevelMatch = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);

    if (topLevelMatch) {
      nestedMapping = topLevelMatch[2].trim() === "" ? topLevelMatch[1] : null;
      continue;
    }

    if (/^\s+[A-Za-z][\w-]*:\s*/.test(line)) {
      if (nestedMapping === "testedWith") continue;
      fail(relativePath, index + 1, "frontmatter의 top-level key가 들여쓰기되어 있습니다.");
      continue;
    }

    if (line.trim().length > 0 && !/^\s*-\s+/.test(line)) {
      nestedMapping = null;
    }
  }
}

function checkDates(relativePath, frontmatter) {
  const date = requireDate(relativePath, frontmatter, "date");
  const updated = optionalDate(relativePath, frontmatter, "updated");
  const lastVerified = optionalDate(relativePath, frontmatter, "lastVerified");

  if (!date) return;

  if (updated && updated.value < date.value) {
    fail(relativePath, updated.line, "`updated`는 `date`보다 빠를 수 없습니다.");
  }

  if (lastVerified && lastVerified.value < date.value) {
    fail(relativePath, lastVerified.line, "`lastVerified`는 `date`보다 빠를 수 없습니다.");
  }
}

function checkRequiredFrontmatter(relativePath, lines, frontmatter) {
  for (const key of ["title", "description", "date", "category", "slug", "commentKey", "draft"]) {
    const entry = frontmatter.get(key);
    if (!entry || String(entry.value ?? "").trim().length === 0) {
      fail(relativePath, 1, `frontmatter에 \`${key}\`가 필요합니다.`);
    }
  }

  const tags = frontmatter.get("tags");
  if (!tags || readStringList(lines, tags.line).length === 0) {
    fail(relativePath, 1, "frontmatter에 `tags`가 필요합니다.");
  }

  const draft = frontmatter.get("draft");
  if (draft && draft.value !== "true" && draft.value !== "false") {
    fail(relativePath, draft.line, "`draft`는 true 또는 false를 명시해야 합니다.");
  }

  const commentKey = frontmatter.get("commentKey");
  if (commentKey && !commentKey.value.startsWith("/blog/")) {
    fail(relativePath, commentKey.line, "`commentKey`는 /blog/.../ 형태여야 합니다.");
  }
}

function checkTags(relativePath, lines, frontmatter) {
  const tagsEntry = frontmatter.get("tags");
  if (!tagsEntry) return;

  const tags = readStringList(lines, tagsEntry.line);
  const normalized = tags.map((tag) => tag.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length) {
    fail(relativePath, tagsEntry.line, "`tags`에 중복 값이 있습니다.");
  }
}

function collectSlugAndAliases(relativePath, lines, frontmatter) {
  const slug = frontmatter.get("slug");
  if (slug?.value) {
    addLocation(slugLocations, normalizeBlogPath(slug.value), relativePath, slug.line);
  }

  const aliases = frontmatter.get("aliases");
  if (!aliases) return;

  for (const alias of readStringList(lines, aliases.line)) {
    addLocation(aliasLocations, normalizeBlogPath(alias), relativePath, aliases.line);
  }
}

function checkSlugCollisions() {
  for (const [slug, locations] of slugLocations) {
    if (locations.length > 1) {
      for (const location of locations) {
        fail(location.file, location.line, `중복된 slug입니다: ${slug}`);
      }
    }

    const aliasConflicts = aliasLocations.get(slug) ?? [];
    for (const location of aliasConflicts) {
      fail(location.file, location.line, `alias가 게시글 slug와 충돌합니다: ${slug}`);
    }
  }

  for (const [alias, locations] of aliasLocations) {
    if (locations.length > 1) {
      for (const location of locations) {
        fail(location.file, location.line, `중복된 alias입니다: ${alias}`);
      }
    }
  }
}

function requireDate(relativePath, frontmatter, key) {
  const entry = frontmatter.get(key);
  if (!entry?.value) {
    fail(relativePath, 1, `frontmatter에 \`${key}\`가 없습니다.`);
    return null;
  }

  return parseDate(relativePath, key, entry);
}

function optionalDate(relativePath, frontmatter, key) {
  const entry = frontmatter.get(key);
  if (!entry?.value) return null;
  return parseDate(relativePath, key, entry);
}

function parseDate(relativePath, key, entry) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.value)) {
    fail(relativePath, entry.line, `\`${key}\`는 YYYY-MM-DD 형식이어야 합니다.`);
    return null;
  }

  const date = new Date(`${entry.value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== entry.value) {
    fail(relativePath, entry.line, `\`${key}\` 날짜가 유효하지 않습니다.`);
    return null;
  }

  return entry;
}

function checkImages(relativePath, lines) {
  forEachContentLine(lines, (line, lineNumber) => {
    markdownImagePattern.lastIndex = 0;
    for (const match of line.matchAll(markdownImagePattern)) {
      const alt = cleanAlt(match[1]);
      if (alt.length === 0) {
        fail(relativePath, lineNumber, `Markdown 이미지 alt가 비어 있습니다: ${match[2]}`);
      }
    }

    htmlImagePattern.lastIndex = 0;
    for (const match of line.matchAll(htmlImagePattern)) {
      const tag = match[0];
      const altMatch = tag.match(/\balt=(["'])(.*?)\1/i);
      if (!altMatch || cleanAlt(altMatch[2]).length === 0) {
        fail(relativePath, lineNumber, "HTML 이미지에는 비어 있지 않은 alt가 필요합니다.");
      }
    }
  });
}

function cleanAlt(value) {
  return value.replace(markerPattern, " ").replace(/\s{2,}/g, " ").trim();
}

function checkHeadingHierarchy(relativePath, lines) {
  let previousDepth = null;
  const seen = new Map();

  forEachContentLine(lines, (line, lineNumber) => {
    const match = line.match(headingPattern);
    if (!match) return;

    const depth = match[1].length;
    const label = normalizeHeading(match[2]);

    if (depth === 1) {
      fail(relativePath, lineNumber, "본문에서는 `#` heading을 사용하지 않습니다. 글 제목이 h1입니다.");
    }

    if (previousDepth === null && depth > 2) {
      fail(relativePath, lineNumber, "본문 첫 heading은 `##`부터 시작해야 합니다.");
    } else if (previousDepth !== null && depth > previousDepth + 1) {
      fail(relativePath, lineNumber, `heading 단계가 \`h${previousDepth}\`에서 \`h${depth}\`로 건너뜁니다.`);
    }

    if (label) {
      const firstSeenLine = seen.get(label);
      if (firstSeenLine) {
        warn(relativePath, lineNumber, `같은 글 안에 중복 heading이 있습니다: "${match[2].trim()}" (처음: ${firstSeenLine}행)`);
      } else {
        seen.set(label, lineNumber);
      }
    }

    previousDepth = depth;
  });
}

function normalizeHeading(value) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/^\d+(?:\.\d+)*[.)]?\s+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function forEachContentLine(lines, callback) {
  let fence = null;

  lines.forEach((line, index) => {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      fence = fence ? null : fenceMatch[1].slice(0, 3);
      return;
    }

    if (!fence) {
      callback(line, index + 1);
    }
  });
}

function fail(relativePath, line, message) {
  failures.push(`[content:check] ${relativePath}:${line} ${message}`);
}

function warn(relativePath, line, message) {
  warnings.push(`[content:warn] ${relativePath}:${line} ${message}`);
}

function toRepoPath(file) {
  return path.relative(rootDir, file).split(path.sep).join("/");
}
