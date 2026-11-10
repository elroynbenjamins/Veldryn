# Veldryn — Single equipped badge and Supporter prestige (v2)

**November 10, 2026** · **Implementation: GitHub main, migration awaiting deployment** · No live Supporter entitlement or privilege is changed by this feature.

## November 10 design update — four-stage star evolution (concept, not shipped)

**Direction chosen for next iteration:** Keep a recognizable five-point Supporter star silhouette across all variants, with the initial badge deliberately simpler and the star itself accumulating details. Avoid a completely different shield or unrelated emblem at higher tiers.

| Milestone | Proposed ID | Visual direction | Eligibility |
| --- | --- | --- | --- |
| Active / 0 months | `supporter` | Modest bronze-gold or muted purple five-point star; minimal rim, no wings/crown, readable at 20–38px | Active verified Supporter |
| 3 months | `supporter_3m` | Same star, refined silver edging and subtle cyan/silver accents, small side ornaments | Three consecutive verified months |
| 6 months | `supporter_6m` | Same star, rich gold rim and luminous gem center, slightly larger balanced side ornaments | Six consecutive verified months |
| 12 months | `supporter_12m` | Same star, premium layered gold/celestial glow, restrained crown/rays and ornate gem details | Twelve consecutive verified months |

Art rules: coherent silhouette, same footprint/anchor point, transparent pixel-art assets, no baked-in text, legible at chat size, and increasing ornament rather than simply changing hues. The player may select **any unlocked tier**, or None; there remains **one elective badge slot**. Staff badges stay independent. All Supporter tiers are cosmetic only. Tenure is based on verified *elapsed* uninterrupted active months, not advance-purchased entitlement. Do not falsely credit earlier months lacking verified payment history.

**Implementation status:** This is a revised design request. The current v2 TypeScript, 3-/6-month WebP assets, and pending SQL migration below are **still three-tier implementations** and have **not** been updated for a 12-month tier. Before release, replace/refine all four art assets together and extend ID validation, UI, server-side tier calculation, RPC checks, and tests; confirm dependencies and deploy migrations in order. Do not advertise 12 months as equippable until those steps are complete.

---

## Player-facing design

**Customize Profile → Appearance → Badges** is a dedicated tab, separate from Name Style.

- Exactly **one elective** badge can be equipped across collectibles and Supporter, or the player can choose **None**.
- Admin / Moderator badges are granted automatically and remain visible **in addition** to the elective slot. There are at most **two visible badges** (staff + chosen).
- Six earned badges remain available, with ownership and unlock instructions; locked badges cannot be equipped.
- All decisions are **account-wide**, not per character. The server validates actual ownership before saving.
- Previously selected two collectible badges are migrated to the **first** valid selected badge rather than silently discarded.
- Existing public identity caches continue to use the \`private.player_badges_v1\` snapshot, with the old RPCs preserved for older Android clients.

## Supporter badge variants

| Tier | Artifact ID | Visual | Requirement |
| --- | --- | --- | --- |
| Active Supporter (existing 1-month look) | \`supporter\` | Original existing badge | Active verified Supporter entitlement |
| Supporter · 3 Months | \`supporter_3m\` | Silver and cyan gem shield | 3 uninterrupted verified calendar months of Supporter |
| Supporter · 6 Months | \`supporter_6m\` | Gold and sapphire crowned shield | 6 uninterrupted verified calendar months of Supporter |

The same badge selector shows all three variants. The player can equip a **lower unlocked tier** if preferred, but only one badge appears publicly. On cancellation/expiration the Supporter badge is suppressed; it never continues showing just because the client has cached it. Staff authorization is independent.

The 3-/6-month tiers are earned from **elapsed, uninterrupted server-verified time**, not by purchasing/redeeming 3 or 6 months of future entitlement. Lifetime Supporter also earns milestones over time rather than instantly.

### Tenure-history limitation

Existing \`account_commerce_entitlements_v1\` and promo tables record whether Supporter is active and its expiration, **not a complete reliable historical subscription start**. The new private ledger therefore **starts its proof conservatively when the migration is installed**, and tracks future renewals/extensions automatically through server triggers. An account that has been supporting for months already cannot have its past tenure credited from these records alone; that will require a separate audited reconciliation against verifiable billing history. We deliberately do not backdate from a future expiry.

## Implementation

| Component | Repository file |
| --- | --- |
| Badge tab and selection | \`apps/mobile/src/components/ProfileEditor.tsx\`, \`apps/mobile/src/components/PlayerBadgeSettings.tsx\` |
| Server JSON normalization + one-slot display | \`apps/mobile/src/core/player-badges.ts\` |
| Account-scoped async save + cache invalidation | \`apps/mobile/src/online/player-badges.ts\`, \`PlayerBadgeProvider.tsx\` |
| Pixel art | \`apps/mobile/assets/player-badges-v1/supporter_3m.webp\`, \`supporter_6m.webp\` |
| Main SQL migration | \`backend/supabase/migrations/20261110153000_profile_badge_single_equip_supporter_tenure_v2.sql\` |
| Disposable PostgreSQL test | \`tools/test-player-badge-tenure-db.mjs\`, \`backend/supabase/tests/profile_badges_tenure_fixture.sql\` |
| App regression | \`apps/mobile/tests/player-badges.ts\` |

The SQL migration creates **only a private tenure table**, triggers and helper functions; all rows are RLS protected, with no client table grants. The new authenticated \`update_player_equipped_badge_v2\` accepts a single badge ID (or NULL for None) and derives the owning account from \`auth.uid()\`. It rejects Admin/Moderator identifiers, unavailable collectibles, inactive Supporter and unearned higher tiers. It never grants paid access, a staff role or any resource.

Existing \`public.player_badge_self_v1\`, \`private.player_badges_v1\`, \`public.update_player_featured_badges_v1\` and \`public.update_player_badge_preferences_v1\` are replaced *compatibly* so older clients can still load and update their preferences, with only one elective badge shown.

## Deployment order / constraints

1. Confirm **\`20261109222500_collectible_player_badges_v1.sql\`** and all its dependencies have been applied in target environment. Staging and production schema inspections on November 10 indicated the \`featured_badge_ids\` column was not yet present, so **do not blindly apply only the new migration**.
2. Validate the v2 migration using disposable PostgreSQL tests, then staging with real existing schema and no real player purchases.
3. Apply the migration through the normal Supabase migration workflow **before announcing the new 3-/6-month tiers as available**. The client now has a limited compatibility fallback for base Supporter and owned collectible selections on older servers, but never simulates or fabricates premium tenure tiers; full progression and server-side single-slot enforcement require v2.
4. Verify original/staff badge identities, current Supporter, old two-badge preference migration, locked-item rejection, 3/6-month tier thresholds, account switching and TTL expiry.
5. Keep all existing staff privileges unchanged. Supporter badges are cosmetics only.

**Status: Assets and application code committed, database migration not yet deployed, feature not yet live.** Do not announce the prestige tiers as immediately claimable until the migration and app build are both released.
