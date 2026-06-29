import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/infrastructure/config", () => ({ getConfig: vi.fn() }));

import { sql } from "@/infrastructure/db/client";
import { getConfig } from "@/infrastructure/config";
import { runTrainingRetentionCron } from "@/modules/training/retention";

const mockSql = vi.mocked(sql);
const mockGetConfig = vi.mocked(getConfig);

beforeEach(() => {
  mockSql.mockReset();
  mockGetConfig.mockReset();
});

describe("runTrainingRetentionCron", () => {
  it("returns a zero-op summary when retention is 0 (kept indefinitely)", async () => {
    mockGetConfig.mockReturnValue({ trainingDataRetentionDays: 0 } as never);

    const result = await runTrainingRetentionCron();

    expect(mockSql).not.toHaveBeenCalled();
    expect(result.retention_days).toBe(0);
    expect(result.planner_pairs_deleted).toBe(0);
    expect(result.brief_pairs_deleted).toBe(0);
  });

  it("deletes rows older than the cutoff from both training tables", async () => {
    mockGetConfig.mockReturnValue({ trainingDataRetentionDays: 30 } as never);
    // DELETE returns row count via .count on the result object
    mockSql
      .mockResolvedValueOnce(Object.assign([], { count: 42 }) as never) // planner DELETE
      .mockResolvedValueOnce(Object.assign([], { count: 17 }) as never); // brief DELETE

    const result = await runTrainingRetentionCron();

    expect(mockSql).toHaveBeenCalledTimes(2);
    expect(result.retention_days).toBe(30);
    expect(result.planner_pairs_deleted).toBe(42);
    expect(result.brief_pairs_deleted).toBe(17);
    // cutoff is a valid ISO timestamp (~30 days before now)
    expect(() => new Date(result.cutoff)).not.toThrow();
  });

  it("dry-run does SELECT COUNT, never DELETE", async () => {
    mockGetConfig.mockReturnValue({ trainingDataRetentionDays: 30 } as never);
    mockSql
      .mockResolvedValueOnce([{ count: 100 }] as never) // SELECT planner
      .mockResolvedValueOnce([{ count: 50 }] as never); // SELECT brief

    const result = await runTrainingRetentionCron({ dryRun: true });

    expect(result.planner_pairs_deleted).toBe(100);
    expect(result.brief_pairs_deleted).toBe(50);
    // Two SELECT calls, no DELETE
    expect(mockSql).toHaveBeenCalledTimes(2);
  });
});
