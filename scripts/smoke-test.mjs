import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PATHS = [
  "/",
  "/blog/",
  "/books/",
  "/categories/",
  "/tags/",
  "/series/",
  "/search/",
  "/rss.xml",
  "/sitemap.xml",
  "/search-index.json"
];

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(rootDir, "src", "content", "blog");
const baseUrl = normalizeBaseUrl(process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:4322");
const canonicalSiteUrl = normalizeBaseUrl(process.env.SMOKE_CANONICAL_URL ?? "https://guseoh.github.io");
const retries = Number(process.env.SMOKE_RETRIES ?? 3);
const retryDelayMs = Number(process.env.SMOKE_RETRY_DELAY_MS ?? 1500);
const paths = (process.env.SMOKE_PATHS ?? DEFAULT_PATHS.join(","))
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const expectedDeploySha = process.env.SMOKE_EXPECTED_SHA?.trim();
const deployCheck = expectedDeploySha || String(Math.floor(Date.now() / 1000));
const failures = [];

const localPosts = await readLocalPostContracts();
const publishedPosts = localPosts
  .filter((post) => !post.draft)
  .sort((a, b) => {
    const dateDifference = b.date.valueOf() - a.date.valueOf();
    if (dateDifference !== 0) return dateDifference;
    return a.sourcePath.localeCompare(b.sourcePath);
  });
const draftPosts = localPosts.filter((post) => post.draft);

for (const checkPath of paths) {
  const url = buildCheckUrl(checkPath);
  const result = await checkUrlWithRetry(url, retries, retryDelayMs);

  if (result.ok) {
    console.log(`OK ${result.status} ${url}`);
    continue;
  }

  failures.push(result);
  console.error(`FAIL ${result.status ?? "ERR"} ${url} ${result.error ?? ""}`.trim());
}

await runContentConsistencyChecks();

if (expectedDeploySha) {
  const result = await checkDeployMetaWithRetry(baseUrl, expectedDeploySha, retries, retryDelayMs);

  if (result.ok) {
    console.log(`OK deploy-meta ${result.sha} ${result.url}`);
  } else {
    failures.push(result);
    console.error(formatDeployMetaFailure(result));
  }
}

if (failures.length > 0) {
  console.error(`Smoke test failed for ${failures.length} check(s).`);
  process.exit(1);
}

console.log(`Smoke test passed for ${paths.length + (expectedDeploySha ? 1 : 0)} route check(s).`);

async function runContentConsistencyChecks() {
  const [searchIndexResult, blogResult, sitemapResult, rssResult] = await Promise.all([
    fetchText(buildCheckUrl("/search-index.json")),
    fetchText(buildCheckUrl("/blog/")),
    fetchText(buildCheckUrl("/sitemap.xml")),
    fetchText(buildCheckUrl("/rss.xml"))
  ]);

  if (!searchIndexResult.ok || !blogResult.ok || !sitemapResult.ok || !rssResult.ok) {
    for (const result of [searchIndexResult, blogResult, sitemapResult, rssResult].filter((result) => !result.ok)) {
      failures.push(result);
      console.error(`FAIL ${result.status ?? "ERR"} ${result.url} ${result.error ?? ""}`.trim());
    }
    return;
  }

  let searchIndex;
  try {
    searchIndex = JSON.parse(searchIndexResult.text);
  } catch (error) {
    const result = { ok: false, url: searchIndexResult.url, error: `invalid JSON: ${errorMessage(error)}` };
    failures.push(result);
    console.error(`FAIL ERR ${result.url} ${result.error}`);
    return;
  }

  if (!Array.isArray(searchIndex)) {
    failContract(searchIndexResult.url, "search index is not an array");
    return;
  }

  assertEqual(searchIndex.length, publishedPosts.length, searchIndexResult.url, "search index published post count");

  const countMatch = blogResult.text.match(/data-published-post-count="(\d+)"/);
  if (!countMatch) {
    failContract(blogResult.url, "missing data-published-post-count");
  } else {
    assertEqual(Number(countMatch[1]), searchIndex.length, blogResult.url, "blog list count matches search index");
  }

  const latestSlugMatch = blogResult.text.match(/data-latest-post-slug="([^"]*)"/);
  const latestPost = publishedPosts[0];
  if (!latestPost) return;

  if (!latestSlugMatch) {
    failContract(blogResult.url, "missing data-latest-post-slug");
  } else {
    assertEqual(latestSlugMatch[1], latestPost.slug, blogResult.url, "latest post slug");
  }

  const latestUrl = buildCheckUrl(latestPost.path);
  const latestResult = await checkUrlWithRetry(latestUrl, retries, retryDelayMs);
  if (latestResult.ok) {
    console.log(`OK latest-post ${latestResult.status} ${latestUrl}`);
  } else {
    failures.push(latestResult);
    console.error(`FAIL ${latestResult.status ?? "ERR"} ${latestUrl} ${latestResult.error ?? ""}`.trim());
  }

  assertIncludesAny(sitemapResult.text, absoluteUrls(latestPost.path), sitemapResult.url, "sitemap includes latest post");
  assertIncludesAny(rssResult.text, absoluteUrls(latestPost.path), rssResult.url, "RSS includes latest post");

  for (const draft of draftPosts) {
    assertNotIncludes(searchIndexResult.text, draft.path, searchIndexResult.url, `draft ${draft.path} absent from search index`);
    assertNotIncludesAny(sitemapResult.text, absoluteUrls(draft.path), sitemapResult.url, `draft ${draft.path} absent from sitemap`);
    assertNotIncludesAny(rssResult.text, absoluteUrls(draft.path), rssResult.url, `draft ${draft.path} absent from RSS`);
  }
}

