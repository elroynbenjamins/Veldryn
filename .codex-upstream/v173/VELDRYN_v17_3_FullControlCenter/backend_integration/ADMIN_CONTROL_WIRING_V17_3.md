# v17.3 Admin Control Wiring

## Merge authority

The current local VELDRYN repository is authoritative. It was described as broadly v16-era when this pack was built. Adapt these ports to current services rather than copying old reference implementations wholesale.

**There is no player Market.** Historical backend files that contain trading/listing code are deprecated context and must not be restored.

## Runtime flow

1. Admin authenticates to VELDRYN Control.
2. Cloudflare Function verifies explicit admin role.
3. Function validates a registered command, target, schema, catalog references, risk, reason and confirmation.
4. Command is queued in `ops_admin_commands`.
5. Trusted game worker atomically claims approved rows through `claim_ops_admin_commands()`.
6. Worker calls the mapped game-domain handler.
7. Handler uses current transactional/idempotent game services with `admin-command:<idempotency_key>`.
8. Result/error/heartbeat and append-only command events are recorded.
9. Safe reversal metadata, if any, is returned by the handler.

## Required domain bindings

Implement `VeldrynAdminDomain` from `admin-command-handlers-v16-reference.ts` using the current local services.

### Account / moderation
- session invalidation,
- account-deletion scheduling/cancellation,
- chat mute/unmute,
- chat-message hide/restore (soft moderation state; preserve evidence),
- account suspension/unsuspension,
- character rename through normal name validation/reservation.

### Economy / inventory
- Gold ledger delta and exact repair,
- registered non-premium/event currency delta and exact repair,
- exceptional premium-currency support adjustment with external support/store reference,
- inventory item/material delta and exact repair.

Exact repair operations are for corrupted state. Prefer normal delta commands for support.

### Rewards / progression
- reward bundle grants and claim recovery through normal receipts,
- skill XP delta/exact repair,
- recalculate all derived skill/Combat/Total/account values,
- stuck activity cancellation through normal settlement rules.

### Entitlements / collections / companions
- manual entitlement override layer; never rewrite valid store purchase ownership,
- pet/background/border/skin/achievement/title ownership through current unlock services,
- companion grant/revoke/XP repair while respecting duplicate protection and derived stats.

### Social / Dungeons
- persistent Party member/rename/disband invariants,
- Guild member/rename/leadership/disband invariants,
- Live/Q-Mode queue/run recovery with reservation cleanup and only verified refunds.

## Non-negotiable rules

- Never execute arbitrary SQL supplied by the browser.
- Never trust browser-calculated balances/levels/ownership.
- Re-read state within authoritative transaction boundaries.
- Exact-set repair must return the real prior value if it advertises reversal.
- Negative deltas cannot create invalid negative balance/inventory.
- Derived progression is recalculated, not independently patched.
- Reward recovery preserves existing claim/idempotency receipts.
- Purchase entitlements stay receipt-authoritative; admin changes are explicit overrides.
- Social repairs preserve leader/member constraints and history.
- Dungeon cancellation releases all reservations safely.

## Content catalog

Wire `admin-content-catalog-v17_3.ts` to current registries and sync on content activation/deploy. The Control catalog is never gameplay source of truth.

## Redeem codes

Read `REDEEM_CODE_WIRING_V17_3.md` and wire `redeem-code-service-v17_3.ts` to Account → Code Redemption.

## Announcements

Wire `announcement-worker-v17_3.ts` into the current notification/inbox and optional push provider. Resolve all audiences on the trusted backend.

## Critical approval

`CONTROL_REQUIRE_DUAL_APPROVAL_CRITICAL=true` requires a different Owner to approve critical commands. If there is initially only one Owner, keep it false; registry rows marked `requires_approval=true` still retain their explicit two-step flow where applicable.
