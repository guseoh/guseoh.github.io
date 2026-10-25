import { readFile } from "node:fs/promises";
const [allPath, productionPath] = process.argv.slice(2);
if (!allPath || !productionPath) throw new Error("Usage: node scripts/audit-dependencies.mjs all.json production.json");

let hasBlocker = false;
for (const [name, file] of [["all", allPath], ["production", productionPath]]) {
  let report;
  try {
    report = JSON.parse(await readFile(file, "utf8"));
  } catch {
    throw new Error("Cannot parse npm audit results (" + name + "); audit remains unverified");
  }
  if (!report.metadata?.vulnerabilities || typeof report.metadata.vulnerabilities !== "object") {
    throw new Error("npm registry audit metadata missing (" + name + "); audit remains unverified");
  }
  const levels = report.metadata.vulnerabilities;
  const result = Object.fromEntries(["info", "low", "moderate", "high", "critical", "total"]
    .map((key) => [key, Number(levels[key] || 0)]));
  console.log("[dependency:audit] " + name + " " + JSON.stringify(result));
  // Print only package/advisory metadata, never registry auth or environment.
  for (const [packageName, finding] of Object.entries(report.vulnerabilities || {})) {
    if (!["high", "critical"].includes(finding.severity)) continue;
    const advisories = (finding.via || []).filter((entry) => entry && typeof entry === "object")
      .map((entry) => ({
        title: String(entry.title || "").slice(0, 110),
        url: String(entry.url || "").slice(0, 170),
        range: String(entry.range || "").slice(0, 80)
      }));
    console.log("[dependency:audit] finding " + JSON.stringify({
      scope: name, package: packageName, severity: finding.severity,
      range: finding.range, fixAvailable: finding.fixAvailable,
      isDirect: finding.isDirect, advisories
    }));
  }
  if (name === "production" && (result.high || result.critical)) {
    console.error("::error::Production dependencies have high/critical audit findings; investigate before merge.");
    hasBlocker = true;
  } else if (result.high || result.critical) {
    console.warn("::warning::Development dependencies have high/critical findings; review packages and advisories.");
  }
}
if (hasBlocker) process.exitCode = 1;
