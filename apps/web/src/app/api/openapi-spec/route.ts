export async function GET() {
  try {
    const response = await fetch('https://onegoodarea.onrender.com/docs/json', {
      headers: {
        'Accept': 'application/json',
      },
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
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    return Response.json(
      { error: 'Failed to load OpenAPI spec', details: String(error) },
      { status: 500 }
    )
  }
}
