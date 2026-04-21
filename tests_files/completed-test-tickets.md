# AreaIQ - Completed Test Issues & Tickets

## Authentication & User Management

### Ticket 1: Email Validation Not Enforced on Sign Up
**Status**: Issue Found  
**Severity**: High  
**Component**: Authentication / Sign Up Flow  
**Test Case**: 1.1 Sign Up Flow - Test successful registration with valid credentials

**Description**:
When creating an account with a valid email (narister@yahoo.com.br) and a weak password, the account was created without requiring email verification first. The email validation message is only sent after account creation, allowing users to access the system before confirming their email address.

**Current Behavior**:
- User enters valid email and weak password
- System creates account immediately
- Email verification sent afterwards
- User can access features before verifying email

**Expected Behavior**:
- User enters credentials
- System sends verification email
- User must verify email before account is fully active
- Only after verification can user access core features

**Acceptance Criteria**:
- [ ] Email verification is mandatory before account creation completes
- [ ] User cannot access dashboard/reports until email is verified
- [ ] Clear messaging about pending verification
- [ ] Resend email option available

---

### Ticket 2: Invalid Password Handling in Sign Up
**Status**: Issue Found  
**Severity**: Medium  
**Component**: Authentication / Sign Up Flow  
**Test Case**: 1.1 Sign Up Flow - Test successful registration with valid credentials

**Description**:
Weak passwords (e.g., "12341234") are being accepted during sign-up without proper validation or user warning. The account is created even with insufficient password strength.

**Current Behavior**:
- Weak password "12341234" accepted
- Account created successfully
- No validation error or warning shown

**Expected Behavior**:
- Password strength validation enforced
- Clear error message for weak passwords
- Requirements displayed (minimum length, complexity, etc.)

**Acceptance Criteria**:
- [ ] Implement password strength requirements
- [ ] Display password requirements clearly before submission
- [ ] Reject weak passwords with helpful error message
- [ ] Password requirements documented in UX

---

### Ticket 3: Google OAuth Doesn't Indicate Existing Account
**Status**: Issue Found  
**Severity**: Medium  
**Component**: Authentication / OAuth  
**Test Case**: 1.1 Sign Up Flow - Test Google OAuth sign up

**Description**:
When attempting to sign up with a Google account that already exists in the system, the application silently redirects to "Generate Area Report" without informing the user that the account already exists. This causes confusion about whether a new account was created.

**Current Behavior**:
- User signs up with existing Google email
- System redirects to "Generate Area Report"
- No message about existing account
- User unclear if new account created or logged in

**Expected Behavior**:
- System detects existing account
- Shows message: "This account already exists. Redirecting to login..." or similar
- User is logged in to existing account
- Clear confirmation of action taken

**Acceptance Criteria**:
- [ ] Detect existing Google account during OAuth signup
- [ ] Display informative message about existing account
- [ ] Redirect to appropriate page after login
- [ ] User feedback is clear and not confusing

---

### Ticket 4: Post-Signup Redirect Goes to "Generate Area Report" Instead of Dashboard
**Status**: Issue Found  
**Severity**: Low  
**Component**: Navigation / Sign Up Flow  
**Test Case**: 1.1 Sign Up Flow - Verify redirect to dashboard after signup

**Description**:
After successful sign-up, the application redirects users to the "Generate Area Report" page instead of the dashboard. This may be intentional for onboarding, but requires clarification and consistency.

**Current Behavior**:
- After sign-up completion
- User redirected to `/report` page
- Dashboard not shown as first page

**Expected Behavior**:
- Clear redirect flow established
- Either dashboard or onboarded report creation is intentional
- Consistent across all signup flows

**Acceptance Criteria**:
- [ ] Define intended post-signup redirect logic
- [ ] Apply consistently across email and OAuth signups
- [ ] Document user onboarding flow
- [ ] Update test expectations accordingly

---

### Ticket 5: Post-Login Redirect Goes to "Generate Area Report" Instead of Dashboard
**Status**: Issue Found  
**Severity**: Low  
**Component**: Navigation / Sign In Flow  
**Test Case**: 1.2 Sign In Flow - Verify redirect behavior

