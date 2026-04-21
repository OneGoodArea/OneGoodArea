---
name: gerar tickets 1
description: Given manual test results files, create a ticket for each failed test case, including the test case name, description of the failure, and any relevant logs or screenshots.
---

## Task

You will receive a markdown test file. Extract all test cases marked with `[x]` (completed tests) and create a ticket for each one.

## Instructions

1. **Parse the test file**: Look for checkbox items marked with `[x]` in the format `- [x] Test Case Name`
2. **Extract results**: For each marked test, find its associated results table (OK/NOK status and comments), use NOK only for ticket creation 
3. **Create one ticket per test**: Generate a concise ticket description in plain text format

## Ticket Format

For each completed test `[x]`, create a ticket with:

- **Test Case**: The exact name from the markdown
- **Expected behavior**: Summarize the expected outcome based on the test case description
- **Actual behavior**: Summarize the NOK results from the table
- **Acceptance criteria**: List the specific conditions that must be met for the ticket to be considered resolved


## Example

**Input test:**
```
- [x] Navigate to `/sign-up` page
| Result | Comments |
|---|---|
| OK | empty fields checked correctly |
| NOK | validation email not received |
```

**Output ticket:**
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

```
