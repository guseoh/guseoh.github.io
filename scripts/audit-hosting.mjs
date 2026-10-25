/**
 * GitHub Pages owns response headers. Report actual production observations
 * without claiming a static _headers file or Astro Response headers will work.
 */
const targets = [
  "https://guseoh.github.io/",
  "https://guseoh.github.io/blog/security/basic1/",
  "https://guseoh.github.io/search-index.json"
];
const keys = ["strict-transport-security", "content-security-policy", "referrer-policy",
  "permissions-policy", "x-content-type-options", "x-frame-options", "cache-control", "etag"];
for (const url of targets) {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(8000) });
    const observed = Object.fromEntries(keys.map((key) => [key, response.headers.get(key) || "(not present)"]));
    console.log("[hosting:audit] " + JSON.stringify({ url, status: response.status, headers: observed }));
    if (!response.ok) console.warn("[hosting:audit] HEAD not successful: " + response.status);
  } catch (error) {
    console.warn("[hosting:audit] Unavailable: " + url + " — " + (error instanceof Error ? error.message : String(error)));
  }
}
try {
  const response = await fetch("http://guseoh.github.io/", {
    method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(7000)
  });
  const location = response.headers.get("location") ?? "";
  console.log("[hosting:audit] HTTP redirect: " + JSON.stringify({
    status: response.status,
    redirectsToHttps: location.startsWith("https://")
  }));
} catch (error) {
  console.warn("[hosting:audit] HTTP redirect observation unavailable: "
    + (error instanceof Error ? error.message : String(error)));
}
console.log("[hosting:audit] The CDN may cache a previous deploy. HTTP headers are controlled by GitHub Pages, not static Astro markup.");
