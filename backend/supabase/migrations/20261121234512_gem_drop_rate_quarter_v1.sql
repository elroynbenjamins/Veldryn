-- Quarter random gem acquisition rates (75% fewer chance rolls).
-- Scaling the corresponding pity limits by 4 prevents guaranteed rewards
-- from defeating the rarity change. Existing gems, recipes, catalysts, and
-- guaranteed weekly Resonance Cache rewards are unchanged.
--
-- Safe to apply to databases where the hotfix was already executed: both
-- functions are inspected before replacement. Any unknown rate contract fails.
do $gem_quarter$
declare
  v_old text;
  v_new text;
  v_pattern text;
  v_found integer;
begin
  select pg_get_functiondef('public.settle_coop_gem_reward_v1()'::regprocedure)
    into v_old;
  if position('v_pity+1>=32' in v_old)>0
     and position(':gem-drop'')<0.045' in v_old)>0 then
    -- Already applied on this database.
    null;
  elsif position('v_pity+1>=8' in v_old)>0
     and position(':gem-drop'')<0.18' in v_old)>0 then
    v_new:=replace(v_old,'v_pity+1>=8','v_pity+1>=32');
    v_new:=replace(v_new,':gem-drop'')<0.18',':gem-drop'')<0.045');
    v_new:=replace(v_new,'18% Grade III, source pity at 8','4.5% Grade III, source pity at 32');
    execute v_new;
  else
    raise exception 'Unexpected co-op gem drop/pity contract; refusing migration';
  end if;

  select pg_get_functiondef('public.settle_regional_gem_source_server_v1(uuid,text,text)'::regprocedure)
    into v_old;
  if position('v_chance:=0.001875;v_pity_at:=null' in v_old)>0
     and position('v_chance:=0.00375;v_pity_at:=240' in v_old)>0
     and position('v_chance:=0.0075;v_pity_at:=100' in v_old)>0 then
    null;
  else
    v_pattern:='v_chance:=0.0075;v_pity_at:=null';
    v_found:=(length(v_old)-length(replace(v_old,v_pattern,'')))/length(v_pattern);
    if v_found<>1 then raise exception 'Unexpected regular enemy gem rate count: %',v_found;end if;
    v_pattern:='v_chance:=0.015;v_pity_at:=60';
    v_found:=(length(v_old)-length(replace(v_old,v_pattern,'')))/length(v_pattern);
    if v_found<>3 then raise exception 'Unexpected elite gem rate count: %',v_found;end if;
    v_pattern:='v_chance:=0.03;v_pity_at:=25';
    v_found:=(length(v_old)-length(replace(v_old,v_pattern,'')))/length(v_pattern);
    if v_found<>1 then raise exception 'Unexpected regional boss gem rate count: %',v_found;end if;

    v_new:=replace(v_old,'v_chance:=0.0075;v_pity_at:=null','v_chance:=0.001875;v_pity_at:=null');
    v_new:=replace(v_new,'v_chance:=0.015;v_pity_at:=60','v_chance:=0.00375;v_pity_at:=240');
    v_new:=replace(v_new,'v_chance:=0.03;v_pity_at:=25','v_chance:=0.0075;v_pity_at:=100');
    execute v_new;
  end if;
end
$gem_quarter$;
