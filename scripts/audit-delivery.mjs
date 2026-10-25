import { readFile, readdir, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const formatKiB = (bytes) => (bytes / 1024).toFixed(1) + " KiB";
const index = JSON.parse(await readFile(path.join(output, "search-index.json"), "utf8"));
if (!Array.isArray(index)) throw new Error("search-index.json must be a JSON array");
const searchJson = await readFile(path.join(output, "search-index.json"));
console.log("[delivery:audit] Search index: " + index.length + " posts; "
  + formatKiB(searchJson.length) + " raw / " + formatKiB(gzipSync(searchJson).length) + " gzip");

// Measure actual CSS referenced by generated HTML rather than estimating from
// source file sizes. Vite may merge or re-order authored @imports.
const routes = ["/", "/blog/", "/search/", "/books/", "/series/", index[0]?.url].filter(Boolean);
for (const route of routes) {
  const htmlFile = path.join(output, route.slice(1), "index.html");
  const html = await readFile(htmlFile, "utf8");
  const hrefs = new Set();
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!rel.split(/\s+/).includes("stylesheet") || !href) continue;
    const url = new URL(href, "https://guseoh.github.io");
    if (url.origin === "https://guseoh.github.io" && url.pathname.endsWith(".css")) {
      hrefs.add(url.pathname);
    }
  }
  let raw = 0;
  let gzipped = 0;
  for (const href of hrefs) {
    const css = await readFile(path.join(output, href.slice(1)));
    raw += css.length;
    gzipped += gzipSync(css).length;
  }
  const inlineCss = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .reduce((sum, match) => sum + Buffer.byteLength(match[1]), 0);
  console.log("[delivery:audit] " + route + " CSS: " + hrefs.size
    + " stylesheet(s), " + formatKiB(raw) + " raw / " + formatKiB(gzipped)
    + " gzip; inline: " + formatKiB(inlineCss));
}

// Global emitted JavaScript counts supplement route CSS measurements: these are
// compressed build bytes, not transfer size for a specific page or INP data.
const astroAssets = path.join(output, "_astro");
const assetNames = await readdir(astroAssets);
let jsRaw = 0;
let jsGzip = 0;
let jsCount = 0;
let largestJsGzip = 0;
for (const name of assetNames) {
  if (!name.endsWith(".js")) continue;
  const bytes = await readFile(path.join(astroAssets, name));
  const gzipBytes = gzipSync(bytes).length;
  jsCount += 1;
  jsRaw += bytes.length;
  jsGzip += gzipBytes;
  largestJsGzip = Math.max(largestJsGzip, gzipBytes);
}
console.log("[delivery:audit] Emitted JS: " + jsCount + " assets; "
  + formatKiB(jsRaw) + " raw / " + formatKiB(jsGzip)
  + " gzip total; max file " + formatKiB(largestJsGzip));

// Inspect all optimized raster images, but do not mix image bytes with CSS/JS.
let rasterBytes = 0;
let rasterCount = 0;
for (const name of assetNames) {
  if (!/\.(?:png|webp|avif|jpe?g)$/i.test(name)) continue;
  rasterCount += 1;
  rasterBytes += (await stat(path.join(astroAssets, name))).size;
}
console.log("[delivery:audit] Raster assets: " + rasterCount + " assets; "
  + formatKiB(rasterBytes) + " raw build bytes");

// A HEAD request is only an observation of production's current response.
// Never fail a development build because a remote host cannot be reached.
if (process.env.AUDIT_LIVE_CACHE === "1") {
  try {
    const response = await fetch("https://guseoh.github.io/search-index.json", {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
      redirect: "follow"
    });
    const headers = response.headers;
    console.log("[delivery:audit] Published search-index.json HEAD: "
      + JSON.stringify({
        status: response.status,
        cacheControl: headers.get("cache-control"),
        etag: headers.get("etag"),
        age: headers.get("age"),
        lastModified: headers.get("last-modified"),
        contentLength: headers.get("content-length")
      }));
  } catch (error) {
    console.warn("[delivery:audit] Published cache headers unavailable: " + error.message);
  }
}
