begin;

alter table public.guild_quest_completions
 add column if not exists completed_by_account_id uuid references auth.users(id) on delete set null;

create or replace function public.guild_quest_completion_meta_v6(p_guild_id uuid,p_week date,p_quest_key text)
returns table(completed_at timestamptz,completed_by_account_id uuid,completed_by_name text)
language sql stable security definer set search_path=public as $$
 select c.completed_at,c.completed_by_account_id,coalesce(nullif(trim(pp.display_name),''),'Guild member')
 from public.guild_quest_completions c
 left join public.player_profiles pp on pp.account_id=c.completed_by_account_id
 where c.guild_id=p_guild_id and c.week_key=p_week and c.quest_key=p_quest_key
$$;

-- Personal contribution is derived from the same server-owned exact ledger.
create or replace function public.guild_quest_personal_objective_progress_v6(p_guild_id uuid,p_account_id uuid,p_week date,p_objectives jsonb)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('key',o->>'key','progress',least((o->>'target')::int,coalesce(x.total,0)),'target',(o->>'target')::int) order by ord),'[]'::jsonb)
 from jsonb_array_elements(p_objectives) with ordinality e(o,ord)
 left join lateral(
   select sum(a.action_count)::int total from public.guild_quest_action_daily a
   where a.guild_id=p_guild_id and a.account_id=p_account_id and a.activity_date between p_week and p_week+6 and a.action_key=o->>'key'
 ) x on true
$$;

comment on function public.guild_quest_personal_objective_progress_v6(uuid,uuid,date,jsonb) is
 'Personal Guild Quest contribution projection from authoritative completed-action counters.';
commit;