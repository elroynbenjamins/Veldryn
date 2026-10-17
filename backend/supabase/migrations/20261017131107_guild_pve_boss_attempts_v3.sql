-- Guild PvE v3: contribution is the result of a small number of dedicated
-- boss fights, rather than passive time spent in unrelated activities.
-- Three attempts are available each seven days (event encounters scale to a
-- maximum of nine), with a three-minute server-timed run, stat snapshots and
-- request idempotency. Guild Level 3 unlocks this cooperative feature.
begin;

create table if not exists public.guild_pve_attempts_v3(
 encounter_id uuid not null references public.guild_pve_encounters_v1(id) on delete cascade,
 account_id uuid not null references auth.users(id) on delete cascade,
 request_id text not null check(request_id ~ '^[A-Za-z0-9_-]{8,128}$'),
 attempt_number integer not null check(attempt_number>0),
 damage bigint not null check(damage>=0),
 character_damage bigint not null default 0 check(character_damage>=0),
 companion_damage bigint not null default 0 check(companion_damage>=0),
 companion_id text,
 created_at timestamptz not null default now(),
 resolves_at timestamptz not null default(now()+interval '3 minutes'),
 resolved_at timestamptz,
 primary key(encounter_id,account_id,request_id),
 unique(encounter_id,account_id,attempt_number)
);
alter table public.guild_pve_attempts_v3 add column if not exists character_damage bigint not null default 0 check(character_damage>=0);
alter table public.guild_pve_attempts_v3 add column if not exists companion_damage bigint not null default 0 check(companion_damage>=0);
alter table public.guild_pve_attempts_v3 add column if not exists companion_id text;
create index if not exists guild_pve_attempts_v3_account_idx on public.guild_pve_attempts_v3(account_id,encounter_id);
alter table public.guild_pve_attempts_v3 enable row level security;
revoke all on public.guild_pve_attempts_v3 from public,anon,authenticated;
grant all on public.guild_pve_attempts_v3 to service_role;

create or replace function public.guild_pve_attempt_cap_v3(p_start timestamptz,p_end timestamptz)
returns integer language sql immutable set search_path=public as $$
 select least(9,greatest(3,ceil(extract(epoch from p_end-p_start)/604800.0*3)::integer))
