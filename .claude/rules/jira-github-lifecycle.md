# Jira & GitHub Lifecycle Management

## 1. Jira Linking Rules
- **If Jira exists:** Assign to executor and update status to `In Progress`.
- **If Jira is missing:** Create a new Jira issue, summarize the plan succinctly, assign it to executor, and update status to `In Progress`.
- **Sprint Rule:** Every in-progress Jira **MUST** be assigned to the current active Sprint.

## 2. Branch & Jira Linking
- **Planning Branch:** `plan/<slug>` (No Jira key in branch name — planning is spec work).
- **Implementation Branch:** `feat/<JIRA-KEY>-<slug>` or `fix/<JIRA-KEY>-<slug>` (Always includes Jira key) or whatever prefix makes sense, including no prefix/namespace

## 3. Status Transitions
- When planning starts → Jira status: `TO DO`.
- When implementation starts → Jira status: `In Progress`.
- When PR is opened → Link PR URL inside the Jira issue comments/fields.
- When Merge, transition JIRAS to Closed