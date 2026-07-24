import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import booksData from "./data/books.json";
import seriesData from "./data/series.json";

const configuredBookIds = new Set(
  (booksData as Array<{ id: string }>).map((book) => book.id)
);

const configuredSeriesIds = new Set(
  (seriesData as Array<{ id: string }>).map((series) => series.id)
);

const blogSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  date: z.date(),
  updated: z.date().optional(),
  lastVerified: z.date().optional(),
  category: z.string().trim().min(1),
  tags: z.array(z.string()).default([]),
  slug: z.string().trim().min(1),
  aliases: z.array(z.string().trim().min(1)).default([]),
  commentKey: z.string().trim().min(1),
  book: z.string().trim().optional().refine(
    (bookId) => !bookId || configuredBookIds.has(bookId),
    {
      message: "등록되지 않은 Book id입니다. src/data/books.json에 Book을 추가하거나 올바른 id를 사용해 주세요."
    }
  ),
  series: z.string().trim().optional().refine(
    (seriesId) => !seriesId || configuredSeriesIds.has(seriesId),
    {
      message: "등록되지 않은 Series id입니다. src/data/series.json에 Series를 추가하거나 올바른 id를 사용해 주세요."
    }
  ),
  chapter: z.number().int().positive().optional(),
  seriesOrder: z.number().optional(),
  heroImage: z.string().optional(),
  testedWith: z.record(z.string().trim().min(1), z.string().trim().min(1)).optional(),
  draft: z.boolean()
}).superRefine((data, context) => {
  if (data.updated && data.updated < data.date) {
    context.addIssue({
      code: "custom",
      path: ["updated"],
      message: "updated는 date보다 빠를 수 없습니다."
    });
  }

  if (data.lastVerified && data.lastVerified < data.date) {
    context.addIssue({
      code: "custom",
      path: ["lastVerified"],
      message: "lastVerified는 date보다 빠를 수 없습니다."
    });
  }

  const normalizedTags = data.tags.map((tag) => tag.trim().toLowerCase());
  if (new Set(normalizedTags).size !== normalizedTags.length) {
    context.addIssue({
      code: "custom",
      path: ["tags"],
      message: "tags에는 중복 값을 사용할 수 없습니다."
    });
  }
});

const blog = defineCollection({
  loader: glob({
    pattern: "**/[!_]*.md",
    base: "./src/content/blog"
  }),
  schema: blogSchema,
});

export const collections = { blog };
