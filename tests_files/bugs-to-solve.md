# AreaIQ - Bugs to Solve (Tests with [x] and NOK)

## Authentication & User Management

### Ticket 1: Invalid Email Format Not Validated on Sign Up
**Status**: Issue Found  
**Severity**: High  
**Component**: Authentication / Sign Up Flow  
**Test Case**: 1.1 Sign Up Flow - Navigate to `/sign-up` page

**Description**:
When creating an account with an invalid email format (naristerso@gmail) and weak password (12341234), the system fails to validate the email format. The account is created despite invalid email and weak password, and no validation email was sent.

**Current Behavior**:
- User enters invalid email format "naristerso@gmail" (missing domain extension)
- User enters weak password "12341234"
- System creates account immediately
- No email validation error shown
- No validation email sent to user
- Account created in invalid state

**Expected Behavior**:
- System validates email format on input
- Invalid email format rejected with error message
- Weak password rejected with strength requirements
- Clear validation errors displayed before account creation
- No account created until valid inputs provided
- Validation email sent only for valid email addresses

**Acceptance Criteria**:
- [ ] Email format validation enforced (must contain valid domain)
- [ ] Invalid email format shows error: "Please enter a valid email address"
- [ ] Password strength validation enforced
- [ ] Weak passwords rejected with requirements displayed
- [ ] Account not created until both validations pass
- [ ] Validation errors shown immediately to user
- [ ] Test with various invalid email formats

---

### Ticket 2: Email Verification Not Enforced - Account Active Before Verification
**Status**: Issue Found  
**Severity**: Critical  
**Component**: Authentication / Sign Up Flow  
**Test Case**: 1.1 Sign Up Flow - Test successful registration with valid credentials

**Description**:
When creating an account with valid email (narister@yahoo.com.br) and weak password, the system creates the account immediately and sends verification email afterwards. Users can access features before confirming their email address. Also tested with strong password - same issue occurs.

**Current Behavior**:
- Scenario 1: User enters valid email and weak password "12341234"
  - Account created without email validation required
  - Email verification sent after account creation
  - User can access dashboard/reports without verifying email
  
- Scenario 2: User enters valid email and strong password
  - Email verification email received
  - New account created without requiring verification
  - Email validated by user after account already active
  - Account was already functional before email verification

**Expected Behavior**:
- User enters credentials
- Account created in "unverified" state
- System sends verification email
- User must verify email before account is fully active
- Only after email verification can user access core features
- Access blocked for unverified accounts

**Acceptance Criteria**:
- [ ] Create accounts in unverified state initially
- [ ] Send verification email immediately
- [ ] Block access to dashboard/reports until email verified
- [ ] Display message: "Please verify your email to access features"
- [ ] Verification email sent before account activation
- [ ] Test with both weak and strong passwords
- [ ] Verify unverified users cannot create reports

---

### Ticket 3: Weak Password Accepted During Sign Up
**Status**: Issue Found  
**Severity**: High  
**Component**: Authentication / Sign Up Flow  
**Test Case**: 1.1 Sign Up Flow - Test successful registration with valid credentials

**Description**:
When creating an account with a weak password (12341234), the system accepts it without validation or warning. Weak passwords are susceptible to brute force attacks and create security vulnerabilities.

**Current Behavior**:
- User enters valid email
- User enters weak password "12341234" (only numbers, 8 characters)
- System accepts password without validation
- Account created successfully
- No validation error or warning shown
- No strength indicator provided

**Expected Behavior**:
- Password strength validation enforced
- Clear error message for weak passwords displaying requirements
- Weak passwords rejected before account creation
- Password strength indicator shown to user
- Requirements visible on signup form

**Acceptance Criteria**:
- [ ] Implement password strength requirements (minimum 8 characters, mixed case, numbers, symbols)
- [ ] Display password requirements clearly on form before submission
- [ ] Show real-time strength indicator (Weak/Fair/Good/Strong)
- [ ] Reject weak passwords with helpful error message
- [ ] Display requirements: "Password must contain uppercase, lowercase, numbers, and symbols"
- [ ] Test with various weak password combinations
- [ ] Verify strong passwords are accepted

---

### Ticket 4: Email Verification Flow Doesn't Block Account Access
**Status**: Issue Found  
**Severity**: Critical  
**Component**: Authentication / Email Verification  
**Test Case**: 1.1 Sign Up Flow - Verify email verification flow

**Description**:
Email verification flow fails to prevent account access before email is confirmed. The account is created and fully functional before user verifies their email. Only when verification is repeated does the system show "already used" message.

**Current Behavior**:
- Email verification email received
- Account created and fully active before verification
- User can access all features without confirming email
- User verifies email later
- When attempting to verify again, system shows "Verification failed. This link has already been used"
- But verification should have been required BEFORE account creation

