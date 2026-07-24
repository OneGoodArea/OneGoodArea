# Planning Workflow

Planning and Implementation are distinct phases that **NEVER** mix.

## 1. Initial Prompt Check
Always ask first: *"Do you want to brainstorm/plan or implement?"*

## 2. Interview & Scrutiny
- **Do not blindly agree.** Scrutinize requests for risks, tradeoffs, and simpler alternatives.
- **Never guess.** If requirements, APIs, or architectural intent are unclear, explicitly ask for clarification.
- **Inspect first.** Read existing code in `src/` and docs before drafting any plan.

## 3. Interactive Plan Creation
1. Start with a minimal skeleton plan in `docs/PLAN/<plan-slug>.md`.
1. Include: Purpose, linked/created Jira key, and high-level steps.
1. When there is a set of correlated plans, I like each of them to be a story, beneath and EPIC.
1. When a story has more than 2 or 3 steps, I think each step should be a JIRA task and obviouslky a commit in the branch
1. To be considered ready, a plan must address the GIT workflow, including worktree, commits to be done, where to wor andp ushes
1. Also, a plan at the end, must consider JIRA. EPIC< Story, Task,Bugfix, etc.... In case of questions and dounts ask.
1. PLans saved locally at docs/PLAN shoud follow the plan aneme patter NNN-meaningful-name