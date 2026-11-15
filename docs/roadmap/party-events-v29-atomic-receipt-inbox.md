# Party Events v29 — atomic paid-claim receipt + Inbox foundation

**15 November 2026. Draft / hidden / NOT paying.** This is a preparatory database schema and detached server packet, **not** the production atomic settlement or a released reward claim. Draft PR #1045 only.

## New code

- `backend/supabase/migrations/20261115173500_party_event_paid_receipt_inbox_v29.sql` — **unapplied** migration for two private tables. Each row represents an eventual *successful* credit; no writer is provided in v29.
- `backend/online/party-event-atomic-packet-v29.ts` — server-side, nonpaying assembly of the future receipt/Inbox pair, derived only from the v27 verified evidence and v28 canonical state projection. Produces a deterministic SHA-256 digest of the proposed game snapshot for audit. No database writer, HTTP action or user claim.
- `backend/online/tests/party-event-atomic-packet-v29.ts` — cross-link checks, unchanged source state, same-state SHA stability, idempotency key validation, identity/Gold/revision/capacity/XP failures, and all 72 authored reward variations. The payout method always throws.
- `backend/tests/party-event-paid-schema-v29.mjs` — isolated PGlite integration suite using a **throwaway in-memory PostgreSQL** instance, not staging or production. It loads the actual draft migration with minimal fixture tables and validates exactly-once constraints, both directions of an orphan-receipt/Inbox rollback, reward hash parity, immutable records and private role permissions.
- Updated `backend/package.json` Party Events test suite and `.github/workflows/party-weekly-v2-validation.yml` path filters to include the v29 code, SQL migration and tests.

## Atomic receipt ↔ Inbox invariant

`private.party_event_paid_claim_receipts_v29` and `private.party_event_paid_claim_inbox_v29` are **separate, permanent, private records** linked by two **DEFERRABLE INITIALLY DEFERRED** foreign keys:

- Paid receipt requires an Inbox record with the exact same account, offer ID and reward hash.
- Inbox record requires its corresponding paid receipt with the same account, offer ID and reward hash.
- Both rows must exist by the **end of the same SQL transaction**, otherwise the transaction rolls back.
- Each row's `reward_hash` is recomputed from canonical `reward_json::text` with SHA-256, preventing an Inbox message from displaying a different award than the accounting receipt.
- `UNIQUE(offer_id)`, `UNIQUE(event_starts_at,account_id)` and `UNIQUE(account_id,request_id)` prohibit double recording for one offer, event/account or replayed request key.
- Immutable UPDATE triggers prevent editing paid history. Direct DELETE is never granted to ordinary roles; foreign-key cascade remains possible for required user account erasure.

The tables grant the service role **SELECT only**. No `INSERT`, `UPDATE`, `DELETE` grants, no anonymous or authenticated access, no player-side Inbox route, no function that moves any currency, and no writable `paid` API are created. The read-only private function `private.read_party_event_paid_inbox_v29` is scoped to the trusted server-resolved account ID and sets `payoutWriterInstalled=false`, `claimEndpointEnabled=false`. It would only show a historical successful receipt once a future reviewed writer exists.

**Importantly, paired records alone do NOT prove that Gold, XP and inventory were written.** The v29 packet is intentionally not an authority to pay. A subsequent paid writer must lock the account, recheck all evidence, calculate from the locked current GameState, persist every economy destination, and insert the paired records **inside that same SQL transaction**. No intermediate committed receipt may be created.

## Server packet contract

The detached proposal contains: frozen player/party/offer/reservation/week identity, trusted request ID, receipt and Inbox UUIDs, exact verified v2 reward model and quote hash, source/new online revisions, proposed GameState, Gold, actual stored combat-skill XP delta, profession XP/target, Companion Essence, Bondstones, account-wide nonspendable Party Renown, Gem Dust, Inbox title and proposed state digest.

The exact request ID and IDs must originate from the authenticated server. The after-state hash is an audit checksum **not a permission token**. The database must revalidate all deltas and the v25 quote itself before any future commit, and must never accept a free-form client `proposedState`.

The packet always contains:

```text
previewOnly = true
committed = false
rewardsGranted = false
requestRecorded = false
inboxDelivered = false
releaseEnabled = false
```

`PARTY_EVENT_ATOMIC_PACKET_V29_RELEASED=false` and `commitPrivatePartyEventAtomicPacketV29()` always rejects. No event feature flags changed.

## Critical remaining work before actual claims

1. A **single private payout function** using `pg_advisory_xact_lock(hashtextextended('party-account:'||p_account_id,0))`, consistent lock ordering and row locks on the event week, v24/v25 records, online save, character, wallet and relevant skill projections.
2. Re-read locked current state and revalidate all v23–v25 proofs, event/account/character ownership, full quote hash and choice, and the updated v28 calculation. Old v25 revisions are diagnostics only; current revision must match the claim transaction.
3. Recompute all reward deltas server-side, with class skill XP split/remainder, profession level curve, 99,999 Gem Dust stack policy, legitimate entitlement capacity, Gold wallet/character/online projection, Companion Essence, Bondstones and Party Renown.
4. **All-or-nothing writes:** online state/revision, character and wallet Gold, SQL profession skill projections (where applicable), event/account Renown, and the matched paid receipt + Inbox message in the exact same transaction. Any failure rolls back everything.
5. A durable request replay read that returns an existing **committed** receipt if the same key and offer repeat, otherwise rejects the conflicting key. Concurrent duplicate requests must serialize under the normal account advisory lock.
6. A properly authenticated, rate-limited worker/API and account-scoped Inbox read model. Do not use `service_role` from the mobile client, accept client-supplied account ID, or expose `private` to PostgREST clients.
7. **Actual execution of test suites and staged isolated SQL tests.** All new v29 test files are committed, but there is no verified fresh CI result or runtime database integration result yet.

## Migration/release status

**Not applied** to staging or production. No user balance, inventory, skill, Party Renown, payout status, claim, user Inbox or other live record has been changed. Draft PR #1045 remains unmerged. This is a transaction schema and test harness, not a working in-app Claim button.
