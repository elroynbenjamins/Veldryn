> **Superseded design checkpoint (19 Nov 2026):** The active *unreleased* revision is [T1–T5 seven-stat launch gate](./2026-11-19-t1-t5-seven-stat-rolls-release-gate.md), based on new **weapon v6 / nonweapon v5** rolls. The eleven-stat / T2–T5 details below describe the older PR #1374 / #1404 candidate and must not be used for release approval. Older v5/v4 saved receipts remain compatible.

# Veldryn — T2–T5 randomized equipment rolls release candidate

**Prepared:** 2026-11-18  
**Source PR:** #1374 (draft, unmerged), based on current main  
**Possible next Android release:** **1.0.11**, *not approved or built yet*  
**Related Combat 2.0 work:** #1379 and draft PR #1380 (excluded)  
**Release gate:** #1367  
**Deferred ability issue:** #1383

## Verified starting state

- Production database `public.app_release_policy` reported `latest_version=1.0.10`, `minimum_version=1.0.10`, `force_after=null` on 2026-11-18. Release notes for 1.0.10 were published 2026-11-17. **Do not describe 1.0.10 as unreleased.**
- Read-only aggregate of `public.online_game_states.state.account.craftedGearInstances` found **245 existing crafted-copy records in production**, none with Weapon/Equipment Bonuses and none with Ability Damage. This is a scoped snapshot, *not* a claim about other legacy inventory records. The same path contained **0 records in staging**; seed isolated QA copies with an authorized staging test account for proper integration testing.
- Production `gameplay` and `coop` functions last updated 2026-11-17; no new early-release roll versions deployed.
- GitHub reported a high repository Actions queue (>1,800 queued at review). Exact-head PR tests must finish; queued is not green.

## The player-facing update (candidate)

