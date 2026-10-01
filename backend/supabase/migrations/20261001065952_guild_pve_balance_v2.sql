-- Guild PvE v2: frozen roster brackets, combat-effort credit, UTC earned-day caps.
-- New encounters: 15,000 HP per bracket member per week, 200 damage per active
-- combat minute, 6,000/day and 30,000/week per account. Event totals scale by duration.
-- Existing local v1 encounters retain their totals, but adopt v2 contribution rules.
begin;
alter table public.guild_pve_encounters_v1 add column roster_size integer not null default 5,
 add column personal_cap bigint not null default 30000,add column daily_cap bigint not null default 6000;
create table public.guild_pve_roster_v2(
 encounter_id uuid not null references public.guild_pve_encounters_v1(id) on delete cascade,
 account_id uuid not null references auth.users(id) on delete cascade,eligible_since timestamptz not null,
 primary key(encounter_id,account_id));
create table public.guild_pve_daily_v2(
 account_id uuid not null references auth.users(id) on delete cascade,scope_key text not null,
 earned_day date not null,credited_ms bigint not null default 0 check(credited_ms between 0 and 1800000),
 primary key(account_id,scope_key,earned_day));
alter table public.guild_pve_roster_v2 enable row level security;
alter table public.guild_pve_daily_v2 enable row level security;
revoke all on public.guild_pve_roster_v2,public.guild_pve_daily_v2 from public,anon,authenticated;
grant all on public.guild_pve_roster_v2,public.guild_pve_daily_v2 to service_role;
insert into public.guild_pve_roster_v2 select e.id,m.account_id,greatest(e.starts_at,m.joined_at)
 from public.guild_pve_encounters_v1 e join public.guild_members m on m.guild_id=e.guild_id on conflict do nothing;

