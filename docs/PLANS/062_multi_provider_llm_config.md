# Plan 062: Multi-Provider LLM Config

## Purpose

Replace the hardcoded single-provider (Anthropic) AI config with a multi-provider system supporting 3 strategies (round_robin, fallback_chain, list_pick), configurable retry, model variants, and per-provider runtime params. Promote `engine/ai/` to a standalone `modules/ai/` module.

## JIRA

- **Epic:** AR-611 — "Multi-provider LLM config system"
- **Backlog:** AR-610 — "Decide LLM rate limits: request-level, token-based, or both"

### Stories
| Story | Jira | Branch | Worktree |
|-------|------|--------|----------|
| S1 — Config Schema | AR-612 | `feat/AR-612-ai-config-schema` | `../OneGoodArea-AR-612-ai-config-schema` |
| S2 — Config Values | AR-613 | `feat/AR-613-ai-config-values` | `../OneGoodArea-AR-613-ai-config-values` |
| S3 — Honour Config | AR-614 | `feat/AR-614-honour-ai-config` | `../OneGoodArea-AR-614-honour-ai-config` |
| S4 — Cleanup | AR-615 | `feat/AR-615-cleanup-ai-config` | `../OneGoodArea-AR-615-cleanup-ai-config` |
| S5 — Promote Module | AR-616 | `feat/AR-616-promote-ai-module` | `../OneGoodArea-AR-616-promote-ai-module` |
| S6 — Docker Test | AR-617 | `feat/AR-617-ai-config-docker-test` | `../OneGoodArea-AR-617-ai-config-docker-test` |

## Architecture

**Current flow:**
```
decideLlm(tier) → { provider: "anthropic", model: "claude-sonnet-4-5" }
  → getAiProviderForTier(tier) → new AnthropicAiProvider(model)
```

**New flow:**
```
decideLlm(tier) → { strategy, providers[], retryCount }
  → provider-factory picks provider based on strategy
  → new AnthropicAiProvider / DeepseekAiProvider / etc.(model, params)
```

**Key decisions:**
- Config values (models, strategies, retry counts) are hardcoded in `modules/ai/config.ts`
- API keys are **env vars** (secrets): `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`, `OPENCODE_API_KEY`
- `decideLlm()` in `tiers/index.ts` returns full strategy config (replaces `LlmRoute`)
- `DEFAULT_TIERS.llm` field removed — strategy config replaces it
- LLM rate limits stay in `tiers/index.ts` as `quota: { max, windowSeconds }` per tier (request-level only for now)
- Zod schemas in `modules/ai/config.ts` — API only, not exposed to web/playground
- OpenRouter handles intra-provider load balancing natively; our strategy engine handles inter-provider routing

### Environment Variables

| Env Var | Provider | Required | Notes |
|---------|----------|----------|-------|
| `ANTHROPIC_API_KEY` | anthropic | Yes | Already exists in `infrastructure/config` |
| `DEEPSEEK_API_KEY` | deepseek | Yes | New |
| `OPENROUTER_API_KEY` | openrouter | Yes | New |
| `OPENCODE_API_KEY` | opencode | Yes | New |

Provider factory reads API keys from `process.env` directly (not from `getConfig()`). Each provider throws on instantiation if its key is missing. The config in `modules/ai/config.ts` does NOT contain secrets.

## Providers

| Provider | SDK | API Endpoint | Env Var | Status |
|----------|-----|-------------|---------|--------|
| `anthropic` | `@anthropic-ai/sdk` | `api.anthropic.com` | `ANTHROPIC_API_KEY` | Existing |
| `deepseek` | OpenAI-compatible | `api.deepseek.com` | `DEEPSEEK_API_KEY` | **New** |
| `openrouter` | OpenAI-compatible | `openrouter.ai/api/v1` | `OPENROUTER_API_KEY` | **New** |
| `opencode` | OpenAI-compatible | `opencode.ai/zen/v1/chat/completions` | `OPENCODE_API_KEY` | **New** |
| `mock` | Built-in | — | — | Test only |

**OpenCode Zen free models:** `deepseek-v4-flash-free`, `mimo-v2.5-free`, `laguna-s-2.1-free`, `ling-3.0-flash-free`, `north-mini-code-free`, `nemotron-3-ultra-free`, `big-pickle`

