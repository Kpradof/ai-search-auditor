---
name: ai-search-audit
description: Audit a website for AI-search readiness (ChatGPT, Claude, Perplexity, Google AI Overviews) using Screaming Frog MCP for the crawl and a deterministic rubric for scoring. Outputs a per-page citability score, a generated llms.txt, a robots.txt patch for AI bots, schema-patch suggestions, and content-restructure recs. Use when the user says "AI search audit", "GEO audit", "AEO audit", "rank in ChatGPT", "llms.txt", "citability check", "/ai-search-audit", or provides a URL alongside any of these phrases.
---

# AI Search Readiness Audit

> **TWO HARD RULES -- read before anything else:**
>
> 1. **Priority table = top 10 pages by inlink count with score < 60 (below Decent).** Always sort by inlinks descending within that filtered set. Never show pages with score >= 60 in this table.
> 2. **No marketing language anywhere.** Banned words in all generated text: "unlock", "supercharge", "game-changer", "revolutionize", "transform your". Use plain, specific language. Write "Adding llms.txt raises Discovery by 6 points" not "Unlock your AI search potential."

End-to-end audit of how citable a website is in generative search engines (ChatGPT, Claude, Perplexity, Google AI Overviews, Gemini). Uses the Screaming Frog MCP server for crawl + extraction, applies a deterministic scoring rubric, generates fixes a developer can ship.

## When to use

- User asks how their site ranks / appears in ChatGPT, Claude, Perplexity, or AI Overviews.
- User wants a GEO (Generative Engine Optimization) or AEO (Answer Engine Optimization) audit.
- User wants an `llms.txt` generated.
- User asks whether their content is "citable" by LLMs.
- User provides a URL and mentions any of: AI search, LLM SEO, llms.txt, citability, AI Overviews, Perplexity, GPTBot.

## Required setup

Before running, the Screaming Frog SEO Spider MCP server (built into SF v24+) must be running. It exposes a Streamable HTTP server on `http://localhost:11435/mcp`. Verify by listing available MCP tools: you should see tools prefixed with `sf_` from the `seospider` server, including:

- `sf_crawl` — start a crawl with a given URL and optional config path
- `sf_list_crawls` — list recent crawl jobs
- `sf_crawl_progress` — check progress of a running crawl
- `sf_generate_bulk_export` — export a data report (Internal, Structured Data, etc.)
- `sf_export_seo_element_urls` — export URLs and data for a specific SEO element (H1, H2, titles, schema, etc.)
- `sf_bulk_export_page_content` — bulk-export full page content in NDJSON format (use for citability analysis)
- `sf_url_info` — detailed JSON report for a single URL
- `sf_url_links` — inlinks or outlinks for a URL
- `sf_list_available_bulk_exports` — list all available bulk export categories

If tools are not visible, run `claude mcp list` and verify `seospider` appears as connected.

If the MCP server is not available, stop and direct the user to the setup steps in `README.md`. The user needs Screaming Frog SEO Spider v24+ installed and the MCP server started via the SF menu (`MCP > Start MCP Server`) or via `File > Settings > MCP Server`.

**Critical pre-flight check:** Start the MCP server from within the SF UI (`MCP > Start MCP Server`) or enable auto-start in `File > Settings > MCP Server`. The server URL will show as `http://localhost:11435/mcp` in the SF status bar. If a tool call returns a connection error, confirm the server is running before retrying.

**SF Node runtime:** The Node.js runtime inside SF is disabled by default (`File > Settings > MCP Server > Enable Node tools`). The `sf_run_node_js_script` calls in this skill will fail silently if it is off. If Node is unavailable, fall back to running the scripts locally via bash: `node scripts/<script>.js <args>` from the repo root. The scripts are standard Node and work identically outside SF.

## The audit dimensions

Five dimensions, each scored 0-20, total out of 100 per page and per site:

