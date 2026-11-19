# Veldryn reusable chest loot and settlement V67–V69

**19 November 2026 — hidden, test-only implementation. Not a production claim or currency API.**

## One engine. Different loot tables.

The shared server-only engine (`backend/src/server/loot/chest-loot-engine-v67.ts`) takes a *versioned, immutable table*:

- `tableId`, `version`: stable source and rates; **bump version for every changes to weights, odds or guarantees**, and retain old receipts
- `guarantees[]`: zero-or-more exact guaranteed currency/material/resource IDs and quantities
- `groups[]`: zero-or-more independently rolled groups (`equipment`, `material`, `consumable`, `pet`, `companion`, `cosmetic`, `currency`), each with 0–10,000 basis-point success chance, weighted item entries, optional **fixed stack quantities** and duplicate policy
- `duplicatePolicy`: `allow_duplicates`, `prefer_unowned` (prioritizes missing on an *already successful* hit, then repeats), or `unique_only` (no extra item after completing the set)
- Server-only RNG: existing V1 domain-separated HMAC stays unchanged for legacy Party/World rewards; new sources use independent V67 HMAC channels per group and table version. No client-generated rolls or rerolls.

An example future weekly winter chest (this is an **example, not an enabled reward**):

```ts
defineChestLootTableV67({
  tableId: 'winter_weekly_chest',
  version: 'winter_weekly_v1',
  guarantees: [{id: 'gold', quantity: 450}],
  groups: [
    {id: 'resources', type: 'material', chanceBps: 10000,
      duplicatePolicy: 'allow_duplicates',
      entries: [{id: 'ORE', weight: 2, quantity: 5}, {id: 'FISH', weight: 1, quantity: 3}]},
    {id: 'pet', type: 'pet', chanceBps: 50,
      duplicatePolicy: 'prefer_unowned',
      entries: [{id: 'PET_SNOWFOX', weight: 1}]}
  ]
})
```

**No loot engine code changes are required for new chest kinds.** The content owner adds a new server-authored, versioned table and a source adapter that *proves the player's eligibility*.

## Compatibility and drop rates

| Content | Earned chest sources | Gear chance **per chest** | Collection | Guaranteed currency/materials |
|---|---|---|---|---|
| Party Events (V51) | Participation, Preparation, Finale | 12%, 16%, 24% standard; Veteran +2pp for each; Heroic +4pp/+4pp/+5pp | Five pieces per story family, 20 total; missing-piece-first on gear hits | Chest-specific 8/10/16 Party Sigils, Gold, Gem Dust, Companion Essence |
| World Bosses (V58) | War Camp donations, three committed attempts, realm damage goal | **1%** for one of ten gathering gear slots | Ten slots per boss; missing-slot-first after gear hit | Gold, Companion Essence, Gem Dust, Tempering Dust; **no second World Sigils grant** |

New chest pools use unbiased HMAC rejection sampling for weighted selection after reading the account collection; legacy sources retain their already-published V1 roll mapping. Equipment, pets, companions and cosmetics are single-instance drops; stackable resources may define their exact quantity in the table. No pity system or guaranteed event equipment was introduced. Owning all pieces allows quality/rareness chase on subsequent hits, consistent with original catalogs. All rolled equipment item rarity, quality, affixes and physical custody remain with their **existing** authoritative item creation systems.

## Future-proof claim delivery (V69)

The hidden `chest-reward-settlement-v69.ts` contract establishes:

1. The player account is bound by authenticated server context, never a client-specified account ID.
2. A single **SERIALIZABLE** account-wide inventory lock plus unique account/source receipt and SQL connection covers every reward leg, ledger row and physical item grant.
3. Read the already-**committed** immutable receipt *first*. Replays cannot reroll even if secret or loot-table version changes. Verify old custody before returning it.
4. If first claim, load *server-verified* source eligibility, its approved versioned table, and account-wide owned items; then resolve rolls. If an equipment item wins, validate the destination character actually belongs to the authenticated account, and **freeze that character UUID** in the immutable receipt. The player cannot redirect gear by switching characters after the first claim. Persist the receipt first, pay guaranteed rewards, mint rolled drops via authoritative item writer, and verify all physical custody **before commit**.
5. Any failure rolls back receipt, currency and items together. Per-source unique constraints prevent double grant under concurrent retries.

This module currently provides **orchestration contracts and mock-transaction regression tests, not a deployed Postgres adapter**. It cannot be mounted as a public endpoint until actual canonical event proof, account-wallet/resource Inbox writers, Equipment 2.0 item templates and T5–T9 budgets, claim authorization, migration/RLS and load tests are approved. The review-only Party Sigils V65 and Party reward V61 SQL are not deployed.

## Test and readiness

- `chest-loot-engine-v67.ts` and `__tests__/chest-loot-engine-v67.ts` exercise all four Party families × all difficulties × all chest kinds, all three bosses × all chest kinds, exact old hit/piece rolls, guaranteed reward parity, future weighted multi-group drops, duplicate policies, immutable table config and secure entropy.
- `__tests__/chest-reward-settlement-v69.ts` exercises initial payout, receipt-first replay after config change, concurrent locked claims, corrupted/missing physical grants, rollback/retry, V1 legacy Party/World HMAC parity, and rejection of missing/foreign character destinations for equipment.
- `docs/roadmap/world-boss-account-erasure-v55-smoke.sql` was also corrected for a PostgreSQL variable-vs-column ambiguity found by CI.
- Keep **all V67 and V69 gates FALSE**, the consolidated Party Events branch and successor draft PRs unmerged to production, and all review-only SQL out of Supabase deployment folders.
