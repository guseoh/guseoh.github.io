import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tagsPath = path.join(rootDir, "src", "data", "tags.json");
const navigationPath = path.join(rootDir, "src", "data", "navigation.json");
const tags = JSON.parse(await readFile(tagsPath, "utf8"));
const navigation = JSON.parse(await readFile(navigationPath, "utf8"));
const failures = [];
const canonical = new Map();
const aliases = new Map();

for (const [index, entry] of tags.entries()) {
  const label = `tags.json[${index}]`;
  const slug = normalize(entry.slug ?? "");

  if (!slug || slug !== entry.slug) {
    failures.push(`${label}: slug는 정규화된 값이어야 합니다: ${entry.slug ?? ""}`);
    continue;
  }

  if (!entry.name?.trim()) failures.push(`${label}: name이 필요합니다.`);
  if (!["tech", "project", "topic", "post"].includes(entry.type)) {
    failures.push(`${label}: 지원하지 않는 type입니다: ${entry.type}`);
  }
  if (typeof entry.archive !== "boolean") {
    failures.push(`${label}: archive를 true 또는 false로 명시해야 합니다.`);
  }
  if (canonical.has(slug)) failures.push(`${label}: 중복 slug입니다: ${slug}`);
  canonical.set(slug, entry);

  for (const rawAlias of entry.aliases ?? []) {
    const alias = normalize(rawAlias);
    if (!alias) {
      failures.push(`${label}: 빈 alias를 사용할 수 없습니다.`);
      continue;
    }
    if (aliases.has(alias) || canonical.has(alias)) {
      failures.push(`${label}: alias가 다른 slug 또는 alias와 충돌합니다: ${alias}`);
    }
    aliases.set(alias, slug);
  }
}

for (const group of navigation) {
  for (const item of group.items ?? []) {
    if (item.type !== "tag") continue;
    const slug = aliases.get(normalize(item.slug)) ?? normalize(item.slug);
    const metadata = canonical.get(slug);

    if (!metadata) {
      failures.push(`navigation.json: 태그 메타데이터가 없습니다: ${item.slug}`);
    } else if (metadata.archive !== true) {
      failures.push(`navigation.json: 탐색 태그는 archive=true여야 합니다: ${item.slug}`);
    }
  }
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`[tag:check] ${failure}`));
  console.error(`Tag metadata check failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log(`Tag metadata check passed for ${tags.length} tag definition(s).`);

function normalize(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
