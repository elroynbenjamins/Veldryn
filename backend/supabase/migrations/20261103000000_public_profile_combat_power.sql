-- The Edge service is the only caller. It receives a state snapshot only after
-- this function applies the public-profile privacy rules, then returns a
-- derived score (never the snapshot) to the player.
begin;

create or replace function public.online_public_profile_state_server_v1(p_viewer_account_id uuid,p_target_account_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_ext public.player_profile_extensions%rowtype;v_profile public.player_profiles%rowtype;v_game jsonb;v_selected uuid;v_allowed boolean:=false;
begin
 if p_viewer_account_id is null or p_target_account_id is null then raise exception 'invalid_profile_target';end if;
 if exists(select 1 from public.player_blocks where (blocker_id=p_viewer_account_id and blocked_id=p_target_account_id) or (blocker_id=p_target_account_id and blocked_id=p_viewer_account_id)) then return null;end if;
 select * into v_ext from public.player_profile_extensions where account_id=p_target_account_id;
 if not found then v_ext.account_id:=p_target_account_id;v_ext.visibility:='public';end if;
 v_allowed:=p_viewer_account_id=p_target_account_id or v_ext.visibility='public';
 if not v_allowed and v_ext.visibility='guild' then v_allowed:=exists(select 1 from public.guild_members me join public.guild_members them on them.guild_id=me.guild_id where me.account_id=p_viewer_account_id and them.account_id=p_target_account_id);end if;
 if not v_allowed then return null;end if;
 select * into v_profile from public.player_profiles where account_id=p_target_account_id;
 select state into v_game from public.online_game_states where account_id=p_target_account_id;
 if v_game is null then return null;end if;
 v_selected:=coalesce(v_ext.selected_character_id,v_profile.active_character_id,(v_game#>>'{character,id}')::uuid);
 return jsonb_build_object('state',v_game,'selectedCharacterId',v_selected);
end $$;

revoke all on function public.online_public_profile_state_server_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.online_public_profile_state_server_v1(uuid,uuid) to service_role;
commit;