New **forged** equipment only, by class/role:
- T1: no bonus rolls; T2: one smaller roll; T3–T4: one normally or two at Epic+; T5: two independent stats.
- **11 active early-release bonus attributes**, not 12/13: Critical Rate, Critical Damage, Haste, Penetration, Accuracy, Max HP, Armor, Ward, Evasion, Healing Power and Potency.
- Common 0.85×, Uncommon 1.0×, Rare 1.2×, Epic 1.35×, Legendary 1.45×, Mythic 1.5× on bonus ranges (weapon vs accessory slot budgets differ). Existing Quality stays independently meaningful.
- Weapon roll receipt version **5** / nonweapon version **4**. Previous weapon v1–v4/nonweapon v1–v3 receipts remain readable; exact copy IDs, hashes, Bank transfers, gem destruction, preexisting sets and old equipment are not rerolled.
- Generic `Power` no longer mints as a random affix. **Ability Damage** and **Tenacity** also do not mint until combat-result and status-resistance parity arrive in Combat 2.0. Previous development receipts with Ability Damage or Tenacity stay readable under their original version (never silently reminted).
- Inspect, Compare, Forge result and bulk claim clearly display saved stat, rarity-scaled range and roll strength. Conservative copy retention does not auto-sell rolled gear merely for lower Quality.
- New Healing Power rolls are also projected into a server-derived co-op `healingPower` snapshot (PR #1374), with regression test for frozen combatant and exactly one multiplicative application. This is NOT a claim that all secondary stats have identical effects in every mode.

## Integration checkpoint (Nov 18, reconciled candidate #1404)

- **Integration branch:** `integration/1-0-11-stat-rolls-main-parity`, branched from `main` at `7943b3ab`; source draft remains #1374. The branch is a **draft validation candidate**, not yet merged or released.
- Integrated 19 nonconflicting source/tests/docs files; manually reconciled seven conflicting gear/runtime/test files. Preserved main's retired-item recovery, finite claim-roll validation, bounded crit chance, missing-roll version safety, dismantling source and regression coverage. Existing main World Boss and Party Event test fixes are retained unchanged.
- `backend/online/coop-loadout.ts` applies exact-copy Healing Power once to the server-owned co-op healing snapshot; its focused test checks snapshot/hash consistency.
- **Edge status:** regenerate gameplay and co-op bundles from this combined branch through the temporary guarded PR workflow. The generated artifacts from old source #1374 alone are **not** acceptable for this integrated branch.
- **Latest read-only state audit:** production has 457 online game-state rows and 230 crafted-copy records across 22 rows exposing the current path; staging has 9 game-state rows but no crafted-copy arrays. Counts are point-in-time, not a substitute for staged mint/reload QA.
- **Android:** the repository's native AAB/emulator-startup workflow now includes these release-candidate files in its PR triggers. It is not a signed EAS build or physical-device validation.
- Review/remove temporary generation workflow before final main merge; do not ship early rolls while installed 1.0.10 clients lack version-5/4 support.

## Version deferral QA (Nov 18)

- [x] No newly minted Ability Damage or Tenacity rolls on weapons and nonweapon equipment; only 11 meaningful options across all nine classes.
- [x] Old copies remain readable: weapon v1–v4 and nonweapon v1–v3, including earlier developer-minted Ability Damage/Tenacity.
- [ ] Exact-head automated tests still queued: the GitHub Actions queue is a separate infrastructure blocker, not validation evidence.
- [ ] Confirm all remaining eleven bonuses have a meaningful released combat outcome, with the correct mode-specific tooltip. Do not silently claim Tenacity gameplay.

## Non-negotiable release checks

- [ ] Exact-final-head **Mobile Core** 400+ tests and TypeScript/Expo compatibility.
- [ ] **Unique forged equipment** (including online gameplay + co-op loadout tests), rarity/version migrations, exact-copy Bank and storage, class/slot restrictions and retention.
- [ ] Mobile UX, Gem/Dungeon, Combat Balance, Regional Enemies, Market/Guild Shop, v1.0.9 regression checks, **Edge bundle parity** for both gameplay and coop.
- [ ] Remove `temporary-11-stat-integration-edge-sync.yml` from the integration PR after successful regeneration of **both** canonical bundles, then rerun exact-head validation.
- [ ] Audit every new stat's actual effect in solo combat, server-side co-op/dungeon and boss modes. Mode-dependent effects must be accurately disclosed; reject misleading tooltips. Issue #1383 remains open for genuine Ability Damage in 2.0.
- [ ] **Staging**: deploy only the new validated `gameplay` and `coop` artifacts to Veldryn Staging. Test with a dedicated QA account and new T2/T3/T4/T5 Forge actions: idempotent retry, reload, cross-character Bank, ownership, slot invalidation, disabled/locked auto-sell, failed network acknowledgments, dungeon-ready frozen loadout, test all classes/rarities. Leave production untouched.
- [ ] **Android staging APK** via EAS profile `staging`; `preview` points at **production Supabase** and is **not** a staging substitute.
- [ ] **Client compatibility**: 1.0.10 does not know weapon v5/nonweapon v4. Avoid minting new formats on live backend while older clients remain supported. Stage the compatible Android update, review the app update gate, then coordinate server activation with minimum-required Android 1.0.11. Do not change minimum/latest policy prematurely.
- [ ] Verify actual **EAS remote Android build number** is greater than last submitted Google Play versionCode; signed Android AAB, internal Play track/device smoke, crash-free startup, Store policy and rollback acceptance. Native unsigned CI artifacts are NOT final Play builds.
- [ ] Confirm only this early-roll scope is released; hidden World Boss, Party Event, Player Market, Dungeons/Skills/Combat 2.0 and existing production feature gates stay as before.
- [ ] Approve explicit production go/no-go. Never treat an open draft PR, queued workflow, changed source files or staged QA as a completed deployment.

## Rollback and safety

New weapon v5 and armor v4 versions are **irreversible player-owned receipts** after a live Forge. Rolling back to backend code that does not understand weapon v5/nonweapon v4 may hide earned bonuses; prefer a **forward-compatible disable-new-mint** patch or maintenance gate while preserving all already minted receipts and their underlying item identity.

Use idempotent server claims, snapshots and last known valid receipts; never reset, delete, or auto-reroll saved gear just to restore parity. Revalidate optional minimum-version changes separately and avoid trapping players on an unavailable Play build.

## Copy-ready release-note draft (unpublished)

**Title: A New Edge**

Forge equipment with more personality. Newly crafted T2–T5 weapons, armor and accessories can now receive randomized bonus attributes. Rarity improves the possible roll range, and stronger items may carry two distinct bonuses. Compare individual pieces, inspect roll strength and save the gear that fits your build. Existing equipment remains unchanged.

**Not part of this release:** Ability Damage, Tenacity status resistance, Weapon Power, Skill Power and the broader 2.0 combat overhaul.

**Status:** Draft copy only; do not publish `app_release_notes`, update `app_release_policy`, promote to production, or release an AAB until all gates are approved.
