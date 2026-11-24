# Combat 2.0 — six-boss verified-gear calibration (private)

Date: 2026-11-21. Target: draft PR #1430, child of Combat 2.0 foundation #1377.
**No live gameplay, boss stats, authored cast timing, app UI, migrations, rewards, or rollout flags changed.**

## What changed

Added `backend/src/server/combat/v2/__tests__/boss-full-gear-pacing-matrix.ts` and a dedicated test step in `.github/workflows/combat-v2-skills-validation.yml`.

216 synthetic real-engine combat encounters = six named regional bosses × nine classes × two V2 specializations × two verified gear quality profiles. Each scenario deliberately runs the **actual** V2 combined entrypoint and trust boundaries:

- Class-only server baseline; authenticated-looking synthetic class/level and skill IDs; two unlocked active skills with the first authored variant; specialization; level-gated capstone at 50+.
- Three distinctly owned and verified equipment instances: helmet + chest + weapon, all source-checked through their item definitions and instance ledgers (not direct stat injection).
- Two-piece role-eligible armor set with an authored **synthetic** +4% HP modifier; genuine set resolver and sources asserted.
- Both profiles run through the real 0–100 quality curve and common/rare rarity ladder. Low profile: common, quality 0, no affixes. High profile: rare, quality 100, plus authored **synthetic** +6% attack affix on weapon and +4% HP affix on helmet. Actual affix slot/range/count/cap and owner checks must pass.
- Boss kits are persisted in a synthetic server-only receipt, re-verified using the deterministic enemy-kit authoring contract. The same exact encounter ID, seed, base boss and class/spec pair are used for low/high comparisons.
- Double-replay of all 216 encounters verifies deterministic outcomes. Assertions cover three gear base sources, one two-piece set effect, zero/two affix receipts, stat progression for attack/HP/defense, unchanged source actor, resource caps, zero unknown boss mechanics, and bounded combat events.
- The existing read-only `observeBossPacingV2` reducer captures 70/35 phase coverage, cast/interrupt counters, early pre-tell wins/wipes, timeout-with-high-boss-HP counts, HP remaining and P10/P50/P90 duration.
- Per-boss comparison reports low vs high outcomes, phase exposure, median boss HP, first-tell losses and timeouts. No auto-approval or synthetic win-rate target is defined.

**Fixture limitations** are deliberate. Only three of ten equipment slots are populated; real T1–T5 base stat budgets, per-rarity affix counts, socket gems, advanced equipment traits, potions/tonics, companions, player-market scarcity, 2.0 crafted sets and active counterplay input are not yet integrated. The six real boss identities and authored mechanics are exercised, but four regional bosses still use synthetic base HP/attack. The 30-second simulation window is **not** the final boss timer. Do not call this a complete gear loadout or final launch balance.

The 2.0 solo authority callback here is private synthetic QA and cannot sign a database receipt. Actual server source/ownership and persistence were checked separately in the existing build/PG17 tests.

## Review gates before tuning

1. Verify exact-head CI: compile, 216 synthetic combined gear fights, 108 baseline boss fights, 540 cross-tier test, old dungeon and Q-mode parity. Do not claim green until confirmed.
2. Inspect low/high comparison deltas by boss: how many classes win, time out at high enemy HP, miss phase 70/35, or win/wipe before a cast is visible.
3. Add eventually the remaining seven slots, real tier recipes/gear budgets, approved affix/set ceilings, gems, traits, food/potions and companions. Verify worst-case rolls and multiple independent encounter seeds.
4. Decide **separate** tuned ranges for normal/elite clears vs 6-boss fights; strong gear should accelerate play without invalidating every boss tell. Reserve boss 35% phase visibility and prevent indefinite HP-wall timeouts.
5. Only after signed-off comparison data propose changes to HP scaling, defense, shield amounts, cast cadence, damage and short vulnerability windows. Do not adjust live fights from unfinished synthetic baselines.
6. Keep the existing UI design-review gate for any changes to boss screen themes, icons or mobile layout.

## Release status

This is a private, draft-only development child branch of the unmerged Combat 2.0 foundation. No direct migration to production, deploy, server feature activation, mobile UI insertion or merge to `main` is permitted as part of this calibration pass.
