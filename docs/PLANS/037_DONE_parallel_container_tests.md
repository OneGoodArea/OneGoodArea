# Plan 037: Formalize Parallel Container Test Execution

## JIRA
- **Key:** AR-434 (linked to existing issue)
- **Status:** Done

## Objective
Formalize parallel test execution in `build/targets-services.mk` by adding a `make test-all-container` target that runs both API and web tests with isolated project names.

## Problem
Currently, `api-test-container` and `web-test-container` both use `--project-name oga-test`, causing container name collisions when run in parallel. Users must run them sequentially.

## Solution
Add a new target `test-all-container` that:
1. Runs API and web tests sequentially with different `--project-name` values
2. Uses `--project-name oga-test-api` for API tests
3. Uses `--project-name oga-test-web` for web tests
4. Captures exit codes from both test suites
5. Returns failure if either test suite fails

## Implementation Steps

### Step 1: Add test target to `build/targets-services.mk`
- Add new target `test-all-container`
- Use `--project-name oga-test-api` for API tests
- Use `--project-name oga-test-web` for web tests
- Run tests sequentially to ensure proper cleanup
- Check exit codes and return failure if any test fails

### Step 2: Update `build/help.mk`
- Help text automatically generated via regex pattern `^[a-z]+-[a-z-]*container:.*## `

### Step 3: Test the implementation
- Run `make test-all-container BUILD_FLAG_TEST=--build`
- Verify both test suites run with isolated projects
- Verify proper cleanup and exit code handling

## Files Modified
- `build/targets-services.mk` - Added new target

## Success Criteria
- `make test-all-container` runs both API and web tests with isolated projects
- No container name collisions
- Proper cleanup of all containers
- Exit code reflects test results (0 = all pass, non-zero = any failure)