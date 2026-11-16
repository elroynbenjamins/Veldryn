-- Manual chat translation quota: one small row per authenticated account.
-- This is not a chat transcript and never stores message contents.
create schema if not exists private;

create table if not exists private.chat_translation_quota_v1(
 account_id uuid primary key references auth.users(id) on delete cascade,
 window_start timestamptz not null,
 used integer not null default 0 check(used >= 0),
 last_used_at timestamptz not null
);
alter table private.chat_translation_quota_v1 enable row level security;
revoke all on table private.chat_translation_quota_v1 from public,anon,authenticated;

-- Called by the translation Edge Function using the caller's JWT. Using a
-- single upsert provides atomic cross-worker/day limits without tracking chat.
create or replace function public.claim_chat_translation_v1()
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
 v_user uuid := auth.uid();
 v_now timestamptz := clock_timestamp();
 v_allowed boolean := false;
begin
 if v_user is null then return false; end if;
 insert into private.chat_translation_quota_v1 as quota
   (account_id,window_start,used,last_used_at)
 values (v_user,v_now,1,v_now)
 on conflict(account_id) do update
 set window_start = case when quota.window_start <= v_now - interval '24 hours' then v_now else quota.window_start end,
     used = case when quota.window_start <= v_now - interval '24 hours' then 1 else quota.used + 1 end,
     last_used_at = v_now
 where quota.last_used_at <= v_now - interval '3 seconds'
   and (quota.window_start <= v_now - interval '24 hours' or quota.used < 60)
 returning true into v_allowed;
 return coalesce(v_allowed,false);
end;
$function$;
revoke all on function public.claim_chat_translation_v1() from public,anon;
grant execute on function public.claim_chat_translation_v1() to authenticated;
comment on function public.claim_chat_translation_v1() is 'Atomic manual chat translation quota, per auth.uid(): 60 uses per 24h and 3s cooldown';
