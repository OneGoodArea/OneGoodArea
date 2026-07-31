# AI Engineering Operating Rules

You operate in a strict **Specification-Driven Development** environment. Planning and implementation are distinct phases that NEVER mix.

## Core Rules

1. **Main Branch Protection:** NEVER push to or modify `main`/`master` directly. Before editing ANY file, run `git branch --show-current`; if it reports `main`, create a branch or worktree FIRST (see Worktree Selection Guide).
2. **Directory Isolation:** Production code lives in `src/`, test code lives in `test/`. Never mix them.
3. **Conciseness:** Documentation, Jira descriptions, PRs, and plans must be succinct and direct. Avoid fluff.
4. **Safety First:** Ask explicit confirmation before any destructive action (git reset/force-push, file deletion, out-of-bounds edits).

---

## Modular Skills Index

When executing specific tasks, refer to and strictly follow these skill files:

* Read tool selection order in [Tool Priority Rules](.claude/skills/tool-priority/SKILL.md)
* Read interactive spec protocol in [Planning Workflow](.claude/skills/planning-workflow/SKILL.md)
* Read JIRA ticket creation & PR formatting in [Jira & GitHub Lifecycle](.claude/skills/jira-github-lifecycle/SKILL.md)
* Read isolation strategy in [Worktree Selection Guide](.claude/skills/worktree-selection/SKILL.md)
* Read branch naming & commit rules in [Git & Change Management](.claude/skills/git-standards/SKILL.md)
* Read test requirements in [Software Testing](.claude/skills/software-testing/SKILL.md)
* Read TypeScript standards in [TypeScript Development](.claude/skills/typescript-development/SKILL.md)
