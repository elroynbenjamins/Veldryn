-- First asynchronous Guild PvE release. Deploy this migration before the updated gameplay Edge Function.
-- Runtime requires the existing authoritative gameplay and roster-delete migrations.
-- Weekly: Monday UTC, 7-day battle + 7-day claims. Events follow the enabled live registry.
-- Initial balance: 500,000 HP; 50,000 damage/account/encounter; 1,000 minimum for claims.
-- Verified kills grant 1,000 damage. Opening-crossing offline work is time-prorated;
-- collections after an encounter closes do not credit that encounter.
begin;
create table public.guild_pve_encounters_v1(
 id uuid primary key default gen_random_uuid(),guild_id uuid not null references public.guilds(id) on delete cascade,
 scope_key text not null,event_id text,kind text not null check(kind in('weekly','event')),name text not null,
 starts_at timestamptz not null,ends_at timestamptz not null,claim_ends_at timestamptz not null,
 max_hp bigint not null default 500000 check(max_hp>0),damage bigint not null default 0 check(damage>=0),
 unique(guild_id,scope_key),check(starts_at<ends_at and ends_at<=claim_ends_at)
);
create table public.guild_pve_members_v1(
 encounter_id uuid not null references public.guild_pve_encounters_v1(id) on delete cascade,
 account_id uuid not null references auth.users(id) on delete cascade,damage bigint not null check(damage>=0),
 primary key(encounter_id,account_id)
);
create index guild_pve_members_account_idx on public.guild_pve_members_v1(account_id,encounter_id);
create table public.guild_pve_claims_v1(
 account_id uuid not null references auth.users(id) on delete cascade,scope_key text not null,
 milestone integer not null check(milestone in(25,50,100)),encounter_id uuid references public.guild_pve_encounters_v1(id) on delete set null,
 gold integer not null check(gold>0),claimed_at timestamptz not null default now(),primary key(account_id,scope_key,milestone)
);
alter table public.guild_pve_encounters_v1 enable row level security;
alter table public.guild_pve_members_v1 enable row level security;
alter table public.guild_pve_claims_v1 enable row level security;
revoke all on public.guild_pve_encounters_v1,public.guild_pve_members_v1,public.guild_pve_claims_v1 from public,anon,authenticated;
grant all on public.guild_pve_encounters_v1,public.guild_pve_members_v1,public.guild_pve_claims_v1 to service_role;

-- Internal preparation is never callable by clients. All dates come from server time.
create or replace function public.ensure_guild_pve_v1(p_guild uuid,p_now timestamptz)
returns void language plpgsql security definer set search_path=public as $$
declare v_start timestamptz:=date_trunc('week',p_now at time zone 'UTC') at time zone 'UTC';e record;
begin
 insert into public.guild_pve_encounters_v1(guild_id,scope_key,kind,name,starts_at,ends_at,claim_ends_at)
 values(p_guild,'weekly:'||to_char(v_start at time zone 'UTC','YYYY-MM-DD'),'weekly','Rootbound Colossus',v_start,v_start+interval '7 days',v_start+interval '14 days') on conflict do nothing;
 for e in select * from public.visible_live_events() where starts_at<=p_now and ends_at>p_now loop
  insert into public.guild_pve_encounters_v1(guild_id,scope_key,event_id,kind,name,starts_at,ends_at,claim_ends_at)
  values(p_guild,'event:'||e.event_id||':'||extract(epoch from e.starts_at)::text,e.event_id,'event',e.name,e.starts_at,e.ends_at,greatest(e.ends_at,coalesce(e.claim_ends_at,e.ends_at+interval '3 days'))) on conflict do nothing;
 end loop;
