# Security Specification for BioDa-Col

## Data Invariants
1. Observations must belong to the authenticated user who created them (`userId` matches `request.auth.uid`).
2. Observations must have a valid `type` matching the enum: `plant`, `animal`, or `study_area`.
3. User profiles must be accessible only by the user themselves.
4. Timestamps for creation must be server-side (`request.time`).
5. Document IDs must be hardened against injection.

## The Dirty Dozen Payloads (Red Team Test Cases)
1. **Identity Spoofing (Observation)**: Create observation with `userId: "other_user_id"`.
2. **Identity Spoofing (Profile)**: Create profile with `uid: "other_user_id"`.
3. **Ghost Field Injection**: Add `isAdmin: true` to an observation.
4. **Invalid Type Injection**: Set observation `type` to `alien_lifeform`.
5. **Unauthorized Read (List)**: Authenticated user A tries to list all observations (without filtering by their own `userId`).
6. **Unauthorized Read (Get)**: Authenticated user A tries to get observation B belonging to user B.
7. **Bypassing Server Timestamp**: Send a manual `timestamp` string instead of `serverTimestamp()`.
8. **PII Leak**: User A tries to read User B's profile.
9. **Resource Poisoning**: Use a 1MB string as a document ID.
10. **State Shortcutting**: (Not applicable here yet, but maybe for status if added later).
11. **Malicious Update**: User A tries to update User B's observation `notes`.
12. **Self-Promotion**: User tries to update their own `uid` in their profile.

## Test Runner Plan
- Location: `/src/firestore.rules.test.ts`
- Tooling: `@firebase/rules-unit-testing` (I might need to install this if I were running local tests, but here I'll use the provided patterns).
