begin;
do $$
declare accounts uuid[]:='{}';tickets uuid[]:='{}';a uuid;c uuid;t uuid;s jsonb;frozen jsonb:='[]';roster jsonb;check_id uuid:=gen_random_uuid();replacement_id uuid:=gen_random_uuid();timeout_id uuid:=gen_random_uuid();r jsonb;first_result jsonb;i integer;v_role text;
begin
 for i in 1..5 loop
  a:=gen_random_uuid();c:=gen_random_uuid();t:=gen_random_uuid();accounts:=array_append(accounts,a);tickets:=array_append(tickets,t);
  v_role:=case when i=1 then 'tank' when i in (2,3) then 'damage' else 'support' end;
  insert into auth.users(id,email) values(a,'live-ready-'||a||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id,level) values(c,a,'Ready Test',case when i=1 then 'IRONWARDEN' when i=2 then 'WAYFINDER' when i=3 then 'RAVAGER' when i=4 then 'DAWNKEEPER' else 'STONECALLER' end,25);
  insert into public.online_game_states(account_id,character_id,state,revision) values(a,c,jsonb_build_object('character',jsonb_build_object('id',c,'classId',case when i=1 then 'IRONWARDEN' when i=2 then 'WAYFINDER' when i=3 then 'RAVAGER' when i=4 then 'DAWNKEEPER' else 'STONECALLER' end)),1);
  s:=jsonb_build_object('accountId',a,'characterId',c,'loadoutId','current','revision',1,'snapshotHash',repeat('a',64),'readiness',jsonb_build_object('role',v_role,'ready',true,'normalizedScore',1));
  perform public.join_online_live_queue_server_v1(a,1,'ready-queue-01',repeat('b',64),t,'EXP_001',1::smallint,'online-coop-loadout-v1',s);
  if i<>4 then frozen:=frozen||jsonb_build_array(s);end if;
 end loop;
 perform public.open_online_live_ready_server_v1(accounts[1],tickets[1:4],check_id);
 if (select count(*) from public.coop_ready_checks where id=check_id and status='open')<>1 then raise exception 'missing ready check';end if;
 begin perform public.online_live_ready_state_server_v1(accounts[5],check_id);raise exception 'outsider read ready roster';exception when raise_exception then if sqlerrm<>'not_ready_member' then raise;end if;end;
 for i in 1..3 loop perform public.respond_online_live_ready_server_v1(accounts[i],check_id,1,true,'accept-first-01','[1,true]');end loop;
 r:=public.respond_online_live_ready_server_v1(accounts[4],check_id,1,false,'decline-first-01','[1,false]');
 if r->>'status'<>'refilling' or exists(select 1 from public.coop_account_reservations where account_id=accounts[4]) then raise exception 'decline did not retain/release correctly';end if;
 r:=public.online_live_candidates_server_v1(accounts[5]);
 if jsonb_array_length(r->'requiredTicketIds')<>4 or r->>'refillId'<>check_id::text then raise exception 'replacement cannot discover retained roster';end if;
 perform public.open_online_live_ready_server_v1(accounts[5],array[tickets[1],tickets[2],tickets[3],tickets[5]],replacement_id,check_id);
 if (select roster_revision from public.coop_ready_checks where id=replacement_id)<>2 or exists(select 1 from public.coop_ready_responses where ready_check_id=replacement_id) then raise exception 'replacement reused consent';end if;
 if exists(select 1 from public.matchmaking_tickets t join jsonb_array_elements((select roster_json from public.coop_ready_checks where id=replacement_id)) x on x->>'ticketId'=t.id::text where (x->>'originalEnqueuedAtMs')::numeric<>floor(extract(epoch from t.created_at)*1000)) then raise exception 'lost original queue priority';end if;
 begin perform public.respond_online_live_ready_server_v1(accounts[1],replacement_id,1,true,'stale-accept-01','[1,true]',frozen);raise exception 'stale roster accepted';exception when raise_exception then if sqlerrm<>'stale_ready_roster' then raise;end if;end;
 for i in 1..3 loop perform public.respond_online_live_ready_server_v1(accounts[i],replacement_id,2,true,'accept-new-01','[2,true]',frozen);end loop;
 first_result:=public.respond_online_live_ready_server_v1(accounts[5],replacement_id,2,true,'accept-new-01','[2,true]',frozen);
 if first_result->>'status'<>'committed' or (select frozen_roster_json from public.coop_ready_checks where id=replacement_id) is distinct from frozen then raise exception 'accepted roster not frozen';end if;
 if first_result is distinct from public.respond_online_live_ready_server_v1(accounts[5],replacement_id,2,true,'accept-new-01','[2,true]',null) then raise exception 'committed retry changed response';end if;
 begin perform public.respond_online_live_ready_server_v1(accounts[5],replacement_id,2,false,'accept-new-01','[2,false]');raise exception 'conflicting response accepted';exception when raise_exception then if sqlerrm<>'idempotency_key_conflict' then raise;end if;end;
 -- Fixture-only reset to exercise the offline deadline worker independently.
 update public.matchmaking_tickets set status='queued',reservation_id=null,reservation_expires_at=null,heartbeat_expires_at=clock_timestamp()+interval '30 seconds' where id=any(array[tickets[1],tickets[2],tickets[3],tickets[5]]);
 update public.coop_account_reservations set reservation_kind='queue',expires_at=clock_timestamp()+interval '30 seconds' where account_id=any(accounts);
 perform public.open_online_live_ready_server_v1(accounts[1],array[tickets[1],tickets[2],tickets[3],tickets[5]],timeout_id);
 perform public.respond_online_live_ready_server_v1(accounts[1],timeout_id,1,true,'timeout-accept-01','[1,true]');
 update public.coop_ready_checks set closes_at=clock_timestamp()-interval '1 second' where id=timeout_id;
 perform public.expire_online_live_ready_server_v1();
 if (select status from public.coop_ready_checks where id=timeout_id)<>'refilling' or (select count(*) from public.coop_account_reservations where account_id=any(accounts))<>1 then raise exception 'timeout did not retain only accepted player';end if;
 update public.coop_ready_checks set refill_started_at=clock_timestamp()-interval '61 seconds' where id=timeout_id;
 perform public.expire_online_live_ready_server_v1();
 if (select status from public.matchmaking_tickets where id=tickets[1])<>'queued' then raise exception 'refill expiry did not requeue';end if;
 perform set_config('request.jwt.claim.sub',accounts[1]::text,true);set local role authenticated;
 begin perform public.online_live_ready_sources_server_v1(accounts[1],check_id);raise exception 'client read private equipment';exception when insufficient_privilege then null;end;
 begin perform public.respond_online_live_ready_server_v1(accounts[1],check_id,1,true,'bypass-edge-01','[1,true]');raise exception 'client bypassed edge';exception when insufficient_privilege then null;end;
 reset role;
end $$;
select 'PASS: ready ownership, decline, retained priority, multi-slot refill, fresh consent, immutable freeze, receipts/conflicts, offline timeout/refill expiry and service-only RPCs' as result;
rollback;
