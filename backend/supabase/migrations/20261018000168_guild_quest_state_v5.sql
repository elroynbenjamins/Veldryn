begin;

-- State v5 projects only the curated weekly board.
-- PostgreSQL cannot replace a TABLE return signature; restore grants below.
drop function if exists public.guild_quest_state_v1();
create or replace function public.guild_quest_state_v1()
returns table(
 guild_id uuid,week_key date,week_ends_at timestamptz,active_members integer,
 quest_key text,title text,category text,description text,theme text,rarity text,estimated_minutes integer,
 progress integer,target integer,objective_progress jsonb,activity_reward integer,completed boolean,contributor_count integer,
 board_slot integer,featured boolean
)
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); gid uuid; wk date:=public.guild_quest_week_key_v1(); t record; p record; b record; s record; prog jsonb; done boolean; totalp int; totalt int; rr text; base_actions int; scale numeric;
begin
 if uid is null then return; end if;
 select gm.guild_id into gid from public.guild_members gm where gm.account_id=uid limit 1;
 if gid is null then return; end if;
 perform public.guild_quest_settle_v1(gid,wk);
 select * into t from public.guild_quest_targets_v1(gid,wk);
 select * into p from public.guild_quest_progress_v1(gid,wk);

 for b in select * from public.guild_quest_board_v5(gid,wk) order by board_slot loop
   rr:=public.guild_quest_board_rarity_v5(gid,wk,b.board_slot);
   if b.source_key in ('combat_front','skilling_drive') then
     return query select gid,wk,(wk+7)::timestamp at time zone 'UTC',t.active_members,b.source_key,
       case b.source_key when 'combat_front' then 'Guild Vanguard' else 'Supply the Guild' end,
       case b.source_key when 'combat_front' then 'Combat' else 'Skilling' end,
       case b.source_key when 'combat_front' then 'Contribute through verified combat play.' else 'Contribute through verified gathering, processing and crafting.' end,
       case b.source_key when 'combat_front' then 'Vanguard' else 'Professions' end,
       rr,public.guild_quest_rarity_minutes_v3(rr),
       case b.source_key when 'combat_front' then p.combat_points else p.skilling_points end,
       case b.source_key when 'combat_front' then greatest(100,ceil(t.active_members*public.guild_quest_rarity_actions_v3(rr)*1.5)::int) else greatest(100,ceil(t.active_members*public.guild_quest_rarity_actions_v3(rr)*1.5)::int) end,
       '[]'::jsonb,public.guild_quest_rarity_reward_v3(rr),
       exists(select 1 from public.guild_quest_completions c where c.guild_id=gid and c.week_key=wk and c.quest_key=b.source_key||':'||rr),p.contributors,b.board_slot,b.featured;
   else
     select * into s from (
       select * from public.guild_quest_special_pool_v3(gid,wk)
       union all select * from public.guild_quest_extended_pool_v4(gid,wk)
     ) pool where pool.quest_key=b.source_key limit 1;
     if s.quest_key is null then continue; end if;
     -- Re-scale generated objective counts to the board-composed rarity while preserving objective proportions.
     base_actions:=greatest(1,public.guild_quest_rarity_actions_v3(s.rarity));
     scale:=public.guild_quest_rarity_actions_v3(rr)::numeric/base_actions;
     prog:=public.guild_quest_action_progress_v3(gid,wk,
       jsonb_build_object('mode','all','objectives',(
         select jsonb_agg(jsonb_build_object('key',o->>'key','target',greatest(1,ceil((o->>'target')::numeric*scale)::int)))
         from jsonb_array_elements(s.objective_json->'objectives') o
       )));
     select coalesce(sum((x->>'progress')::int),0),coalesce(sum((x->>'target')::int),1),coalesce(bool_and((x->>'progress')::int >= (x->>'target')::int),false)
       into totalp,totalt,done from jsonb_array_elements(prog) x;
     if done and not exists(select 1 from public.guild_quest_completions c where c.guild_id=gid and c.week_key=wk and c.quest_key=b.source_key||':'||rr) then
       insert into public.guild_quest_completions(guild_id,week_key,quest_key,activity_units) values(gid,wk,b.source_key||':'||rr,public.guild_quest_rarity_reward_v3(rr)) on conflict do nothing;
       if found then perform * from public.guild_activity_award_v1(gid,'guild_quest',wk::text||':'||b.source_key||':'||rr,public.guild_quest_rarity_reward_v3(rr),clock_timestamp()); end if;
     end if;
     return query select gid,wk,(wk+7)::timestamp at time zone 'UTC',t.active_members,b.source_key,s.title,s.category,s.description,s.theme,rr,public.guild_quest_rarity_minutes_v3(rr),
       totalp,totalt,prog,public.guild_quest_rarity_reward_v3(rr),
       exists(select 1 from public.guild_quest_completions c where c.guild_id=gid and c.week_key=wk and c.quest_key=b.source_key||':'||rr),p.contributors,b.board_slot,b.featured;
   end if;
 end loop;
end $$;

revoke all on function public.guild_quest_state_v1() from public,anon;
grant execute on function public.guild_quest_state_v1() to authenticated,service_role;
commit;