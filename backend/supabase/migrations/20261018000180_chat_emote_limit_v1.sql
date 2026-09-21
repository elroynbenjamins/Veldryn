-- VELDRYN — enforce the production chat emote policy at the shared message table.
-- All World, Guild and Party send paths write to public.chat_messages.
begin;

create or replace function public.enforce_chat_emote_limit_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
 v_emote_count integer:=0;
begin
 select count(*)::integer
 into v_emote_count
 from regexp_matches(coalesce(new.body,''), ':[a-z0-9_]+:', 'g');

 if v_emote_count>2 then
  raise exception 'CHAT_EMOTE_LIMIT';
 end if;

 return new;
end
$$;

drop trigger if exists chat_emote_limit_v1 on public.chat_messages;
create trigger chat_emote_limit_v1
before insert or update of body on public.chat_messages
for each row execute function public.enforce_chat_emote_limit_v1();

revoke all on function public.enforce_chat_emote_limit_v1() from public,anon,authenticated;

comment on function public.enforce_chat_emote_limit_v1() is
'Shared server-side guard limiting World, Guild and Party chat messages to at most two emote shortcodes.';

commit;
