import { readdir, readFile } from "node:fs/promises";
const dir = ".lighthouseci";
let files;
try { files = (await readdir(dir)).filter((name) => name.startsWith("lhr-") && name.endsWith(".json")); }
catch { files = []; }
if (!files.length) {
  console.warn("[web-vitals:audit] Lighthouse report JSON not found; no lab timing claims.");
} else {
  for (const file of files) {
    const data = JSON.parse(await readFile(dir + "/" + file, "utf8"));
    const ms = (key) => data.audits?.[key]?.numericValue;
    console.log("[web-vitals:audit] " + JSON.stringify({
      url: data.finalDisplayedUrl ?? data.finalUrl,
      performanceScore: data.categories?.performance?.score,
      LCPms: ms("largest-contentful-paint") ?? null,
      CLS: ms("cumulative-layout-shift") ?? null,
      TBTms: ms("total-blocking-time") ?? null,
      INPms: null
    }));
  }
}
console.log("[web-vitals:audit] INP requires field interaction data; one-off Lighthouse lab runs cannot establish INP.");
