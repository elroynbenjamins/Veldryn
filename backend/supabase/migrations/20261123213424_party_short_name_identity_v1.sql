-- Short, unique Party identity for future ranked Party events.
-- Existing Parties have NULL short_name until their leader claims a name.
alter table public.parties
  add column if not exists short_name text,
  add column if not exists name_changed_at timestamptz;

alter table public.parties
  add constraint parties_short_name_format_v1
  check (short_name is null or short_name ~ '^[A-Z]{3,5}$');

-- Only active Parties reserve a name; disbanded Party rankings retain the historical row.
create unique index parties_active_short_name_unique_v1
  on public.parties (short_name) where short_name is not null and status <> 'disbanded';

create schema if not exists private;
create table if not exists private.party_name_history_v1 (
  id bigint generated always as identity primary key,
  party_id uuid not null references public.parties(id),
  changed_by_account_id uuid not null,
  old_name text,
  new_name text not null,
  changed_at timestamptz not null default now()
);
create index if not exists party_name_history_v1_party_time_idx
  on private.party_name_history_v1 (party_id, changed_at desc);
revoke all on private.party_name_history_v1 from public, anon, authenticated;

create or replace function public.set_party_name_v1(p_party_id uuid, p_name text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := upper(btrim(coalesce(p_name, '')));
  v_party public.parties%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if v_name !~ '^[A-Z]{3,5}$' or v_name in ('ADMIN','STAFF','OWNER') then
    raise exception 'party_name_invalid';
  end if;
  select * into v_party from public.parties
   where id=p_party_id and status <> 'disbanded' for update;
  if not found or v_party.leader_account_id is distinct from v_uid
    or not exists(select 1 from public.party_members m
      where m.party_id=p_party_id and m.account_id=v_uid and m.left_at is null)
  then raise exception 'party_leader_required'; end if;

  -- A retry with the same name must not consume another six-month change.
  if v_party.short_name = v_name then
    return jsonb_build_object('shortName',v_name,'nameChangedAt',v_party.name_changed_at,
      'nameNextChangeAt',v_party.name_changed_at + interval '6 months');
  end if;
  if v_party.name_changed_at is not null and v_now < v_party.name_changed_at + interval '6 months' then
    raise exception 'party_name_cooldown';
  end if;
  begin
    update public.parties set short_name=v_name,name_changed_at=v_now,updated_at=v_now
      where id=p_party_id;
  exception when unique_violation then
    raise exception 'party_name_taken';
  end;
  insert into private.party_name_history_v1(party_id,changed_by_account_id,old_name,new_name,changed_at)
    values(p_party_id,v_uid,v_party.short_name,v_name,v_now);
  return jsonb_build_object('shortName',v_name,'nameChangedAt',v_now,
    'nameNextChangeAt',v_now + interval '6 months');
end;
$$;
revoke all on function public.set_party_name_v1(uuid,text) from public, anon;
grant execute on function public.set_party_name_v1(uuid,text) to authenticated;

-- Creating a named Party is atomic: a taken/invalid name rolls back Party creation.
-- Older clients keep their existing 5-argument creation RPC.
create or replace function public.create_party_named_v1(
  p_character_id uuid, p_activity_level text, p_language text,
  p_minimum_level integer, p_idempotency_key text, p_name text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_party_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  v_party_id := public.create_party_with_preferences_v1(p_character_id,p_activity_level,p_language,
    p_minimum_level,p_idempotency_key);
  perform public.set_party_name_v1(v_party_id,p_name);
  return v_party_id;
end;
$$;
revoke all on function public.create_party_named_v1(uuid,text,text,integer,text,text) from public, anon;
grant execute on function public.create_party_named_v1(uuid,text,text,integer,text,text) to authenticated;

-- Do not rewrite the existing v19 Party state contract used by older app versions.
create or replace function public.party_social_state_v20()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_state jsonb; v_party public.parties%rowtype;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  v_state := public.party_social_state_v19();
  if jsonb_typeof(v_state->'party') is distinct from 'object' then return v_state; end if;
  select p.* into v_party from public.parties p
   where p.id=(v_state#>>'{party,id}')::uuid
     and exists(select 1 from public.party_members m
       where m.party_id=p.id and m.account_id=v_uid and m.left_at is null);
  if not found then return v_state; end if;
  return jsonb_set(v_state,'{party}',(v_state->'party') ||
    jsonb_build_object('shortName',v_party.short_name,
      'nameChangedAt',v_party.name_changed_at,
      'nameNextChangeAt',v_party.name_changed_at + interval '6 months'));
end;
$$;
revoke all on function public.party_social_state_v20() from public, anon;
grant execute on function public.party_social_state_v20() to authenticated;

-- New ranking read contract includes stable party_id and mutable display name.
-- Historical rankings are still keyed by party_id, never by the name.
create or replace function public.party_rankings_board_v17(p_event_key text default null)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(entry.value || jsonb_build_object('party_name',p.short_name)
     order by (entry.value->>'rank')::integer), '[]'::jsonb)
  from jsonb_array_elements(public.party_rankings_board_v16(p_event_key)) entry(value)
  left join public.parties p on p.id=(entry.value->>'party_id')::uuid
$$;
revoke all on function public.party_rankings_board_v17(text) from public, anon;
grant execute on function public.party_rankings_board_v17(text) to authenticated;

comment on column public.parties.short_name is
 'Globally unique among non-disbanded Parties; 3-5 ASCII letters, case-normalized, current ranking display identity.';
comment on column public.parties.name_changed_at is
 'First claim or last change; subsequent changes only every six calendar months.';
