# Veldryn 2.0 — original Forge affix compatibility and source-backed set proposals
**Hidden source-owned Equipment 2.0 development | 23 November 2026 | Draft-only**

## Pass 13 — Authentically minted Forge affix compatibility, not a slot-policy bypass
The pinned original Forge 2.0 item roller is **role-weighted**, but only favors slot-associated affixes **70%** of draws, with the other 30% drawn from the role's remaining available weighted pool. Consequently an originally rolled, otherwise legitimate Forge item (e.g. a glove with an original Forge armor roll) may have an affix not listed in the synthetic/unscaled Combat 2.0 slot catalogue. The previous bridge would reject such items and source QA observed 44 missing/incompatible slots across 18 characters. The gap must not be fixed by rerolling, deleting affixes, fabricating a legal slot or weakening generic equipment validation.

Implemented:
- Introduce `ORIGINAL_FORGE_COMBAT_AFFIX_MAP_V2` with exactly the eleven named original Forge channels whose engine mechanics already exist. **Generic Potency remains unmapped and rejected**, not converted into Hex or generic damage.
- Preserve `validateTrustedAffixesV2` / `compileTrustedEquipmentAffixesV2` strict slot rules for every generic/legacy/synthetic equipment snapshot.
- Add `compileOriginalFrozenForgeAffixesV2`, **not a live route**. It rechecks the original actual server recipe and piece, complete original outcome vs frozen exact item, exact item slot/tier, original Forge roll range and final Combat-approved stat caps. Only then may the **original Forge source** roll map to its existing mechanically supported Combat stat channel even when the synthetic slot preference differs.
- `compileRealFrozenForgeActorV2` still verifies full original claim/XP/job ledger, account and character custody, virtual Bank move history, original owner/slot, immutable frozen base stats, no double rarity/quality scaling and source-authorized build digest. It now calls the source-only compiler after those checks. No custom reroll or extra percentage is introduced.
- Negative QA verifies that the identical off-slot affix **remains denied** by the normal Combat 2.0 validator. Tampered originals, incorrect snapshots and unimplemented Potency must still fail closed. The final full-source actual slot distribution must be recorded from strict CI, never assumed.
- **Current roll-pool blocker:** the existing Forge roller's role pools still limit which stat identities may be rolled. The user's approved final principle is class-agnostic random bonus affixes; this change does NOT falsely claim to have completed that separate versioned reroll/distribution redesign. The eventual source-native change must preserve the final item's immutable roll, crafting economy and owner-approved rarity rates.

## Pass 14 — 15 actual Forge sets, source-verified review milestone values
Actual Forge **15 source families / 42 pinned pieces** differ from the **48 unissued expanded set concepts / 204 unissuable pieces**. Existing authoring directions are unique per family and divided among tank/damage/support. A 2-piece milestone is available to every actual 2+ piece set; a 3-piece milestone is proposed **only** when the original family has three or more authentic source pieces. Four-piece milestones would only appear where there are at least four original pieces; never invent impossible 4/6/8/10 thresholds based on planned but unissued sets.

Implemented `equipment-forge-set-balance-proposal.ts`:
- Pinned exact member IDs and authored tactical direction channels, 15 distinct counterplay concepts. Review-only **provisional** values: `1 + tier × 0.5` percentage for two pieces; each additional original piece contributes a **0.75 percentage-point higher preview milestone**, capped under 5%. These are **design review examples**, not approved or player-facing statistics.
- Pure membership review of pinned original piece IDs, with zero combat mutations and explicit `appliedBonusCount:0`, `approved:false`, `executable:false`, `canGrantBonuses:false`, `canUseInCombat:false`, `releaseApproved:false`. Even a genuine worn milestone does NOT equip a buff.
- Strict test compares all 15 families with the canonical 169-item original Forge source catalogue, rejects duplicates/legacy/foreign item names and tests 2/3/4 piece eligibility only where source membership exists.
- Final set coefficients, mechanics, counterplay alternatives and actual runtime effect implementation remain subject to explicit user approval + benchmark against actual boss windows, source-authenticated set custody and versioned CP policy.

## Safety and next gates
This development is a private child of PR #1703, not main. There are no account writes, grants, SQL migrations, UI changes, live releases, production flags, rewards, market listings or actual set effects. An authenticated database lock, authoritative original minted equipment receipt, **correct selected Skills build**, source-bound boss kit, atomic CAS and battle signature all remain required before release.

Original Forge's supported original item rolls are still single-copy QA, not a production player item. Player Market 2.0 must permanently deny all legacy/pre-2.0 equipment, including resale; only explicitly verified newly minted V2 copies with current custody may ever be traded. No dungeon, World Boss, Party Event or Guild PvE reward is issued by these review functions.

CI: `Equipment + Combat 2.0 expanded-set integration (private)` strict TS builds and runs both source-proof and set proposal suites; confirm exact-head run outcome before claiming green.
