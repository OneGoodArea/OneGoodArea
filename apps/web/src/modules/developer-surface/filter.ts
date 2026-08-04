import { HIDDEN_TAGS } from "./config"

/**
 * Filter an OpenAPI spec to remove internal tags and their endpoints.
 * Used by the BFF proxy to strip Auth, Stripe, Admin, Contact, Cron
 * from the public playground spec.
 *
 * - Endpoint has only hidden tags → remove entirely
 * - Endpoint has mixed hidden + visible tags → keep, strip hidden tags
 * - Endpoint has no hidden tags → untouched
 */
export function filterSpec(spec: Record<string, unknown>): Record<string, unknown> {
  const hiddenSet = new Set<string>(HIDDEN_TAGS)

  if (Array.isArray(spec.tags)) {
    spec.tags = spec.tags.filter(
      (t: { name: string }) => !hiddenSet.has(t.name)
    )
  }

  if (spec.paths && typeof spec.paths === "object") {
    for (const path of Object.keys(spec.paths as Record<string, unknown>)) {
      const methods = (spec.paths as Record<string, Record<string, unknown>>)[path]
      if (!methods || typeof methods !== "object") continue

      for (const method of Object.keys(methods)) {
        const operation = methods[method] as { tags?: string[] } | undefined
        if (!operation?.tags || !Array.isArray(operation.tags)) continue

        const visible = operation.tags.filter((t: string) => !hiddenSet.has(t))
        if (visible.length === 0) {
          delete methods[method]
        } else {
          operation.tags = visible
        }
      }
      if (Object.keys(methods).length === 0) {
        delete (spec.paths as Record<string, unknown>)[path]
      }
    }
  }

  return spec
}
