import { defineConfig } from "astro/config";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import sitemap from "@astrojs/sitemap";
import keystatic from "@keystatic/astro";

export default defineConfig({
  site: "https://blog.tomorrowdawn.cc",
  base: "",

  integrations: [sitemap(), keystatic()],

  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      theme: "github-light",
    },
  },
});
