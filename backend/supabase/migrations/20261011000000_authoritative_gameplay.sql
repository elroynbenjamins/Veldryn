-- Execute the existing game engine on the server; never accept a client save as truth.
create table public.online_game_states (
 account_id uuid primary key references auth.users(id) on delete cascade,
 character_id uuid unique references public.characters(id),
 state jsonb, revision bigint not null default 0 check(revision>=0),
 updated_at timestamptz not null default now()
);
alter table public.online_game_states enable row level security;
revoke all on public.online_game_states from public,anon,authenticated;
grant all on public.online_game_states to service_role;
-- Clients read through the authenticated handler so wallet and membership projections are current.
revoke insert,update,delete on public.characters from authenticated,anon;
alter table public.character_wallets enable row level security;
revoke all on public.character_wallets from public,anon,authenticated;
grant select on public.character_wallets to authenticated;
grant all on public.character_wallets to service_role;
create policy online_wallet_owner_read on public.character_wallets for select to authenticated using(exists(select 1 from public.characters c where c.id=character_id and c.account_id=auth.uid()));

create or replace function public.read_online_game_receipt_server_v1(p_account_id uuid,p_request_id text)
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('requestHash',response->>'requestHash','response',response->'result')
 from public.server_action_receipts where account_id=p_account_id and action='online_game_v1' and idempotency_key=p_request_id;
$$;

