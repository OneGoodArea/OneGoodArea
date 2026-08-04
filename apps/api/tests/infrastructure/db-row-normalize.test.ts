import { describe, it, expect } from "vitest";
import { row, rows } from "../../src/infrastructure/db/types";

describe("row() / rows() — Date→ISO normalization", () => {
  it("converts Date instances to ISO strings", () => {
    const date = new Date("2026-08-03T15:00:00.000Z");
    const raw: Record<string, unknown> = {
      id: "r_123",
      name: "test",
      created_at: date,
      updated_at: date,
    };

    const result = row<{ id: string; name: string; created_at: string; updated_at: string }>(raw);

    expect(result.created_at).toBe("2026-08-03T15:00:00.000Z");
    expect(result.updated_at).toBe("2026-08-03T15:00:00.000Z");
    expect(result.id).toBe("r_123");
    expect(result.name).toBe("test");
  });

  it("leaves string values unchanged", () => {
    const raw: Record<string, unknown> = {
      id: "r_123",
      created_at: "2026-08-03T15:00:00.000Z",
    };

    const result = row<{ id: string; created_at: string }>(raw);

    expect(result.created_at).toBe("2026-08-03T15:00:00.000Z");
    expect(result.id).toBe("r_123");
  });

  it("leaves null/undefined values unchanged", () => {
    const raw: Record<string, unknown> = {
      id: "r_123",
      last_used_at: null,
      deleted_at: undefined,
    };

    const result = row<{ id: string; last_used_at: string | null; deleted_at: string | undefined }>(raw);

    expect(result.last_used_at).toBeNull();
    expect(result.deleted_at).toBeUndefined();
  });

  it("returns the original object when no Dates are present", () => {
    const raw: Record<string, unknown> = { id: "r_123", name: "test" };
    const result = row<{ id: string; name: string }>(raw);
    expect(result).toBe(raw);
  });

  it("rows() normalizes an array of rows", () => {
    const date1 = new Date("2026-01-01T00:00:00.000Z");
    const date2 = new Date("2026-06-15T12:30:00.000Z");
    const rawRows: Record<string, unknown>[] = [
      { id: "r_1", created_at: date1 },
      { id: "r_2", created_at: date2 },
    ];

    const result = rows<{ id: string; created_at: string }>(rawRows);

    expect(result[0].created_at).toBe("2026-01-01T00:00:00.000Z");
    expect(result[1].created_at).toBe("2026-06-15T12:30:00.000Z");
  });

  it("handles empty arrays", () => {
    const result = rows<{ id: string }>([]);
    expect(result).toEqual([]);
  });

  it("handles rows with mixed types", () => {
    const raw: Record<string, unknown> = {
      id: "r_123",
      count: 42,
      active: true,
      created_at: new Date("2026-08-03T15:00:00.000Z"),
      metadata: null,
    };

    const result = row<{ id: string; count: number; active: boolean; created_at: string; metadata: null }>(raw);

    expect(result.id).toBe("r_123");
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.created_at).toBe("2026-08-03T15:00:00.000Z");
    expect(result.metadata).toBeNull();
  });
});
