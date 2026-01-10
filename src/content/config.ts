import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    tags: z.array(z.enum(["math", "philosophy", "code", "other"])).default(["other"]),
    createdAt: z.string(),
    origin: z.string().optional(),
    excerpt: z.string().optional(),
  }),
});

export const collections = { posts };
