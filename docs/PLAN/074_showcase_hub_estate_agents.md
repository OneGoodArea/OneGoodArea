# 074 — Showcase repositioning: estate-agents demo, hub, ICP page

**Purpose:** Reframe the proptech showcase demo to estate agents, add a `/showcase` hub (one card per ICP), and ship a full `/for/estate-agents` marketing page. PropTech stays an ICP; its demo becomes a placeholder.

**Linked Jira:**
- Epic: AR-731
- Stories: AR-732 (migrate demo), AR-733 (placeholders/renames), AR-734 (hub), AR-735 (ICP page), AR-736 (ICP-set consistency), AR-737 (demo attribution)
- Tasks: AR-738…AR-757 (see per-story tables below)

**Dependency:** AR-711/712 (terminated-postcode 404, PR #497) is merged on `main` — migration must preserve the `apiError`/404 handling.

## High-Level Steps (by story / track)

### Track A — S1 Migrate demo (AR-732) → merge first
| Task | Change |
|---|---|
| AR-738 | `git mv` `showcase/proptech/page.tsx` → `showcase/estate-agents/page.tsx`; "Estate Agent Workflow" copy; keep `apiError` wiring |
| AR-739 | `lib/showcase/estate-agent-labels.ts` (moving→For sale, business→Lettings, investing→Investment, research→Reference); apply in `ShowcaseScoring`; unit test |
| AR-740 | `ShowcaseSignals.tsx:69` redirect → `/showcase/estate-agents?postcode=` |

### Track B — S2 Placeholders/renames (AR-733) → after S1 (AR-743 needs proptech route free)
| Task | Change |
|---|---|
| AR-741 | `git mv` `showcase/financing` → `showcase/lenders` (placeholder) |
| AR-742 | `git mv` `showcase/insurer` → `showcase/insurance` (placeholder) |
| AR-743 | New proptech placeholder page (WorkflowCard "coming soon") — after AR-738 merges |
| AR-744 | New `showcase/cre` + `showcase/public-sector` placeholders |

### Track C — S4 ICP page (AR-735) → merge before S5
| Task | Change |
|---|---|
| AR-747 | `for/estate-agents/page.tsx` server component: metadata + FAQ JSON-LD |
| AR-748 | `design-v2/for/estate-agents/client.tsx`: Hero/Showcase/Integration/Trust/FAQs/FinalCta |
| AR-749 | `design-v2/for/estate-agents/estate-agents.css` dedicated stylesheet |

### Track D — S5 Consistency (AR-736) → after S4 (nav link target must exist)
| Task | Change |
|---|---|
| AR-750 | `nav.tsx` SOLUTIONS + `EstateAgentsIcon` + `ICP_ICONS["estate-agents"]` |
| AR-751 | `built-for-section.tsx` estate-agents tab (`ready:true`) |
| AR-752 | contact form `ROLES` + estate agent |
| AR-753 | API `CONTACT_ROLES` + test |
| AR-754 | `USER_INTENTS` + `"estate-agents"` (contracts; `INTENT_WORKFLOW` untouched) |

### Track E — S6 Attribution (AR-737) — independent
| Task | Change |
|---|---|
| AR-755 | custom User-Agent from estate-agents demo (`lib/showcase/api.ts`) |
| AR-756 | `classifyClientApp(ua)` → `client_app: estate-agents` |
| AR-757 | classification unit tests |

### Track F — S3 Hub (AR-734) → last (needs S1+S2 routes)
| Task | Change |
|---|---|
| AR-745 | `/showcase` card grid: 6 ICPs, each with demo link (Live/Soon) + `/for/{icp}` link |
| AR-746 | `cta-section.tsx` CTA → `/showcase` |

## Git Workflow
- One worktree per story under `.worktrees/` (`.worktrees/` is gitignored); confirm before creating each.
- Branch per story: `feat/AR-732-showcase-demo-migration`, `feat/AR-733-showcase-placeholders`, `feat/AR-735-for-estate-agents`, `feat/AR-736-icp-consistency`, `feat/AR-737-demo-attribution`, `feat/AR-734-showcase-hub`.
- One commit per task, prefixed `AR-xxx:`. Authorship = driving human (`git config user.name/email` verified).
- PR per story: pre-formatted draft (title `AR-xxx <summary>`, test plan + reviewer checklist + rollback `git revert <sha>`).

## Verification (containers — docker)
- Every task: `make app-lint`, `make app-typecheck`.
- Web changes: `make web-test-container`. API changes: `make api-test-container`.
- Manual gate: NW1 8TQ (terminated) must render the 404 state on the migrated estate-agents demo (AR-712 regression).

## Merge Order
S1 (AR-732) → S2 (AR-733) → S4 (AR-735) → S5 (AR-736) → S3 (AR-734); S6 (AR-737) any time. Epic AR-731 closes last.

## Jira Workflow
- Task → `In Progress` (+ active sprint) at commit start; `Done` on merge.
- Story `Done` when all its tasks are `Done`.
- Epic AR-731 `Done` when all stories merged + plan doc renamed `_DONE_`.

## Risk / Rollback
- Route conflicts (proptech placeholder vs migration): mitigated by merge order; `git revert` per task commit if needed.
- UA classification regressions: covered by AR-757 regression tests.
- Engine weights and contracts `INTENT_WORKFLOW` are out of scope — no changes there.
