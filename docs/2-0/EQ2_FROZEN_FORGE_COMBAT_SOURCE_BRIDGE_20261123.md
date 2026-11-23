# Combat 2.0 × actual Equipment 2.0 Forge — hidden exact-copy integration

**Status:** Source-level implementation and QA only. New draft PR #1661 stacks on hidden EQ2 V6/V7 PR #1653, not `main`. The independent Combat 2.0 counterplay branch is draft PR #1637 and must later be reconciled without unreviewed merges.

## Why the bridge is necessary

The actual server-owned **169-piece/338-recipe Equipment 2.0 Forge** emits `V2DraftItem.exactItem: V2ExactEquipmentTemplate`. Its `baseStats.attack/defense/hp` values are **already scaled** by the item's authoritative rarity and quality. The generic Combat 2.0 `resolveVerifiedEquipmentBaseV2` intentionally accepts only unscaled definitions and rejects pre-scaled `eq2-cv2-exact-source-v1` values. Sending real forged items through that generic resolver would double-apply rarity and quality.

The new, unmounted `equipment-frozen-forge-bridge.ts` instead consumes exactly those original EQ2 Forge types and verifies:

- Canonical `v2ServerPiece`, `v2ServerRecipeAndPiece`, `v2ServerCreateExactTemplate` and `v2ServerExactTemplateConsistent` identity, rarity, quality, original numeric rolls and eligibility. Legacy copies and unregistered `EQ2_LAUNCH_` design identifiers are never accepted.
- Same-account character, class, level, item instance, equipped slot, location, authoring role/class restriction, owned Combat 2.0 build, and one claimed Forge receipt per worn item. Duplicate copy IDs across account and party and duplicate claim request IDs are denied.
- A mandatory separately injected `verifyPersisted(digest)` claim/custody check. **The included synthetic verifier is not a real DB reader**. Production use remains forbidden until that callback is bound to a privileged, account-locked persisted snapshot and can't be controlled from a client.
- Class-only Combat 2.0 stats and authenticated Skills 2.0 choices are compiled before the **exact frozen Forge attack, defense and HP** are applied, each once and without any second rarity or quality pass.
- Only compatible original Forge affix sources are mapped, preserving their exact percent value ÷ 100 and eligible slot: `armor→defense_pct`, `maxHp→max_hp_pct`, `ward→ward_pp`, `critRate→crit_rate_pp`, `critDamage→crit_damage_pct`, `haste→haste_pp`, `penetration→penetration_pp`, `accuracy→accuracy_pp`. These provisional equivalences need final authored approval; the original frozen roll is never modified or rerolled.
- The current `tenacity`, `potency`, `abilityDamage`, `healingPower` Forge channels **have no safely equivalent active Combat V2 implementation here**. They are *rejected*, not converted to unrelated stats or dropped. The Forge 30% off-slot fallback can also produce a roll Combat does not permit on that slot: these are rejected explicitly.
- The original **15 Forge sets/42 set pieces** have not been reconciled with Combat's 12 tiered set families. Unreconciled set pieces are rejected by this first bridge. The proposed **48 T1–T4 sets/204 planned member IDs/108 bonus concepts** remain **unissuable**, with no fabricated active effects.
- Existing permanent socket/effect gems and enhancement levels are not yet imported here; instead of omitting earned bonuses, the full encounter fails closed. The same is true for old persistent party/dungeon state and solo-only signed trait execution.

## Real source-derived QA

`backend/src/server/combat/v2/__tests__/equipment-frozen-forge-bridge.ts` generates deterministic, test-only actual Forge outcomes from `draftEquipmentV2Outcome` and freezes them using `v2ServerCreateExactTemplate`, rather than constructing ad hoc attack/defense/HP bonuses.

- **18 T1**, **18 T2**, **18 T3**, and **18 T4** class/spec cases — **72** total, using real pinned `EQ2_` pieces and test-only provenance callbacks. T4 Tank uses the actual Forge expansion ring `EQ2_EXP_T4_TANK_RING` with an original MaxHP roll that is legal in Combat's ring slot.
- A private four-player Ironwarden/Wayfinder/Hexweaver/Stonecaller fight with four independent EQ2 minted copies and original rolled affixes.
- Stage-by-stage proof that `afterFrozenBase = afterSkills + exactItem.baseStats` for attack/defense/HP without rarity/quality double scaling; replay determinism and no dropped compatible affixes.
- Tampered frozen stats, wrong owner/Bank location, duplicate item, cross-character equipped copy, nonexistent genuine DB verification, fake activation while gate off, prior-run HP injection, set effects, unsupported stat and off-slot roll all fail.
- **T4 Tank is included**, but only via an existing legal EQ2 expansion ring/MaxHP combination. Other T4 Tank rolls or slots may still be incompatible and remain rejected pending exact Forge/Combat affix-slot reconciliation; this does not claim full item, set or endgame readiness.

