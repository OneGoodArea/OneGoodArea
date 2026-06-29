import { sql } from "../../infrastructure/db/client";
import { getConfig } from "../../infrastructure/config";

/* AR-377 / plan 029: bounded retention for the training tables.
   Purges rows older than TRAINING_DATA_RETENTION_DAYS (default 365)
   from query_planner_logs and brief_composer_logs.

   When retention is set to 0 the cron is a no-op — keeps everything
   indefinitely (useful for local dev / staging).

   Returns counts so the cron route can log + report. Errors bubble up
   to the route handler so the cron service sees a 500 and retries. */

export interface RetentionRunSummary {
  retention_days: number;
  cutoff: string;
  planner_pairs_deleted: number;
  brief_pairs_deleted: number;
}

export async function runTrainingRetentionCron(opts: { dryRun?: boolean } = {}): Promise<RetentionRunSummary> {
  const retentionDays = getConfig().trainingDataRetentionDays;
  if (retentionDays === 0) {
    return {
      retention_days: 0,
      cutoff: new Date(0).toISOString(),
      planner_pairs_deleted: 0,
      brief_pairs_deleted: 0,
    };
  }

  /* Cutoff computed in JS so we can include it in the summary log and so
     the SQL stays simple. INTERVAL arithmetic in Postgres works
     equivalently; we choose the explicit timestamp for traceability. */
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  const cutoffIso = cutoff.toISOString();

  if (opts.dryRun) {
    const [plannerRows, briefRows] = await Promise.all([
      sql`SELECT COUNT(*)::INT AS count FROM query_planner_logs WHERE event_ts < ${cutoffIso}`,
      sql`SELECT COUNT(*)::INT AS count FROM brief_composer_logs WHERE event_ts < ${cutoffIso}`,
    ]);
    return {
      retention_days: retentionDays,
      cutoff: cutoffIso,
      planner_pairs_deleted: ((plannerRows[0] as { count?: number })?.count) ?? 0,
      brief_pairs_deleted: ((briefRows[0] as { count?: number })?.count) ?? 0,
    };
  }

  const plannerDeleted = await sql`
    DELETE FROM query_planner_logs WHERE event_ts < ${cutoffIso}
  `;
  const briefDeleted = await sql`
    DELETE FROM brief_composer_logs WHERE event_ts < ${cutoffIso}
  `;

  /* neon/serverless returns a result object with a `count` field (number
     of affected rows) on DELETE. The DAL's `sql` tag aliases this. */
  const plannerCount = (plannerDeleted as unknown as { count?: number }).count ?? 0;
  const briefCount = (briefDeleted as unknown as { count?: number }).count ?? 0;

  return {
    retention_days: retentionDays,
    cutoff: cutoffIso,
    planner_pairs_deleted: plannerCount,
    brief_pairs_deleted: briefCount,
  };
}
