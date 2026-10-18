-- Enforce ownership of non-starter emote tokens on the same chat-message
-- insert path used by World, Guild, and Party. No client-side unlock claim is
-- trusted; the online account save is authoritative.
-- Existing starter portraits remain free and the two-emote message cap remains.
create or replace function public.enforce_chat_guild_emote_ownership_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_count integer;v_owned jsonb;v_id text;
begin
 select count(*)::integer into v_count
 from regexp_matches(coalesce(new.body,''),':[a-z0-9_]+:','g');
 if v_count>2 then raise exception 'CHAT_EMOTE_LIMIT';end if;

 select coalesce(s.state#>'{account,unlockedEmoteIds}','[]'::jsonb)
 into v_owned from public.online_game_states s where s.account_id=new.account_id;
 if v_owned is null or jsonb_typeof(v_owned)<>'array' then v_owned:='[]'::jsonb;end if;

 for v_id in select m.value[1]
  from regexp_matches(coalesce(new.body,''),':([a-z0-9_]+):','g') as m(value)
 loop
  if v_id ~ '^(male|female)_0[1-5]$' then continue;end if;
  -- These are the only other currently authored emote art families.
  -- Unknown colon-marked words are ordinary text, never a free emote.
  if v_id ~ '^(male|female)_[0-9]{2}$'
    or v_id ~ '^pet_set_[ab]_[0-9]{2}$' then
   if not (v_owned ? v_id) then raise exception 'CHAT_EMOTE_LOCKED';end if;
  end if;
 end loop;
 return new;
end $$;
revoke all on function public.enforce_chat_guild_emote_ownership_v1()
 from public,anon,authenticated;
drop trigger if exists chat_emote_limit_v1 on public.chat_messages;
drop trigger if exists chat_emote_entitlements_v1 on public.chat_messages;
create trigger chat_emote_entitlements_v1 before insert or update of body
 on public.chat_messages
 for each row execute function public.enforce_chat_guild_emote_ownership_v1();
