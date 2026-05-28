# Plan 009: Persistent PostgreSQL Container & In-Process Data Access Layer (DAL)

## 1. JIRA Integration

* **JIRA Ticket Key:** `AR-201`
* **JIRA Epic:** `Local Development & Security Parity`
* **JIRA Title:** `AR-201: Setup Persistent Postgres Container and In-Process Data Access Layer (DAL) in Standalone API`
* **JIRA Status:** `In Progress`
* **JIRA Description:** Create a persistent, multi-platform, SELinux-compatible Postgres container and an in-process Data Access Layer (DAL) in `apps/api` to isolate database access from HTTP clients.
* **Link to Plan:** [plan/009_postgres_container_and_dal_plan.md](file:///home/perez/projetos/OneGoodArea/plan/009_postgres_container_and_dal_plan.md)
* **Target Branch:** `feat/AR-201-postgres-dal-setup`

---

## 2. Architectural Design & Boundaries

To prevent database access from ever being exposed to external clients (e.g., browsers, Next.js frontend, curl, or Postman), we enforce a strict **Three-Tier Architecture** inside `apps/api`.

### Boundary Enforcements
* **HTTP / Presentation Boundary (Fastify):** Only exposes specific business-workflow endpoints (e.g., `POST /v1/report`, `GET /v1/area`). Handles HTTP status codes, headers, and authentication.
* **Service / Business Logic Boundary:** Orchestrates core business workflows (e.g., compiling scoring weights, narrating signals). 
* **Data Access Boundary (DAL):** The **sole custodian of SQL query execution**. It has no awareness of HTTP protocols (cannot access headers, cookies, or Fastify context). **It is completely non-routed**—no REST endpoints are ever defined for it.

```
       [ External Callers (Next.js, Postman, Curl) ]
                            │
                            ▼ (HTTP Requests)
 ┌──────────────────────────────────────────────────────┐
 │               Presentation Boundary                  │
 │      (Fastify Controllers & Auth Verification)       │
 └──────────────────────────┬───────────────────────────┘
                            │
                            ▼ (In-Process TypeScript Call)
 ┌──────────────────────────────────────────────────────┐
 │              Business Logic Boundary                 │
 │            (Scoring Engine, AI Planner)              │
 └──────────────────────────┬───────────────────────────┘
                            │
                            ▼ (In-Process Repository Call)
 ┌──────────────────────────────────────────────────────┐
 │               Data Access Layer (DAL)                │
 │       (Repository Classes / Raw Query Managers)      │
 └──────────────────────────┬───────────────────────────┘
                            │
                            ▼ (Postgres Protocol)
 ┌──────────────────────────────────────────────────────┐
 │                 PostgreSQL Container                 │
 │                  (Persisted Volume)                  │
 └──────────────────────────────────────────────────────┘
```

---

## 3. Data Access Layer (DAL) Interface Design

We will introduce a clean, SOLID-compliant repository structure in `apps/api/src/infrastructure/db/dal`. 

### Repository Structure
Instead of scattered, inline raw SQL queries across the application, queries are organized into Domain Repositories:
* `UserRepository`: Handles retrieval, registration, and status of user entities.
* `ApiKeyRepository`: Handles generation, hashing, display previews, and validation of API keys.
* `OrgRepository`: Handles organization CRUD and tenant mapping.

### DAL Context & Client Encapsulation
The DAL encapsulates the Neon / Postgres client instance in a clean, typed interface:

```typescript
// apps/api/src/infrastructure/db/dal/repositories/user-repository.ts
import { sql } from "../../client";
import { type UserRow } from "../../types";

export interface IUserRepository {
  findById(id: string): Promise<UserRow | null>;
  findByEmail(email: string): Promise<UserRow | null>;
  create(user: Omit<UserRow, "created_at">): Promise<UserRow>;
}

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<UserRow | null> {
    const result = await sql<UserRow[]>`
      SELECT * FROM users WHERE id = ${id} LIMIT 1
    `;
    return result[0] ?? null;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await sql<UserRow[]>`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `;
    return result[0] ?? null;
  }

  async create(user: Omit<UserRow, "created_at">): Promise<UserRow> {
    const result = await sql<UserRow[]>`
      INSERT INTO users (id, email, name, provider, email_verified)
      VALUES (${user.id}, ${user.email}, ${user.name}, ${user.provider}, ${user.email_verified})
      RETURNING *
    `;
    return result[0];
  }
}
```

### Direct-Access Guard (Zero HTTP Route Policy)
To strictly enforce that the DAL cannot be reached externally:
1. **No routes mapped:** The `dal/` folder only exports classes and TS interfaces. No Fastify route plugin files are created here.
2. **Internal-only imports:** Repositories can only be imported in-process by internal Fastify service boundaries.

---

## 4. Persistent & SELinux-Compatible Container Setup

We will configure a persistent PostgreSQL container that runs across macOS, Windows, and Linux (Docker or Podman) and shares the same bridge network `oga-network` with the API container.

### Volume Configuration
* **Named Volume (`oga-postgres-data`):** Used for `/var/lib/postgresql/data`. Safe and fully SELinux-compatible on Linux (Podman manages security labels automatically).
* **Bind Mount (`:z` flag):** Host directory binds (like mounting the initialization SQL folder) use the `:z` flag to instruct Podman on Linux to relabel directories for shared container access.

---

## 5. Makefile Targets

We will add the following targets to coordinate database lifecycle, seeding, and network bindings:

```makefile
# Variables
DB_IMG     ?= postgres:16-alpine
DB_NAME    ?= oga-postgres
DB_PORT    ?= 55432
DB_VOL     ?= oga-postgres-data
NET_NAME   ?= oga-network

# Ensure bridge network exists
db-net:
	@docker network inspect $(NET_NAME) >/dev/null 2>&1 || docker network create $(NET_NAME)

# Ensure persistent volume exists
db-vol:
	@docker volume inspect $(DB_VOL) >/dev/null 2>&1 || docker volume create $(DB_VOL)

# Spin up Postgres on the shared network with persistent storage and SELinux relabeling
db-run: db-net db-vol
	docker run -d \
		--name $(DB_NAME) \
		--network $(NET_NAME) \
		--network-alias postgres \
		-p $(DB_PORT):5432 \
		-e POSTGRES_DB=oga_local \
		-e POSTGRES_USER=oga_user \
		-e POSTGRES_PASSWORD=oga_test_password_local \
		-v $(DB_VOL):/var/lib/postgresql/data \
		-v $(PWD)/apps/web/tests/db/bootstrap:/docker-entrypoint-initdb.d:z \
		--restart unless-stopped \
		$(DB_IMG)
	@echo "Waiting for database to accept connections..."
	@until docker exec $(DB_NAME) pg_isready -U oga_user -d oga_local >/dev/null 2>&1; do sleep 1; done
	@echo "Database is ready on port $(DB_PORT)"

# Stop database container (persisted data is safe in $(DB_VOL))
db-stop:
	-docker stop $(DB_NAME)
	-docker rm $(DB_NAME)

# Destroy database volume for a clean reset
db-clean: db-stop
	-docker volume rm $(DB_VOL)

# Inject baseline users seed directly
db-seed:
	docker exec -i $(DB_NAME) psql -U oga_user -d oga_local < $(PWD)/apps/web/tests/seeds/profiles/baseline/100-baseline-users.sql
	@echo "Baseline seeds successfully applied!"
```

---

## 6. Single-Branch Implementation Plan

To ensure all updates land cleanly, the work will be completed in incremental, reviewable commits on a single branch: `feat/AR-201-postgres-dal-setup`.

### Implementation Sequence:
1. **Commit 1: Setup Postgres Container and Makefile Integration**
   * Update the `Makefile` with the new database targets and network configurations.
   * Update `api-run` to join the common `oga-network` network.
2. **Commit 2: Data Access Layer (DAL) Structure & Repository Implementation**
   * Create `apps/api/src/infrastructure/db/dal` and implement repository abstractions.
3. **Commit 3: Refactor Modules to use DAL Repositories**
   * Replace raw database calls in the backend modules (like `api-keys`) to utilize the new repositories.
4. **Commit 4: Verification and Final Testing**
   * Spin up container services, apply seeds, and run test verification.
