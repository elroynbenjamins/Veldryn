-- READ ONLY: candidates for manual investigation, never automatic deletion.
-- 30-day grace period, no hero/save, no pending link, no known commerce/social assets.
-- Absence from this list never implies abuse; presence never authorizes deletion.
with candidates as (
 select u.id
 from auth.users u
 where u.is_anonymous is true and u.deleted_at is null
 and greatest(u.created_at,coalesce(u.last_sign_in_at,u.created_at),coalesce(u.updated_at,u.created_at)) < now()-interval '30 days'
 and nullif(u.email,'') is null and nullif(u.email_change,'') is null
 and nullif(u.phone,'') is null and nullif(u.phone_change,'') is null
 and not exists(select 1 from auth.identities i where i.user_id=u.id and i.provider<>'anonymous')
 and not exists(select 1 from public.player_presence_5m p where p.account_id=u.id and p.last_seen_at>=now()-interval '30 days')
 and not exists(select 1 from public.characters c where c.account_id=u.id)
 and not exists(select 1 from public.online_game_states g where g.account_id=u.id)
 and not exists(select 1 from public.player_profiles p where p.account_id=u.id)
 and not exists(select 1 from public.account_bank_items b where b.account_id=u.id)
 and not exists(select 1 from private.google_play_purchases_v1 p where p.account_id=u.id)
 and not exists(select 1 from private.google_play_account_links_v1 p where p.account_id=u.id)
 and not exists(select 1 from private.account_commerce_entitlements_v1 p where p.account_id=u.id)
 and not exists(select 1 from private.commerce_promo_entitlements_v1 p where p.account_id=u.id)
 and not exists(select 1 from private.commerce_redeem_code_claims_v1 p where p.account_id=u.id)
 and not exists(select 1 from private.discord_founder_redeem_claims_v1 p where p.account_id=u.id)
 and not exists(select 1 from private.player_collectible_badges_v1 p where p.account_id=u.id)
 and not exists(select 1 from private.player_staff_badges_v1 p where p.account_id=u.id)
 and not exists(select 1 from private.supporter_badge_progress_v2 p where p.account_id=u.id)
 and not exists(select 1 from public.ops_redeem_code_claims p where p.account_id=u.id)
 and not exists(select 1 from public.event_cosmetic_unlocks p where p.account_id=u.id)
 and not exists(select 1 from public.guild_members p where p.account_id=u.id)
 and not exists(select 1 from public.party_members p where p.account_id=u.id)
 and not exists(select 1 from public.friendships p where p.account_a=u.id or p.account_b=u.id)
)
select count(*) as manual_review_candidates from candidates;