end $$;
revoke all on function public.ensure_guild_pve_v1(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.ensure_guild_pve_v1(uuid,timestamptz) to service_role;

-- Credits uncapped verified activity atomically, with an independent allowance per encounter.
create or replace function public.commit_online_game_guild_pve_v1(
 p_account_id uuid,p_expected_version bigint,p_expected_gold bigint,p_request_id text,p_request_hash text,p_response jsonb,p_contributions jsonb,p_deleted_character_id uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb;v_prior boolean;gid uuid;e record;a jsonb;v_used bigint;v_credit bigint;v_amount numeric;v_start timestamptz;v_fraction numeric;
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
 perform public.ensure_guild_pve_v1(gid,now());
 for e in select * from public.guild_pve_encounters_v1 where guild_id=gid and starts_at<=now() and ends_at>now() and (kind='weekly' or exists(select 1 from public.visible_live_events() v where v.event_id=guild_pve_encounters_v1.event_id and v.starts_at=guild_pve_encounters_v1.starts_at and v.ends_at>now())) order by id for update loop
  v_amount:=0;
  for a in select * from jsonb_array_elements(p_contributions) loop
   if a->>'kind' not in('combat','boss') then continue;end if;
   v_fraction:=1;
   if a ? 'startedAtMs' then
    v_start:=to_timestamp((a->>'startedAtMs')::numeric/1000);
    v_fraction:=least(1,greatest(0,extract(epoch from now()-greatest(v_start,e.starts_at)))/greatest(0.001,extract(epoch from now()-v_start)));
   end if;
   v_amount:=v_amount+greatest(0,(a->>'units')::numeric)*1000*v_fraction;
  end loop;
  select coalesce(sum(m.damage),0) into v_used from public.guild_pve_members_v1 m join public.guild_pve_encounters_v1 x on x.id=m.encounter_id where m.account_id=p_account_id and x.scope_key=e.scope_key;
  v_credit:=greatest(0,least(floor(v_amount),50000-v_used,e.max_hp-e.damage))::bigint;
  if v_credit>0 then
   insert into public.guild_pve_members_v1 values(e.id,p_account_id,v_credit) on conflict(encounter_id,account_id) do update set damage=public.guild_pve_members_v1.damage+excluded.damage;
   update public.guild_pve_encounters_v1 set damage=damage+v_credit where id=e.id;
  end if;
 end loop;
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
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'name',e.name,'startsAt',e.starts_at,'endsAt',e.ends_at,'claimEndsAt',e.claim_ends_at,'maxHp',e.max_hp,'damage',e.damage,
 'personalDamage',coalesce((select damage from public.guild_pve_members_v1 where encounter_id=e.id and account_id=uid),0),
 'allowanceUsed',coalesce((select sum(m.damage) from public.guild_pve_members_v1 m join public.guild_pve_encounters_v1 x on x.id=m.encounter_id where m.account_id=uid and x.scope_key=e.scope_key),0),
 'contributors',(select count(*) from public.guild_pve_members_v1 where encounter_id=e.id),
 'claimed',coalesce((select jsonb_agg(milestone) from public.guild_pve_claims_v1 where account_id=uid and scope_key=e.scope_key),'[]'::jsonb)) order by e.starts_at desc,e.kind),'[]'::jsonb) into result
 from public.guild_pve_encounters_v1 e where e.guild_id=gid and e.claim_ends_at>now() and (e.kind='weekly' or exists(select 1 from public.visible_live_events() v where v.event_id=e.event_id and v.starts_at=e.starts_at));
 return result;
end $$;
revoke all on function public.guild_pve_board_v1() from public,anon;
grant execute on function public.guild_pve_board_v1() to authenticated;

create or replace function public.claim_guild_pve_v1(p_encounter uuid,p_milestone integer) returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();gid uuid;e record;g record;v_gold integer;v_count integer;
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
 return jsonb_build_object('alreadyClaimed',false,'gold',v_gold);
end $$;
revoke all on function public.claim_guild_pve_v1(uuid,integer) from public,anon;
grant execute on function public.claim_guild_pve_v1(uuid,integer) to authenticated;
commit;
