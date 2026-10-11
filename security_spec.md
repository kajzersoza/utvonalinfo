# Security Specification

## 1. Data Invariants
- An admin record can only be written by an admin or bootstrapped admin (`azqmodel@gmail.com`).
- A road hazard cannot be created with a forged `userId` (must equal `request.auth.uid`).
- Non-admin users cannot alter `verifiedByAdmin` status on a hazard.
- Road hazard updates can only be executed by the hazard's original submitter (`userId == request.auth.uid`) or an administrator.
- Deletions of road hazards can only be performed by the submitter or an administrator.
- An unauthenticated user cannot write to `/roadHazards` or `/admins`.
- Document IDs must match sanitized pattern `^[a-zA-Z0-9_\-]+$` and length <= 128.

## 2. The Dirty Dozen Payloads (Rejection Matrix)
1. **Unauthenticated create**: Request without `request.auth` -> REJECT
2. **Forged submitter ID**: `userId: "other-user-uid"` where `request.auth.uid == "user-123"` -> REJECT
3. **Privilege escalation on create**: Regular user submitting `verifiedByAdmin: true` -> REJECT
4. **Regular user modifying verification**: Regular submitter attempting to update `verifiedByAdmin` -> REJECT
5. **Ghost field injection**: Payload containing unregistered field `injectedExploit: true` -> REJECT
6. **Malicious ID injection**: Document ID containing path traversal `../../bad` or oversized string -> REJECT
7. **Negative or extreme coordinates**: Lat/lon out of plausible physical geographic bounds -> REJECT
8. **Invalid hazard type**: `hazardType: "unknown_hack"` not in enum -> REJECT
9. **Regular user mutating admin record**: Creating doc in `/admins/user-123` by non-admin -> REJECT
10. **Unauthenticated read of non-public draft hazard**: Accessing another user's private hazard -> REJECT
11. **Foreign user update**: User B trying to edit hazard submitted by User A without admin role -> REJECT
12. **Foreign user delete**: User B trying to delete hazard submitted by User A without admin role -> REJECT
