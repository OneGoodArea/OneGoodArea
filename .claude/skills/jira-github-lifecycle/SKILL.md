---
name: jira-github-lifecycle
description: Use for Jira ticket management, branch linking, and PR generation — covers status transitions and PR draft formatting
---

# Jira & GitHub Lifecycle Management

## 1. Jira Linking Rules
- **If Jira exists:** Assign to executor and update status to `In Progress`.
- **If Jira is missing:** Create a new Jira issue, summarize the plan succinctly, assign it to executor, and update status to `In Progress`.
- **Sprint Rule:** Every in-progress Jira **MUST** be assigned to the current active Sprint.

## 2. Branch & Jira Linking
- **Implementation Branch:** PLANS cannot be changed, created in the main branch. They can live in the implementation branch. They must be kept updataded and once totally implemented they must be delat with in JIRA and their name must add _DONE_ as you can see in the local docs/PLAN directory

## 3. Status Transitions
- When planning starts → Jira status: `TO DO`.
- When implementation starts → Jira status: `In Progress`.
- When PR is opened → Link PR URL inside the Jira issue comments/fields.
- When Merge, transition JIRAS to Closed

## 4. PR Draft Generation (No `gh` / Token Access)
 - When implementation is complete, push the branch and **output a pre-formatted PR draft block** for the user to copy-paste into GitHub:

### Required Output Format:

**PR Title:** `AR-XXX brief summary`

```markdown
## Summary
<Concise changes explanation of>

## Linked Work
- **Jira:** AR-XXX
- **Related PRs:** N/A

## Test Plan (Obviously the checkmarks below are examples)
- [x] `npm run lint` cleaned locally
- [x] `npm run typecheck` cleaned locally
- [x] `npm test` passed locally
- [ ] `npm run build` succeeded
- [x] Manually verified in dev environment
- [ ] UI changes: N/A
- [ ] Schema changes: N/A
- [ ] Pricing/Quota: N/A

## Reviewer Checklist
- [x] Follows enterprise patterns (`generateId`, `logger`, `withAuth`, `config.ts`)
- [x] New utilities have corresponding tests
- [x] No invented quotas, tiers, prices, or copy claims
- [x] No em dashes (`—`) in user-facing copy
- [x] No raw `console.log` / `console.error` (used `logger`)
- [x] No AI model names ("Claude", "Anthropic") in user copy
- [x] Files under 500 lines

## Risk & Rollout
- **Risk Level:** Low
- **Rollout Strategy:** Immediate merge
- **Rollback Plan:** `git revert` (tell the exact command whenever possible)