**Description**:
After successful login, users are redirected to the "Generate Area Report" page instead of their dashboard. "Return URL" functionality also appears to not be working.

**Current Behavior**:
- After login
- User redirected to `/report` page
- Return URL parameters not respected
- Dashboard not shown

**Expected Behavior**:
- User redirected to dashboard on login
- Return URL parameter respected (if user came from specific page)
- Consistent navigation flow

**Acceptance Criteria**:
- [ ] Implement proper redirect logic for login
- [ ] Support return URL parameters
- [ ] Default to dashboard if no return URL
- [ ] Test and verify redirect behavior

---

### Ticket 6: Password Reset Doesn't Prevent Same Password Reuse
**Status**: Issue Found  
**Severity**: Medium  
**Component**: Authentication / Password Reset  
**Test Case**: 1.2 Sign In Flow - Test "Forgot Password" flow

**Description**:
When resetting a password, the system allows users to set the same password they previously used. This is a security concern and should be prevented.

**Current Behavior**:
- User initiates password reset
- User enters previous password
- System accepts it
- No validation error

**Expected Behavior**:
- System checks against password history
- Rejects if same as current/recent password
- Prompts user to enter different password

**Acceptance Criteria**:
- [ ] Implement password history check
- [ ] Prevent reuse of current password
- [ ] Display error: "Cannot reuse recent passwords"
- [ ] Test with multiple previous passwords

---

### Ticket 7: Password Reset UX Improvements
**Status**: Enhancement  
**Severity**: Low  
**Component**: Authentication / Password Reset  
**Test Case**: 1.2 Sign In Flow - Test "Forgot Password" flow

**Description**:
Password reset form lacks show/hide password toggle, making it difficult to verify entry accuracy.

**Current Behavior**:
- Password fields are masked
- No show/hide toggle button
- User cannot verify password entered

**Expected Behavior**:
- Show/hide password toggle available
- User can verify entry before submission
- Standard UX pattern

**Acceptance Criteria**:
- [ ] Add show/hide password toggle
- [ ] Toggle updates both password fields
- [ ] Default state is hidden for security
- [ ] Test on all devices

---

### Ticket 8: "Remember Me" Functionality Not Found
**Status**: Issue Found  
**Severity**: Low  
**Component**: Authentication / Sign In  
**Test Case**: 1.2 Sign In Flow - Test "Remember me" functionality

**Description**:
The sign-in page does not appear to have a "Remember me" checkbox or similar functionality, which is a standard UX feature for login forms.

**Current Behavior**:
- Sign-in form does not show "Remember me" option
- Users must log in each time

**Expected Behavior**:
- "Remember me" checkbox available on sign-in form
- Session persists for extended period when checked
- Secure cookie handling

**Acceptance Criteria**:
- [ ] Add "Remember me" checkbox to sign-in form
- [ ] Implement secure session persistence
- [ ] Set appropriate session timeout
- [ ] Document security measures

---

## Report Generation

### Ticket 9: Invalid Postcodes Should Not Generate Reports
**Status**: Issue Found  
**Severity**: High  
**Component**: Report Generation / Validation  
**Test Case**: 2.1 Report Creation Flow - Test location input validation

**Description**:
The system creates reports for invalid UK postcode formats (e.g., "abc def"). Invalid postcodes should be rejected with a validation error.

**Current Behavior**:
- User enters "abc def" (invalid format)
- System creates report
- Report email is sent
- No validation error shown

**Expected Behavior**:
- System validates postcode format
- Rejects invalid formats
- Shows error: "Please enter a valid UK postcode"
- No report created

**Acceptance Criteria**:
- [ ] Implement UK postcode format validation
- [ ] Validate against official postcode database/regex
- [ ] Display validation error immediately
- [ ] Prevent report creation for invalid postcodes
- [ ] Test with various invalid formats

---

### Ticket 10: Invalid Area Names Should Not Generate Reports
**Status**: Issue Found  
**Severity**: High  
**Component**: Report Generation / Validation  
**Test Case**: 2.1 Report Creation Flow - Test location input validation

