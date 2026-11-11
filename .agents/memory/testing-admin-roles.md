---
name: Testing admin roles
description: How to verify the admin route when browser-test tools cannot provision Clerk roles.
---

Programmatic Clerk test sign-in can authenticate an account, but the available browser-test helper does not grant actual Clerk user roles or expose custom-claims overrides.

**Why:** A session-only role claim is not an adequate admin test for this app. The server resolves the account's trusted role from Clerk, so a normal testing identity correctly remains unauthorized.

**How to apply:** Provision a fresh development-only test identity with the official Clerk SDK and the required role before its first application request. Have the existing browser tester sign in programmatically using that fixture's email. Remove the temporary identity after testing. Never promote an existing user's account for a test, expose credentials, or perform this fixture setup against production.
