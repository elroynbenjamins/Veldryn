# Veldryn World Bosses — V11 War Camp & Fixed-Threat Combat Diagnostics

**November 11, 2026 · HIDDEN / TEST-ONLY · NO LIVE FEATURE, NO REWARD/ITEM DEBIT, NO DATABASE CHANGE.**

Extends [V10 recoverable reservations](world-boss-reservations-v10.md) without approving World Boss difficulty or opening the mode. Also respects the [November 11 economy amendment](world-bosses-design-v2.md): maximum **100 World Sigils** per event, with optional 2 × 5-Sigil War Supplies bundles. No Sigils exist in the live World Boss system.

## Concrete V11 changes

- `backend/src/server/combat/world-boss-war-camp-v11.ts` introduces an immutable, **versioned event War Camp tier snapshot** (event ID, revision, three tier levels and SHA256 integrity digest) plus deterministic, bounded effect derivation. **Digest != signature**. Only a future authenticated server donation ledger may authorize its contents.
- Hidden 14-round simulator now recognizes the **server-frozen** War Camp snapshot; failed/tampered digests are rejected, and no caller-owned mutable array is retained.
- `backend/src/server/combat/world-boss-reservation-v10.ts` now freezes the War Camp snapshot at the same time as the initiator/three Echoes/seed/phase. A request retry cannot silently adopt a newer tier: it gets the original reservation. Leased-worker recovery and settlement replay use the original tier snapshot; immutable receipts record its digest. This remains an **in-memory proof of concept**, not durable across processes.
- Added `testOnlyFixedBossAttack`, `testOnlyFixedBossDefense` and `testOnlyFixedGuardMax` overrides to the hidden simulator, so equal-strength boss pressure can be compared against differently equipped squads without recomputing boss Attack from the players' Attack. **This is NOT player-configurable, is not exposed by any live route, and is not yet the approved final boss-stat formula.**
- New `apps/mobile/tests/world-boss-war-camp-v11.ts` validation tests versioned digest integrity, objective War Camp effects, stronger equipment under fixed enemy threat, real replay attribution and an 81-fight boss/phase/pressure diagnostic (3 bosses × 3 phases × 3 pressure values × 3 initiator classes). This is NOT the actual 1,728-fight T1–T4 loadout cohort; see the older v8 equipment data for its limitations.
- V10's recovery test also validates that a new community War Camp revision does not change an already-reserved fight and tampered worker snapshots cannot settle.

## War Camp tier contract (test implementation)

| Track | Tier 0 | Tier 1 | Tier 2 | Attribution rule |
|---|---|---|---|---|
| Fortifications | None | Boss incoming HP damage -5% | Boss incoming HP damage -10% total | Emit real saved HP as `WAR_CAMP_FORTIFICATIONS` mitigation, not personal Tank World Impact |
| Field Provisions | None | All fighter max/starting HP +5% | Tier I HP plus effective healing ×1.05 | Never record overheal as Support Impact |
| Siegecraft | None | Local guard-breaking effectiveness ×1.05 | Tier I guard plus exposed weak-point damage ×1.05 | Only actual guard damage / boss HP damage counts |

A tier is a **shared community unlock**, not a payer-only buff. Donation cap remains **2 bundles per account/event**, shared across tracks, and not linked to this code. Battle logic applies a frozen community level to every fighter. Actual War Camp material recipes, resource-debit transactions, real-time global progress, recovery and award receipts remain unimplemented.

Note that the **first tier of Field Provisions does not also give extra healing**; healing is the second-tier effect. Likewise, the second tier of Siegecraft improves a *genuinely exposed* weak point, not unconditional damage. The existing player-selected War Orders remain separate.

## Fixed-threat recommendation

**Found structural test concern:** the historical simulator calculates boss Attack from squad Attack, boss Defense from squad Defense and local Guard from total squad Attack. Stronger equipment can therefore make the boss **hit harder, resist more damage and gain a larger barrier**. V11 adds test-only fixed overrides for *all three* boss stats, so like-for-like equipment samples face the same enemy. These are calibration overrides, not approved live balance coefficients.

**Proposed production model** (not activated):
1. At event instantiation, establish a versioned boss pressure profile per **server-derived effective combat-power bracket**, boss ID and global phase. Use actual verified PvE units for attack, defense and speed; calibrate values from real loadout data. Never accept a bracket or fixed boss strength from the mobile client.
2. Freeze the chosen profile identifier, attack, defense, War Camp revision, seed and roster at reservation. Higher-equipped players in the **same bracket** should get real benefit from gear; they must not automatically give the boss more Attack because their own Attack increases.
3. Prefer a smooth transition between brackets or carefully bounded ranges. Avoid an exploitable cliff that punishes one additional equipment upgrade by increasing boss Attack more than gear helps.
4. Track: global HP contribution, participant survival, rounds completed, effective Support recovery, actual Tank HP prevented, combat-class parity and real weak-point/guard interactions. Derive attack objectives from 14-round encounters, not from the client animations.
5. Keep the global community boss HP locked at event start. The preflight personal combat profile is **not** a hidden adjustment of global HP mid-event.

### Current blocker

All previously archived matched and mixed T1–T4 sample squads survived the v8 default encounter, including the reference high-pressure sweeps. The **relative gear stat adapter is not identical to a trusted production snapshot**, and many survival counterfactuals previously had no deaths. The V11 fixed-threat synthetic test is intended to expose that problem, **not** to publish live boss coefficients.

Before balancing, complete a true owner-bound equipment/gem/companion snapshot resolver, record actual production-derived stats per class and progression band, prove Tank and Support materially affect survival under appropriate pressure, then choose damage/HP targets. Do not silently nerf classes or inflate boss Attack globally to force deaths.

## Economy & safety gates still CLOSED

- No live World Boss schedule/HP, no shop, no World Sigils, no global/individual entitlements.
- No inventory consumption, War Camp donation quotas, player event RPC, anonymous permission, public UI or leaderboard.
- No post-close irreversible wallet mutation and no paid extra attempts.
- No actual PostgreSQL multi-worker locking or secure, production-owned War Camp snapshot load.
- Never serve the `testOnlyFixedBossAttack` option over the network.
- Existing SQL in `docs/roadmap/world-boss-private-schema-proposal-v9.sql` is **not** a migration and must not be executed.

## Next pass

1. Observe V11 CI and archive quantitative results; distinguish World Boss regressions from unrelated LFG and mobile workflows.
2. Calibrate true T1–T4 equipped profiles and mixed Echo brackets using a server-owned loadout resolver and a **frozen** boss attack profile. Stress-test war camps and 3 War Orders in each boss's armored/exposed/enraged phase.
3. Add a **private** server-side transactional War Camp contribution/receipt proposal and long-lived lease heartbeat design; run staging races before any migration.
4. Prepare a locked encounter profile and objective criteria *only when data supports it*, then design compact review screens/animations with the real combat event ledger.
