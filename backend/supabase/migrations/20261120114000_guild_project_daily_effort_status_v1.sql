-- Read-only, account-scoped UTC daily activity meter for active Guild Projects.
-- Keep the raw daily ledger private; it stores base effort, not boosted weekly points.
begin;
create or replace function public.guild_project_my_daily_effort_v1()
returns table(project_id uuid,earned_day date,credited_ms bigint,cap_ms bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
 v_account uuid := (select auth.uid());
 v_day date := (timezone('UTC',now()))::date;
begin
 if v_account is null then return; end if;
 return query
 select p.id,v_day,coalesce(d.credited_ms,0)::bigint,7200000::bigint
 from public.guild_project_instances p
 join public.guild_members gm on gm.guild_id=p.guild_id and gm.account_id=v_account
 left join public.guild_project_effort_days_v1 d on
   d.project_id=p.id and d.account_id=v_account and d.earned_day=v_day
 where p.status='active'
   and (p.template_id='guild_weekly_shared_effort'
     or (p.slot_index=2 and p.cycle_key like 'choice:%'))
   and coalesce(p.definition_snapshot->>'mode','effort')<>'donation';
end;
$$;
revoke all on function public.guild_project_my_daily_effort_v1() from public,anon,authenticated;
grant execute on function public.guild_project_my_daily_effort_v1() to authenticated;
commit;
