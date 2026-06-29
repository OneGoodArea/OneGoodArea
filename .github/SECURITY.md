# Security Policy

## Reporting a vulnerability

If you discover a security issue in OneGoodArea, please report it privately.

- **Email:** `operation@onegoodarea.co.uk` with subject prefix `[Security]`
- **Response time:** we aim to acknowledge within 24 hours and ship a fix or mitigation within 7 days for critical issues
- **Do NOT** open a public GitHub issue for security vulnerabilities

## Scope

In scope:

- Production web app at https://www.onegoodarea.com
- Public API endpoints at https://www.onegoodarea.com/api/v1/*
- Embeddable widget endpoint at https://www.onegoodarea.com/api/widget
- MCP server package `@oga-mcp/server`

Out of scope:

- Issues already in our public roadmap (see the issues tab; in particular AR-127 plaintext API keys is known and being addressed)
- Denial-of-service via volume alone
- Findings from automated scanners without a working proof of concept
- Issues that require physical access to a user's device
- Social engineering of our team
- Self-XSS or issues requiring an attacker to already control a user's account

## Disclosure

Please give us 30 days to address the issue before public disclosure. We will credit you in the changelog if you would like, unless you prefer to remain anonymous.

## Current hardening posture

OneGoodArea uses:

- PBKDF2-SHA256 password hashing (600,000 iterations, random salt, Edge-runtime compatible)
- HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, strict CSP
- Sliding-window rate limiting per endpoint, Postgres-backed
- Webhook signature verification (Stripe)
- Webhook idempotency (database-backed via `webhook_events` table)
- Sentry error monitoring across client, server, and edge runtimes
- Resend transactional email with DKIM and SPF

## Known gaps being addressed

We publish known security gaps transparently:

- API keys stored in plaintext in the database (AR-127). Fix in active development. Mitigation: keys are 48-character random tokens; revocation works.
- SOC 2 Type I attestation not yet awarded. Process initiated via Vanta.

## For procurement security questionnaires

Contact `operation@onegoodarea.co.uk` for security questionnaire responses, signed DPAs, and infrastructure attestations.