## Required next integrations

1. Real atomic online GameState/Account+Bank + character ownership readback, job/claim receipt and EQ2 custody version checks, physical inventory/pouch/Bank reconciliation; same 2.0 coordinated release gate.
2. Final numerical roll caps, source/slot eligibility and meaningful implementation of **all 12 Forge affixes** (or explicit authorized translation) plus any approved additional 2.0 trait rolls.
3. Exact **15 pinned Forge** and **48 expanded** set memberships, rarity-specific innate percentage statistics, 2 active signature traits, full 10-slot build handling and gem/enchancement source custody; never borrow V33 equipment names to authorize trading.
4. Merge or rebase *only inside hidden development* the validated Combat 2.0 boss counterplay source from #1637 after reconciling overlapping server engine changes.
5. Authenticated versioned four-player/dungeon/world-boss state, signed loadout/trait/companion effects, final approved Combat Power and boss scaling, telemetry, readback-verified CI, and the user's explicit actual-screen/theme approval.

**No production database writes, player item issuance, change to rarity RNG, item pricing, skill XP, craft queues, Player Market listings, online routes, mobile UI, release flags, main merge or deploy.**

## Pass 2A — Source-backed Forge affix behavior (hidden, test-only)

Three of the four previously blocked **original minted Forge** roll names now have separate, strictly scoped Combat 2.0 runtime effects. These use the unchanged **original saved percentage** and still require the private compiled actor and a server-approved affix-policy cap:

- `tenacity → tenacity_pp`: shortens the duration of enemy *ordinary* direct-ability debuffs and DoTs on the affected Combat V2 player. Does not affect HoTs, buffs, authored phases, or any boss-origin status until boss-specific dispel eligibility is explicitly defined and reviewed.
- `abilityDamage → ability_damage_pct`: multiplies only direct damage from original class abilities verified in the actor's authored skill list. Never increases basic attacks (`BASIC`), DoT ticks, gems, trait echoes, or capstone/secondary events.
- `healingPower → forge_healing_power_pct`: multiplies actual source-authored class heals and class HoTs, not shield magnitude, leech, potions, gems, traits, or other non-class recovery. It is **not** relabelled as the pre-existing Combat `class_healing_pct`, which has a different historical stat scope.

**`potency` remains blocked.** The original Forge roll does not specify whether Potency means direct damage, DoT/Hex, healing, or another source. The approved source review states `AMBIGUOUS_NO_AUTOMATIC_MAPPING`. It is therefore deliberately not `hex_potency_pct`; no item roll can lose or silently exchange its identity.

The new `equipment-frozen-forge-mechanics.ts` uses the original pinned Forge outcome generator and exact template creation, then compiles that roll through the actual Combat affix engine to run deterministic mechanic-level QA. It checks correct increased direct skill output/class heal/class HoT, unaffected BASIC/DoT/shield amounts, shorter ordinary hostile statuses, and preserved boss-unique statuses; Potency stays unassigned. These are **synthetic ability fixtures with genuine Forge roll values**, not yet a final four-player signed-trait production simulation. Final numerical caps, skill coefficients, double-scaling audits, all 10 slots and per-tier boss matchups still need approval and readback.

## Pass 2B — Original Forge sets versus unreleased Combat family identities

`equipment-forge-set-identity-review.ts` reads the *real* server-owned Forge manifest and recipe catalogue. It verifies exactly **15 original Forge set identities and 42 pinned pieces**; one unique tier/role/slot source per member; and a canonical foundation recipe for every member. It separately audits the proposed **48 Combat T1–T4 tiered sets and 204 staged member IDs**, verifying those 204 are unissuable, uncraftable, unequippable, combat-disabled and do not reuse an actual Forge identity.

A read-only worn-item inspection can count how many verified real Forge set pieces would be present, while returning `combatEffectsApplied:false`, `combatSetId:null` and **zero effective bonuses**, even for two or more genuine pieces. The private executable EQ2→Combat bridge continues **rejecting** set pieces until a source-authorized set effect catalogue is reconciled. This prevents silent loss of intended effects or accidental inheritance of unrelated `eq2_tN_...` prototype buffs. A full signed 10-slot custody and effect activation path remains a release blocker.

The corresponding strict-source QA explicitly rejects an attempted `EQ2_LAUNCH_` member, duplicate physical copies, invalid/legacy-looking copy IDs, two items in one equipment slot, and any unapproved threshold. Full numeric set-bonus design and trait source custody have **not** been invented or enabled.

