begin;

-- Annual event IDs are season-scoped state keys. Prevent an old seasonal ID
-- from being rescheduled into another year, which would otherwise reuse prior
-- progress, balances, claims and purchase-limit receipts.
create or replace function public.enforce_annual_live_event_season()
returns trigger
language plpgsql
set search_path=public
as $season$
declare
  v_match text[];
  v_year integer;
  v_start_year integer;
  v_start_month integer;
  v_start_day integer;
begin
  if new.starts_at is null then
    return new;
  end if;

  v_match:=regexp_match(new.event_id,'^(EVT_ANNUAL_[0-9]{3})_([0-9]{4})$');
  if v_match is null then
    return new;
  end if;

  v_year:=v_match[2]::integer;
  v_start_year:=extract(year from new.starts_at at time zone 'utc')::integer;

  if v_start_year=v_year then
    return new;
  end if;

  -- Turning of the Age intentionally spans Dec 29 -> Jan 4. Allow an emergency
  -- restart during the first week of the following January without changing the
  -- season identity.
  if v_match[1]='EVT_ANNUAL_001' and v_start_year=v_year+1 then
    v_start_month:=extract(month from new.starts_at at time zone 'utc')::integer;
    v_start_day:=extract(day from new.starts_at at time zone 'utc')::integer;
    if v_start_month=1 and v_start_day<=7 then
      return new;
    end if;
  end if;

  raise exception 'player_event_wrong_season_use_clone:%',new.event_id;
end
$season$;

drop trigger if exists live_events_annual_season_guard on public.live_events;
create trigger live_events_annual_season_guard
before insert or update of event_id,starts_at,enabled
on public.live_events
for each row
execute function public.enforce_annual_live_event_season();

commit;
