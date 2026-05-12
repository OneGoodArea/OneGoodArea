<!--
  Title format: type(scope): description
  Examples:
    feat(billing): add MCP add-on confirmation panel
    fix(stripe): correct quota rollover at month boundary
    chore(ci): pin Node 20 and add build verification
  This becomes the squash-merge commit. Keep it short and specific.
-->

## Summary

<!-- 1-3 sentences. What does this PR do and why? -->

## Linked work

- Jira: AR-XXX
- Related PRs: #XX

## Test plan

- [ ] `npm run lint` clean locally
- [ ] `npm run typecheck` clean locally
- [ ] `npm test` passes
- [ ] `npm run build` succeeds (for changes that could affect the production bundle)
- [ ] Manually verified the change in dev
- [ ] UI changes: screenshots / screen recording attached
- [ ] Schema changes: migration tested on a fresh DB
- [ ] Pricing or quota changes: cross-checked against `src/lib/stripe.ts` PLANS

## Reviewer checklist

- [ ] Code follows enterprise patterns (`generateId`, `logger`, `withAuth`, `config.ts` constants)
- [ ] New utilities have tests
- [ ] No invented quotas, tiers, prices, or features in user-facing copy
- [ ] No em dashes (`—`) in user-facing copy
- [ ] No raw `console.log` / `console.error` (use `logger`)
- [ ] No "Claude" / "Anthropic" / model names in user-facing copy
- [ ] Files under 500 lines (or split rationale documented)

## Risk + rollout

<!--
  Breaking changes? Migrations? Feature flags? Dependencies on env vars?
  How do we roll back if this is wrong?
-->
