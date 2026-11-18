# Party Events V39 — authenticated read transport, 18 Nov 2026

## Scope: unmounted and nonpaying

V39 adds `backend/online/party-event-read-route-v39.ts` as a **GET-only HTTP adapter factory** over V34 Supabase Auth verification and V33 one-statement, account-scoped private SQL status. It does not mount a web route, install tables, create a public Supabase RPC, activate events or grant rewards.

- The server passes only the method and Authorization header to V39, never caller-supplied account, party, character or week IDs.
- Reject non-GET methods before authentication or SQL; emit 405 with `Allow: GET`.
- On each GET, V34 asks Supabase Auth to verify the bearer token; 401 for invalid/missing identity, 503 for private SQL errors. Neither leaks private identifiers, tokens nor underlying errors.
- All responses use `Cache-Control: private, no-store`, `Vary: Authorization` and `X-Content-Type-Options: nosniff`; an account without an enrolled event receives a typed 200/null read, not another member's progress.
- The successful body is `party-event-status-http-v39` with `event` matching the private `party-event-readonly-status-v33` projection and three write flags fixed to false.
- Test `party-event-read-route-v39.ts` now runs in the dedicated Party Events hidden CI.

## Companion mobile branch

Separate draft PR #1349 decodes the exact V39 response in its **developer-only** Party Event preview, with an optional host-injected authenticated read function, 60-second refresh, two-minute server timestamp lease, account-switch and route cleanup, and explicit missing/failed/expired states. The current App deliberately supplies **no V39 provider or account ID**, because the backend route and private schema do not exist in the deployed environment.

The client can never derive reward eligibility, submit a ballot, burn inventory, begin combat or claim rewards from this response. Party-only chat continues using its existing authenticated channel.

## Release prerequisites (still open)

1. Promote and verify all hidden V11–V30 SQL migrations **on staging first**, including schema compatibility, RLS, authorization and rollback. Do not automatically copy draft files into the executable production migration path.
2. Mount an authenticated, rate-limited server endpoint only after schema and Auth transport validation. Its server-owned current-event selector must exclude stale/unrelated weeks; no account ID may be taken from request parameters.
3. Connect canonical crafting, gathering, co-op battle, supply, voting, and stage-advance receipts to trusted runtime mutations and validate real roster/character ownership and ordering.
4. Add a **real transaction-atomic** Day 8 payout writer with canonical save/Gold/Renown destination, repeated-claim idempotency, receipt and Inbox consistency, independent combat proof and multi-worker fault-injection tests. V38 is a transaction model, not this writer.
5. Run actual Android small-screen/large-font/TalkBack tests, class and difficulty balance, translations and staged rehearsal; clear the unrelated failing Edge parity, Mobile Core and Gem/Dungeon checks.
6. Keep PRs #1347 and #1349 draft and hidden until all gates pass and a separate launch decision is made.

**Recommended launch scope:** one complete 7-day story rotation using the existing four story families, three stages, flexible 2–4 legitimate Party roles, required supplies and optional buffs, 6-hour ballots, verified Day 8 shared boss and one-time claimed rewards. Postpone extra family variants and cosmetic polish rather than compromising economic safety.
