import { generateReport } from "@/lib/generate-report";
import { Intent, AreaReport } from "@/lib/types";
import { validateLocationInput, validateIntent } from "@/lib/validation";
import { BATCH_CONCURRENCY } from "@/lib/config";

/* AR-130 helpers — shared logic for the bulk scoring endpoint.
   Kept separate from src/app/api/v1/batch/route.ts so it can be unit-tested
   without next/server context. */

export interface BatchItem {
  area: string;
  intent: string;
}

export interface BatchResultSuccess {
  area: string;
  intent: Intent;
  report: AreaReport;
}

export interface BatchResultError {
  area: string;
  intent: string;
  error: string;
}

export type BatchResult = BatchResultSuccess | BatchResultError;

/** Runtime type guard for incoming JSON `items` field. */
export function isBatchItemArray(value: unknown): value is BatchItem[] {
  if (!Array.isArray(value)) return false;
  for (const item of value) {
    if (typeof item !== "object" || item === null) return false;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.area !== "string") return false;
    if (typeof candidate.intent !== "string") return false;
  }
  return true;
}

/** True if a result is the success variant (has a `report`). */
export function isSuccess(result: BatchResult): result is BatchResultSuccess {
  return "report" in result;
}

/** Process one item: validate, generate, wrap result. Never throws — failures
    return a BatchResultError so a single bad item doesn't crash the batch. */
export async function processSingleItem(
  item: BatchItem,
  userId: string,
): Promise<BatchResult> {
  const locationCheck = validateLocationInput(item.area);
  if (!locationCheck.valid) {
    return { area: item.area, intent: item.intent, error: locationCheck.error ?? "Invalid area" };
  }
  const intentCheck = validateIntent(item.intent);
  if (!intentCheck.valid) {
    return { area: item.area, intent: item.intent, error: intentCheck.error ?? "Invalid intent" };
  }
  try {
    const result = await generateReport(locationCheck.sanitized, item.intent as Intent, userId);
    return { area: item.area, intent: item.intent as Intent, report: result.report };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown processing error";
    return { area: item.area, intent: item.intent, error: message };
  }
}

/** Process items in sequential mini-batches of `concurrency` parallel calls.
    Bounded fan-out: at most `concurrency` Anthropic/data-source calls in flight
    at any moment. Result order matches input order. */
export async function processBatchItems(
  items: BatchItem[],
  userId: string,
  concurrency: number = BATCH_CONCURRENCY,
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      slice.map((item) => processSingleItem(item, userId)),
    );
    for (let j = 0; j < settled.length; j++) {
      const s = settled[j];
      const original = slice[j];
      if (s.status === "fulfilled") {
        results.push(s.value);
      } else {
        const message =
          s.reason instanceof Error ? s.reason.message : "Unknown processing error";
        results.push({ area: original.area, intent: original.intent, error: message });
      }
    }
  }

  return results;
}
