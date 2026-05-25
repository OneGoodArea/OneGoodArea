/**
 * Inject batch-seeded areas into the AREAS object in area/[slug]/page.tsx.
 * Usage: npx tsx scripts/inject-areas.ts
 *
 * Reads scripts/batch-output.json and merges new entries into
 * src/app/area/[slug]/page.tsx. Also updates the sitemap.
 *
 * Safe to run multiple times — skips slugs that already exist.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const BATCH_FILE = join(__dirname, "batch-output.json");
const AREA_PAGE = join(__dirname, "..", "src", "app", "area", "[slug]", "page.tsx");
const SITEMAP = join(__dirname, "..", "src", "app", "sitemap.ts");

function main() {
  // 1. Read batch output
  let batchData: Record<string, unknown>;
  try {
    batchData = JSON.parse(readFileSync(BATCH_FILE, "utf-8"));
  } catch {
    console.error("[inject] Could not read scripts/batch-output.json. Run batch-seed.ts first.");
    process.exit(1);
  }

  const newSlugs = Object.keys(batchData);
  console.log(`[inject] Found ${newSlugs.length} areas in batch output.`);

  // 2. Read area page
  let pageContent = readFileSync(AREA_PAGE, "utf-8");

  // Find existing slugs
  const existingSlugs = [...pageContent.matchAll(/^\s+(\w+):\s*\{$/gm)].map(m => m[1]);
  console.log(`[inject] Existing areas: ${existingSlugs.join(", ")}`);

  // Filter out already-existing slugs
  const toAdd = newSlugs.filter(s => !existingSlugs.includes(s));
  const skipped = newSlugs.filter(s => existingSlugs.includes(s));

  if (skipped.length > 0) {
    console.log(`[inject] Skipping (already exist): ${skipped.join(", ")}`);
  }

  if (toAdd.length === 0) {
    console.log("[inject] No new areas to inject.");
    return;
  }

  console.log(`[inject] Injecting ${toAdd.length} new areas: ${toAdd.join(", ")}`);

  // 3. Build TypeScript entries
  const entries = toAdd.map(slug => {
    const area = batchData[slug] as Record<string, unknown>;
    return `  ${slug}: ${JSON.stringify(area, null, 4).replace(/\n/g, "\n  ")},`;
  });

  // 4. Find insertion point (before the closing "};")
  // Match the last entry's closing brace + the AREAS closing
  const closingPattern = /\n(};)\s*\n/;
  const match = pageContent.match(closingPattern);

  if (!match) {
    console.error("[inject] Could not find AREAS closing pattern in page.tsx");
    process.exit(1);
  }

  const insertionIndex = pageContent.indexOf(match[0]);
  const newEntries = entries.join("\n");
  pageContent = pageContent.slice(0, insertionIndex) + "\n" + newEntries + "\n" + pageContent.slice(insertionIndex);

  writeFileSync(AREA_PAGE, pageContent);
  console.log(`[inject] Wrote ${toAdd.length} entries to area page.`);

  // 5. Update sitemap
  let sitemapContent = readFileSync(SITEMAP, "utf-8");
  const sitemapSlugs = [...sitemapContent.matchAll(/"(\w+)"/g)].map(m => m[1]);
  const sitemapToAdd = toAdd.filter(s => !sitemapSlugs.includes(s));

  if (sitemapToAdd.length > 0) {
    // Insert before the closing ];
    const sitemapEntries = sitemapToAdd.map(s => `  "${s}",`).join("\n");
    sitemapContent = sitemapContent.replace(
      /\];\s*\n\s*export default function sitemap/,
      `${sitemapEntries}\n];\n\nexport default function sitemap`
    );
    writeFileSync(SITEMAP, sitemapContent);
    console.log(`[inject] Added ${sitemapToAdd.length} slugs to sitemap.`);
  }

  console.log(`\n[inject] Done. Run 'npx next build' to verify.`);
}

main();
