# Party Events V43 — trusted canonical activity-credit handoff

**18 November 2026 — hidden, unmounted, nonpaying.** Source integration work on top of merged Party Events V42 mainline. No feature flags, Event Points, SQL migrations, player inventory, account rewards, app tabs or live endpoint were enabled.

## What was implemented

`backend/online/party-event-activity-credit-worker-v43.ts` is a server-only private credit bridge for three real, already-completed **canonical** gameplay receipt classes:

- **Idle gathering:** canonical `public.idle_claim_receipts.claim_id`; Party Events Stage 1 only (the private V14 function verifies elapsed time, source category and fully post-enrollment window).
- **Crafting:** canonical `public.craft_receipts.receipt_id`; Stage 2–3.
- **Co-op combat:** canonical successful `public.coop_node_results(run_id,node_id)`, with a specific verified **human** enrolled participant; Stage 2 only. Never use Echo participants or failed/solo/noncombat nodes.

The worker selects event/roster identity from trusted relational records with **one parameterized SQL statement** and then invokes `private.credit_party_event_activity_v14` within that statement. It cannot accept a caller-supplied Party ID, event week, stage, point amount, item quantity or reward selection. Any overlapping eligible enrollment is blocked by `count(*) OVER()=1`, not arbitrarily resolved.

A deterministic 75-ish-character request key is derived by the server from the canonical source identity, not a device-supplied request ID. The existing V14 routine holds the event-week row lock, verifies source evidence independently, caps activity Event Points and recovers exact replays. The worker exposes a `pointsAddedThisInvocation` delta of **zero** for an exact replay, even though V14 also reports the original `eventPointsGranted` receipt value. The private result must be validated and cannot leak a SQL exception.

## Verification

- Added TypeScript adversarial tests for all three source types, owner-bound query arguments, deterministic keys, forged identifiers and malformed/replayed/private SQL replies.
- Added executable PGlite tests that run the actual three `WITH candidates ... credit_party_event_activity_v14` source SQL strings against disposable canonical receipt, party and roster fixtures. The private `credit_party_event_activity_v14` is a **no-op return stub inside this particular PGlite test**; its real cap/lock/duplicate-source semantics are covered separately by the V14 SQL suite.
- PGlite verifies a source is linked to its own enrolled Party, an unrelated actor or nonexistent node gets no credit, a future enrollment cannot mask a current source, and overlapping active enrollments suppress the query entirely.
- Wired both tests into the hidden backend Party Events CI. These source tests do not authorize production settlement.

## Important remaining gaps

1. **Runtime producer registration:** Existing live gathering/craft/co-op settlement paths are not yet calling V43. It must be invoked only by a trusted post-commit/outbox worker with an internal privileged PostgreSQL connection and a durable retry policy. It must never be callable from mobile or a generic player RPC.
2. **Objective receipts:** V43 credits recurring activity only. One-time Stage 1/2/3 objective receipts are separate V12/V13/V15 contracts and still require a trusted V10 locked-stage context hash. Do not guess that hash or award special EP based on the activity credit alone.
3. **Progress advance:** V16 supply donations, V17 ballots and stage transitions exist as unpromoted private SQL drafts. They need explicitly reviewed trusted runtime integration, persistent staging schema and full multi-worker tests.
4. **Day 8:** The real one-transaction economic writer remains unfinished. The old `partyRenown` save field no longer persists; an approved persistent destination is required before any Gold/XP/Essence/Renown reward is granted.
5. **Launch gates:** Current-main exact-head CI, Android/native UX, localization and 9-class balance, permission review, staging-only installation, pilot enrollment and rollback plan.

Do not represent V43 as an activated game feature. The public app/production Supabase remain unchanged. **Keep draft PR and no-deploy gate** until the above blockers are cleared.
