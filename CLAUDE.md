# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Claude Code skill, not an application. There is no build, no test suite, no package to install. The "product" is the skill at `.claude/skills/ai-search-audit/` plus a Screaming Frog MCP server wired up via `.mcp.json`. Runtime is Claude Code itself.

## How an audit actually runs

When a user asks Claude Code to audit a site, the flow is:

1. Claude reads `.claude/skills/ai-search-audit/SKILL.md` (loaded via skill autodiscovery).
2. Skill workflow directs Claude to fetch root files (`robots.txt`, `llms.txt`, `llms-full.txt`, `sitemap.xml`) over HTTP **before** any crawl; these alone power the site-level Bot Access + Discovery scores.
3. Claude calls the `screaming-frog` MCP server (configured in `.mcp.json`) to run the crawl + pull exports (Internal, Structured Data, titles/meta/H1/H2, canonicals, custom extractions).
4. Claude scores every indexable 200 page per `rubric.md`: deterministic math, no LLM-as-judge.
5. Claude writes all artifacts under `reports/<domain>/` (gitignored except `example.com/`).

The crawler is local; no site data leaves the machine except what is sent to Claude during analysis.

## Scoring is the contract

`.claude/skills/ai-search-audit/rubric.md` is the source of truth. Every point is traceable to a crawl observation. Two invariants:

- **Determinism.** No rule can read "score depends on LLM judgment." Partial credit is allowed but must be formula-driven (e.g. `llms.txt` exists but only lists homepage scores 3/6, not "feels weak so 4").
- **Per-page total math.** Page total = Structure + Citability + Authority (out of 60) + site-wide Bot Access + Discovery (out of 40), applied uniformly. Bucket thresholds (Strong/Decent/Weak/Invisible) live in the rubric; don't reinvent them in report code.

If you change a point value or check, update `rubric.md` and `SKILL.md` (workflow step 5) together, and regenerate `examples/sample-audit-example.com.*` so the example stays in sync with the rubric (see CONTRIBUTING.md).

## Report output (two formats, same data, always both)

Every run writes both:

- `reports/<domain>/audit-<YYYY-MM-DD>.md`: markdown for git/PR review.
- `reports/<domain>/audit-<YYYY-MM-DD>.html`: self-contained one-pager rendered from `.claude/skills/ai-search-audit/templates/report.html.template` via `{{token}}` substitution.

The HTML template has no external deps (inline CSS, no CDN, auto light/dark via `prefers-color-scheme`). Token list + required HTML-fragment formats (`.fix` div, priority `<tr>`, `.artifact` div) are documented in SKILL.md §8b; match those shapes exactly or the layout breaks. HTML-escape user-content tokens; do **not** escape the pre-built HTML fragment tokens (`{{fixes_html}}`, `{{priority_rows_html}}`, `{{artifacts_html}}`, `{{headline_finding_html}}`).

Plus the fix artifacts (always generated, even when minimal):

- `llms.txt` (llmstxt.org spec, top-50 pages by inlink count, grouped by URL path prefix)
- `robots-ai-bots-patch.txt` (per-bot, with provenance comments)
- `schema-patches/<slug>.json` (one per page missing a recommended schema type; unknown fields marked `"TODO: ..."`)
- `content-rewrite-recs.md` (top-50 Weak/Invisible pages only)

## MCP server selection

`.mcp.json` is configured to connect to the **official Screaming Frog SEO Spider MCP server** (built into SF v24+), which runs as a Streamable HTTP server at `http://localhost:11435/mcp`. The server key is `seospider`.

To use it: open SF, then `MCP > Start MCP Server`. Enable auto-start under `File > Settings > MCP Server` if preferred.

See the [official MCP docs](https://www.screamingfrog.co.uk/guides/mcp-server/) for STDIO mode setup (Claude Desktop extension) if you prefer a headless workflow.

**Key tools used by the audit skill:**
- `sf_crawl` / `sf_crawl_progress` — start and monitor crawls
- `sf_generate_bulk_export` / `sf_export_seo_element_urls` — pull structured data, titles, H1/H2, canonicals
- `sf_bulk_export_page_content` — full page text for citability analysis
- `sf_url_links` — inlink counts for priority table and site score weighting
- `sf_url_info` — per-URL detailed report

If `claude mcp list` does not show `seospider` as `✓ Connected`, stop and point the user at README §Install. Do not try to scrape or browser-automate as a fallback (out of scope per CONTRIBUTING.md).

## Conventions

- **No marketing language** in any output (rubric forbids "supercharge", "unlock", etc.). Plain, specific, actionable.
- **No emoji** in code, templates, or `rubric.md`. README emoji is fine.
- **Chat response stays under ~15 lines per audit run.** Lead with HTML one-pager path. Never dump full report into chat.
- **Every recommendation cites a specific crawled URL.** No invented examples.
- **Reports for real domains are gitignored** (`.gitignore` allowlists only `reports/example.com/`). Do not commit `reports/<real-domain>/`.
