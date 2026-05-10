import { defineConfig } from "astro/config";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import keystatic from "@keystatic/astro";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://blog.tomorrowdawn.cc",
  base: "",
  adapter: vercel(),
  security: {
    allowedDomains: [
      {
        protocol: "https",
        hostname: "blog.tomorrowdawn.cc",
      },
    ],
  },

  integrations: [sitemap(), react(), keystatic()],

  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      theme: "github-light",
    },
  },
});
