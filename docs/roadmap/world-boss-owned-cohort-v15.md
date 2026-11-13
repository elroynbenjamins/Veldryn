# World Boss V15 — server-owned Combat Power cohort bridge

**2026-11-13 · Hidden / development only.** Follow-up to [V14 five-bracket review](world-boss-bracket-audit-v14.md).

## What V15 adds

`backend/online/world-boss-owned-cohort-v15.ts` is a **read-only review adapter**.
Its server-side source enumerates (account ID, selected character ID, expected game
revision), reads that character's server-owned GameState and reuses the exact
online co-op equipment/stat/companion/gem Combat Power derivation. It does not
accept any client-provided Combat Power, class role, equipment JSON or arbitrary
selected bracket. The owner, character and expected revision must agree with
the loaded GameState. It also validates forged-copy ownership, equipment
legality and positive finite Combat Power before V14 consumes the sample.

The only output is V14's **anonymous five-bracket report**: proposed CP
breakpoints, per-band sample counts and power min/max, class-role counts and
coverage warnings. Account IDs, GameStates and individual CPs are kept inside
the call and are not returned.

### Server-owned source is a contract, not yet a real database integration

The injected `WorldBossServerOwnedCohortSourceV15` must be implemented by an
authorized backend task and query `public.online_game_states` with appropriate
service-side ownership and data-retention rules. Its enumeration must be made
from an independently trusted account/character selector, not a client
request. The runtime checks are *defense in depth* and do not authenticate a
source by themselves. Neither the source implementation nor any online API,
service role, migration, event, wallet or account export is included here.

The review is not transactionally consistent across 100+ accounts, and it
does not prove selection representativeness. A future real-account exercise
requires privacy/authorization approval, a stable snapshot policy, opt-in or
other permitted data basis, and a nonpublic aggregated export.

## Synthetic validation

`apps/mobile/tests/world-boss-owned-cohort-v15.ts` constructs 120 separate
fixture account/character pairs from nine existing classes and T1–T4
regional equipment rules. It verifies that the aggregate audit receives
120 authenticated-by-fixture server-owned states, produces five *unapproved*
brackets, and cannot return account IDs. It tests reject-on-failure behavior
for duplicates, too-small populations, cross-account ownership, stale game
revisions, forged equipped-copy IDs and invalid server clocks.

This tests **code boundaries**, not live player balance or actual database
authentication. The V15 focused CI extends V9–V14 tests without any deploy,
real currency, online queue or release toggle.

## Remaining launch gates

1. **V14/V15 CI green.** Keep source changes draft while new validation fails.
2. **Security-approved owner-bound repository**, authorized service-only read
   path, stable selection timestamp and sensitive-data controls.
3. Verify five live-player CP brackets against authentic class/gear/gem/Faith/
   companion distributions, including low-power and mixed-bracket Echo parties.
4. Approve the mapping of five CP bands onto server-frozen boss phase threat
   profiles; four V13 synthetic equipment bands are not sufficient.
5. Build and stage transactional account attempt reservations, War Supplies
   inventory debit/rollback, committed HP settlement and exactly-once 100-cap
   Sigil reward ledger. Do not activate until review/approval.

**No production/staging database reads or writes, no changes to existing World
Boss rules (three attempts, 14-day cadence, seven-day event), and nothing live.**
