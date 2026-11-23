# Veldryn 2.0 — Frozen Forge + persisted Enemy 2.0 authority composition
**23 November 2026 · HIDDEN SOURCE / NOT LIVE · PR stacked on #1690**

## Why this pass exists
Earlier Combat 2.0 QA tested 648 actual compiled Skills × signed Enemy profile matchups with synthetic copy evidence. Separately, the frozen Forge compiler validated true canonical Equipment 2.0 source structures (original mint, claim, settlement ledger, custody, equip receipts) before compiling player stats; however, its encounter wrapper used the generic enemy compiler and did not accept the *persisted kit* from Enemy 2.0.

The newly introduced optional `TrustedFrozenForgeEnemyKitPortV2` connects **both** trust boundaries in one explicitly hidden encounter call:

1. Compile every actor through existing `compileRealFrozenForgeActorV2`: verify item mint/claim/custody/ledger revision via the injected **privileged** persistence verifier and compile exact Skills+base item+rolls once.
2. If there is no persisted Enemy 2.0 port, preserve the generic existing frozen Forge encounter behavior, with no new physical boss values.
3. With the port, fail closed unless this is a **fresh SOLO** encounter (the existing Enemy 2.0 authority does not support party/dungeon replay), has no `enemyDamageProfile` override and shares the exact persisted kit seed.
4. Run `verifyPersistedEnemyKitsV2` against the original uncompiled enemy; this validates canonical boss IDs/region, original/compiled snapshot digests, stored revision, ability/phase ID provenance, preview labels and preserved status tags.
5. Create a single final encounter from the compiled verified Forge player and **verified persisted authored Enemy 2.0 kit**. Issue the existing Enemy 2.0 engine token only if the injected authenticated `verifyPersisted(snapshot, finalCombatDigest)` accepts it.
6. Separately issue the frozen Forge physical subtype token (source copy data already validated). Provisional boss resistance is **OFF BY DEFAULT**. It only composes if the server-only port explicitly names `ENEMY_PHYSICAL_RESISTANCE_RULES_V2` and the persisted Enemy 2.0 token exists.
7. Execute the deterministic engine with both tokens on the same complete encounter digest. Enemy mechanics/physical damage telemetry derive from actual replay, never a fake UI description. No token can be reused with mutated combat.

## Threat-model tests
Hidden Forge regression uses canonical T1 Wayfinder weapon minted/claimed/equipped via the existing full synthetic Forge settlement and exclusive custody witness, and a separately persisted-style Asterfall Root kit assembled by the real Enemy V2 composer. QA verifies:
- Exact deterministic replay; genuine Piercing physical source events; saved Living Bark mechanic shown; opt-in +10% Piercing resistance lowers damage without changing miss RNG; no default resistance when a signed kit is present without balance opt-in.
- Tampered `preparedEnemyDigest`, unpersisted candidate, forged balance version, rejected persistence callback, different seed, multiplayer use of solo kit, and disabled release gate all fail closed.
- Generic Forge encounter remains the default when no kit is supplied; existing 4-player generic Forge regression is preserved.

**Important:** The QA callbacks in this repository intentionally stand in for database access, and DO NOT prove that a production account read or stored Enemy encounter was authenticated. Real deployment requires a privileged transaction/CAS verification of both the *same encounter* and the *same Forge inventory revision*. Do not expose this TypeScript bridge or verifier port on HTTP routes and do not use a callback that accepts all digests in production.

## Final gates, unchanged
- Review/propose final physical resistances and equipment affix caps; source-resolved T5/T6+ items; 2/4/6/8/10 equipment set bonuses.
- The official CP weight table, class-level curves and companion CP share remain *not approved*. No fabricated equal-CP metrics.
- Authenticated persisted Player Market 2.0 only accepts new, authoritative Equipment 2.0 mint provenance; legacy or imported copies remain nontradeable.
- Persistent party/dungeon Enemy 2.0 replay needs its own versioned multi-character kit authority and multi-party state conversion. This pass must NOT silently extend solo authority.
- Broader Skills 2.0 React Native/typecheck failures, UI/theme design-review gate, and the coordinated 2.0 launch gate remain open.
