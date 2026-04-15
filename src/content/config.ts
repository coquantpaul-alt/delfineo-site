import { defineCollection, z } from 'astro:content';

const research = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    category: z.string(),
    date: z.string(),
    readTime: z.string(),
    order: z.number().optional(),
  }),
});

const news = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.string(),
    date: z.string(),       // ISO date: 2026-04-15
    dateDisplay: z.string(), // "April 15, 2026" or "15 avril 2026"
    summary: z.string(),
    insight: z.string().optional(),
    order: z.number().optional(),
  }),
});

export const collections = { research, news };
