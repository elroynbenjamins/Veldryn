-- One shared weekly ladder. Existing contracts and earned grants are preserved.
update public.party_contract_definitions_v16 set active=false
where definition_id in ('party_weekly_combat_v1','party_weekly_skilling_v1','party_weekly_mixed_v1');
insert into public.party_contract_definitions_v16(definition_id,version,name,category,cadence,minimum_personal_rate,reward_json)
values('party_weekly_ladder_v1',1,'Adventure together','mixed','weekly',0.08,'{"gold":0}')
on conflict(definition_id,version) do nothing;
insert into public.party_contract_objectives_v16(definition_id,definition_version,objective_id,activity_kind,metric,target_units,expected_seconds_per_unit,difficulty,point_budget)
values('party_weekly_ladder_v1',1,'shared_effort','mixed','verified_party_effort_seconds',288000,1,'standard',80000)
on conflict do nothing;
alter table public.party_contract_member_progress_v16 add column if not exists effort_seconds numeric(18,4) not null default 0;

-- Coverage is account-wide: overlapping claims and switching parties cannot reuse time.
create table public.party_weekly_effort_coverage_v1(
 account_id uuid not null references auth.users(id) on delete cascade,
 week_start timestamptz not null,
 covered tstzmultirange not null default '{}',
 primary key(account_id,week_start)
);
alter table public.party_weekly_effort_coverage_v1 enable row level security;
revoke all on public.party_weekly_effort_coverage_v1 from public,anon,authenticated;
grant all on public.party_weekly_effort_coverage_v1 to service_role;

create function public.party_weekly_tiers_v1()
returns table(tier text,target_points integer,personal_points integer,gold integer,cumulative_gold integer)
language sql immutable set search_path='' as $$
 values ('bronze',4000,320,250,250),('silver',16000,1280,500,750),
        ('gold',40000,3200,1000,1750),('platinum',80000,6400,2250,4000)
$$;
revoke all on function public.party_weekly_tiers_v1() from public,anon,authenticated;
grant execute on function public.party_weekly_tiers_v1() to service_role;

create function public.credit_party_weekly_effort_v1(p_account uuid,p_intervals jsonb,p_now timestamptz default now())
returns void language plpgsql security definer set search_path='' as $$
declare m record;a jsonb;v_start timestamptz;v_end timestamptz;v_week timestamptz;v_next timestamptz;
 v_covered tstzmultirange;v_new tstzmultirange;v_seconds numeric;v_instance uuid;v_total integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_account,0));
 select pm.party_id,pm.joined_at into m from public.party_members pm join public.parties p on p.id=pm.party_id
 where pm.account_id=p_account and pm.left_at is null and p.status<>'disbanded';
 if not found then return;end if;
 if jsonb_typeof(p_intervals) is distinct from 'array' then raise exception 'invalid_effort_intervals';end if;
 for a in select * from jsonb_array_elements(p_intervals) loop
  if coalesce(a->>'kind','') not in ('combat','skilling') or jsonb_typeof(a->'startsAtMs') is distinct from 'number'
   or jsonb_typeof(a->'endsAtMs') is distinct from 'number' then continue;end if;
  -- Only this membership's time, never future time. Offline credit has a seven-day grace window.
  v_start:=greatest(to_timestamp((a->>'startsAtMs')::numeric/1000),m.joined_at,p_now-interval '7 days');
  v_end:=least(to_timestamp((a->>'endsAtMs')::numeric/1000),p_now);
  while v_start<v_end loop
   v_week:=date_trunc('week',v_start at time zone 'UTC') at time zone 'UTC';
   v_next:=least(v_end,v_week+interval '7 days');
   insert into public.party_weekly_effort_coverage_v1(account_id,week_start) values(p_account,v_week) on conflict do nothing;
   select covered into v_covered from public.party_weekly_effort_coverage_v1 where account_id=p_account and week_start=v_week for update;
   v_new:=tstzmultirange(tstzrange(v_start,v_next,'[)'))-v_covered;
   select coalesce(sum(extract(epoch from upper(r)-lower(r))),0) into v_seconds from unnest(v_new) r;
   if v_seconds>0 then
    v_instance:=public.create_party_contract_instance_v16('weekly:'||m.party_id||':party_weekly_ladder_v1:'||to_char(v_week at time zone 'UTC','YYYY-MM-DD'),m.party_id,
     'party_weekly_ladder_v1',1,to_char(v_week at time zone 'UTC','YYYY-MM-DD'),v_week,v_week+interval '7 days');
    perform 1 from public.party_contract_instances_v16 where id=v_instance for update;
    update public.party_weekly_effort_coverage_v1 set covered=covered+v_new where account_id=p_account and week_start=v_week;
    insert into public.party_contract_member_progress_v16(instance_id,account_id,effort_seconds,normalized_points)
     values(v_instance,p_account,v_seconds,floor(v_seconds/3.6)::integer)
     on conflict(instance_id,account_id) do update set effort_seconds=public.party_contract_member_progress_v16.effort_seconds+excluded.effort_seconds,
      normalized_points=floor((public.party_contract_member_progress_v16.effort_seconds+excluded.effort_seconds)/3.6)::integer,updated_at=now();
    insert into public.party_contract_progress_v16(instance_id,objective_id,units,normalized_points)
     values(v_instance,'shared_effort',v_seconds,floor(v_seconds/3.6)::integer)
     on conflict(instance_id,objective_id) do update set units=public.party_contract_progress_v16.units+excluded.units,
      normalized_points=floor((public.party_contract_progress_v16.units+excluded.units)/3.6)::integer,updated_at=now();
    select normalized_points into v_total from public.party_contract_progress_v16 where instance_id=v_instance and objective_id='shared_effort';
    -- Re-evaluate every member at each settlement. Late qualifiers remain eligible after Platinum.
    insert into public.party_contract_reward_entitlements_v16(instance_id,account_id,reward_key,reward_json)
     select v_instance,mp.account_id,'tier:'||t.tier,jsonb_build_object('gold',t.gold,'tier',t.tier)
     from public.party_contract_member_progress_v16 mp cross join public.party_weekly_tiers_v1() t
     where mp.instance_id=v_instance and v_total>=t.target_points and mp.normalized_points>=t.personal_points
     on conflict(instance_id,account_id,reward_key) do nothing;
   end if;
   v_start:=v_next;
  end loop;
 end loop;
