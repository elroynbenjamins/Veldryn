-- Permanent, cosmetic-only Founder badge grants for the first approved players.
-- Verified against production auth.users + player_profiles on 2026-11-10.
-- Grants bind to immutable account IDs; a future character/username rename does not revoke them.
-- Requires 20261109222500_collectible_player_badges_v1.sql.
-- Do not automatically equip the badge: players choose it under Customize Profile.
begin;

-- Staging does not contain the production recipients. Skip absent accounts
-- rather than failing the migration's foreign-key check on a fresh database.
insert into private.player_collectible_badges_v1 (account_id, badge_id)
select recipients.account_id, 'founder'
from (values
  ('e873e542-7cb0-4d1d-a11e-d9f9a9708130'::uuid), -- Semux
  ('997261db-dafd-4354-96e6-2a28ae01aacc'::uuid), -- Drai
  ('7b5a0882-0d20-425d-be8c-7d919a98f4ed'::uuid)  -- Setax
) as recipients(account_id)
where exists (select 1 from auth.users as u where u.id=recipients.account_id)
on conflict (account_id, badge_id) do nothing;

commit;
