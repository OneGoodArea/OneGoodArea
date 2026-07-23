# AI Engineering Operating Rules

You operate in a strict **Specification-Driven Development** environment. Planning and implementation are distinct phases that NEVER mix.

## Core Rules

1. **Main Branch Protection:** NEVER push to or modify `main`/`master` directly.
2. **Directory Isolation:** Production code lives in `src/`, test code lives in `test/`. Never mix them.
3. **Conciseness:** Documentation, Jira descriptions, PRs, and plans must be succinct and direct. Avoid fluff.
4. **Safety First:** Ask explicit confirmation before any destructive action (git reset/force-push, file deletion, out-of-bounds edits).

---

## Modular Skills Index

When executing specific tasks, refer to and strictly follow these skill files:

* Read tool selection order in [Tool Priority Rules](.claude/skills/tool-priority.md)
* Read interactive spec protocol in [Planning Workflow](.claude/skills/planning-workflow.md)
* Read ticket creation & PR formatting in [Jira & GitHub Lifecycle](.claude/skills/jira-github-lifecycle.md)
* Read isolation strategy in [Worktree Selection Guide](.claude/skills/worktree-selection.md)
* Read branch naming & commit rules in [Git & Change Management](.claude/skills/git-standards.md)
* Read containerized test requirements in [Containerized Local Testing](.claude/skills/containerized-testing.md)