## Polish, independent CI, and known blockers

The hidden EQ2 V7 lot-audit QA now distinguishes a **wrong-character lot quantity mismatch** from an **actually missing lot**, preserving both fail-closed negative checks. This fixes an assertion mismatch observed in the original independent private CI job without relaxing service custody validation.

Two separate draft stacks remain: this Equipment/Crafting V6/V7-derived integration PR #1661 and Combat counterplay PR #1637. They are **not merged together** and should not be merged onto main without a fully reviewed source reconciliation, genuine server-side account/character authorization, approved 2.0 numerical caps and UX/themes, and a coordinated release gate. Source compilation/tests cannot certify signed production persistence; GitHub exact-head checks must complete successfully before any pass is called validated.


## Pass 3 — Full Forge settlement and replayed account custody before a Combat 2.0 hit

The frozen-copy compiler now independently invokes the existing **server-only** `verifyEquipmentV2HiddenLedger` for the **complete account** (all jobs, minted copies, Forge start/claim receipts and one original profession XP award per claimed job). It rejects missing settlement, altered XP, tampered exact item copies, duplicated claim requests, and claim revisions newer than the account snapshot. `verifyEquipmentV2ReceiptNamespace` additionally rejects replay IDs reused between Forge and virtual custody.

Equipped identity is now derived from the authoritative-looking **hidden virtual claim reservation + ordered move history** using `readEquipmentV2VirtualCustody`. Each replayed virtual owner, slot, Forge item ID and location must agree with the complete supplied account custody. Merely injecting `location:'equipped'` into one copy's JSON, moving a copy out of another character's Bank, deleting its equip receipt, forging the destination, or changing the original placement does **not** grant combat authority. An equip-move receipt newer than the account revision fails. The snapshot digest now binds the revision, entire Forge and physical-like virtual custody snapshot, original reservations and all move receipts—not just the items selected in the current loadout.

The **72 original Forge class/spec/tier QA cases** now construct matching manifest-backed job/recipe, start, claim, XP award, claim reservation and equip-movement history. The independent four-player fixture uses the same real original Forge roll format and rejects cross-character copy reuse.

**Security limit:** these are real server-shaped receipt validators but still use a QA callback and hidden virtual metadata. There is NO production authenticated database reader, SERIALIZABLE lock, real physical GameState equipment issuance, shared four-account dungeon snapshot, final CP policy or live release approval. A server-controlled lock/readback adapter and subsequent revision re-check are mandatory before a real player encounter could use this bridge.

## Pass 4 — Distinct original Forge set authoring, with zero activated bonuses

`equipment-forge-set-effect-authoring-review.ts` gives each of the **15 pinned Forge set identities** a distinct **candidate** combat-counterplay direction, using the actual 42 source pieces and roles, rather than accidentally relabeling 48 unissued Combat 2.0 set concepts. It proposes **18 potential 2-/4-piece milestones** based on actual available piece counts. For the six three-piece sets, the third piece has no distinct milestone in the current 2/4/6/8/10 philosophy; the appropriate third-piece value/bonus requires user review.

Possible T4 approaches deliberately differ within each role (two Tank, two Damage, two Support identities), so no single mechanic, class, item or fixed mandatory loadout is assumed. All 15 have `proposedPercentCoefficients:'UNSET_PENDING_OWNER_APPROVAL'`, `effectImplementation:'MISSING_NOT_EXECUTABLE'` and `appliesToCombat:false`. A four-piece set can be counted without a false bonus unlock. No set buff, effect, damage coefficient, rarity boost, market permission or client UI is minted or activated.

## Integration notes and validation gate

The earlier pre-virtual-custody ledger pass passed the **private Equipment + Combat 2.0 expanded-set integration CI**; the newer exact-head work (including virtual history, 15-set review, and its new negative tests) must still pass independently before it can be called verified. The separate hidden Combat counterplay branch PR #1637 has not been merged or reconciled with this hidden Equipment branch PR #1661. Broad backend CI may also fail on older mobile/backend cross-import dependencies and generated Edge bundle parity. Do not mask these with skipped checks or claim a production-ready release.


### Shared-Bank and multi-character correction

The immutable Forge mint record's `ownerCharacterId` is the **original crafter**, not a perpetual equipment owner. This must not prevent a character on the **same account** from withdrawing legitimately traded/shared gear from the Bank and wearing it when role, class, level, and all item restrictions pass. The combat bridge now accepts that change only if the complete original claim reservation and ordered **pouch → Bank deposit → second-character Bank withdrawal → equip** history verifies. Both original crafter and current wearer must be among the authoritative account's characters; old/new move holders, revision and item identity must match the replay. The test proves that a second character can use the original unchanged frozen Forge stats and affixes, while spoofed external-account actors and missing original-crafter account membership remain rejected.

