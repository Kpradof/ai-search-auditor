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

Before running, the Screaming Frog MCP server (via `bzsasson/screaming-frog-mcp`) must be configured and reachable. Verify by listing available MCP tools: you should see the following tools from the `screaming-frog` server:

- `crawl_site` — start a crawl with a given URL and config options
- `list_crawls` — list previously completed crawls available for export
- `export_crawl_data` — export a specific data report (Internal, Structured Data, etc.) from a completed crawl
- `get_crawl_status` — check progress of a running crawl

If the tool names differ in your installation, run `claude mcp list` and check the screaming-frog server tools directly.

If the MCP server is not available, stop and direct the user to the setup steps in `README.md` (the user needs Screaming Frog SEO Spider installed locally and `uv` installed so `uvx` can fetch the MCP server).

**Critical pre-flight check:** Screaming Frog's database is single-process. If the Screaming Frog GUI is open, the MCP server cannot read crawl data. Before invoking any MCP tool, confirm the SF GUI is closed. If a tool returns an error about the database being locked, stop and tell the user to quit Screaming Frog before retrying.

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

### 2. Pre-crawl checks (no crawl yet)

Fetch the following root files directly before crawling; these inform the whole audit:
- `https://<domain>/robots.txt`
- `https://<domain>/llms.txt`
- `https://<domain>/llms-full.txt`
- `https://<domain>/sitemap.xml`

Record presence + content. The Bot Access and Discovery scores partly derive from these without needing a full crawl.

### 3. Run crawl via Screaming Frog MCP

Call the Screaming Frog MCP `crawl` tool with the agreed parameters. Configure custom extractions where possible to grab:
- All schema.org JSON-LD blocks (full content).
- First 200 words of `main` / `article` content (for citability analysis).
- `<meta name="author">`, `<meta property="article:author">`.
- All `<h1>`, `<h2>`, `<h3>` text.
- `og:type`, `og:title`, `og:description`.

Wait for crawl completion.

### 4. Pull exports

From the MCP server, pull:
- Internal: All (status, indexability, word count, response time).
- Structured Data: All (with full JSON-LD blocks).
- Page Titles, Meta Descriptions, H1, H2.
- Canonicals.
- Custom Extraction results.

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

The priority table shows the **top 10 pages by inlink count that score below Decent (< 60)**. This includes both Weak and Invisible pages and always surfaces the highest-traffic pages that need fixes -- which is what matters to clients. Sort by inlink count descending within that filtered set.

```html
<tr>
  <td><a href="{{url}}">{{path}}</a></td>
  <td>{{inlinks}}</td>
  <td class="score bad">{{score}}</td>
  <td>{{top_miss}}</td>
</tr>
```
Class on `.score` cell: `bad` if <40, `warn` if 40-59, `good` if >=60.

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

**MCP database locked error:**
- The Screaming Frog GUI is open. Tell the user to quit the application completely (not just minimize) and retry.

**Partial crawl / crawl stopped early:**
- SF's free tier caps at 500 URLs. Check if a paid license is configured. If capped, note it in the report and proceed with the URLs crawled.

**Site returns 403 / auth-gated pages:**
- Configure SF Basic Auth or cookie-based authentication in Screaming Frog settings before invoking the MCP crawl. Document which pages were excluded.

**screaming-frog server not showing in `claude mcp list`:**
- Verify `uv` is installed and `uvx` is on PATH.
- Confirm `.mcp.json` exists in the repo root and `SF_CLI_PATH` points to the correct binary for the user's OS (see `.mcp.json.windows-example` and `.mcp.json.linux-example`).
- Run `uvx --python 3.13 --from screaming-frog-mcp screaming-frog-mcp` in a terminal to check for install errors.

## Output rules

- Always write artifacts to `reports/<domain>/`. Never dump full report into chat.
- Chat response stays under ~15 lines: score, one-line headline, single top fix, file paths.
- Every recommendation must reference a specific URL from the crawl. No invented examples.
- **Never use marketing language in any generated text — including the headline finding, fix descriptions, and content-rewrite-recs.** Banned words: "supercharge", "unlock", "unlock the power of", "game-changer", "revolutionize", "transform your". Use plain, specific, actionable language instead. Example: "Adding llms.txt is the single highest-leverage fix" not "Unlock your AI search potential with llms.txt".
- If a dimension scores max already, say so and move on. No padding.
