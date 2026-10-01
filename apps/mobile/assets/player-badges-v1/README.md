# Player Badges V1

Generated with the built-in image generation tool. Transparent PNGs are stored here and referenced by `PlayerBadges.tsx`.

## Prompt Set

Shared direction: production VELDRYN fantasy RPG UI badge; bold silhouette readable at 20px; hand-painted inventory icon aesthetic; restrained beveled metal; simple bright highlights; centered on a square transparent canvas; no text, watermark, background, halo, or extra objects.

- Supporter: five-point golden star with a warm amber gemstone inset; no crown or shield.
- Admin: compact three-point crimson enamel crown with gold edging and a ruby inset; no shield or star.
- Moderator: cobalt enamel heater shield with silver edging and a single silver check mark; no crown or star.

## Server Integration

`backend/supabase/migrations/20260927131912_player_identity_badges.sql` was deployed to staging and production on 2026-09-27. Its function bodies resolve the later-dated commerce/rankings dependencies at runtime; run the full migration chain on new databases. Updated client and rankings adapter releases are still required for those displays in distributed builds.

Enabled Control Center owners display Admin automatically. Other staff identities are assigned by trusted operators through `private.player_staff_badges_v1` (`account_id`, `role`: `admin` or `moderator`, `enabled`). Do not expose this table to game clients. These rows are display identities only and do not grant moderation permissions. To revoke an owner's Admin identity, disable their actual Control Center owner role as well.

Supporter comes from the existing server commerce entitlement, honors subscription expiry and the account-wide visibility preference. Staff badges cannot be hidden through that preference. Cached projections expire after at most two minutes. Visible social identities refresh in batches every minute and on foreground; self identity and rankings refresh on the same cadence.

`backend/supabase/tests/player_identity_badges.sql` passed on staging with all fixtures rolled back. A separate authenticated-role test verified that the preference RPC works and direct staff-table writes are denied. Production read-only checks verified the owner resolves to Admin via both the self and social identity RPCs; anonymous execution is denied and rankings remains service-only.

Deployment history: staging is aligned to local version `20260927131912`; production currently records the same migration as `20260927145351`. Production timestamp alignment was blocked by deployment approval review and awaits explicit approval. Do not blindly push the local badge migration again. No gameplay Edge Function or client build was deployed in this pass.
