# OneGoodArea Pricing Structure Strategy v1.0

Commercial packaging, pricing ranges, add-ons, pilots, usage logic and qualification rules.

> Source spec provided by Pedro (CEO) 2026-07-13. The public `/pricing` page + demo-led CTAs were applied under **AR-456**. The Stripe products/prices, checkout, plan enforcement, usage metering and pilot/add-on billing are the follow-on billing rework (rides with the demo-led pivot epic), NOT yet built.

## 1. Executive summary

Price OneGoodArea as audit-safe UK property intelligence infrastructure, not a cheap API subscription. The API is the delivery method; the value is UK-wide signal coverage, deterministic scoring, intelligence workflows, monitoring, versioning, methodology and support for decisions that must be explained later.

Four public entries: **Developer, Core API, Decision Intelligence, Enterprise Monitor**. Developer is free and evaluation-only. The three paid plans are annual B2B contracts, with optional paid pilots before conversion.

| Public package | Pricing guide | Internal annual target | Primary use case |
|---|---|---|---|
| Developer | Free (£0) | £0 | Evaluation, MCP discovery, prototyping only |
| Core API | From £2k/month | £18k-£30k/year | Area signals + basic deterministic scoring |
| Decision Intelligence | From £5k/month | £48k-£90k/year | Ranking, comparison, scoring, insights, forecasts, decision workflows |
| Enterprise Monitor | Custom | £120k-£250k+/year | Portfolio monitoring, webhooks, enterprise controls, security, regulated workflows |

## 2. Pricing philosophy

Sequence: free technical discovery, paid pilot, annual contract, then expansion. Usage limits exist but are not the headline; early enterprise buyers want certainty and procurement-friendly contracts.

- Price around workflow value, not raw API cost.
- Keep public packaging simple, keep product surfaces modular underneath.
- Do not force buyers to understand Signals / Scores / Intelligence / Monitor as separate SKUs before they understand the use case.
- Do not discount enterprise controls into entry-level pricing.
- Use paid pilots to qualify serious buyers and avoid free consulting.
- Annual contracts are the default motion.

**Simple sales rule:** want data, sell Core API. Want decisions, sell Decision Intelligence. Want ongoing tracking, sell Enterprise Monitor.

## 3. Public capability matrix

| Capability | Developer | Core API | Decision Intelligence | Enterprise Monitor |
|---|---|---|---|---|
| Price | Free | From £2k/mo | From £5k/mo | Custom |
| Internal ACV | £0 | £18k-£30k | £48k-£90k | £120k-£250k+ |
| MCP | Yes | Yes | Yes | Yes |
| Signals | Sample | Yes | Yes | Yes |
| Scores | Demo | Basic | Full | Full |
| Intelligence | No | Limited | Full | Full |
| Ranked area search | No | Limited | Yes | Yes |
| Peer comparison | No | Limited | Yes | Yes |
| Insights / anomaly detection | No | No | Yes | Yes |
| Forecasts | No | No/limited | Yes | Yes |
| Natural-language planner | No | No/limited | Yes | Yes |
| Monitor + webhooks | No | No | Add-on | Yes |
| Custom presets | No | No | Yes | Yes |
| Custom cohorts | No | No | Add-on | Yes |
| Methodology pinning | No | No | No | Yes |
| IP allowlisting | No | No | No | Yes |
| SLA | No | No | Limited | Yes |
| Production use | No | Yes | Yes | Yes |

## 4. Developer

Free. Top-of-funnel and developer adoption, not revenue. Buyer: individual developer, analyst, founder, technical evaluator. Allowed: testing, prototyping, demos, sample postcodes, MCP exploration. NOT allowed: production, customer-facing use, paid client work, underwriting, pricing, live listing enrichment, portfolio monitoring. CTA: Start with MCP / View docs.

Production use = any real business process, customer-facing product, paid report, internal decision workflow or revenue-generating service.

## 5. Core API (from £2,000/mo, billed annually)

Entry paid package. Clean UK area data + basic deterministic scoring inside an existing product or workflow. ACV £18k-£30k.

