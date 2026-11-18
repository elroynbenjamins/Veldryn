# Party Events V33 — private read-only event status handoff

**17 November 2026 — hidden development; not a gameplay release.**

## What is now implemented

- `backend/online/party-event-readonly-status-v33.ts`: a single parameterized
  PostgreSQL `SELECT` for the *authenticated account's* latest frozen event
  enrollment. The caller must derive the account ID from a verified server
  session. The module is server-side only and has no mobile API/route.
- Source rows: frozen v11 roster and week, personal objective receipts,
  v16 supply orders, v11 locked stage choices, and the member's own v17 ballots.
  No other party's identifiers, ballots or receipt details are projected.
- Read model: event family, variation, difficulty, stage, status, frozen
  membership count, personal completed action IDs, read-only supply quantities,
  two locked-choice statuses and two own-ballot acknowledgements.
- All three action permissions are permanently **false** in this prototype:
  no claim, donation, combat or stage transition.
- The parser rejects unrecognized families, stages, oversized/negative or
  overfilled supply orders, duplicate objective receipts, premature later-stage
  actions/votes and any response that claims permissions are enabled.
- Tests: TypeScript contract, parameterized owner scoping, and disposable PGlite
  cross-account isolation, stage/ballot and supply queries. Dedicated CI now
  runs both; check the **exact latest head**, not an older run.

## App contract

The companion dev-only UI reads this schema through
`apps/mobile/src/core/party-event-readonly-snapshot.ts`. It renders an honest
"Event service not connected" state until an explicitly approved authenticated
source supplies the payload; **the current `App.tsx` deliberately does not
supply one**. The existing live Party Social roster and chat remain separate.
Any quantities in the future read-only response do not authorize donating,
fighting, activating proposed preparation buffs or claiming Day 8 rewards.

## Remaining hard gates

1. Review and approve all hidden SQL drafts (v11 onward) and PostgreSQL privileges,
   verify with the *actual current staging schema* and transaction isolation.
   Nothing was installed by this V33 change.
2. Add an authenticated server-only adapter/API that resolves the account from
   the session, not from a client payload. Test account switching, stale requests,
   login expiry, cross-party access, cached pages and private member visibility.
3. Connect the API to the client only after this server gate is authorized;
   enable verified refresh/error/retry behavior separately from general Party
   Social polling, and confirm no previous-account data flashes on switch.
4. Audit canonical gameplay evidence, order consumption and ledger idempotency.
   Perks activate only from complete verified orders; stage readiness requires
   locked ballots and independently authoritative evidence.
5. Day 8 final replay, one-time payout, account save/inventory revisions,
   rollback and deterministic combat balancing are independent blockers.
6. Run full Android QA, localized copy and accessibility checks. Keep all feature
   and payout switches off until these gates pass.

**No migration, endpoint, public RPC, paid claim, live flag, app version or
production deployment is performed by this read-only development pass.**
