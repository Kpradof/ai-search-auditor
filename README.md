# ai-search-auditor

Find out whether ChatGPT, Claude, Perplexity, and Google AI Overviews will cite your site, and get a concrete, prioritized fix list to make sure they will.

Powered by [Screaming Frog SEO Spider](https://www.screamingfrog.co.uk/seo-spider/) (via the [`bzsasson/screaming-frog-mcp`](https://github.com/bzsasson/screaming-frog-mcp) community MCP server) and [Claude](https://claude.com/claude-code). Open source, deterministic scoring, no SaaS account, no API keys.

---

## Why this exists

SEO tools score you on Google. None score you on the engines your buyers are actually using to find answers.

In 2026 your prospects are searching in ChatGPT and Perplexity. Google's AI Overviews now serve over half of search sessions in some verticals. The signals these engines use to decide who to cite are **measurable** (bot access, schema, citability patterns, authority markup), but no one has open-sourced an end-to-end audit for them. So I did.

This repo gives you:

- **A Claude Code skill** (`ai-search-audit`) that runs a full audit by chatting with Claude.
- **A deterministic 100-point scoring rubric** across 5 dimensions. Auditable, not vibes.
- **Generated fix artifacts**: a ready-to-deploy `llms.txt`, a robots.txt patch for AI crawlers, schema JSON-LD patches, and per-page content-rewrite recommendations.
- **A Screaming Frog MCP integration** that does the crawl. No browser automation, no scraping. Screaming Frog is the industry-standard crawler and the MCP gives Claude programmatic access.

---

## What gets audited

Five dimensions, scored 0-20 each, total out of 100. Full rubric: [`.claude/skills/ai-search-audit/rubric.md`](.claude/skills/ai-search-audit/rubric.md).

| Dimension | What it checks |
|---|---|
| **Bot Access** | Is GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended allowed in `robots.txt`? |
| **Discovery** | `llms.txt`, `llms-full.txt`, sitemap, canonical hygiene, RSS. |
| **Structure** | Schema.org coverage (Article, FAQPage, HowTo, Organization, Person, BreadcrumbList), heading hierarchy, semantic landmarks. |
| **Citability** | Definitive answers up top, Q&A blocks, named entities, dates, primary-source citations, content length sweet spot. |
| **Authority** | Visible author bylines, Person schema, About page reachable, links to primary research, Wikipedia-tier `sameAs`. |

Pages bucket into **Strong (80-100)**, **Decent (60-79)**, **Weak (40-59)**, **Invisible (0-39)**.

---

## Install

### Prerequisites

- [Screaming Frog SEO Spider](https://www.screamingfrog.co.uk/seo-spider/) installed locally. Verified with **v16+**; a paid license is recommended (the free tier caps crawls at 500 URLs).
- [Claude Code](https://docs.claude.com/en/docs/agents-and-tools/claude-code/overview) installed.
- [`uv`](https://docs.astral.sh/uv/) installed (`brew install uv` on macOS, or see uv docs). The MCP server runs via `uvx`, which pulls a pinned Python at install time so the audit works regardless of your system Python.

### Clone

```bash
git clone https://github.com/Kpradof/ai-search-auditor.git
cd ai-search-auditor
```

### Wire up the MCP server

The audit uses [`bzsasson/screaming-frog-mcp`](https://github.com/bzsasson/screaming-frog-mcp), a community MCP server that wraps Screaming Frog's headless CLI. The repo ships with `.mcp.json` already configured for **macOS**. If that's you, no edits needed.

**Windows**: copy `.mcp.json.windows-example` over `.mcp.json`.

**Linux**: copy `.mcp.json.linux-example` over `.mcp.json`.

If your Screaming Frog install path differs from the default, edit `SF_CLI_PATH` in `.mcp.json`.

Verify the MCP server is reachable:

```bash
claude mcp list
```

You should see `screaming-frog` with a `✓ Connected` status.

> **Important workflow note:** Screaming Frog uses a single-process database. **Close the Screaming Frog GUI before running an audit**. The MCP server cannot read crawl data while the GUI is open. The server will surface a clear error if you forget.

---

## Quickstart

Open Claude Code in the repo:

```bash
claude
```

Then ask:

```
Audit example.com for AI search readiness.
```

Claude will invoke the `ai-search-audit` skill, run the crawl through Screaming Frog MCP, score every page, and write your full report + artifacts to `reports/example.com/`.

Typical audit on a 500-URL site takes 3-6 minutes.

### What you get

```
reports/example.com/
├── audit-2026-05-26.html            ← Shareable HTML one-pager (open in browser)
├── audit-2026-05-26.md              ← Same content as markdown for git / PRs
├── llms.txt                         ← Drop-in file for your site root
├── robots-ai-bots-patch.txt         ← Block to merge into your robots.txt
├── schema-patches/
│   ├── pricing.json                 ← JSON-LD ready to embed
│   ├── about.json
│   └── ...
└── content-rewrite-recs.md          ← Page-by-page first-paragraph rewrites
```

The HTML one-pager is the shareable artifact: self-contained, zero dependencies, dark/light auto-themes, prints clean to PDF, screenshot-friendly for LinkedIn / Slack.

---

## Example output

- **[HTML one-pager preview](examples/sample-audit-example.com.html)**: open in browser to see the polished report.
- [Markdown version](examples/sample-audit-example.com.md): same data, plain markdown.

---

## Cost per audit

Calibrated against two real runs in May 2026 (Claude Opus 4.7 with prompt caching enabled):

| Site | URLs crawled | Pages scored | Wall time | API cost |
|---|---|---|---|---|
| anthropic.com | 4,042 | 352 | 31 min | $3.94 |
| praxent.com | 3,356 | 505 | 25 min | $5.85 |

**Typical audit cost: ~$3 to $6 USD per run** for sites with 300 to 500 indexable pages. Most input tokens are template + rubric + skill context, all cache-hittable across the audit's many tool calls, so the cache-read price ($1.50/M) dominates over the full input price.

Cheaper options:

- **Claude Sonnet 4.6 instead of Opus 4.7:** roughly 5x cheaper, so about $0.60 to $1.20 per audit. Set the model explicitly when invoking the skill if you want to trade some scoring nuance for cost.
- **Smaller crawls:** the per-URL cost is dominated by the per-page scoring loop, not the crawl size, so capping at 100 URLs does not cut cost by 5x. Expect closer to half.

More expensive cases:

- **Prompt caching disabled:** about 3x more expensive. Most of the savings here come from reusing the rubric and report template across page scoring.
- **JS rendering on (for SPAs):** crawl time grows, more content per page reaches the scorer. Add 30% to 50%.

These numbers will move as Claude pricing and the underlying skill evolve. The two source audits live in this repo's git log under the `docs: calibrate cost-per-audit` commit if you want to re-derive.

---

## Custom scoping

The skill accepts these scoping inputs in your prompt:

- `Audit only the /blog section of example.com`
- `Audit example.com with JS rendering on` (for SPAs)
- `Audit example.com, cap at 100 URLs`
- `Audit example.com vs anthropic.com` (comparison mode, runs both, side-by-side scorecard)

---

## How the scoring works

Every score is traceable to a specific crawl observation. No magic, no LLM-as-judge guessing.

Example: a page scores 14/20 on Citability because:
- [+] Definitive answer in first 100 words (+5)
- [+] Has bulleted list of facts (+2)
- [+] Named entities present (+2)
- [+] Publish + updated dates visible (+2)
- [+] Body in 300-3000 word sweet spot (+2)
- [+] First paragraph contains a concrete number (+1)
- [-] No Q&A section (-3)
- [-] No cited external sources (-3)

The full per-page breakdown is in the audit report.

---

## Architecture

```mermaid
flowchart TD
    User([You]) -->|"Audit example.com"| CC[Claude Code]
    CC <-->|MCP| SF["Screaming Frog v24+<br/>(local crawler)"]
    CC -->|invokes| Skill["ai-search-audit skill<br/>• scoring rubric<br/>• report templates<br/>• llms.txt / schema gen"]
    SF -->|crawl exports| Skill
    Skill -->|writes| Reports["reports/&lt;domain&gt;/<br/>• audit-YYYY-MM-DD.html<br/>• audit-YYYY-MM-DD.md<br/>• llms.txt<br/>• robots-ai-bots-patch.txt<br/>• schema-patches/<br/>• content-rewrite-recs.md"]

    classDef user fill:#7c5cff,stroke:#7c5cff,color:#fff
    classDef tool fill:#22d3ee,stroke:#22d3ee,color:#0b0d12
    classDef skill fill:#34d399,stroke:#34d399,color:#0b0d12
    classDef out fill:#fbbf24,stroke:#fbbf24,color:#0b0d12
    class User user
    class CC,SF tool
    class Skill skill
    class Reports out
```

Crawl happens locally. No site data leaves your machine except what you send to Claude.

---

## Roadmap

- [ ] Comparison mode (your site vs N competitors; multi-domain side-by-side scorecard not yet built, single-domain scoping works today)
- [ ] Wayback Machine integration: track AI search readiness over time
- [ ] GitHub Action: gate PRs on AI search readiness regression
- [x] HTML report renderer for stakeholder sharing
- [ ] Citation tracking: measure actual citations in Perplexity / ChatGPT Search over time

PRs welcome.

---

## License

MIT. See [LICENSE](LICENSE).

---

## Credits

- [Screaming Frog](https://www.screamingfrog.co.uk/) for the SEO Spider crawler this whole audit is built on.
- [bzsasson/screaming-frog-mcp](https://github.com/bzsasson/screaming-frog-mcp) for the community MCP server that wires Screaming Frog into Claude.
- [llmstxt.org](https://llmstxt.org/) for the `llms.txt` spec.
- [ai.robots.txt](https://github.com/ai-robots-txt/ai.robots.txt) for the AI crawler reference list.
