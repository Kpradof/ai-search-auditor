# AI Search Readiness Scoring Rubric

Deterministic, auditable. No vibes. Every point traceable to a crawl observation.

Each dimension scores 0-20. Five dimensions, total 100.

---

## 1. Bot Access (0-20): site-level

Checks `robots.txt` posture for AI crawlers. Score is the count of AI bots **not blocked** (and not implicitly blocked via `User-agent: *` Disallow), capped at 20.

Bots checked (worth 2 points each, max 20):

| Bot | Operator | Purpose |
|---|---|---|
| `GPTBot` | OpenAI | Training crawler |
| `OAI-SearchBot` | OpenAI | ChatGPT Search index |
| `ChatGPT-User` | OpenAI | On-demand fetches in ChatGPT |
| `ClaudeBot` | Anthropic | Training + Claude.ai citations |
| `anthropic-ai` | Anthropic | Legacy / Claude.ai web search |
| `Claude-Web` | Anthropic | Real-time Claude fetches |
| `PerplexityBot` | Perplexity | Perplexity index |
| `Perplexity-User` | Perplexity | On-demand fetches |
| `Google-Extended` | Google | Gemini + AI Overviews opt-in |
| `Applebot-Extended` | Apple | Apple Intelligence opt-in |

Special cases:
- Site has no `robots.txt`: score 20 (all bots implicitly allowed). Flag this in notes; it's permissive but not deliberate.
- Site `Disallow: /` to `User-agent: *` with no AI-bot-specific allows: score 0.
- Site blocks bots explicitly but allows via specific User-agent block: score per-bot.

---

## 2. Discovery (0-20): site-level

How easy is it for AI crawlers to discover and ingest your content?

| Check | Points |
|---|---|
| `/llms.txt` present and valid | 6 |
| `/llms-full.txt` present | 3 |
| `sitemap.xml` present and referenced in `robots.txt` | 4 |
| Canonical URLs present on >95% of indexable pages | 3 |
| RSS/Atom feed present | 2 |
| HTML sitemap or clear hub pages (in nav) | 2 |

Total max 20. Partial credit allowed (e.g. `llms.txt` exists but only lists homepage: 3/6).

---

## 3. Structure (0-20): per page, averaged for site

Structured data and semantic HTML signals that help LLMs parse content.

| Check | Points |
|---|---|
| Has any schema.org JSON-LD | 3 |
| Has page-appropriate primary schema (Article/Product/Recipe/HowTo/FAQPage) | 5 |
| Has Organization or Person schema linked to author | 3 |
| Has BreadcrumbList schema | 2 |
| Single H1 present | 2 |
| Logical heading hierarchy (no skipped levels) | 2 |
| Semantic landmarks (`<main>`, `<article>`, `<nav>`) | 3 |

Auto-zero this dimension if page is non-indexable.

---

## 4. Citability (0-20): per page

Patterns LLMs preferentially cite. Based on observed citation behavior in published LLM-citation studies and our own pattern library.

| Check | Points |
|---|---|
| Definitive answer / TL;DR in first 100 words | 5 |
| Has at least one Q&A pair or FAQ-style section | 3 |
| Uses bulleted or numbered lists of facts | 2 |
| Named entities (proper nouns, products, people) > 5 in body | 2 |
| Has visible publish date and last-updated date | 2 |
| Has cited sources / external authoritative links (>=2) | 3 |
| Body content > 300 words and < 3000 words (sweet spot) | 2 |
| Avoids walls of marketing copy in first paragraph (heuristic: first paragraph contains a concrete fact, number, or definition) | 1 |

---

## 5. Authority Signals (0-20): per page (with site-level lift)

LLMs cite sources that look authoritative.

| Check | Points |
|---|---|
| Author byline visible (name in HTML, not just JSON-LD) | 3 |
| Author has linked profile or schema.org Person | 3 |
| Site has an `/about` page reachable in <=2 clicks from page | 2 |
| Page links to >=1 primary research / .gov / .edu / official spec | 3 |
| Site Organization schema includes `sameAs` to LinkedIn/Wikipedia/Crunchbase | 3 |
| Page has >=10 internal inlinks from other indexable pages | 3 |
| Site has been linked from Wikipedia (manual check, optional; skip if not verifiable) | 3 |

---

## Page bucket thresholds

Per-page total = Structure + Citability + Authority (out of 60), plus site-wide Bot Access + Discovery (out of 40) added uniformly to every page.

- **Strong**: 80-100
- **Decent**: 60-79
- **Weak**: 40-59
- **Invisible**: 0-39

---

## Score-gain estimation

When recommending fixes, estimate expected score gain conservatively:

- Adding `llms.txt`: +6 site-wide (Discovery).
- Unblocking AI bots in robots.txt: +2 per bot unblocked (Bot Access).
- Adding Article schema to a page lacking it: +5 (Structure, per page).
- Rewriting first paragraph to definitive-answer style: +5 (Citability, per page).
- Adding author byline + Person schema: +6 (Authority + Structure, per page).

These are tuning targets. Actual gain on re-audit may differ +/- 20%.
