-- Social surfaces must use the account's chosen name, while preserving the
-- active character name, role, and class for gameplay and party composition.
do $patch$
declare
 v_def text;
 v_old text:=$txt$'characterName',c.name$txt$;
 v_new text:=$txt$'socialName',coalesce(nullif(active_profile.display_name,''),c.name),'characterName',c.name$txt$;
 v_roster_old text:=$txt$coalesce(nullif(c.name,''),nullif(profile.display_name,''),'Adventurer')$txt$;
 v_roster_new text:=$txt$coalesce(nullif(profile.display_name,''),nullif(c.name,''),'Adventurer')$txt$;
begin
 if to_regprocedure('public.party_social_state_v16()') is null
 then raise exception 'party_social_state_v16_missing';end if;
 v_def:=pg_get_functiondef('public.party_social_state_v16()'::regprocedure);
 if position(v_new in v_def)=0 then
  if position(v_old in v_def)=0 then raise exception 'party_social_identity_contract_drift';end if;
  execute replace(v_def,v_old,v_new);
 end if;
 if to_regprocedure('public.online_player_roster_v1()') is null
 then raise exception 'online_player_roster_v1_missing';end if;
 v_def:=pg_get_functiondef('public.online_player_roster_v1()'::regprocedure);
 if position(v_roster_new in v_def)=0 then
  if position(v_roster_old in v_def)=0 then raise exception 'online_player_identity_contract_drift';end if;
  execute replace(v_def,v_roster_old,v_roster_new);
 end if;
end $patch$;
