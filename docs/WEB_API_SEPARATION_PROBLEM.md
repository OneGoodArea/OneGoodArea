# Problem: Direct Database Access from Web Layer

## Overview

The web layer (`apps/web`) currently has **direct access to PostgreSQL**, bypassing the API layer entirely. This violates the three-tier architecture defined in Plan 009 and creates security, scalability, and maintainability issues.

---

## Current Architecture (Wrong)

```
Web Routes (apps/web/src/app/api/)
    ↓ Imports from
Web Lib Functions (apps/web/src/lib/*.ts)
    ↓ Direct SQL via neon() client
PostgreSQL Database
```

**Problem:** Database credentials must be exposed in the frontend environment.

---

## Affected Files

7 files in `/apps/web/src/lib/` make direct SQL queries:

| File | Functions | Lines |
|------|-----------|-------|
| `db.ts` | Direct Neon client | ~26 |
| `api-keys.ts` | validateApiKey, createApiKey, etc. | ~100 |
| `auth.ts` | User signup/signin | ~150 |
| `activity.ts` | trackEvent, getAnalytics | ~100 |
| `usage.ts` | getUserPlan, hasApiAccess, etc. | ~120 |
| `webhooks.ts` | fireWebhookEvent, etc. | ~80 |
| `rate-limit.ts` | rateLimit, rate-limiting logic | ~60 |
| `idempotency.ts` | withIdempotency, caching | ~50 |

**Total:** ~450+ lines of direct SQL in web layer

---

## Why This Is a Problem

### 1. Security Issues
- **DATABASE_URL exposed:** Must be available as environment variable to Next.js
- **SQL visible in network traffic:** Raw queries can be inspected
- **No centralized validation:** Each function implements its own security checks
- **Audit trail scattered:** Activity logging is distributed

### 2. Scalability Issues
- **Web can't scale independently:** Requires direct database access
- **Can't use read replicas:** Complex connection pooling needed
- **Harder to add new frontends:** Each frontend needs DB credentials
- **Schema changes affect frontend:** Web layer tightly coupled to database schema

### 3. Maintainability Issues
- **Duplicate code:** Same functions exist in web and API
- **Risk of divergence:** Changes must be synchronized in multiple places
- **Inconsistent implementations:** Web and API may have different business logic
- **Testing complexity:** Web tests require direct DB access

### 4. Architectural Violation
- Plan 009 defines three-tier architecture:
  - HTTP/Presentation layer (Fastify routes)
  - Business logic layer (services)
  - Data Access layer (repositories)
- Web layer bypasses this entire structure and accesses DB directly

---

## Solution: API-First Architecture

Move all database access to the API layer.

```
Web Routes (apps/web/src/app/api/)
    ↓ HTTP Fetch Calls
API Endpoints (apps/api/src/app.ts)
    ↓ In-Process Method Calls
Repositories/DAL (apps/api/src/infrastructure/db/dal/)
    ↓ Parameterized SQL
PostgreSQL Database
```

**Result:**
- ✓ Single source of truth (API owns all DB access)
- ✓ No DATABASE_URL in web environment
- ✓ Web becomes a stateless HTTP client
- ✓ Easier to scale, test, and maintain

---

## Implementation

See `plan/010_web_api_migration_ar203.md` for detailed implementation plan:
- 10 commits across 3 phases
- 7-11 hours of development
- Complete step-by-step instructions

---

## References

- **Plan 009:** PostgreSQL container + DAL implementation
- **Plan 010:** Web-to-API migration (this fix)
- **CLAUDE.md:** Architecture and coding rules
