-- Disposable test database only. All fixtures use random identities and roll back.
-- Run after chat_delivery_read_cursors through tools/test-chat-reliability-db.mjs
-- or as the migration owner in a fully migrated local Supabase test database.
begin;
set local statement_timeout='30s';

create function pg_temp.assert_chat(value boolean,message text)
returns void language plpgsql as $$
begin
 if value is distinct from true then raise exception 'CHAT FAIL: %',message;end if;
end
$$;
create function pg_temp.expect_chat_error(command text,expected text)
returns void language plpgsql as $$
begin
 begin
  execute command;
 exception when others then
  if sqlerrm=expected then return;end if;
  raise;
 end;
 raise exception 'CHAT FAIL: expected error %',expected;
end
$$;

do $test$
declare
 a uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 c uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 g uuid:=gen_random_uuid();g_other uuid:=gen_random_uuid();
 p uuid:=gen_random_uuid();p_other uuid:=gen_random_uuid();
 first_id uuid;second_id uuid;legacy_id uuid;
 low_id uuid;high_id uuid;later_id uuid:=gen_random_uuid();blocked_id uuid:=gen_random_uuid();own_id uuid:=gen_random_uuid();party_message_id uuid:=gen_random_uuid();
 absent_id uuid:=gen_random_uuid();wrong_channel_id uuid:=gen_random_uuid();race_id uuid:=gen_random_uuid();
 t timestamptz:=clock_timestamp()-interval '1 hour';
 original_marker public.chat_read_markers_v1%rowtype;
 current_marker public.chat_read_markers_v1%rowtype;
 x jsonb;history jsonb;first_response jsonb;
 reader_name text;server_sender_name text;
 key text:='chat-fixture-'||gen_random_uuid()::text;
 blocked_term text:='qatestblock'||replace(gen_random_uuid()::text,'-','');
 mask_term text:='qatestmask'||replace(gen_random_uuid()::text,'-','');
 n integer;i integer;signature text;
