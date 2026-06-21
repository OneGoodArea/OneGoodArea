# Dashboard — Test Cases

> **Source:** https://www.onegoodarea.com/ (Engine v2.0.2)
> **Dashboard URL:** `/dashboard` (authenticated)
> **Last updated:** 2026-06-19

## Scope

The OneGoodArea Dashboard is the authenticated **control plane** for the UK location intelligence API. It surfaces plan/usage info, saved reports, monitored postcodes, API keys, MCP add-on status, and links to billing, API usage, and settings. The dashboard sits inside the `AppShell` sidebar chrome and is served from `/apps/web/src/app/design-v2/dashboard/client.tsx`.

---

## 1. Authentication & Access Control

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **AUTH-01** | Unauthenticated user is redirected to sign-in | 1. Clear browser session<br>2. Navigate to `/dashboard` | Redirect to `/sign-in?callbackUrl=%2Fdashboard` (or `/sign-in`). Dashboard content **never** renders. |
| **AUTH-02** | Authenticated user lands on dashboard | 1. Sign in with valid credentials (Google / GitHub / email+password)<br>2. Observe landing page | User lands on `/dashboard`. Page renders without error, showing the UsageStrip at top. |
| **AUTH-03** | Dashboard is excluded from search engine indexing | 1. Check `/robots.txt` | `/dashboard` is listed under `Disallow`. |
| **AUTH-04** | Session expiry redirects to sign-in | 1. Sign in and land on dashboard<br>2. Wait for session to expire (or manually invalidate token)<br>3. Refresh page | Redirect to `/sign-in`; 401 on API calls; dashboard content does not render. |

---

## 2. Dashboard Navigation & Layout

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **NAV-01** | Sidebar shows "Dashboard" as first primary nav item | 1. Sign in and navigate to `/dashboard`<br>2. Observe sidebar | Sidebar shows "Dashboard" (exact match, icon=`dash`) as the first PRIMARY nav item. Link points to `/dashboard`. |
| **NAV-02** | Sidebar shows all expected nav sections | 1. Sign in<br>2. Observe sidebar | PRIMARY: Dashboard, New report, Compare. SECONDARY: API + usage, Billing, Settings. |
| **NAV-03** | Wordmark in sidebar links to dashboard | 1. Sign in<br>2. Click Wordmark (top of sidebar) | Navigates to `/dashboard`. |
| **NAV-04** | "Dashboard" nav item is active/highlighted when on `/dashboard` | 1. Sign in<br>2. Navigate to `/dashboard` | The Dashboard nav item in sidebar shows active state (e.g., highlighted / white icon). |
| **NAV-05** | Mobile/responsive sidebar collapse | 1. Sign in on viewport <880px wide<br>2. Toggle sidebar | Sidebar collapses/expands correctly; main content fills available width. |

---

## 3. Usage Strip (Current Plan & Monthly Usage)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **USAGE-01** | Current plan name is displayed correctly | 1. Sign in as user on Sandbox plan<br>2. Observe UsageStrip left column | Shows "Sandbox" (or plan name from `/v1/me`). |
| **USAGE-02** | API badge shown for API-enabled plans | 1. Sign in as user on Sandbox (API-enabled) plan<br>2. Observe UsageStrip | "API" badge displayed next to plan name. |
| **USAGE-03** | No API badge for non-API plans | 1. Sign in as user on a plan without API access<br>2. Observe UsageStrip | No "API" badge shown. |
| **USAGE-04** | Link changes based on plan | 1. Sign in as Sandbox (free) user<br>2. Observe "Upgrade plan" link<br>3. Sign in as Build (paid) user<br>4. Observe "Manage billing" link | Free/sandbox plan: link text = "Upgrade plan →". Paid plan: link text = "Manage billing →". Both link to `/dashboard/billing`. |
| **USAGE-05** | Monthly usage bar shows correct percentage | 1. Sign in with known `used` and `limit` values (e.g., 15/35)<br>2. Observe UsageStrip right column | Usage count shows "15 / 35". Percentage shows "43%". Bar fill width = 43%. |
| **USAGE-06** | Usage bar tone changes at thresholds | 1. Sign in with usage <70% (e.g., 10/35 = 29%)<br>2. Observe tone<br>3. Sign in with usage 70–89% (e.g., 28/35 = 80%)<br>4. Observe tone<br>5. Sign in with usage ≥90% (e.g., 33/35 = 94%)<br>6. Observe tone | <70%: `strong` (white). 70–89%: `moderate` (yellow). ≥90%: `weak` (red). |
| **USAGE-07** | Usage shows "∞" for unlimited plans | 1. Sign in as Enterprise or unlimited plan user<br>2. Observe UsageStrip | Shows "X / ∞". No percentage displayed. Bar is empty width (0%). |
| **USAGE-08** | "Resets on the 1st of the month" text is shown | 1. Sign in<br>2. Observe UsageStrip | Text "Resets on the 1st of the month" visible below usage bar. |
| **USAGE-09** | Responsive layout collapses to single column | 1. Sign in on viewport ≤720px wide<br>2. Observe UsageStrip | Two-column grid collapses to single column; plan and usage stack vertically. |
---

