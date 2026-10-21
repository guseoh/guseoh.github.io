import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectDocumentImages } from "./document-image-usage.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sections = ["docs", "src/content/blog"];
const markdown = [path.join(root, "README.md")];
const failures = [];
const references = new Set();
const imageSuffix = /\.(?:png|jpe?g|gif|webp|avif|svg|ico)$/i;

async function walk(directory) {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, item.name);
    if (item.isDirectory()) files.push(...await walk(target));
    else if (item.isFile()) files.push(target);
  }
  return files;
}

for (const section of sections) {
  markdown.push(...(await walk(path.join(root, section))).filter((file) => file.endsWith(".md")));
}

for (const file of markdown) {
  const result = await inspectDocumentImages(await readFile(file, "utf8"), file, root);
  result.referenced.forEach((entry) => references.add(entry));
  for (const error of result.errors) failures.push(path.relative(root, file) + ": " + error);
}

// Blog image optimization and orphan checks are performed by audit-images.mjs;
// this additionally protects local README/docs assets from going stale.
const docsAssets = (await walk(path.join(root, "docs", "images"))).filter((file) => imageSuffix.test(file));
const orphans = docsAssets.filter((file) => !references.has(file));
for (const file of orphans) {
  failures.push("Unreferenced docs image: " + path.relative(root, file));
}

console.log("[document:image:audit] " + markdown.length + " Markdown files checked; "
  + references.size + " referenced local images; "
  + docsAssets.length + " docs images; " + orphans.length + " unused docs images");
for (const failure of failures) console.error("[document:image:audit] FAIL " + failure);
if (failures.length) process.exitCode = 1;
