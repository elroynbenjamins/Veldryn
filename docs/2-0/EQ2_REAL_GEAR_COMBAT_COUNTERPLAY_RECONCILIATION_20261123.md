# Veldryn 2.0 — Real Forge Gear + Skills/Combat Counterplay Reconciliation (2026-11-23)

**Review-only branch:** `integration/eq2-real-gear-counterplay-20261123`, draft PR #1665, stacked on hidden Equipment 2.0/Combat source PR #1661 and Forge V6/V7. NOT merged to `main`, not a release branch.

## Pass A — One real EQ2-equipped support counter

- The actual server `compileServerSkillBuildV2` now recognizes **Stonecaller River Stone, variant 2 (Cleansing Stream)** as an intentionally conditional, high-HP debuff/DoT counter. The V2-only `lowest_hp_ally_with_dot` selector can prioritize an afflicted ally, and `ally_below_50_or_dot` can activate on a debuff-only target.
- The EQ2 branch's original hidden `engine.ts` contained a **DoT-only** cleanse, despite comments mentioning debuffs; the separate Combat counterplay PR #1637 had the missing V2-only code. This reconciliation ports that precise behavior without replacing any of the original frozen Forge rarity/quality, Tenacity, class Ability Damage or Healing Power logic. V2 class cures remove harmful periodic DoTs and active harmful modifier debuffs, emitting real `status_remove` events. V1 remains DoT-only.
- The four-player original-Forge fixture has **one distinct, source-minted original Equipment 2.0 copy per player**, including canonical recipe, craft job, start/claim receipts, original XP award, reservation and equip-move history. Its Stonecaller counter variant must cure both a real authored curse and a DoT, retaining four source affix and item identities; the ordinary variant must not borrow its cleanse.
- A separate engine-level regression ported from counterplay #1637 verifies legacy V1 status selection, V2 debuff-only targeting, original Stonecaller source compilation, **Dawnkeeper's independent Purifying Light alternative**, and deterministic replay. This is **not** proof of equal Combat Power or final boss balance.

## Pass B — Authored Boss 2.0 replay signals beside real EQ2 equipment

- Reused the independent read-only `boss-telegraph-projection.ts` and source fixtures from hidden Combat counterplay #1637. A signal is accepted only for a real authored V2 boss, engine-emitted `cast_start`, original authored cast duration, and legitimate `cast_complete`/`interrupt`/`status_remove` events. Spoofed tooltip signals, fake past-completion interrupts, and legacy combat participants are rejected.
- A second test directly prepares the canonical `BOSS_EXP_BELL` authored boss through the hidden server-owned Boss 2.0 compiler, compiles four actual original Forge-equipped class actors, executes deterministic Combat V2, and projects real Soul Curse cast timing from the result.
- **Important integration boundary:** `compileEnemiesForCombatV2` deliberately prohibits mixing generic Enemy V2 archetype augmentation with pre-authored boss kits. The authored boss example is therefore a deliberately separated hidden server-compiled review path. It does **not** install a route accepting user-supplied boss tags, and it does not bypass public combat authorization.

## Existing hard release gates

1. Fully authenticated privileged account row with PostgreSQL transaction locks, final CAS revision check and four-player coordinated reward settlement. The Equipment V2 QA callback and staging-row inspector are **not** live authentication.
2. Actual approved 2.0 Equipment sets, innate percentage stats and all stat/trait/gem channels. The 15 existing Forge set families and 48 expanded concepts remain non-executable.
3. Full shared source reconciliation with the other hidden counterplay PR #1637: class traits, boss kits, dungeon state, companions, exact-copy trait receipts, Boss/Party Events, Player Market and generated Edge bundles; no assumptions of a clean semantic merge.
4. Final Combat Power formula, equal-CP counter-build tests, UX/theme review and coordinated 2.0 launch approval.

**Validation:** strict private compilation and tests were wired on this branch. Do not claim passed exact-head checks until the resulting GitHub Actions finish.

No deployed gameplay routes, production/staging DB writes, gear issuance, Player Market trades, release flag, main merge or UI changes.
