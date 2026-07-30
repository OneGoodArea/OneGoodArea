---
name: worktree-selection
description: Use when deciding between worktree or branch for isolated development — covers worktree creation protocol and location
---

# Git Worktree Selection Guide

To keep work isolated and prevent context-switching friction, evaluate change scope and parallelism.

## Worktree Location

Worktrees go in `.worktrees/<jira-key>-<short-description>` under the repo root (e.g. `.worktrees/AR-644-verify-email-proxy`).

## Decision Process

- Mostly suggest worktrees, unless it is a really small change, such as around 10 lines in no more than 3 files total, then you ask if worktree or branches. NEVER IN MAIN, EVER!
- Worktrees MUST be internal to the project and located at .worktrees (ensure they are in .gitignore)

## Mandatory Protocol
**Always ask the user for confirmation before creating a worktree or branch:**
> *"This change involves [large scope / parallel task]. Would you like me to set up a Git Worktree at `../<repo>-<jira-key>` or use a standard branch? If you already have parallel work going on I suggest a worktree"*
