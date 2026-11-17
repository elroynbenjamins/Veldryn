# World Boss V27 — War Camp resource donations, goals and Saturday freeze

**Date:** 15 November 2026. **Status:** hidden review-only engineering branch. Not merged, migrated, deployed or included in Android 1.0.10. Builds on V26 authored settlement and the fixed calendar:

- **Monday 00:00–Saturday 00:00 UTC:** five complete days to donate materials; server validates ownership and deducts actual inventory resources.
- **Saturday 00:00–Monday 00:00 UTC:** 48 uninterrupted World Boss battle hours. The server freezes War Camp buffs once at the cutoff; no new donations during battles.
- **Following Monday–Sunday:** seven cooldown days. Event rhythm remains 14 days; three account-wide fight attempts unaffected.

## What's implemented in the hidden code

**Server-authoritative resources.** The client may select only an owned character as the material source, one fixed recipe and a unique request key. Account ID comes exclusively from server-verified Auth. The server-controlled catalog contains **12 real Veldryn recipes (T1–T4 × Fortifications / Field Provisions / Siegecraft)** from the checked-in v3 War Supplies CSV, including the Sunscar-derived T4 items rather than Frostmarch reagents. Recipes are checked against the real item catalog. No premium items, equipment, rare binding resin, pets or unique forged copies may be donated.

**Actual atomic debit.** A *draft* private PostgreSQL 16 stored procedure locks event → War Camp → one owned `public.online_game_states` save, revalidates the stored item/quantities, deducts only **unslotted `state.inventory.stacks`** for that character and increments its save revision. One transaction also increments one community track and inserts an immutable donation receipt. Duplicate idempotency keys with the same character/recipe return the old receipt without a second debit. Reusing a key for another source/recipe is rejected. Insufficient resources, missing ownership, duplicate recipe material IDs, closed tracks, over-two account attempts or time cutoff abort the complete transaction (no partial inventory change). **Bank/Overflow are not debited**: their cross-character/shared-storage semantics must receive separate review before enabling that source.

**Two War Supply bundles per account/event**, shared across all three tracks. A distinct, immutable receipt is created for each successful donation, with account ordinal 1 or 2; repeated submission neither decrements the source inventory twice nor increases progress twice. Donation rewards are only **eligibility facts**; World Sigils are **not minted or awarded** in this pass.

**Three shared progress lanes.** Admin event creation preinstalls goals and 12 immutable recipes *before* its Monday launch. Goal proposal uses approved server-side eligible account estimates and bundle uptake (not client counts). Per-lane Tier I and II thresholds are fixed at creation. A private read-only progress projection shows counts, both thresholds, revision and whether bonuses are frozen.

**Saturday locked snapshot.** A private function locks the event and freezes the exact V11 snapshot with canonical SHA-256 digest and calculated tiers:
- Fortifications: Tier I −5% boss damage, Tier II −10% total.
- Field Provisions: Tier I +5% starting HP, Tier II +5% effective healing.
- Siegecraft: Tier I +5% Guard breaking, Tier II +5% weak-point damage.

Progress reading on/after Saturday performs the freeze automatically; repeat freezes return identical snapshots. The **V26 authored reservation adapter now calls a V27 wrapper that requires the exact durable frozen War Camp digest**, then delegates to the V22/V18 event-row-locked reservation and three-attempt transaction. The same private runtime factory supplies the frozen War Camp source and the donation repository, preventing a stale progress preview from changing live raid modifiers.

## Security and integrity

- Private schema; `SECURITY INVOKER`; no public REST, anon or authenticated grants. Server-only parameters and database function names are fixed.
- Row-lock time is taken **after acquiring the event lock** to prevent a blocked Friday donation from being accepted past the Saturday cutoff.
- Goal thresholds and the original freeze cannot be silently updated. Recipe policy is installed only for a **future draft event**, 12 unique tier/track positions, with no after-start reinitialization.
- The user-selected character must be owned by the verified account. The authoritatively saved inventory is debited; no client material quantity, predicted buff, price, Gold balance, or World Sigils enter the procedure.
- Existing online-game save concurrency, state revision checks and cross-character bank reconciliation are still launch prerequisites. The draft SQL must not be applied to Supabase without review of the live `online_game_states` schema and lock ordering.

## Regression coverage

- `apps/mobile/tests/world-boss-war-camp-transactions-v27.ts` verifies Auth rejection, private SQL parameterization, the 12 real recipes, goal forecasts, authentic receipt material fields, frozen snapshot digest and progress. This does **not** debit production resources.
- `docs/roadmap/world-boss-war-camp-transactions-v27-smoke.sql` runs in a **disposable** PostgreSQL 16 CI service. It covers an owned inventory fixture, receipt deduplication, exact stack costs, untouched bank/physical copies, account bundle cap, failed debit rollback, week-preparation cutoff, frozen immutability and blocked anon/authenticated SQL calls. It tests the real current UTC prep/weekend branch without a privileged fake time override.
- `docs/roadmap/world-boss-war-camp-policy-init-v27.sql` and its fixture check pre-event 12-recipe initialization, fixed goals, reinit denial and immutable goals.
- `.github/workflows/world-boss-v12-validation.yml` compiles and executes the V10–V27 tests and disposable SQL.

**Not complete / remaining passes:** Existing V26 is still a hidden draft with no public API, hosted Auth wiring, production DB migration, real account/bank interaction, live event scheduler, World Sigil wallet, mobile War Camp screen, account eligible-population calibration, or device replay interface. The 14-round authored engine still needs parity tests against full live timed combat (including gems/companions), two-session SQL stress tests, session/worker recovery review, staging inventory concurrency proof, and explicit release approval. **No user resources have actually been consumed by this code review.**
