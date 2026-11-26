# Player Market 2.0 V31 — provenance and custody contract

HIDDEN / REVIEW ONLY / NO DEPLOY. Child of draft #1651 at dc763f16199a7a93785ac2961d86a59c7e446e3f. Keep V30 legacy fence intact. No runtime import, UI, migration, grants, routes, flags, Gold or actual item changes.

## Dependencies reviewed 26 November 2026
- #1651: legacy fence, account-wide bulk resources, historical first sale/resale, expiry and read gateway. Main comparison at review time: 125 ahead, 801 behind. Reconcile against a pinned current main before any combined release; do not merge main blindly into this review.
- #1686 at f491ccaa79824c0b44366c72d2967e81155056ac: disposable PG17 boss entitlement/mint/custody and two-client races reported successful on its exact head. Not production proof; no Gold or physical GameState integration.
- #1713 at 31d0469707e12ffe9721ffada19d90e1c2428249: canonical Equipment 2.0 approval record and review-only proposed universal rolls. Historical review PR closed; follow its successor before integration. No synthetic copy or proposed roll is tradable.

## V31 executable review
Run `node tools/market-review/eq2-provenance-contract-v31.mjs`. 43 cases executed with the identical functions in a standalone JS isolate, before committing. Repository Node/CI and PostgreSQL have not yet been executed for V31.

Synthetic review inputs model the trusted mint, policy, custody and actor records the future server must supply under transaction locks. Every output, even candidate, has marketAuthorized:false. Neither the fixture marker nor the boolean fields/digest are authentication, cryptographic attestation, a proof of ownership, or a deployable gateway. The module is deliberately unmounted. A single physical copy means authoritative custody across inventory, bank, escrow or pending entitlement, not an inventory object in every state.

- Original generation, immutable receipt, source entitlement, catalogue and policy version, exact copy identity and snapshot integrity required.
- Separate current ownership from original mint owner; distinguish first listing and resale. No self-buy, protected or banked listing, stale revision, wrong or expired offer, or ineligible buyer/claim recipient.
- Cancel, expiry and pending return are recovery candidates even when source policy revoked, but cannot create or transfer copies. Missing/inconsistent proof must be quarantined and reconciled, never deleted.
- Resource market delegates to its own policy. Candidate source names (Forge, monster, dungeon, world boss, party event) are not approvals. Each actual source/item requires explicit registration and approved policy.
- Recipient level/class requirements are inputs to this model, NOT decided here. Do not copy old T4 Lv52/T5+ prohibition onto new EQ2 catalogue; resolve with Equipment team, including Sunscar T4 Lv42 proposal. No numerical changes.
- Claim after policy revocation currently denies ordinary candidate; a real settlement needs a durable purchased-entitlement recovery path that preserves paid ownership or atomically refunds under an approved policy. Do not strand paid deliveries. Bank deposit/withdraw must have separate capacity and recipient validation in runtime.
- Snapshot digest and sale count are placeholders; the real adapter must read immutable mint and append-only sale chain in the database, validate mutable allowed upgrades/socket policies, and never trust client records. No chain linkage, price, Gold, taxes, capacity, concurrency, or authenticated user identity is proven by this pass.

## Next passes and release gates
1. Reconcile the current main base, migrate neither staging nor production; inspect actual EQ2 successor and authoritative issuer/serializer contract. Pin exact source revisions. Design recovery for legacy active escrow/deliveries and revoked-policy purchased entitlements.
2. Build disposable PG17 positive EQ2 escrow, Gold settlement, immutable sale chain, claim and cancellation/expiry/return, idempotency and race tests. Integrate both resource and EQ2 conservation; preserve V30. No private SQL runtime permissions yet.
3. Economy review: retain historical 5% tax, 20 account-wide offer limit, 7-day expiry as baseline proposals, validate with player economy and owner before changes. No VIP trading advantage proposal. Review bulk lots, wash trades, gold sources/sinks, new material supply. 
4. Authenticated gateway, rate limits, physical inventory and bank, transaction history, compact Android UI designs (owner approval before implementation), performance and end-to-end testing, explicit 2.0 release signoff. Keep all existing Market release flags false.
