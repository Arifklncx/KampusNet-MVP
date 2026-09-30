---
name: Campus email signup gate
description: Product decision for enforcing university email domains on Kampüsnet registration.
---

Reject non-`.edu.tr` addresses before making any Clerk call that creates a signup. The server must independently retrieve the authenticated user's primary email from Clerk and reject missing addresses or lookup failures; never substitute a synthetic address.

**Why:** Clerk's hosted signup UI has no app-side pre-submit domain check, and dashboard-side restrictions were not available to configure in this workspace, so the application must enforce the rule itself.

**How to apply:** Keep validation before `signUp.create` and on server-side profile creation. If authentication methods or the signup UI change, verify that non-university identities still cannot create a Kampüsnet profile.