**DeepSeek models (avoid deprecated):** `deepseek-v4-flash`, `deepseek-v4-pro` (NOT `deepseek-chat` or `deepseek-reasoner`)

## Container & Deployment

**No Containerfile changes needed** — env vars are injected at runtime by the orchestrator (Render, Cloud Run, Koyeb).

**Local compose (`compose/compose.yml`):**
- Uses `OGA_AI_PROVIDER: mock` → will be removed in S4 (cleanup)
- Mock provider doesn't need API keys, so no new env vars needed in compose for local dev
- Production: API keys set via hosting platform's env var dashboard

**Env files:**
- `.env.local` — remove `OGA_AI_PROVIDER=mock` in S4
- `.env.local.test.secrets.example` — add `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`, `OPENCODE_API_KEY` placeholders in S4
- `.env.test.local` — add mock key values for test suite in S4
- `compose/compose.test.yml` — remove `OGA_AI_PROVIDER: mock` in S4

## Config Template (hardcoded, no env var)

```ts
const DEFAULT_AI_CONFIG: AiConfig = {
  aiRetryCount: 1,
  strategies: {
    anonymous: {
      strategy: "fallback_chain",
      providers: [
        { provider: "opencode", model: "deepseek-v4-flash-free" },
        { provider: "openrouter", model: "deepseek/deepseek-chat-v3-0324:free" },
      ],
    },
    logged_in: {
      strategy: "fallback_chain",
      providers: [
        { provider: "opencode", model: "deepseek-v4-flash-free" },
        { provider: "openrouter", model: "deepseek/deepseek-chat-v3-0324:free" },
      ],
    },
    basic: {
      strategy: "fallback_chain",
      providers: [
        { provider: "opencode", model: "deepseek-v4-flash-free" },
        { provider: "openrouter", model: "deepseek/deepseek-chat-v3-0324:free" },
        { provider: "deepseek", model: "deepseek-v4-flash" },
      ],
    },
    high_tier: {
      strategy: "fallback_chain",
      providers: [
        { provider: "deepseek", model: "deepseek-v4-pro" },
        { provider: "deepseek", model: "deepseek-v4-flash" },
        { provider: "anthropic", model: "claude-sonnet-4-5", params: { max_tokens: 8192 } },
        { provider: "anthropic", model: "claude-haiku-4-5", params: { max_tokens: 4096 } },
        { provider: "opencode", model: "deepseek-v4-flash-free" },
        { provider: "openrouter", model: "deepseek/deepseek-chat-v3-0324:free" },
        { provider: "anthropic", model: "claude-opus-4-6", params: { max_tokens: 8192 } },
      ],
    },
    engineering: {
      strategy: "fallback_chain",
      providers: [
        { provider: "anthropic", model: "claude-opus-4-6", params: { max_tokens: 8192 } },
      ],
    },
    superuser: {
      strategy: "fallback_chain",
      providers: [
        { provider: "anthropic", model: "claude-sonnet-4-5", params: { max_tokens: 8192 } },
        { provider: "deepseek", model: "deepseek-v4-pro" },
        { provider: "anthropic", model: "claude-opus-4-6", params: { max_tokens: 8192 } },
        { provider: "deepseek", model: "deepseek-v4-flash" },
        { provider: "anthropic", model: "claude-haiku-4-5", params: { max_tokens: 4096 } },
        { provider: "opencode", model: "deepseek-v4-flash-free" },
        { provider: "openrouter", model: "deepseek/deepseek-chat-v3-0324:free" },
      ],
    },
  },
};
```

**NOTE:** OpenRouter free model ID needs confirmation. Replace `deepseek/deepseek-chat-v3-0324:free` with the correct ID.

## Stories

### S1 — Config Schema + Zod Validation
**Jira:** AR-612 | **Branch:** `feat/AR-612-ai-config-schema` | **Worktree:** `../OneGoodArea-AR-612-ai-config-schema`