**Expected Behavior**:
- Account created in "unverified" state
- Verification email sent immediately
- User MUST verify email to activate account
- Access to features blocked until verification complete
- Verification link shows only once
- Resend option available for lost emails
- Clear status messaging about verification requirement

**Acceptance Criteria**:
- [ ] Create accounts in unverified/disabled state initially
- [ ] Redirect unverified users to verification page on login attempt
- [ ] Block access to dashboard/reports until verified
- [ ] Verification email sent during signup, not after
- [ ] Verification link only works once
- [ ] Display: "Please verify your email to continue"
- [ ] Resend verification email option available
- [ ] Test verification flow thoroughly

---

### Ticket 5: Google OAuth Signup Doesn't Indicate Existing Account
**Status**: Issue Found  
**Severity**: Medium  
**Component**: Authentication / OAuth  
**Test Case**: 1.1 Sign Up Flow - Test Google OAuth sign up

**Description**:
When attempting to sign up with a Google account that already exists in the system, the application silently redirects to "Generate Area Report" without informing the user that the account already exists. This causes confusion and poor user experience.

**Current Behavior**:
- Scenario 1: User signs up with existing Google account
  - System silently redirects to "Generate Area Report"
  - No message about existing account
  - No indication whether new account created or logged in
  - User confusion about account status
  
- Scenario 2: Cannot test new Google account signup
  - Insufficient test email accounts available
  - Cannot verify flow for new Google signups

**Expected Behavior**:
- System detects existing Google account
- Shows informative message: "This account already exists. Signing you in..."
- User logged in to existing account
- Clear confirmation of action taken
- Redirect to appropriate page (dashboard, not report)
- User knows their account status

**Acceptance Criteria**:
- [ ] Detect existing Google account during OAuth signup
- [ ] Display informative message about existing account
- [ ] Log user in to existing account (not create new)
- [ ] Redirect to dashboard (not /report)
- [ ] Clear confirmation message shown to user
- [ ] Test with multiple existing Google accounts
- [ ] Test with new Google accounts when available
- [ ] Verify no confusion between signup and login

---

### Ticket 6: Post-Signup Redirect Goes to Report Page Instead of Dashboard
**Status**: Issue Found  
**Severity**: Low  
**Component**: Navigation / Sign Up Flow  
**Test Case**: 1.1 Sign Up Flow - Verify redirect to dashboard after signup

**Description**:
After successful sign-up, the application redirects users to the "Generate Area Report" page (`/report`) instead of the dashboard. While this may be intentional for onboarding, it lacks clarity and is inconsistent with typical application behavior.

**Current Behavior**:
- After sign-up completion
- User redirected to `/report` page
- Dashboard not shown as first page
- No context provided about redirect

**Expected Behavior**:
- Clear, intentional redirect flow defined
- Either dashboard or onboarded report creation with clear purpose
- Consistent behavior across email and OAuth signups
- Documented user onboarding flow

**Acceptance Criteria**:
- [ ] Define intended post-signup redirect logic (report page vs dashboard)
- [ ] Apply consistently across email and OAuth signups
- [ ] Document user onboarding flow in code
- [ ] If report page intended, add onboarding context/guidance
- [ ] If dashboard intended, change redirect target
- [ ] Test with both signup methods
- [ ] Update test expectations accordingly

---

### Ticket 7: Post-Login Redirect Not Respecting Return URL Parameter
**Status**: Issue Found  
**Severity**: Medium  
**Component**: Navigation / Sign In Flow  
**Test Case**: 1.2 Sign In Flow - Verify redirect behavior (return URL, default to dashboard)

**Description**:
After successful login, users are redirected to the "Generate Area Report" page instead of their dashboard. Return URL parameters are not being respected, preventing users from being redirected back to where they originally came from.

**Current Behavior**:
- After login
- User redirected to `/report` page regardless of entry point
- Return URL parameters in login link not respected
- Dashboard not shown as default after login
- No redirect back to original requested page
- User navigation context lost

**Expected Behavior**:
- User redirected to dashboard by default after login
- If return URL provided in login link, redirect to that page
- Preserve user navigation context
- Support returnUrl parameter in login flow

**Acceptance Criteria**:
- [ ] Implement proper redirect logic for login
- [ ] Support returnUrl query parameter in login flow
- [ ] Default to dashboard if no return URL provided
- [ ] Validate return URL to prevent open redirects
- [ ] Test with various return URL scenarios
- [ ] Verify redirect behavior across browsers
- [ ] Test with and without return URL parameter

---

## Report Generation

### Ticket 8: Invalid UK Postcodes Accepted and Generate Reports
**Status**: Issue Found  
**Severity**: Critical  
**Component**: Report Generation / Validation  
**Test Case**: 2.1 Report Creation Flow - Test location input validation

