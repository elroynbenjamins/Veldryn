-- Social surfaces must use the account's chosen name, while preserving the
-- active character name, role, and class for gameplay and party composition.
do $patch$
declare
 v_def text;
 v_party_target regprocedure;
 v_old text:=$txt$'characterName',c.name$txt$;
 v_new text:=$txt$'socialName',coalesce(nullif(active_profile.display_name,''),c.name),'characterName',c.name$txt$;
 v_roster_old text:=$txt$coalesce(nullif(c.name,''),nullif(profile.display_name,''),'Adventurer')$txt$;
 v_roster_new text:=$txt$coalesce(nullif(profile.display_name,''),nullif(c.name,''),'Adventurer')$txt$;
begin
 -- Production wraps the original v16 roster in weekly-tier extensions. Patch the
 -- roster-producing function, not its wrapper, to preserve newer contract logic.
 -- Staging still serves the roster directly from party_social_state_v16().
 v_party_target:=to_regprocedure('public.party_social_state_before_weekly_tiers_v1()');
 if v_party_target is not null then
  v_def:=pg_get_functiondef(v_party_target);
  if position(v_old in v_def)=0 and position(v_new in v_def)=0 then
   v_party_target:=null;
  end if;
 end if;
 if v_party_target is null then
  v_party_target:=to_regprocedure('public.party_social_state_v16()');
 end if;
 if v_party_target is null then raise exception 'party_social_roster_source_missing';end if;
 v_def:=pg_get_functiondef(v_party_target);
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
