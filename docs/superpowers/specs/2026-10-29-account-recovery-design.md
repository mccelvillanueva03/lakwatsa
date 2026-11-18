# Account recovery without email delivery

## Intent and scope

Keep email/password registration, optional unique usernames, and sign-in using either email or username. Add self-service password recovery using a saved recovery code. No email provider, security questions, or administrator workflow is required.

## Approach selected

The user selected recovery codes while keeping the existing authentication approach. Personal security questions were rejected because others may know or guess the answers. Email-delivered resets remain outside scope because no sending service is configured.

## Registration

- Register with email and password as today; keep the existing password rules.
- Generate a cryptographically random recovery code with at least 128 bits of entropy and store only its SHA-256 hash on the planner.
- Show the code once after registration, with copy/download controls and a clear reminder to save it before continuing to the dashboard.
- Do not put codes in URLs, logs, browser storage, or persistent plaintext database fields.

## Forgotten password

- Add a Forgot password link to sign-in.
- The recovery form accepts email or username, recovery code, and a new password with confirmation.
- Use the same password policy as registration. Builder decision: let the user choose the new password directly, avoiding a six-digit temporary password and a second password-change step.
- Normalize code separators/case so formatted and copied codes both work. Invalid identifiers, missing recovery setup, and incorrect/used codes return the same generic error.
- Throttle recovery attempts without locking ordinary sign-in or allowing an attacker to invalidate another person's recovery code.
- In one database transaction, verify and consume the current code, hash/save the new password, revoke all old planner sessions, issue a fresh session for the current browser, and save a replacement recovery-code hash.
- Only one concurrent use of a code may succeed. Failed verification must leave passwords, sessions, and codes unchanged.
- Automatically sign in after successful recovery and show the replacement recovery code once before continuing to the dashboard.

## Existing accounts and code replacement

- Add a nullable recovery-code hash through an additive migration; preserve all existing users and trip ownership.
- Account settings let an authenticated planner generate or replace a code after confirming their current password. Replacement immediately invalidates the old code.
- Existing users without a code must configure recovery while they can still sign in. No username/email-only reset is provided.
- Changing a password through the existing Account form keeps the current recovery code valid; recovery itself always replaces it.

## Acceptance

- Registration and sign-in by email/username still work.
- Plaintext codes are shown only to their owner during generation/replacement.
- Test successful recovery through both identifiers, incorrect/used codes, existing users without codes, password validation/confirmation, session revocation, regeneration authorization, throttling, and concurrent recovery.
- Browser-check registration code saving, forgotten-password recovery and replacement code, and existing-account code generation at mobile/desktop widths.
- Run the complete unit/integration suite, browser checks, lint, type checking, and production build. Keep external-service limitations explicit.

## Recovery limit

If a user loses both their password and recovery code and has no authenticated browser, this design cannot establish ownership. Explain that limit in the interface; do not add an insecure bypass.
