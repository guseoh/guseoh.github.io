const baseUrl = new URL(process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:4322");
const paths = [
  "/projects/",
  "/projects/devpedia/",
  "/projects/pawcycle-commerce/",
  "/projects/futmatch/",
  "/about/",
  "/tags/data-structure/",
  "/tags/spring-security/",
  "/blog/security/basic1/",
  "/blog/spring-security/"
];
const failures = [];

for (const path of paths) {
  const url = new URL(path, baseUrl);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "guseoh-project-route-smoke-test" }
    });
    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok || !contentType.includes("text/html")) {
      failures.push(`${response.status} ${url} ${contentType}`);
      continue;
    }

    const text = await response.text();
    if (!text.includes("<main") || !text.includes("<h1")) {
      failures.push(`invalid document landmarks ${url}`);
      continue;
    }

    console.log(`OK ${response.status} ${url}`);
  } catch (error) {
    failures.push(`ERR ${url} ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  console.error(`Project route smoke test failed for ${failures.length} route(s).`);
  process.exit(1);
}

console.log(`Project route smoke test passed for ${paths.length} route(s).`);
