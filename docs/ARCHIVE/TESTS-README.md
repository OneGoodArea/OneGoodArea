# AreaIQ Test Suite Organization

This document describes how the original test plan has been split into two executable categories.

## Files Generated

### 1. **tests-automated.md** (31 test paths)
Automated tests that can be executed programmatically in CI/CD pipelines.

**Characteristics:**
- Use HTTP API calls (POST, GET, DELETE, PUT)
- Include database query verification
- Test webhook payloads
- Use JSON request/response validation
- No manual UI interaction required
- Can be run headless or via test frameworks

**Included Tests:**
- All AUTH tests except OAuth flows and email resend (PATH_AUTH_001, 002, 003, 004, 006, 008, 009, 010)
- All REPORT tests (PATH_REPORT_001-009)
- All API tests (PATH_API_001-003)
- Billing webhooks only (PATH_BILLING_003-007)
- API key management (PATH_KEYS_001-002)
- Health checks (PATH_HEALTH_001-002)
- CORS preflight (PATH_WIDGET_003)
- Tracking (PATH_TRACK_001)

### 2. **tests-manual.md** (16 test paths)
Manual tests requiring browser interaction and visual inspection.

**Characteristics:**
- Require navigating UI pages
- Involve user interactions (form submission, button clicks)
- Include visual regression checks
- Test OAuth provider integrations (Google/GitHub)
- Stripe billing UI interactions
- Email verification UI flow
- Account settings and deletion UI

**Included Tests:**
- OAuth sign-in (PATH_AUTH_005, 007)
- All ADMIN tests (PATH_ADMIN_001-002)
- All DASHBOARD tests (PATH_DASH_001-002)
- All SETTINGS tests (PATH_SETTINGS_001-003)
- Billing UI operations (PATH_BILLING_001, 002, 008, 009)
- Widget embeds (PATH_WIDGET_001-002)
- Static area SEO pages (PATH_AREAS_001)

## How to Run Tests

### Automated Tests
```bash
# Run with your test framework (Vitest, Jest, etc)
npm run test tests-automated.md

# Or parse and execute via curl for API tests
# Use the STEPS sections as test specifications
```

### Manual Tests
```bash
# Use as QA checklist
# Execute steps in each test case manually in browser
# Capture screenshots as EVIDENCE items
# Track completion in QA tracking system
```

## Test Distribution

| Category | Count | % |
|----------|-------|-----|
| Automated | 31 | 66% |
| Manual | 16 | 34% |
| **Total** | **47** | **100%** |

## Notes

- Tests are organized by module (AUTH, REPORT, API, BILLING, etc.)
- Each test includes TC01 (happy), TC02 (boundary), TC03 (failure), TC04 (alternative) where applicable
- EVIDENCE requirements are included for audit trails
- Automated tests can be parallelized for faster CI/CD execution
- Manual tests should be performed in staging environment before releases
