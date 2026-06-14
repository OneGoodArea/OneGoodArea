import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'

const API_SPEC_URL = 'https://onegoodarea.onrender.com/docs/json'

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
            url: API_SPEC_URL,
          },
          theme: 'default',
        }}
      />
    </div>
  )
}
