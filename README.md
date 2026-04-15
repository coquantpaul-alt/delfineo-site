# Delfineo

Independent equity research and market intelligence platform.  
Built with Astro, hosted on Cloudflare Pages, newsletter via Buttondown.

**Cost: $0/month** (up to 100 subscribers), then $9/month (up to 1,000).

---

## Project Structure

```
delfineo/
├── src/
│   ├── content/
│   │   ├── research/
│   │   │   ├── en/          ← English research articles (Markdown)
│   │   │   └── fr/          ← French research articles (Markdown)
│   │   ├── news/
│   │   │   ├── en/          ← English news items (Markdown frontmatter)
│   │   │   └── fr/          ← French news items (Markdown frontmatter)
│   │   └── config.ts        ← Content collection schemas
│   ├── components/
│   │   └── AuthScript.astro  ← Email wall client-side logic
│   ├── layouts/
│   │   └── Base.astro        ← HTML shell
│   ├── pages/
│   │   ├── index.astro       ← Redirects to /en/
│   │   ├── en/               ← English pages
│   │   │   ├── index.astro
│   │   │   ├── research/[slug].astro
│   │   │   └── news/[slug].astro
│   │   └── fr/               ← French pages (mirrors EN)
│   │       ├── index.astro
│   │       ├── research/[slug].astro
│   │       └── news/[slug].astro
│   ├── styles/
│   │   └── global.css        ← Full design system
│   └── i18n.js               ← All UI translations
├── workers/
│   ├── auth-worker.js        ← Cloudflare Worker: email subscribe/reconnect
│   └── newsletter-worker.js  ← Cloudflare Worker: daily 8pm CET newsletter
├── public/
│   └── favicon.svg
├── astro.config.mjs
├── package.json
├── wrangler.toml
└── README.md
```

---

## Quick Start (Local Dev)

```bash
npm install
npm run dev
# → http://localhost:4321
```

---

## Deployment Guide

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create delfineo-site --private --push
```

### Step 2: Connect to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages**
2. Click **"Connect to Git"** → select your `delfineo-site` repo
3. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output:** `dist`
4. Deploy — site is live at `delfineo-site.pages.dev`

### Step 3: Custom Domain

1. In Cloudflare Pages → **Custom domains** → add `delfineo.com`
2. If your domain is already on Cloudflare DNS, it auto-configures
3. If not, add a CNAME record: `delfineo.com → delfineo-site.pages.dev`
4. SSL is automatic

### Step 4: Set Up Buttondown

1. Sign up at [buttondown.com](https://buttondown.com) (free tier = 100 subscribers)
2. Go to **Settings → API** → copy your API key
3. Keep this key — you'll need it for the worker

### Step 5: Deploy Auth Worker

```bash
# Install wrangler globally (if not already)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set your Buttondown API key as a secret
wrangler secret put BUTTONDOWN_API_KEY
# (paste your key when prompted)

# Deploy the auth worker
wrangler deploy workers/auth-worker.js --name delfineo-auth

# Route it to your domain (in Cloudflare dashboard):
# Workers Routes → Add Route:
#   Route: delfineo.com/api/auth
#   Worker: delfineo-auth
```

### Step 6: Deploy Newsletter Worker (Optional)

```bash
# Create a separate wrangler config for the newsletter
wrangler deploy workers/newsletter-worker.js \
  --name delfineo-newsletter \
  --triggers "crons=0 18 * * *"

# Set secrets
wrangler secret put BUTTONDOWN_API_KEY --name delfineo-newsletter
wrangler secret put SITE_URL --name delfineo-newsletter
# (enter: https://delfineo.com)
```

The newsletter worker runs at 18:00 UTC (= 20:00 CET) every day.

---

## Publishing Content

### New Research Article

Create two files (EN + FR) in `src/content/research/`:

**`src/content/research/en/company-name.md`**
```markdown
---
title: "Company: The Investment Thesis"
subtitle: "Why this company is undervalued."
category: "European Industrials"
date: "April 2026"
readTime: "15 min"
order: 1
---

Your analysis goes here in Markdown...
```

**`src/content/research/fr/company-name.md`**
```markdown
---
title: "Entreprise : La Thèse d'Investissement"
subtitle: "Pourquoi cette entreprise est sous-évaluée."
category: "Industrie Européenne"
date: "Avril 2026"
readTime: "15 min"
order: 1
---

Votre analyse ici en Markdown...
```

**Important:** The filename (slug) must match between EN and FR for the language toggle to work.

### New News Item

**`src/content/news/en/ecb-rates-april-2026.md`**
```markdown
---
title: "ECB holds rates at 2.25%"
category: "Monetary Policy"
date: "2026-04-15"
dateDisplay: "April 15, 2026"
summary: "The ECB held rates steady..."
insight: "The key signal is..."
order: 1
---
```

**`src/content/news/fr/ecb-rates-april-2026.md`**
```markdown
---
title: "La BCE maintient ses taux à 2,25%"
category: "Politique Monétaire"
date: "2026-04-15"
dateDisplay: "15 avril 2026"
summary: "La BCE a maintenu ses taux..."
insight: "Le signal clé est..."
order: 1
---
```

### Publish

```bash
git add .
git commit -m "Add new article: Company Name"
git push
# Cloudflare Pages auto-builds in ~30 seconds
```

---

## URL Structure

```
delfineo.com/en/                          ← English homepage (news + research tabs)
delfineo.com/en/research/mediobanca/      ← English research article
delfineo.com/en/news/ecb-rates-april-2026/ ← English news detail
delfineo.com/fr/                          ← French homepage
delfineo.com/fr/research/mediobanca/      ← French research article
delfineo.com/fr/news/ecb-rates-april-2026/ ← French news detail
```

Each page has `<link rel="alternate" hreflang="...">` tags for SEO.

---

## Cost Breakdown

| Service                          | Cost       |
|----------------------------------|------------|
| Cloudflare Pages (hosting + CDN) | $0         |
| Cloudflare Workers (auth + cron) | $0         |
| Buttondown (0-100 subscribers)   | $0         |
| Buttondown (100-1,000 subs)      | $9/month   |
| Domain renewal                   | ~$12/year  |
| **Total (first 100 subs)**       | **$0/mo**  |
| **vs. Ghost**                    | **$30/mo** |

---

## Architecture

```
Reader enters email
        │
        ▼
  ┌─────────────┐     ┌──────────────────┐
  │  Astro Site  │────▶│  Auth Worker      │
  │  (CF Pages)  │     │  POST /api/auth   │
  └─────────────┘     └────────┬───────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │   Buttondown API  │
                      │  (subscriber DB)  │
                      └────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────┐
        │                      │                   │
  Email exists?          Create new           Daily @ 8pm
  → "existing"           → "new"                   │
  → instant access       → subscribed              ▼
                                           ┌───────────────┐
                                           │ Newsletter     │
                                           │ Worker (cron)  │
                                           │ → sends recap  │
                                           └───────────────┘
```
