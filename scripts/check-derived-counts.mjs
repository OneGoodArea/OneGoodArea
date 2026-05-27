import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
for (const k of [
  "property.price_change_pct_yoy",
  "property.median_price_change_pct_6m",
  "property.median_price_peer_relative_z",
  "property.transaction_count_change_pct_yoy",
  "property.transaction_count_trend_slope_24m",
  "crime.total_12m_change_pct_yoy",
  "crime.total_6m_change_pct",
  "crime.total_12m_peer_relative_z",
  "crime.monthly_count_trend_slope_24m",
]) {
  const r = await sql`SELECT count(*)::int AS n FROM signal_values WHERE signal_key = ${k}`;
  const top = await sql`SELECT geo_code, raw_value, observed_period FROM signal_values WHERE signal_key = ${k} ORDER BY raw_value DESC NULLS LAST LIMIT 2`;
  const bot = await sql`SELECT geo_code, raw_value, observed_period FROM signal_values WHERE signal_key = ${k} ORDER BY raw_value ASC NULLS LAST LIMIT 2`;
  console.log(k, "->", r[0].n, "rows");
  console.log("  top:", top.map((row) => `${row.geo_code}=${row.raw_value}`).join(", "));
  console.log("  bot:", bot.map((row) => `${row.geo_code}=${row.raw_value}`).join(", "));
}
