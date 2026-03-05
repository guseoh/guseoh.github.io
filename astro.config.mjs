import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://guseo.github.io",
  integrations: [sitemap()]
});