1. **Bot Access (0-20):** robots.txt posture for `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `anthropic-ai`, `Claude-Web`, `PerplexityBot`, `Perplexity-User`, `Google-Extended`, `Applebot-Extended` (2 pts each, max 20). See `rubric.md` §1 for the full table.
2. **Discovery (0-20):** presence + quality of `/llms.txt`, `/llms-full.txt`, sitemap.xml, RSS, canonical hygiene.
3. **Structure (0-20):** schema.org coverage (Article, FAQPage, HowTo, Product, Organization, Person, BreadcrumbList), heading hierarchy, semantic HTML.
4. **Citability (0-20):** content patterns that LLMs cite: definitive answers in the first 100 words, Q&A blocks, bulleted facts, named-entity density, author bylines, dates, citations to primary sources.
5. **Authority Signals (0-20):** explicit author/entity markup, About page presence, external citations to primary research, internal linking depth to "answer" pages.

Full per-dimension rubric in `.claude/skills/ai-search-audit/rubric.md`.

## Workflow

### 1. Confirm scope

Ask the user (skip if already in request):
- Target URL.
- Crawl cap (default: 500 URLs).
- JS rendering on/off (default: off; turn on for SPAs).
- Page-set focus: full site, blog only, product pages only, etc.
- Re-audit or first run? If re-audit, call `sf_list_crawls` to check for a prior crawl of the same domain. If one exists, load it with `sf_load_crawl` and extract the previous scores from `reports/<domain>/audit-*.md` (most recent file). Use these to compute deltas in the report.

### 2. Pre-crawl checks (no crawl yet)

Fetch the following root files directly before crawling; these inform the whole audit:
- `https://<domain>/robots.txt`
- `https://<domain>/llms.txt`
- `https://<domain>/llms-full.txt`
- `https://<domain>/sitemap.xml`

Record presence + content. The Bot Access and Discovery scores partly derive from these without needing a full crawl.

### 3. Run crawl via Screaming Frog MCP

Call `sf_crawl` with the agreed parameters (start URL, optional crawl cap via config). Wait for completion by polling `sf_crawl_progress` until status is complete.

The official MCP handles custom extractions natively via the export tools — no manual extraction config needed.

### 4. Pull exports

Use the official MCP tools to pull all data needed for scoring:

- `sf_generate_bulk_export` with category `"Internal"` — all crawled URLs with status, indexability, word count, response time, inlink count, and Flesch Reading Ease. **Use this as the primary data source for inlink counts and readability scores — no per-page `sf_url_links` calls needed.**
- `sf_export_seo_element_urls` with `seo_element_name="Structured Data"` — JSON-LD blocks per page.
- `sf_export_seo_element_urls` with `seo_element_name="H1"` — H1 text per URL.
- `sf_export_seo_element_urls` with `seo_element_name="H2"` — H2 text per URL.
- `sf_export_seo_element_urls` with `seo_element_name="Page Titles"` — title tags.
- `sf_export_seo_element_urls` with `seo_element_name="Meta Description"` — meta descriptions.
- `sf_export_seo_element_urls` with `seo_element_name="Canonicals"` — canonical URL per page.
- `sf_bulk_export_page_content` — full page text in NDJSON format; use for citability analysis (first 200 words, Q&A blocks, named entities, author bylines, dates, external links). **Requires "Store HTML" enabled in SF before crawl.**
- `sf_generate_bulk_export` with category `"External Links"` — all outlinks to external domains; use to score the Authority (authoritative outlinks) and Citability (external citations) rubric checks deterministically.
- `sf_url_links` with `links_direction="inlinks"` is only needed for individual spot-checks; inlink counts for scoring come from the Internal export above.

### 5. Score per page

For each indexable 200 URL, compute the five dimension scores per the rubric. Store as a table.

Per-page total = sum of dimension scores (max 100).

