# Veldryn 2.0 — Wave 3: real Forge ten-slot source/affix consolidation (23 Nov 2026)

**HIDDEN / REVIEW ONLY.** Child of Skills × Equipment consolidation PR #1675, based on Wave 1 PR #1673. Do NOT merge into `main`, deploy, run SQL, activate EQ2, change published mobile UI/themes or mint any gameplay item.

## Source audit (implemented, not a ten-item live inventory proof)

- New server-only `equipment-frozen-forge-slot-audit.ts` reads the **169 actual authoritative Forge templates / 338 paired recipe routes**, `GEAR_SLOTS_V2` ten slots, the nine `CLASS_ROLES_V2` classes, T1–T4 tiers, the original Forge weighted role-affix candidates, and the **real** source-specific Forge → Combat affix map and its slot policy.
- Evaluates **360 class × tier × slot cells** and reports source templates, legal Combat-mapped Forge affixes, ambiguous/unsupported/off-slot Forge affixes, and highest authored rarity roll count. One cell is not one minted instance. Class-specific weapons and offhands are matched by the existing source class restriction; no generic weapon is invented.
- Original Forge RNG chooses from its role pool, including its **30% fallback beyond slot-preferred candidates**. Consequently, a role can have a real item for a slot yet still mint a roll that Combat rejects. The audit detects that gap; it does not relax Forge RNG or Combat slot constraints, silently drop a roll, or reroll an item.
- Current visible source mismatch examples include **Tank Gloves** and **Damage Helmets** lacking any valid mapped combat affix from their role pool. Original Forge `potency` remains ambiguous and rejected; no automatic Hex/DoT translation.
- A max-rarity roll count exceeding the number of source-compatible distinct affixes also prevents safe maximum-roll-count issuance for that class/tier/slot. A warning is a **stop-ship finding**, not permission to discard extra minted rolls.
- The QA test enumerates the canonical real source pieces and produces deterministic **non-persisted exact templates** using the original Forge roll generator; it never starts a job, issues a receipt, authenticates a player, delivers a copy, awards XP or invokes any release endpoint.

## Combat and set-bonus authority

- The real frozen-copy bridge still supports a **maximum of ten distinct equipped IDs** and requires full account Forge/claim/XP history, custody replay and a separately injected persisted-read verifier. It currently rejects set pieces whose effects aren't authored/approved, sockets/enhancements, illegal rolls, ambiguous original Potency, wrong-owner and duplicate physical copies. **No actual ten-copy account loadout has been certified by this wave.**
- All **15 pinned original Forge set families (42 source members)** and **48 unissuable expanded T1–T4 set concepts (204 planned members)** must retain the existing separation. Set identifiers and member counts are informational, not a signed combat bonus.
- The existing Combat 2.0 QA synthetic ten-slot tests (#1666) prove deterministic mechanics for synthetic gear, **not** real Forge-generated, serializably claimed/persisted ten-copy items. Never import their mock set percentages as final EQ2 effects.
- Combat Power, 13+ affix caps, final 2/3/4/6 thresholds, sources for gems/enchancements, level gates and economic outcomes require separately authored, approved signed policies.
- Preserve the validated frozen-base rule: **rarity and quality are already applied in the genuine Forge exact item base stats; add once after Skills**. The Combat unscaled resolver must not apply them again.

## Independent tool XP and innate percentage designs

- #1644's current **tool XP** rules are +2–4/+3–5/+4–6/+5–8% for T1–T4, additive only within the matching gathering skill across distinct equipped tiers, with the proposed +60% safety cap. These exist on a **different mobile-led draft**; this Wave 3 does not falsely claim they have been reconciled with authoritative Equipment Forge mint/custody or offline XP payout.
- #1644's six V33 signature set IDs with deterministic innate percentage values use **V33 item/set identities**, not the real `EQ2_SET_...` Forge identities. Do not authorize 2.0 Forge intrinsic % stats by treating equal-looking item names, slot names or V33 tiers as item provenance. An explicit source-owned immutable per-template mapping is required before implementation.
- T5–T9 tool, recipe and gear contracts are still future development, not actual existing Forge catalogue entries. No fake T5+ source rows.

## CI and Wave 2 correction

- The private `equipment-combat-v2-expanded-sets-integration.yml` now compiles and runs this source audit, and prohibits importing the read-only reviewer into mobile, public online, or deployed Edge paths.
- The Wave 2 hidden four-player original Forge × authored Bell fixture previously asserted that `Soul Curse` **must complete**, even when the party can interrupt it or `Veil Mirror` might cast first. Wave 3 checks that at least one real authored Bell ability produced an authentic, correctly timed and source-attributed cast signal, accepting only genuinely interrupted/completed/unresolved outcomes as produced by the engine. The separately isolated boss-projection QA still covers exact spell-specific durations and cancellation.
- Exact-head private CI is mandatory. Previous inherited mobile-core/Edge parity/economy checks were red. This wave is not complete until appropriate checks pass; neither source-only tests nor all green checks would authorize 2.0 live activation.

## Recommended follow-up order

1. Reconcile unsafe Forge roll pools **without changing existing minted receipt semantics**, then source-test genuine original Forge **ten** copies across slots/characters with stable per-item claim+Bank custody, first without set effects.
2. Approve authored per-template EQ2 innate % and exact 15+48 set effect IDs, thresholds and caps. Add signed source provenance, no invented numeric tuning.
3. Integrate socket/effect gems/enhancements and immutable tool XP per-skill payout (server-side), then versioned final Combat Power.
4. Complete authenticated two-connection PostgreSQL transactions and anti-replay market custody, then full Enemies/Bosses, Dungeon, World Boss/Party and Market readiness.

**Stop-ship:** no real authenticated 10-copy issuance, no source-safe all-roll paths, no approved innate/set/CP/economy numerical policy, no user-approved mobile UI/themes, no staging rollback drill.
