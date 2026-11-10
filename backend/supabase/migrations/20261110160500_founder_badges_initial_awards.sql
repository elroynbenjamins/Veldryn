-- Permanent, cosmetic-only Founder badge grants for the first approved players.
-- Verified against production auth.users + player_profiles on 2026-11-10.
-- Grants bind to immutable account IDs; a future character/username rename does not revoke them.
-- Requires 20261109222500_collectible_player_badges_v1.sql.
-- Do not automatically equip the badge: players choose it under Customize Profile.
begin;

insert into private.player_collectible_badges_v1 (account_id, badge_id)
values
  ('e873e542-7cb0-4d1d-a11e-d9f9a9708130'::uuid, 'founder'), -- Semux
  ('997261db-dafd-4354-96e6-2a28ae01aacc'::uuid, 'founder'), -- Drai
  ('7b5a0882-0d20-425d-be8c-7d919a98f4ed'::uuid, 'founder')  -- Setax
on conflict (account_id, badge_id) do nothing;

commit;
