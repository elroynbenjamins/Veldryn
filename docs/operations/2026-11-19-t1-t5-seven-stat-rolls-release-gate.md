# Veldryn 1.0.11 — T1–T5 seven-stat Forge rolls (release hold)

**Prepared:** 2026-11-19. **Owner:** equipment/stat-roll integration. **Status:** DRAFT / NOT MERGED / NOT DEPLOYED.
**Parent:** integration/1-0-11-stat-rolls-main-parity (PR #1404). **Implementation:** feature/1-0-11-t1-seven-stat-rolls-20261119 (child PR).
This policy supersedes the 18 November 11-stat / T2–T5 *launch* proposal, but does not erase any historic rolls.

## Approved candidate rules (source change only)
- **Freshly forged T1** weapons, armor and accessories now receive **one small affix**. T1 range is based on half the corresponding T2 range, quantized to 0.1% before rarity scaling and reduced further for nonweapon slots.
- **T2:** one affix at any rarity. **T3–T4:** one normally, two at Epic+ rarity. **T5–T9:** two distinct affixes.
- **New seven-stat pool:** Max HP, Armor, Critical Rate, Critical Damage, Accuracy, Evasion, Haste. All classes use role-appropriate subsets.
- **Deferred for *new* items:** Ward, Penetration, Potency, Healing Power, Ability Damage and Tenacity. Do not use these for new early-release minting or claim that they operate consistently across every combat mode. This does **not** remove existing fixed set bonuses, gems, class abilities or old recorded affixes.
- **New receipt versions:** weapon v6 / nonweapon v5. Read older weapon v1–v5 and nonweapon v1–v4 with their exact saved rarity, original ranges and stat values. Do not retroactively mint bonuses on legacy T1 items; do not reroll or delete owned gear.
- **Rarity:** Common 0.85×, Uncommon 1×, Rare 1.20×, Epic 1.35×, Legendary 1.45×, Mythic 1.50×. **Quality** affects equipment's base stats separately; it does not multiply rolled affixes again.
- Trusted server-owned claim entropy must determine the roll; replay the same claim and preserve exact-copy ID, Bank transfer and disposal protections. Existing Quality-only autosell must never silently discard a rolled item.
- Inspection, comparison, Forge single and bulk claim should display **mint-time versioned ranges** and actual roll strength, not generic promises that six deferred stats work everywhere.

## Cross-mode contract
Expected mapping of each newly mintable stat in the legacy 1.0.11 engine:

| Affix | Solo/Story boss | Server-owned dungeon loadout |
| --- | --- | --- |
| Max HP | effective HP / boss maxHp | maxHp |
| Armor | Defense | defense |
| Critical Rate | critChance | critChance |
| Critical Damage | critMultiplier | critMultiplier |
| Accuracy | accuracy | accuracy |
| Evasion | evasion | evasion |
| Haste | haste | haste |

New regression assertions on exact-copy T1 gloves for all seven stats target solo, story-boss and frozen co-op snapshots; they must actually **run green** on the approved integration head. Old v4 Healing Power co-op regression remains a *legacy receipt* test, not a newly minted stat.

## Consolidation checkpoint (19 November 2026)
- [x] Child T1 / 7-stat PR #1433 was fast-forwarded into parent stat-roll integration #1404 and GitHub marks the child merged.
- [x] Integration #1404 merged the latest `main` commit `72ad4d5`. Post-merge GitHub comparison: **0 commits behind main**.
- [x] The temporary source-to-Edge regeneration workflow was repaired to respond to actual T1–T5/engine/related source updates on the integration branch, not only changes to its own YAML.
- [ ] New [temporary Edge rebuild run](https://github.com/elroynbenjamins/Veldryn/actions/runs/44502025465) was observed as **pending, with zero jobs executed**. This is **not** a verified pass. CI runner/approval blockage remains unresolved.
- [ ] Both generated Edge bundles must be committed by a genuinely successful run before the temporary workflow is removed and any release merge considered.
- [ ] `main` has not received stat-roll commits; production release gate and Supabase functions remain unchanged.

## Integration and operational blockers
1. **Completed source consolidation:** #1433 is merged into #1404; #1404 is rebased via a merge commit onto the latest main (0 behind). Re-compare if main advances before go/no-go. Preserve all other in-flight 2.0 branches.
2. GitHub Actions previously returned `action_required` with **zero jobs executed** for required workflows; retry endpoint returned 403. Resolve repository Actions approval/policy in GitHub and obtain exact-head green checks. Do not count a blocked, queued or skipped run as a pass.
3. Build **both** canonical gameplay and coop Edge bundles from the final combined code. Verify byte-for-byte provenance; remove temporary edge generation workflow after verified regeneration.
4. Run full mobile TypeScript, Mobile Core (including weapon/equipment/retention tests), Unique Equipment, Mobile UX, Gem/Dungeon, combat, release fences, generated Edge parity and Android native CI.
5. Stage isolated T1/T2/T3/T4/T5 Forge claims and fresh/legacy receipts with a dedicated QA account. Verify new versions survive server save/reload, retries, crash/lost ack, Bank transfers across three characters, role/slot security, manual retention, co-op freeze and UI comparison. Staging currently lacks crafted-copy records in the inspected save path; no live Forge validation can be claimed.
6. Use **staging** Android EAS profile, not preview, for backend smoke. Check signed Android 1.0.11 AAB versionCode against Play, internal testing, real device startup, rollback and minimum-client migration.
7. Production latest/minimum currently **1.0.10** (read-only 19 November audit); do not enable new v6/v5 minting for older 1.0.10 clients. Coordinate compatible app rollout and server mint gate; keep hidden World Boss, Party Events, Market and 2.0 systems disabled.
8. Require explicit product/security/QA **GO**. No production write, Edge deployment, release-policy update or item migration is authorized by this draft.

## Rollback
Once v6/v5 physical receipts exist, keep them readable in every future server/client binary. On failure disable **new minting** via a forward-compatible patch, never downgrade to a parser that discards saved bonuses, and never delete or reroll items to resolve an outage.

## Player-facing release copy (unpublished)
**A New Edge:** Crafting now gives **T1–T5** equipment meaningful unique bonuses. Each new item can roll from a focused selection of seven combat attributes, with rarity influencing the possible strength. T1 starts with one smaller roll and higher tiers unlock stronger and sometimes double rolls. Compare exact copies to find the best fit for your build.
