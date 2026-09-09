-- Winter Preparation choices now provide event-only bonuses and boosted contribution value.
update public.live_events set config=jsonb_set(config,'{choices}','[
  {"id":"preserved_supplies","bonusLabel":"+20% marks from gathering","dropMultipliers":{"gathering":1.20},"contributionMultiplier":1},
  {"id":"reinforced_workshop","bonusLabel":"+20% marks from crafting","dropMultipliers":{"crafting":1.20},"contributionMultiplier":1},
  {"id":"travelers_stock","bonusLabel":"+15% combat marks · +10% boss marks","dropMultipliers":{"combat":1.15,"boss":1.10},"contributionMultiplier":1},
  {"id":"guild_pantry","bonusLabel":"+20% boss marks · +25% contribution value","dropMultipliers":{"boss":1.20},"contributionMultiplier":1.25}
]'::jsonb,true),updated_at=now()
where event_id='EVT_ANNUAL_009_2026';

create or replace function public.choose_event_project(p_event_id text,p_choice_id text)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_existing text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.live_events e cross join lateral jsonb_array_elements(e.config->'choices') choice
    where e.event_id=p_event_id and e.enabled and (e.starts_at is null or e.starts_at<=now()) and (e.ends_at is null or e.ends_at>now()) and choice->>'id'=p_choice_id)
  then raise exception 'CHOICE_NOT_AVAILABLE'; end if;
  select choice_id into v_existing from public.event_choices where account_id=v_uid and event_id=p_event_id;
  if v_existing is not null and v_existing<>p_choice_id then raise exception 'CHOICE_ALREADY_LOCKED'; end if;
  insert into public.event_choices(account_id,event_id,choice_id) values(v_uid,p_event_id,p_choice_id) on conflict do nothing;
end $$;

create or replace function public.contribute_event_currency(p_event_id text,p_quantity integer,p_receipt_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_choice text;v_balance bigint;v_multiplier numeric:=1;v_credited integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_quantity<=0 then raise exception 'INVALID_QUANTITY'; end if;
  if exists(select 1 from public.event_contributions where receipt_id=p_receipt_id) then return; end if;
  select ec.choice_id,coalesce((choice->>'contributionMultiplier')::numeric,1) into v_choice,v_multiplier
  from public.event_choices ec join public.live_events e on e.event_id=ec.event_id
  cross join lateral jsonb_array_elements(e.config->'choices') choice
  where ec.account_id=v_uid and ec.event_id=p_event_id and choice->>'id'=ec.choice_id and e.enabled
    and (e.starts_at is null or e.starts_at<=now()) and (e.ends_at is null or e.ends_at>now());
  if v_choice is null then raise exception 'ACTIVE_PROJECT_REQUIRED'; end if;
  select currency_balance into v_balance from public.event_progress where account_id=v_uid and event_id=p_event_id for update;
  if coalesce(v_balance,0)<p_quantity then raise exception 'INSUFFICIENT_EVENT_CURRENCY'; end if;
  v_credited:=floor(p_quantity*v_multiplier)::integer;
  update public.event_progress set currency_balance=currency_balance-p_quantity,updated_at=now() where account_id=v_uid and event_id=p_event_id;
  insert into public.event_contributions(account_id,event_id,project_id,quantity,receipt_id) values(v_uid,p_event_id,v_choice,v_credited,p_receipt_id);
end $$;

revoke all on function public.choose_event_project(text,text),public.contribute_event_currency(text,integer,uuid) from public;
grant execute on function public.choose_event_project(text,text),public.contribute_event_currency(text,integer,uuid) to authenticated;

-- Shared lookup for future server activity settlement; clients cannot choose their multiplier.
create or replace function public.event_project_drop_multiplier(p_event_id text,p_source text)
returns numeric language sql stable security definer set search_path=public as $$
  select coalesce((select (choice->'dropMultipliers'->>p_source)::numeric
    from public.event_choices ec join public.live_events e on e.event_id=ec.event_id
    cross join lateral jsonb_array_elements(e.config->'choices') choice
    where ec.account_id=auth.uid() and ec.event_id=p_event_id and choice->>'id'=ec.choice_id),1);
$$;

revoke all on function public.event_project_drop_multiplier(text,text) from public;
grant execute on function public.event_project_drop_multiplier(text,text) to authenticated;
