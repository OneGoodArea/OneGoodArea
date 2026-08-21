/* /help topics, single source of truth for the help-page Q&A data.
   Imported by both:
     - apps/web/src/app/design-v2/help/client.tsx  (UI)
     - apps/web/src/app/help/page.tsx              (FAQPage JSON-LD)
   So the structured data + the visible content cannot drift.

   AR-204 PR: /help full rewrite.
   Replaces the 374 LOC legacy /help that used out-of-date
   "Reports / moving / business / investing / research" framing.
   New IA: by product (Signals/Scores/Monitor/Intelligence) +
   cross-cutting (Methodology / API / Plans / Account).

   AR-479 + AR-866: pricing/plans section realigned to the demo-led B2B
   packages on /pricing (Developer Sandbox free eval + Build / Decision /
   Assured, annual, no self-serve checkout). Assured is the audit-grade
   regulated tier for lenders and insurers. The old self-serve 6-tier story
   (Sandbox/Starter/Build/Scale/Growth with prices, soft caps, and the £29
   MCP add-on) was removed. */

export type QA = { q: string; a: string };
export type Topic = {
  num: string;
  title: string;
  lead?: string;
  items: QA[];
};

export const TOPICS: Topic[] = [
  {
    num: "01",
    title: "Getting started",
    lead: "What OneGoodArea is, what the free Developer Sandbox includes, and how to start.",
    items: [
      {
        q: "What is OneGoodArea?",
        a: "OneGoodArea is the data and intelligence layer underneath UK property workflows. One API serves four products on the same engine: Signals (deterministic signals), Scores (configurable scoring), Monitor (portfolio change detection), and Intelligence (typed AI query plane over monthly area time-series). Methodology is version-pinned per organisation.",
      },
      {
        q: "Do I need a card to try it?",
        a: "No. The Developer Sandbox is free with no card required, for evaluating the API and exploring the MCP server. It is not licensed for production use. When you are ready for production, book a demo and we run a 40-day pilot on one real workflow, moving to an annual contract if it works.",
      },
      {
        q: "How do I make my first API call?",
        a: "On the free Developer Sandbox, generate an evaluation key, then curl POST https://onegoodarea.onrender.com/v1/score with body { \"area\": \"M1 1AE\", \"preset\": \"residential_origination\" } and Authorization: Bearer <your_key>. Full code samples in cURL, Node, Python, and Go live at /docs/api-reference.",
      },
      {
        q: "What is the difference between the four products?",
        a: "Signals returns individual measured values per area (one signal at a time). Scores composes multiple signals into a 0-100 number per a named profile. Monitor watches a portfolio of areas for material change over time and fires signed webhooks. Intelligence accepts a natural-language question, emits a typed plan, and executes it against the time-series store. Same engine underneath; different shapes on top.",
      },
      {
        q: "Where do I find the methodology?",
        a: "The full methodology is public at /methodology. It documents the data sources, the country-scoped percentile design, the scoring formula, the confidence rubric, and the engine version registry. Every response also carries an engine_version stamp so you can cite the exact methodology version that produced any number.",
      },
    ],
  },

  {
    num: "02",
    title: "Signals",
    lead: "Deterministic per-area measurements. The atomic unit underneath every product.",
    items: [
      {
        q: "What is a Signal?",
        a: "A Signal is a single measured value for an area, with explicit source, observed_period, confidence (0-1), confidence_reason, normalized_value (0-100), and country-scoped percentile. Examples: deprivation (IMD), violent crime rate, education rating, residential price median, residential price YoY.",
      },
      {
        q: "What signals are available today?",
        a: "Deprivation (England IMD 2025, Wales WIMD 2019, Scotland SIMD 2020), crime (police.uk recorded crime by category and total), education (Ofsted inspection ratings for England; Estyn and Education Scotland on the roadmap), residential prices (HM Land Registry monthly with YoY), and a small set of derived signals like price_change_pct_yoy. Northern Ireland coverage is on the roadmap.",
      },
      {
        q: "What is fetch_mode (live vs store vs hybrid)?",
        a: "Every Signal response carries fetch_mode so you know how the value was served. \"store\" returns from our monthly time-series store (warm path, fast). \"live\" goes to the source API at request time (cold path, used when the store is unavailable or stale). \"hybrid\" means part of the dimensions came from the store and part from live. The fetch_mode is honest, not a marketing label.",
      },
      {
        q: "What does a Signal's confidence value mean?",
        a: "Confidence is a 0-1 number that reflects how much we trust the value, with a plain-language confidence_reason. Today it is an availability + sample rubric (high if the source is fresh and the sample is wide; medium if data is older or thinner; low if a fallback was used). Statistical confidence intervals are on the roadmap as Phase 7.",
      },
    ],
  },

  {
    num: "03",
    title: "Scores",
    lead: "Composing signals into 0-100 numbers per a named scoring profile.",
    items: [
      {
        q: "What is Scores?",
        a: "Scores returns a 0-100 number for an area against a named scoring profile, broken down by seven dimensions (Crime, Deprivation, Property, Schools, Amenities, Transport, Environment). Each response shows the dimension values, the weight applied to each, the per-dimension confidence, the preset used, the weights_source, and the engine_version. The number is reproducible byte-for-byte across deploys at the same engine version.",
      },
      {
        q: "What scoring profiles are available?",
        a: "Four named workflow profiles ship today. residential_origination (mortgage origination weighting), commercial_site_selection (CRE / retail / store-location weighting), investment_underwrite (property investment weighting), and research_baseline (a neutral baseline with equal weights). The slug is the API parameter; the workflow framing is what the dashboard shows.",
      },
      {
        q: "Can I configure custom weights?",
        a: "Yes, two ways. Inline: pass a weights object in the request body and the engine applies it directly. Persisted: create a scoring preset for your organisation (POST /v1/orgs/:id/presets) and pass preset_id later. The Levers admin surface for managing presets is on the roadmap; the API endpoints exist today.",
      },
      {
        q: "Which signals feed into the score?",
        a: "Each of the seven dimensions composes from a known set of signals (e.g. Crime = violent crime + total crime + IMD crime sub-domain). Full mapping is on /methodology under \"Normalization\" and \"Scoring presets\". The composition rule is identical across the four shipped profiles; only the weights differ.",
      },
      {
        q: "Why are scores stable across deploys?",
        a: "Because the engine is the source of the number, not the AI. The deterministic SQL + rules pipeline at a given engine_version always produces the same output for the same input. We freeze engine versions, golden-test them, stamp the version on every response, and let your organisation pin a specific version with PUT /v1/orgs/:id/methodology.",
      },
    ],
  },

  {
    num: "04",
    title: "Monitor",
    lead: "Continuous change detection over a portfolio of areas, with signed webhook delivery.",
    items: [
      {
        q: "What is Monitor?",
        a: "Monitor watches a portfolio of areas for material changes in their signals and fires signed signal.changed webhooks when a threshold is crossed. It diffs the monthly time-series store, so it only triggers on real movements in the underlying data, not on synthetic re-scores.",
      },
      {
        q: "How do I create a portfolio?",
        a: "POST /v1/portfolios with a name and an array of up to 500 LSOA codes or postcodes. Returns a portfolio_id. POST /v1/portfolios/:id/areas to add or remove areas later. GET /v1/portfolios/:id/changes lists the material change rows since a given period.",
      },
      {
        q: "How does change detection work?",
        a: "On each schedule tick the diff core compares the current observed_period for each signal against a baseline (default: previous period). It applies two gates before emitting a change: a configurable threshold_pct (default 5%) on the value delta, and a min_transactions sample-size gate on the underlying data (default 8 in both periods). Static signals like deprivation produce zero change rows by design.",
      },
      {
        q: "How are webhook deliveries signed?",
        a: "Stripe-style HMAC-SHA256. The signing secret is returned once on subscription create, never on later reads. Each delivery includes a webhook-id header, a webhook-timestamp header, and a webhook-signature header. Verify the signature server-side before trusting the payload. Webhook URLs must be public HTTPS; localhost and RFC 1918 ranges are rejected at validation.",
      },
      {
        q: "What if a webhook delivery fails?",
        a: "5-second per-delivery timeout. On non-2xx response the delivery is retried with exponential back-off up to 5 attempts. After the final attempt the delivery is marked failed and visible in the dashboard for manual replay.",
      },
      {
        q: "What signals does Monitor watch?",
        a: "Any time-series signal can be monitored: residential price median, price YoY, crime rate, crime YoY. Static signals (deprivation indices) do not appear in change rows because they do not change between releases; their refresh produces version-bump events instead.",
      },
    ],
  },

  {
    num: "05",
    title: "Intelligence",
    lead: "A typed AI query plane over the monthly area time-series store. Not a chatbot.",
    items: [
      {
        q: "What is Intelligence?",
        a: "Intelligence accepts a natural-language question, emits a Zod-strict typed plan first, then executes the plan deterministically against the time-series store. The plan is JSON. Every response echoes the executed plan plus plan_source (\"nl\" or \"client\") so you can replay any query as a programmatic call without an LLM round-trip. AI never sets the numbers; the database does.",
      },
      {
        q: "What plan operations exist?",
        a: "Seven today. rank_areas (multi-signal compound filter + sort), get_area (single area lookup), compare_areas (side-by-side comparison), score_area (Scores via the planner), find_peers (k-NN similarity over an LSOA), find_insights (peer-relative anomaly detection), and find_forecast (time-series projection). Each maps to a /v1/<op> endpoint that you can also call directly without natural language.",
      },
      {
        q: "How accurate is the natural-language planner?",
        a: "92.9% on a 14-case curated corpus, measured against claude-sonnet-4-20250514. Per-op breakdown: rank_areas 3/4, all other ops 2/2. The Wilson 95% confidence interval is wide (roughly 70 to 99 percent) because the corpus is small by design and version-controlled. The harness measures the seam, not the model; the headline number is provider-specific and re-runs on any model swap.",
      },
      {
        q: "Can I replay a query later without an LLM call?",
        a: "Yes. Save the plan JSON returned in the response. POST /v1/query with the plan in the body and the planner is skipped entirely. Same plan against the same data state returns the same rows. This is the audit-replayable path for compliance and procurement workflows.",
      },
      {
        q: "Does Intelligence cover Northern Ireland?",
        a: "Not yet. England, Wales, and Scotland are covered today via the ONS NSPL spine and three official deprivation methodologies. NI postcodes return null rather than a fabricated cross-border value.",
      },
    ],
  },

  {
    num: "06",
    title: "Methodology and data",
    lead: "How numbers are computed, where data comes from, and how you can defend them.",
    items: [
      {
        q: "What data sources are used?",
        a: "Police.uk (recorded crime by category), ONS NSPL (postcode to LSOA spine), the three national deprivation methodologies (IMD 2025 / WIMD 2019 / SIMD 2020), HM Land Registry (residential sold prices), Ofsted (England school inspections), Companies House (business density), and OpenStreetMap (amenity counts). Full source registry on /methodology.",
      },
      {
        q: "Why are percentiles country-scoped?",
        a: "Because England's IMD, Wales's WIMD, and Scotland's SIMD are different methodologies with different domains, weights, and release schedules. A cross-border percentile would be a lie that could not survive a compliance review. We compare England against England, Scotland against Scotland, Wales against Wales by design.",
      },
      {
        q: "What is engine version pinning?",
        a: "PUT /v1/orgs/:id/methodology persists an engine_version pin per organisation. Two API calls under the same pin return the same numbers across deploys, even after we ship a new engine version. Owner-only, validated at write time against the supported version window. Audit-grade reproducibility for quarterly back-tests and procurement deliverables.",
      },
      {
        q: "How is the engine version stamped?",
        a: "Every response body carries engine_version (the version that actually ran). The HTTP response also carries X-Engine-Version (the pin you requested, if any). The split is deliberate: body equals ground truth, header equals pin. Body and header will diverge if you request a pin we no longer support, in which case we reject the request rather than silently fall back.",
      },
      {
        q: "How is confidence calculated?",
        a: "Confidence today is an availability + sample rubric (0-1), with a plain-language confidence_reason. HIGH when the source is fresh and the sample is wide. MEDIUM capped on property-backed dimensions when YoY variance is wide. LOW when a fallback was used or the sample is thin. Calibrated outcome-based statistical confidence intervals are on the roadmap as Phase 7.",
      },
      {
        q: "What is the methodology version today?",
        a: "v1.1.0. Released 2026-08-04. Registry of supported versions is on /methodology. We publish breaking changes through SemVer: major bump = new methodology, minor bump = new signal or dimension, patch bump = bug fix in a fixed formula.",
      },
    ],
  },

  {
    num: "07",
    title: "API access",
    lead: "Keys, rate limits, idempotency, errors, client libraries.",
    items: [
      {
        q: "How do I get API access?",
        a: "The free Developer Sandbox lets you generate an evaluation key to try the API and MCP server, no card required. It is for evaluation, not production. Pass the key as Authorization: Bearer <key> on every request. For production access, book a demo and we run a 40-day pilot, moving to an annual contract if it works.",
      },
      {
        q: "What is the rate limit?",
        a: "30 requests per minute per API key, on a 60-second sliding window. Cached responses (24h) do not count against your monthly quota but do count against the per-minute rate limit. Rate-limit state is exposed in the X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset response headers.",
      },
      {
        q: "How does idempotency work?",
        a: "Pass an Idempotency-Key header on POST endpoints. Same key plus same body within 24 hours replays the cached response instead of recomputing. The response carries X-Idempotency-Replayed: true on a cache hit and false on the original call. Useful for safe retries in network failure scenarios.",
      },
      {
        q: "What client libraries are available?",
        a: "cURL works against any endpoint directly. Code samples in Node, Python, and Go are on /docs/api-reference (Scalar-rendered). An official Node SDK is on the near roadmap. The MCP server, included with your plan, lets you call the API from Claude Desktop, Cursor, and any MCP-compatible client.",
      },
      {
        q: "How do I handle errors?",
        a: "All endpoints return RFC 7807 problem+json on error: { type, title, status, detail, instance }. 401 for missing or invalid key; 403 for plan-gated endpoints; 404 for unknown area; 422 for validation failures (including LLM-side failures on /v1/query, which surface as { type: \"llm_error\", status: 422 } rather than 500); 429 for rate-limit; 5xx for our problem. Every response carries an X-Request-Id you can quote when contacting support.",
      },
      {
        q: "What is X-Idempotency-Replayed?",
        a: "A boolean response header that echoes whether the response came from the idempotency cache. true = cached replay of an earlier call with the same Idempotency-Key + body. false = freshly computed. Useful for end-to-end testing and for knowing whether you are paying compute for a request.",
      },
    ],
  },

  {
    num: "08",
    title: "Plans and buying",
    lead: "How OneGoodArea is packaged, priced, and bought.",
    items: [
      {
        q: "What plans are available?",
        a: "A free Developer Sandbox plus three annual packages. Developer Sandbox (free, evaluation only: the API and MCP server, no card, not for production). Build (from £2,000 per month, billed annually: Signals and deterministic Scores in production, with the MCP server). Decision (from £5,000 per month, billed annually: full Scores and Intelligence, ranked search, peer comparison, insights, forecasts, the natural-language planner, and Monitor with portfolios and webhooks). Assured (custom annual contract, audit-grade for regulated lending and underwriting: everything in Decision plus version pinning locked for the term, full provenance for your model file, a signed DPA, security review, and an SLA). A data partnership adds redistribution rights for embedding OGA in your own product. Full comparison at /pricing.",
      },
      {
        q: "How is OneGoodArea priced?",
        a: "Around workflow value and production importance, not raw API-call volume. The three paid packages are annual contracts. Usage limits exist to protect the platform, but they are not the headline. There is no self-serve checkout; you buy it like infrastructure.",
      },
      {
        q: "How do I get started?",
        a: "Book a demo. We look at your use case, then run a 40-day pilot on one real workflow, moving to an annual contract if it works. The Developer Sandbox is free if you just want to evaluate the API or explore the MCP server first.",
      },
      {
        q: "What is the 40-day pilot?",
        a: "A short, hands-on evaluation against one real workflow and one success metric agreed up front, run over a 40-day sprint. You decide on the evidence, not a demo. If it works, you move to an annual contract.",
      },
      {
        q: "Is the Developer Sandbox enough to build on?",
        a: "It is for evaluation and prototyping, not production, customer-facing, or revenue-generating use. It covers the API and the MCP server so you can test the integration. For a production evaluation we run a 40-day pilot, and production use is licensed under one of the annual packages.",
      },
      {
        q: "Do you support procurement and security review?",
        a: "Built in today: IP allowlisting, training opt-out, and per-organisation methodology and version pinning. Data handling, retention, and our sub-processors are documented in the public privacy, data, and security pages, and for your review we will sign a DPA and complete your security questionnaire. Formal certifications like SOC 2 and ISO 27001 are on the roadmap as we grow into larger regulated deals.",
      },
    ],
  },

  {
    num: "09",
    title: "Account",
    lead: "Sign in, password reset, account deletion, RBAC roles.",
    items: [
      {
        q: "How do I sign up?",
        a: "Sign up with email and password at /sign-up, or use Google. We send a verification email; you must verify before generating an evaluation key on the free Developer Sandbox.",
      },
      {
        q: "How do I reset my password?",
        a: "Go to /forgot-password, enter the email you signed up with, and we send a reset link. The link expires in 1 hour. If you do not receive the email within a few minutes, check spam, then contact operation@onegoodarea.co.uk.",
      },
      {
        q: "How do I delete my account?",
        a: "Email operation@onegoodarea.co.uk with the subject \"Account deletion\" and we process the request within 48 hours. Deletion removes your user row, your API keys (revoked immediately), and your org membership. Org-level data persists if other members remain; sole owners of an org should transfer ownership first.",
      },
      {
        q: "What roles exist within an organisation?",
        a: "Three tiers: owner, admin, member. Owner can do everything (billing, methodology pinning, members, white-label, IP allowlist). Admin can manage members, presets, and peer cohorts, but not billing or methodology pinning. Member can call the API with their issued key and view reports, but cannot manage shared org state.",
      },
    ],
  },
];
