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

    // --- Delfineo Call (optional) ----------------------------------
    // Rendered as a sticky sidebar on the research detail page and as
    // a right-rail summary on the research index row. Optional so
    // legacy markdown without these fields keeps building.
    rating: z.enum(["We Own", "We Don't Own"]).optional(),
    rationale: z.string().optional(),
    fairValue: z.string().optional(),
    bullets: z.array(z.string()).optional(),
  }),
});

const news = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.string(),
    date: z.string(),
    dateDisplay: z.string(),
    summary: z.string(),
    insight: z.string().optional(),
    order: z.number().optional(),

    // Optional news extras for the editorial layout
    bullets: z.array(z.string()).optional(),
    source: z.string().optional(),
    readMinutes: z.number().optional(),
  }),
});

export const collections = { research, news };
