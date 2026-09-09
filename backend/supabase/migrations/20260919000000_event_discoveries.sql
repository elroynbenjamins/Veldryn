-- Rare activity-specific event discoveries with permanent cosmetic completion rewards.
create table if not exists public.event_discovery_progress (
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.live_events(event_id) on delete cascade,
  discovery_id text not null,
  found_count integer not null default 0 check(found_count>=0),
  updated_at timestamptz not null default now(),
  primary key(account_id,event_id,discovery_id)
);

create table if not exists public.event_discovery_claims (
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.live_events(event_id) on delete cascade,
  discovery_id text not null,
  claimed_at timestamptz not null default now(),
  primary key(account_id,event_id,discovery_id)
);

alter table public.event_discovery_progress enable row level security;
alter table public.event_discovery_claims enable row level security;
create policy "read own event discoveries" on public.event_discovery_progress for select to authenticated using(account_id=auth.uid());
create policy "read own event discovery claims" on public.event_discovery_claims for select to authenticated using(account_id=auth.uid());

update public.live_events set config=jsonb_set(config,'{discoveries}','[
  {"id":"whispering_husk","name":"Whispering Husk","source":"combat","chance":0.003,"required":5,"kind":"emote","rewardId":"emote_scarecrow_salute"},
  {"id":"golden_field_feather","name":"Golden Field Feather","source":"gathering","chance":0.015,"required":5,"kind":"pet","rewardId":"pet_straw_sparrow"},
  {"id":"amber_artisan_seal","name":"Amber Artisan Seal","source":"crafting","chance":0.06,"required":3,"kind":"title","rewardId":"title_amber_artisan"},
  {"id":"guardian_lantern","name":"Guardian Lantern","source":"boss","chance":0.25,"required":1,"kind":"background","rewardId":"bg_spirit_storehouse"}
]'::jsonb,true),updated_at=now()
where event_id='EVT_ANNUAL_009_2026';

create or replace function public.claim_event_discovery(p_event_id text,p_discovery_id text)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_required integer;v_kind text;v_reward_id text;v_found integer;v_inserted integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.event_claim_open(p_event_id) then raise exception 'EVENT_CLAIMS_CLOSED'; end if;
  select (discovery->>'required')::integer,discovery->>'kind',discovery->>'rewardId' into v_required,v_kind,v_reward_id
  from public.live_events e cross join lateral jsonb_array_elements(e.config->'discoveries') discovery
  where e.event_id=p_event_id and discovery->>'id'=p_discovery_id;
  if v_required is null then raise exception 'DISCOVERY_NOT_AVAILABLE'; end if;
  select found_count into v_found from public.event_discovery_progress where account_id=v_uid and event_id=p_event_id and discovery_id=p_discovery_id for update;
  if coalesce(v_found,0)<v_required then raise exception 'DISCOVERY_INCOMPLETE'; end if;
  insert into public.event_discovery_claims(account_id,event_id,discovery_id) values(v_uid,p_event_id,p_discovery_id) on conflict do nothing;
  get diagnostics v_inserted=row_count;if v_inserted=0 then raise exception 'DISCOVERY_ALREADY_CLAIMED'; end if;
  insert into public.event_cosmetic_unlocks(account_id,event_id,reward_id,reward_type) values(v_uid,p_event_id,v_reward_id,v_kind) on conflict do nothing;
end $$;

revoke all on function public.claim_event_discovery(text,text) from public;
grant execute on function public.claim_event_discovery(text,text) to authenticated;

-- Discovery progress is written only by trusted server activity settlement.
create or replace function public.record_event_discovery(p_account_id uuid,p_event_id text,p_discovery_id text,p_quantity integer)
returns void language plpgsql security definer set search_path=public as $$
declare v_required integer;
begin
  if p_quantity<=0 then return; end if;
  select (discovery->>'required')::integer into v_required from public.live_events e cross join lateral jsonb_array_elements(e.config->'discoveries') discovery
  where e.event_id=p_event_id and discovery->>'id'=p_discovery_id;
  if v_required is null then raise exception 'DISCOVERY_NOT_AVAILABLE'; end if;
  insert into public.event_discovery_progress(account_id,event_id,discovery_id,found_count) values(p_account_id,p_event_id,p_discovery_id,least(p_quantity,v_required))
  on conflict(account_id,event_id,discovery_id) do update set found_count=least(v_required,event_discovery_progress.found_count+excluded.found_count),updated_at=now();
end $$;

revoke all on function public.record_event_discovery(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.record_event_discovery(uuid,text,text,integer) to service_role;