## 4. Stats Section

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **STATS-01** | Stats grid hidden when no reports exist | 1. Sign in as user with zero reports<br>2. Observe dashboard | Stats section (Total reports, Average score, Top-scoring postcode, Top score) is **not** rendered. |
| **STATS-02** | Stats grid visible with correct values when reports exist | 1. Sign in as user with at least 1 report<br>2. Observe stats | 4-cell grid shown: Total reports (count), Average score (rounded avg), Top-scoring postcode (area name), Top score (value). |
| **STATS-03** | Average and top scores show RAG colour accent | 1. Sign in as user with reports<br>2. Observe stats cells | Score cells use `appRag()` colour tone (green/amber/red) based on score value. |
| **STATS-04** | Stats grid responsive at ≤880px | 1. Resize viewport to ≤880px<br>2. Observe stats | 4-column grid collapses to 2-column grid. |
| **STATS-05** | Stats re-calculate after adding a new report | 1. Sign in with existing reports<br>2. Generate a new report with a different score<br>3. Return to dashboard | Stats update to reflect the new report in calculations. |

---

## 5. Reports Table

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **REPORT-01** | Empty state shown when no reports exist | 1. Sign in as user with zero reports<br>2. Observe Reports table | Empty state card: "No reports yet" title, body text with CTA "Generate a report". |
| **REPORT-02** | Empty state when filter matches nothing | 1. Sign in as user with reports<br>2. Type a search string that matches no area<br>3. Observe | Shows "No reports match your filter" with guidance to clear search. |
| **REPORT-03** | Reports list shows columns: Postcode, Workflow, Score, Created | 1. Sign in as user with at least 1 report<br>2. Observe reports table header | Header row: Postcode (sortable), Workflow, Score (sortable), Created (sortable), [actions]. |
| **REPORT-04** | Report row shows correct data | 1. Sign in as user with a known report (area="M1 1AE", intent="research_baseline", score=72) | Row shows: "M1 1AE", "Research" (from intentLabel()), score "72" with RAG dot, formatted date. |
| **REPORT-05** | Area name links to report detail page | 1. Click on a report's area name | Navigates to `/report/{report.id}`. |
| **REPORT-06** | Score column shows RAG dot | 1. Observe a report row<br>2. Check score cell | Colored dot rendered before score value. Dot colour matches appRag(score).dot. |
| **REPORT-07** | Delete report with confirmation | 1. Click trash icon on a report row<br>2. Click "Delete" in confirmation prompt | Report is deleted via DELETE /api/report/{id}. Row removed from list without page reload. Report count decrements. |
| **REPORT-08** | Cancel delete confirmation | 1. Click trash icon on a report row<br>2. Click "No" in confirmation prompt | Confirmation dismisses. Report remains in list. No API call made. |
| **REPORT-09** | Search filters by area/postcode | 1. Type "Manchester" in search box<br>2. Observe filtered list | Only reports whose area contains "Manchester" (case-insensitive) are shown. |
| **REPORT-10** | Workflow filter dropdown | 1. Select a workflow/intent from the filter dropdown<br>2. Observe filtered list | Only reports matching the selected workflow/intent shown. "All workflows" option shows all. |
| **REPORT-11** | Sort by Score (descending default) | 1. Click "Score" column header | Reports sorted by score descending. Arrow indicator shows ▼. |
| **REPORT-12** | Sort by Score (ascending after second click) | 1. Click "Score" header twice | Reports sorted by score ascending. Arrow shows ▲. |
| **REPORT-13** | Sort by Created date | 1. Click "Created" header | Reports sorted by created_at descending. Arrow shows ▼. |
| **REPORT-14** | Sort by Area/Postcode reverse-alphabetically | 1. Click "Postcode" header | Reports sorted by area reverse-alphabetically (Z→A). Arrow shows ▼. |
| **REPORT-15** | Export CSV button downloads file | 1. Have filtered reports in the table<br>2. Click "Export CSV" | A CSV file downloads named onegoodarea-reports-{YYYY-MM-DD}.csv. Content includes headers: Area, Intent, Score, Status, Generated. Each filtered report represented as a row. |
| **REPORT-16** | Export CSV hidden when no reports match filter | 1. Search for something that matches nothing<br>2. Observe toolbar | "Export CSV" button is not rendered when filtered list is empty. |
| **REPORT-17** | Responsive: table collapses on ≤720px | 1. Resize to ≤720px<br>2. Observe reports | Header row hidden. Each report row shows stacked layout: area, intent, score, date. |
---

