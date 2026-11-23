-- Chat history retains the sender name as a snapshot for compatibility with old
-- clients. New Social Name clients must instead render the current account name
-- across existing and new World/Guild/Party messages.
-- Only the authenticated public-facing name is exposed (not profile content).
create or replace function public.chat_sender_names_v1(p_account_ids uuid[])
returns table(account_id uuid, sender_name text)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
 v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if coalesce(cardinality(p_account_ids),0)>100 then raise exception 'TOO_MANY_IDENTITIES';end if;

 return query
 select pp.account_id,
  coalesce(nullif(btrim(pp.social_name),''),nullif(btrim(pp.display_name),''),'Adventurer') as sender_name
 from public.player_profiles pp
 where pp.account_id=any(p_account_ids)
   and not exists (
    select 1 from public.player_blocks b
    where (b.blocker_id=v_uid and b.blocked_id=pp.account_id)
       or (b.blocked_id=v_uid and b.blocker_id=pp.account_id)
   );
end
$function$;

revoke all on function public.chat_sender_names_v1(uuid[]) from public,anon;
grant execute on function public.chat_sender_names_v1(uuid[]) to authenticated;
