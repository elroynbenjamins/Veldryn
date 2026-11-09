# Player collectible badges (v1)

Approved visual direction (Nov 9, 2026): six ornate, text-free pixel-art badges, based on the approved six-panel sheet. The Founder design uses a parchment, quill and wax seal rather than Admin's authority imagery.

## Catalog and rewards

| Badge | Eligibility / owner | Notes |
| --- | --- | --- |
| Founder | Manual trusted award | Early founding players; no automatic backfill. |
| Beta Tester | Manual trusted award | Genuine pre-release participants. |
| Veteran | Automatic after 90 days account age | Account-wide, recalculated on the server. |
| Guild Leader | Current leader in `public.guild_members` | Recalculates immediately when leadership changes; no permanent role spoofing. |
| Community Champion | Manual trusted award | Community merit. |
| Event Champion | Manual trusted award | Event winners / special achievements; automated events can be integrated later. |

This initial policy can be adjusted independently from the artwork, but **do not grant Founder/Beta/Community/Event badges en masse without explicit eligibility rules**.

All awards are cosmetic. Admin/Moderator identities remain separate and can never be conferred by collectible ownership. Supporter remains an existing commerce-derived badge and its visibility toggle remains intact.

## Presentation and ownership

- Each badge is shipped as a **64×64 transparent optimized WebP** under `apps/mobile/assets/player-badges-v1/`; the repository already uses WebP for this player-name badge system. The source is the approved high-resolution concept image, cropped and alpha-cleaned, then scaled for compact 20–30dp usage.
- Show at most **two** badges after a username, in order: Staff, two manually featured collectibles, then Supporter as available room permits. The full owned catalog remains in Profile customization.
- Players can feature up to two **owned** collectibles through the Profile > Name Style > Player Badges settings. No new badges are equipped by default; unlocked collectibles can be explicitly chosen.
- Server public identity snapshots expose only featured badges (not whole collections). The private self RPC exposes current unlocks, for the selector.
- Older Android builds ignore the new `extras` JSON field and continue rendering current Admin / Moderator / Supporter badges.

## Backend rollout

Migration `backend/supabase/migrations/20261109222500_collectible_player_badges_v1.sql` creates a private, RLS-protected entitlement table and server-validated featured-badge selection. **Merging to GitHub does not deploy the migration**. Apply and verify staging, then production, separately; until then the new client should only be distributed after RPC rollout. Do not treat the code merge as a live grant.

For manually awarded accounts, operations must use an authenticated trusted admin process and insert directly in `private.player_collectible_badges_v1`; no public RPC accepts badge grant requests. Never rely on `raw_user_meta_data`.

Tests: `apps/mobile/tests/player-badges.ts` covers spoofed IDs, entitlement filtering, compact display, expired projection, and server-function contracts.
