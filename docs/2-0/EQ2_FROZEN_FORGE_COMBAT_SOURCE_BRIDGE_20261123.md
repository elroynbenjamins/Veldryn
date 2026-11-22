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