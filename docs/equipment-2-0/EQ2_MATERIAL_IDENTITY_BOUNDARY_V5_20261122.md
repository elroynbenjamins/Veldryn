# Equipment / Crafting 2.0 — V5 exact material identity boundary

**22 November 2026. Hidden draft / review only. No main merge, public UI, SQL, drop changes, player payouts or activation.**

## What V5 actually adds

The new server-only `equipment-crafting-v2-stackable-material-boundary-review.ts` enumerates the **29 exactly identified proposed EQ2 stackable materials** from the unchanged V3 source catalogue: **14 unregistered raw monster/gathering source inputs** and **15 unregistered new processing outputs**. This is a source-auditable *identity classification*, not an item registry registration.

All records are explicitly `registered:false`, `sourceOrProcessingReceiptVerified:false`, `permittedInOwnedInventory:false`, `permittedInBank:false`, `permittedOnMarket:false`, `mayMint:false`. The V5 diagnostic always returns `mayStore:false` and `mayTrade:false`, regardless of input quantity or any caller-provided verification flag. **The existing v2 account projection's blanket `EQ2_` storage rejection remains unchanged.**

The accompanying test cross-checks all 29 IDs against the **actual V3 14 unregistered raw source definitions** and **15 proposed processing outputs**, asserts that each of the 746 foundation/alternate routes references one or more still-blocked EQ2 material keys, and rejects fake equipment IDs disguised as stack quantities, missing optional rare registrations, poison keys, invalid amounts, and client-supplied “verified” claims.

### Existing identities that must not be rewritten

- `IRONWOOD_FANG`, `COPPER_ORE`, `ASTER_IRON_ORE` and other registered legacy inputs retain their existing identities.
- `SUNSTONE_INGOT` retains the existing **single canonical** `SMELT_SUNSTONE_INGOT` route. It is **not** one of the 15 new EQ2 processed items.
- `EQ2_VERDANT_ESSENCE` is a separately considered optional T1 rare, **not** among the 14 required registrations; it remains forbidden as a stored stack until independently authored and sourced.
- `EQ2_LAUNCH_%`, new gear IDs, equipment copies, gems and arbitrary `EQ2_` prefixes can never gain stackable status from the name alone.
- `EQ2_GLASSBOUND_DUST` still needs an independently accessible gathering/trade route, not just combat drops. `EQ2_SUNSCAR_HIDE` still needs an actual hide-bearing source, not fictional scorpion hide.

## V5 is *not* a craft/loot/Market transaction

This new boundary is never imported into production account mutation paths. `previewEq2ReviewedReservation` remains a non-executable 746-route debit preview. `resolveEquipmentV2DraftCommand` remains gated and its validator still refuses all `EQ2_` stack keys. A valid-looking client receipt cannot register a new material. No real stack, queue, Gold debit, finished equipment, XP or Market escrow is created here.

## Release-blocking follow-up implementation order

1. **Material origin registration:** approve each of the 14 raw source IDs against a real server-owned monster/node and reward or resource provenance, including level-2 Boar accessibility, level-26 T3 scarce bridge, T3 hide-bearing wildlife, and profession-only T4 Dust supply. Register each new processing output against exactly one canonical transform, input debits, receipt and XP award.
2. **Trusted store classifier:** add these IDs to an independently authenticated registry tagged `stackable_material` only after their source registrations exist. Do not remove the global `EQ2_` rejection without source-specific type checks that keep all equipment/gem/copy/unknown IDs invalid.
3. **One atomic account commit:** integrate source rewards, inventory+Bank stacks, per-character Gold, queue ownership, registered recipe/version, immutable source receipt, and once-only XP/item issuance in a SERIALIZABLE account transaction. Replay returns the stored result; conflicts and missing material fail without partial debit. Protect alt characters and item copy cap 25.
4. **Independent careers/Player Market:** craft permission from Smithing/Tailoring (ultimately T1–T9) regardless of combat level or unrelated profession; wear permission is separate. Allow future trade/commissions only after verified inventory escrow, one-owner receipts and restricted-source gear classification.
5. **Measured readiness:** use disposable PostgreSQL 17 concurrent accounts and two-connection contention tests, replay/refund/crash simulations, all 746 recipes, nine classes/18 specializations, rare-drop supply and real mobile/Edge parity. Final item identity, XP/Gold/drop balance and visual UI/themes require owner approval.

**Launch status: HOLD.** The first safe step was to encode a strict inventory identity boundary. Actual registered source/drop rates, transaction adapter, material-typing migration, real market custody and staging parity remain unimplemented.
