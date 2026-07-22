import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findContentStyleIssues } from "./content-style-rules.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(rootDir, "src", "content", "blog");
const changedFiles = await readChangedFiles();
const strictAll = process.env.CONTENT_STYLE_STRICT === "1";
const failures = [];
const warnings = [];
const files = await listMarkdownFiles(contentDir);
const targetFiles = changedFiles
  ? files.filter((file) => changedFiles.has(toRepoPath(file)))
  : files;

for (const file of targetFiles) {
  const relativePath = toRepoPath(file);
  const source = await readFile(file, "utf8");
  const issues = findContentStyleIssues(source);
  const strict = strictAll || Boolean(changedFiles?.has(relativePath));

  for (const entry of issues) {
    const message = `${relativePath}:${entry.line} [${entry.rule}] ${entry.message}`;
    if (strict) {
      failures.push(`[content:style] ${message}`);
    } else {
      warnings.push(`[content:style:warn] ${message}`);
    }
  }
}

for (const warning of warnings) {
  console.warn(warning);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  console.error(`Content style check failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log(`Content style check passed for ${targetFiles.length} post(s).`);
if (warnings.length > 0) {
  console.log(`Content style check completed with ${warnings.length} legacy warning(s).`);
}

async function readChangedFiles() {
  const changedFilesPath = process.env.CONTENT_CHECK_CHANGED_FILES_FILE;
  if (!changedFilesPath) return null;

  try {
    const source = await readFile(changedFilesPath, "utf8");
    return new Set(
      source
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)
    );
  } catch (error) {
    if (error?.code === "ENOENT") return new Set();
    throw error;
  }
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

function toRepoPath(file) {
  return path.relative(rootDir, file).split(path.sep).join("/");
}
