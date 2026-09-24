begin;

-- Bridge authoritative online gameplay contribution receipts into exact Guild Quest action counters.
-- Runs inside commit_online_game_server_v1/v2 after the command simulation has completed,
-- so cancelled/not-yet-completed queued actions never count.

create or replace function public.guild_quest_record_contributions_v1(
 p_account_id uuid,p_contributions jsonb,p_at timestamptz default clock_timestamp()
) returns void language plpgsql security definer set search_path=public as $$
declare e jsonb; kind text; content_id text; units integer; action_key text; skill_id text;
begin
 if p_contributions is null or jsonb_typeof(p_contributions)<>'array' then return; end if;
 for e in select value from jsonb_array_elements(p_contributions) loop
   kind:=e->>'kind'; content_id:=e->>'contentId'; units:=greatest(0,floor(coalesce((e->>'units')::numeric,0))::int);
   action_key:=null;
   if kind='gathering' then
     skill_id:=lower(coalesce(e->>'skillId',''));
     if skill_id in ('fishing','mining','woodcutting','herbalism') then action_key:=skill_id; end if;
   elsif kind='crafting' then
     skill_id:=lower(coalesce(e->>'skillId',''));
     if skill_id in ('smithing','cooking') then action_key:=skill_id; else action_key:='crafting'; end if;
   elsif kind='boss' or kind='combat' then action_key:='combat_kill';
   elsif kind='dungeon' then action_key:='dungeon_clear';
   end if;
   if action_key is not null and units>0 then perform public.guild_quest_record_action_v1(p_account_id,action_key,units,p_at); end if;
 end loop;
end $$;
revoke all on function public.guild_quest_record_contributions_v1(uuid,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.guild_quest_record_contributions_v1(uuid,jsonb,timestamptz) to service_role;

comment on function public.guild_quest_record_contributions_v1(uuid,jsonb,timestamptz) is
 'Service-only bridge from already-verified completed gameplay contribution receipts to exact Guild Quest action counters.';
commit;