Bucket pages:
- **Strong (80-100):** citation-ready as-is.
- **Decent (60-79):** minor fixes unlock citability.
- **Weak (40-59):** structural problems, needs rework.
- **Invisible (0-39):** LLMs will skip these.

### 6. Score the site

Site score = weighted aggregate:
- Bot Access: site-level (one value, copy to every page).
- Discovery: site-level.
- Structure / Citability / Authority: average across top-50 most-linked pages (these are the ones LLMs most likely encounter).

### 7. Generate fix artifacts

Always generate the following, even if empty/minimal:

**A. `reports/<domain>/llms.txt`:** built from the crawl. Format per the llmstxt.org spec:
```
# <Site name>

> <One-sentence site purpose, derived from homepage title + meta description>

## <Section name, e.g. Docs / Blog / Products>
- [<Page title>](<URL>): <one-line summary derived from meta description or first paragraph>
...
```
Limit to top 50 pages by inlink count, grouped by URL path prefix.

**B. `reports/<domain>/robots-ai-bots-patch.txt`:** robots.txt block to add/replace. If bots are blocked, generate the unblock patch. If allowed, generate verification snippet. Comment each bot with provenance link.

**C. `reports/<domain>/schema-patches/`:** one JSON-LD file per page that is missing a recommended schema type. Filename: URL slug + `.json`. Pre-populate with what can be inferred from crawl data; mark unknown fields with `"TODO: <human-readable note>"`.

**D. `reports/<domain>/content-rewrite-recs.md`:** for each Weak/Invisible page in the top-50 by inlinks, write a specific restructuring recommendation. Format: current opening (quoted), problem (one line), suggested rewrite of first paragraph (Q&A or definitive-answer style).

**E. `reports/<domain>/orphan-pages.md`:** list of all indexable 200-status pages with 0 internal inlinks, derived from the `sf_url_links` inlink data collected in step 4. These pages are unreachable by LLM crawlers regardless of content quality. Format:

```markdown
# Orphan Pages: <domain>

<n> indexable pages have zero internal inlinks. LLM crawlers cannot reach them through site navigation.

## Fix options
- Add links to orphan pages from relevant hub pages or the sitemap.
- If pages are intentionally standalone, add them to llms.txt directly.
- If pages have no value, consider removing or redirecting them.

## Orphan page list
| URL | Title | Score |
|---|---|---|
| /path/to/page | Page Title | 42 |
...
```

Skip this artifact (write empty file with note) if 0 orphan pages found.

**F. `reports/<domain>/faq-gap-pages.md`:** pages with FAQ-style content but no FAQPage schema. Run via `sf_run_node_js_script`:

1. Use `sf_write_text_file` to write `scripts/faq-gap-detect.js` from the repo (read it with `sf_read_text_file` first if needed).
2. Call `sf_run_node_js_script` with script path `scripts/faq-gap-detect.js` and args `[<content_ndjson_path>, <schema_ndjson_path>, <output_md_path>]`, where paths are relative to the SF allowed base directory.
3. The script outputs the markdown file directly. Read it back with `sf_read_text_file` and save to `reports/<domain>/faq-gap-pages.md`.

Pages in this list should also get FAQPage schema patches generated in artifact C.

**G. `reports/<domain>/readability-scores.md`:** Flesch-Kincaid Reading Ease per page. Dense prose (score < 50) is harder for LLMs to cite verbatim. Run via `sf_run_node_js_script`:

1. Write `scripts/readability-score.js` to the SF allowed directory via `sf_write_text_file`.
2. Call `sf_run_node_js_script` with args `[<content_ndjson_path>, <output_md_path>]`. No npm install needed -- the script uses only Node built-ins.
3. Read back and save to `reports/<domain>/readability-scores.md`.

The script outputs site average FK score and a priority list of pages scoring below 50. Include the site average FK score as a one-line stat in the main report's Score breakdown section.

