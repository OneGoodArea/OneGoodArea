import { describe, it, expect } from "vitest"
import { filterSpec } from "../../src/modules/developer-surface/filter"
import { HIDDEN_TAGS } from "../../src/modules/developer-surface/config"

interface SpecTags {
  tags: { name: string }[]
  paths: Record<string, Record<string, { tags: string[] }>>
}

function makeSpec(tags: string[], paths: Record<string, Record<string, { tags: string[] }>> = {}) {
  return {
    tags: tags.map((name) => ({ name, description: `${name} endpoints` })),
    paths,
  } as unknown as Record<string, unknown>
}

describe("filterSpec (AR-663)", () => {
  it("removes hidden tags from spec.tags", () => {
    const spec = makeSpec(["Signals", "Auth", "Admin", "Scores"])
    const filtered = filterSpec(spec) as unknown as SpecTags

    const names = filtered.tags.map((t) => t.name)
    expect(names).toEqual(["Signals", "Scores"])
  })

  it("removes endpoints tagged only with hidden tags", () => {
    const spec = makeSpec(["Auth", "Signals"], {
      "/auth/login": { post: { tags: ["Auth"] } },
      "/v1/signals": { get: { tags: ["Signals"] } },
    })
    const filtered = filterSpec(spec) as unknown as SpecTags

    expect(filtered.paths["/auth/login"]).toBeUndefined()
    expect(filtered.paths["/v1/signals"]).toBeDefined()
  })

  it("keeps endpoints with mixed hidden + visible tags, stripping hidden ones", () => {
    const spec = makeSpec(["Auth", "Signals"], {
      "/v1/shared": { get: { tags: ["Auth", "Signals"] } },
    })
    const filtered = filterSpec(spec) as unknown as SpecTags

    expect(filtered.paths["/v1/shared"]).toBeDefined()
    expect(filtered.paths["/v1/shared"].get.tags).toEqual(["Signals"])
  })

  it("deletes empty path objects after filtering", () => {
    const spec = makeSpec(["Auth"], {
      "/auth/login": { post: { tags: ["Auth"] } },
    })
    const filtered = filterSpec(spec) as unknown as SpecTags

    expect(filtered.paths["/auth/login"]).toBeUndefined()
    expect(Object.keys(filtered.paths)).toHaveLength(0)
  })

  it("does not touch endpoints with no hidden tags", () => {
    const spec = makeSpec(["Signals", "Scores"], {
      "/v1/signals": { get: { tags: ["Signals"] } },
      "/v1/scores": { post: { tags: ["Scores"] } },
    })
    const filtered = filterSpec(spec) as unknown as SpecTags

    expect(filtered.paths["/v1/signals"].get.tags).toEqual(["Signals"])
    expect(filtered.paths["/v1/scores"].post.tags).toEqual(["Scores"])
  })

  it("handles all hidden tags", () => {
    const spec = makeSpec(HIDDEN_TAGS as unknown as string[], {
      "/auth/login": { post: { tags: ["Auth"] } },
      "/stripe/webhook": { post: { tags: ["Stripe"] } },
      "/admin/stats": { get: { tags: ["Admin"] } },
      "/contact": { post: { tags: ["Contact"] } },
      "/cron/run": { post: { tags: ["Cron"] } },
    })
    const filtered = filterSpec(spec) as unknown as SpecTags

    expect(filtered.tags).toHaveLength(0)
    expect(Object.keys(filtered.paths)).toHaveLength(0)
  })
})
