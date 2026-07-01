# Completed test issues & tickets

Historical log of issues found during completed manual QA rounds. This is a
summary index — full repro detail lived in the per-ticket write-ups (git
history). Some tickets reference the since-killed reports/PDF-export surface
(AR-324) and are retained only as record.

Open bugs are tracked in [`../bugs/bugs-to-solve.md`](../bugs/bugs-to-solve.md).

| # | Title | Severity | Component |
|---|---|---|---|
| 1 | Email validation not enforced on sign up | High | Auth / Sign Up |
| 2 | Invalid password handling in sign up | Medium | Auth / Sign Up |
| 3 | Google OAuth doesn't indicate existing account | Medium | Auth / OAuth |
| 4 | Post-signup redirect goes to "Generate Area Report" not dashboard | Low | Navigation / Sign Up |
| 5 | Post-login redirect goes to "Generate Area Report" not dashboard | Low | Navigation / Sign In |
| 6 | Password reset doesn't prevent same-password reuse | Medium | Auth / Password Reset |
| 7 | Password reset UX improvements | Low (enhancement) | Auth / Password Reset |
| 8 | "Remember me" functionality not found | Low | Auth / Sign In |
| 9 | Invalid postcodes should not generate reports | High | Report Generation / Validation *(surface killed)* |
| 10 | Invalid area names should not generate reports | High | Report Generation / Validation *(surface killed)* |
| 11 | PDF export shouldn't require upgrade | High | Report Export / Subscription *(surface killed)* |
| 12 | Text contrast — fonts hard to read | High | UI / Typography / A11y |
| 13 | Black background theme not user-friendly | Medium (enhancement) | Design / Branding |

**Totals:** 13 tickets — Auth 6 · Report generation/validation 4 · UI/UX 2 · Navigation 1.
