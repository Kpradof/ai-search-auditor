/**
 * faq-gap-detect.js
 *
 * Reads bulk page content export (NDJSON from sf_bulk_export_page_content)
 * and structured data export (NDJSON from sf_export_seo_element_urls for
 * Structured Data), then identifies pages that have FAQ-style content but
 * no FAQPage schema.
 *
 * Usage (via sf_run_node_js_script):
 *   node faq-gap-detect.js <content_ndjson_path> <schema_ndjson_path> <output_md_path>
 *
 * Output: markdown file listing gap pages with the detected Q&A pattern.
 */

const fs = require('fs');

const [,, contentPath, schemaPath, outputPath] = process.argv;

if (!contentPath || !schemaPath || !outputPath) {
  console.error('Usage: node faq-gap-detect.js <content.ndjson> <schema.ndjson> <output.md>');
  process.exit(1);
}

// FAQ detection patterns (case-insensitive)
const FAQ_PATTERNS = [
  /\bfaq\b/i,
  /frequently asked questions/i,
  /^\s*(what|how|why|when|where|who|can|does|is|are|do|will|should|which)\b.{10,}\?/m,
  /\bq:\s*.{5,}/i,
  /\ba:\s*.{5,}/i,
];

// Load pages with FAQPage schema already present
const pagesWithFAQSchema = new Set();
if (fs.existsSync(schemaPath)) {
  const schemaLines = fs.readFileSync(schemaPath, 'utf8').split('\n').filter(Boolean);
  for (const line of schemaLines) {
    try {
      const row = JSON.parse(line);
      const schema = row.structured_data || row.schema || row['Structured Data'] || '';
      if (/FAQPage/i.test(schema)) {
        const url = row.url || row.URL || row.Address || '';
        if (url) pagesWithFAQSchema.add(url.trim());
      }
    } catch {}
  }
}

// Scan content export for FAQ patterns on pages without FAQPage schema
const gapPages = [];
if (fs.existsSync(contentPath)) {
  const contentLines = fs.readFileSync(contentPath, 'utf8').split('\n').filter(Boolean);
  for (const line of contentLines) {
    try {
      const row = JSON.parse(line);
      const url = (row.url || row.URL || row.Address || '').trim();
      if (!url || pagesWithFAQSchema.has(url)) continue;

      const text = row.content || row.text || row.body || '';
      const matchedPatterns = FAQ_PATTERNS.filter(p => p.test(text));
      if (matchedPatterns.length >= 2) {
        // Extract a sample question for context
        const lines = text.split('\n');
        const sampleLine = lines.find(l => /\?/.test(l) && l.trim().length > 15) || '';
        gapPages.push({ url, sample: sampleLine.trim().substring(0, 120) });
      }
    } catch {}
  }
}

// Write output markdown
const lines = [
  `# FAQ Schema Gap Pages`,
  ``,
  `${gapPages.length} pages have FAQ-style content but no FAQPage schema.`,
  `Adding FAQPage schema to these pages makes Q&A pairs directly citable in AI search results.`,
  ``,
  `## How to fix`,
  `- Add a \`FAQPage\` JSON-LD block with \`mainEntity\` entries for each Q&A pair.`,
  `- Schema patches for these pages are in \`reports/<domain>/schema-patches/\`.`,
  ``,
  `## Gap page list`,
  `| URL | Sample question detected |`,
  `|---|---|`,
];

for (const { url, sample } of gapPages) {
  lines.push(`| ${url} | ${sample.replace(/\|/g, ' ')} |`);
}

if (gapPages.length === 0) {
  lines.push(`| (none) | All FAQ-style pages already have FAQPage schema or no FAQ patterns detected. |`);
}

fs.writeFileSync(outputPath, lines.join('\n') + '\n');
console.log(`faq-gap-detect: ${gapPages.length} gap pages written to ${outputPath}`);
