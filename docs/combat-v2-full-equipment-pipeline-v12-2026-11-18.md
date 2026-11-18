# VELDRYN Equipment + Classes + Enemies 2.0 — Full Equipment-Stat Integration v1.2

**Date:** 18 November 2026. **Status:** draft PR #1377, never merged into `main`, not deployed, no staging/production DB writes. This is a hidden server-only bridge, not finished gameplay.

## What changed

### New calculation chain
1. **Verified class-only combat actor**: requires a server-owned `combat-v2-class-base-only` identity tag. The existing live launch actor contains legacy gear contributions and is NOT a valid source for the new equipment resolver. Never tag a legacy fully equipped actor as class-only.
2. **Skills 2.0**: validate skill, specialization, passive ranks, weapon/armor ownership and tier-sets; compile authored class/specialization stats and abilities.
3. **Tier item base stats**: each T1–T5 item definition must supply exactly **one or two positive primary stats**, its tier and slot. Rarity multiplier and 0–100 quality curve must be supplied by a separate approved *server* policy. Absent policies fail closed. There are NO invented rarity or quality multipliers, new RNG, rerolls or item changes.
4. **Set threshold**: activate only the threshold(s) actually reached from validated server-eligible gear within one exact tiered set ID. `ApprovedSetPolicyV2` must provide authored numeric rules for **each** active 2/3/4/6-piece threshold. No 4/6-piece reactive concept automatically turns into stat bonuses. Missing rules fail closed. Weapons/offhand never count toward new sets.
5. **Random affixes**: check each selected instance, quality, tier, rarity and owner against the exact server ledger. Enforce slot-eligible affixes and approved roll count/range/stat caps; use the previously implemented seven representable affix types. The other six still fail closed.
6. **Enemy/encounter**: run the canonical deterministic combat engine against the opt-in Enemies 2.0 archetypes and provisional boss mechanics.

Implemented in:
- `backend/src/server/combat/v2/equipment-base-stats.ts`
- `backend/src/server/combat/v2/equipment-set-effects.ts`
- `backend/src/server/combat/v2/unified-equipment-encounter.ts`
- `backend/src/server/combat/v2/power-composition.ts`

The old skills-only simulation now **rejects nonempty equipment selections** rather than silently validating gear and omitting its stat effects. The full equipment encounter is a *separate*, unmounted strict entrypoint; its disabled path delegates directly to legacy `simulateCombat` without new modifiers.

### Power contribution / balance diagnostics
- The design target remains **class and level ~15–18%**, with the rest driven primarily by equipment and its meaningful rarity/quality/rolls. This target is not imposed as a fabricated fixed multiplier.
- Actual Combat Power weights are not approved. `evaluatePowerCompositionV2` therefore requires an explicit server-owned per-stat weighting policy; no weights/default CP values are guessed.
- The 15–18% target is evaluated **only when the configured full-equipment slot requirement is met**. Incomplete gear returns `withinTarget:null` rather than mislabelling new/low-level players.
- When provided, the contribution diagnostic is attached only to internal encounter evidence, not leaderboards, player stat displays or production CP.
- Class and role balance is **not yet finalized**. Once the approved base stat tables and all 13 affix effects are ready, the simulation matrix can compare 9 class baselines / 18 specializations across T1–T5 without assuming a DPS/HPS tier curve.

### UI/UX
New `apps/mobile/src/components/EquipmentPowerBreakdownV2.tsx` is a hidden read-only presentation of server-derived gear contributions: per-item tier, rarity, quality, actual base stat contributions, random affix percentages vs percentage points, and activated set thresholds. If no signed server evidence exists, it says unavailable; it does not invent rolls or mutate any item.
- Do not mount in live Character or Inventory yet.
- In the final release, place this behind a compact **Stat breakdown / Build synergy** row in Equipment inspection, not a large default always-expanded section.
- Existing role-gear restrictions, locks, favorites, gem replacement-only rules, bank ownership, trained XP and crafted item identities remain untouched.
- Player-facing copy needs localization and source-parity checks.

### Regression coverage added
`__tests__/unified-equipment-encounter.ts`:
- Exact **class/specialization → rarity+quality base → approved set → affix** stat ordering.
- Proof original combat source object is unchanged; deterministic seeded v2 replays.
- Rejects banked/other-character gear, mismatched rarity/quality, unsupported rolls, duplicate snapshots, wrong stats/tiers, missing policy, unapproved threshold, stat overcaps, incomplete inputs.
- Rejects gear in skills-only simulator to avoid power omissions.
- Synthetic-only CP 15–18% reporting with approved test weights and full loadout requirement.

`__tests__/full-equipment-role-matrix.ts`:
- **9 classes × 2 specs = 18** seeded role fixtures with server-owned synthetic 1-stat gear.
- Preserves 3 Tank / 4 Damage / 2 Support identities and no actor mutation.
- Audits event/health/damage/healing bounds without making up final class DPS targets.

Existing native UX source tests now cover read-only equipment breakdown; Actions workflow includes the new component and backend tests.

## Critical launch blockers
- **GitHub CI queued/unverified:** authored tests are not proof of passing compilation and regression suites. Keep PR draft.
- Current `launchPlayer` source often contains legacy equipment: require a new *trusted class-only baseline adapter* from persistent class/level state. Never append the class-base-only tag to current live gear-computed stats.
- Connect authenticated and versioned owner/item-instance ledger, offline bank transfers, acquisition/sale/trades and full character activity locks. Final private SQL migration is still unapplied.
- Approved T1–T5 item tier base-stat tables, rarity multipliers, quality curve, stat caps, finalized Combat Power weights, all 13 affix mechanics and actual 2/3/4/6 set effect policies are still needed.
- Enemy/boss 2.0 final telegraph/counter mechanics, exact advanced spell variants, mandatory role balance and worst-case combat simulation/rollback.
- Full mobile translations, server-derived character comparison UI, approved release gates and one coordinated major version launch.

**PR:** https://github.com/elroynbenjamins/Veldryn/pull/1377
