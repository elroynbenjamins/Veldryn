# Party Events v30 — locked proof inspection and deep refinement

**15 November 2026 | Draft PR #1045 | Hidden, nonpaying, no release gate.**

This pass performs a deeper correctness/security review of v27–v29 and adds a **read-only, transaction-scoped** inspection of the latest reward claim evidence. It is not a payable transaction and must never be used as an entitlement or claim confirmation.

## Round 1 — reward correctness and immutable provenance

The pending v29 paid receipt schema is **hardened in place** (migration not deployed):

- The future paid receipt must point to a **frozen v25 claim quote** by a composite FK matching offer, account, **character**, event week and quote SHA-256. This stops an unattested future paid row from inventing a new reward or sending it to another character.
- Each paired Inbox and paid receipt must agree on account, offer, **character**, week and reward SHA, with deferred two-way FKs. A mismatched message or orphan row cannot commit.
- Each v29 paid receipt enforces a complete reward v2 envelope, explicit numeric fields, reward-kind agreement, and equality between quoted and journaled **Gold, profession XP, Companion Essence, Bondstones, Party Renown and Gem Dust**. Actual stored combat-skill XP may differ from an odd reward pool by at most two points because Veldryn retains fractional class-focus remainders; the future writer must independently recompute those remainders and verify the exact result.
- A successful receipt is still NOT proof of economy movement unless the writer also updates the online game save, Gold wallet, character projection, applicable skill projection, companion currencies and Renown in **the same transaction**.

Tests added to the v29 PGlite fixture cover the new quote FK, mismatched quote amounts and cross-character Inbox delivery. Both tables remain private, noninsertable by ordinary service credentials, and immutable after a future payment.

## Round 2 — locked state and source consistency

A new **nonpaying** SQL function `private.inspect_party_event_claim_lock_v30(offer_id, account_id)`:

1. Acquires `pg_advisory_xact_lock(hashtextextended('party-account:'||account_id,0))`, matching the authoritative gameplay save's serialization key.
   - **Deadlock refinement:** follow the existing v25 ordering: locate immutable offer without a row lock, acquire the event-week update lock, then the offer update lock. Do not acquire the offer update lock first; v25 preflights lock week before offer. Only afterward lock online state, owned character and wallet.
2. Locks v24 offer and event week, checks final-stage/day-8 eligibility, frozen v11 roster and event/account ownership. It accepts an already **settled** week only when its independently checked v23/v24 boss/reward proof and all v25 records exist, preventing legitimate unpaid members from losing claims on event finalization.
3. Rechecks v23 replay attestation, v24 batch/candidate/replay fingerprints and the server-locked Warrior/Artisan/Companion selection. Participation cannot have a selected cache.
4. Locks/reads all three separate nonpaying v25 intent, preflight and quote records. It recomputes the v2 reward from the authoritative offer and verifies every SHA-256 and JSON reward matches.
5. Locks the active online game row, owned character and Gold wallet; requires all three Gold representations, active frozen character and current online revision to agree.
6. Rejects existing v29 paid receipts for that offer or account/event week, preventing a stale preview from masquerading as a fresh unpaid opportunity.
7. Returns the **trusted locked-source snapshot** with `previewOnly=true`, `claimable=false`, `claimed=false`, `economyApplied=false`, `inboxDelivered=false`, `locksReleasedAtRpcEnd=true`.

This one-shot function does **not** edit Gold, XP, account currencies, inventories, state revisions, paid receipts or the Inbox. Its parameter account ID must come from the authenticated backend, not a player-request payload. It runs as a private SECURITY DEFINER function with explicit `search_path=''`, revoked execute access for public/anon/authenticated and service-only execution.

**Critical transaction limitation:** a single SQL RPC ends its PostgreSQL transaction and releases all locks before TypeScript receives the result. The snapshot helps diagnose readiness but is NEVER safe to use for a later independent payment call. The eventual writer must repeat these checks **after acquiring the same account lock within its own still-open payment transaction**, recompute the state projection from the latest locked data and apply all writes before committing.

## Round 3 — validation, reliability and UI polish boundaries

