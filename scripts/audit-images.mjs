import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectImageReferences, resolveLocalImageReference } from "./image-usage.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const blogRoot = path.join(root, "src/content/blog");
const distRoot = path.join(root, "dist");
const optimizedDir = path.join(distRoot, "_astro");
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
  const refs = collectImageReferences(source);

  let localImageCount = 0;
  for (const reference of refs) {
    let resolved;
    try {
      resolved = resolveLocalImageReference(reference, file, blogRoot);
    } catch (error) {
      failures.push(error.message + " in " + path.relative(root, file));
      continue;
    }
    if (!resolved) continue;

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
const orphanDetails = await Promise.all(orphan.map(async (file) => ({
  file,
  size: (await stat(file)).size
})));

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
if (orphanDetails.length) {
  console.warn("[image:audit] Unreferenced blog source images (including small files):");
  for (const { file, size } of orphanDetails) {
    console.warn("[image:audit]  - " + path.relative(root, file) + " (" + (size / 1024).toFixed(1) + " KiB)");
  }
  if (process.env.CI === "true" || process.env.IMAGE_AUDIT_STRICT === "1") {
    failures.push("Unreferenced blog images found: " + orphanDetails.length);
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
