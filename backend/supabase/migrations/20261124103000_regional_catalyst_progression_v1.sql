-- Regional Catalyst is already needed for Grade IV merging at Enchanting 40.
-- Remove early dungeon acquisition, reduce later boss rolls, and replace
-- the early reward with useful Gem Dust. Do not rewrite owned inventory,
-- already prepared weekly caches, or unrelated gem/pity/recipe rolls.
do $$
declare
  v_old text;
  v_new text;
  v_needle text := $needle$if public.veldryn_hash_roll_v1(new.id::text||':regional-catalyst')<0.15 then
   v_state:=public.veldryn_game_state_add_stackable_v1(v_state,'REGIONAL_CATALYST',1,v_now_ms);
  end if;$needle$;
  v_replacement text := $replacement$if v_source in ('COP_004','COP_005') then
   if public.veldryn_hash_roll_v1(new.id::text||':regional-catalyst')<0.15 then
    v_state:=public.veldryn_game_state_add_stackable_v1(v_state,'GEM_DUST',3,v_now_ms);
   end if;
  elsif v_source in ('COP_006','COP_007','COP_008','COP_009')
    and public.veldryn_hash_roll_v1(new.id::text||':regional-catalyst')<
       case v_source when 'COP_006' then 0.03 when 'COP_007' then 0.03 when 'COP_008' then 0.04 when 'COP_009' then 0.05 else 0 end then
   v_state:=public.veldryn_game_state_add_stackable_v1(v_state,'REGIONAL_CATALYST',1,v_now_ms);
  end if;$replacement$;
begin
  select pg_get_functiondef('public.settle_coop_gem_reward_v1()'::regprocedure) into v_old;
  if position(v_replacement in v_old)>0 then return; end if;
  if position(v_needle in v_old)=0 then
    raise exception 'Unexpected co-op catalyst settlement definition; inspect before applying';
  end if;
  v_new:=replace(v_old,v_needle,v_replacement);
  execute v_new;
end $$;
