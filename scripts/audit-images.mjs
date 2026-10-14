import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const blogRoot = path.join(root, "src/content/blog");
const distRoot = path.join(root, "dist");
const optimizedDir = path.join(distRoot, "_astro");
const oneMiB = 1024 * 1024;
const maxEmittedImageBytes = 512 * 1024;
const imageSuffix = /\.(?:png|jpe?g|gif|webp|avif)$/i;
const failures = [];

const markdown = (await walk(blogRoot)).filter((file) =>
  file.endsWith(".md") && !path.basename(file).startsWith("_")
);
const assets = (await walk(blogRoot)).filter((file) => imageSuffix.test(file));
const used = new Set();
let publishedPostsWithImages = 0;

for (const file of markdown) {
  const source = await readFile(file, "utf8");
  const refs = new Set();

  for (const match of source.matchAll(/!\[[^\]]*]\(\s*(?:<([^>]+)>|([^)\s]+))/g)) {
    refs.add(match[1] ?? match[2]);
  }
  for (const match of source.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    refs.add(match[1]);
  }

  let localImageCount = 0;
  for (const reference of refs) {
    if (!reference || /^(?:[a-z][\w+.-]*:|\/\/|\/|#)/i.test(reference)) continue;
    let decoded;
    try {
      decoded = decodeURIComponent(reference.split(/[?#]/)[0]);
    } catch {
      failures.push("Invalid encoded image reference: " + reference + " in " + path.relative(root, file));
      continue;
    }

    const resolved = path.resolve(path.dirname(file), decoded);
    if (!resolved.startsWith(blogRoot + path.sep)) {
      failures.push("Image reference escapes blog directory: " + reference + " in " + path.relative(root, file));
      continue;
    }
    if (!imageSuffix.test(resolved)) continue;

    used.add(resolved);
    localImageCount++;
    try {
      await stat(resolved);
    } catch {
      failures.push("Missing referenced image: " + path.relative(root, resolved));
    }
  }

  // Draft content is tracked but not emitted in dist.
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const isDraft = /^draft:\s*true\s*$/m.test(frontmatter);
  if (!isDraft && localImageCount > 0) {
    publishedPostsWithImages++;
    const slug = frontmatter.match(/^slug:\s*["']?([^\n"']+)/m)?.[1]?.trim();
    if (!slug) {
      failures.push("Missing post slug for " + path.relative(root, file));
      continue;
    }
    const htmlFile = path.join(distRoot, "blog", slug, "index.html");
    try {
      const html = await readFile(htmlFile, "utf8");
      if (!/\.webp(?:\?|["'\s>])/i.test(html)) {
        failures.push("Missing optimized WebP image in " + path.relative(root, htmlFile));
      }
    } catch {
      failures.push("Missing published article HTML: " + path.relative(root, htmlFile));
    }
  }
}

const orphan = assets.filter((file) => !used.has(file));
const orphanLarge = [];
for (const file of orphan) {
  const size = (await stat(file)).size;
  if (size >= oneMiB) orphanLarge.push({ file, size });
}

let emittedImages;
try {
  emittedImages = (await walk(optimizedDir)).filter((file) => imageSuffix.test(file));
} catch {
  emittedImages = [];
  failures.push("Missing dist/_astro image assets: run npm run build first");
}

let totalEmitted = 0;
let largestEmitted = 0;
let webpCount = 0;
for (const file of emittedImages) {
  const { size } = await stat(file);
  totalEmitted += size;
  largestEmitted = Math.max(largestEmitted, size);
  if (/\.webp$/i.test(file)) webpCount++;
  if (size > maxEmittedImageBytes) {
    failures.push("Large generated image (" + (size / 1024).toFixed(1) + " KiB): " + path.relative(root, file));
  }
}
if (publishedPostsWithImages && webpCount === 0) {
  failures.push("Published posts use images but optimized WebP output is missing");
}

console.log("[image:audit] " + used.size + "/" + assets.length + " local blog images referenced; " + orphan.length + " unused");
console.log("[image:audit] " + emittedImages.length + " generated images (" + webpCount + " WebP); " + (totalEmitted / 1024).toFixed(1) + " KiB total; max " + (largestEmitted / 1024).toFixed(1) + " KiB");
if (orphanLarge.length) {
  console.warn("[image:audit] " + orphanLarge.length + " unreferenced source images >= 1 MiB (not delivered in article pages):");
  for (const { file, size } of orphanLarge) {
    console.warn("[image:audit]  - " + path.relative(root, file) + " (" + (size / oneMiB).toFixed(2) + " MiB)");
  }
}

if (failures.length) {
  failures.forEach((failure) => console.error("[image:audit] FAIL " + failure));
  process.exitCode = 1;
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(file));
    else if (entry.isFile()) out.push(file);
  }
  return out;
}