## 6. Watchlist (Monitored Postcodes)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **WATCH-01** | Watchlist section hidden when no saved areas | 1. Sign in as user with empty watchlist<br>2. Observe dashboard | "Monitored postcodes" card is **not** rendered. |
| **WATCH-02** | Watchlist shows saved areas with label and postcode | 1. Sign in as user with saved areas<br>2. Observe Watchlist | Card title: "Monitored postcodes · {count}". Each row shows: label (or postcode), postcode, optional workflow label. |
| **WATCH-03** | Remove saved area from watchlist | 1. Click × icon on a saved area row<br>2. Observe | Area removed via DELETE /api/watchlist/{id}. Row disappears without page reload. Count decrements. |
| **WATCH-04** | Watchlist 3-column grid | 1. Sign in with at least 3 saved areas<br>2. Observe layout at viewport >880px | 3-column grid layout with borders between items. |
| **WATCH-05** | Watchlist responsive at ≤880px | 1. Resize to ≤880px<br>2. Observe | 3-column → 2-column grid. |
| **WATCH-06** | Watchlist responsive at ≤540px | 1. Resize to ≤540px<br>2. Observe | 2-column → single column. |

---

## 7. API Keys Section

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **KEYS-01** | API Keys section visible only for API-enabled plans | 1. Sign in as user with API access (e.g., Sandbox)<br>2. Observe<br>3. Sign in as user without API access<br>4. Observe | Plan with API access: section rendered. Plan without API access: section **not** rendered. |
| **KEYS-02** | Empty state "No keys yet" shown | 1. Sign in as user with zero API keys<br>2. Observe keys section | Shows "No keys yet. Create one to start making requests." |
| **KEYS-03** | Loading state shown while fetching keys | 1. Sign in with slow network<br>2. Observe keys section briefly | "Loading keys…" text shown while fetch is in flight. |
| **KEYS-04** | Create new API key | 1. Click "New key" button in API Keys section<br>2. Observe | POST /api/keys called. Key reveal panel slides in showing the full key with "Save this key now · it won't be shown again" warning. |
| **KEYS-05** | Copy new key to clipboard | 1. Click "Copy" next to the revealed key | Key text copied to clipboard. Button changes to "Copied ✓" for ~1.6 seconds, then reverts. |
| **KEYS-06** | Key list shows all keys after creation | 1. Create a new key<br>2. Observe the keys list | New key appears in the list below with preview (oga_...), name, "Never used" or last-used date. |
| **KEYS-07** | Revoke API key | 1. Click "Revoke" on a key row<br>2. Observe | DELETE /api/keys/{id} called. Key removed from list without page reload. |
| **KEYS-08** | Key list shows key preview and name | 1. Sign in with existing keys<br>2. Observe key rows | Each row shows: key preview (oga_...), key name, last used date (or "Never used"). |
| **KEYS-09** | Rate limit blurb shown | 1. Observe API Keys section | Text: "30 requests per minute per key; cached responses don't count." |
---

