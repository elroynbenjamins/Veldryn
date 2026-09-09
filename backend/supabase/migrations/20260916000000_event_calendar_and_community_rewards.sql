-- Repeatable festival attendance and server-authoritative community-stage rewards.
create table if not exists public.event_daily_gift_claims (
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.live_events(event_id) on delete cascade,
  claim_day date not null,
  gift_day smallint not null check(gift_day between 1 and 31),
  claimed_at timestamptz not null default now(),
  primary key(account_id,event_id,claim_day)
);

create table if not exists public.event_community_claims (
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.live_events(event_id) on delete cascade,
  milestone_percent smallint not null check(milestone_percent between 1 and 100),
  claimed_at timestamptz not null default now(),
  primary key(account_id,event_id,milestone_percent)
);

alter table public.event_daily_gift_claims enable row level security;
alter table public.event_community_claims enable row level security;
create policy "read own event daily gifts" on public.event_daily_gift_claims for select to authenticated using(account_id=auth.uid());
create policy "read own event community claims" on public.event_community_claims for select to authenticated using(account_id=auth.uid());

update public.live_events
set config=config||'{
  "dailyGifts":[
    {"day":1,"rewardCurrency":100,"rewardPrestige":0},
    {"day":2,"rewardCurrency":150,"rewardPrestige":0},
    {"day":3,"rewardCurrency":200,"rewardPrestige":0},
    {"day":4,"rewardCurrency":250,"rewardPrestige":0},
    {"day":5,"rewardCurrency":300,"rewardPrestige":0},
    {"day":6,"rewardCurrency":400,"rewardPrestige":0},
    {"day":7,"rewardCurrency":500,"rewardPrestige":1}
  ],
  "communityGoal":100000,
  "communityMilestones":[
    {"percent":25,"rewardCurrency":200,"rewardPrestige":0},
    {"percent":50,"rewardCurrency":350,"rewardPrestige":1},
    {"percent":75,"rewardCurrency":500,"rewardPrestige":1},
    {"percent":100,"rewardCurrency":750,"rewardPrestige":2,"kind":"title","rewardId":"title_storehouse_builder"}
  ]
}'::jsonb,updated_at=now()
where event_id='EVT_ANNUAL_009_2026';

create or replace function public.claim_event_daily_gift(p_event_id text)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid();v_today date:=(now() at time zone 'utc')::date;v_start date;v_event_day integer;v_cycle integer;v_gift_day integer;
  v_common bigint;v_prestige bigint;v_inserted integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select coalesce((e.starts_at at time zone 'utc')::date,v_today),jsonb_array_length(e.config->'dailyGifts') into v_start,v_cycle
  from public.live_events e where e.event_id=p_event_id and e.enabled and (e.starts_at is null or e.starts_at<=now()) and (e.ends_at is null or e.ends_at>now());
  if v_start is null or coalesce(v_cycle,0)=0 then raise exception 'EVENT_NOT_ACTIVE'; end if;
  v_event_day:=greatest(1,v_today-v_start+1);v_gift_day:=mod(v_event_day-1,v_cycle)+1;
  select (gift->>'rewardCurrency')::bigint,(gift->>'rewardPrestige')::bigint into v_common,v_prestige
  from public.live_events e cross join lateral jsonb_array_elements(e.config->'dailyGifts') gift
  where e.event_id=p_event_id and (gift->>'day')::integer=v_gift_day;
  insert into public.event_daily_gift_claims(account_id,event_id,claim_day,gift_day) values(v_uid,p_event_id,v_today,v_gift_day) on conflict do nothing;
  get diagnostics v_inserted=row_count;if v_inserted=0 then raise exception 'DAILY_GIFT_ALREADY_CLAIMED'; end if;
  insert into public.event_progress(account_id,event_id,progress,currency_balance,prestige_balance) values(v_uid,p_event_id,v_common,v_common,v_prestige)
  on conflict(account_id,event_id) do update set progress=event_progress.progress+excluded.progress,currency_balance=event_progress.currency_balance+excluded.currency_balance,prestige_balance=event_progress.prestige_balance+excluded.prestige_balance,updated_at=now();
end $$;

create or replace function public.claim_event_community_reward(p_event_id text,p_percent integer)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid();v_goal bigint;v_total bigint;v_stage integer;v_common bigint;v_prestige bigint;v_kind text;v_reward_id text;v_inserted integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select (e.config->>'communityGoal')::bigint,(milestone->>'rewardCurrency')::bigint,(milestone->>'rewardPrestige')::bigint,milestone->>'kind',milestone->>'rewardId'
  into v_goal,v_common,v_prestige,v_kind,v_reward_id
  from public.live_events e cross join lateral jsonb_array_elements(e.config->'communityMilestones') milestone
  where e.event_id=p_event_id and e.enabled and (e.starts_at is null or e.starts_at<=now()) and (e.ends_at is null or e.ends_at>now()) and (milestone->>'percent')::integer=p_percent;
  if v_goal is null then raise exception 'COMMUNITY_REWARD_NOT_AVAILABLE'; end if;
  select coalesce(sum(quantity),0) into v_total from public.event_contributions where event_id=p_event_id;
  v_stage:=least(100,floor(v_total::numeric*100/greatest(1,v_goal))::integer);
  if v_stage<p_percent then raise exception 'COMMUNITY_MILESTONE_INCOMPLETE'; end if;
  insert into public.event_community_claims(account_id,event_id,milestone_percent) values(v_uid,p_event_id,p_percent) on conflict do nothing;
  get diagnostics v_inserted=row_count;if v_inserted=0 then raise exception 'COMMUNITY_REWARD_ALREADY_CLAIMED'; end if;
  insert into public.event_progress(account_id,event_id,progress,currency_balance,prestige_balance) values(v_uid,p_event_id,v_common,v_common,v_prestige)
  on conflict(account_id,event_id) do update set progress=event_progress.progress+excluded.progress,currency_balance=event_progress.currency_balance+excluded.currency_balance,prestige_balance=event_progress.prestige_balance+excluded.prestige_balance,updated_at=now();
  if v_reward_id is not null then insert into public.event_cosmetic_unlocks(account_id,event_id,reward_id,reward_type) values(v_uid,p_event_id,v_reward_id,v_kind) on conflict do nothing; end if;
end $$;

revoke all on function public.claim_event_daily_gift(text),public.claim_event_community_reward(text,integer) from public;
grant execute on function public.claim_event_daily_gift(text),public.claim_event_community_reward(text,integer) to authenticated;
