---
name: git-standards
description: Use for commit rules and branch protection — defines branch protection rules and commit message format
---

# Git & Change Management Standards

## Branch Protection
- **`main` / `master` are locked.** Never edit or push directly to them.

## Commit Rules
1. Every logical change must be a separate, small commit.
2. Production code (`src/`) and test code (`test/`) updates should be committed in clean, reviewable units.
3. Message format: Short, imperative sentence describing intent.
   - **Good:** `Add validation for missing workspace config`
   - **Bad:** `fix stuff`, `wip updates`