async function checkUrlWithRetry(url, retryCount, delayMs) {
  let lastResult = { ok: false, url, error: "not attempted" };

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    lastResult = await checkUrl(url);
    if (lastResult.ok) return lastResult;
    if (attempt < retryCount) await delay(delayMs);
  }

  return lastResult;
}

async function checkUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "guseoh-blog-smoke-test"
      }
    });
    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok) {
      return { ok: false, url, status: response.status, error: response.statusText };
    }

    if (url.includes(".json") && !contentType.includes("json")) {
      return { ok: false, url, status: response.status, error: `unexpected content-type ${contentType}` };
    }

    if (url.includes(".xml") && !contentType.includes("xml")) {
      return { ok: false, url, status: response.status, error: `unexpected content-type ${contentType}` };
    }

    if (!url.includes(".xml") && !url.includes(".json") && !contentType.includes("text/html")) {
      return { ok: false, url, status: response.status, error: `unexpected content-type ${contentType}` };
    }

    return { ok: true, url, status: response.status };
  } catch (error) {
    return {
      ok: false,
      url,
      error: errorMessage(error)
    };
  }
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "guseoh-blog-smoke-test"
      }
    });

    if (!response.ok) {
      return { ok: false, url, status: response.status, error: response.statusText };
    }

    return { ok: true, url, status: response.status, text: await response.text() };
  } catch (error) {
    return { ok: false, url, error: errorMessage(error) };
  }
}

async function checkDeployMetaWithRetry(base, expectedSha, retryCount, delayMs) {
  let lastResult = { ok: false, url: "", expectedSha, error: "not attempted" };

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    lastResult = await checkDeployMeta(base, expectedSha);
    if (lastResult.ok) return lastResult;
    if (attempt < retryCount) await delay(delayMs);
  }

  return lastResult;
}

