# Security Specification (Payload-First TDD)

## 1. Data Invariants

1. **Identity Isolation**: Every document in `agencyProfiles`, `clients`, `templates`, and `contracts` is strictly owned by a single verified Firebase Auth user (`ownerId == request.auth.uid`, `email_verified == true`). No cross-tenant read, list, update, or delete is permitted.
2. **Immutable Ownership & Creation Time**: On any `update`, `ownerId` and `createdAt` cannot be modified, and `updatedAt` must equal `request.time`.
3. **Terminal State Locking**: Once a `TravelContract` reaches `status == 'archived'`, no further updates are permitted.
4. **Bounded Arrays & Strings**: Every string has an explicit `size()` check matching `firebase-blueprint.json`, and every array (`itineraryDays`, `optionalServices`, `conceptLines`, `installmentLines`, etc.) is bounded (`<= 30` max) to prevent Denial-of-Wallet resource exhaustion.
5. **Strict Key Allowlisting**: Every `create` checks `keys().hasAll(...) && keys().hasOnly(...)` and every `update` uses `affectedKeys().hasOnly(...)` inside explicit action branches.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)

1. **Unauthenticated Read/Write**: Reading `/contracts/c1` with `request.auth == null`.
2. **Unverified Email Spoof**: Creating a client with `request.auth.token.email_verified == false`.
3. **Identity Spoofing on Create**: Creating `/clients/c1` with `ownerId: "victim-uid"` while authenticated as `"attacker-uid"`.
4. **Shadow / Ghost Field Injection**: Creating `/templates/t1` with an extra undeclared field `isAdmin: true`.
5. **Ownership Hijack on Update**: Updating `/contracts/c1` to change `ownerId` from `"userA"` to `"userB"`.
6. **Cross-Tenant List Scraping**: Listing `/clients` without filtering `where('ownerId', '==', auth.uid)` (rule rejects because `resource.data.ownerId != request.auth.uid`).
7. **Terminal State Mutation**: Updating a `TravelContract` whose `existing().status == 'archived'`.
8. **ID Poisoning**: Writing to `/contracts/` with document ID `a..b` or length > 128 chars.
9. **Timestamp Forgery**: Creating a contract with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
10. **Value Poisoning on Update**: Updating `contract.totalAmount` to `"hacked"` (wrong type) or `-500` (negative).
11. **Unbounded Array Bomb**: Creating a contract with `itineraryDays` having 50 items (> max 30).
12. **Blanket Agency Profile Listing**: Attempting `list` on `/agencyProfiles` collection.
