# World Boss V23 — Hidden account-raid settlement bridge (review-only)

**Status:** disabled; 15 November 2026. **Not deployed to Supabase, API routes or app.** This pass builds on V22's approved calendar: five days of shared War Camp preparation, one continuous 48-hour Saturday/Sunday battle, three account-wide attempts, then seven downtime days. Existing V22 account damage and encounter profiles are still provisional and not calibrated.

## What this pass adds

- **Authenticated reservation (not mounted):** token is resolved by an injected trusted Auth verifier; the account ID comes only from that verified principal. The request contains just event ID, idempotency key and one War Order, not character IDs/stats. A prior request is checked *before* obtaining state, RNG or snapshots.
- **All owned characters:** a private PostgreSQL reader joins authoritative online saves to `public.characters` ownership and fetches at most six; zero or over five is rejected. V12 revalidates ownership, revision, equipped copies, items and actual online combat stats for each saved character; V22 freezes the sorted 1–5-character roster and SHA-256 digest. Highest verified Combat Power bracket determines the server-managed enemy reference, not a selected weaker 'main' character.
- **Server-owned modifiers:** freeze verified War Camp and all three boss phase profiles. The reservation SQL now locks the event first and chooses the matching phase/profile digest from current shared HP before V18 allocates one of the three account slots. It checks account, event, request, order, version, roster digest and owned-character identities. No derived phase or damage may come from the client.
- **Recoverable worker:** a trusted job checkout reads the frozen JSONB packet. The roster is serialized as a JSON *string* within the packet so Postgres JSONB object-key reordering cannot silently invalidate the V22 order-sensitive combat digest. Every roster, phase, rules version, War Camp and encounter digest is revalidated before deterministic simulation. The existing V22 engine generates the real per-character replay and provisional account-wide world damage.
- **Replay-first settlement:** persist an immutable content-addressed battle replay *before* calling the private V18 exactly-once account/global-HP settlement. The V18 event row lock, worker generation, lease, remaining HP cap, residual Echo and milestone crossing ledger remain authoritative. Retries of committed/voided attempts return the original result rather than spending another attempt. No client-controlled damage or score is accepted.
- **Isolated tests:** synthetic authenticated multi-character fixtures cover lost ACK, attempt cap, replay upload failure, digest tampering, end-of-weekend new-reservation closure, recovery of previously reserved work, and duplicate worker settlement. V22's PostgreSQL boundary tests still run separately with **BEGIN/ROLLBACK** and disposable Postgres. Nothing calls production.

## Boundaries and remaining blockers

1. **The code is a contract, not a deployed online service.** There is no HTTP handler, queue adapter, authenticated production Auth implementation, live owned state enumeration, private SQL migration or permission grant. V22/V23 stays hidden.
2. **V22 fight tuning is not launch-ready.** Its generic 'World Sweep/World Cast' engine enemy is not yet the authored 14-round Hollowroot/Sunscar/Frostmarch kit. Its 100/12/7/5/4% global damage sharing is provisional and must be calibrated for 1–5 real character accounts.
3. **World Guard and complete rewards are not in this worker.** The prototype supplies a local guard value of zero, only as a hard-disabled placeholder; never expose it to live leaderboards, Sigils or boss rewards. Required: authoritative guard ledger, role-normalized impact, account-wide milestone and 100-Sigil payout transactions.
4. **Server-layer production requirements remain:** trusted CSPRNG, verified Auth, DB lease recovery, atomic donation freeze and consistent event calendar, actual replay storage, structured audit log, abuse limits, SQL two-worker concurrency/recovery security tests, owner-bound data access, soak/performance testing and device UI.
5. **Release gates:** full dedicated World Boss CI and review, migrations in staging under transaction with rollback checks, real-content calibration, privacy/security and economy sign-off, feature flag default OFF, release version intentionally after Android 1.0.10.

## Changed files

- `backend/online/world-boss-account-service-v23.ts` — unmounted reservation and worker.
- `backend/online/world-boss-account-pg-v23.ts` — server-only parameterized PostgreSQL adapter.
- `docs/roadmap/world-boss-weekend-reservation-v22.sql` — V22 reservation integrity and locked phase selection (draft SQL, never migration).
- `apps/mobile/tests/world-boss-account-service-v23.ts` — mocked ownership, replay, attempts and HP proof.
- Dedicated World Boss TypeScript configurations/workflow — compile and run the new V23 test.
