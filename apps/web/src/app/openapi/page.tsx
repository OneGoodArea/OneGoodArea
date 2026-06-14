import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'

export const metadata = {
  title: 'API Reference | OneGoodArea',
  description: 'OpenAPI documentation for OneGoodArea API',
}

export default function OpenAPIPage() {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <ApiReferenceReact
        configuration={{
          spec: {
            url: '/api/openapi-spec',
          },
          theme: 'default',
        }}
      />
    </div>
  )
}
