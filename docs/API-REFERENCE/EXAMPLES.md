# Examples

Runnable snippets per product. Replace `$OGA_KEY` with your `oga_…` API key.

## Get a full signal profile

```bash
curl "https://onegoodarea.onrender.com/v1/area?postcode=M1%201AE" \
  -H "Authorization: Bearer $OGA_KEY"
```

```javascript
const res = await fetch("https://onegoodarea.onrender.com/v1/area?postcode=M1%201AE", {
  headers: { Authorization: `Bearer ${process.env.OGA_KEY}` },
});
const { geo, signals, meta } = await res.json();
```

## Score one area

```bash
curl -X POST "https://onegoodarea.onrender.com/v1/score" \
  -H "Authorization: Bearer $OGA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"area":"M1 1AE","preset":"research"}'
```

With custom weights over the chosen preset's dimensions:

```bash
curl -X POST "https://onegoodarea.com/v1/score" \
  -H "Authorization: Bearer $OGA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"area":"M1 1AE","preset":"moving","weights":{"safety_crime":0.5,"schools_education":0.3}}'
```

## Rank LSOAs cross-area

```bash
# Most-deprived LSOAs in England, top 10
curl "https://onegoodarea.onrender.com/v1/areas?signal=deprivation.imd_decile&country=England&sort=value&limit=10" \
  -H "Authorization: Bearer $OGA_KEY"
```

## NL Intelligence query

```bash
curl -X POST "https://onegoodarea.onrender.com/v1/query" \
  -H "Authorization: Bearer $OGA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question":"England areas under 250000 GBP with rising YoY"}'
```

Response includes the executed plan + `plan_source: "nl"` so the answer is replayable.

## Find peers

```bash
curl -X POST "https://onegoodarea.onrender.com/v1/peers" \
  -H "Authorization: Bearer $OGA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"target":{"postcode":"M1 1AE"},"country":"England","k":20}'
```

## Monitor a portfolio

```bash
# Create portfolio
curl -X POST "https://onegoodarea.onrender.com/v1/portfolios" \
  -H "Authorization: Bearer $OGA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"NW pilot"}'

# Add areas
curl -X POST "https://onegoodarea.onrender.com/v1/portfolios/$PORTFOLIO_ID/areas" \
  -H "Authorization: Bearer $OGA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"areas":[{"area":"M1 1AE"},{"area":"M14 5RB"}]}'

# Check for material changes
curl -X POST "https://onegoodarea.onrender.com/v1/portfolios/$PORTFOLIO_ID/changes" \
  -H "Authorization: Bearer $OGA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"baseline":"previous","threshold_pct":5}'
```

## Get account state

```bash
curl "https://onegoodarea.onrender.com/v1/me" \
  -H "Authorization: Bearer $OGA_KEY"
```

Response includes plan + entitlements + your org's branding + your key's allowlist.

## More

- `.http` files runnable in VS Code REST Client / httpyac: [`docs/TESTING/http/`](../TESTING/http/)
- Live OpenAPI spec: [/openapi.json](https://www.onegoodarea.com/openapi.json)
- Interactive Scalar reference: [/docs/api-reference](https://www.onegoodarea.com/docs/api-reference)
