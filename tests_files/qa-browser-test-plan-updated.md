# AreaIQ QA Browser Testing Plan

## Overview
AreaIQ is a UK area intelligence platform that generates scored reports for UK locations using government data sources. This test plan covers comprehensive browser-based testing for QA manual testing.

## Test Environment Setup
- **Browser Support**: Chrome, Firefox, Safari, Edge
- **Device Testing**: Desktop, Tablet, Mobile
- **Network Conditions**: Fast 3G, Slow 3G, Offline
- **User Roles**: Unauthenticated, Free User, Paid User, Admin User

## Test Categories

### 1. Authentication & User Management

*** Fonts very small and grey in a black background. Very hard to read.
*** Black background on front end and emails are not nice and friendly.

#### 1.1 Sign Up Flow

* [ x] Navigate to `/sign-up` page 

| Result | Comments |
|---|---|
| OK | empty fields (email and password checked) |
| NOK | invalid email and weak password : naristerso@gmail password 12341234 not checked, validation email not received, and user was created |
|||

2. [ x] Test successful registration with valid credentials

| Result | Comments |
|---|---|
|NOK | email valid (narister@yahoo.com.br) and weak password : account created without email validation
|NOK |email valid (narister@yahoo.com.br) and strong password : email validation| received but new account created without  validation. Email validated after. |
|||

- [ x] Verify email verification flow

| Result | Comments |
|---|---|
NOK |Email received but account was created without the verification. Email was verified later.
OK |Tried to verify again, and showed a message 'Verification failed. This link has already been used'.
|||

- [ x] Test Google OAuth sign up

| Result | Comments |
|---|---|
|NOK | using a google account that already exists, it navigates to Generate Area Report without saying that the account already exists|
|NOK | need more emails to test sign up with google email and create a new account|
|||

- [ ] Test duplicate email handling
????

- [ x] Verify redirect to dashboard after signup

| Result | Comments |
|---|---|
|NOK| It redirects to Generate Area Report|
|||

#### 1.2 Sign In Flow
- [ x] Navigate to `/sign-in` page
OK

- [ x] Test form validation (empty fields, invalid credentials)
OK empty fields 
OK invalid credentials
- [ x] Test successful login with valid credentials
OK. Welcome email received.
- [ x] Test Google OAuth sign in
OK
- [ ] Test "Remember me" functionality
Not found
- [ x] Test "Forgot Password" flow
OK email received, password updated
*** should not accept same password
***show password would help
- [ x] Verify redirect behavior (return URL, default to dashboard)
NOK redirect to Generate Area Report, not to Dashboard
return URL???

#### 1.3 Password Reset Flow
- [ x] Navigate to `/forgot-password` page
- [ x] Test email validation
- [ x] Test email sending (check for success message)
- [ x] Test reset link in email (if accessible)
- [ x] Navigate to `/reset-password` with valid token
- [ x] Test password reset form validation
- [ x] Test successful password reset
- [ x] Test expired/invalid reset tokens

#### 1.4 Email Verification
- [ x] Test verification email sending during signup
- [ x] Test verification link functionality
- [ ] Test resend verification email (`/verify` page)
- [x ] Test behavior when already verified

### 2. Report Generation

#### 2.1 Report Creation Flow (Authenticated Users)
Monthly limit reached
You've used all 3 free reports this month. Upgrade to Pro for unlimited reports.
View Plans
Selected Pro
Navigated to Pay with link

- [ x] Navigate to `/report` page
- [ x] Test location input validation (empty, invalid UK postcodes, area names)
Ok empty : no navigation
NOK invalid UK postcodes: created 'abc def' report, email sent
NOK invalid area names: created 'janauba' report, email sent
- [ x] Test intent selection (Moving, Business, Investing, Research)
- [ ] Test report generation with valid inputs
OK moving: report created and email sent
OK business: report created and email sent
OK investing: report created and email sent
OK research: report created and email sent
- [ x] Verify loading states and progress indicators
- [ ] Test error handling (API failures, rate limits)
- [ ] Verify report display (scores, narration, data sources)
- [ ] Test PDF export functionality
NOK: navigates to upgrade
- [ x] Test report sharing functionality
OK posted on whatsapp
OK navigate to Linkedin
X not tested
NOK Watch functionality?
OK Link functionality 

#### 2.2 Report Creation Flow (Unauthenticated Users)
account created using an invalida email(narister.oliveira@gmail.com): sign in in lopp
- [ ] Navigate to `/report` page
- [ ] Verify redirect to sign-up page
- [ ] Test sign-up flow completion leads back to report generation

#### 2.3 Report History & Management
- [ ] Navigate to `/dashboard` page
- [ ] Verify report listing (pagination, sorting by date)
- [ ] Test report viewing from dashboard
- [ ] Test report deletion
- [ ] Test saved areas functionality
- [ ] Verify usage limits display and enforcement

### 3. Subscription & Billing

Monthly limit reached
You've used all 3 free reports this month. Upgrade to Pro for unlimited reports.

