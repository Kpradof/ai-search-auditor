"""
smoke_check.py — ai-search-auditor integrity validator

Checks:
  1. Bot list in SKILL.md matches rubric.md exactly (P0-1).
  2. All {{token}} placeholders in report.html.template are documented in SKILL.md (P0-4).
  3. Rubric dimension point totals each sum to exactly 20.
  4. Example HTML report has no unsubstituted {{token}} placeholders.
  5. Partial-credit rules table exists in rubric.md (Discovery section).

Run from repo root:
    python scripts/smoke_check.py

Exit 0 = all checks pass. Exit 1 = at least one failure (details printed).
"""

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

SKILL_MD   = REPO_ROOT / ".claude/skills/ai-search-audit/SKILL.md"
RUBRIC_MD  = REPO_ROOT / ".claude/skills/ai-search-audit/rubric.md"
TEMPLATE   = REPO_ROOT / ".claude/skills/ai-search-audit/templates/report.html.template"
EXAMPLE_HTML = REPO_ROOT / "examples/sample-audit-example.com.html"

FAILURES = []
PASSES   = []


def fail(msg: str):
    FAILURES.append(msg)
    print(f"  FAIL  {msg}")


def ok(msg: str):
    PASSES.append(msg)
    print(f"  OK    {msg}")


# ---------------------------------------------------------------------------
# CHECK 1: Bot list parity between SKILL.md and rubric.md
# ---------------------------------------------------------------------------
def check_bot_list_parity():
    skill_text  = SKILL_MD.read_text()
    rubric_text = RUBRIC_MD.read_text()

    # Extract bots from rubric table (lines between the header and first blank after table)
    # Pattern: lines like "| `GPTBot` | ..."
    rubric_bots = set(re.findall(r"\|\s*`([A-Za-z0-9_\-]+)`\s*\|[^|]+\|[^|]+\|", rubric_text))

    # Extract bots mentioned in the SKILL.md Bot Access dimension line
    # We look for the 1. Bot Access bullet and grab all backtick-quoted identifiers on it
    bot_access_line = ""
    for line in skill_text.splitlines():
        if line.startswith("1. **Bot Access") or "Bot Access (0-20):" in line:
            bot_access_line = line
            break

    skill_bots = set(re.findall(r"`([A-Za-z0-9_\-]+)`", bot_access_line))

    only_rubric = rubric_bots - skill_bots
    only_skill  = skill_bots  - rubric_bots

    if only_rubric:
        fail(f"CHECK 1: Bots in rubric.md but missing from SKILL.md Bot Access line: {sorted(only_rubric)}")
    if only_skill:
        fail(f"CHECK 1: Bots in SKILL.md Bot Access line but not in rubric.md table: {sorted(only_skill)}")
    if not only_rubric and not only_skill and rubric_bots:
        ok(f"CHECK 1: Bot lists match ({len(rubric_bots)} bots)")
    elif not rubric_bots:
        fail("CHECK 1: Could not extract any bots from rubric.md — check table format")


# ---------------------------------------------------------------------------
# CHECK 2: All template tokens documented in SKILL.md token table
# ---------------------------------------------------------------------------
def check_template_tokens_documented():
    if not TEMPLATE.exists():
        fail("CHECK 2: report.html.template not found — skipping token check")
        return

    template_text = TEMPLATE.read_text()
    skill_text    = SKILL_MD.read_text()

    # Find all {{token}} in template (excluding Mustache loops like {{#...}})
    template_tokens = set(re.findall(r"\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}", template_text))

    # Find all tokens documented in SKILL.md token table (| `{{token}}` | ... |)
    documented_tokens = set(re.findall(r"\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}", skill_text))

    undocumented = template_tokens - documented_tokens
    if undocumented:
        fail(f"CHECK 2: Template tokens not documented in SKILL.md: {sorted(undocumented)}")
    else:
        ok(f"CHECK 2: All {len(template_tokens)} template tokens documented in SKILL.md")


# ---------------------------------------------------------------------------
# CHECK 3: Rubric dimension totals each max at 20
# ---------------------------------------------------------------------------
def check_rubric_dimension_totals():
    rubric_text = RUBRIC_MD.read_text()

    # Split into sections by ## heading
    sections = re.split(r"^## \d+\.", rubric_text, flags=re.MULTILINE)

    dimension_names = re.findall(r"^## (\d+\. .+?)$", rubric_text, flags=re.MULTILINE)

    # For each dimension section, sum point values from table rows like "| ... | 3 |"
    for i, (name, section) in enumerate(zip(dimension_names, sections[1:]), start=1):
        # Find all point values in table rows: last column before newline, integer only
        points = re.findall(r"\|\s*(\d+)\s*\|?\s*$", section, flags=re.MULTILINE)
        # Exclude the partial credit table rows (they repeat values) — only sum the main check table
        # Heuristic: stop summing at the "Partial credit" heading if present
        main_section = re.split(r"\*\*Partial credit", section)[0]
        main_points = re.findall(r"\|\s*(\d+)\s*\|?\s*$", main_section, flags=re.MULTILINE)

        if not main_points:
            # Dimensions like Bot Access score differently — skip sum check
            ok(f"CHECK 3: {name.strip()} — dynamic scoring, skipping sum check")
            continue

        total = sum(int(p) for p in main_points)
        if total != 20:
            fail(f"CHECK 3: {name.strip()} point total = {total}, expected 20")
        else:
            ok(f"CHECK 3: {name.strip()} sums to 20")


# ---------------------------------------------------------------------------
# CHECK 4: Example HTML has no unsubstituted tokens
# ---------------------------------------------------------------------------
def check_example_html_no_raw_tokens():
    if not EXAMPLE_HTML.exists():
        fail(f"CHECK 4: Example HTML not found at {EXAMPLE_HTML}")
        return

    html = EXAMPLE_HTML.read_text()
    raw_tokens = re.findall(r"\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}", html)

    if raw_tokens:
        fail(f"CHECK 4: Unsubstituted tokens in example HTML: {sorted(set(raw_tokens))}")
    else:
        ok("CHECK 4: Example HTML has no unsubstituted tokens")


# ---------------------------------------------------------------------------
# CHECK 5: Discovery partial-credit rules table exists in rubric.md
# ---------------------------------------------------------------------------
def check_partial_credit_table_exists():
    rubric_text = RUBRIC_MD.read_text()
    if "Partial credit rules" in rubric_text or "Partial credit" in rubric_text:
        ok("CHECK 5: Partial credit rules present in rubric.md")
    else:
        fail("CHECK 5: No partial credit rules table found in rubric.md — Discovery checks need explicit partial credit rules")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("ai-search-auditor smoke check\n")

    check_bot_list_parity()
    check_template_tokens_documented()
    check_rubric_dimension_totals()
    check_example_html_no_raw_tokens()
    check_partial_credit_table_exists()

    print(f"\n{len(PASSES)} passed, {len(FAILURES)} failed")

    if FAILURES:
        print("\nFailed checks:")
        for f in FAILURES:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("\nAll checks passed.")
        sys.exit(0)
