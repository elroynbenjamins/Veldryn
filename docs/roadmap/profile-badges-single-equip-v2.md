# Veldryn — Player badges: four-stage Supporter progression

**November 10, 2026** · Implemented on feature branch; release requires migration prerequisites and shipping an updated mobile build.

## User experience

**Customize Profile → Appearance → Badges** is a dedicated tab. Players can select **one** earned or Supporter badge (or None); the independent Admin/Moderator badge remains automatically visible. All badge choices are account-wide and checked by the server, never by client metadata.

## Four approved star badge assets

| Badge ID | Milestone | Design |
| --- | --- | --- |
| `supporter` | 0 months / active | Simple purple star, bronze-gold wings |
| `supporter_3m` | 3 months | Silver wings, cyan accent |
| `supporter_6m` | 6 months | Ornate gold wings and jewel decoration |
| `supporter_12m` | 12 months | Crown, gemstones, regal gold-and-silver wings |

All four are cosmetic; players can choose lower unlocked tiers. Assets are transparent, no baked-in labels and are loaded with static `require()` for offline use.

## Cumulative verified membership tracking

**Approved rule:** Earned time across separate verified Supporter periods **adds together**. Pausing/canceling freezes progress; rejoining resumes where the account left off. This replaces the previous consecutive-month requirement.

The private server ledger `private.supporter_badge_progress_v2` tracks `credited_seconds` settled from prior intervals and a `last_checkpoint_at` / `accruing` state for a currently covered interval. Time accrues only until the earlier of now or the prior verified entitlement expiry; expired gaps and prepaid future time do not count. Promos/lifetime entitlements count based on actual elapsed time. Paid and promotional coverage is combined so overlapping access is not counted twice. `private.supporter_badge_total_seconds_v2` is a read-only server calculation; `private.supporter_badge_tier_v2` compares earned seconds against 3, 6 and 12 calendar months anchored to the first recorded verified entitlement.

The authenticated badge self payload exposes `supporterTotalDays` (integer completed days) and `supporterTierMonths` (0 / 1 / 3 / 6 / 12). `update_player_equipped_badge_v2` validates ownership and active entitlement, and rejects counterfeit staff, locked collectibles and unearned tiers. Supporter badges cease displaying while the entitlement is inactive, but earned time remains in the ledger and will be available again upon reactivation.

**Historical limitation:** Existing entitlement expiry and general `updated_at` timestamps do *not* prove past continuous coverage or individual renewal cycles. Start from deployment for legacy accounts unless an audited billing-history reconciliation proves coverage. Never grant earlier milestone months from remaining prepaid time.

## Implementation files

- `apps/mobile/src/core/player-badges.ts`, `apps/mobile/src/online/player-badges.ts` and `PlayerBadgeProvider.tsx` — IDs, tier validation, summary and caching
- `apps/mobile/src/components/PlayerBadgeSettings.tsx` and `PlayerBadges.tsx` — selector, art and display
- `apps/mobile/assets/player-badges-v1/supporter*.webp` — four approved pixel-art assets
- `backend/supabase/migrations/20261110153000_profile_badge_single_equip_supporter_tenure_v2.sql` — cumulative ledger, four milestones, RLS, authenticated RPC and compatible old RPCs
- `apps/mobile/tests/player-badges.ts`, `tools/test-player-badge-tenure-db.mjs` — client and database regression

## Safe rollout

1. Apply prerequisite badge migrations including `20261109222500_collectible_player_badges_v1.sql` in their correct order, after verifying their dependencies. The collectible table and v2 tenure ledger were **not** in staging or production at the beginning of this work.
2. Run the disposable PostgreSQL fixtures and staging schema checks first. Verify lapse/rejoin, cross-account isolation, staff identity, expired entitlements, 3/6/12-month thresholds, and payment-status handling.
3. Deploy migrations through normal controlled flow, including pending Founder grants. Do not announce milestones live before verified migration deployment.
4. Ship a new Android build containing all four badge assets. No entitlement/grant/permission upgrade is caused by this cosmetic feature.
