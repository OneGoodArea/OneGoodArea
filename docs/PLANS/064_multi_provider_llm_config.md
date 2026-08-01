# Plan 064: Multi-Provider LLM Config

## Purpose

Replace the hardcoded single-provider (Anthropic) AI config with a multi-provider system supporting 3 strategies (round_robin, fallback_chain, list_pick), configurable retry, model variants, and per-provider runtime params. Promote `engine/ai/` to standalone `modules/ai/`.

## JIRA

- **Epic:** AR-611 — "Multi-provider LLM config system"
- **Out of scope (deferred):** AR-609 (BYOK), AR-610 (rate limits decision)

### Stories
| # | Story | Jira | Worktree | Phase |
|---|-------|------|----------|-------|
| S1+S2 | Config schema + values | AR-612, AR-613 | `.worktrees/AR-612-ai-config-schema-values` | 1 |
| S5 | Module promotion + new providers | AR-616 | `.worktrees/AR-616-promote-ai-module` | 2a |
| S3 | Wire up config in code | AR-614 | `.worktrees/AR-614-honour-ai-config` | 2b | ✅ done |
| S4 | Cleanup old config | AR-615 | `.worktrees/AR-615-cleanup-ai-config` | 3a | ✅ done |
| S6 | Docker integration test | AR-617 | `.worktrees/AR-617-ai-config-docker-test` | 3b | |

## Architecture

**New flow:**
```
decideLlm(tier) → { strategy, providers[], retryCount }
  → provider-factory picks provider based on strategy
  → new AnthropicAiProvider / DeepSeekAiProvider / etc.(model, params)
```

**Key decisions:**
- Config values (models, strategies, retry counts) hardcoded in `modules/ai/config.ts`
- API keys are process.env: ANTHROPIC_API_KEY, DEEPSEEK_API_KEY, OPENROUTER_API_KEY, OPENCODE_API_KEY
- `decideLlm()` returns strategy config (replaces `LlmRoute`)
- `DEFAULT_TIERS.llm` removed — replaced by strategy config
- Zod schemas in `modules/ai/config.ts` — API only, not web/playground
- All providers OpenAI-compatible (Anthropic via SDK, DeepSeek/OpenRouter/OpenCode via fetch)

## Execution Plan

### Phase 1 — Worktree 1: AR-612+613 (Config schema + values)
**Branch:** `feat/AR-612-ai-config-schema-values`
**Depends on:** nothing

Commits:
1. `feat(ai): add multi-provider types (AR-612)` — AiProviderEntry, AiStrategy, AiStrategyConfig, AiConfig
2. `feat(ai): add Zod schemas for AI config (AR-612)` — loadAiConfig(), getAiConfig()
3. `feat(ai): populate config with real provider values per tier (AR-613)`
4. `test(ai): add unit tests for config schema + values (AR-612, AR-613)`

### Phase 2a — Worktree 2: AR-616 (Module promotion + new providers)
**Branch:** `feat/AR-616-promote-ai-module`
**Depends on:** Phase 1 merged

Commits:
1. `refactor(ai): move engine/ai/ to modules/ai/ (AR-616)`
2. `feat(ai): rename index.ts to provider-factory.ts (AR-616)`
3. `feat(ai): add openrouter and opencode providers (AR-616)`
4. `refactor(ai): update all imports in intelligence/ and tests (AR-616)`

### Phase 2b — Worktree 3: AR-614 (Wire up config)
**Branch:** `feat/AR-614-honour-ai-config`
**Depends on:** Phase 1 merged (can run in parallel with Phase 2a)

Commits:
1. `feat(tiers): update decideLlm() to return strategy config (AR-614)`
2. `feat(ai): implement strategy engine with round-robin/fallback-chain/list-pick (AR-614)`
3. `refactor(ai): pass provider params through to SDK instantiation (AR-614)`
4. `test(ai): add provider-factory strategy tests (AR-614)`

