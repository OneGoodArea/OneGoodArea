# Git Worktree Selection Guide

To keep work isolated and prevent context-switching friction, evaluate change scope and parallelism.

## Decision Matrix

| Factor | Standard Branch (`git checkout -b`) | Git Worktree (`git worktree add`) |
| :--- | :--- | :--- |
| **Change Size** | Small/Medium fixes or isolated steps. | Large refactors or multi-file architectural changes. |
| **Parallel Tasks** | Sequential work; single task focus. | Concurrent tasks (e.g., implementing while reviewing PRs). |
| **Context Switch** | Stash/commit required before switching. | Zero friction; instant folder switch. |

## Mandatory Protocol
**Always ask the user for confirmation before creating a worktree or branch:**
> *"This change involves [large scope / parallel task]. Would you like me to set up a Git Worktree at `../<repo>-<jira-key>` or use a standard branch? If you already have parallel work going on I suggest a worktree"*