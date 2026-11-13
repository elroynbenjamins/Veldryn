-- Social notification snapshot: one round trip for the 30-second badge poll.
--
-- Why: the mobile client refreshes its social badges every 30 seconds by calling
-- friend_request_list, social_invitation_state_v1 and social_chat_attention_state_v1
-- separately. In production each has ~35,000 calls and together they account for about
-- 1,460 s of database time (pg_stat_statements, 2026-09-06 to 2026-11-12). This function
-- returns the same three results in a single request.
--
-- Behaviour: this is a thin wrapper. It calls the existing functions unchanged, so
-- invitation expiry, block cancellation and first-view read-marker creation behave exactly
-- as they do today. No table, policy, index or existing function is modified, and the
-- three original RPCs stay in place for released clients.
--
-- Security: SECURITY INVOKER with an empty search_path. It grants no access the caller
-- does not already have; the inner functions keep their own SECURITY DEFINER checks.
--
-- Rollback: drop function public.social_notification_state_v1();

create or replace function public.social_notification_state_v1()
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $function$
declare
 v_incoming integer;
 v_invitations jsonb;
 v_chat jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required';end if;

 -- The client only badges incoming requests, so it needs the count rather than the rows.
 select count(*)::integer into v_incoming
 from public.friend_request_list() r
 where r.direction='incoming';

 -- The client already treats invitations and chat attention as independently optional:
 -- a failure in one must not hide the other badges. Each block keeps that isolation.
 begin
  v_invitations:=public.social_invitation_state_v1();
 exception when others then
  v_invitations:=null;
 end;

 begin
  v_chat:=public.social_chat_attention_state_v1();
 exception when others then
  v_chat:=null;
 end;

 return jsonb_build_object(
  'incomingFriendRequests',v_incoming,
  'invitations',v_invitations,
  'chat',v_chat,
  'serverTime',clock_timestamp()
 );
end
$function$;

revoke all on function public.social_notification_state_v1() from public;
revoke all on function public.social_notification_state_v1() from anon;
grant execute on function public.social_notification_state_v1() to authenticated;

comment on function public.social_notification_state_v1() is
 'One-request social badge snapshot: incoming friend-request count, invitation state and chat attention. Wraps the existing RPCs without changing their behaviour.';
