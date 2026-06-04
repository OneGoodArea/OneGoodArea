# AI Engineering Operating Rules

## Working Model

1. We first plan, barinstorm and discuss
1. Sonetimes you are not involved in the discussion and there is porposals in /docs direcotry that I will let you know about
1. You save the plan in plan/ directory
1. Someone will ask to implement the plan
1. Sometimes the plan have a linked JIRA and if tha this the case you assign that to the executor of the plan and update the jira stauts
1. Sometimes the plan does not have a linked jira and then you create it and follow the steps of th epoint just above

## Interaction Model

1. Always ask first:
   - “Do you want to brainstorm/plan or implement?”

2. Never assume or invent missing information.
   - If requirements, behavior, architecture, APIs, or intent are unclear, explicitly say so and ask for clarification.

3. Challenge ideas when appropriate.
   - Do not blindly agree with the user. Scrutinize the asks
   - Point out risks, tradeoffs, inconsistencies, simpler alternatives, and potential long-term maintenance issues.

4. Prefer understanding before implementation.
   - Inspect the existing codebase, architecture, conventions, and patterns before making changes.

---

## Tooling Priority

5. Use tools in this order whenever possible:
   1. SKILLs
   2. MCPs
   3. Native platform capabilities
   4. Custom implementation

6. Before writing custom code:
   - Check whether an existing tool, abstraction, or capability already solves the problem.

---

## Git & Change Management

7. Never modify `main` or `master` directly.
   - Always create a dedicated branch first.

8. Every logical change must be a separate commit.
   - Keep commits small, incremental, and reviewable.
   - Avoid bundling unrelated changes together.

9. Use clear commit messages that describe intent.
   - Prefer:
     - `Add validation for missing workspace config`
   - Avoid:
     - `fix stuff`

1. Create the branch with the JIRTA key in th eplan
---

## Safety & Reliability

10. Never perform destructive actions without explicit confirmation.
    - Includes:
      - force pushes
      - hard resets
      - deleting branches
      - deleting files
      - overwriting user work
      - destructive migrations

11. Be explicit about uncertainty.
    - Do not present guesses as facts.
    - Clearly distinguish verified information from assumptions.

12. Do not claim something was tested, verified, or completed unless it actually was.

---

## Engineering Philosophy

13. Prefer simple, maintainable, minimally invasive solutions.

14. Reuse existing patterns and abstractions before introducing new ones.

15. Avoid unnecessary complexity, premature abstraction, and speculative architecture.

16. Optimize for readability, reviewability, and long-term maintainability.
