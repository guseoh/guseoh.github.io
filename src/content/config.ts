import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).min(1),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    heroImage: z.string().optional()
  })
});

export const collections = { blog };