#### 3.1 Pricing Page
- [ ] Navigate to `/pricing` page
- [ ] Verify plan display (Free, Developer, Business, Growth)
- [ ] Test plan selection and Stripe checkout redirect
- [ ] Verify feature comparisons
- [ ] Test FAQ section

#### 3.2 Stripe Checkout Flow
- [ ] Complete checkout process with test card
- [ ] Test failed payment handling
- [ ] Verify success redirect to dashboard
- [ ] Test webhook handling (subscription creation)

#### 3.3 Subscription Management
- [ ] Navigate to `/settings` page
- [ ] Verify current plan display
- [ ] Test subscription cancellation
- [ ] Test plan upgrade/downgrade
- [ ] Verify usage limits update after plan change

### 4. Admin Functionality

#### 4.1 Admin Access Control
- [ ] Test admin page access with non-admin user (should redirect)
- [ ] Test admin page access with admin email
- [ ] Verify admin email whitelist functionality

#### 4.2 Admin Analytics
- [ ] Navigate to `/admin` page
- [ ] Verify analytics data display
- [ ] Test traffic analytics
- [ ] Test user metrics
- [ ] Test report generation metrics

### 5. API Management

#### 5.1 API Key Generation
- [ ] Navigate to `/settings` page
- [ ] Test API key generation (Developer/Business/Growth plans only)
- [ ] Verify API key display and copying
- [ ] Test API key revocation

#### 5.2 API Usage Tracking
- [ ] Navigate to `/api-usage` page
- [ ] Verify API usage statistics
- [ ] Test usage limit enforcement
- [ ] Test rate limiting feedback

### 6. Public Features

#### 6.1 Homepage
- [ ] Navigate to `/` (homepage)
- [ ] Test hero section interactions
- [ ] Test intent showcase (auto-rotation and manual selection)
- [ ] Test data sources display
- [ ] Test "Get Started Free" button (authenticated vs unauthenticated)
- [ ] Test navigation links

#### 6.2 Static Area Pages
- [ ] Navigate to `/area/[slug]` pages
- [ ] Test area information display
- [ ] Test report generation from area page
- [ ] Test SEO metadata

#### 6.3 Widget Embedding
- [ ] Test public widget functionality
- [ ] Verify widget code generation
- [ ] Test widget display on external sites

#### 6.4 Content Pages
- [ ] Test `/about`, `/methodology`, `/help`, `/terms`, `/privacy` pages
- [ ] Verify content display and navigation
- [ ] Test contact forms if present

### 7. Settings & Account Management

#### 7.1 Account Settings
- [ ] Navigate to `/settings` page
- [ ] Test password change functionality
- [ ] Test account deletion
- [ ] Verify confirmation dialogs

#### 7.2 Profile Management
- [ ] Test profile information display
- [ ] Test profile updates (if available)

### 8. Error Handling & Edge Cases

#### 8.1 Network Errors
- [ ] Test offline functionality
- [ ] Test slow network conditions
- [ ] Test API timeout handling

#### 8.2 Invalid URLs
- [ ] Test 404 pages (`/not-found`)
- [ ] Test invalid area slugs
- [ ] Test malformed URLs

#### 8.3 Rate Limiting
- [ ] Test report generation rate limits
- [ ] Test API rate limits
- [ ] Verify appropriate error messages

#### 8.4 Data Validation
- [ ] Test invalid postcode formats
- [ ] Test non-UK locations
- [ ] Test extremely long inputs

### 9. Responsive Design & Accessibility

#### 9.1 Responsive Testing
- [ ] Test all pages on mobile devices
- [ ] Test tablet layouts
- [ ] Test desktop layouts
- [ ] Verify touch interactions on mobile

#### 9.2 Accessibility
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Test color contrast
- [ ] Test focus indicators

### 10. Performance & Security

#### 10.1 Performance
- [ ] Test page load times
- [ ] Test report generation speed
- [ ] Test large data handling

#### 10.2 Security
- [ ] Test session management
- [ ] Test CSRF protection
- [ ] Test input sanitization
- [ ] Test HTTPS enforcement

## Test Data Requirements

### Sample Postcodes/Areas for Testing
- Valid UK postcodes: SW1A 1AA, M1 1AE, B1 1AA, EH1 1AA
- Area names: "Shoreditch, London", "Manchester City Centre"
- Invalid inputs: "12345", "New York", extremely long strings

### Test User Accounts
- Free user account
- Developer plan user
- Business plan user
- Growth plan user
- Admin user account

## Success Criteria
- All critical user journeys complete successfully
- No JavaScript errors in browser console
- All form validations work correctly
- Error states display appropriate messages
- Responsive design works across devices
- Accessibility standards met
- Performance meets acceptable thresholds

## Regression Testing Checklist
- [ ] Core report generation flow
- [ ] Authentication flows
- [ ] Subscription management
- [ ] Admin functionality
- [ ] API key management
- [ ] Public widget functionality</content>
<parameter name="filePath">/home/narister/projetos/AreaIQ-/test-plan-pathways.md