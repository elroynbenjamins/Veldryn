# VELDRYN 2.0 — exact equipment copy / Combat source interop (18 Nov 2026)

**State:** hidden, additive, pre-release reference. No production caller, migration, economy change, enemy change, UI or live combat activation.

## Reconciliation finding

The Equipment/Crafting 2.0 prototype (#1382) freezes fully multiplied per-copy primary stats as Attack/Defense/HP at Forge claim. Rarity and quality have already been included. It authors T1–T4, with canonical minimum levels 2/12/26/40.

The Classes/Skills/Combat 2.0 prototype (#1377) expects CombatStats attackPower/defense/maxHp, T1–T5, and *unscaled* item definitions which its base resolver multiplies by rarity and quality. Its class-only baseline must derive from a verified versioned class policy, not from legacy gear-inflated launch actors.

**These representations cannot be plugged into one another unmodified.** That would risk rarity/quality being counted twice, misassigning equipment to a character, or dropping copy-specific affixes.

| Frozen crafting value | Combat V2 evidence | Constraint |
|---|---|---|
| Attack | attackPower | Exact stored value, no further multipliers |
| Defense | defense | Exact stored value |
| HP | maxHp | Exact stored value |
| Tier 1–4 | T1–T4 | T5 remains unavailable in the current craft manifest |
| Rarity and Q0–100 | Metadata | Already included in frozen base stats |
| Bonus affixes | Unapplied count | Do not silently grant or discard |
| Gem sockets and enhancement | Rejected | Need separate authoritative custody and migration |

## Implemented safety boundary

- Pure standalone Node module: backend/src/server/combat/v2-integration/equipment-exact-copy-interop-v1.mjs. **Not imported into live gameplay.**
- Server caller must authenticate the character, load the authoritative item receipts, pin manifest/rules versions, and supply a trusted verification callback. This function must never accept that callback from client input.
- Rejects banked/foreign/duplicate instances and receipt IDs, duplicate slots, offhand/two-handed conflicts, incorrect level/class/role, stale versions, invalid affixes or frozen base values, and unreviewed gems/enhancements.
- Emits immutable sources and baseTotals, with explicit rarityAndQualityAlreadyApplied evidence.
- Always returns combatReady:false and missing integration prerequisites. This is not a combat engine, CP calculator, authenticated route, or reward writer.

## Enemies and boss reconciliation

Enemies/Bosses 2.0 (#1376) and Classes 2.0 (#1377) both modify combat engine and combat types. Their changes must be reconciled together, with server-owned versions, rather than blindly merging either overlapping engine file. Preserve legacy dungeon runs, deterministic replays, marks, potions and role behavior until the single coordinated 2.0 release.

## Verification

Run the dependency-free Node 22 suite:

    node backend/src/server/combat/v2-integration/__tests__/equipment-exact-copy-interop-v1.test.mjs

It covers nine class/role combinations and 30 negative receipt, ownership, version, slot, level, stat, affix and gem cases. CI also rejects a runtime import of the draft module.

## Remaining implementation gates

1. Pin one exact-instance receipt schema and a single approved scaling policy. Combat must consume the *already-scaled frozen copy*, not rerun rarity/quality projection.
2. Connect authenticated Forge/Bank/inventory/Market custody through the existing atomic game-state transaction, without a shadow live Gold ledger.
3. Connect class-only profiles, specializations, reactive passives, set effects, permanent gems, enemy effects and server-owned run snapshots.
4. Approve stat ceilings, full nine-class balance, T5 compatibility and old-client migration/rollback.
5. Verify exact-head CI, staging Auth/Edge/SQL, Android UX/accessibility, offline/Dungeon replay compatibility and production rollback before release.

**This contract authorizes no database installation or gameplay activation.**