**Description**:
The system creates reports for invalid area names (e.g., "janauba" - a non-UK location). Invalid or non-UK areas should be rejected.

**Current Behavior**:
- User enters "janauba" (non-UK location)
- System creates report
- Report email is sent
- No validation error shown

**Expected Behavior**:
- System validates that area is in UK
- Rejects non-UK locations
- Shows error: "Please enter a valid UK location"
- No report created

**Acceptance Criteria**:
- [ ] Validate that location is within UK
- [ ] Check against UK location database
- [ ] Display validation error for non-UK locations
- [ ] Prevent report creation
- [ ] Test with various non-UK locations

---

### Ticket 11: PDF Export Shouldn't Require Upgrade
**Status**: Issue Found  
**Severity**: High  
**Component**: Report Export / Subscription  
**Test Case**: 2.1 Report Creation Flow - Test PDF export functionality

**Description**:
When attempting to export a report as PDF, the system redirects to the upgrade/pricing page instead of generating the PDF. PDF export should be available based on subscription tier.

**Current Behavior**:
- User clicks "Export PDF" button
- System navigates to `/pricing` page
- PDF is not generated

**Expected Behavior**:
- For eligible subscription tiers: PDF generated and downloaded
- For ineligible tiers: Show upgrade prompt in context
- Clear messaging about which plans include PDF export

**Acceptance Criteria**:
- [ ] Verify subscription tier can generate PDF
- [ ] Generate PDF when eligible
- [ ] Show upgrade prompt for ineligible tiers
- [ ] Display clear error/upgrade message
- [ ] Test with different subscription levels

---

## UI/UX Issues

### Ticket 12: Text Contrast Issue - Fonts Hard to Read
**Status**: Issue Found  
**Severity**: High  
**Component**: UI / Typography / Accessibility  
**Test Case**: General observation across all pages

**Description**:
Text on the application is very small and grey on a black background, making it extremely difficult to read. This affects accessibility and user experience significantly.

**Current Behavior**:
- Small grey text
- Black background
- Poor contrast ratio
- Hard to read for extended periods

**Expected Behavior**:
- Adequate font sizes (minimum 14px for body text)
- High contrast text/background (WCAG AA minimum 4.5:1)
- Easy to read across all pages
- Accessible for users with vision impairments

**Acceptance Criteria**:
- [ ] Audit all text contrast ratios
- [ ] Ensure WCAG AA compliance (4.5:1 minimum)
- [ ] Increase font sizes where needed
- [ ] Test with accessibility tools
- [ ] Test with color contrast checker

---

### Ticket 13: Black Background Theme Not User-Friendly
**Status**: Enhancement  
**Severity**: Medium  
**Component**: Design / Branding  
**Test Case**: General observation

**Description**:
The black background theme on both the frontend and emails creates a harsh, unfriendly aesthetic. The current design may not align with user preferences or brand positioning.

**Current Behavior**:
- Black background throughout application
- Black background in email templates
- Dark/harsh appearance
- User feedback indicates unfriendly feel

**Expected Behavior**:
- User-friendly color scheme
- Emails have appropriate background color
- Welcoming and professional appearance
- Consistent branding

**Acceptance Criteria**:
- [ ] Review and redesign color scheme
- [ ] Consider alternative backgrounds (white, light grey, etc.)
- [ ] Update email templates
- [ ] Get user feedback on new design
- [ ] Ensure brand consistency

---

## Summary Statistics

**Total Tickets**: 13  
**Critical Issues**: 4 (Tickets 1, 9, 10, 11)  
**High Priority**: 3 (Tickets 5, 6, 12)  
**Medium Priority**: 4 (Tickets 2, 3, 7, 13)  
**Low Priority**: 2 (Tickets 4, 8)  

**Categories**:
- Authentication: 6 tickets
- Report Generation & Validation: 4 tickets
- UI/UX: 2 tickets
- Navigation: 1 ticket

---

## Next Steps
1. Prioritize critical and high-priority issues
2. Assign to appropriate development teams
3. Create sprints for implementation
4. Re-test after fixes
5. Update test plan with new validation criteria