- **£18k** small team, low usage, one workflow, standard support.
- **£24k** DEFAULT target. Moderate usage, one production integration, basic onboarding.
- **£30k** higher usage, more stakeholders, multiple environments, more onboarding.

Qualification: mainly data enrichment (not complex decisioning); standard methodology (no custom presets/cohorts); no portfolio monitoring/webhooks; standard support; production but not mission-critical/regulatory yet.

## 6. Decision Intelligence (from £5,000/mo, billed annually)

The main commercial package. Rank, compare, explain, score, forecast, find insights. Includes Intelligence explicitly. ACV £48k-£90k.

- **£48k** first serious decision-workflow customer, one team, one use case.
- **£60k** TARGET anchor. Production, one or two workflows, implementation support.
- **£75k** multiple workflows, more usage/stakeholders, custom presets, regular reviews.
- **£90k** near-Enterprise, procurement/security effort, strong dependency, optional limited Monitor add-on.

Qualification: asks which areas to prioritise / which are similar / what changed / what looks anomalous / what might happen next; needs ranking, peer comparison, forecasts, anomaly detection or NL querying; outputs for non-technical stakeholders; custom presets; measurable business value.

## 7. Enterprise Monitor (custom)

Portfolio-based, regulated, high-volume or operationally critical. Includes Monitor + webhooks by default + the controls that make OneGoodArea credible in serious workflows. ACV £120k-£250k+.

- **£120k** entry Enterprise, one business unit, one portfolio/workflow, standard SLA.
- **£150k** MAIN anchor. Important production workflow, webhooks, security review, regular support.
- **£200k** multiple teams, high monitored-area count, custom cohorts, procurement effort, stronger SLA.
- **£250k+** large regulated buyer, mission-critical, strict security/procurement, dedicated support, custom data/compliance.

Included: everything in Decision Intelligence, Monitor, portfolios, change detection, webhooks, methodology pinning, IP allowlisting, training opt-out, custom cohorts, SLA, security review support, dedicated support.

Qualification: monitor a real portfolio of areas/stores/loans/policies/assets; change alerts or webhooks in production; controls (IP allowlisting, training opt-out, methodology pinning, custom cohorts); procurement/vendor risk/legal/security review; operationally important, regulated or customer-facing at scale.

## 8. Modular packaging principle

Public packages are simple; the product stays modular. Buyers buy a workflow-led configuration that includes the underlying Signals/Scores required, not every technical module separately.

| Buyer request | Commercial response | Likely package |
|---|---|---|
| Only raw area signals | Sell data access | Core API |
| Only postcode scoring | Basic if simple, else decision-critical | Core API or Decision Intelligence |
| Only Intelligence queries | Intelligence-led workflow + required signals | Decision Intelligence |
| Only Monitor + webhooks | Monitor-led workflow + required signals | Enterprise Monitor |
| Monitor + Intelligence, no raw data UI | Sell workflow outcome | Enterprise Monitor |
| Regulated audit controls | Enterprise only | Enterprise Monitor |

Do not heavily discount because a buyer says they only want one part. Price on value, support load, risk and production importance.

## 9. Add-on strategy

Public: keep minimal. Only public add-on is **Monitor + webhooks for Decision Intelligence**.

| Add-on | Public/internal | Price guide |
|---|---|---|
| Monitor + webhooks | Public (on Decision Intelligence) | +£25k-£60k/year |
| Extra usage bundle | Internal | +£5k-£25k/year |
| Extra business unit / org | Internal | +£10k-£25k/year |
| Custom preset setup | Internal | £5k-£15k one-off (or included Pro/Ent) |
| Custom cohort setup | Internal | £5k-£20k one-off (or included Ent) |
| Enhanced SLA/support | Internal | +£15k-£50k/year |
| Data export / reporting pack | Internal | +£10k-£30k/year |
| Security/procurement support | Internal | Included in Enterprise or priced into pilot |

## 10. Paid pilots

8-week paid pilot, 50% of pilot fee credited against the first annual contract if signed within 60 days.

