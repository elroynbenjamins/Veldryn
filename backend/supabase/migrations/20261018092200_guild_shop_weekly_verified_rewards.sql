-- Standard weekly Guild Token goals use authoritative Muster, Project and
-- Guild PvE records. No client-reported counts or caller-supplied token amounts.
create or replace function public.guild_shop_weekly_eligible_server_v1(
 p_account_id uuid,p_kind text
) returns boolean language plpgsql stable security invoker set search_path=public as $$
declare v_guild uuid;v_week timestamptz;
begin
 select guild_id into v_guild from public.guild_members
 where account_id=p_account_id limit 1;
 if v_guild is null then return false;end if;
 v_week:=date_trunc('week',now() at time zone 'utc') at time zone 'utc';
 if p_kind='attendance' then
  return (select count(distinct d.activity_date)>=4
   from public.guild_muster_daily d
   where d.account_id=p_account_id and d.guild_id=v_guild
    and d.activity_date>=v_week::date
    and d.activity_date<=(now() at time zone 'utc')::date
    and d.check_in_points>0);
 elsif p_kind='project' then
  return exists(
   select 1 from public.guild_project_member_progress progress
   join public.guild_project_instances project on project.id=progress.project_instance_id
   where progress.account_id=p_account_id and project.guild_id=v_guild
    and progress.raw_points>=greatest(10,coalesce(project.meaningful_contributor_threshold,10))
    and progress.last_contribution_at>=v_week
    and progress.last_contribution_at<now()
    and project.started_at>=v_week
    and project.started_at<now()
  );
 elsif p_kind='boss' then
  return exists(
   select 1 from public.guild_pve_claims_v1 claim
   join public.guild_pve_encounters_v1 boss on boss.id=claim.encounter_id
   where claim.account_id=p_account_id and boss.guild_id=v_guild
    and boss.kind='weekly'
    and claim.claimed_at>=v_week
    and claim.claimed_at<now()
  );
 end if;
 return false;
end $$;
revoke all on function public.guild_shop_weekly_eligible_server_v1(uuid,text)
 from public,anon,authenticated;
grant execute on function public.guild_shop_weekly_eligible_server_v1(uuid,text)
 to service_role;

create or replace function public.guild_shop_claim_weekly_server_v1(
 p_account_id uuid,p_kind text
) returns bigint language plpgsql security invoker set search_path=public as $$
declare v_amount bigint;v_week date;v_claim text;
begin
 v_amount:=case p_kind when 'attendance' then 50
  when 'project' then 40 when 'boss' then 30 else null end;
 if p_account_id is null or v_amount is null then
  raise exception 'invalid_weekly_guild_reward';end if;
 if not public.guild_shop_weekly_eligible_server_v1(p_account_id,p_kind)
 then raise exception 'weekly_guild_reward_not_earned';end if;
 v_week:=date_trunc('week',now() at time zone 'utc')::date;
 v_claim:='guild-weekly:'||v_week::text||':'||p_kind;
 insert into public.guild_shop_claim_sources(
  account_id,claim_key,reward_amount,reward_kind
 ) values(p_account_id,v_claim,v_amount,'standard')
 on conflict(account_id,claim_key) do nothing;
 return public.guild_shop_redeem_verified_claim_server_v2(p_account_id,v_claim);
end $$;
revoke all on function public.guild_shop_claim_weekly_server_v1(uuid,text)
 from public,anon,authenticated;
grant execute on function public.guild_shop_claim_weekly_server_v1(uuid,text)
 to service_role;

create or replace function public.guild_shop_weekly_rewards_server_v1(p_account_id uuid)
returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(
  jsonb_build_object(
   'kind',v.kind,'tokens',v.amount,
   'eligible',public.guild_shop_weekly_eligible_server_v1(p_account_id,v.kind),
   'claimed',exists(select 1 from public.guild_shop_claim_sources src
    where src.account_id=p_account_id and src.consumed_at is not null
     and src.claim_key='guild-weekly:'||
       (date_trunc('week',now() at time zone 'utc')::date)::text||':'||v.kind)
  ) order by v.ord),'[]'::jsonb)
 from (values (1,'attendance',50),(2,'project',40),(3,'boss',30))
  as v(ord,kind,amount)
$$;
revoke all on function public.guild_shop_weekly_rewards_server_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.guild_shop_weekly_rewards_server_v1(uuid)
 to service_role;
