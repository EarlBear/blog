import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  // The filename (kebab-slug) becomes the URL slug; no date prefix.
  // Both .md and .mdx are posts — .mdx lets a post embed components inline.
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    // The questions this post was written to answer — usually taken from the
    // request that prompted it (the "why" behind the post). Rendered as a
    // block at the top of every post; required so it can't be skipped.
    questions: z.array(z.string()).min(1),
    // Author ids (file stems in src/content/authors/), in byline order.
    // Validated against the authors collection in src/lib/authors.ts.
    authors: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const authors = defineCollection({
  // Filename (kebab-slug) is the author id, referenced by posts.
  loader: glob({ pattern: '**/*.md', base: './src/content/authors' }),
  schema: z.object({
    name: z.string(),
    role: z.string().optional(),
    // Lower sorts first on the authors index; ties fall back to name.
    order: z.number().default(100),
    avatar: z.string().optional(), // URL/path, e.g. /vendor/earl-mark.svg
    socials: z
      .object({
        github: z.string().optional(),
        x: z.string().optional(),
        bluesky: z.string().optional(),
        discord: z.string().optional(),
        website: z.string().optional(),
      })
      .default({}),
  }),
});

export const collections = { blog, authors };
