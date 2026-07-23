// AR-603: this route's whole purpose is "always reflect what's deployed"
// (see docs/API-REFERENCE/README.md). Without `cache: "no-store"`, Next.js
// caches the upstream fetch (and can statically optimize the whole route at
// build time), so it kept serving apps/api's build-time OpenAPI spec —
// including a stale `servers` URL — regardless of what apps/api actually
// returns afterward. `force-dynamic` + `no-store` opt this route out of
// every caching layer Next.js has (build-time static generation, the fetch
// Data Cache, and the response's own Cache-Control).
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const response = await fetch('https://onegoodarea.onrender.com/docs/json', {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return Response.json(
        { error: 'Failed to fetch OpenAPI spec' },
        { status: response.status }
      )
    }

    const spec = await response.json()

    return Response.json(spec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return Response.json(
      { error: 'Failed to load OpenAPI spec', details: String(error) },
      { status: 500 }
    )
  }
}