## 8. MCP Add-on Section

> ⚠️ **Implementation note (2026-06-19):** The server-side `page.tsx` (`apps/web/src/app/design-v2/dashboard/page.tsx`) does **not** pass the `mcp` prop to `DashboardClient`. The condition `{isApiPlan && mcp && <McpAddOnSection />}` always evaluates to false, so the MCP section is **never rendered** in the current production build. The test cases below describe the intended behaviour once `getMcpStatus(userId)` is wired into the data-fetching block. The `McpAddOnSection` component itself is fully implemented and ready.

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MCP-01** | MCP section visible only for API-enabled plans with MCP data | 1. Sign in as user with API access and MCP status data<br>2. Observe | MCP Add-on section rendered. |
| **MCP-02** | MCP section hidden when no MCP data or plan lacks API access | 1. Sign in as user without API access OR without MCP status<br>2. Observe | MCP section **not** rendered. |
| **MCP-03** | MCP section shows purchase option when not owned | 1. Sign in as user who does not own MCP add-on and plan doesn't include it<br>2. Observe MCP section | Shows option to purchase MCP add-on. "Get MCP access" CTA. |
| **MCP-04** | MCP section shows "included in plan" when plan includes it | 1. Sign in as Growth or Enterprise user<br>2. Observe MCP section | Shows MCP is included free with plan. No purchase option. |
| **MCP-05** | MCP section shows "already owned" when add-on purchased | 1. Sign in as user who purchased MCP add-on<br>2. Observe MCP section | Shows MCP add-on as active/owned. |

---

## 9. Billing Flow (from Dashboard)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **BILL-01** | "Upgrade plan" link navigates to billing | 1. Click "Upgrade plan" in UsageStrip | Navigates to `/dashboard/billing`. |
| **BILL-02** | "Manage billing" link navigates to billing | 1. Click "Manage billing" in UsageStrip | Navigates to `/dashboard/billing`. |
| **BILL-03** | Stripe portal redirects back to dashboard | 1. From billing page, open Stripe customer portal<br>2. Complete any action in portal<br>3. Observe return | Stripe portal's return_url points to `/dashboard`. After portal action, user lands on dashboard. |
| **BILL-04** | Successful plan upgrade shows upgraded param | 1. Complete a Stripe checkout for a plan upgrade<br>2. Observe redirect URL | Redirected to `/dashboard?upgraded=true`. |
| **BILL-05** | Successful add-on purchase shows addon and purchased params | 1. Complete MCP add-on purchase via Stripe Checkout<br>2. Observe redirect URL | Redirected to `/dashboard?addon=mcp&purchased=1`. |
| **BILL-06** | Cancelled add-on purchase shows addon and cancelled params | 1. Cancel during MCP add-on checkout<br>2. Observe redirect URL | Redirected to `/dashboard?addon=mcp&cancelled=1`. |
| **BILL-07** | Already-owned add-on redirects with flag | 1. Attempt to purchase MCP add-on again<br>2. Observe | Redirected to `/dashboard?addon=mcp&already_owned=1`. No checkout created. |
| **BILL-08** | Plan-includes add-on redirects with flag | 1. User on Growth plan tries to purchase MCP add-on<br>2. Observe | Redirected to `/dashboard?addon=mcp&plan_includes=1`. No checkout created. |

---

