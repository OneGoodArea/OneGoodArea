import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  SELECT signal_key, COUNT(*)::int AS total,
         SUM(CASE WHEN normalized_value IS NOT NULL THEN 1 ELSE 0 END)::int AS normalized
    FROM signal_values
   WHERE geo_type = 'lsoa'
   GROUP BY signal_key
   ORDER BY normalized DESC, signal_key
`;
console.log("signal_key (geo_type=lsoa)                                  |    total |  normalized");
console.log("-".repeat(95));
for (const r of rows) {
  console.log(`${r.signal_key.padEnd(60)} | ${String(r.total).padStart(8)} | ${String(r.normalized).padStart(11)}`);
}
const overall = await sql`SELECT COUNT(DISTINCT geo_code)::int AS n FROM signal_values WHERE geo_type='lsoa' AND normalized_value IS NOT NULL`;
console.log("\nDistinct LSOAs with at least one normalized signal:", overall[0].n);
