# World Boss V20 — consented Echoes and immutable event modifiers

**2026-11-13 — Hidden, review-only.** Stacked after #1081 (V19). No migration,
live route, World Boss event, World Sigils, rewards, inventory debit, or real
account reads have been activated.

## Echo authorization

V20's `world-boss-consented-echoes-v20.ts` accepts only a **private,
server-owned grant catalogue**. Each candidate must have an event-specific
consent revision, active grant, non-expired seven-day sharing window,
authoritative account/character identity, current game revision and a
server-owned GameState. The V12 verifier recomputes actual equipped skills,
equipment, sockets, gems, companions, and CP from that GameState; V9 can
select only a single Echo per owner, within ±1 verified power bracket, into
exactly 1 Tank / 2 Damage / 1 Support. Ineligible or expired grants are
excluded; unfilled roles receive deterministic NPC backfills. No Echo owner
earns currency from lending and no other account's private inventory or
statistics are written.

The **draft private SQL** `world-boss-consent-guard-v20.sql` adds an
event-scoped consent table and a V20 reservation transaction. It invokes the
V18 reserve under the event lock, then re-reads **only selected Echo grants**
with row-level `FOR SHARE`, ensuring their grant revisions and ownership
remain valid. A concurrent revocation cannot commit between the grant check
and reservation commit. Any failed grant causes the *whole reserve statement*
to roll back, including its ordinal claim. A same-key retry returns its
already-frozen receipt even if a lender revokes consent later; revocations
block *new* use, not an already-begun attack. The consent table is private,
RLS-enabled and grants no public or mobile access.

A malicious server source can still fabricate a consent row, and the
internal V20 adapter alone does not prove its source is authorized.
Deployment requires a reviewed grant/withdrawal endpoint with current
owner authentication, durable revision increments and actual two-connection
revocation contention tests.

## War Camp and boss profiles

The V20 server-only rules source loads one V11 War Camp digest and **all
three** V13 encounter profiles (armored, exposed, enraged) for a fixed server
gear band. A draft server-controlled mapping converts five CP brackets to
four encounter bands; neither the mapping nor the underlying attack/guard
numbers are approved for live balance.

The V9 order-sensitive SHA256 roster remains a serialized string nested
inside JSONB. V18 SQL is extended *on this stacked V20 branch only* so that
under the **event row lock** it selects the digest corresponding to the
actual, current boss phase. The event's phase cannot be guessed before
another worker settles global HP. It also binds the V11 War Camp digest.
The database freezes the selected digest alongside the roster, seed, order,
rules version and event HP phase.

At worker checkout the server verifies the War Camp V11 digest, the V13
profile digest for the **selected locked phase**, all three profile
configurations, the verified V9 roster and every selected real Echo's consent
identity. It then runs the existing 14-round engine with those immutable
modifiers, content-addresses the replay (including both modifier digests)
and only then calls V18 atomic HP settlement. Altered snapshots, profiles
or different replay inputs fail closed.

## Testing

- `apps/mobile/tests/world-boss-consented-echoes-v20.ts`:
  3 real synthetic class roles; V9 4-role formation; revoked lender → NPC;
  duplicate owners, stale GameState and forged equipped-copy rejection;
  V11/V13 digest verification and a V19/V20 frozen replay integration test.
- `docs/roadmap/world-boss-consent-guard-v20-smoke.sql`:
  disposable PostgreSQL transaction checks for revoked grant rollback,
  subsequent successful grant, phase-locked profile selection, revoked-after-
  reservation no-reroll and no public reserve EXECUTE access.
- Existing V17/V18 disposable 16-session reservation races and 12 simultaneous
  HP settlements plus V7–V19 regressions still run in the focused workflow.

**Still launch-blocking:** real server-owned grant persistence and consent
UX; confirmed private PG driver/permissions; approved CP cohort and
encounter tuning; proper War Camp donation inventory transactions; replay
artifact storage and recovery; live Echo consent revocation semantics across
actual owner state updates; reward entitlements and exactly-once 100-Sigil
wallet cap; full staging and release-gate review. Never apply any SQL in
`docs/roadmap/` directly to Veldryn staging or production.