**Files:**
- `modules/ai/types.ts` — expand from 3 lines to full type definitions
- `modules/ai/config.ts` — NEW: Zod schemas, `DEFAULT_AI_CONFIG`, `loadAiConfig()`, `getAiConfig()`
- `tests/modules/ai/config.test.ts` — NEW: unit tests

**Types:**
```ts
interface AiProviderEntry {
  provider: string;
  model: string;
  params?: Record<string, unknown>;
}

type AiStrategy = "round_robin" | "fallback_chain" | "list_pick";

interface AiStrategyConfig {
  strategy: AiStrategy;
  providers: AiProviderEntry[];
}

interface AiConfig {
  aiRetryCount: number;
  strategies: Record<Tier, AiStrategyConfig>;
}
```

**Tests:** valid config, missing providers → defaults, unknown strategy → error, params passthrough, retry defaults to 1

### S2 — Config Values
**Jira:** AR-613 | **Branch:** `feat/AR-613-ai-config-values` | **Worktree:** `../OneGoodArea-AR-613-ai-config-values`

**Files:**
- `modules/ai/config.ts` — populate `DEFAULT_AI_CONFIG` with real providers
- `tests/modules/ai/config.test.ts` — update tests for real config shape

### S3 — Honour Config
**Jira:** AR-614 | **Branch:** `feat/AR-614-honour-ai-config` | **Worktree:** `../OneGoodArea-AR-614-honour-ai-config`

**Files:**
- `modules/ai/provider-factory.ts` — strategy engine (round_robin, fallback_chain, list_pick)
- `modules/ai/deepseek-provider.ts` — NEW: OpenAI-compatible provider for DeepSeek
- `modules/ai/openrouter-provider.ts` — NEW: OpenAI-compatible provider for OpenRouter
- `modules/ai/opencode-provider.ts` — NEW: OpenAI-compatible provider for OpenCode Zen
- `modules/ai/anthropic-provider.ts` — update to accept `params`
- `modules/tiers/index.ts` — update `decideLlm()` to return full strategy config, remove `DEFAULT_TIERS.llm`
- `tests/modules/ai/provider-factory.test.ts` — NEW: strategy behavior, retry, provider instantiation

**Strategy behavior:**
- `round_robin`: rotates across calls, retries on error (up to `aiRetryCount`)
- `fallback_chain`: always starts at index 0, falls through on error
- `list_pick`: always uses index 0, no fallback

### S4 — Cleanup
**Jira:** AR-615 | **Branch:** `feat/AR-615-cleanup-ai-config` | **Worktree:** `../OneGoodArea-AR-615-cleanup-ai-config`

**Files:**
- `infrastructure/config/index.ts` — remove `aiProvider`, `anthropicApiKey`, `anthropicModel`
- `modules/ai/provider-factory.ts` — remove `getAiProvider()` legacy factory
- `CLAUDE.md` — update env var docs
- `tests/` — update any tests referencing removed env vars

### S5 — Promote AI Module
**Jira:** AR-616 | **Branch:** `feat/AR-616-promote-ai-module` | **Worktree:** `../OneGoodArea-AR-616-promote-ai-module`

**Move:** `modules/engine/ai/` → `modules/ai/`

**Rename:**
| Old | New |
|-----|-----|
| `index.ts` | `provider-factory.ts` |
| `types.ts` | `types.ts` |
| `anthropic-provider.ts` | `anthropic-provider.ts` |
| `mock-provider.ts` | `mock-provider.ts` |
| — | `config.ts` (from S1) |
| — | `deepseek-provider.ts` (from S3) |
| — | `openrouter-provider.ts` (from S3) |
| — | `opencode-provider.ts` (from S3) |

**Update imports:**
```
intelligence/eval/run.ts     → "../../ai/provider-factory"
intelligence/planner.ts      → "../ai/types"
intelligence/index.ts        → "../ai/provider-factory"
```

**Move tests:** `tests/modules/engine/ai/` → `tests/modules/ai/`

### S6 — Docker Test
**Jira:** AR-617 | **Branch:** `feat/AR-617-ai-config-docker-test` | **Worktree:** `../OneGoodArea-AR-617-ai-config-docker-test`

**Verification:**
- `make test-unit` passes
- `make test-e2e` passes with mock provider
- Integration test with real provider (if API keys available)
