# Player Market 2.0 — consolidated development roadmap

Status: IN DEVELOPMENT / HIDDEN / NOT RELEASE READY. Updated 27 November 2026.
This is the canonical implementation index for Market 2.0. Historical V17–V33 notes remain evidence, not independent launch tracks. No new player-facing roadmap status, live feature flags or policy changes are made here.

## Branch ownership and consolidation
- Primary: draft #1916, `review/market-eq2-provenance-contract-v31-20261126`.
- Frozen parent: #1651, `codex/market-eq2-only-generation-fence-20261122`; preserves the database V30 fail-closed fence. Keep as review baseline while exact-head checks and integration remain unresolved.
- At audited #1916 head `5f10d8800ff4b1259ebc61ed3b432a709358a213`, Git comparisons confirm #1651 (`dc763f16199a7a93785ac2961d86a59c7e446e3f`, 60 ahead/0 behind), #1055 (`babd4b6ce68f6e3f4e84fa78d1f40d564cd0a210`, 65/0), #1420 (`8f5b5aff6a08086e3bb3a1bb3b1f46dedebe93bb`, 285/0) are ancestors. #1055/#1420 are already closed; do not reopen or duplicate their implementations. #1349 UI shell previously merged to main; actual runtime integration is separate from shell presence.
- Current main comparison pinned at `b60070462bc42c72816c8b20e2417478ea44264a`: review branch 185 ahead/1113 behind, 93 changed files, merge base `78dc843632678e00e3a80671711c34f6b8fde6bb`. Do not merge this old stack into main or resolve conflicts blindly. Select a current hidden 2.0 integration base with Equipment/Forge and shared persistence, port only reviewed changes, run full clean migration and compare release behavior. Preserve source branches and historical tests until readback of consolidated head.
- Use #1916 for subsequent Market changes, not additional parallel market implementations. No merges or activation until relevant exact-head CI and dependency checks are green. Production remains disabled.

## Scope and product rules
- Account-wide trading across characters; no self-buy. Bulk resource lots with partial fills; exact-copy gear sold individually. Only genuinely minted and independently registered Equipment 2.0 copies, with an approved trade policy; legacy gear, counterfeit EQ2 IDs and preview items denied. Source registration never implies trade approval.
- Seven-day expiry; return unsold balance and exact gear via durable inbox. Cancel cannot return sold quantities. Paid delivery survives revoked listing policy, full storage, disconnect and retry. Recipient eligibility and storage checks on claim.
- Historical 20 shared listing slots and 5% per-fill rounded-up seller fee are baselines pending economy review, not new balance approval. No VIP trading advantage proposal. Final item policy, tier/class restrictions, minimum lot and price thresholds must reconcile with the actual 2.0 catalogue and economy.
- Launch focus T1–T5 and existing approved sources only; quarantine Bellwake conflicting origins. World Boss and Party Event mint sources remain unregistered, not approved by event participation. Do not invent additional tradable items.
- UI proposal: Browse / Sell / My Market (Listings / Inbox / History); compact, consistent item inspectors, total price and seller net, quantity controls, filters, pending claims and recoverable errors. No new visual implementation before owner design approval.

## Ordered implementation gates (not percentage estimates)
| Gate | Evidence / state | Acceptance |
|---|---|---|
| A. Consolidated foundation | Hidden ancestor stack contained; historical SQL and disposable source/PG17 tests | Pin compatible 2.0 base, preserve legacy fence, reconcile migration history and run full clean PG17 suite. |
| B. Origin and custody | Read-only original Forge and physical inspectors; disposable registration, replay and capacity tests | Actual canonical issuer commits original receipt + exact physical copy + XP/material/Gold changes once. Independent source verification, global copy uniqueness, immutable source/upgrade history, no client-issued proof. |
| C. Settlement and recovery | Historical resource/equipment routines; disposable cross-account wallet mirror, actor-scoped receipt projection and rollback | Real account/character wallets and GameState CAS in one database transaction, canonical serialization, durable actor+request-key and logical command identity, no partial settlement, stable receipt after response loss, real concurrency tests. |
| D. Resale/expiry/Inbox | Historical sale chain and expiry, disposable lifecycle | Verified origin across resale, old escrow/claims reconciled, trusted expiry worker, exact unsold return, full-storage and policy-revoked paid delivery, claim to eligible recipient, idempotent restart/retry. |
| E. Authenticated API | Unmounted request parser and receipt port; default handler 404 | Auth-bound reads/writes, private RPC permissions, bounded query/stream and durable rate limiting, receipt/quote recovery, least privilege and negative RLS tests. |
| F. Economy and performance | Synthetic affordability, bulk and price-history review | Verified T1–T5 material flow and fee rounding; price-history privacy and sample depth, market abuse review signals, load tests, query indexes; no automated sanctions based on suspicion. |
| G. UX and rollout | Design-only wireframe and presentation checks; previously merged shell | Owner visual approval, integrate canonical item inspector and localized UI, accessibility/safe-area/device QA, hidden integration environment, deployment/recovery plan, explicit 2.0 release sign-off. |

A synthetic pass cannot mark a real integration gate complete. If an authoritative issuer is absent, continue fail-closed; do not relabel an old mint, fabricate authority or move actual Gold/items.

## Verification and release policy
- Previous exact head `113cc6325dfe26d9923e30861e44c2a115486359`: dedicated PG17 and source review success, merge regression success; auth and several broad workflows failed on Forge test narrowing. Fixed in `f7918835781d725e72f798117da77c2523958463`, not yet revalidated in a completed exact-head run.
- Latest audited pre-consolidation head `5f10d8800ff4b1259ebc61ed3b432a709358a213`: all ten observed workflows queued (PG17 46016411961, auth 46016411854, source 46016411955); no pass claimed for new receipt, mint registration or race tests. New consolidation head must run again.
- Disposable PG17 test organization: 00 schema; 01 settlement rollback; 03/04 resource schema/regressions; 06 atomic mirror and registration rollback (shared 07 original-registration schema); 02 equipment races; 05 resource races; 08 original-registration races; absence of public schema. No staging/production migrations or external credentials.
- No main merge, hidden-base merge, production rollout, release flag, live route, actual market data or real balance changes in this consolidation. No branch deletion. Recheck exact head after every change, including broad CI and integration base.

## Evidence index
- [Historical consolidated scope #1651](https://github.com/elroynbenjamins/Veldryn/pull/1651)
- [Primary Market draft #1916](https://github.com/elroynbenjamins/Veldryn/pull/1916)
- [Generation cutover](player-market-eq2-generation-cutover-v30.md)
- [Provenance contract](player-market-eq2-provenance-contract-v31.md)
- [Settlement review](player-market-eq2-settlement-review-v33.md)
- [Physical custody](player-market-pg17-physical-custody-review.md)
- [Bulk and economy](player-market-bulk-economy-review.md)
- [Source handoff and interface](player-market-source-handoff-ui-review.md)
- [Authenticated physical integration](player-market-auth-physical-integration-review.md)
- [Original mint, atomic mirror and recovery](player-market-origin-atomic-recovery-review.md)
- [Compact UI review](../design/PLAYER_MARKET_2_0_COMPACT_REVIEW.md)
