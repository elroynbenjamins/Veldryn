# Party Events v31 — receipt recovery and timeout safety

**16 November 2026 — hidden draft PR #1045. No payout/claim/Inbox integration is released.**

## Purpose

If a future reward-claim request times out, the server must not blindly
repeat its economy mutation. The v29 paired receipt and Inbox schema gives an
immutable idempotency reference, but it is not itself a verified economy
transaction. This pass adds a **read-only recovery protocol** without creating
a payable claim writer or altering the unpublished database migration chain.

## Recovery outcomes

| Account-scoped result | Meaning | Safe action now |
| --- | --- | --- |
| `not_recorded` | No matching v29 receipt was found for either the exact offer or request key | **Do not retry/authorize a grant**; status is not proof of a failed transaction |
| `paired_receipt_present` | One stored receipt matches both offer and original request and has a fully identity-matching linked Inbox record | Retain the receipt ID for internal audit; **do not acknowledge client success** |
| `receipt_request_conflict` | Receipt exists for offer with a different request, or request key was used for a different offer | Reject and investigate; never generate a replacement key silently |
| `ambiguous_receipt_candidates` / `paired_inbox_integrity_invalid` | Ambiguous or corrupted receipt/Inbox graph | Reject closed and escalate |

The single parameterized SQL statement reads only private
`party_event_paid_claim_receipts_v29` and
`party_event_paid_claim_inbox_v29`; it scopes rows to **authenticated server
account ID** and selects by **offer OR idempotency request**, so conflicts
cannot be misreported as absence.

The adapter validates receipt, Inbox, account, character, offer, original
request, reward hash, state hash, lifecycle status, and normalized event
timestamp parity. It has **no public endpoint** and is hard-off by default.
All return paths hardcode:
`retryAuthorized=false`, `clientSuccessAllowed=false`,
`economyIndependentlyVerified=false`,
`payoutWriterReleased=false`, `inspectionOnly=true`.

Even if a paired v29 receipt says `paid`, these flags do **not** mean the
Gold wallet, online game save, class/profession XP, Companion Essence,
Bondstones, Party Renown, GEM_DUST and Inbox were actually updated together.
Only a future approved transaction writer with commit-time verification and a
real independent after-state audit could establish that.

## Source and tests

- `backend/online/party-event-receipt-recovery-v31.ts`: private SQL and
  strictly nonclaiming recovery validator
- `backend/online/tests/party-event-receipt-recovery-v31.ts`: malformed
  identity, timestamp, duplicate, replay, corrupted pair, hard-off and
  parameter-order tests
- `backend/tests/party-event-paid-schema-v29.mjs`: real PGlite v29 schema
  fixture extended to query recovery against one committed paired receipt,
  an absent offer, mismatched offer/key and a different account
- `backend/package.json` and hidden workflow: register the TypeScript test
  and include new sources in CI path filters

**Verification:** an isolated equivalent v31 validator and test passed local
`tsc` and Node execution before GitHub integration. The committed exact-head
TypeScript build and PGlite integration tests are **not yet verified green**;
the hidden Party Events PR remains conflicted with newer mainline sources.
PGlite is not locally installed in this session. No staging/production
migrations were run in this pass.

## Remaining release gates

1. Build the real server-only **single-transaction** reward writer, with
   account lock, source replay validation, canonical save and economy updates,
   and paired v29 receipt/Inbox commit under the same database transaction.
2. Retry that writer under concurrent sessions and injected rollback faults:
   no duplicate credit and no paid receipt without actual economy changes.
3. Read the saved revision, wallet, character and XP/companion projections
   to independently reconcile the receipt before a player-facing success.
4. Rebase/reconcile hidden draft with current main, pass exact-head CI and
   isolated staging account tests, and implement player-facing event UI.
5. Independently approve flags and rollout; do **not** mix this prototype into
   the v1.0.10 production rollout.

**Party Events, payout and player UI remain disabled.**

## Additional safety refinement — do not falsely show paid in the private Inbox

The unpublished v29 `private.read_party_event_paid_inbox_v29` previously
returned `claimed=true`, `economyApplied=true` and
`inboxDelivered=true` solely because a paired receipt/Inbox row existed.
That SQL query never checked the account's committed wallet, online save,
profession/combat XP, Companion Essence, Bondstones, Party Renown or
inventory. Those assertions were therefore stronger than its evidence.

The read-only output now says `receiptRecorded=true`,
`inboxRecordPresent=true` and
`status=receipt_requires_economy_verification`, while keeping
`claimed=false`, `economyApplied=false`,
`inboxDelivered=false`, `economyReconciled=false`.
The PGlite schema fixture asserts these exact safe flags. A real future
payout writer must publish separately reviewed, atomically reconciled
post-commit status before the client can show a successful claim.

The v29 migration is still **unapplied** and this adjustment is only on
the hidden draft branch. PGlite tests are registered but not verified as
passing on the exact integrated branch head.
