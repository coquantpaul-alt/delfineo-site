// Static JSON search index for English content. Served at /search-en.json
// Regenerated on every build. No runtime server needed.
import { getCollection } from 'astro:content';

export async function GET() {
  const news = await getCollection('news', ({ id }) => id.startsWith('en/'));
  const research = await getCollection('research', ({ id }) => id.startsWith('en/'));

  const clean = (s: string | undefined) =>
    (s || '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 280);

  const entries = [
    ...news.map((n) => ({
      kind: 'news',
      title: n.data.title,
      summary: clean(n.data.summary),
      category: n.data.category,
      date: n.data.date,
      dateDisplay: n.data.dateDisplay,
      url: '/en/news/' + n.slug.replace('en/', '') + '/',
    })),
    ...research.map((r) => ({
      kind: 'research',
      title: r.data.title,
      summary: clean(r.data.subtitle),
      category: r.data.category,
      date: r.data.date,
      dateDisplay: r.data.date,
      readTime: r.data.readTime,
      url: '/en/research/' + r.slug.replace('en/', '') + '/',
    })),
  ];

  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
