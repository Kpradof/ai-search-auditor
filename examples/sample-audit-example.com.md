# AI Search Readiness Audit: example.com

**Crawled:** 2026-05-26 · **URLs crawled:** 412 · **JS rendering:** off
**Site score:** 47/100 · **Top-50 page average:** 51/100

> Sample/illustrative report. Numbers are representative of a typical mid-size B2B SaaS site that has not yet adapted to AI search. Use this as a reference for what your real audit will look like.

---

## Headline finding

example.com is mid-pack on schema and content quality but **invisible to most AI engines** because it ships no `llms.txt`, has Google-Extended blocked in `robots.txt`, and 84% of top-traffic pages bury the answer below the fold. The single highest-leverage change is **publishing an `llms.txt` and unblocking AI crawlers**. Together those alone move the site score from 47 to 65 in one deploy.

---

## Score breakdown

| Dimension | Score | What's blocking max |
|---|---|---|
| Bot Access | 8 / 20 | GPTBot, ClaudeBot, PerplexityBot allowed; Google-Extended, Applebot-Extended, OAI-SearchBot, ChatGPT-User, Perplexity-User, anthropic-ai, Claude-Web all explicitly `Disallow: /`. |
| Discovery | 6 / 20 | No `llms.txt`. No `llms-full.txt`. sitemap.xml exists but not referenced in robots.txt. Canonical present on 91% of pages (just under threshold). RSS missing. |
| Structure | 11 / 20 | Article schema on blog only; product pages have no schema. No BreadcrumbList anywhere. Three pages have two H1s. |
| Citability | 14 / 20 | Definitive answers in first 100 words on only 16% of blog posts. No FAQ-style sections. Dates visible but no `dateModified`. |
| Authority | 8 / 20 | Author bylines on blog only, no Person schema. Organization schema missing `sameAs`. About page reachable in 1 click. Only 12% of articles link to primary sources. |

---

## Top 5 fixes that move the needle

1. **Publish `llms.txt` at `https://example.com/llms.txt`**. Effort: S · gain: +6 (Discovery). Generated at `reports/example.com/llms.txt`. Review the section grouping, then deploy as-is.

2. **Unblock the 7 AI crawlers currently `Disallow: /`**. Effort: S · gain: +14 (Bot Access). Patch at `reports/example.com/robots-ai-bots-patch.txt`. Note: Google-Extended unblock alone makes you eligible for AI Overviews citations on existing Google index. Single highest ROI line in this audit.

3. **Add Product schema to the 47 product pages**. Effort: M · gain: +5 site-wide (Structure). Patches generated in `reports/example.com/schema-patches/`. 47 files, each with `name`, `description`, `url` pre-filled and TODO markers on price/availability/SKU.

4. **Rewrite first paragraph on the top-20 blog posts by inlink count**. Effort: M · gain: +5 per page (Citability). See `reports/example.com/content-rewrite-recs.md`. Pattern: lead with the definitive answer in 30-60 words, then expand.

5. **Add `sameAs` array to Organization schema**. Effort: S · gain: +3 (Authority). Link to LinkedIn, Crunchbase, X, Wikipedia. Template at `reports/example.com/schema-patches/organization.json`.

---

## Page buckets

- **Strong (80-100)**: 0 pages
- **Decent (60-79)**: 23 pages (mostly long-form blog posts with author bylines and dates)
- **Weak (40-59)**: 187 pages
- **Invisible (0-39)**: 202 pages (priority list: top 10 by inlink count below)

### Invisible pages by inlink count (priority fix list)

| URL | Inlinks | Score | Top miss |
|---|---|---|---|
| /pricing | 412 | 31 | No schema, no clear answer to "what does it cost" in first 100 words |
| /features | 388 | 34 | Marketing copy walls in first paragraph, no definitive feature definitions |
| /integrations | 294 | 36 | List page with no individual integration schema |
| /security | 211 | 29 | Critical buying-question page with no FAQ schema, no dates, no author |
| /docs/getting-started | 188 | 33 | HowTo schema absent; steps not in numbered list format |
| /about | 156 | 37 | Person schema missing for founders |
| /customers | 142 | 35 | No structured testimonial schema |
| /blog/category/product | 138 | 38 | Category page with no description content |
| /contact | 121 | 28 | Empty page from LLM perspective. No Q&A |
| /careers | 98 | 32 | No JobPosting schema |

---

## Generated artifacts

- `reports/example.com/llms.txt`: 50 pages organized by section (Product, Docs, Blog, Customers)
- `reports/example.com/robots-ai-bots-patch.txt`: unblocks 7 AI crawlers, declares sitemap
- `reports/example.com/schema-patches/`: 87 JSON-LD files (47 Product, 23 Article, 12 FAQPage, 1 Organization, 4 Person)
- `reports/example.com/content-rewrite-recs.md`: first-paragraph rewrites for top-20 invisible pages

---

## Appendix: full per-page scores

[Table truncated for example. Real audit includes all 412 URLs with per-dimension breakdown.]

---

## Re-audit recommendation

Run again 4 weeks after deploying the top-5 fixes. Expected post-fix site score: **78/100**. If you fall short, the differential between expected and actual is itself a useful signal, usually means deployment partial or schema validation failed.
