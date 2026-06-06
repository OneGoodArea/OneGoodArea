# AR-240 — &lt;CodeBlock&gt;

**Status:** Done
**Merged:** `50cbab3` via PR [#142](https://github.com/OneGoodArea/OneGoodArea/pull/142) on 2026-06-06
**Phase:** 0.5 (Foundation — 3rd of 8 promoted-from-deferred primitives)
**Branch (deleted post-merge):** `feat/AR-240-code-block`

## What shipped

The "Show the curl" pattern (Stripe + Linear convention named explicitly in the dashboard proposal) — full-width monospace block + line numbers + copy-to-clipboard + optional mono-caps header strip.

**Planned consumers (5+):**
- Every product playground (`/dashboard/signals`, `/dashboard/scores`, `/dashboard/intelligence`) — shows the equivalent curl for whatever query the user just composed
- The public `/playground` — prebaked curls per demo
- Webhooks signing-secret reveal-once flow — renders the secret as a CodeBlock for one-shot copy
- Settings + IP allowlist — config snippets

**Composition (`apps/web/src/app/design-v2/_shared/dashboard/code-block.tsx`):**

```ts
interface CodeBlockProps {
  code: string;
  language?: "bash" | "json" | "typescript";  // default "bash"
  header?: ReactNode;
  copyable?: boolean;                           // default true
  surface?: "light" | "dark";                   // default "light"
}
```

**Behaviour:**
- **Line numbers** zero-padded to 2 digits (`01`, `02`, `03`...) in muted mono
- **Copy button** top-right with `backdrop-filter: blur(4px)`, mono caps label that flips `"Copy"` → `"Copied"` for 1.5s on `navigator.clipboard.writeText` success
- **3 minimal grammars** (`bash`, `json`, `typescript`) implemented as per-language regex sets in `tokenize(line, language)`. No third-party syntax library — prismjs (~25kb) for 3 languages would be wasteful.
- **Tokens emit the canonical `.oga-code-panel__*` classes** from `styles/brand/components.css` per the Jira hard rule (single source of truth for syntax colour across marketing + dashboard surfaces)

**HTTP verb canonical colour map (the iteration moment):**

| Verb | Class | Colour token |
|---|---|---|
| `GET` | `.oga-verb--get` | `--oga-status-green` |
| `POST` | `.oga-verb--post` | `--oga-status-amber` |
| `PUT` | `.oga-verb--put` | `--oga-status-yellow` |
| `DELETE` | `.oga-verb--delete` | `--oga-status-red` |
| `PATCH` | `.oga-verb--patch` | `--oga-status-amber` |

Same vocabulary as the `/docs/api-reference` Surface Map. Auto-brightens on dark via the `data-oga-surface="dark"` attribute the primitive sets when `surface="dark"` — so the canonical brightening rules apply regardless of ancestor context.

**Brand v3 visual treatment:**
- **Light surface:** warm-white gradient (`#FFFFFF → #FAF8F4`) + edge-lit material recipe (matches `.oga-code-panel` on the homepage marketing surfaces)
- **Dark surface:** graphite gradient (`#1F2125 → #1A1C1F`) + dot-field motif anchored at top-right (14px grid, warm-white 0.10 opacity, radial-gradient ellipse mask) — same recipe as Sidebar + DataTable + EmptyState dark
- **Header strip:** optional mono caps at 0.14em letter-spacing matching `.oga-code-panel__header`
- **Body:** 13px Geist mono, 1.72 line-height, horizontal scroll on overflow
- **Custom thin scrollbar** matching DataTable + Sidebar (ink-palette on light, warm-white-tinted on dark)

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/code-block.tsx` (new, ~240 lines) — `CodeBlock` component + 3 grammars + shared regex runner helper
- `apps/web/src/app/design-v2/_shared/dashboard/code-block.css` (new, ~235 lines) — Container + header + body + line + num + copy + dark variant with dot-field motif
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` — Added `CodeBlockSection` (6 light variants) + `CodeBlockDarkSection` (3 dark variants), realistic API surfaces (M1 1AE postcode, engine v2.0.2, real endpoint paths)
- `apps/web/tests/unit/code-block.test.tsx` (new, ~140 lines) — 14 RTL component tests including the GET-vs-POST canonical-colour distinction check

## Decisions

- **Promoted from deferred — Phase 0.5 batch.** Originally one of 8 primitives deferred via extract-on-second-use per AR-211 convention. Re-evaluated 2026-06-06 (Pedro: "let's just do them") — the "Show the curl" pattern is the signature affordance across every product playground + the public `/playground` + the Webhooks reveal-once flow. Shipping upfront pays the consistency cost once instead of risking 5+ divergent inline implementations.
- **Container under new `.oga-code-block__*` namespace, tokens reuse existing `.oga-code-panel__*` classes.** The container is dashboard-namespaced (different visual treatment from the marketing-side `.oga-code-panel` — supports dark surface, copy button, no corner specimen ticks by default). The TOKEN classes are deliberately shared with `.oga-code-panel`: `__key / __str / __num-val / __punct / __comment / __fn`. Single source of truth for syntax tones across marketing + dashboard.
- **HTTP verbs use `.oga-verb--{verb}` not `.oga-code-panel__fn`.** First cut mapped every verb to the generic `__fn` class (all amber). Pedro pointed at the `/docs/api-reference` Surface Map where each verb has its own canonical colour. Rewired the bash tokenizer to emit `.oga-verb--{lowercase}` per verb. The `.oga-verb--{verb}` set already had dark-surface brightening built in (`#7AC295` for green, `#F0B270` for amber, etc.) so the primitive sets `data-oga-surface="dark"` on the container when `surface="dark"` and the brightening flows through.
- **No third-party syntax library.** prismjs / shiki / highlight.js all carry 20-50kb of grammar tables for languages we don't need. Three focused regex tokenisers are ~80 lines total and cover the dashboard's actual syntax surfaces (bash for curls, json for API responses, typescript for SDK examples). When a 4th language shows up, extract its tokenizer; don't bundle the full library.
- **Header is a `ReactNode` slot, not a structured `{path, meta, live}` object.** Consumers compose richer headers by passing a ReactNode (mono-caps path + green live dot + version meta — same composition pattern the homepage `.oga-code-panel` uses inline). Primitive stays focused on the code body + copy affordance.
- **Copy feedback timing (1.5s).** Long enough that fast-clicking users see the flip; short enough that the button can be hit again quickly. Matches Stripe + Linear default.
- **Quiet clipboard failures.** Older browsers + permission failures swallow silently — the code is still rendered, the user can still select + copy manually. No toast on failure (would be more annoying than helpful).
- **Realistic showcase content.** Every code snippet uses real API surfaces: M1 1AE postcode, engine v2.0.2, actual endpoint paths from the live API. Phase 2+ consumers can see exactly what their real product playground page will render.

## Tests

14 RTL component tests at `apps/web/tests/unit/code-block.test.tsx`:

1. Renders the code content split across lines (line count matches input)
2. Renders line numbers zero-padded to 2 digits (01, 02, 03...)
3. Renders the header when provided
4. Renders the copy button by default
5. Does NOT render the copy button when `copyable={false}`
6. Calls `navigator.clipboard.writeText` with the code when copy clicked
7. Flips copy button label to "Copied" after a successful copy
8. Applies dark surface variant via `data-surface` attribute
9. **Highlights HTTP verbs with the canonical `.oga-verb--{verb}` classes** (POST → `.oga-verb--post` with the shared `.oga-verb` base)
10. **GET vs POST distinction** — `.oga-verb--get` ONLY on GET; `.oga-verb--post` ONLY on POST (guards against cross-contamination)
11. Highlights JSON keys via `.oga-code-panel__key`
12. Highlights TypeScript keywords (`const`) via `.oga-code-panel__key`
13. Highlights JSON string values via `.oga-code-panel__str`
14. Highlights numeric values via `.oga-code-panel__num-val`

Mocks `navigator.clipboard` via `Object.assign(navigator, { clipboard: { writeText: vi.fn() } })` in `beforeEach`. Uses `act()` for state-mutating click handlers.

**Gates at merge:** typecheck clean · lint 0 errors (14 pre-existing warnings) · web tests **362/362** (was 348; +14 new) · CI all 7 checks green.

## Pedro's localhost approval

- Date: 2026-06-06
- Iteration cycles: 1
  1. **v1** — all HTTP verbs mapped to `.oga-code-panel__fn` (single amber). Pedro: *"go to api-reference and then section 1 surface map and you will see that get, post etc all have a colour ref"* — pointed at the canonical `.oga-verb--{verb}` palette
  2. **v2 (shipped)** — bash tokenizer rewired to emit `.oga-verb--get/post/put/delete/patch` per verb; container sets `data-oga-surface="dark"` on dark variant to flow through the brightening rules; added 2 dedicated showcase variants (light + dark) demonstrating the full colour map side-by-side. Pedro: *"okay perfect."*

## Production migration status

N/A — primitive ships ready-to-import. First downstream consumers:

- **Phase 2 (immediate after Phase 0.5 closes):** `/dashboard/signals` cross-area mode — "Show the curl" for the composed `rank_areas` query
- **Phase 2:** `/dashboard/scores` — equivalent curl for the score request
- **Phase 2:** `/dashboard/intelligence` — show the curl for the typed plan + the NL query alternative
- **Phase 2:** public `/playground` — prebaked curls
- **Phase 3:** Webhooks reveal-once flow — signing secret payload
- **Phase 4 Levers:** IP allowlist + API key example responses

## Process note

Merged with `gh pr merge --admin` per Pedro's standing delegation. 4 commits (work-log carry-forward + primitive + tests + showcase). Branch deleted on merge.

## Follow-ups

- **Diff highlighting** explicitly out of scope per the Jira ticket. If a consumer needs it (e.g. surfacing a methodology pin change as a diff), extract `<CodeDiff>` separately.
- **More grammars** (Python, Rust, Go) extract when a real consumer needs them. Same convention as canonical icons + AR-211 extract-on-second-use.
- **Inline code** (one-word `code` in a sentence) — use plain `<code>` tags. This primitive is for full-width blocks only.
- **AR-241 `<StatsCard>`** is next (4th of 8 Phase 0.5 primitives). Pedro is stopping after AR-240 — resumes when ready.