**Description**:
The system creates reports for invalid UK postcode formats (e.g., "abc def"). Invalid postcodes should be rejected with a validation error before any report is created. This wastes system resources and creates poor user experience.

**Current Behavior**:
- User enters "abc def" (invalid postcode format)
- System creates report without validation
- Report email is sent
- No validation error shown to user
- Invalid postcode processed as if valid
- Resources wasted on invalid data

**Expected Behavior**:
- System validates postcode format against UK postcode rules
- Rejects invalid formats immediately with clear error
- Shows error: "Please enter a valid UK postcode"
- No report created for invalid postcodes
- User prevented from generating invalid reports

**Acceptance Criteria**:
- [ ] Implement UK postcode format validation
- [ ] Validate against UK postcode database or official regex pattern
- [ ] Display validation error immediately on input
- [ ] Prevent report creation for invalid postcodes
- [ ] Test with various invalid postcode formats ("abc def", "12345", "xxxx", etc.)
- [ ] Provide helpful format hints in error message
- [ ] Do not send report emails for invalid postcodes
- [ ] Test with valid UK postcodes to ensure they pass

---

### Ticket 9: Non-UK Location Names Accepted and Generate Reports
**Status**: Issue Found  
**Severity**: Critical  
**Component**: Report Generation / Validation  
**Test Case**: 2.1 Report Creation Flow - Test location input validation

**Description**:
The system creates reports for non-UK location names (e.g., "janauba" - a Brazilian city). Non-UK locations should be rejected before report generation. This results in reports being generated outside the intended service area.

**Current Behavior**:
- User enters "janauba" (non-UK location, city in Brazil)
- System creates report without location validation
- Report email is sent
- No validation error shown to user
- Non-UK location processed as valid
- Report generated for location outside service area

**Expected Behavior**:
- System validates that location is within UK
- Rejects non-UK locations immediately
- Shows error: "Please enter a valid UK location"
- No report created for non-UK locations
- User cannot generate reports outside service area

**Acceptance Criteria**:
- [ ] Validate that location is within UK boundaries
- [ ] Check against UK location/postcode database
- [ ] Display validation error for non-UK locations
- [ ] Prevent report creation for non-UK locations
- [ ] Test with various non-UK locations ("New York", "Paris", "janauba", etc.)
- [ ] Provide helpful message about service area limitation
- [ ] Do not send report emails for non-UK locations
- [ ] Test with valid UK locations to ensure they pass

---

### Ticket 10: Report Sharing "Watch" Functionality Not Working
**Status**: Issue Found  
**Severity**: Low  
**Component**: Report Sharing / Features  
**Test Case**: 2.1 Report Creation Flow - Test report sharing functionality

**Description**:
Report sharing functionality has multiple sharing options. While WhatsApp, LinkedIn, and link functionality work correctly, the "Watch" functionality is either not working or unclear what it does. This creates inconsistent user experience.

**Current Behavior**:
- WhatsApp sharing works correctly
- LinkedIn navigation works correctly
- Link sharing functionality works
- Watch functionality unclear
- "Watch" button may not work or purpose is unclear
- "Not tested" marking in test results

**Expected Behavior**:
- All sharing options available and working
- Clear labeling of each sharing method
- Watch functionality either working or removed
- Consistent behavior across all sharing platforms
- Clear indication of what each option does

**Acceptance Criteria**:
- [ ] Verify Watch functionality works or remove if not implemented
- [ ] Define purpose of "Watch" feature
- [ ] Implement Watch functionality if intended
- [ ] Verify WhatsApp sharing continues working
- [ ] Verify LinkedIn sharing continues working
- [ ] Verify link sharing continues working
- [ ] Test with various reports
- [ ] Add helpful tooltips/labels for each sharing option

---

## Summary Statistics

**Total Tickets**: 10  
**Critical Issues**: 3 (Tickets 2, 4, 8, 9)  
**High Priority**: 4 (Tickets 1, 3, 5, 7)  
**Medium Priority**: 2 (Tickets 6, 9)  
**Low Priority**: 1 (Ticket 10)  

**Categories**:
- Authentication & User Management: 7 tickets
- Report Generation & Validation: 3 tickets

**By Test Section**:
- 1.1 Sign Up Flow: 5 tickets
- 1.2 Sign In Flow: 2 tickets
- 2.1 Report Creation Flow: 3 tickets

---

## Next Steps
1. Address critical issues (Tickets 2, 4, 8, 9) immediately - these block user access and waste resources
2. Fix email validation and verification flow (Tickets 1, 2, 3, 4) - security priority
3. Implement report validation (Tickets 8, 9) - prevent invalid data entry
4. Fix redirect behavior (Tickets 6, 7) - improve user experience
5. Clarify/implement Watch functionality (Ticket 10) - consistency
6. Re-test all functionality after fixes
7. Update test plan with new validation criteria