### Phase 3a — Worktree 4: AR-615 (Cleanup old config) ✅ DONE
**Branch:** `feat/AR-615-cleanup-ai-config` (merged via PR #450)
**Depends on:** Phase 2b merged

Commits:
1. `refactor(config): remove aiProvider/anthropicModel from infrastructure/config (AR-615)`
2. `chore(env): update env files — remove OGA_AI_PROVIDER, add new API key placeholders (AR-615)`
3. `refactor(ai): remove legacy getAiProvider() from provider-factory (AR-615)`

### Phase 3b — Worktree 5: AR-617 (Docker integration test)
**Branch:** `feat/AR-617-ai-config-docker-test`
**Depends on:** Phase 2b merged (can run in parallel with Phase 3a)

Commits:
1. `test(ai): add container integration test for multi-provider config (AR-617)`

## Providers

| Provider | SDK | Env Var | Status |
|----------|-----|---------|--------|
| `anthropic` | `@anthropic-ai/sdk` | `ANTHROPIC_API_KEY` | Existing |
| `deepseek` | OpenAI-compatible (fetch) | `DEEPSEEK_API_KEY` | Existing |
| `openrouter` | OpenAI-compatible (fetch) | `OPENROUTER_API_KEY` | New |
| `opencode` | OpenAI-compatible (fetch) | `OPENCODE_API_KEY` | New |
| `mock` | Built-in | — | Test only |

## Config Template

```ts
const DEFAULT_AI_CONFIG: AiConfig = {
  aiRetryCount: 1,
  strategies: {
    anonymous:   { strategy: "fallback_chain", providers: [{provider:"opencode", model:"deepseek-v4-flash-free"}, {provider:"openrouter", model:"deepseek/deepseek-chat-v3-0324:free"}] },
    logged_in:   { strategy: "fallback_chain", providers: [{provider:"opencode", model:"deepseek-v4-flash-free"}, {provider:"openrouter", model:"deepseek/deepseek-chat-v3-0324:free"}] },
    basic:       { strategy: "fallback_chain", providers: [{provider:"opencode", model:"deepseek-v4-flash-free"}, {provider:"openrouter", model:"deepseek/deepseek-chat-v3-0324:free"}, {provider:"deepseek", model:"deepseek-v4-flash"}] },
    high_tier:   { strategy: "fallback_chain", providers: [{provider:"deepseek", model:"deepseek-v4-pro"}, {provider:"deepseek", model:"deepseek-v4-flash"}, {provider:"anthropic", model:"claude-sonnet-4-5", params:{max_tokens:8192}}, {provider:"anthropic", model:"claude-haiku-4-5", params:{max_tokens:4096}}, {provider:"opencode", model:"deepseek-v4-flash-free"}, {provider:"openrouter", model:"deepseek/deepseek-chat-v3-0324:free"}, {provider:"anthropic", model:"claude-opus-4-6", params:{max_tokens:8192}}] },
    engineering: { strategy: "fallback_chain", providers: [{provider:"anthropic", model:"claude-opus-4-6", params:{max_tokens:8192}}] },
    superuser:   { strategy: "fallback_chain", providers: [{provider:"anthropic", model:"claude-sonnet-4-5", params:{max_tokens:8192}}, {provider:"deepseek", model:"deepseek-v4-pro"}, {provider:"anthropic", model:"claude-opus-4-6", params:{max_tokens:8192}}, {provider:"deepseek", model:"deepseek-v4-flash"}, {provider:"anthropic", model:"claude-haiku-4-5", params:{max_tokens:4096}}, {provider:"opencode", model:"deepseek-v4-flash-free"}, {provider:"openrouter", model:"deepseek/deepseek-chat-v3-0324:free"}] },
  },
};
```

## Verification

Each worktree must pass before merge:
- `make app-lint` — host static analysis
- `make app-typecheck` — host type check
- `make api-test-container` — container-based unit/integration tests