## 10. API Usage Page (linked from Dashboard sidebar)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **API-USAGE-01** | "API + usage" nav link works | 1. Click "API + usage" in sidebar | Navigates to `/api-usage`. |
| **API-USAGE-02** | Non-API plan users redirected | 1. Sign in as non-API user<br>2. Navigate to `/api-usage` | Returns 403 or redirects to `/pricing` with error: "API usage dashboard requires a Developer, Business, or Growth plan". |
| **API-USAGE-03** | Usage data shows totals and daily series | 1. Sign in as API-enabled user with usage history<br>2. Navigate to `/api-usage` | Shows request total, a 30-day daily request series chart/table, and list of active API keys. |
| **API-USAGE-04** | Empty state when no keys | 1. Sign in as API user with zero keys<br>2. Navigate to `/api-usage` | Shows "No keys yet. Head to the dashboard to create one." |
---

## 11. Dashboard Redirects & Edge Cases

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **EDGE-01** | OAuth sign-up redirects to dashboard | 1. Sign up with Google/GitHub OAuth<br>2. Observe post-sign-up | OAuth callbackUrl = `/dashboard`. User lands on dashboard after successful OAuth. |
| **EDGE-02** | Email sign-in redirects to dashboard | 1. Sign in with email/password (or magic link)<br>2. Observe post-sign-in | Default callbackUrl = `/dashboard`. User lands on dashboard. |
| **EDGE-03** | Admin page redirects non-admins to dashboard | 1. Sign in as non-admin user<br>2. Navigate to `/admin` | Redirects to `/dashboard`. |
| **EDGE-04** | Cancel plan redirects to dashboard | 1. Cancel Stripe subscription<br>2. Observe post-cancel | User redirected to `/dashboard` from billing portal return_url. |
| **EDGE-05** | Dashboard page not cached by CDN (private) | 1. Check response headers on dashboard pages | Cache-Control: private or equivalent no-store directive. |
| **EDGE-06** | Loading state visible on slow connection | 1. Throttle network to Slow 3G<br>2. Navigate to `/dashboard` | Skeleton/pulse loader visible while data fetches complete. Sidebar renders immediately. |

---

## 12. Settings Page (linked from Dashboard sidebar)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **SETT-01** | "Settings" nav link works | 1. Click "Settings" in sidebar | Navigates to `/settings`. |
| **SETT-02** | Settings page loads correctly | 1. Navigate to `/settings`<br>2. Observe | Settings page renders with user account options. |

---

## 13. Billing Page (/dashboard/billing)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **BILLING-PAGE-01** | Billing page shows plan grid | 1. Navigate to `/dashboard/billing`<br>2. Observe | Plan grid rendered with Sandbox, Starter, Build, Scale, Growth, Enterprise tiers. Shows current plan highlighted. |
| **BILLING-PAGE-02** | Sandbox selection redirects to dashboard | 1. On billing page, select "Sandbox" while on a different plan | Since already on Sandbox (or selecting it) → redirect to `/dashboard` with no checkout. |
| **BILLING-PAGE-03** | Plan change confirmation flow | 1. Select a different paid plan<br>2. Observe confirmation panel | Confirmation panel appears above the grid. No auto-checkout. User confirms to proceed. |
| **BILLING-PAGE-04** | Successful plan change redirects to dashboard | 1. Confirm a plan upgrade<br>2. After Stripe checkout completes | Redirected to `/dashboard?upgraded=true` (not `/dashboard/billing`). |

---

## 14. Compare Page (linked from Dashboard sidebar)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **COMPARE-01** | "Compare" nav link works | 1. Click "Compare" in sidebar | Navigates to `/compare`. |
| **COMPARE-02** | Compare page has back-to-dashboard link | 1. Navigate to `/compare`<br>2. Observe top-right | "← Dashboard" link visible. Clicking it navigates to `/dashboard`. |

---

## 15. Report Detail Page (linked from Dashboard Reports Table)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **REPORT-DETAIL-01** | Report detail has back-to-dashboard link | 1. Click a report from Dashboard table<br>2. Observe report page | "← Reports" link visible. Clicking it navigates to `/dashboard`. |
| **REPORT-DETAIL-02** | Report detail page loads correctly | 1. Navigate to `/report/{id}` for an existing report | Score ring, dimensions, summary, sections, property data, schools, recommendations, meta all render correctly. |
---

