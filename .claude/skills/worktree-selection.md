# Git Worktree Selection Guide

To keep work isolated and prevent context-switching friction, evaluate change scope and parallelism.

## Decision Process

Mostly suggest worktrees, unless it is a really small change, such as around 10 lines in no more than 3 files total, then you ask if worktree or branches. NEVER IN MAIN, EVER!

## Mandatory Protocol
**Always ask the user for confirmation before creating a worktree or branch:**
> *"This change involves [large scope / parallel task]. Would you like me to set up a Git Worktree at `../<repo>-<jira-key>` or use a standard branch? If you already have parallel work going on I suggest a worktree"*