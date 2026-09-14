begin;
do $$
declare a uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 c uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];p uuid;r uuid:=gen_random_uuid();i integer;post public.recruitment_posts;x jsonb;instance uuid;
begin
 for i in 1..4 loop
  insert into auth.users(id,email) values(a[i],'v16-safety-'||a[i]||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id) values(c[i],a[i],'V16 Safety '||i,'IRONWARDEN');
 end loop;
 perform set_config('request.jwt.claim.sub',a[1]::text,true);
 p:=public.create_persistent_party_v16(c[1],'tank','mixed','safety-create-001');
 perform public.ensure_party_contracts_v16(p);
 post:=public.publish_recruitment_post_v16(p_post_type=>'party_recruiting',p_title=>'V16 safety advert',p_party_id=>p,p_open_spots=>3);
 insert into public.player_blocks(blocker_id,blocked_id) values(a[1],a[4]);
 perform set_config('request.jwt.claim.sub',a[4]::text,true);
 set local role authenticated;
 if jsonb_array_length(public.browse_recruitment_v16('{"query":"V16 safety advert"}'))<>0 then raise exception 'blocked advert visible';end if;
 if exists(select 1 from public.recruitment_posts where id=post.id) then raise exception 'blocked advert bypasses RLS';end if;
 begin perform public.join_persistent_party_v16(p,c[4],'support','safety-blocked-join');raise exception 'blocked join accepted';exception when others then if sqlerrm<>'PLAYER_UNAVAILABLE' then raise;end if;end;
 reset role;
 delete from public.player_blocks where blocker_id=a[1] and blocked_id=a[4];
 for i in 2..4 loop
  perform set_config('request.jwt.claim.sub',a[i]::text,true);
  perform public.join_persistent_party_v16(p,c[i],case i when 4 then 'support' else 'damage' end,'safety-join-00'||i);
 end loop;
 insert into public.expedition_runs(id,expedition_id,tier,content_version,seed_hash,created_by,coop_mode,phase,route_graph_json)
 values(r,'EXP_001',1,'v16-test','v16-test',a[1],'live','awaiting_choice','{"nodes":[{"nodeId":"elite-1","contentId":"ROOTBOUND_ELITE_01","depth":1,"kind":"elite"}]}');
 for i in 1..4 loop
  insert into public.expedition_run_members(run_id,character_id,account_id,role,synced_level,loadout_snapshot,stat_snapshot,member_kind,active_participant_account_id)
  values(r,c[i],a[i],case i when 1 then 'tank' when 4 then 'support' else 'damage' end,25,'{}','{}','human',a[i]);
  insert into public.coop_run_access_memberships(run_id,account_id,membership_kind,channel_epoch) values(r,a[i],'live_participant',1);
 end loop;
 insert into public.expedition_combat_summaries(run_id,node_index,encounter_id,engine_version,duration_ms,victory,reason,event_count,event_digest)
 values(r,1,'ROOTBOUND_ELITE_01','v16-test',10000,true,'victory',10,'v16-test');
 select id into instance from public.party_contract_instances_v16 where party_id=p and definition_id='party_weekly_combat_v1';
 if (select units from public.party_contract_progress_v16 where instance_id=instance and objective_id='elite_hunts')<>1 then raise exception 'shared kill counted per member';end if;
 if (select count(*) from public.party_contract_member_progress_v16 where instance_id=instance and normalized_points>0)<>4 then raise exception 'shared contribution not split';end if;
 insert into public.coop_node_results(run_id,node_id,fencing_generation,success,start_state_hash,result_json,end_state_json)
 values(r,'elite-1',1,true,'v16-test','{}','{}');
 if (select units from public.party_contract_progress_v16 where instance_id=instance and objective_id='elite_hunts')<>1 then raise exception 'combat receipt formats double counted';end if;
 insert into public.chat_messages(account_id,channel_type,channel_id,sender_name,body) values(a[1],'party',r||':1','V16','Live chat still works');
 perform set_config('request.jwt.claim.sub',a[1]::text,true);
 perform public.send_persistent_party_chat_v16(p,'Persistent chat safety','safety-chat-0001');
 perform set_config('request.jwt.claim.sub',a[2]::text,true);
 set local role authenticated;
 if (select count(*) from public.chat_messages where channel_id=r||':1')<>1 then raise exception 'live epoch chat lost';end if;
 reset role;
 insert into public.player_blocks(blocker_id,blocked_id) values(a[2],a[1]);
 set local role authenticated;
 if exists(select 1 from public.chat_messages where channel_id=p::text and account_id=a[1]) then raise exception 'blocked persistent chat visible';end if;
 reset role;
 update public.coop_run_access_memberships set channel_epoch=2 where run_id=r and account_id=a[2];
 set local role authenticated;
 if exists(select 1 from public.chat_messages where channel_id=r||':1') then raise exception 'old live epoch visible';end if;
 reset role;
end $$;
select 'PASS: v15 block integration, shared combat credit, duplicate combat receipt formats, Live chat epoch preservation' result;
rollback;