| Pilot | Price | Best for |
|---|---|---|
| Technical evaluation | £7.5k | PropTech, startup, technical data team |
| Commercial pilot | £15k | CRE, lender, insurer, larger PropTech |
| Regulated enterprise pilot | £25k-£50k | Lender, insurer, public sector, large platform |

Deliverables: one business use case; scoped API/MCP access; one success metric agreed up front; tailored example outputs; methodology note; final pilot report; conversion proposal.

## 11. Usage limits and overages

Internal guardrails, not the sales headline.

| Package | Deterministic calls | AI / Intelligence calls | Portfolio areas |
|---|---|---|---|
| Developer | Sample only | Sample only | None |
| Core API | 50k-100k/mo | None/limited | None |
| Decision Intelligence | 250k/mo | 5k/mo | Optional add-on |
| Enterprise Monitor | Custom | Custom | Custom |

Overage guides: deterministic £1-£3 / 1k calls; AI/Intelligence £30-£60 / 1k calls; area briefs £80-£150 / 1k briefs; additional monitored areas £0.02-£0.10 / area / month.

## 12. Discounting

| Situation | Allowed | Condition |
|---|---|---|
| First 3 design partners | Up to 40% | Testimonial / case study / reference / deep feedback |
| Annual upfront | Up to 10% | Standard |
| Multi-year | 15%-25% | Commitment + payment terms |
| Startup / early PropTech | Smaller Core scope | Do not discount Enterprise features into Core |
| Strategic lender / insurer | Discount pilot, not annual | Use pilot credit |
| Public logo / case study | Negotiable | Real logo |

**Rule: never sell Enterprise controls at Core pricing.** Security review, SLA, methodology pinning, webhooks or portfolio monitoring means they are not a Core buyer.

## 13. Buyer qualification matrix

| Question | Price impact |
|---|---|
| Used in production? | Requires a paid package |
| Customers see the output? | Core high-end or Decision Intelligence |
| Influences underwriting/pricing/site selection/policy? | Decision Intelligence or Enterprise Monitor |
| Need monitoring/alerts/webhooks? | Enterprise Monitor or Monitor add-on |
| Need procurement/security/vendor review? | Enterprise or paid regulated pilot |
| Need custom methodology/presets/cohorts? | Pro high-end or Enterprise |
| Multiple teams/business units? | Extra org fee or Enterprise |
| High-volume or mission-critical? | Higher ACV, usage bundle, SLA or Enterprise |

## 14. Example scenarios

| Scenario | Price | Package |
|---|---|---|
| Small PropTech enriches listings with area signals | £18k-£24k | Core API |
| PropTech wants scores + summaries + ranked recommendations | £48k-£60k | Decision Intelligence |
| Retailer finds areas similar to best stores | £60k-£75k | Decision Intelligence |
| Retailer monitors 200 store catchments + change alerts | £120k-£150k | Enterprise Monitor |
| Insurer renewal-risk monitoring across portfolio | £150k-£250k | Enterprise Monitor |
| Consultancy needs outputs for client reports | £30k-£75k | Core / Decision Intelligence |
| Lender tests 5,000 historic postcodes pre-procurement | £25k-£50k | Regulated pilot |

## 15. Recommended public website wording

OneGoodArea is packaged around how your team uses area intelligence.

- **Developer** is for technical evaluation and MCP access.
- **Core API** is for teams that need reliable UK area signals and deterministic scores inside an existing product or workflow.
- **Decision Intelligence** is for teams that need to rank, compare, explain and forecast areas using a versioned methodology.
- **Enterprise Monitor** is for regulated, high-volume or portfolio-based teams that need monitoring, webhooks, controls, security review support and audit-ready versioning.
- Need a different configuration? We can package OneGoodArea around your workflow.

## 16. Final recommendation

Four public entries, three real paid motions. Developer free/evaluation-only. Core API entry commercial. Decision Intelligence main growth package. Enterprise Monitor high-value regulated/portfolio package.

- Main revenue package: Decision Intelligence.
- Highest value package: Enterprise Monitor.
- Public add-on: Monitor + webhooks for Decision Intelligence.
- Pilots: £7.5k to £50k, 50% credit against annual.
- Pricing anchor: annual contract value, not API-call volume.
