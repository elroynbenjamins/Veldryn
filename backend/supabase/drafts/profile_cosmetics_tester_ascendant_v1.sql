-- VERIFIED ON PRODUCTION 2026-11-24; NON-EXECUTABLE DRAFT.
-- Purpose: schema/public-projection support for account-scoped hidden profile-cosmetics QA.
-- Do not grant tester access in a migration. Tester grants are an ops action and must be additive.

alter table private.player_collectible_badges_v1
 drop constraint if exists player_collectible_badges_v1_badge_id_check;
alter table private.player_collectible_badges_v1
 add constraint player_collectible_badges_v1_badge_id_check check(badge_id in (
  'founder','veteran','guild_leader','community_champion','event_champion',
  'ascendant_sovereign_of_stars','ascendant_dragon_sovereign','ascendant_monarch_of_deep','ascendant_beyond_existence'
 ));

alter table private.player_badge_preferences_v1
 drop constraint if exists player_badge_one_selection_v2;
alter table private.player_badge_preferences_v1
 add constraint player_badge_one_selection_v2 check(equipped_badge_id in (
  'auto','none','vip','vip_plus','supporter','supporter_3m','supporter_6m','supporter_12m',
  'founder','veteran','guild_leader','community_champion','event_champion',
  'ascendant_sovereign_of_stars','ascendant_dragon_sovereign','ascendant_monarch_of_deep','ascendant_beyond_existence'
 ));

alter table private.player_badge_preferences_v1
 drop constraint if exists player_profile_badges_v3;
alter table private.player_badge_preferences_v1
 add constraint player_profile_badges_v3 check(
  cardinality(profile_badge_ids)<=3
  and profile_badge_ids<@array[
   'vip','vip_plus','supporter','supporter_3m','supporter_6m','supporter_12m',
   'founder','veteran','guild_leader','community_champion','event_champion',
   'ascendant_sovereign_of_stars','ascendant_dragon_sovereign','ascendant_monarch_of_deep','ascendant_beyond_existence'
  ]::text[]
 );

-- update_player_equipped_badge_v2 must accept the same four Ascendant IDs in
-- both the validation list and the collectible-featured list. Preserve all
-- existing Supporter/VIP ownership checks and grants when generating the official migration.

-- Public profile projection:
-- profile_public_v43 must include character.profileEffectId as effectId and
-- cosmeticsPreview = account.entitlements.profile_cosmetics_tester_v1 === true.
-- profile_character_public_v1 must include profileEffectId as effectId.
--
-- These projections do not grant or release cosmetics. They only let clients
-- render an already-owned tester cosmetic on public profiles.
