# Separate MCP test files from production code

**JIRA:** [AR-434](https://podnex.atlassian.net/browse/AR-434)
**Status:** DONE

## Problem

Test files (`.test.ts`) are co-located inside `mcp/src/tools/` alongside production code, violating:
> "Production code and test code NEVER sits at the same directory. There is always a src/ and a companion test/"

## Scope

11 test files in `mcp/src/tools/` mixed with 15 production files.

## Steps

### Step 1: Create test directory structure
- Create `mcp/test/tools/` directory

### Step 2: Move test files
- Move all 11 `.test.ts` files from `mcp/src/tools/` to `mcp/test/tools/`

### Step 3: Update import paths
Each test file has relative imports that need updating:
- `./area-brief.js` → `../../src/tools/area-brief.js`
- `../api-client.js` → `../../src/api-client.js`
- `./area-brief-audiences.js` → `../../src/tools/area-brief-audiences.js`

### Step 4: Verify vitest configuration
- Ensure vitest discovers tests in `mcp/test/` (may need `vitest.config.ts` or `include` pattern)
- Run `npm test` in `mcp/` to confirm all 11 test files pass

### Step 5: Branch & commit
- Create branch `AR-434-MCP-Test-Split`
- Commit changes with descriptive message
