// Static JSON search index for French content. Served at /search-fr.json
import { getCollection } from 'astro:content';

export async function GET() {
  const news = await getCollection('news', ({ id }) => id.startsWith('fr/'));
  const research = await getCollection('research', ({ id }) => id.startsWith('fr/'));

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
      url: '/fr/news/' + n.slug.replace('fr/', '') + '/',
    })),
    ...research.map((r) => ({
      kind: 'research',
      title: r.data.title,
      summary: clean(r.data.subtitle),
      category: r.data.category,
      date: r.data.date,
      dateDisplay: r.data.date,
      readTime: r.data.readTime,
      url: '/fr/research/' + r.slug.replace('fr/', '') + '/',
    })),
  ];

  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