async function checkDeployMeta(base, expectedSha) {
  const url = new URL("/deploy-meta.json", base);
  url.searchParams.set("deploy-check", deployCheck);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "guseoh-blog-smoke-test"
      }
    });
    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok) {
      return { ok: false, url: url.toString(), status: response.status, expectedSha, error: response.statusText };
    }

    if (!contentType.includes("json")) {
      return {
        ok: false,
        url: url.toString(),
        status: response.status,
        expectedSha,
        error: `unexpected content-type ${contentType}`
      };
    }

    const body = await response.json();
    const actualSha = typeof body.sha === "string" ? body.sha.trim() : "";

    if (actualSha !== expectedSha) {
      return { ok: false, url: url.toString(), status: response.status, expectedSha, actualSha };
    }

    return { ok: true, url: url.toString(), status: response.status, sha: actualSha };
  } catch (error) {
    return {
      ok: false,
      url: url.toString(),
      expectedSha,
      error: errorMessage(error)
    };
  }
}

function formatDeployMetaFailure(result) {
  const actual = result.actualSha || "none";
  const error = result.error ? ` ${result.error}` : "";
  return `FAIL ${result.status ?? "ERR"} ${result.url} deploy-meta expected ${result.expectedSha} got ${actual}${error}`;
}

async function readLocalPostContracts() {
  const files = await listMarkdownFiles(contentDir);
  const posts = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const frontmatter = parseFrontmatter(source);
    if (!frontmatter) continue;

    const slug = frontmatter.slug || legacySlugFor(file);
    posts.push({
      date: parseDate(frontmatter.updated || frontmatter.date),
      draft: frontmatter.draft === "true",
      path: `/blog/${slug.replace(/^\/+|\/+$/g, "")}/`,
      slug,
      sourcePath: path.relative(rootDir, file).split(path.sep).join("/")
    });
  }

  return posts;
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

  return results;
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return undefined;

  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const lineMatch = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!lineMatch) continue;
    result[lineMatch[1]] = cleanScalar(lineMatch[2]);
  }

  return result;
}

function legacySlugFor(file) {
  return path.relative(contentDir, file)
    .replace(/\.md$/i, "")
    .split(path.sep)
    .map((segment) => segment.toLowerCase().replace(/\s+/g, "-"))
    .join("/");
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

function parseDate(value) {
  const date = new Date(`${value || "1970-01-01"}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ? new Date(0) : date;
}

function buildCheckUrl(checkPath) {
  const url = new URL(checkPath, baseUrl);
  if (!url.searchParams.has("deploy-check")) {
    url.searchParams.set("deploy-check", deployCheck);
  }
  return url.toString();
}

function absoluteUrls(checkPath) {
  return Array.from(new Set([
    new URL(checkPath, baseUrl).toString(),
    new URL(checkPath, canonicalSiteUrl).toString()
  ]));
}

function failContract(url, message) {
  const result = { ok: false, url, error: message };
  failures.push(result);
  console.error(`FAIL ERR ${url} ${message}`);
}

function assertEqual(actual, expected, url, label) {
  if (actual === expected) {
    console.log(`OK contract ${label}`);
    return;
  }

  failContract(url, `${label}: expected ${expected}, got ${actual}`);
}

function assertIncludesAny(text, expectedValues, url, label) {
  if (expectedValues.some((expected) => text.includes(expected) || text.includes(escapeXml(expected)))) {
    console.log(`OK contract ${label}`);
    return;
  }

  failContract(url, `${label}: missing one of ${expectedValues.join(", ")}`);
}

function assertNotIncludes(text, unexpected, url, label) {
  if (!text.includes(unexpected) && !text.includes(escapeXml(unexpected))) {
    console.log(`OK contract ${label}`);
    return;
  }

  failContract(url, `${label}: found ${unexpected}`);
}

function assertNotIncludesAny(text, unexpectedValues, url, label) {
  const found = unexpectedValues.find((unexpected) => text.includes(unexpected) || text.includes(escapeXml(unexpected)));

  if (!found) {
    console.log(`OK contract ${label}`);
    return;
  }

  failContract(url, `${label}: found ${found}`);
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (!url.pathname.endsWith("/")) {
    url.pathname = `${url.pathname}/`;
  }
  return url;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
