# V42 — World Boss database compatibility and account isolation (hidden)

## 17 November 2026: live staging read-only verification
Supabase staging project: **Veldryn Staging 20260924**, PostgreSQL **17.6**.
Executed metadata/aggregate-only read queries. **No user IDs, save payloads,
inventory, replay content or tokens were returned.** No writes or migrations.

Verified aggregate results:
- private `world_boss_*` tables: **0**
- private `world_boss_*` SQL functions: **0**
- account-level `public.online_game_states` rows: **9**
- relational `public.characters` rows: **9**
- accounts with multiple relational characters: **0**
- `online_game_states` column model: `account_id uuid`, `character_id uuid`,
  `state jsonb`, `revision bigint`, `updated_at timestamptz`;
  consistent with the V33 one-save-per-account reader, not a per-character save model.

This is **schema inspection**, NOT proof that hidden World Boss migrations work on
staging. Cannot test actual multi-character ownership, round settlement,
HP concurrency or wallet receipts there until a separately approved safe
staging installation and generated, authorized fixtures exist.

## Disposable PostgreSQL V41/V42 integration
- `world-boss-overview-v41.sql`: review-only private `STABLE`, `SECURITY INVOKER`,
  parameterized 2-UUID function. A single statement snapshot reads boss HP,
  status, UTC phase, live attempts, donations, frozen War Camp and account
  wallet/earned Sigils. No resource or wallet mutation.
- `world-boss-overview-v41-smoke.sql`: synthetic TWO-account fixture
  checks the signed-in account's reserved attempt, donation and reward rows;
  the other account cannot see those account-specific totals.
- Permission check: only service role is granted `EXECUTE`. Neither
  `anon` nor `authenticated` may invoke the private function.
- The reader deliberately does not call the V27 auto-freeze write routine;
  attack gating remains unavailable without a correctly frozen snapshot.
- V39 validates War Camp revision/tiers; V40 reconciles combat/guard totals;
  V41 rejects malformed totals and derives buttons only from verified state.
- All fixture writes are wrapped in `BEGIN/ROLLBACK` in the isolated CI
  database. The repository branch contains **no deployable Supabase migration**.

## Hard blockers before connection to mobile
1. Dedicated V41/V42 exact-head fixture and PG dry run **must pass**.
2. Create a reviewed, authenticated server route: derive account strictly
   from Auth; do not forward arbitrary accountId from a client or call a
   service-role SQL function from React Native.
3. Verify event-owner and read semantics against installed staging schema,
   including real 3-character and legacy 4/5-character test accounts.
4. Integrate only the approved, versioned payload with hidden UI state;
   prevent stale responses and show locked/unavailable actions until routes
   and authoritative combat writes pass review.
5. Fix account erasure/retention (#1348), CI baseline (#1345) and balance
   calibration before any staging or production rollout.

**Release remains forbidden**. This is a read-only foundation and disposable
database compatibility smoke, not a launched data endpoint.
