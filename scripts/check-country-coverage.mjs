import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const r = await sql`
  SELECT
    SUBSTR(geo_code, 1, 1) AS country,
    COUNT(DISTINCT geo_code)::int AS lsoas,
    COUNT(*)::int AS values_rows
  FROM signal_values
  WHERE geo_type='lsoa' AND normalized_value IS NOT NULL
  GROUP BY 1 ORDER BY 1
`;
console.log("LSOA coverage by country prefix:");
for (const row of r) console.log(`  ${row.country} -> ${row.lsoas} LSOAs / ${row.values_rows} signal_value rows`);
