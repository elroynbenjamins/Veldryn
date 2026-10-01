begin;
-- One automatic weekly project at every guild level. Development boards stay dormant.
insert into public.guild_project_definitions(template_id,version,definition_json,config_hash) values
('guild_weekly_shared_effort',1,'{"name":"United for Veldryn","description":"Hunt or gather to build your Guild Hall. Every active minute earns 20 effort, up to 2,400 per earned UTC day. Completion awards 200 Hall progress and qualifying members can claim 500 Gold.","minGuildLevel":1,"guildHallProgress":200,"goldReward":500}','shared-effort-v1') on conflict do nothing;
create table public.guild_project_effort_days_v1(
 project_id uuid references public.guild_project_instances(id) on delete cascade,
 account_id uuid references auth.users(id) on delete cascade,
 earned_day date,credited_ms bigint not null default 0 check(credited_ms between 0 and 7200000),
 primary key(project_id,account_id,earned_day));
alter table public.guild_project_effort_days_v1 enable row level security;
revoke all on public.guild_project_effort_days_v1 from public,anon,authenticated;
grant all on public.guild_project_effort_days_v1 to service_role;

alter table public.guild_project_reward_claims enable row level security;
create policy "accounts read own project rewards v2" on public.guild_project_reward_claims for select to authenticated using(account_id=auth.uid());
grant select on public.guild_project_reward_claims,public.guild_project_instances,public.guild_project_member_progress,public.guild_project_resource_progress,public.guild_activity_feed to authenticated;

create function public.ensure_guild_weekly_project_v2(p_guild uuid,p_now timestamptz) returns void
language plpgsql security definer set search_path=public as $$
declare s timestamptz:=date_trunc('week',p_now at time zone 'UTC') at time zone 'UTC';p uuid;n integer;d jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('guild-project:'||p_guild,0));
 update guild_project_instances set status='expired' where guild_id=p_guild and status='active' and ends_at<=p_now;
 if exists(select 1 from guild_project_instances where guild_id=p_guild and (cycle_key='weekly:'||to_char(s at time zone 'UTC','YYYY-MM-DD') or status='active')) then return;end if;
 perform 1 from guild_members where guild_id=p_guild for share;
 select count(*) into n from guild_members where guild_id=p_guild;
 if n=0 then return;end if;
 select definition_json into d from guild_project_definitions where template_id='guild_weekly_shared_effort' and version=1;
 insert into guild_project_instances(guild_id,template_id,definition_version,definition_snapshot,config_hash,kind,focus,slot_index,cycle_key,started_at,ends_at,active_member_snapshot,target_points,minimum_meaningful_contributors,meaningful_contributor_threshold,personal_reward_threshold,single_account_completion_share_cap,mixed_minimum_fraction)
 values(p_guild,'guild_weekly_shared_effort',1,d,'shared-effort-v1','weekly_campaign','mixed',1,'weekly:'||to_char(s at time zone 'UTC','YYYY-MM-DD'),s,s+interval '7 days',n,greatest(2400,n*1200),greatest(1,ceil(n*.2)),250,300,case when n=1 then 1 else .5 end,0) returning id into p;
 insert into guild_project_member_progress(project_instance_id,account_id,was_member_at_start,joined_at_snapshot)
 select p,account_id,true,greatest(joined_at,s) from guild_members where guild_id=p_guild;