create or replace function public.create_guild_pve_encounter_v2(p_guild uuid,p_scope text,p_kind text,p_name text,p_start timestamptz,p_end timestamptz,p_claim_end timestamptz,p_event text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_count integer;v_bracket integer;v_weeks numeric;
begin
 -- Lock membership rows while capturing both bracket and reward eligibility.
 perform 1 from public.guild_members where guild_id=p_guild for share;
 select count(*) into v_count from public.guild_members where guild_id=p_guild;
 v_bracket:=case when v_count<=5 then 5 when v_count<=8 then 8 when v_count<=12 then 12 when v_count<=16 then 16 else 20 end;
 v_weeks:=greatest(1,least(4,extract(epoch from p_end-p_start)/604800));
 insert into public.guild_pve_encounters_v1(guild_id,scope_key,event_id,kind,name,starts_at,ends_at,claim_ends_at,max_hp,roster_size,personal_cap,daily_cap)
 values(p_guild,p_scope,p_event,p_kind,p_name,p_start,p_end,p_claim_end,ceil(v_bracket*15000*v_weeks),v_bracket,ceil(30000*v_weeks),6000)
 on conflict do nothing returning id into v_id;
 if v_id is not null then
  insert into public.guild_pve_roster_v2 select v_id,account_id,greatest(p_start,joined_at) from public.guild_members where guild_id=p_guild;
 end if;
end $$;
revoke all on function public.create_guild_pve_encounter_v2(uuid,text,text,text,timestamptz,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.create_guild_pve_encounter_v2(uuid,text,text,text,timestamptz,timestamptz,timestamptz,text) to service_role;

create or replace function public.ensure_guild_pve_v1(p_guild uuid,p_now timestamptz)
returns void language plpgsql security definer set search_path=public as $$
declare v_start timestamptz:=date_trunc('week',p_now at time zone 'UTC') at time zone 'UTC';e record;
begin
 perform public.create_guild_pve_encounter_v2(p_guild,'weekly:'||to_char(v_start at time zone 'UTC','YYYY-MM-DD'),'weekly','Rootbound Colossus',v_start,v_start+interval '7 days',v_start+interval '14 days');
 for e in select * from public.visible_live_events() where starts_at<=p_now and ends_at>p_now loop
  perform public.create_guild_pve_encounter_v2(p_guild,'event:'||e.event_id||':'||extract(epoch from e.starts_at)::text,'event',e.name,e.starts_at,e.ends_at,greatest(e.ends_at,coalesce(e.claim_ends_at,e.ends_at+interval '3 days')),e.event_id);
 end loop;
end $$;

create or replace function public.credit_guild_pve_effort_v2(p_account uuid,p_guild uuid,p_contributions jsonb,p_now timestamptz)
returns void language plpgsql security definer set search_path=public as $$
declare e record;a jsonb;v_since timestamptz;v_start timestamptz;v_end timestamptz;v_day timestamptz;v_next timestamptz;
 v_ms bigint;v_before bigint;v_after bigint;v_used bigint;v_credit bigint;v_total bigint;v_joined timestamptz;
begin
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_account,0));
 select joined_at into v_joined from public.guild_members where account_id=p_account and guild_id=p_guild for share;
 if not found then return;end if;
 perform public.ensure_guild_pve_v1(p_guild,p_now);
 -- Defeated bosses remain open for roster members to earn reward eligibility.
 -- Closed encounters accept only earlier earned time, during their claim window.
 for e in select x.* from public.guild_pve_encounters_v1 x where x.guild_id=p_guild and x.starts_at<=p_now and x.claim_ends_at>p_now
  and (x.kind='weekly' or exists(select 1 from public.visible_live_events() v where v.event_id=x.event_id and v.starts_at=x.starts_at)) order by x.id for update loop
  select eligible_since into v_since from public.guild_pve_roster_v2 where encounter_id=e.id and account_id=p_account;
  if not found then continue;end if;
  select coalesce(sum(m.damage),0) into v_used from public.guild_pve_members_v1 m join public.guild_pve_encounters_v1 x on x.id=m.encounter_id where m.account_id=p_account and x.scope_key=e.scope_key;
  v_total:=0;
  for a in select * from jsonb_array_elements(p_contributions) loop
   if a->>'kind' is distinct from 'combat' or jsonb_typeof(a->'combatEffort') is distinct from 'object'
    or jsonb_typeof(a#>'{combatEffort,startsAtMs}') is distinct from 'number' or jsonb_typeof(a#>'{combatEffort,endsAtMs}') is distinct from 'number' then continue;end if;
   v_start:=greatest(to_timestamp((a#>>'{combatEffort,startsAtMs}')::numeric/1000),e.starts_at,v_since,v_joined);
   v_end:=least(to_timestamp((a#>>'{combatEffort,endsAtMs}')::numeric/1000),e.ends_at,p_now);
   if v_start is null or v_end is null or v_end<=v_start then continue;end if;
   while v_start<v_end and v_used<e.personal_cap loop
    v_day:=date_trunc('day',v_start at time zone 'UTC') at time zone 'UTC';v_next:=least(v_end,v_day+interval '1 day');
    v_ms:=floor(extract(epoch from v_next-v_start)*1000);
    insert into public.guild_pve_daily_v2(account_id,scope_key,earned_day) values(p_account,e.scope_key,(v_day at time zone 'UTC')::date) on conflict do nothing;
    select credited_ms into v_before from public.guild_pve_daily_v2 where account_id=p_account and scope_key=e.scope_key and earned_day=(v_day at time zone 'UTC')::date for update;
    v_after:=least(v_before+v_ms,e.daily_cap*300,v_before+(e.personal_cap-v_used)*300);
    v_credit:=floor(v_after/300.0)-floor(v_before/300.0);
    update public.guild_pve_daily_v2 set credited_ms=v_after where account_id=p_account and scope_key=e.scope_key and earned_day=(v_day at time zone 'UTC')::date;
    v_used:=v_used+v_credit;v_total:=v_total+v_credit;v_start:=v_next;
   end loop;
  end loop;
  if v_total>0 then
   insert into public.guild_pve_members_v1 values(e.id,p_account,v_total) on conflict(encounter_id,account_id) do update set damage=public.guild_pve_members_v1.damage+excluded.damage;
   update public.guild_pve_encounters_v1 set damage=least(max_hp,damage+v_total) where id=e.id;
  end if;
 end loop;
end $$;
revoke all on function public.credit_guild_pve_effort_v2(uuid,uuid,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.credit_guild_pve_effort_v2(uuid,uuid,jsonb,timestamptz) to service_role;
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
 return v_result;
end $$;
revoke all on function public.commit_online_game_guild_pve_v1(uuid,bigint,bigint,text,text,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.commit_online_game_guild_pve_v1(uuid,bigint,bigint,text,text,jsonb,jsonb,uuid) to service_role;

create or replace function public.guild_pve_board_v1() returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();gid uuid;result jsonb;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 select guild_id into gid from public.guild_members where account_id=uid limit 1 for share;
 if gid is null then return '[]'::jsonb;end if;
 perform public.ensure_guild_pve_v1(gid,now());
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'name',e.name,'startsAt',e.starts_at,'endsAt',e.ends_at,'claimEndsAt',e.claim_ends_at,'maxHp',e.max_hp,'damage',e.damage,'rosterSize',e.roster_size,'personalCap',e.personal_cap,'dailyCap',e.daily_cap,
 'eligible',exists(select 1 from public.guild_pve_roster_v2 where encounter_id=e.id and account_id=uid),
 'dailyUsed',coalesce((select floor(credited_ms/300.0) from public.guild_pve_daily_v2 where account_id=uid and scope_key=e.scope_key and earned_day=(now() at time zone 'UTC')::date),0),
 'personalDamage',coalesce((select damage from public.guild_pve_members_v1 where encounter_id=e.id and account_id=uid),0),
 'allowanceUsed',coalesce((select sum(m.damage) from public.guild_pve_members_v1 m join public.guild_pve_encounters_v1 x on x.id=m.encounter_id where m.account_id=uid and x.scope_key=e.scope_key),0),
 'contributors',(select count(*) from public.guild_pve_members_v1 where encounter_id=e.id),
 'claimed',coalesce((select jsonb_agg(milestone) from public.guild_pve_claims_v1 where account_id=uid and scope_key=e.scope_key),'[]'::jsonb)) order by e.starts_at desc,e.kind),'[]'::jsonb) into result
 from public.guild_pve_encounters_v1 e where e.guild_id=gid and e.claim_ends_at>now() and (e.kind='weekly' or exists(select 1 from public.visible_live_events() v where v.event_id=e.event_id and v.starts_at=e.starts_at));
 return result;
end $$;
revoke all on function public.guild_pve_board_v1() from public,anon;
grant execute on function public.guild_pve_board_v1() to authenticated;

commit;
