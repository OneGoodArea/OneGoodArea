# API reference

The OneGoodArea public API — REST + JSON. Organised by product surface (Signals, Scores, Monitor, Intelligence, Levers) with concrete examples.

## Documents

| File | What it covers |
|---|---|
| [`ENDPOINTS-BY-PRODUCT.md`](./ENDPOINTS-BY-PRODUCT.md) | Every endpoint mapped to its product. The complete catalog. |
| [`AUTHENTICATION.md`](./AUTHENTICATION.md) | API keys (`oga_…` Bearer tokens), session JWT bridge, RBAC roles |
| [`ERRORS.md`](./ERRORS.md) | Error response shape + the typed error codes you can program against |
| [`EXAMPLES.md`](./EXAMPLES.md) | cURL / Node / Python snippets per product |

## Where the truth lives

Two sources, deliberate:

1. **Live interactive reference** at [`/docs/api-reference`](https://www.onegoodarea.com/docs/api-reference) — renders `apps/web/public/openapi.json` via Scalar. This is the **customer-facing** surface. Always reflects what's actually deployed; deliberately omits the dark-flagged surfaces (`OGA_SIGNALS_API`-gated) until they leave the flag.
2. **Markdown in this folder** — the operator + developer surface. Includes dark-flagged + Levers endpoints, deeper context, error-code rationale.

If they disagree, the OpenAPI spec wins for customer behaviour; this folder wins for operator + reviewer clarity.

## Related

- [`docs/ARCHITECTURE/PRODUCTS.md`](../ARCHITECTURE/PRODUCTS.md) — product-level view of the surface
- [`docs/ARCHITECTURE/QUERY-PLANE.md`](../ARCHITECTURE/QUERY-PLANE.md) — the Intelligence layer's typed grammar
- HTTP test files in [`docs/TESTING/http/`](../TESTING/http/) — runnable in VS Code REST Client / httpyac
