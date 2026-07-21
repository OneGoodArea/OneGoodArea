"use client"

import { ApiReferenceReact } from "@scalar/api-reference-react"
import "@scalar/api-reference-react/style.css"

export interface DeveloperSurfaceProps {
  /** URL to the OpenAPI spec JSON. Defaults to /api/openapi-spec */
  specUrl?: string
  /** Scalar theme. Defaults to "default" */
  theme?: "default" | "alternate" | "purple" | "green" | "yellow"
}

/**
 * Branded Scalar API reference wrapper.
 * Renders the full API playground at /playground.
 */
export function DeveloperSurface({
  specUrl = "/api/openapi-spec",
  theme = "default",
}: DeveloperSurfaceProps) {
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <ApiReferenceReact
        configuration={{
          spec: { url: specUrl },
          theme,
        }}
      />
    </div>
  )
}