end $$;
revoke all on function public.ensure_guild_weekly_project_v2(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.ensure_guild_weekly_project_v2(uuid,timestamptz) to service_role;

create function public.prepare_guild_projects_v2() returns void language plpgsql security definer set search_path=public as $$
declare g uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select guild_id into g from guild_members where account_id=auth.uid() for share;
 if g is not null then perform ensure_guild_weekly_project_v2(g,now());end if;
end $$;
revoke all on function public.prepare_guild_projects_v2() from public,anon;
grant execute on function public.prepare_guild_projects_v2() to authenticated;

create function public.credit_guild_project_effort_v2(p_account uuid,p_guild uuid,p_effort jsonb,p_now timestamptz) returns void
language plpgsql security definer set search_path=public as $$
declare p record;m record;a jsonb;s timestamptz;t timestamptz;day_start timestamptz;day_end timestamptz;j timestamptz;b bigint;c bigint;points bigint;combat bigint;skills bigint;allowed bigint;binding uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_account,0));
 perform ensure_guild_weekly_project_v2(p_guild,p_now);
 select joined_at into j from guild_members where account_id=p_account and guild_id=p_guild for share;
 if not found then return;end if;
 for p in select * from guild_project_instances where guild_id=p_guild and template_id='guild_weekly_shared_effort' and status in('active','expired','completed') and ends_at+interval '7 days'>p_now order by id for update loop
 select * into m from guild_project_member_progress where project_instance_id=p.id and account_id=p_account;
 if not found then continue;end if;
 combat:=0;skills:=0;
 for a in select * from jsonb_array_elements(p_effort) loop
 if a->>'kind' not in('combat','skilling') or jsonb_typeof(a->'startsAtMs') is distinct from 'number' or jsonb_typeof(a->'endsAtMs') is distinct from 'number' then continue;end if;
 s:=greatest(to_timestamp((a->>'startsAtMs')::numeric/1000),p.started_at,m.joined_at_snapshot,j);
 t:=least(to_timestamp((a->>'endsAtMs')::numeric/1000),p.ends_at,p_now);
 if t<=s then continue;end if;
 insert into guild_project_cycle_bindings(cycle_key,account_id,guild_id,bound_at,points_at_bind) values(p.cycle_key,p_account,p_guild,p_now,1) on conflict do nothing;
 select guild_id into binding from guild_project_cycle_bindings where cycle_key=p.cycle_key and account_id=p_account;
 if binding<>p_guild then continue;end if;
 while s<t loop
 day_start:=date_trunc('day',s at time zone 'UTC') at time zone 'UTC';day_end:=least(t,day_start+interval '1 day');
 insert into guild_project_effort_days_v1 values(p.id,p_account,(day_start at time zone 'UTC')::date,0) on conflict do nothing;
 select credited_ms into b from guild_project_effort_days_v1 where project_id=p.id and account_id=p_account and earned_day=(day_start at time zone 'UTC')::date for update;
 c:=least(7200000,b+floor(extract(epoch from day_end-s)*1000));points:=floor(c/3000.0)-floor(b/3000.0);
 update guild_project_effort_days_v1 set credited_ms=c where project_id=p.id and account_id=p_account and earned_day=(day_start at time zone 'UTC')::date;
 if a->>'kind'='combat' then combat:=combat+points;else skills:=skills+points;end if;s:=day_end;
 end loop;
 end loop;
 points:=combat+skills;
 if points=0 then continue;end if;
 allowed:=greatest(0,least(points,ceil(p.target_points*p.single_account_completion_share_cap)-m.completion_points));
 update guild_project_member_progress set raw_points=raw_points+points,completion_points=completion_points+allowed,combat_points=combat_points+combat,skilling_points=skilling_points+skills,first_contribution_at=coalesce(first_contribution_at,p_now),last_contribution_at=p_now where project_instance_id=p.id and account_id=p_account;
 update guild_project_instances set completion_points=completion_points+allowed,combat_points=combat_points+combat,skilling_points=skilling_points+skills,meaningful_contributors=(select count(*) from guild_project_member_progress where project_instance_id=p.id and raw_points>=250) where id=p.id;
 update guild_project_instances set status='completed',completed_at=p_now,completion_snapshot=jsonb_build_object('hallProgress',200,'gold',500) where id=p.id and status<>'completed' and completion_points>=target_points and meaningful_contributors>=minimum_meaningful_contributors;
 end loop;
