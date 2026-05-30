/**
 * topic-gap.js
 *
 * Reads embeddings CSV from sf_export_embeddings and clusters pages by
 * cosine similarity to identify topic areas and thin coverage zones.
 *
 * Usage (via sf_run_node_js_script):
 *   node topic-gap.js <embeddings_csv_path> <titles_ndjson_path> <output_md_path>
 *
 * Algorithm:
 * 1. Parse embeddings CSV (URL + float vector per row)
 * 2. Compute pairwise cosine similarity
 * 3. Greedy cluster: seed with most-linked pages, group by similarity >= 0.75
 * 4. Flag clusters with fewer than 3 pages as "thin coverage"
 * 5. Identify URL path prefixes with no cluster presence as "missing topics"
 *
 * Output: markdown with cluster map and thin/missing coverage sections.
 */

const fs = require('fs');

const [,, embeddingsPath, titlesPath, outputPath] = process.argv;

if (!embeddingsPath || !titlesPath || !outputPath) {
  console.error('Usage: node topic-gap.js <embeddings.csv> <titles.ndjson> <output.md>');
  process.exit(1);
}

function cosineSim(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-10);
}

// Load page titles
const titles = {};
if (fs.existsSync(titlesPath)) {
  const lines = fs.readFileSync(titlesPath, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      const url = (row.url || row.URL || row.Address || '').trim();
      const title = row.title || row.Title || row['Page Title'] || '';
      if (url) titles[url] = title;
    } catch {}
  }
}

// Parse embeddings CSV
const pages = [];
if (fs.existsSync(embeddingsPath)) {
  const lines = fs.readFileSync(embeddingsPath, 'utf8').split('\n').filter(Boolean);
  const header = lines[0].split(',');
  const urlIdx = header.findIndex(h => /url|address/i.test(h));

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const url = (parts[urlIdx] || '').trim();
    if (!url) continue;

    const vec = parts
      .filter((_, j) => j !== urlIdx)
      .map(Number)
      .filter(n => !isNaN(n));

    if (vec.length > 0) {
      pages.push({ url, vec, title: titles[url] || url });
    }
  }
}

if (pages.length === 0) {
  fs.writeFileSync(outputPath, '# Topic Gap Analysis\n\nNo embedding data available. Run sf_export_embeddings first.\n');
  console.log('topic-gap: no embeddings found');
  process.exit(0);
}

// Greedy clustering by cosine similarity >= 0.75
const THRESHOLD = 0.75;
const assigned = new Set();
const clusters = [];

for (let i = 0; i < pages.length; i++) {
  if (assigned.has(i)) continue;
  const cluster = [i];
  assigned.add(i);

  for (let j = i + 1; j < pages.length; j++) {
    if (assigned.has(j)) continue;
    if (cosineSim(pages[i].vec, pages[j].vec) >= THRESHOLD) {
      cluster.push(j);
      assigned.add(j);
    }
  }
  clusters.push(cluster);
}

// Sort clusters by size desc
clusters.sort((a, b) => b.length - a.length);

const thinClusters = clusters.filter(c => c.length < 3);
const strongClusters = clusters.filter(c => c.length >= 3);

// Detect path prefixes with no cluster >= 3 (missing topic areas)
const allPrefixes = new Set(pages.map(p => {
  const parts = new URL(p.url, 'https://example.com').pathname.split('/').filter(Boolean);
  return parts.length > 0 ? '/' + parts[0] : '/';
}));

const coveredPrefixes = new Set();
for (const cluster of strongClusters) {
  for (const idx of cluster) {
    const parts = new URL(pages[idx].url, 'https://example.com').pathname.split('/').filter(Boolean);
    if (parts.length > 0) coveredPrefixes.add('/' + parts[0]);
  }
}

const uncoveredPrefixes = [...allPrefixes].filter(p => !coveredPrefixes.has(p));

// Write output
const lines = [
  `# Topic Gap Analysis`,
  ``,
  `**Pages analyzed:** ${pages.length}  `,
  `**Topic clusters found:** ${clusters.length} (threshold: cosine similarity >= ${THRESHOLD})  `,
  `**Strong clusters (>= 3 pages):** ${strongClusters.length}  `,
  `**Thin clusters (< 3 pages):** ${thinClusters.length}`,
  ``,
  `Thin clusters are topic areas with sparse coverage. AI search engines are less likely to cite a site`,
  `as an authority on topics represented by only 1-2 pages.`,
  ``,
  `## Strong topic clusters`,
];

for (let i = 0; i < Math.min(strongClusters.length, 20); i++) {
  const cluster = strongClusters[i];
  const seed = pages[cluster[0]];
  lines.push(``, `### Cluster ${i + 1} (${cluster.length} pages) — seed: ${seed.title || seed.url}`);
  lines.push(`| URL | Title |`, `|---|---|`);
  for (const idx of cluster.slice(0, 10)) {
    lines.push(`| ${pages[idx].url} | ${(pages[idx].title || '').replace(/\|/g, ' ')} |`);
  }
  if (cluster.length > 10) lines.push(`| ... | (${cluster.length - 10} more) |`);
}

lines.push(``, `## Thin coverage areas (< 3 pages per topic cluster)`);
lines.push(`These topics are underrepresented. Adding 2+ more pages per cluster builds authority.`);
lines.push(``, `| Seed URL | Title | Cluster size |`, `|---|---|---|`);

for (const cluster of thinClusters.slice(0, 30)) {
  const seed = pages[cluster[0]];
  lines.push(`| ${seed.url} | ${(seed.title || '').replace(/\|/g, ' ')} | ${cluster.length} |`);
}

if (thinClusters.length === 0) {
  lines.push(`| (none) | All topic areas have >= 3 pages of coverage. |  |`);
}

if (uncoveredPrefixes.length > 0) {
  lines.push(``, `## URL sections with no strong topic cluster`);
  lines.push(`These site sections have pages but no topic cluster of 3+ pages.`);
  lines.push(``, uncoveredPrefixes.map(p => `- \`${p}\``).join('\n'));
}

fs.writeFileSync(outputPath, lines.join('\n') + '\n');
console.log(`topic-gap: ${clusters.length} clusters, ${thinClusters.length} thin. Written to ${outputPath}`);