$$;
revoke all on function public.guild_pve_attempt_cap_v3(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.guild_pve_attempt_cap_v3(timestamptz,timestamptz) to service_role;

create or replace function public.settle_guild_pve_attempts_v3(p_guild uuid,p_now timestamptz)
language plpgsql security definer set search_path=public as $$
declare a record;e public.guild_pve_encounters_v1;
begin
 for a in select a.* from public.guild_pve_attempts_v3 a join public.guild_pve_encounters_v1 x on x.id=a.encounter_id where x.guild_id=p_guild and a.resolved_at is null and a.resolves_at<=p_now order by a.created_at for update of a loop
  select * into e from public.guild_pve_encounters_v1 where id=a.encounter_id for update;
  insert into public.guild_pve_members_v1(encounter_id,account_id,damage) values(e.id,a.account_id,a.damage)
  on conflict(encounter_id,account_id) do update set damage=public.guild_pve_members_v1.damage+excluded.damage;
  update public.guild_pve_encounters_v1 set damage=least(max_hp,damage+a.damage) where id=e.id;
  update public.guild_pve_attempts_v3 set resolved_at=p_now where encounter_id=a.encounter_id and account_id=a.account_id and request_id=a.request_id;
 end loop;
end $$;
revoke all on function public.settle_guild_pve_attempts_v3(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.settle_guild_pve_attempts_v3(uuid,timestamptz) to service_role;

create or replace function public.attempt_guild_pve_v3(p_encounter uuid,p_request_id text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();e public.guild_pve_encounters_v1;v_character public.characters;v_eligible boolean;v_guild_level integer;v_state jsonb;v_companion_progress jsonb;v_companion_id text;
 v_used integer;v_cap integer;v_attack numeric;v_defense numeric;v_hp numeric;v_level integer;v_companion_level integer:=0;v_companion_bond integer:=0;v_character_modifier numeric:=1;v_companion_modifier numeric:=1;v_roll numeric;v_damage bigint;v_character_damage bigint;v_companion_damage bigint:=0;v_personal bigint;v_resolves_at timestamptz;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_request_id !~ '^[A-Za-z0-9_-]{8,128}$' then raise exception 'INVALID_REQUEST';end if;
 perform pg_advisory_xact_lock(hashtextextended('guild-pve-attempt:'||uid::text||':'||p_encounter::text,0));
 select * into e from public.guild_pve_encounters_v1 where id=p_encounter for update;
 if not found then raise exception 'ENCOUNTER_NOT_FOUND';end if;
 select g.level,exists(select 1 from public.guild_pve_roster_v2 where encounter_id=e.id and account_id=uid) into v_guild_level,v_eligible from public.guilds g where g.id=e.guild_id;
 if coalesce(v_guild_level,1)<3 then raise exception 'GUILD_LEVEL_3_REQUIRED';end if;
 if not v_eligible then raise exception 'ENCOUNTER_ROSTER_REQUIRED';end if;
 if now()<e.starts_at or now()>=e.ends_at then raise exception 'ENCOUNTER_CLOSED';end if;
 if e.kind='event' and not exists(select 1 from public.visible_live_events() v where v.event_id=e.event_id and v.starts_at=e.starts_at and v.ends_at>now()) then raise exception 'EVENT_UNAVAILABLE';end if;
 select * into v_character from public.characters where account_id=uid order by updated_at desc limit 1 for share;
 if not found then raise exception 'CHARACTER_REQUIRED';end if;
 select state into v_state from public.online_game_states where account_id=uid for share;
 select count(*) into v_used from public.guild_pve_attempts_v3 where encounter_id=e.id and account_id=uid;
 v_cap:=public.guild_pve_attempt_cap_v3(e.starts_at,e.ends_at);
 select resolves_at into v_resolves_at from public.guild_pve_attempts_v3 where encounter_id=e.id and account_id=uid and request_id=p_request_id;
 if found then return jsonb_build_object('attemptsUsed',v_used,'attemptCap',v_cap,'resolvesAt',v_resolves_at);end if;
 if exists(select 1 from public.guild_pve_attempts_v3 where encounter_id=e.id and account_id=uid and resolved_at is null) then raise exception 'RAID_IN_PROGRESS';end if;
 if v_used>=v_cap then raise exception 'ATTEMPT_CAP_REACHED';end if;
 v_attack:=greatest(1,coalesce(nullif(v_character.base_stats->>'attack','')::numeric,1));v_defense:=greatest(0,coalesce(nullif(v_character.base_stats->>'defense','')::numeric,0));v_hp:=greatest(1,coalesce(nullif(v_character.base_stats->>'hp','')::numeric,1));v_level:=greatest(1,v_character.level);
 v_roll:=.94+(abs(hashtextextended(e.id::text||':'||uid::text||':'||p_request_id,0))%1201)/10000.0;
 -- Weekly raid profiles are deliberately modest and listed in the Raid Hall.
 -- They create rotation without invalidating a player's whole build.
 if e.kind='weekly' then
  case e.name
   when 'Fallen Oathbreaker' then v_character_modifier:=.94;
   when 'Granite Moss Troll' then v_companion_modifier:=.90;
   when 'Veilbound Revenant' then v_companion_modifier:=1.15;
   else null;
  end case;
 end if;
 v_character_damage:=floor((v_attack*180+v_defense*35+v_hp*2+v_level*450)*v_roll)::bigint;
 v_character_damage:=floor(v_character_damage*v_character_modifier)::bigint;
 v_companion_id:=nullif(v_state#>>'{character,equippedCombatCompanionId}','');
 if v_companion_id is not null then
  v_companion_progress:=coalesce(v_state#>ARRAY['account','combatCompanionProgress',v_companion_id],'{}'::jsonb);
  v_companion_level:=greatest(1,coalesce(nullif(v_companion_progress->>'level','')::integer,1));
  v_companion_bond:=greatest(1,coalesce(nullif(v_companion_progress->>'bondLevel','')::integer,1));
  -- This is a server snapshot of companion investment. It is intentionally a
  -- bounded assist, not a client-supplied damage value or a fake combat log.
  v_companion_damage:=floor(v_character_damage*(.06+least(v_companion_level,35)*.006+least(v_companion_bond,10)*.004)*v_companion_modifier)::bigint;
 end if;
 v_damage:=v_character_damage+v_companion_damage;
 select coalesce(sum(damage),0) into v_personal from public.guild_pve_attempts_v3 where encounter_id=e.id and account_id=uid;
 v_damage:=greatest(1,least(v_damage,ceil(e.max_hp*.11)::bigint,greatest(0,ceil(e.max_hp*.28)::bigint-v_personal)));
 v_companion_damage:=least(v_companion_damage,v_damage);v_character_damage:=v_damage-v_companion_damage;
 v_resolves_at:=now()+interval '3 minutes';
 insert into public.guild_pve_attempts_v3(encounter_id,account_id,request_id,attempt_number,damage,character_damage,companion_damage,companion_id,resolves_at) values(e.id,uid,p_request_id,v_used+1,v_damage,v_character_damage,v_companion_damage,v_companion_id,v_resolves_at);
 return jsonb_build_object('attemptsUsed',v_used+1,'attemptCap',v_cap,'resolvesAt',v_resolves_at);
end $$;
revoke all on function public.attempt_guild_pve_v3(uuid,text) from public,anon;
grant execute on function public.attempt_guild_pve_v3(uuid,text) to authenticated;

-- Existing activity-credit calls stay in the online settlement chain, but no
-- longer alter boss HP. Guild quests/projects remain their own progression.
create or replace function public.credit_guild_pve_effort_v2(p_account uuid,p_guild uuid,p_contributions jsonb,p_now timestamptz)
returns void language plpgsql security definer set search_path=public as $$ begin return; end $$;
revoke all on function public.credit_guild_pve_effort_v2(uuid,uuid,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.credit_guild_pve_effort_v2(uuid,uuid,jsonb,timestamptz) to service_role;

commit;