end $$;
revoke all on function public.credit_guild_project_effort_v2(uuid,uuid,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.credit_guild_project_effort_v2(uuid,uuid,jsonb,timestamptz) to service_role;

create function public.claim_guild_project_reward_v2(p_project uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();g record;p record;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into g from online_game_states where account_id=uid for update;
 if g.character_id is null then raise exception 'CHARACTER_REQUIRED';end if;
 perform 1 from guild_members where account_id=uid for share;
 select * into p from guild_project_instances where id=p_project and template_id='guild_weekly_shared_effort' and guild_id=(select guild_id from guild_members where account_id=uid);
 if not found then raise exception 'PROJECT_UNAVAILABLE';end if;
 if exists(select 1 from guild_project_reward_claims where project_instance_id=p.id and account_id=uid and reward_key='completion') then return '{"alreadyClaimed":true}';end if;
 if p.status<>'completed' or now()>=p.ends_at+interval '7 days' then raise exception 'REWARD_UNAVAILABLE';end if;
 if coalesce((select raw_points from guild_project_member_progress where project_instance_id=p.id and account_id=uid),0)<p.personal_reward_threshold then raise exception 'CONTRIBUTION_REQUIRED';end if;
 insert into guild_project_reward_claims(project_instance_id,account_id,reward_key) values(p.id,uid,'completion');
 insert into character_wallets(character_id,gold) values(g.character_id,500) on conflict(character_id) do update set gold=character_wallets.gold+excluded.gold;
 update online_game_states set revision=revision+1,updated_at=now(),state=jsonb_set(state,'{character,gold}',to_jsonb((select gold from character_wallets where character_id=g.character_id))) where account_id=uid;
 return '{"alreadyClaimed":false,"gold":500}';
end $$;
revoke all on function public.claim_guild_project_reward_v2(uuid) from public,anon;
grant execute on function public.claim_guild_project_reward_v2(uuid) to authenticated;

create or replace function public.commit_online_game_guild_pve_v1(
 p_account_id uuid,p_expected_version bigint,p_expected_gold bigint,p_request_id text,p_request_hash text,p_response jsonb,p_contributions jsonb,p_deleted_character_id uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb;v_prior boolean;gid uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_account_id,0));
 select exists(select 1 from public.server_action_receipts where account_id=p_account_id and action='online_game_v1' and idempotency_key=p_request_id) into v_prior;
 if p_deleted_character_id is null then
  v_result:=public.commit_online_game_server_v1(p_account_id,p_expected_version,p_expected_gold,p_request_id,p_request_hash,p_response,p_contributions);
 else
  v_result:=public.commit_online_game_server_v2(p_account_id,p_expected_version,p_expected_gold,p_request_id,p_request_hash,p_response,p_contributions,p_deleted_character_id);
 end if;
 if v_prior then return v_result;end if;
 select guild_id into gid from public.guild_members where account_id=p_account_id for share;
 if gid is null then return v_result;end if;
 -- The gateway supplies intervals only for non-QA authoritative gameplay.
 perform public.credit_guild_pve_effort_v2(p_account_id,gid,coalesce(p_response->'guildPveEffort','[]'::jsonb),now());
 perform public.credit_guild_project_effort_v2(p_account_id,gid,coalesce(p_response->'guildProjectEffort','[]'::jsonb),now());
 return v_result;
end $$;
revoke all on function public.commit_online_game_guild_pve_v1(uuid,bigint,bigint,text,text,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.commit_online_game_guild_pve_v1(uuid,bigint,bigint,text,text,jsonb,jsonb,uuid) to service_role;



create or replace function public.claim_guild_pve_v1(p_encounter uuid,p_milestone integer) returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();gid uuid;e record;g record;v_gold integer;v_count integer;v_currency integer:=0;v_candy integer:=0;v_account jsonb;v_kind text;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_milestone not in(25,50,100) or p_milestone is null then raise exception 'INVALID_MILESTONE';end if;
 -- Lock the same account state used by gameplay so wallet updates cannot be overwritten.
 select * into g from public.online_game_states where account_id=uid for update;
 if g.character_id is null or g.state->'character' is null or g.state->'character'='null'::jsonb then raise exception 'CHARACTER_REQUIRED';end if;
 select guild_id into gid from public.guild_members where account_id=uid limit 1 for share;
 select * into e from public.guild_pve_encounters_v1 where id=p_encounter and guild_id=gid;
 if e.id is null then raise exception 'GUILD_MEMBERSHIP_REQUIRED';end if;
 if exists(select 1 from public.guild_pve_claims_v1 where account_id=uid and scope_key=e.scope_key and milestone=p_milestone) then return jsonb_build_object('alreadyClaimed',true);end if;
 if e.kind='event' and not exists(select 1 from public.visible_live_events() v where v.event_id=e.event_id and v.starts_at=e.starts_at) then raise exception 'EVENT_UNAVAILABLE';end if;
 if now()>=e.claim_ends_at then raise exception 'CLAIM_WINDOW_ENDED';end if;
 if e.damage*100<e.max_hp*p_milestone then raise exception 'MILESTONE_NOT_REACHED';end if;
 if coalesce((select damage from public.guild_pve_members_v1 where encounter_id=e.id and account_id=uid),0)<1000 then raise exception 'CONTRIBUTE_1000_DAMAGE';end if;
 v_gold:=case p_milestone when 25 then 250 when 50 then 500 else 1000 end;
 insert into public.guild_pve_claims_v1(account_id,scope_key,milestone,encounter_id,gold) values(uid,e.scope_key,p_milestone,e.id,v_gold) on conflict do nothing;
 get diagnostics v_count=row_count;
 if v_count=0 then return jsonb_build_object('alreadyClaimed',true);end if;
 insert into public.character_wallets(character_id,gold) values(g.character_id,v_gold) on conflict(character_id) do update set gold=public.character_wallets.gold+excluded.gold;
 update public.online_game_states set revision=revision+1,updated_at=now(),state=jsonb_set(state,'{character,gold}',to_jsonb((select gold from public.character_wallets where character_id=g.character_id))) where account_id=uid;
 if e.kind='event' then
 v_currency:=case p_milestone when 25 then 100 when 50 then 200 else 400 end;
 v_candy:=case when p_milestone=100 then 2 else 1 end;
 v_kind:=case when p_milestone=25 then 'skill' when p_milestone=50 then 'combat' else 'companion' end;
 v_account:=coalesce(g.state->'account','{}'::jsonb);
 v_account:=jsonb_set(v_account,'{eventCurrencyBalanceById}',coalesce(v_account->'eventCurrencyBalanceById','{}'::jsonb)||jsonb_build_object(e.event_id,coalesce((v_account#>>array['eventCurrencyBalanceById',e.event_id])::bigint,0)+v_currency));
 v_account:=jsonb_set(v_account,'{eventProgressById}',coalesce(v_account->'eventProgressById','{}'::jsonb)||jsonb_build_object(e.event_id,coalesce((v_account#>>array['eventProgressById',e.event_id])::bigint,0)+v_currency));
 v_kind:=e.event_id||':candy:'||v_kind;
 v_account:=jsonb_set(v_account,'{eventCandyChargesById}',coalesce(v_account->'eventCandyChargesById','{}'::jsonb)||jsonb_build_object(v_kind,coalesce((v_account#>>array['eventCandyChargesById',v_kind])::bigint,0)+v_candy));
 if e.event_id='EVT_ANNUAL_010_2026' then
   if p_milestone>=25 then insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref) values(gid,'name_halloween_orange','event',e.event_id) on conflict do nothing; end if;
   if p_milestone>=50 then insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref) values(gid,'border_halloween_veil','event',e.event_id) on conflict do nothing; end if;
   if p_milestone>=100 then
     insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref) values(gid,'halloween_pumpkin_lantern','event',e.event_id) on conflict do nothing;
     insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref) values(gid,'halloween_bat_moon','event',e.event_id) on conflict do nothing;
   end if;
 end if;
 update online_game_states set state=jsonb_set(state,'{account}',v_account) where account_id=uid;
 end if;
 return jsonb_build_object('alreadyClaimed',false,'gold',v_gold,'eventCurrency',v_currency,'candy',v_candy);
end $$;
revoke all on function public.claim_guild_pve_v1(uuid,integer) from public,anon;
grant execute on function public.claim_guild_pve_v1(uuid,integer) to authenticated;

commit;
