# Veldryn — Single equipped badge and Supporter prestige (v2)

**November 10, 2026** · **Implementation: GitHub main, migration awaiting deployment** · No live Supporter entitlement or privilege is changed by this feature.

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
3. Apply the migration through the normal Supabase migration workflow, **before distributing a mobile build** that calls \`update_player_equipped_badge_v2\`. The client will show an RPC-not-available error if new UI runs against the previous database.
4. Verify original/staff badge identities, current Supporter, old two-badge preference migration, locked-item rejection, 3/6-month tier thresholds, account switching and TTL expiry.
5. Keep all existing staff privileges unchanged. Supporter badges are cosmetics only.

**Status: Assets and application code committed, database migration not yet deployed, feature not yet live.** Do not announce the prestige tiers as immediately claimable until the migration and app build are both released.