end $$;
revoke all on function public.credit_party_weekly_effort_v1(uuid,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.credit_party_weekly_effort_v1(uuid,jsonb,timestamptz) to service_role;

-- Hook after the trusted gameplay commit, before the guild-membership early return.
-- This preserves the existing commit implementation and its retry handling.
do $$ declare def text;begin
 if to_regprocedure('public.commit_online_game_guild_pve_v1(uuid,bigint,bigint,text,text,jsonb,jsonb,uuid)') is null then
  raise exception 'party_ladder_requires_verified_effort_gateway';
 end if;
 select pg_get_functiondef('public.commit_online_game_guild_pve_v1(uuid,bigint,bigint,text,text,jsonb,jsonb,uuid)'::regprocedure) into def;
 if position('credit_party_weekly_effort_v1' in def)=0 then
  if position('if v_prior then return v_result;end if;' in def)=0 then raise exception 'gameplay_commit_changed_review_required';end if;
  def:=replace(def,'if v_prior then return v_result;end if;',
   'if v_prior then return v_result;end if; perform public.credit_party_weekly_effort_v1(p_account_id,coalesce(p_response->''guildProjectEffort'',''[]''::jsonb),now());');
  execute def;
 end if;
end $$;

alter function public.party_social_state_v16() rename to party_social_state_before_weekly_tiers_v1;
revoke all on function public.party_social_state_before_weekly_tiers_v1() from public,anon,authenticated;
create function public.party_social_state_v16()
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb;c jsonb;items jsonb:='[]';v_tiers jsonb;i public.party_contract_instances_v16;uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'authentication_required';end if;
 s:=public.party_social_state_before_weekly_tiers_v1();
 -- Legacy expired contracts were omitted. Keep the ladder visible during offline settlement grace.
 if s->'party' is not null and s->'party'<>'null'::jsonb then
  for i in select x.* from public.party_contract_instances_v16 x where x.party_id=(s#>>'{party,id}')::uuid
   and x.definition_id='party_weekly_ladder_v1' and x.ends_at>now()-interval '7 days' order by x.starts_at desc loop
   select jsonb_build_object('id',i.id,'name','Adventure together','cadence','weekly','status',i.status,
    'endsAtMs',extract(epoch from i.ends_at)*1000,'weeklyLadder',true,'targetPoints',80000,
    'totalPoints',coalesce((select normalized_points from public.party_contract_progress_v16 where instance_id=i.id and objective_id='shared_effort'),0),
    'personalPoints',coalesce((select normalized_points from public.party_contract_member_progress_v16 where instance_id=i.id and account_id=uid),0))
    into c;
   select jsonb_agg(jsonb_build_object('tier',t.tier,'targetPoints',t.target_points,'minimumPersonalPoints',t.personal_points,
    'gold',t.gold,'cumulativeGold',t.cumulative_gold,'reached',(c->>'totalPoints')::numeric>=t.target_points,
    'qualified',(c->>'personalPoints')::numeric>=t.personal_points,'rewardId',r.id,
    'claimed',coalesce(r.claimed_at is not null,false) or exists(select 1 from public.server_action_receipts ar where ar.account_id=uid
     and ar.action='party_contract_reward' and ar.idempotency_key=i.definition_id||':'||i.season_key||':tier:'||t.tier))
    order by t.target_points) into v_tiers
    from public.party_weekly_tiers_v1() t left join public.party_contract_reward_entitlements_v16 r on r.instance_id=i.id and r.account_id=uid and r.reward_key='tier:'||t.tier;
   items:=items||jsonb_build_array(c||jsonb_build_object('tiers',v_tiers));
  end loop;
 end if;
 for c in select * from jsonb_array_elements(s->'contracts') loop
  if not exists(select 1 from public.party_contract_instances_v16 x where x.id=(c->>'id')::uuid and x.definition_id='party_weekly_ladder_v1') then items:=items||jsonb_build_array(c);end if;
 end loop;
 return jsonb_set(s,'{contracts}',items);
end $$;
revoke all on function public.party_social_state_v16() from public,anon;
grant execute on function public.party_social_state_v16() to authenticated,service_role;
