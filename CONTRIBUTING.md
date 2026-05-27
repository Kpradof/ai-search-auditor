# Contributing

The most valuable contributions are to the **scoring rubric**, not the code.

## Highest-impact contributions

1. **Citation-pattern research.** If you've published or read research on what patterns LLMs preferentially cite, open an issue with the source and the proposed rubric change. Empirical evidence > intuition.
2. **New AI crawler user-agents.** As engines launch new bots, the Bot Access dimension needs updates. PR `rubric.md` and `templates/robots-ai-bots.txt.template` together.
3. **Schema templates.** If you've shipped a schema type that consistently improves citability for your category (Recipe, LocalBusiness, JobPosting, Course), add a template in `.claude/skills/ai-search-audit/templates/`.
4. **Real audit reports.** Run the auditor on a real site you own, then PR the report into `examples/`. Reports of low-scoring sites are as useful as high-scoring ones.

## Lower-impact but welcome

- Bug fixes in the skill workflow.
- Cross-platform paths in `.mcp.json` examples.
- Typos.

## Out of scope

- Web UI / SaaS wrapper. The repo intentionally stays as a Claude Code skill + MCP integration. If you want to build a hosted version, fork.
- Heuristics that require sending site content to non-local services. Crawl and analysis must stay local.

## Process

1. Open an issue first for anything touching the rubric or scoring math. Discuss before coding.
2. For doc/typo/template PRs: skip the issue, just send the PR.
3. Reference the specific rubric line or template file in your PR title.
4. If your change shifts scores on the example report, regenerate the example.

## Style

- Skill markdown follows the structure already in `SKILL.md`: frontmatter with `name` + `description`, then prose sections.
- Rubric changes must remain deterministic. No "score depends on LLM judgment" rules.
- No emoji in code, templates, or rubric. Emoji in README is fine.
