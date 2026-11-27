-- Staging-only reproducibility fixture. Never production. Requires exactly nine disposable example.invalid accounts and no active memberships. Transaction intentionally rolled back.
-- Exact production function definitions copied read-only on 2026-11-27, pinned for regression; no production data copied.
-- Insert the four pinned candidate SQL bodies (remove their BEGIN/COMMIT) immediately before the fixture section after the compatibility definitions. Do not execute this file standalone or commit.
begin;
set local lock_timeout='3s';
set local statement_timeout='55s';
do $stage_guard$ begin
 if (select count(*) from auth.users)<>9 or (select count(*) from auth.users where split_part(email,'@',2)='example.invalid')<>9 or to_regclass('private.ultra_luxe_collection_grants_v1') is not null or to_regclass('public.party_weekly_effort_coverage_v1') is not null then raise exception 'STAGING_PRECONDITION_DRIFT';end if;
 if exists(select 1 from public.party_members where left_at is null) or exists(select 1 from public.guild_members) then raise exception 'STAGING_MEMBERSHIP_DRIFT';end if;
end $stage_guard$;
create table public.party_weekly_effort_coverage_v1(account_id uuid not null references auth.users(id) on delete cascade,week_start timestamptz not null,covered tstzmultirange not null default '{}'::tstzmultirange,primary key(account_id,week_start));
alter table public.party_weekly_effort_coverage_v1 enable row level security;
revoke all on public.party_weekly_effort_coverage_v1 from public,anon,authenticated;
alter table public.party_contract_member_progress_v16 add column effort_seconds numeric(18,4) not null default 0;
insert into public.party_contract_definitions_v16(definition_id,version,name,category,cadence,minimum_personal_rate,active,reward_json) values('party_weekly_ladder_v1',1,'Adventure together','mixed','weekly',.08,true,'{"gold":0}');
insert into public.party_contract_objectives_v16(definition_id,definition_version,objective_id,activity_kind,metric,target_units,expected_seconds_per_unit,setup_minutes,preparation_minutes_per_unit,difficulty,point_budget) values('party_weekly_ladder_v1',1,'shared_effort','mixed','verified_party_effort_seconds',288000,1,0,0,'standard',80000);
CREATE OR REPLACE FUNCTION private.project_online_game_commerce_v1(p_account_id uuid, p_state jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_ent record;
  v_account jsonb;
  v_flags jsonb;
  v_style public.player_name_styles_v1%rowtype;
  v_preference jsonb;
begin
  -- Preserve the null initial-state sentinel used by the Edge game constructor.
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    return p_state;
  end if;
  select * into v_ent from private.commerce_entitlements_v1(p_account_id);
  v_account:=case when jsonb_typeof(p_state->'account')='object'
    then p_state->'account' else '{}'::jsonb end;
  v_flags:=case when jsonb_typeof(v_account->'entitlements')='object'
    then v_account->'entitlements' else '{}'::jsonb end;
  v_flags:=v_flags || jsonb_build_object(
    'vip',coalesce(v_ent.vip,false),
    'vip_plus',coalesce(v_ent.vip_plus,false),
    'supporter',coalesce(v_ent.supporter,false),
    'vipplus',false,'vip+',false,'supporter_subscription',false
  );
  v_account:=v_account || jsonb_build_object('entitlements',v_flags);
  select * into v_style from public.player_name_styles_v1 where account_id=p_account_id;
  if found then
    -- Keep the saved gradient even after expiry; clients apply effective fallback.
    v_preference:=jsonb_strip_nulls(jsonb_build_object(
      'mode',v_style.mode,
      'solidColor',case when v_style.mode='solid' then v_style.solid_color end,
      'gradientColors',case when v_style.mode='gradient' then to_jsonb(v_style.gradient_colors) end,
      'animation',case when v_style.mode='gradient' then v_style.animation else 'none' end
    ));
  else
    v_preference:=jsonb_build_object('mode','default','animation','none');
  end if;
  v_account:=(v_account-'playerNameStyle'-'vipPlusNameColor')
    || jsonb_build_object('playerNameStyle',v_preference);
  if v_style.vip_fallback_color is not null then
    v_account:=v_account || jsonb_build_object('vipPlusNameColor',v_style.vip_fallback_color);
  end if;
  return jsonb_set(p_state,'{account}',v_account,true);
end $function$;
CREATE OR REPLACE FUNCTION public.load_online_game_server_v1(p_account_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  g public.online_game_states;
  v_event jsonb;
  v_community jsonb;
  v_gold bigint;
begin
  if not exists(select 1 from auth.users where id=p_account_id) then
    raise exception 'account_not_found';
  end if;

  insert into public.online_game_states(account_id) values(p_account_id) on conflict do nothing;
  select * into g from public.online_game_states where account_id=p_account_id;

  if g.character_id is not null then
    select gold into v_gold from public.character_wallets where character_id=g.character_id;
  end if;

  select jsonb_build_object(
    'eventId',e.event_id,
    'enabled',true,
    'startsAtMs',floor(extract(epoch from e.starts_at)*1000),
    'endsAtMs',floor(extract(epoch from e.ends_at)*1000),
    'graceEndsAtMs',case when coalesce(e.grace_ends_at,e.claim_ends_at) is null then null else floor(extract(epoch from coalesce(e.grace_ends_at,e.claim_ends_at))*1000) end,
    'priority',e.priority,
    'modules',to_jsonb(e.modules)
  )
  into v_event
  from public.visible_live_events() e
  where e.starts_at is not null and e.ends_at is not null
  limit 1;

  -- Reuse the existing contribution ledger; online progression never simulates
  -- community completion locally.
  select coalesce(
    jsonb_object_agg(
      e.event_id,
      least(100,floor(coalesce(t.total,0)*100/greatest(1,coalesce((e.config->>'communityGoal')::numeric,100000))))
    ),
    '{}'::jsonb
  )
  into v_community
  from public.live_events e
  left join lateral (
    select sum(quantity) as total
    from public.event_contributions
    where event_id=e.event_id
  ) t on true;

  return jsonb_build_object(
    'state',private.project_online_game_commerce_v1(p_account_id,g.state),
    'version',g.revision,
    'characterId',g.character_id,
    'walletGold',v_gold,
    'serverNow',floor(extract(epoch from clock_timestamp())*1000),
    'guildMember',exists(select 1 from public.guild_members where account_id=p_account_id),
    'liveEvent',v_event,
    'communityProgress',v_community
  );
end $function$;
CREATE OR REPLACE FUNCTION public.read_online_game_receipt_server_v1(p_account_id uuid, p_request_id text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select jsonb_build_object('requestHash',response->>'requestHash','response',jsonb_set(response->'result','{state}',coalesce(private.project_online_game_commerce_v1(p_account_id,response#>'{result,state}'),'null'::jsonb),false))
 from public.server_action_receipts where account_id=p_account_id and action='online_game_v1' and idempotency_key=p_request_id;
$function$;
CREATE OR REPLACE FUNCTION public.party_weekly_tiers_v1()
 RETURNS TABLE(tier text, target_points integer, personal_points integer, gold integer, cumulative_gold integer)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 values ('bronze',4000,320,250,250),('silver',16000,1280,500,750),
        ('gold',40000,3200,1000,1750),('platinum',80000,6400,2250,4000)
$function$;
CREATE OR REPLACE FUNCTION public.credit_party_weekly_effort_v1(p_account uuid, p_intervals jsonb, p_now timestamp with time zone DEFAULT now())
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$;
CREATE OR REPLACE FUNCTION public.commit_online_game_guild_pve_v1(p_account_id uuid, p_expected_version bigint, p_expected_gold bigint, p_request_id text, p_request_hash text, p_response jsonb, p_contributions jsonb, p_deleted_character_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_result jsonb;v_prior boolean;gid uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_account_id,0));
 select exists(select 1 from public.server_action_receipts where account_id=p_account_id and action='online_game_v1' and idempotency_key=p_request_id) into v_prior;
 if p_deleted_character_id is null then
  v_result:=public.commit_online_game_server_v1(p_account_id,p_expected_version,p_expected_gold,p_request_id,p_request_hash,p_response,p_contributions);
 else
  v_result:=public.commit_online_game_server_v2(p_account_id,p_expected_version,p_expected_gold,p_request_id,p_request_hash,p_response,p_contributions,p_deleted_character_id);
 end if;
 if v_prior then return v_result;end if; perform public.credit_party_weekly_effort_v1(p_account_id,coalesce(p_response->'guildProjectEffort','[]'::jsonb),now());
 select guild_id into gid from public.guild_members where account_id=p_account_id for share;
 if gid is null then return v_result;end if;
 -- The gateway supplies intervals only for non-QA authoritative gameplay.
 perform public.credit_guild_pve_effort_v2(p_account_id,gid,coalesce(p_response->'guildPveEffort','[]'::jsonb),now());
 perform public.credit_guild_project_effort_v2(p_account_id,gid,coalesce(p_response->'guildProjectEffort','[]'::jsonb),now());
 return v_result;
end $function$;

-- INSERT FOUR REVIEWED SQL BODIES HERE BEFORE FIXTURE.

revoke all on function public.credit_party_weekly_effort_v1(uuid,jsonb,timestamptz) from public,anon,authenticated;
do $fixture$
declare a uuid; cid uuid; pid uuid; gid uuid; role_id text;
begin
 select s.account_id,s.character_id,case when upper(h.class_id::text) in ('IRONWARDEN','BASTION','DREADGUARD') then 'tank' when upper(h.class_id::text) in ('DAWNKEEPER','STONECALLER') then 'support' else 'damage' end into a,cid,role_id from public.online_game_states s join auth.users u on u.id=s.account_id join public.characters h on h.id=s.character_id and h.account_id=s.account_id where split_part(u.email,'@',2)='example.invalid' and (s.state->>'version')::int in (6,11) and jsonb_typeof(s.state->'character')='object' order by s.account_id limit 1;
 if a is null or cid is null then raise exception 'FIXTURE_REQUIRED';end if;
 insert into public.parties(leader_character_id,leader_account_id) values(cid,a) returning id into pid;
 insert into public.party_members(party_id,character_id,account_id,role,joined_at) values(pid,cid,a,role_id,now()-interval '10 minutes');
 insert into public.guilds(name,owner_account_id) values('Rollback Fixture Guild',a) returning id into gid;
 insert into public.guild_members(guild_id,account_id,role,joined_at) values(gid,a,'leader',now()-interval '10 minutes');
 perform set_config('veldryn.fixture_owner',a::text,true);
 perform set_config('veldryn.fixture_party',pid::text,true);
 perform set_config('veldryn.fixture_guild',gid::text,true);
 perform public.set_ultra_luxe_grant_server_v1(a,'ascendant-sakura-enchantment',true,'isolated effort compatibility fixture');
end $fixture$;
set local role service_role;
do $settlement$
declare a uuid:=current_setting('veldryn.fixture_owner')::uuid; l jsonb; s jsonb; p jsonb; r jsonb; g jsonb; v bigint; gold bigint; req text:='effort_fixture_'||replace(gen_random_uuid()::text,'-',''); h text:=repeat('d',64); t bigint:=floor(extract(epoch from now())*1000);
begin
 l:=public.load_online_game_ultra_luxe_v1(a); v:=(l->>'version')::bigint; gold:=(l->>'walletGold')::bigint; g:=l->'ultraLuxeCollectionIds';s:=l->'state';
 s:=jsonb_set(s,'{character,profileBackgroundId}',to_jsonb('ascendant-sakura-petal-sanctuary'::text));
 s:=jsonb_set(s,'{character,gold}',to_jsonb(gold));
 p:=jsonb_build_object('accountId',a,'state',s,'version',v+1,'serverNow',l->'serverNow','guildProjectEffort',jsonb_build_array(jsonb_build_object('kind','skilling','activity','gathering','startsAtMs',t-60000,'endsAtMs',t)),'guildPveEffort','[]'::jsonb);
 r:=public.commit_online_game_ultra_luxe_v1(a,v,gold,req,h,p,'[]'::jsonb,g);
 if r#>>'{state,character,profileBackgroundId}' is distinct from 'ascendant-sakura-petal-sanctuary' or (r->>'version')::bigint is distinct from v+1 then raise exception 'GRANT_COMMIT';end if;
 r:=public.commit_online_game_ultra_luxe_v1(a,v,gold,req,h,p,'[]'::jsonb,g);
 if (r->>'version')::bigint is distinct from v+1 then raise exception 'REPLAY_VERSION';end if;
 if (public.load_online_game_ultra_luxe_v1(a)->>'walletGold')::bigint is distinct from gold then raise exception 'WALLET_CHANGED';end if;
end $settlement$;
reset role;
do $verify$
declare a uuid:=current_setting('veldryn.fixture_owner')::uuid; pid uuid:=current_setting('veldryn.fixture_party')::uuid; gid uuid:=current_setting('veldryn.fixture_guild')::uuid; ps numeric; gp bigint; credit bigint;
begin
 select sum(m.effort_seconds) into ps from public.party_contract_member_progress_v16 m join public.party_contract_instances_v16 i on i.id=m.instance_id where m.account_id=a and i.party_id=pid;
 select sum(m.raw_points) into gp from public.guild_project_member_progress m join public.guild_project_instances i on i.id=m.project_instance_id where m.account_id=a and i.guild_id=gid and i.template_id='guild_weekly_shared_effort';
 select sum(d.credited_ms) into credit from public.guild_project_effort_days_v1 d join public.guild_project_instances i on i.id=d.project_id where d.account_id=a and i.guild_id=gid and i.template_id='guild_weekly_shared_effort';
 if ps is distinct from 60::numeric or gp is distinct from 20::bigint or credit is distinct from 60000::bigint then raise exception 'EFFORT_MISMATCH party %, guild %, ms %',ps,gp,credit;end if;
end $verify$;
rollback;
select 'Production-shaped grant-aware normal commit + identical receipt replay credited exactly 60 party seconds and 20 guild points, wallet and Sakura preserved' as result,to_regclass('public.party_weekly_effort_coverage_v1') is null as party_schema_rolled_back,to_regclass('private.ultra_luxe_collection_grants_v1') is null as grants_rolled_back;