**H. `reports/<domain>/topic-gap.md`:** topic cluster analysis using page embeddings. Identifies thin coverage areas (< 3 pages on same topic) where the site lacks authority. Useful for content strategy beyond fixing existing pages. Run via `sf_run_node_js_script`:

1. Call `sf_export_embeddings` with a file path to save the CSV.
2. Write `scripts/topic-gap.js` via `sf_write_text_file`.
3. Call `sf_run_node_js_script` with args `[<embeddings_csv_path>, <titles_ndjson_path>, <output_md_path>]`.
4. Read back and save to `reports/<domain>/topic-gap.md`.

Note: `sf_export_embeddings` requires the crawl to have been run with the Screaming Frog embeddings feature enabled (`File > Settings > Content > Embeddings`). If embeddings are not available, skip this artifact and note it in the report.

### 8. Write the main report (markdown + HTML one-pager)

Two formats, same data, both written every run.

#### 8a. Markdown report

`reports/<domain>/audit-<YYYY-MM-DD>.md`:

```markdown
# AI Search Readiness Audit: <domain>

**Crawled:** <date> · **URLs crawled:** <n> · **JS rendering:** on/off
**Site score:** <n>/100 · **Top-50 page average:** <n>/100

## Headline finding
{{headline_gap}} {{headline_consequence}} {{headline_action}}

## Score breakdown
| Dimension | Score | What's blocking max |
|---|---|---|
| Bot Access | x/20 | ... |
| Discovery | x/20 | ... |
| Structure | x/20 | ... |
| Citability | x/20 | ... |
| Authority  | x/20 | ... |

## Score delta (vs previous audit)
Only include this section if a prior audit exists for the domain.
| Dimension | Previous | Current | Delta |
|---|---|---|---|
| Bot Access | x/20 | x/20 | +n / -n |
| Discovery | x/20 | x/20 | +n / -n |
| Structure | x/20 | x/20 | +n / -n |
| Citability | x/20 | x/20 | +n / -n |
| Authority  | x/20 | x/20 | +n / -n |
| **Site total** | x/100 | x/100 | **+n / -n** |

## Top 5 fixes that move the needle
1. <fix>. Effort: S/M/L · expected score gain: +n
2. ...

## Page buckets
- Strong: n pages (sample: ...)
- Decent: n pages
- Weak: n pages
- Invisible: n pages (top inlink-count first; these are the priorities)

## Generated artifacts
- `llms.txt`: `reports/<domain>/llms.txt`
- Robots patch: `reports/<domain>/robots-ai-bots-patch.txt`
- Schema patches: `reports/<domain>/schema-patches/` (<n> files)
- Content rewrite recs: `reports/<domain>/content-rewrite-recs.md`
- Orphan pages: `reports/<domain>/orphan-pages.md` (<n> pages with 0 inlinks)
- FAQ schema gaps: `reports/<domain>/faq-gap-pages.md` (<n> pages)
- Readability scores: `reports/<domain>/readability-scores.md` (site avg FK: <n>)
- Topic gap analysis: `reports/<domain>/topic-gap.md` (<n> thin clusters)

## Appendix: full per-page scores
<table>
```

#### 8b. HTML one-pager

Render `reports/<domain>/audit-<YYYY-MM-DD>.html` from `.claude/skills/ai-search-audit/templates/report.html.template`. The template is a self-contained one-pager (no external deps, no CDN, inline CSS) designed to:

- Open directly in any browser.
- Print clean to PDF (A4 / Letter).
- Auto-respond to light/dark system theme.
- Be screenshot-friendly for LinkedIn / Slack sharing.

**Placeholder substitution.** Read the template as a string, replace every `{{name}}` token with the corresponding value computed during scoring. Required tokens:

