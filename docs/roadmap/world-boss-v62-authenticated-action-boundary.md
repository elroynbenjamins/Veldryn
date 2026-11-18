# World Boss V62 — current-event owner-scoped action gateway

**Hidden, unmounted, 18 November 2026. No battle rehearsal, production
migration, HTTP handler registration, public feature activation or payout.**

The V51 status reader already chooses a single global 14-day event from
trusted server Auth and a server-only Monday launch epoch. The old V26
account raid, V27 War Camp donation and V28 claim services each accept an
`eventId` in their internal selection, which a future mobile transport must
NEVER trust.

The V62 private gateway `backend/online/world-boss-current-action-v62.ts`
closes that selection gap without touching the live gameplay API:

- Accepts only an authenticated `POST` with strict JSON fields, one action
  (`raid`, `donation`, `claim`) and a stable request ID.
- Rejects all query selectors and body-injected `eventId`, `bossId`,
  `accountId`, `damage`, `seed`, `quantity`, and extra fields.
- Resolves a single current event through the V51 account-private,
  owner-authenticated status reader, then uses only that event ID in private
  V26/V27/V28 service calls.
- Re-authenticates the same token at the moment it calls the downstream
  service. A different owner (such as sign-out/account switch) fails closed.
- Leaves account-character ownership, 3 total raid attempts, 2 total
  donations, War Camp material debits, exact replay proofs, ledger and payout
  math with the existing transactionally validated DB routines.
- Uses V61 transaction triggers to reject NEW writes when operators pause an
  action. A valid idempotent retry may still retrieve its existing receipt.
- **V63 mandatory private gate attestation** requires an operator-controls row
  for the server-selected event, all three V61 receipt triggers enabled and
  no unsafe client/operator grants. No V63 attestation dependency means a
  generic 503 before calling any raid/donation/claim service. It is a
  source/SQL readiness check, not a staged gameplay rehearsal or a substitute
  for the final transaction-level V61 gates.
- Returns only a no-store response and generic 400/401/405/409/503 errors;
  never returns SQL details, account selectors, token or a private stack trace.
- Does not create a server route, mobile action button, network client,
  Supabase public grant, default launch epoch or a synthetic event.

**Important:** This is a private host adapter. It does NOT eliminate the
need for an approved migration, a trusted and tested Auth host, V57/V58/V59
privacy integration, a real current-event provisioner and V61 operator
controls before first production release. In particular, older event claims
after the next global rotation still need a separately reviewed server-owned
history/claim selection flow; the caller cannot choose an arbitrary old boss.

The isolated V62 test invokes only trusted projections and mocked service
receipt boundaries, never the authored encounter/combat simulator. It
checks rejection of forged request fields, owner changes, missing events,
privacy holds, safe status response, raid receipt retries, exact donation
receipt forwarding, claim forwarding and neutral V61 maintenance errors.

**User product decision:** first actual combat is live; no staged gameplay
rehearsal is required. Routine compile/SQL/transport safety tests remain
necessary and do not constitute a gameplay rehearsal.
