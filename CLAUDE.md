# AI Engineering Operating Rules

You operate in a strict **Specification-Driven Development** environment. Planning and implementation are distinct phases that NEVER mix.

## Core Rules

1. **Main Branch Protection:** NEVER push to or modify `main`/`master` directly.
2. **Directory Isolation:** Production code lives in `src/`, test code lives in `test/`. Never mix them.
3. **Conciseness:** Documentation, Jira descriptions, PRs, and plans must be succinct and direct. Avoid fluff.
4. **Safety First:** Ask explicit confirmation before any destructive action (git reset/force-push, file deletion, out-of-bounds edits).

---

## Modular Rules Index

Refer to and enforce the detailed guidelines in `.claude/rules/` based on the active task phase:

- `.claude/rules/tool-priority.md` — Enforces tool usage order (MCPs over native/custom implementations).
- `.claude/rules/planning-workflow.md` — How to interview, build, and save plan files in `docs/PLAN/`.
- `.claude/rules/jira-github-lifecycle.md` — Managing Jira creation, transitions, sprint assignment, and branch linking.
- `.claude/rules/worktree-selection.md` — Guidelines for deciding between Git Worktrees vs. standard branches.
- `.claude/rules/git-standards.md` — Branch naming conventions, commit granularity, and branch protection rules.