## 16. Webhooks (dashboard-visible status)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **WEBHOOK-01** | Failed webhook deliveries visible in dashboard (future state) | 1. (When Monitor section is built) Navigate to webhook section<br>2. Observe delivery history | Failed deliveries shown with status, retry count, manual replay option. |

---

## 17. Performance & Reliability

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **PERF-01** | Dashboard loads within acceptable time | 1. Measure page load from navigation start to onLoad<br>2. Run 3 times and average | Page load < 2s on standard broadband. |
| **PERF-02** | API calls are not blocked by slow sub-requests | 1. Throttle one API endpoint (/api/keys) to respond slowly<br>2. Observe dashboard render | Dashboard renders partially (reports/watchlist visible) while slow section shows loading state. |
| **PERF-03** | Sidebar renders immediately (no flicker on navigation) | 1. Navigate between dashboard sub-pages<br>2. Observe sidebar | Sidebar chrome persists across navigation without full re-render (AppShell pattern). |

---

## 18. Error Handling

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **ERR-01** | API failure shows graceful error message | 1. Simulate network failure on /api/keys<br>2. Observe keys section | Keys section shows error state or empty state, not a broken page. |
| **ERR-02** | Delete report API failure | 1. Simulate 500 error on DELETE /api/report/{id}<br>2. Attempt to delete a report | Report not removed from list. User-facing error (console or UI). |
| **ERR-03** | 402 Payment Required on quota exhaustion | 1. Use up all API calls on a hard-cap plan<br>2. Make one more API call<br>3. Check dashboard | API returns 402. Dashboard shows usage bar at 100% with prompt to upgrade. |

---

## 19. Accessibility

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **A11Y-01** | Delete report icon has accessible label | 1. Inspect trash icon button | aria-label="Delete report" is present. |
| **A11Y-02** | Remove watchlist item has accessible label | 1. Inspect × icon button in watchlist | aria-label="Stop monitoring this postcode" is present. |
| **A11Y-03** | RAG colour dots have accessible text alternative | 1. Inspect score colour dots | Colour is not the only indicator; the score numeric value is always present as text. |
| **A11Y-04** | Sort buttons are keyboard-accessible | 1. Tab to sort header buttons<br>2. Press Enter/Space | Sort action triggers correctly via keyboard. |
| **A11Y-05** | Keyboard navigation through reports list | 1. Tab through report rows<br>2. Observe focus indicators | Focusable elements (links, buttons) receive visible focus ring. |

---

## 20. Internationalization / Locale (UK-specific)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **LOCALE-01** | Date format is en-GB (day/month/year) | 1. Sign in with en-GB locale<br>2. Observe report dates | Date formatted as "18 Jun 2026" (DD Mon YYYY). |
| **LOCALE-02** | Currency in billing context is GBP (£) | 1. Navigate to billing page<br>2. Observe prices | All prices displayed in £ GBP format. |
| **LOCALE-03** | Postcodes formatted as UK standard | 1. Generate a report for a postcode<br>2. Observe dashboard display | Postcodes displayed in standard UK format (e.g., "M1 1AE", "SW1A 1AA"). |

---

## Test Environment Notes

- **Base URL:** https://www.onegoodarea.com/
- **Auth providers:** Google OAuth, GitHub OAuth, Email + Password
- **Browser targets:** Chromium (latest), Firefox (latest), Safari (latest)
- **Viewport breakpoints:** >880px (desktop), 720–880px (tablet), <720px (mobile)
- **API version:** v2.0.2
- **Backend endpoints consumed by dashboard:**
  - GET /api/me/reports
  - GET /api/usage
  - GET /api/keys/usage
  - GET /api/keys / POST /api/keys / DELETE /api/keys/{id}
  - GET /api/watchlist / DELETE /api/watchlist/{id}
  - DELETE /api/report/{id}
  - Stripe checkout/portal/addon-checkout routes