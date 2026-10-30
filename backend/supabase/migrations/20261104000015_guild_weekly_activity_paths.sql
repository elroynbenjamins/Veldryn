-- Shared weekly project paths: combat, gathering and verified crafting.
-- Preserve the original 20 effort/minute, daily cap, member caps, completion
-- requirements and Hall/Gold rewards. Activity totals are informational.
create table if not exists public.guild_project_effort_sources_v1 (
 project_id uuid not null references public.guild_project_instances(id) on delete cascade,
 account_id uuid not null references auth.users(id) on delete cascade,
 source text not null check(source in ('combat','gathering','crafting')),
 points bigint not null default 0 check(points>=0),
 primary key(project_id,account_id,source)
);
alter table public.guild_project_effort_sources_v1 enable row level security;
revoke all on public.guild_project_effort_sources_v1 from public,anon,authenticated;
grant select,insert,update on public.guild_project_effort_sources_v1 to service_role;
grant select on public.guild_project_effort_sources_v1 to authenticated;
drop policy if exists "guild members read weekly activity totals" on public.guild_project_effort_sources_v1;
create policy "guild members read weekly activity totals" on public.guild_project_effort_sources_v1
 for select to authenticated
 using(exists(
  select 1 from public.guild_project_instances p
  join public.guild_members m on m.guild_id=p.guild_id
  where p.id=project_id and m.account_id=auth.uid()
 ));
-- Backfill existing combat and skilling totals as group categories.
-- No re-crediting; historical crafting is included in generic gathering.
insert into public.guild_project_effort_sources_v1(project_id,account_id,source,points)
 select project_instance_id,account_id,'combat',greatest(0,combat_points)
 from public.guild_project_member_progress where combat_points>0
 on conflict do nothing;
insert into public.guild_project_effort_sources_v1(project_id,account_id,source,points)
 select project_instance_id,account_id,'gathering',greatest(0,skilling_points)
 from public.guild_project_member_progress where skilling_points>0
 on conflict do nothing;

create or replace function public.credit_guild_project_effort_v2(p_account uuid,p_guild uuid,p_effort jsonb,p_now timestamptz) returns void
language plpgsql security definer set search_path=public as $$
declare p record;m record;a jsonb;s timestamptz;t timestamptz;day_start timestamptz;day_end timestamptz;j timestamptz;b bigint;c bigint;points bigint;combat bigint;skills bigint;allowed bigint;binding uuid;v_source text;v_credit bigint;
begin
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_account,0));
 perform ensure_guild_weekly_project_v2(p_guild,p_now);
 select joined_at into j from guild_members where account_id=p_account and guild_id=p_guild for share;
 if not found then return;end if;
 for p in select * from guild_project_instances where guild_id=p_guild and template_id='guild_weekly_shared_effort' and status in('active','expired','completed') and ends_at+interval '7 days'>p_now order by id for update loop
 select * into m from guild_project_member_progress where project_instance_id=p.id and account_id=p_account;
 if not found then continue;end if;
 combat:=0;skills:=0;
 for a in select * from jsonb_array_elements(p_effort) loop
 if a->>'kind'='crafting' and jsonb_typeof(a->'units')='number' then
   -- Each verified crafted item is 15 seconds = 5 weekly effort, without
   -- granting any extra daily capacity or multiplying the existing reward.
   v_source:='crafting';
   t:=least(p_now,p.ends_at);
   s:=greatest(t-interval '15 seconds'*least(100,greatest(0,(a->>'units')::numeric)),p.started_at,m.joined_at_snapshot,j);
 elsif a->>'kind' in ('combat','skilling') and jsonb_typeof(a->'startsAtMs')='number' and jsonb_typeof(a->'endsAtMs')='number' then
   v_source:=case when a->>'kind'='combat' then 'combat' else 'gathering' end;
   s:=greatest(to_timestamp((a->>'startsAtMs')::numeric/1000),p.started_at,m.joined_at_snapshot,j);
   t:=least(to_timestamp((a->>'endsAtMs')::numeric/1000),p.ends_at,p_now);
 else continue;end if;
 if t<=s then continue;end if;
 insert into guild_project_cycle_bindings(cycle_key,account_id,guild_id,bound_at,points_at_bind) values(p.cycle_key,p_account,p_guild,p_now,1) on conflict do nothing;
 select guild_id into binding from guild_project_cycle_bindings where cycle_key=p.cycle_key and account_id=p_account;
 if binding<>p_guild then continue;end if;
 while s<t loop
 day_start:=date_trunc('day',s at time zone 'UTC') at time zone 'UTC';day_end:=least(t,day_start+interval '1 day');
 insert into guild_project_effort_days_v1 values(p.id,p_account,(day_start at time zone 'UTC')::date,0) on conflict do nothing;
 select credited_ms into b from guild_project_effort_days_v1 where project_id=p.id and account_id=p_account and earned_day=(day_start at time zone 'UTC')::date for update;
 c:=least(7200000,b+floor(extract(epoch from day_end-s)*1000));v_credit:=floor(c/3000.0)-floor(b/3000.0);points:=v_credit;
 if v_credit>0 then
  insert into public.guild_project_effort_sources_v1(project_id,account_id,source,points)
  values(p.id,p_account,v_source,v_credit)
  on conflict(project_id,account_id,source) do update set points=public.guild_project_effort_sources_v1.points+excluded.points;
 end if;
 update guild_project_effort_days_v1 set credited_ms=c where project_id=p.id and account_id=p_account and earned_day=(day_start at time zone 'UTC')::date;
 if v_source='combat' then combat:=combat+points;else skills:=skills+points;end if;s:=day_end;
 end loop;
 end loop;
 points:=combat+skills;
 if points=0 then continue;end if;
 allowed:=greatest(0,least(points,ceil(p.target_points*p.single_account_completion_share_cap)-m.completion_points));
 update guild_project_member_progress set raw_points=raw_points+points,completion_points=completion_points+allowed,combat_points=combat_points+combat,skilling_points=skilling_points+skills,first_contribution_at=coalesce(first_contribution_at,p_now),last_contribution_at=p_now where project_instance_id=p.id and account_id=p_account;
 update guild_project_instances set completion_points=completion_points+allowed,combat_points=combat_points+combat,skilling_points=skilling_points+skills,meaningful_contributors=(select count(*) from guild_project_member_progress where project_instance_id=p.id and raw_points>=250) where id=p.id;
 update guild_project_instances set status='completed',completed_at=p_now,completion_snapshot=jsonb_build_object('hallProgress',200,'gold',500) where id=p.id and status<>'completed' and completion_points>=target_points and meaningful_contributors>=minimum_meaningful_contributors;
 end loop;
end $$;

revoke all on function public.credit_guild_project_effort_v2(uuid,uuid,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.credit_guild_project_effort_v2(uuid,uuid,jsonb,timestamptz) to service_role;
