-- Expose server-classified Live presence to the trusted runtime so combat can
-- substitute bounded safety-AI behavior for disconnected human slots.
begin;

create or replace function public.touch_online_live_run_server_v1(p_run_id uuid,p_account_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_now timestamptz:=clock_timestamp();v_epoch integer;v_connected integer;v_safety integer;v_active integer;v_safety_characters jsonb;
begin
 select channel_epoch into v_epoch from public.coop_run_access_memberships a join public.expedition_runs r on r.id=a.run_id
 where a.run_id=p_run_id and a.account_id=p_account_id and a.active and r.coop_mode='live';
 if v_epoch is null then raise exception 'not_participant';end if;
 update public.coop_run_access_memberships set last_seen_at=v_now,presence_status='connected',safety_ai_started_at=null where run_id=p_run_id and account_id=p_account_id and active;
 select count(*) filter(where presence_status='connected'),count(*) filter(where presence_status='safety_ai'),count(*) into v_connected,v_safety,v_active
 from public.coop_run_access_memberships where run_id=p_run_id and active;
 select coalesce(jsonb_agg(m.character_id), '[]'::jsonb) into v_safety_characters
 from public.expedition_run_members m join public.coop_run_access_memberships a on a.run_id=m.run_id and a.account_id=m.account_id
 where m.run_id=p_run_id and a.active and a.presence_status='safety_ai';
 return jsonb_build_object('runId',p_run_id,'channelEpoch',v_epoch,'serverNow',floor(extract(epoch from v_now)*1000),'connectedCount',v_connected,'safetyAiCount',v_safety,'activeCount',v_active,'safetyAiCharacterIds',v_safety_characters);
end; $$;

revoke all on function public.touch_online_live_run_server_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.touch_online_live_run_server_v1(uuid,uuid) to service_role;
commit;