| Token | Value |
|---|---|
| `{{domain}}` | site domain |
| `{{crawl_date}}` | ISO date of crawl |
| `{{rubric_version}}` | rubric version string (read from `rubric.md` `rubric_version` frontmatter, e.g. `1.1.0`) |
| `{{urls_crawled}}` | integer |
| `{{js_rendering}}` | `"on"` or `"off"` |
| `{{repo_owner}}` | GitHub user/org for branding link. Defaults to `Kpradof` (the repo owner). Override if you've forked the repo under a different account. |
| `{{site_score}}` | 0-100 integer |
| `{{top50_avg}}` | 0-100 integer |
| `{{headline_gap}}` | The single biggest gap as a plain fact. One sentence, no marketing words. HTML-escaped. Example: "Zero of 505 indexable pages carry JSON-LD schema." |
| `{{headline_consequence}}` | The consequence of that gap for AI search. One sentence, no marketing words. HTML-escaped. Example: "AI bots can access the site but have almost no structured content to cite." |
| `{{headline_action}}` | The top action with a specific estimated score gain. One sentence. HTML-escaped. Example: "Adding llms.txt and Organization schema to the homepage raises the site score by an estimated 12 points." |
| `{{bot_access}}`, `{{discovery}}`, `{{structure}}`, `{{citability}}`, `{{authority}}` | each 0-20 |
| `{{bot_access_pct}}`, `{{discovery_pct}}`, `{{structure_pct}}`, `{{citability_pct}}`, `{{authority_pct}}` | same value × 5 (since max is 20) |
| `{{bot_access_blocker}}`, `{{discovery_blocker}}`, `{{structure_blocker}}`, `{{citability_blocker}}`, `{{authority_blocker}}` | one-line blocker text, HTML-escaped |
| `{{fixes_html}}` | five `.fix` divs, see template format below |
| `{{bucket_strong}}`, `{{bucket_decent}}`, `{{bucket_weak}}`, `{{bucket_invisible}}` | page counts |
| `{{priority_rows_html}}` | `<tr>` rows for top-10 invisible pages by inlink count |
| `{{artifacts_html}}` | one `.artifact` div per generated file |
| `{{orphan_count}}` | integer count of orphan pages (0 inlinks); used in the artifacts div label |
| `{{delta_html}}` | score delta section HTML (see format below); empty string `""` if no prior audit exists |
| `{{expected_post_fix_score}}` | integer estimate after top-5 fixes shipped |

**`.fix` div format** (inject into `{{fixes_html}}`):
```html
<div class="fix">
  <div class="rank">1</div>
  <div class="text">Publish <code>llms.txt</code> at the site root. Generated file at <code>reports/example.com/llms.txt</code> is deploy-ready.</div>
  <div class="meta"><span class="pill s">S</span> · +6 pts</div>
</div>
```
Use class `s` / `m` / `l` on the `.pill` matching effort. Repeat for all five fixes.

**`<tr>` row format** for priority table:

The priority table shows the **top 10 pages by inlink count that score below Decent (< 60)**. Sort by inlink count descending within that filtered set.

```html
<tr>
  <td><a href="{{url}}">{{path}}</a></td>
  <td>{{inlinks}}</td>
  <td class="score bad">{{score}}</td>
  <td>{{top_miss}}</td>
</tr>
```
Class on `.score` cell: `bad` if <40, `warn` if 40-59, `good` if >=60.

**`{{delta_html}}` format** (inject when prior audit exists, otherwise use empty string):
```html
<section class="card">
  <h2>Score delta vs. previous audit (<prev_date>)</h2>
  <table>
    <thead><tr><th>Dimension</th><th>Previous</th><th>Current</th><th>Delta</th></tr></thead>
    <tbody>
      <tr><td>Bot Access</td><td>x/20</td><td>x/20</td><td class="score good">+n</td></tr>
      <tr><td>Discovery</td><td>x/20</td><td>x/20</td><td class="score bad">-n</td></tr>
      <tr><td>Structure</td><td>x/20</td><td>x/20</td><td>0</td></tr>
      <tr><td>Citability</td><td>x/20</td><td>x/20</td><td class="score good">+n</td></tr>
      <tr><td>Authority</td><td>x/20</td><td>x/20</td><td class="score good">+n</td></tr>
      <tr><td><strong>Site total</strong></td><td>x/100</td><td>x/100</td><td class="score good"><strong>+n</strong></td></tr>
    </tbody>
  </table>
</section>
```
Delta cell class: `good` if positive, `bad` if negative, no class if zero.