This is a **hidden virtual-ledger behavioral proof**, not a live Bank transfer or an authenticated cross-account transaction. Actual physical EQ2 storage, the approved Player Market 2.0 mint-only trading restriction, and production account locks remain separate launch blockers.


## Pass 5 — Schema-grounded online account readback (server-only, not a DB lock)

A read-only inspection of **Veldryn staging PostgreSQL**, without reading player rows or changing any data, confirms that the existing `public.online_game_states` table is keyed by `account_id uuid` and contains `character_id uuid`, `state jsonb`, and monotonic `revision bigint`. A dedicated new module, `equipment-online-readback-review.ts`, parses that **actual row shape**, not a guessed second equipment database:

- Match the server-authenticated account identity to the loaded row; compare exact expected revision, selected account-owned character, current character ID, class and level.
- Parse the existing `state.account.equipmentV2Hidden` metadata in the saved GameState, not a new account wallet, Forge inventory or direct player ItemInstances API.
- Verify the **complete pinned Forge job/claim/XP ledger**, universal craft+gem+movement request namespace, original storage reservations, and every ordered movement. Reconstruct present equipped, pouch, inventory, and Bank custody from persisted history, rejecting external character actors and unverified item IDs.
- Deny a foreign account, stale revision, active-character mismatch, non-owned chosen character, duplicate account IDs, damaged exact Forge stats, unsupported deferred claims, and a virtual move outside the authoritative account roster. No client-provided JSON may be used as this trusted row.
- Return `combatAuthority:false` and `requiresAuthenticatedLockAndRevisionRecheck:true`. **Inspecting a row is NOT service authorization, a database transaction or proof of lock.** This stage never mounts the adapter, creates an RPC, performs DB reads itself or releases Combat 2.0.

### Required production transaction protocol (still NOT implemented)

1. Server validates the real auth/session account and an eligible character. Never use user-editable JWT metadata to select an account; never expose service role credentials.
2. A privileged server-internal read obtains the unique account row and correct current version, under its existing online state serialization/lock. Read only the account's row; do not scan players' states or trust incoming claims.
3. Validate the entire EQ2 hidden metadata, physical inventory/Bank/Market custody, claim/storage/gem receipts and current character loadouts. Bind one immutable compilation digest to the exact row revision and the authenticated server request.
4. At resolution and before a reward/charge/HP commit, **re-read/recheck the same account revision** under the existing atomic CAS mechanism; on conflict retry or reject. A prior read alone is not an exclusive lease. Four-player battles must coordinate all four participants with deterministic lock order or a server-stored reserved snapshot; never lock accounts using client-provided actor order.
5. Only after full integration and owner approval may a private server-authorized adapter issue an executable Combat 2.0 source. The experimental `verifyPersisted` callbacks in QA are not and must never be treated as a live authorization mechanism. Do not create a `SECURITY DEFINER` Data API function or open public execute grants to simulate the missing lock.

No SQL was executed to mutate staging or production, no migration or role grants are requested, and the GameState row's original `revision` remains the sole currently grounded authoritative account version for the design.

## Pass 6 — Exact worn Forge source set readiness, no effect grant

`equipment-forge-set-worn-readiness.ts` accepts only a source-labelled internal readback and counts original **minted, same-account, physically slot-consistent** 2.0 items that are actually marked equipped in the verified virtual custody history. It checks the pinned set ID, tier, role, unique item instance, original piece definition and unique equipment slot. It reports potential 2-/4-piece design milestones for **the original 15 actual Forge set families**. This is a *design inspection only*: `authorizedToExecuteCombat:false` and `activatedSetBonuses:0` are invariant. No percentage bonuses, resistances, innate set traits, market eligibility or boss rewards are added.

A deterministic two-piece QA case now assembles both real Fieldborn Guard set members from separately generated original Forge recipes and exact-copy rolls, joins their complete job/claim/XP/custody histories into one same-account, same-character source, and checks that **two source-matched pieces give one visible design milestone but zero combat effects**. The original executable bridge continues rejecting the set until its effect mechanics and coefficients are fully approved. A fabricated third copy cannot increase eligibility. A Bank-transferred copy remains eligible for the *new wearer* without erasing its original crafter.

Both modules are included in the private TypeScript build and public-import isolation check. The exact-head CI has to finish; existing broad validation on these hidden stacks is not clean. Nothing goes to `main`, production DB, the mobile UI, Player Market or a live combat flag.