create or replace function public.load_online_game_server_v1(p_account_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare g public.online_game_states;v_event jsonb;v_community jsonb;v_gold bigint;
begin
 if not exists(select 1 from auth.users where id=p_account_id) then raise exception 'account_not_found';end if;
 insert into public.online_game_states(account_id) values(p_account_id) on conflict do nothing;
 select * into g from public.online_game_states where account_id=p_account_id;
 if g.character_id is not null then select gold into v_gold from public.character_wallets where character_id=g.character_id;end if;
 select jsonb_build_object('eventId',e.event_id,'enabled',true,'startsAtMs',floor(extract(epoch from e.starts_at)*1000),'endsAtMs',floor(extract(epoch from e.ends_at)*1000))
 into v_event from public.visible_live_events() e where e.starts_at is not null and e.ends_at is not null limit 1;
 -- Reuse the existing contribution ledger; online progression never simulates community completion.
 select coalesce(jsonb_object_agg(e.event_id,least(100,floor(coalesce(t.total,0)*100/greatest(1,coalesce((e.config->>'communityGoal')::numeric,100000))))),'{}'::jsonb)
 into v_community from public.live_events e left join lateral (
  select sum(quantity) as total from public.event_contributions where event_id=e.event_id
 ) t on true;
 return jsonb_build_object('state',g.state,'version',g.revision,'characterId',g.character_id,'walletGold',v_gold,
  'serverNow',floor(extract(epoch from clock_timestamp())*1000),'guildMember',exists(select 1 from public.guild_members where account_id=p_account_id),
  'liveEvent',v_event,'communityProgress',v_community);
end $$;

create or replace function public.commit_online_game_server_v1(
 p_account_id uuid,p_expected_version bigint,p_expected_gold bigint,p_request_id text,p_request_hash text,p_response jsonb,p_contributions jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare g public.online_game_states;v_receipt jsonb;s jsonb;c jsonb;v_id uuid;v_gold bigint;v_event jsonb;v_units numeric;v_weight numeric;
 v_joined timestamptz;v_started timestamptz;v_metric text;v_gid uuid;v_week date:=date_trunc('week',now() at time zone 'UTC')::date;v_kind text;v_amount integer;v_used integer;v_limit integer;v_event_id text;v_delta integer;
begin
 if p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$' or p_request_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_request';end if;
 -- Serialize with Party membership as well as other gameplay commands from this account.
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_account_id,0));
 select * into g from public.online_game_states where account_id=p_account_id for update;
 if not found then raise exception 'game_not_loaded';end if;
 select response into v_receipt from public.server_action_receipts where account_id=p_account_id and action='online_game_v1' and idempotency_key=p_request_id;
 if found then
  if v_receipt->>'requestHash'<>p_request_hash then raise exception 'idempotency_key_conflict';end if;
  return v_receipt->'result';
 end if;
 if g.revision<>p_expected_version then raise exception 'stale_state';end if;
 s:=p_response->'state';c:=s->'character';
 if s is null or (s->>'version')::int<>6 or jsonb_typeof(p_contributions)<>'array' or jsonb_array_length(p_contributions)>4 then raise exception 'invalid_server_state';end if;
 if c is not null and c<>'null'::jsonb then
  v_id:=(c->>'id')::uuid;
  if g.character_id is not null and g.character_id<>v_id then raise exception 'character_identity_changed';end if;
  if g.character_id is null then
   insert into public.characters(id,account_id,name,class_id,body_presentation) values(v_id,p_account_id,c->>'name',c->>'classId',c->>'bodyPresentation');
   insert into public.character_wallets(character_id,gold) values(v_id,0);
  else
   select gold into v_gold from public.character_wallets where character_id=v_id for update;
   if v_gold is distinct from p_expected_gold then raise exception 'stale_state_wallet';end if;
  end if;
  update public.characters set name=c->>'name',level=(c->>'level')::integer,xp=(c->>'xp')::bigint,gold=(c->>'gold')::bigint,
   base_stats=jsonb_build_object('hp',c->'hp','currentHp',c->'currentHp','attack',c->'attack','defense',c->'defense'),
   equipment=c->'equipment',profile_title=c->>'profileTitle',profile_background_id=coalesce(c->>'profileBackgroundId','asterfall-night'),updated_at=now() where id=v_id and account_id=p_account_id;
  update public.character_wallets set gold=(c->>'gold')::bigint,updated_at=now() where character_id=v_id;
  insert into public.player_profiles(account_id,display_name,active_character_id,profile_title,profile_background_id)
   values(p_account_id,c->>'name',v_id,c->>'profileTitle',coalesce(c->>'profileBackgroundId','asterfall-night'))
   on conflict(account_id) do update set active_character_id=excluded.active_character_id,profile_title=excluded.profile_title,profile_background_id=excluded.profile_background_id,updated_at=now();
 end if;
 update public.online_game_states set character_id=v_id,state=s,revision=revision+1,updated_at=now() where account_id=p_account_id;
 for v_event_id in select jsonb_object_keys(coalesce(s#>'{account,eventContributionById}','{}')) loop
  v_delta:=coalesce((s#>>array['account','eventContributionById',v_event_id])::integer,0)-coalesce((g.state#>>array['account','eventContributionById',v_event_id])::integer,0);
  if v_delta>0 then insert into public.event_contributions(account_id,event_id,project_id,quantity,receipt_id) values(p_account_id,v_event_id,s#>>array['account','eventChoiceById',v_event_id],v_delta,gen_random_uuid());end if;
 end loop;
 insert into public.server_action_receipts(account_id,action,idempotency_key,response)
  values(p_account_id,'online_game_v1',p_request_id,jsonb_build_object('requestHash',p_request_hash,'result',p_response));
 select joined_at into v_joined from public.party_members where character_id=v_id and left_at is null;
 select guild_id into v_gid from public.guild_members where account_id=p_account_id;
 for v_event in select * from jsonb_array_elements(p_contributions) loop
  v_units:=(v_event->>'units')::numeric;v_metric:=v_event->>'metric';
  if v_units is null or v_units<=0 or v_units::text in ('NaN','Infinity','-Infinity') then raise exception 'invalid_contribution';end if;
  if v_event->>'kind'='crafting' then
   select units_per_action into v_weight from public.party_activity_weights_v16 where kind='crafting' and content_id=v_event->>'contentId';
   if v_weight is null then raise exception 'unknown_craft_weight';end if;v_units:=v_units*v_weight;
  end if;
  if v_joined is not null then
   if v_event ? 'startedAtMs' then
    v_started:=to_timestamp((v_event->>'startedAtMs')::numeric/1000);
    v_units:=v_units*least(1,greatest(0,extract(epoch from now()-greatest(v_started,v_joined)))/greatest(0.001,extract(epoch from now()-v_started)));
   end if;
   perform public.settle_party_activity_v16(v_id,v_metric,v_units,'online:'||p_request_id||':'||(v_event->>'kind')||':'||(v_event->>'contentId'),now());
  end if;
  -- Existing weekly Guild projects now consume verified activity instead of arbitrary client point totals.
  if v_gid is not null then
   v_kind:=case when v_event->>'kind' in ('combat','boss') then 'boss' else 'project' end;
   v_limit:=case when v_kind='boss' then 50000 else 1000 end;
   v_amount:=least(v_limit,floor((v_event->>'units')::numeric*case when v_kind='boss' then 1000 else 1 end)::integer);
   select coalesce(sum(amount),0) into v_used from public.guild_pve_receipts where account_id=p_account_id and week_key=v_week and kind=v_kind;
   v_amount:=greatest(0,least(v_amount,v_limit-v_used));
   if v_amount>0 then
    insert into public.guild_weekly_projects(guild_id,week_key) values(v_gid,v_week) on conflict do nothing;
    insert into public.guild_weekly_bosses(guild_id,week_key) values(v_gid,v_week) on conflict do nothing;
    insert into public.guild_pve_receipts(guild_id,account_id,week_key,kind,amount) values(v_gid,p_account_id,v_week,v_kind,v_amount);
    if v_kind='project' then update public.guild_weekly_projects set progress=least(goal,progress+v_amount) where guild_id=v_gid and week_key=v_week;
    else update public.guild_weekly_bosses set current_hp=greatest(0,current_hp-v_amount) where guild_id=v_gid and week_key=v_week;end if;
   end if;
  end if;
 end loop;
 return p_response;
end $$;

-- Retire prototype client-controlled progress writers. Existing schema/data and trusted workers remain available.
revoke execute on function public.guild_contribute(text,integer) from authenticated,anon,public;
revoke execute on function public.claim_idle_progress_atomic(uuid,text,text,integer,text,bigint,bigint),public.reserve_market_buy_gold(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.claim_idle_progress_atomic(uuid,text,text,integer,text,bigint,bigint),public.reserve_market_buy_gold(uuid,uuid,bigint) to service_role;
create or replace function public.protect_online_character_v1()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 v_id:=coalesce(to_jsonb(new)->>case when tg_table_name='characters' then 'id' else 'character_id' end,to_jsonb(old)->>case when tg_table_name='characters' then 'id' else 'character_id' end)::uuid;
 if exists(select 1 from public.online_game_states g join public.characters c on c.account_id=g.account_id where c.id=v_id)
  and coalesce(current_setting('request.jwt.claim.role',true),(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role'),'') in ('anon','authenticated') then
  raise exception 'use_authoritative_gameplay';
 end if;
 if tg_op='DELETE' then return old;else return new;end if;
end $$;
create trigger protect_online_character before insert or update or delete on public.characters for each row execute function public.protect_online_character_v1();
create trigger protect_online_inventory before insert or update or delete on public.item_instances for each row execute function public.protect_online_character_v1();
create trigger protect_online_activity before insert or update or delete on public.character_activities for each row execute function public.protect_online_character_v1();
create trigger protect_online_skills before insert or update or delete on public.character_skills for each row execute function public.protect_online_character_v1();

create or replace function public.protect_online_account_v1()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from public.online_game_states where account_id=coalesce((to_jsonb(new)->>'account_id')::uuid,(to_jsonb(old)->>'account_id')::uuid))
 and coalesce(current_setting('request.jwt.claim.role',true),(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role'),'') in ('anon','authenticated') then raise exception 'use_authoritative_gameplay';end if;
 if tg_op='DELETE' then return old;else return new;end if;
end $$;
create trigger protect_online_event_progress before insert or update or delete on public.event_progress for each row execute function public.protect_online_account_v1();
create trigger protect_online_event_contributions before insert or update or delete on public.event_contributions for each row execute function public.protect_online_account_v1();
create trigger protect_online_event_cosmetics before insert or update or delete on public.event_cosmetic_unlocks for each row execute function public.protect_online_account_v1();
revoke all on function public.protect_online_account_v1() from public,anon,authenticated;

revoke all on function public.read_online_game_receipt_server_v1(uuid,text),public.load_online_game_server_v1(uuid),public.commit_online_game_server_v1(uuid,bigint,bigint,text,text,jsonb,jsonb),public.protect_online_character_v1() from public,anon,authenticated;
grant execute on function public.read_online_game_receipt_server_v1(uuid,text),public.load_online_game_server_v1(uuid),public.commit_online_game_server_v1(uuid,bigint,bigint,text,text,jsonb,jsonb) to service_role;
