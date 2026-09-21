-- Run with `supabase db query --linked --file supabase/tests/party_v16.sql`.
-- Every fixture and mutation is rolled back. Never reset the linked database.
begin;
create or replace function pg_temp.assert_v16(value boolean,message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'V16 FAIL: %',message; end if; end $$;
do $$
declare
 a uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 c uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 p uuid; p2 uuid; contract uuid; event_instance uuid; post public.recruitment_posts; g uuid:=gen_random_uuid();
 reward uuid; x jsonb; before_points integer; before_gold bigint; i integer; o record; v_expected integer;
begin
 for i in 1..5 loop
  insert into auth.users(id,email) values(a[i],'v16-'||a[i]||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id) values(c[i],a[i],'V16 Test '||i,'WAYFINDER');
 end loop;
 perform set_config('request.jwt.claim.sub',a[1]::text,true);
 set local role authenticated;
 p:=public.create_persistent_party_v16(c[1],'damage','mixed','v16-create-00001');
 perform pg_temp.assert_v16(p=public.create_persistent_party_v16(c[1],'damage','mixed','v16-create-00001'),'create replay');
 for i in 2..4 loop
  perform set_config('request.jwt.claim.sub',a[i]::text,true);
  perform public.join_persistent_party_v16(p,c[i],'damage','v16-join-0000'||i);
  perform pg_temp.assert_v16(p=public.join_persistent_party_v16(p,c[i],'damage','v16-join-0000'||i),'join replay');
 end loop;
 perform pg_temp.assert_v16((select count(*)=4 from public.party_members where party_id=p and left_at is null),'four unrestricted roles');
 perform set_config('request.jwt.claim.sub',a[5]::text,true);
 begin perform public.join_persistent_party_v16(p,c[5],'tank','v16-fifth-00001');raise exception 'V16 fifth accepted';exception when others then if sqlerrm<>'party_full' then raise; end if;end;
 perform pg_temp.assert_v16((select count(*)=0 from public.parties where id=p),'outsider Party RLS');
 begin perform public.send_persistent_party_chat_v16(p,'Intruder','v16-chat-000000');raise exception 'V16 outsider chat accepted';exception when others then if sqlerrm<>'not_party_member' then raise; end if;end;
 perform pg_temp.assert_v16(not has_function_privilege('authenticated','public.record_party_contract_contribution_v16(uuid,uuid,text,numeric,text)','execute'),'contribution service only');
 perform pg_temp.assert_v16(not has_function_privilege('anon','public.create_persistent_party_v16(uuid,text,text,text)','execute'),'anonymous create denied');
 perform pg_temp.assert_v16(not has_function_privilege('authenticated','public.settle_party_activity_v16(uuid,text,numeric,text,timestamptz)','execute'),'settlement service only');
 begin insert into public.party_contract_progress_v16(instance_id,objective_id) values(gen_random_uuid(),'forged');raise exception 'V16 forged score accepted';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',a[1]::text,true);
 x:=public.party_social_state_v16();
 perform pg_temp.assert_v16(jsonb_array_length(x->'contracts')>=3,'weekly assignments available');
 perform public.send_persistent_party_chat_v16(p,'Hello Party','v16-chat-000001');
 perform pg_temp.assert_v16((select count(*)=1 from public.chat_messages where channel_type='party' and channel_id=p::text),'member reads Party Chat');
 perform public.send_persistent_party_chat_v16(p,'Hello Party','v16-chat-000001');
 perform pg_temp.assert_v16((select count(*)=1 from public.chat_messages where channel_type='party' and channel_id=p::text),'chat replay');
 select id into contract from public.party_contract_instances_v16 where party_id=p and definition_id='party_weekly_combat_v1';
 reset role;
 -- Co-op epoch IDs must never be parsed as UUIDs by the persistent-party chat policy.
 insert into public.chat_messages(account_id,channel_type,channel_id,sender_name,body) values(a[1],'party',gen_random_uuid()||':1','V16','Epoch check');
 set local role authenticated;
 perform count(*) from public.chat_messages;
 reset role;
 set local role service_role;
 x:=public.record_party_contract_contribution_v16(contract,a[1],'standard_hunts',10,'v16-contribute-00001');
 perform pg_temp.assert_v16((x->>'normalized_points')::integer=55,'canonical expected effort score');
  x:=public.record_party_contract_contribution_v16(contract,a[1],'standard_hunts',10,'v16-contribute-00001');
  perform pg_temp.assert_v16((x->>'replayed')::boolean,'contribution replay');
  begin perform public.record_party_contract_contribution_v16(contract,a[2],'elite_hunts',1,'v16-contribute-00001');raise exception 'V16 conflicting replay accepted';exception when others then if sqlerrm<>'contribution_idempotency_conflict' then raise;end if;end;
  perform public.record_party_contract_contribution_v16(contract,a[4],'standard_hunts',1,'v16-below-minimum-0001');
 for o in select * from public.party_contract_objectives_v16 where definition_id='party_weekly_combat_v1' loop
  perform public.record_party_contract_contribution_v16(contract,a[1],o.objective_id,99999,'v16-complete-'||o.objective_id);
 end loop;
 reset role;
 perform pg_temp.assert_v16((select status='completed' from public.party_contract_instances_v16 where id=contract),'collective completion');
 perform pg_temp.assert_v16((select sum(normalized_points)=1742 from public.party_contract_progress_v16 where instance_id=contract),'capped score');
 perform pg_temp.assert_v16((select count(*)=1 from public.party_contract_reward_entitlements_v16 where instance_id=contract),'zero and below-minimum contribution anti-leech');
 select id into reward from public.party_contract_reward_entitlements_v16 where instance_id=contract and account_id=a[1];
 set local role authenticated;
 x:=public.claim_party_contract_reward_v16(reward,c[1]);
 perform pg_temp.assert_v16(not (x->>'replayed')::boolean,'first reward paid');
 x:=public.claim_party_contract_reward_v16(reward,c[1]);
 perform pg_temp.assert_v16((x->>'replayed')::boolean,'reward replay');
 reset role;
 perform pg_temp.assert_v16((select gold=100 from public.character_wallets where character_id=c[1]),'exactly one wallet payment');
 -- Real crafting receipts reach the Contract scoring path, without client-reported points.
 insert into public.craft_receipts(character_id,idempotency_key,recipe_id,quantity) values(c[2],'v16-craft-receipt','SMELT_COPPER_INGOT',1);
 perform pg_temp.assert_v16((select count(*)>0 from public.party_contract_member_progress_v16 where account_id=a[2] and normalized_points>0),'craft receipt integration');
 -- Legacy direct gathering RPCs are client-denied; trusted verified settlement still feeds Contracts exactly once.
 perform set_config('request.jwt.claim.sub',a[2]::text,true);
 update public.party_members set joined_at=now()-interval '1 hour' where character_id=c[2] and left_at is null;
 set local role authenticated;
 begin perform public.start_gathering_activity(c[2],'COPPER_VEIN');raise exception 'legacy gathering start allowed';exception when insufficient_privilege then null;end;
 begin perform public.claim_gathering_activity(c[2],'v16-real-gathering-0001');raise exception 'legacy gathering claim allowed';exception when insufficient_privilege then null;end;
 reset role;
 select coalesce(sum(normalized_points),0) into before_points from public.party_contract_member_progress_v16 where account_id=a[2];
 set local role service_role;
 perform pg_temp.assert_v16(public.settle_party_activity_v16(c[2],'verified_weighted_gather_actions',10,'v16-real-gathering-0001',now())>0,'verified gathering settlement');
 reset role;
 perform pg_temp.assert_v16((select coalesce(sum(normalized_points),0)>before_points from public.party_contract_member_progress_v16 where account_id=a[2]),'verified gathering reaches Contracts');
 select coalesce(sum(normalized_points),0) into before_points from public.party_contract_member_progress_v16 where account_id=a[2];
 set local role service_role;
 perform public.settle_party_activity_v16(c[2],'verified_weighted_gather_actions',10,'v16-real-gathering-0001',now());
 reset role;
 perform pg_temp.assert_v16((select coalesce(sum(normalized_points),0)=before_points from public.party_contract_member_progress_v16 where account_id=a[2]),'verified gathering replay cannot score twice');
 perform pg_temp.assert_v16((select count(*)>0 from public.party_contract_contributions_v16 where account_id=a[2] and objective_id in ('mixed_gather','gather_materials')),'verified gathering reaches Contract contribution feed');
 -- Guildless seeker, expiry, search, and cross-owner Guild officer cooldown.
 perform set_config('request.jwt.claim.sub',a[5]::text,true);
 set local role authenticated;
 post:=public.publish_recruitment_post_v16(p_post_type=>'looking_for_guild',p_title=>'V16 Social Seekers',p_body=>'weekend fishing',p_focus=>'skilling',p_availability_tags=>array['weekends'],p_guild_interest_tags=>array['social'],p_language=>'EN',p_region=>'EU');
 perform pg_temp.assert_v16(post.expires_at=post.refreshed_at+interval '3 days','Guild default duration');
 x:=public.browse_recruitment_v16('{"query":"V16 Social Seekers","focuses":["skilling"],"availabilityTags":["weekends"],"guildInterestTags":["social"],"language":"en","region":"eu"}');
 perform pg_temp.assert_v16(jsonb_array_length(x)=1,'combined server filters');
 perform public.close_recruitment_post_v16(post.id);
 begin perform public.publish_recruitment_post_v16('looking_for_guild','V16 Spam','');raise exception 'V16 repost accepted';exception when others then if sqlerrm<>'recruitment_refresh_cooldown' then raise; end if;end;
 reset role;
 update public.recruitment_posts set refreshed_at=now()-interval '7 hours',expires_at=now()+interval '65 hours' where id=post.id;
 set local role authenticated;
 post:=public.publish_recruitment_post_v16('looking_for_guild','V16 Fresh seeker','');
 reset role;
 update public.recruitment_posts set refreshed_at=now()-interval '4 days',expires_at=now()-interval '1 day' where id=post.id;
 set local role authenticated;
 x:=public.browse_recruitment_v16('{"query":"V16 Fresh seeker"}');
 perform pg_temp.assert_v16(jsonb_array_length(x)=0,'expiry before cleanup');
 post:=public.refresh_recruitment_post(post.id,1);
 perform pg_temp.assert_v16(post.expires_at=post.refreshed_at+interval '1 day','refresh window');
 reset role;
 insert into public.guilds(id,name,owner_account_id) values(g,'V16-'||g,a[1]);
 insert into public.guild_members(guild_id,account_id,role) values(g,a[1],'leader'),(g,a[2],'officer'),(g,a[5],'member');
 perform pg_temp.assert_v16((select status='closed' from public.recruitment_posts where id=post.id),'seeker closes on joining Guild');
 set local role authenticated;
 begin perform public.publish_recruitment_post_v16('looking_for_guild','V16 Ineligible seeker','');raise exception 'V16 Guild member seeker accepted';exception when others then if sqlerrm not in ('already_in_guild','recruitment_refresh_cooldown') then raise; end if;end;
 perform set_config('request.jwt.claim.sub',a[1]::text,true);
 post:=public.publish_recruitment_post_v16(p_post_type=>'guild_recruiting',p_title=>'V16 Guild recruiting',p_guild_id=>g);
 perform set_config('request.jwt.claim.sub',a[2]::text,true);
 begin perform public.publish_recruitment_post_v16(p_post_type=>'guild_recruiting',p_title=>'V16 Officer spam',p_guild_id=>g);raise exception 'V16 officer bump accepted';exception when others then if sqlerrm<>'recruitment_refresh_cooldown' then raise; end if;end;
 perform set_config('request.jwt.claim.sub',a[1]::text,true);
 post:=public.publish_recruitment_post_v16(p_post_type=>'party_recruiting',p_title=>'V16 Full party',p_party_id=>p,p_open_spots=>3);
 perform pg_temp.assert_v16(post.open_spots=0,'open spots server derived');
 x:=public.browse_recruitment_v16('{"query":"V16 Full party","requireOpenPartySpot":true}');
 perform pg_temp.assert_v16(jsonb_array_length(x)=0,'full Party filtered');
 perform public.leave_persistent_party_v16(p,'v16-leave-00001');
 perform public.leave_persistent_party_v16(p,'v16-leave-00001');
 perform pg_temp.assert_v16((public.party_social_state_v16()->'party')='null'::jsonb,'chat gate after leave');
 perform pg_temp.assert_v16((select count(*)=0 from public.chat_messages where channel_type='party' and channel_id=p::text),'chat RLS revoked on leave');
 reset role;
 perform pg_temp.assert_v16((select leader_account_id<>a[1] and status='active' from public.parties where id=p),'leadership transfer');
 -- Ranked mini-events are optional/deprioritized. Validate ranking only when one is currently seeded.
 select id into event_instance from public.party_contract_instances_v16 where party_id=p and cadence='mini_event' limit 1;
 if event_instance is not null then
  set local role service_role;
  perform public.record_party_contract_contribution_v16(event_instance,a[3],'rush_elites',1,'v16-ranked-00001');
  reset role;
  perform pg_temp.assert_v16((select normalized_points>0 from public.party_rankings_v16 where party_id=p),'ranked scoring');
  set local role authenticated;
  perform set_config('request.jwt.claim.sub',a[3]::text,true);
  x:=public.party_rankings_board_v16();
  perform pg_temp.assert_v16(jsonb_array_length(x)>0,'ranking projection');
  reset role;
 end if;
 -- Same account / weekly definition cannot pay again after changing Party.
 perform set_config('request.jwt.claim.sub',a[1]::text,true);
 set local role authenticated;
 p2:=public.create_persistent_party_v16(c[1],'tank','combat','v16-create-second-party');
 perform public.party_social_state_v16();
 reset role;
 select id into contract from public.party_contract_instances_v16 where party_id=p2 and definition_id='party_weekly_combat_v1';
 set local role service_role;
 for o in select * from public.party_contract_objectives_v16 where definition_id='party_weekly_combat_v1' loop
  perform public.record_party_contract_contribution_v16(contract,a[1],o.objective_id,99999,'v16-hop-'||o.objective_id);
 end loop;
 reset role;
 select id into reward from public.party_contract_reward_entitlements_v16 where instance_id=contract and account_id=a[1];
 set local role authenticated;
 begin perform public.claim_party_contract_reward_v16(reward,c[1]);raise exception 'V16 second scope payout accepted';exception when others then if sqlerrm<>'contract_scope_reward_already_claimed' then raise;end if;end;
 perform public.leave_persistent_party_v16(p2,'v16-disband-second-party');
 perform pg_temp.assert_v16((public.party_social_state_v16()->'party')='null'::jsonb,'last member disbands Party');
 reset role;
 perform pg_temp.assert_v16((select gold=100 from public.character_wallets where character_id=c[1]),'Party hopping cannot double pay');
 set local role service_role;
 begin perform public.create_party_contract_instance_v16('v16-invalid-week',p,'party_weekly_mixed_v1',1,'made-up',now(),now()+interval '7 days');raise exception 'V16 arbitrary week accepted';exception when others then if sqlerrm<>'invalid_weekly_scope' then raise;end if;end;
 begin perform public.create_party_contract_instance_v16('v16-invalid-event',p,'party_event_frontier_rush_v1',1,'made-up',now(),now()+interval '7 days');raise exception 'V16 arbitrary event accepted';exception when others then if sqlerrm<>'invalid_ranked_scope' then raise;end if;end;
 reset role;
 -- Check every seeded objective matches the expected-effort formula.
 for o in select * from public.party_contract_objectives_v16 loop
  v_expected:=greatest(1,round((o.target_units*o.expected_seconds_per_unit/60+o.setup_minutes+o.target_units*o.preparation_minutes_per_unit)*10*
    case o.difficulty when 'routine' then 0.9 when 'standard' then 1 when 'hard' then 1.2 when 'elite' then 1.45 when 'boss' then 1.75 end));
  perform pg_temp.assert_v16(o.point_budget=v_expected,'objective budget parity: '||o.objective_id);
 end loop;
end $$;
select 'PASS: v16 membership, RLS/RPC, chat, contribution, reward, crafting, recruitment, Guild seeker and ranking integration' as result;
rollback;
