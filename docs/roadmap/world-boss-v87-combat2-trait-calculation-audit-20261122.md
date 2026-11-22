# World Boss V87 — Equipment / Combat 2.0 event hooks (22 Nov 2026)

**Hidden review-only engineering prototype. Not imported by gameplay routes. No migration, deploy, claim, event, flag enablement, UI change or main merge.**

## Implemented in this draft

- V25 authored account raids (1–5 owned characters) may opt in to a `WorldBossEquipmentProofV87` only when a privileged server-owned verifier accepts the exact frozen actor roster, account, boss, source revision, item-copy receipt digests, selected trait instance IDs and the authoritative boss HP ceiling. The actual privileged SQL reader is **not** implemented. Production `NODE_ENV` rejects the bridge.
- The existing 13 Equipment/Combat V2 stat channels are **not applied again** by this bridge. They must come from independently compiled, verified player combatant snapshots once #1559 and #1576 are reconciled. V87 adds only the three executable draft channels: Basic Attack Damage% (max 19 percent points), original Class Ability Damage% (max 22 pp) and Reflect Damage% (max 8 pp). Percent points are divided by 100 exactly once.
- Supported real pilot hooks are Sword Dance, Echoing Strike, Thornbound Riposte, Mending Echo and Restorative Bloom. Each character may select at most two **different** traits from distinct owned, equipped item copies; the Combat 2.0 receipts/DB source reader must remain authoritative. Any 23 other proposed traits and Tenacity are unimplemented, **not silently activated**.
- Direct hit percentages are applied after existing attack/defense/crit/War Camp/tonic calculations, before World Boss *local Guard*. Original hit source tags distinguish BASIC, class-skill, gem, DoT and generated procs. Echo, Reflect and Thorn damage pass through local Guard, then only real excess counts as proposed community HP damage; no global HP write is made.
- Sword Dance third hit +5%, 9-second per-actor cooldown; Echoing Strike +8% of qualifying real direct skill HP damage capped at 20% Attack, 30-second cooldown. Thornbound Riposte +8% actual HP lost capped at 1.5% defender max HP (15-second cooldown), combined with Reflect and sharing a maximum of **0.1% server-frozen boss max HP across all account defenders per five seconds**; the 1.5% per-source-hit cap applies to the sum. A global one-second per-actor *trait* interval prevents simultaneous trait procs.
- Mending Echo returns 8% of effective original ally healing to a different injured ally (24 seconds); Restorative Bloom returns 5% as a non-recursive timed secondary HoT (26 seconds). No self-heal, attempted overhealing, source recursion, additional class procs or temporary trait inflation.
- Boss-specific telegraph/special damage, fatal hits, fully shielded hits and DoTs cannot reflect. Existing Hollowroot, Sunscar and Frostmarch scripts retain their 14 cues and all three phase identities. Resistance to their status effects is not invented from an unsupported Tenacity field.

## Replay / balance coverage

- Standalone synthetic math and negative proof tests cover 3 new percent channels, 5 traits, cooldowns, 2-defender global boss budget, immutable source callback, unsupported or duplicate trait, extra stat, wrong owner and invalid boss HP.
- One full authored five-character V25 fight tests effect event provenance, guard, account ledger and deterministic replay.
- **45 further 3 boss × 3 phase × 5 roster-size** authored equipped-gear matrix scenarios have been added. These are test cases, not 45 observed successes.
- Existing V25's 90 unmodified encounters and account score diminishing-return rules must stay green with V87 omitted.

## Critical parity/release gaps

1. **Canonical engine parity:** V87 mirrors the limited draft effect math of Combat PR #1559, but its 5-second round model cannot faithfully represent every millisecond/cooldown effect. In particular, Combat 2.0 Restorative Bloom currently uses **four one-second ticks**; V87 uses a **single next-round (5-second) aggregate** with the same nominal total. This cadence is unapproved and must be reconciled before release.
2. **All 17 affix / 28 trait design ideas are NOT executable:** the original 13 must be compiled from actual verified gear exactly once. Three channels and five traits are executable here; Tenacity and the other trait candidates need separate authored semantics and tests. Worldwalker's World Boss gathering utility is **not** a combat proc.
3. **Item custody:** the test `verifyPersisted` callbacks are synthetic. A privileged exact-copy DB receipt reader, equip/owner/selected trait/skill checks and roster-digest binding are mandatory; do not pass arbitrary client source objects to the simulator.
4. **Phase balance:** simulation matrices test arithmetic/fail-closed invariants, not measured production balance or completion rates. Tune each boss/phase against approved 2.0 equipment sets, 1–5 owned characters and 3 War Orders *after* the 48-set/17-affix plan is reconciled.
5. **Reward/UX:** V87 never writes shared HP, contribution, attempt use, chests, grants or currencies. New trait event cues need real mobile fight-screen appearance approval and compact visual accessibility review before a UI PR.
6. **Validation:** exact-head GitHub Actions, 1–5 real equipped class builds, real Postgres 17.6 Auth/storage, two-session races and approved first-live event readiness are still required.

**Consolidation direction:** Keep V87 child PR #1588 under V86 while #1559's canonical Combat 2.0 engine, #1576's expanded EQ2 gear and #1416's Party/World reward custody are reconciled. Do not copy provisional V87 math into production as a second long-term combat engine.