**`.artifact` div format:**
```html
<div class="artifact">
  <div class="ico">TXT</div>
  <div><div><strong>llms.txt</strong></div><code>reports/example.com/llms.txt</code></div>
</div>
```
Icon labels: `TXT` for `.txt`, `MD` for `.md`, `JSN` for `.json`, `DIR` for directories.

**Escape HTML** in all values that may contain user content (titles, headline finding, blockers). Do not escape generated HTML fragments themselves (`{{fixes_html}}`, `{{priority_rows_html}}`, `{{artifacts_html}}`, `{{headline_finding_html}}`).

### 9. Hand off

Surface to chat:
- Site score one-liner.
- Path to **HTML one-pager** (`reports/<domain>/audit-<YYYY-MM-DD>.html`); this is the shareable artifact, lead with it.
- Path to markdown report.
- Single highest-leverage fix.
- Offer: "Want me to open the HTML in your browser / apply the robots.txt patch / commit the llms.txt to the repo / open a PR with schema patches?" (Only offer the PR option if the user appears to have write access to the target site's repo.)

## Troubleshooting

**0 indexable URLs after crawl:**
- The site may require JS rendering (SPA). Ask the user and re-run with JS rendering on.
- Check if the crawl hit a login wall or bot-blocking redirect. Inspect the first few response codes in the Internal export.

**MCP connection error / tools not visible:**
- Confirm the SF MCP server is running: open SF, go to `MCP > Start MCP Server`. The status bar should show `http://localhost:11435/mcp`.
- Verify `.mcp.json` in the repo root points to `http://localhost:11435/mcp` and the server key is `seospider`.
- Run `claude mcp list` and confirm `seospider` shows `✓ Connected`.
- If auto-start is off, the server must be re-started manually each SF session (`File > Settings > MCP Server` to enable auto-start).

**Partial crawl / crawl stopped early:**
- SF's free tier caps at 500 URLs. Check if a paid license is configured. If capped, note it in the report and proceed with the URLs crawled.

**Site returns 403 / auth-gated pages:**
- Configure SF Basic Auth or cookie-based authentication in Screaming Frog settings before invoking `sf_crawl`. Document which pages were excluded.

**`sf_bulk_export_page_content` returns empty / no content records:**
- "Store HTML" was not enabled before the crawl. Enable it under `Configuration > Spider > Extraction` (macOS) or `File > Settings > Spider > Extraction` (Windows/Linux), then re-crawl. Without it, Citability scoring and artifacts C, D, F, G are skipped.

**`sf_run_node_js_script` fails or returns empty:**
- Node tools are disabled by default in SF. Enable via `File > Settings > MCP Server > Enable Node tools`. If you prefer not to enable it, run the scripts locally: `node scripts/<script>.js <args>` from the repo root.

## Output rules

- Always write artifacts to `reports/<domain>/`. Never dump full report into chat.
- Chat response stays under ~15 lines: score, one-line headline, single top fix, file paths.
- Every recommendation must reference a specific URL from the crawl. No invented examples.
- **Never use marketing language in any generated text — including the headline finding, fix descriptions, and content-rewrite-recs.** Banned words: "supercharge", "unlock", "unlock the power of", "game-changer", "revolutionize", "transform your". Use plain, specific, actionable language instead. Example: "Adding llms.txt is the single highest-leverage fix" not "Unlock your AI search potential with llms.txt".
- If a dimension scores max already, say so and move on. No padding.
