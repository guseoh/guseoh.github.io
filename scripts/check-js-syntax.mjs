import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptDirectories = ["scripts", "src/plugins"];
const files = ["astro.config.mjs", "lighthouserc.cjs"];

async function collectScripts(dir) {
  for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectScripts(relative);
    else if (entry.isFile() && /\.[cm]?js$/i.test(entry.name)) files.push(relative);
  }
}

for (const dir of scriptDirectories) await collectScripts(dir);
files.sort();

const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], {
    encoding: "utf8"
  });
  if (result.error || result.status !== 0) {
    failures.push(file);
    console.error("[script:check] " + file + "\n" + (result.stderr || result.error || "Unknown syntax check error"));
  }
}

if (failures.length) {
  console.error("[script:check] " + failures.length + " failed syntax check(s).");
  process.exitCode = 1;
} else {
  console.log("[script:check] Passed for " + files.length + " JavaScript configuration/tool files.");
}