- `backend/online/party-event-locked-snapshot-v30.ts` is a parameterized, server-only adapter and strict returned-data validator. It rejects mismatched identity, non-UUID identifiers, invalid difficulty/bands, inflated quotes, inconsistent Gold, invalid online revisions and any flags suggesting a payout has occurred. It returns `locksHeld=false` and `requiresRevalidationInsidePaymentTransaction=true`, and never allows a claim.
- `backend/online/tests/party-event-locked-snapshot-v30.ts`: 72 reward model combinations across three difficulties, six performance bands and four reward types, in addition to fake quote, player swap, revision, Gold, disabled gate and source immutability tests.
- `backend/tests/party-event-locked-snapshot-v30.mjs`: isolated PGlite test for private function definition, execute permissions, missing owner and hard-off settlement. The v29 PGlite suite also gained additional cross-character, quote and Gold-delta checks.
- `backend/package.json` and `.github/workflows/party-weekly-v2-validation.yml` include both suites and new source files.

### Player-facing safeguards for the later release

Do not display **Claim**, **Claimed** or a spendable currency total while rewards remain in v24/v25 preview form. Show an upcoming/pending state with a clearly identified event, chosen cache, difficulty and band; display actual Gold, Gem Dust, XP, Essence and Bondstones only from the versioned quote. Present paid rewards in the Inbox **only after** the v29 paid receipt and its linked Inbox row are committed. Never display a successful message on timeout or an uncertain commit; use the authenticated receipt lookup after reconnecting.

Activity and Party Contracts remain unaffected, and Party Events remain completely hidden until a full system test verifies the end-to-end payout.

## Verification performed in this pass

**Passed on staging, inside explicitly rolled-back SQL transactions:**

- The hardened v29 SQL DDL parsed and created the new v25 quote FK, stronger character-linked two-way Inbox constraints and complete recorded-amount checks.
- The v30 inspection function compiled with a private-only service grant and rejected a nonexistent account-owned offer with the expected `party_event_v30_offer_not_owned` error.
- Follow-up catalog reads after rollback found no v29 or synthetic tables, nor any v30 function installed.

**Not yet run / not passed:**

- Fresh branch TypeScript CI for v26–v30.
- The committed v29 and v30 PGlite integration programs.
- Real, concurrent, replayed/failed claims applied to a complete staging database and all player economy projections.

No live user, economy, event state, Inbox item or character was mutated; no production migration, claim writer, public route or feature flag has been deployed.

## The only safe next milestone — complete payment under one transaction

Build a server-owned transaction that holds the **party-account advisory lock** from source verification through commit; reruns v30-style proof checks, recomputes v28 canonical state from locked rows and resolves the authenticated profession target, then updates online state/revision, wallet, character, applicable skill rows and all account resources. Insert both v29 receipt and Inbox within that same transaction. Roll back everything on failure. Distinguish completed receipt replay, conflicting request ID and retryable transaction failure. Verify with live isolated staging transactions, PGlite and CI before exposing anything to players.

This documentation is a release gate, not an approval to enable claims.

## 16 November follow-up — lock-order repair across old claim preparation

The v30 inspector's week-first refinement alone was insufficient: the earlier v25
preflight held a **character** row before awaiting the **online save**, and the
other v25 quote held the **Gold wallet** before the online save. This conflicted
with v30's online-save-first order and could create opposing lock acquisition
in overlapping event-week/account operations.

The two unpublished v25 SQL migrations have now been repaired **in place**:
both acquire the ordinary `party-account:` advisory transaction lock before
any event-week row locks; preflight locks online save before character capacity;
quote locks online save before the wallet. Their week → offer ordering, frozen
identity/replay checks, reward formulas, replay behavior and permanently disabled
claim status are preserved. The v30 PGlite regression now inspects the v25
function bodies and fails if these ordered locks or account lock key regress.

**Verification boundary:** changes are committed to the hidden draft branch
only. The new static lock-order regression has not yet been confirmed green in
a fresh exact-head CI run, and simultaneous Postgres sessions against complete
staging Party Event fixtures have not been exercised. No claimed payment safety,
production migration, release switch, grant, payout or Inbox delivery.
