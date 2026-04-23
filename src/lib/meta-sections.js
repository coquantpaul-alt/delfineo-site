// ─── Meta-section mapping ─────────────────────────────────────────
// Each article's `category` frontmatter maps to one of six meta-sections.
// Both EN and FR category labels are handled by the same map. Keep the
// keys short (markets/corp/tech/energy/geo/macro) — they're used as CSS
// hooks (.cat-markets) and as data-meta attributes for the filter.

const MAP = {
  // ── Markets & Capital ──
  'Banking':'markets', 'Fintech':'markets', 'Insurance':'markets',
  'Private Credit':'markets', 'Private Equity':'markets', 'Private Capital':'markets',
  'IPOs':'markets', 'Sovereign Debt':'markets', 'Monetary Policy':'markets',
  'Mergers & Acquisitions':'markets', 'M&A':'markets',
  'Banque':'markets', 'Assurance':'markets',
  'Crédit Privé':'markets', 'Capital-Investissement':'markets', 'Capital-investissement':'markets',
  'IPO':'markets', 'Dette Souveraine':'markets', 'Politique Monétaire':'markets',
  'Fusions & Acquisitions':'markets', 'Fusions-Acquisitions':'markets',

  // ── Companies ──
  'Luxury Goods':'corp', 'Consumer Goods':'corp', 'Automotive':'corp', 'Retail':'corp',
  'Food & Beverage':'corp', 'Industrials':'corp', 'Industrial':'corp', 'Industry':'corp',
  'Transportation':'corp', 'Travel & Leisure':'corp', 'Media':'corp', 'B2B Services':'corp',
  'Telecoms':'corp', 'Aerospace':'corp', 'Airlines':'corp',
  'Luxe':'corp', 'Grande Consommation':'corp', 'Automobile':'corp', 'Distribution':'corp',
  'Agroalimentaire':'corp', 'Industrie':'corp', 'Transport':'corp', 'Tourisme et Loisirs':'corp',
  'Médias':'corp', 'Services B2B':'corp', 'Télécoms':'corp',
  'Aéronautique':'corp', 'Aérien':'corp',

  // ── Tech ──
  'Technology':'tech', 'Technologie':'tech',

  // ── Energy & Commodities ──
  'Energy':'energy', 'Commodities':'energy', 'Food Security':'energy',
  'Énergie':'energy', 'Matières Premières':'energy', 'Sécurité Alimentaire':'energy',

  // ── Geopolitics & Defence ──
  'Geopolitics':'geo', 'Defence':'geo', 'Politics':'geo',
  'Géopolitique':'geo', 'Défense':'geo', 'Politique':'geo',

  // ── Macro ──
  'Economy':'macro', 'Global Economy':'macro', 'Global Trade':'macro',
  'Public Finances':'macro', 'Education':'macro',
  'Économie':'macro', 'Économie Mondiale':'macro', 'Commerce Mondial':'macro',
  'Finances Publiques':'macro', 'Éducation':'macro',
};

export function metaFor(category) {
  // Fallback to 'corp' keeps the page from breaking on new categories —
  // but new labels should be added above so counts stay accurate.
  return MAP[category] || 'corp';
}

export const META_KEYS = ['markets','corp','tech','energy','geo','macro'];

export const META_LABELS = {
  en: {
    all:     'All',
    markets: 'Markets & Capital',
    corp:    'Companies',
    tech:    'Tech',
    energy:  'Energy & Commodities',
    geo:     'Geopolitics & Defence',
    macro:   'Macro',
  },
  fr: {
    all:     'Tout',
    markets: 'Marchés & Capital',
    corp:    'Entreprises',
    tech:    'Tech',
    energy:  'Énergie & Matières Premières',
    geo:     'Géopolitique & Défense',
    macro:   'Macro',
  },
};

export const META_RESULT_TEMPLATE = {
  en: (n, name) => `Showing ${n} ${n === 1 ? 'story' : 'stories'} in ${name}`,
  fr: (n, name) => `${n} ${n === 1 ? 'article' : 'articles'} dans ${name}`,
};