begin
 foreach signature in array array[
  'public.send_world_chat_v2(text,text,text,text)',
  'public.mark_social_chat_read_v2(text,text,uuid)',
  'public.mark_social_chat_read_v1(text)',
  'public.social_chat_attention_state_v1()'
 ] loop
  perform pg_temp.assert_chat(to_regprocedure(signature) is not null,'RPC exists: '||signature);
  perform pg_temp.assert_chat(not has_function_privilege('anon',signature,'EXECUTE'),'anon denied: '||signature);
  perform pg_temp.assert_chat(has_function_privilege('authenticated',signature,'EXECUTE'),'authenticated allowed: '||signature);
  perform pg_temp.assert_chat((select proconfig @> array['search_path=""'] from pg_proc where oid=to_regprocedure(signature)),'fixed search path: '||signature);
 end loop;
 perform pg_temp.assert_chat(not has_table_privilege('authenticated','public.server_action_receipts','INSERT'),'receipts remain server owned');
 perform pg_temp.assert_chat(not has_table_privilege('authenticated','public.server_action_receipts','SELECT'),'receipt fingerprints remain private');
 perform pg_temp.assert_chat(not has_table_privilege('authenticated','public.chat_read_markers_v1','UPDATE'),'read cursors remain server owned');
 perform pg_temp.assert_chat(not has_table_privilege('authenticated','public.chat_messages','INSERT'),'messages cannot bypass send validation');
 perform pg_temp.assert_chat((select relrowsecurity from pg_class where oid='public.chat_read_markers_v1'::regclass),'cursor RLS remains enabled');

 for i in 1..6 loop
  insert into auth.users(id,email) values(a[i],'chat-fixture-'||a[i]::text||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id,level)
  values(c[i],a[i],'Tst'||translate(left(replace(c[i]::text,'-',''),10),'0123456789','ghijklmnop'),'WAYFINDER',10);
  insert into public.player_profiles(account_id,display_name,active_character_id)
  values(a[i],'Tst'||translate(left(replace(a[i]::text,'-',''),10),'0123456789','ghijklmnop'),c[i])
  on conflict(account_id) do update set display_name=excluded.display_name,active_character_id=excluded.active_character_id;
 end loop;
 select display_name into server_sender_name from public.player_profiles where account_id=a[1];
 select display_name into reader_name from public.player_profiles where account_id=a[3];

 -- World: a retry survives response loss, burst throttling, later sanctions,
 -- moderation deletion and display-name changes without creating another row.
 perform set_config('request.jwt.claim.sub',a[1]::text,true);
 set local role authenticated;
 first_id:=public.send_world_chat_v2('world-1','  A reliable greeting  ','Spoofed Name',key);
 perform pg_temp.assert_chat(first_id=public.send_world_chat_v2('world-1','A reliable greeting','Different Hint',key),'same normalized request replays original UUID');
 reset role;
 perform pg_temp.assert_chat((select body='A reliable greeting' from public.chat_messages where id=first_id),'normalized World body saved');
 perform pg_temp.assert_chat((select cm.sender_name from public.chat_messages cm where cm.id=first_id)=server_sender_name,'World sender remains server authoritative');
 perform pg_temp.assert_chat((select count(*) from public.chat_messages where account_id=a[1])=1,'one World row after replay');
 perform pg_temp.assert_chat((select length(response->>'request_hash')=64 and not(response ? 'request_body') from public.server_action_receipts where account_id=a[1] and action='world_chat_v2' and idempotency_key=key),'receipt stores intent fingerprint without message plaintext');
 update public.player_profiles set display_name=server_sender_name||'x' where account_id=a[1];
 insert into public.chat_messages(account_id,channel_type,channel_id,sender_name,body)
 values(a[1],'world','world-1','Fixture','burst one'),(a[1],'world','world-1','Fixture','burst two');
 set local role authenticated;
 perform pg_temp.assert_chat(first_id=public.send_world_chat_v2('world-1','A reliable greeting','Ignored',key),'replay precedes burst cooldown');
 perform pg_temp.expect_chat_error(format('select public.send_world_chat_v2(%L,%L,%L,%L)','world-1','New message','Ignored',key||'-new'),'CHAT_COOLDOWN');
 perform pg_temp.expect_chat_error(format('select public.send_world_chat_v2(%L,%L,%L,%L)','world-1','Changed intent','Ignored',key),'idempotency_key_conflict');
 perform pg_temp.expect_chat_error(format('select public.send_world_chat_v2(%L,%L,%L,%L)','world-2','A reliable greeting','Ignored',key),'idempotency_key_conflict');
 perform pg_temp.expect_chat_error(format('select public.send_world_chat_v2(null,%L,%L,%L)','A reliable greeting','Ignored',key),'INVALID_WORLD_CHANNEL');
 perform pg_temp.expect_chat_error(format('select public.send_world_chat_v2(%L,null,%L,%L)','world-1','Ignored',key),'INVALID_MESSAGE_LENGTH');
 perform pg_temp.expect_chat_error(format('select public.send_world_chat_v2(%L,%L,%L,null)','world-1','Valid','Ignored'),'invalid_idempotency_key');
 perform pg_temp.expect_chat_error(format('select public.send_world_chat_v2(%L,%L,%L,%L)','world-1',repeat('a',301),'Ignored',key||'-long'),'INVALID_MESSAGE_LENGTH');
 reset role;
 insert into public.chat_account_sanctions(account_id,muted_until) values(a[1],clock_timestamp()+interval '1 hour');
 set local role authenticated;
 perform pg_temp.assert_chat(first_id=public.send_world_chat_v2('world-1','A reliable greeting','Ignored',key),'accepted retry survives subsequent mute');
 perform pg_temp.expect_chat_error(format('select public.send_world_chat_v2(%L,%L,%L,%L)','world-1','New message','Ignored',key||'-muted'),'CHAT_MUTED');
 reset role;
 delete from public.chat_messages where id=first_id;
 set local role authenticated;
 perform pg_temp.assert_chat(first_id=public.send_world_chat_v2('world-1','A reliable greeting','Ignored',key),'pruned accepted message does not get reposted');
 reset role;
 perform pg_temp.assert_chat(not exists(select 1 from public.chat_messages where id=first_id),'pruned row remains absent');
 perform pg_temp.assert_chat((select count(*) from public.server_action_receipts where account_id=a[1] and action='world_chat_v2')=1,'rejected sends consume no receipts');

 perform set_config('request.jwt.claim.sub',a[2]::text,true);
 set local role authenticated;
 second_id:=public.send_world_chat_v2('world-1','A reliable greeting','Ignored',key);
 perform pg_temp.assert_chat(second_id<>first_id,'identical key is independently scoped to another account');
 legacy_id:=public.send_world_chat('world-2','Old installed client','Ignored');
 reset role;
 perform pg_temp.assert_chat(exists(select 1 from public.chat_messages where id=legacy_id and account_id=a[2]),'old World RPC remains callable');
 update public.chat_messages set created_at=now()-interval '2 minutes' where account_id=a[2];
 insert into public.chat_filter_terms(term,normalized_term,severity,action)
 values(blocked_term,blocked_term,3,'block'),(mask_term,mask_term,2,'mask');
 set local role authenticated;
 perform pg_temp.expect_chat_error(format('select public.send_world_chat_v2(%L,%L,%L,%L)','world-1',blocked_term,'Ignored',key||'-blocked'),'MESSAGE_BLOCKED');
 perform pg_temp.expect_chat_error(format('select public.send_world_chat_v2(%L,%L,%L,%L)','world-1',':smile: :wave: :star:','Ignored',key||'-emotes'),'CHAT_EMOTE_LIMIT');
 legacy_id:=public.send_world_chat_v2('world-1',mask_term,'Ignored',key||'-masked');
 perform pg_temp.assert_chat(legacy_id=public.send_world_chat_v2('world-1',mask_term,'Ignored',key||'-masked'),'unmasked original request replays moderated result');
 reset role;
 perform pg_temp.assert_chat((select body from public.chat_messages where id=legacy_id)=repeat('•',char_length(mask_term)),'existing moderation still masks accepted body');
 insert into public.chat_messages(account_id,channel_type,channel_id,sender_name,body,created_at)
 select a[2],'world','world-1','Fixture','Minute limit fixture',now()-interval '20 seconds' from generate_series(1,14);
 set local role authenticated;
 perform pg_temp.assert_chat(legacy_id=public.send_world_chat_v2('world-1',mask_term,'Ignored',key||'-masked'),'accepted replay precedes minute rate limit');
 perform pg_temp.expect_chat_error(format('select public.send_world_chat_v2(%L,%L,%L,%L)','world-1','New beyond minute limit','Ignored',key||'-minute'),'CHAT_RATE_LIMIT');
 reset role;
 perform set_config('request.jwt.claim.sub','',true);
 set local role authenticated;
 perform pg_temp.expect_chat_error(format('select public.send_world_chat_v2(%L,%L,%L,%L)','world-1','Hello','Ignored',key),'AUTH_REQUIRED');
 perform pg_temp.expect_chat_error(format('select public.mark_social_chat_read_v2(%L,%L,%L)','guild',g::text,absent_id),'authentication_required');
 reset role;

 -- Guild/Party: an empty initial baseline must not eat the first arrival.
 insert into public.guilds(id,name,owner_account_id)
 values(g,'Tst'||translate(left(replace(g::text,'-',''),10),'0123456789','ghijklmnop'),a[3]),
       (g_other,'Tst'||translate(left(replace(g_other::text,'-',''),10),'0123456789','ghijklmnop'),a[6]);
 insert into public.guild_members(guild_id,account_id,role)
 values(g,a[3],'leader'),(g_other,a[6],'leader');
 insert into public.parties(id,leader_character_id,leader_account_id,status)
 values(p,c[3],a[3],'forming'),(p_other,c[6],a[6],'forming');
 insert into public.party_members(party_id,character_id,account_id,role)
 values(p,c[3],a[3],'tank'),(p_other,c[6],a[6],'damage');
 perform set_config('request.jwt.claim.sub',a[3]::text,true);
 set local role authenticated;
 x:=public.social_chat_attention_state_v1();
 perform pg_temp.assert_chat((x->>'totalUnread')::integer=0 and x#>>'{guild,lastReadAt}' is null,'empty initial channel has no fabricated last-read time');
 x:=public.mark_social_chat_read_v1('party');
 perform pg_temp.assert_chat(x->>'readAt' is null,'legacy empty channel does not advance clock');
 reset role;
 select least(gen1,gen2),greatest(gen1,gen2) into low_id,high_id
 from (select gen_random_uuid() gen1,gen_random_uuid() gen2) generated;
 insert into public.chat_messages(id,account_id,channel_type,channel_id,sender_name,body,created_at)
 values(low_id,a[4],'guild',g::text,'Fixture','Already displayed',t),
       (high_id,a[4],'guild',g::text,'Fixture','Hello @'||reader_name,t),
       (later_id,a[4],'guild',g::text,'Fixture','Arrived after history load',t+interval '1 second'),
       (blocked_id,a[5],'guild',g::text,'Fixture','Blocked @'||reader_name,t+interval '2 seconds'),
       (own_id,a[3],'guild',g::text,'Fixture','Own @'||reader_name,t+interval '3 seconds'),
       (party_message_id,a[4],'party',p::text,'Fixture','Party @'||reader_name,t),
       (wrong_channel_id,a[4],'guild',g_other::text,'Fixture','Different Guild',t);
 insert into public.player_blocks(blocker_id,blocked_id) values(a[3],a[5]);
 set local role authenticated;
 x:=public.social_chat_attention_state_v1();
 perform pg_temp.assert_chat((x#>>'{guild,unread}')::integer=3 and (x#>>'{guild,mentions}')::integer=1,'own and blocked messages excluded from unread/mentions');
 perform pg_temp.assert_chat((x#>>'{guild,firstUnreadMessageId}')::uuid=low_id,'oldest unread uses deterministic UUID tie order');
 history:=public.guild_chat_state_v1(25);
 perform pg_temp.assert_chat((history#>>'{messages,0,id}')::uuid=low_id and (history#>>'{messages,1,id}')::uuid=high_id,'read cursor and actual Guild history use the same tie ordering');
 perform pg_temp.assert_chat((x#>>'{party,unread}')::integer=1,'first Party arrival survives legacy empty ACK');
 first_response:=public.mark_social_chat_read_v2('guild',g::text,low_id);
 perform pg_temp.assert_chat((first_response->>'readAt')::timestamptz=t and (first_response->>'readMessageId')::uuid=low_id,'ACK uses stored displayed timestamp and ID');
 x:=public.social_chat_attention_state_v1();
 perform pg_temp.assert_chat((x#>>'{guild,unread}')::integer=2 and (x#>>'{guild,mentions}')::integer=1,'same-time higher UUID and later arrival remain unread');
 perform pg_temp.assert_chat((x#>>'{guild,firstUnreadMessageId}')::uuid=high_id,'first unread advances within timestamp ties');
 perform pg_temp.assert_chat(first_response=public.mark_social_chat_read_v2('guild',g::text,low_id),'same exact ACK is retry safe');
 x:=public.mark_social_chat_read_v2('guild',g::text,high_id);
 x:=public.mark_social_chat_read_v2('guild',g::text,low_id);
 perform pg_temp.assert_chat((x->>'readMessageId')::uuid=high_id,'older in-flight ACK cannot move confirmed cursor backwards');
 x:=public.social_chat_attention_state_v1();
 perform pg_temp.assert_chat((x#>>'{guild,unread}')::integer=1 and (x#>>'{guild,firstUnreadMessageId}')::uuid=later_id,'later distinct timestamp remains unread');
 perform pg_temp.expect_chat_error(format('select public.mark_social_chat_read_v2(%L,%L,%L)','guild',g::text,blocked_id),'chat_message_unavailable');
 perform pg_temp.expect_chat_error(format('select public.mark_social_chat_read_v2(%L,%L,%L)','guild',g::text,wrong_channel_id),'chat_message_unavailable');
 perform pg_temp.expect_chat_error(format('select public.mark_social_chat_read_v2(%L,%L,%L)','guild',g::text,absent_id),'chat_message_unavailable');
 perform pg_temp.expect_chat_error(format('select public.mark_social_chat_read_v2(%L,%L,null)','guild',g::text),'chat_message_unavailable');
 perform pg_temp.expect_chat_error(format('select public.mark_social_chat_read_v2(%L,%L,%L)','world','world-1',high_id),'invalid_chat_channel');
 perform pg_temp.expect_chat_error(format('select public.mark_social_chat_read_v2(null,%L,%L)',g::text,high_id),'invalid_chat_channel');
 perform pg_temp.expect_chat_error(format('select public.mark_social_chat_read_v2(%L,%L,%L)','guild',g_other::text,wrong_channel_id),'chat_channel_unavailable');
 reset role;
 select * into original_marker from public.chat_read_markers_v1 where account_id=a[3] and channel_type='guild' and channel_id=g::text;
 perform pg_temp.assert_chat(original_marker.last_read_message_id=high_id and original_marker.has_read_message,'rejected cursors do not change confirmed marker');
 delete from public.chat_messages where id=high_id;
 set local role authenticated;
 x:=public.mark_social_chat_read_v2('guild',g::text,high_id);
 perform pg_temp.assert_chat((x->>'readMessageId')::uuid=high_id,'pruned already acknowledged cursor safely replays');
 x:=public.social_chat_attention_state_v1();
 perform pg_temp.assert_chat((x#>>'{guild,unread}')::integer=1,'pruning acknowledged row preserves unread frontier');
 reset role;
 delete from public.chat_messages where id=low_id;
 set local role authenticated;
 perform pg_temp.expect_chat_error(format('select public.mark_social_chat_read_v2(%L,%L,%L)','guild',g::text,low_id),'chat_message_unavailable');
 reset role;
 select * into current_marker from public.chat_read_markers_v1 where account_id=a[3] and channel_type='guild' and channel_id=g::text;
 perform pg_temp.assert_chat(current_marker=original_marker,'pruned invalid/old cursor neither rewinds nor rewrites marker');

 -- First-view race: history was displayed, then attention initialized ahead of
 -- it. The first actual ACK must replace that unconfirmed baseline, not ignore it.
 delete from public.chat_read_markers_v1 where account_id=a[3] and channel_type='guild';
 set local role authenticated;
 x:=public.social_chat_attention_state_v1();
 perform pg_temp.assert_chat((x#>>'{guild,unread}')::integer=0,'first attention keeps historical messages quiet');
 x:=public.mark_social_chat_read_v2('guild',g::text,later_id);
 reset role;
 select * into current_marker from public.chat_read_markers_v1 where account_id=a[3] and channel_type='guild' and channel_id=g::text;
 perform pg_temp.assert_chat(current_marker.last_read_message_id=later_id and current_marker.has_read_message,'first displayed ACK supersedes a later automatic baseline');
 -- Use an incoming other-player row, not merely an own row, for the same race.
 delete from public.chat_read_markers_v1 where account_id=a[3] and channel_type='guild';
 insert into public.chat_messages(id,account_id,channel_type,channel_id,sender_name,body,created_at)
 values(race_id,a[4],'guild',g::text,'Fixture','New @'||reader_name,t+interval '4 seconds');
 set local role authenticated;
 x:=public.social_chat_attention_state_v1();
 x:=public.mark_social_chat_read_v2('guild',g::text,later_id);
 x:=public.social_chat_attention_state_v1();
 perform pg_temp.assert_chat((x#>>'{guild,unread}')::integer=1 and (x#>>'{guild,firstUnreadMessageId}')::uuid=race_id,'attention/history race leaves the intervening arrival unread');
 reset role;

 -- Existing clock-only markers are compatible until a first exact ACK safely
 -- establishes what was displayed; no migration backfill touches player rows.
 update public.chat_read_markers_v1 set last_read_at=clock_timestamp(),last_read_message_id=null,has_read_message=false
 where account_id=a[3] and channel_type='guild';
 set local role authenticated;
 x:=public.social_chat_attention_state_v1();
 perform pg_temp.assert_chat((x#>>'{guild,unread}')::integer=0,'legacy time-only marker preserves its pre-upgrade baseline');
 x:=public.mark_social_chat_read_v2('guild',g::text,later_id);
 x:=public.social_chat_attention_state_v1();
 perform pg_temp.assert_chat((x#>>'{guild,unread}')::integer=1,'first exact ACK replaces legacy clock-only baseline');
 x:=public.mark_social_chat_read_v1('guild');
 perform pg_temp.assert_chat((x->>'readMessageId')::uuid=race_id and (x->>'readAt')::timestamptz=t+interval '4 seconds','legacy read RPC is bounded by newest visible stored message');
 x:=public.mark_social_chat_read_v2('party',p::text,party_message_id);
 perform pg_temp.assert_chat((x->>'readMessageId')::uuid=party_message_id and (x->>'readAt')::timestamptz=t,'Party uses exact displayed cursor too');
 reset role;

 -- A retained request from before switching Guild/Party cannot affect either
 -- the old channel or the new one, including a previously accepted replay.
 delete from public.guild_members where guild_id=g and account_id=a[3];
 insert into public.guild_members(guild_id,account_id,role) values(g_other,a[3],'member');
 update public.party_members set left_at=clock_timestamp() where party_id=p and account_id=a[3];
 insert into public.party_members(party_id,character_id,account_id,role) values(p_other,c[3],a[3],'tank');
 select count(*) into n from public.chat_read_markers_v1 where account_id=a[3];
 set local role authenticated;
 perform pg_temp.expect_chat_error(format('select public.mark_social_chat_read_v2(%L,%L,%L)','guild',g::text,race_id),'chat_channel_unavailable');
 perform pg_temp.expect_chat_error(format('select public.mark_social_chat_read_v2(%L,%L,%L)','party',p::text,party_message_id),'chat_channel_unavailable');
 reset role;
 perform pg_temp.assert_chat((select count(*) from public.chat_read_markers_v1 where account_id=a[3])=n,'stale membership ACK creates no new channel marker');
 update public.parties set status='disbanded' where id=p_other;
 set local role authenticated;
 perform pg_temp.expect_chat_error(format('select public.mark_social_chat_read_v2(%L,%L,%L)','party',p_other::text,party_message_id),'chat_channel_unavailable');
 reset role;
 -- Reverse block direction is also hidden and cannot be acknowledged.
 insert into public.chat_messages(id,account_id,channel_type,channel_id,sender_name,body,created_at)
 values(absent_id,a[5],'guild',g_other::text,'Fixture','Reverse blocked @'||reader_name,t+interval '5 seconds');
 delete from public.player_blocks b where b.blocker_id=a[3] and b.blocked_id=a[5];
 insert into public.player_blocks(blocker_id,blocked_id) values(a[5],a[3]);
 set local role authenticated;
 perform pg_temp.expect_chat_error(format('select public.mark_social_chat_read_v2(%L,%L,%L)','guild',g_other::text,absent_id),'chat_message_unavailable');
 reset role;
end
$test$;

select 'PASS: chat SQL receipts/replay/conflicts, authoritative sends, exact/tied/monotonic cursors, first-view races, legacy calls, pruning, membership, blocks and RPC permissions' result;
rollback;
