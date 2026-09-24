begin;

-- Guild Quest state v4: include extended combat/dungeon/crafting pool.\nalter table public.guild_quest_completions drop constraint if exists guild_quest_completions_quest_key_check;

create or replace function public.guild_quest_state_v1()
returns table(
 guild_id uuid,week_key date,week_ends_at timestamptz,active_members integer,
 quest_key text,title text,category text,description text,theme text,rarity text,estimated_minutes integer,
 progress integer,target integer,objective_progress jsonb,activity_reward integer,completed boolean,contributor_count integer
)
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); gid uuid; wk date:=public.guild_quest_week_key_v1(); t record; p record; s record; op jsonb; prog jsonb; done boolean; totalp int; totalt int;
begin
 if uid is null then return; end if;
 select gm.guild_id into gid from public.guild_members gm where gm.account_id=uid limit 1;
 if gid is null then return; end if;
 perform public.guild_quest_settle_v1(gid,wk);
 select * into t from public.guild_quest_targets_v1(gid,wk);
 select * into p from public.guild_quest_progress_v1(gid,wk);

 return query
 select gid,wk,(wk+7)::timestamp at time zone 'UTC',t.active_members,r.quest_key,r.title,r.category,r.description,r.theme,
   'rare'::text,45,
   case r.quest_key when 'combat_front' then p.combat_points when 'skilling_drive' then p.skilling_points else p.united_points end,
   case r.quest_key when 'combat_front' then t.combat_target when 'skilling_drive' then t.skilling_target else t.united_target end,
   '[]'::jsonb,case r.quest_key when 'united_effort' then 700 else 500 end,
   exists(select 1 from public.guild_quest_completions c where c.guild_id=gid and c.week_key=wk and c.quest_key=r.quest_key),p.contributors
 from public.guild_quest_rotation_v2(gid,wk) r;

 for s in select * from (
   select * from public.guild_quest_special_pool_v3(gid,wk)
   union all
   select * from public.guild_quest_extended_pool_v4(gid,wk)
 ) pool order by sort_order loop
   prog:=public.guild_quest_action_progress_v3(gid,wk,s.objective_json);
   select coalesce(sum((x->>'progress')::int),0),coalesce(sum((x->>'target')::int),1),
          coalesce(bool_and((x->>'progress')::int >= (x->>'target')::int),false)
     into totalp,totalt,done from jsonb_array_elements(prog) x;
   if done and not exists(select 1 from public.guild_quest_completions c where c.guild_id=gid and c.week_key=wk and c.quest_key=s.quest_key) then
     insert into public.guild_quest_completions(guild_id,week_key,quest_key,activity_units) values(gid,wk,s.quest_key,s.activity_reward) on conflict do nothing;
     if found then perform * from public.guild_activity_award_v1(gid,'guild_quest',wk::text||':'||s.quest_key,s.activity_reward,clock_timestamp()); end if;
   end if;
   return query select gid,wk,(wk+7)::timestamp at time zone 'UTC',t.active_members,s.quest_key,s.title,s.category,s.description,s.theme,s.rarity,s.estimated_minutes,
     totalp,totalt,prog,s.activity_reward,
     exists(select 1 from public.guild_quest_completions c where c.guild_id=gid and c.week_key=wk and c.quest_key=s.quest_key),p.contributors;
 end loop;
end $$;

revoke all on function public.guild_quest_state_v1() from public,anon;
grant execute on function public.guild_quest_state_v1() to authenticated,service_role;
commit;