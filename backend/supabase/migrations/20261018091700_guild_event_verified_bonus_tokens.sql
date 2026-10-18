-- Event bonus Guild Tokens derive exclusively from already-verified, finite
-- community milestone reward claims. No arbitrary client amount or event action
-- can mint tokens. These bonuses do NOT count toward the 250 weekly standard cap.
create or replace function public.guild_shop_claim_event_community_server_v1(
 p_account_id uuid,p_event_id text,p_milestone_percent integer
) returns bigint language plpgsql security invoker set search_path=public as $$
declare v_amount bigint;v_claim text;
begin
 if p_account_id is null or p_event_id is null
  or p_event_id !~ '^[A-Za-z0-9_-]{1,80}$'
  or p_milestone_percent not in (25,50,75,100)
 then raise exception 'invalid_guild_event_reward';end if;
 if not exists(select 1 from public.guild_members where account_id=p_account_id)
 then raise exception 'guild_membership_required';end if;
 if not exists(select 1 from public.event_community_claims
  where account_id=p_account_id and event_id=p_event_id
   and milestone_percent=p_milestone_percent)
 then raise exception 'guild_event_reward_not_earned';end if;
 v_amount:=case p_milestone_percent when 25 then 100 when 50 then 150
  when 75 then 200 else 350 end;
 v_claim:='guild-event-community:'||p_event_id||':'||p_milestone_percent::text;
 insert into public.guild_shop_claim_sources(
  account_id,claim_key,reward_amount,reward_kind
 ) values(p_account_id,v_claim,v_amount,'event')
 on conflict(account_id,claim_key) do nothing;
 return public.guild_shop_redeem_verified_claim_server_v2(p_account_id,v_claim);
end $$;
revoke all on function public.guild_shop_claim_event_community_server_v1(uuid,text,integer)
 from public,anon,authenticated;
grant execute on function public.guild_shop_claim_event_community_server_v1(uuid,text,integer)
 to service_role;

create or replace function public.guild_shop_event_community_rewards_server_v1(p_account_id uuid)
returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(
  jsonb_build_object('eventId',e.event_id,'milestonePercent',e.milestone_percent,
   'tokens',case e.milestone_percent when 25 then 100 when 50 then 150
    when 75 then 200 else 350 end,
   'claimed',exists(select 1 from public.guild_shop_claim_sources s
    where s.account_id=p_account_id
     and s.claim_key='guild-event-community:'||e.event_id||':'||e.milestone_percent::text
     and s.consumed_at is not null))
  order by e.claimed_at desc),'[]'::jsonb)
 from (
  select event_id,milestone_percent,claimed_at
  from public.event_community_claims
  where account_id=p_account_id and milestone_percent in (25,50,75,100)
   and exists(select 1 from public.guild_members where account_id=p_account_id)
  order by claimed_at desc limit 24
 ) e
$$;
revoke all on function public.guild_shop_event_community_rewards_server_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.guild_shop_event_community_rewards_server_v1(uuid)
 to service_role;
