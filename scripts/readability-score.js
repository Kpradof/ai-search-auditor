/**
 * readability-score.js
 *
 * Computes Flesch-Kincaid Reading Ease for each page in the bulk content
 * export (NDJSON from sf_bulk_export_page_content).
 *
 * Usage (via sf_run_node_js_script, after sf_npm_install text-readability):
 *   node readability-score.js <content_ndjson_path> <output_md_path>
 *
 * FK Reading Ease scale:
 *   90-100  Very easy (5th grade)
 *   70-89   Easy (6th grade)
 *   60-69   Standard (7th grade) -- target for web content
 *   50-59   Fairly difficult (10th grade)
 *   30-49   Difficult (college level)
 *   0-29    Very difficult (professional)
 *
 * Pages scoring < 50 are flagged: dense prose is harder for LLMs to
 * parse and cite precisely.
 */

const fs = require('fs');

const [,, contentPath, outputPath] = process.argv;

if (!contentPath || !outputPath) {
  console.error('Usage: node readability-score.js <content.ndjson> <output.md>');
  process.exit(1);
}

// Flesch-Kincaid Reading Ease (pure JS, no external dep)
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function fleschKincaid(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.trim().length > 0);
  if (sentences.length === 0 || words.length === 0) return null;

  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const asl = words.length / sentences.length;  // avg sentence length
  const asw = syllables / words.length;          // avg syllables per word

  const score = 206.835 - (1.015 * asl) - (84.6 * asw);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function fkLabel(score) {
  if (score >= 70) return 'Easy';
  if (score >= 60) return 'Standard';
  if (score >= 50) return 'Fairly difficult';
  if (score >= 30) return 'Difficult';
  return 'Very difficult';
}

// Process content export
const results = [];
if (fs.existsSync(contentPath)) {
  const lines = fs.readFileSync(contentPath, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      const url = (row.url || row.URL || row.Address || '').trim();
      const text = row.content || row.text || row.body || '';
      if (!url || text.length < 100) continue;

      const score = fleschKincaid(text);
      if (score !== null) {
        results.push({ url, score, label: fkLabel(score), words: text.split(/\s+/).length });
      }
    } catch {}
  }
}

// Sort by score ascending (worst first)
results.sort((a, b) => a.score - b.score);

const hardPages = results.filter(r => r.score < 50);
const avgScore = results.length
  ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
  : 0;

// Write output markdown
const mdLines = [
  `# Readability Scores: Flesch-Kincaid Reading Ease`,
  ``,
  `**Pages scored:** ${results.length}  `,
  `**Site average:** ${avgScore} (${fkLabel(avgScore)})  `,
  `**Pages below 50 (difficult or harder):** ${hardPages.length}`,
  ``,
  `Dense, hard-to-read prose is less likely to be cited verbatim by AI search engines.`,
  `Pages scoring below 50 should be rewritten with shorter sentences, simpler words, and more structure.`,
  ``,
  `## Pages scoring below 50 (priority rewrites)`,
  `| URL | FK Score | Level | Words |`,
  `|---|---|---|---|`,
];

for (const { url, score, label, words } of hardPages.slice(0, 50)) {
  mdLines.push(`| ${url} | ${score} | ${label} | ${words} |`);
}

if (hardPages.length === 0) {
  mdLines.push(`| (none) | All pages score >= 50. |  |  |`);
}

mdLines.push(``, `## All pages (sorted by score ascending)`, `| URL | FK Score | Level |`, `|---|---|---|`);
for (const { url, score, label } of results) {
  mdLines.push(`| ${url} | ${score} | ${label} |`);
}

fs.writeFileSync(outputPath, mdLines.join('\n') + '\n');
console.log(`readability-score: ${results.length} pages scored, ${hardPages.length} below 50. Written to ${outputPath}`);
