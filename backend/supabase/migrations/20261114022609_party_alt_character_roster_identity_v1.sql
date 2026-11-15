-- Return the selected owned fighter's ID with their name, class and role.
-- The Party membership's historical character PK remains untouched.
do $patch$
declare
 v_target regprocedure:=to_regprocedure('public.party_social_state_before_weekly_tiers_v1()');
 v_def text;
 v_legacy text:='''characterId'',m.character_id';
 v_fixed text:='''characterId'',c.id';
begin
 if v_target is null then v_target:='public.party_social_state_v16()'::regprocedure;end if;
 v_def:=pg_get_functiondef(v_target);
 if length(v_def)-length(replace(v_def,v_legacy,''))=length(v_legacy) then
   execute replace(v_def,v_legacy,v_fixed);
 elsif position(v_fixed in v_def)=0 then
   raise exception 'party_active_character_id_projection_definition_drift';
 end if;
end
$patch$;
