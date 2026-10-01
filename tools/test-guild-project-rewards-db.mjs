/** Real guild-PvE migration/RPC tests in isolated PostgreSQL; the existing gameplay commit is a fixture boundary. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db=new PGlite();
const uid='00000000-0000-0000-0000-000000000101',gid='00000000-0000-0000-0000-000000000201',other='00000000-0000-0000-0000-000000000202';
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
let request=0;
const commit=(units=1,extra={})=>scalar(`select public.commit_online_game_guild_pve_v1($1,0,0,$2,'hash','{}',$3)`,[uid,'request-'+(++request),JSON.stringify([{kind:'combat',units,...extra}])]);
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table guilds(id uuid primary key);create table guild_members(account_id uuid primary key,guild_id uuid references guilds(id),joined_at timestamptz default now()-interval '30 days');
 create table live_events(event_id text,name text,starts_at timestamptz,ends_at timestamptz,claim_ends_at timestamptz,enabled boolean default true);
 create function visible_live_events() returns setof live_events language sql as $$select * from live_events where enabled and claim_ends_at>now()$$;
 create table online_game_states(account_id uuid primary key,character_id uuid,state jsonb,revision bigint default 0,updated_at timestamptz default now());
 create table character_wallets(character_id uuid primary key,gold bigint);
 create table server_action_receipts(account_id uuid,action text,idempotency_key text,response jsonb,primary key(account_id,action,idempotency_key));
 create function commit_online_game_server_v1(p_account_id uuid,p_expected_version bigint,p_expected_gold bigint,p_request_id text,p_request_hash text,p_response jsonb,p_contributions jsonb) returns jsonb language plpgsql as $$begin
 insert into server_action_receipts values(p_account_id,'online_game_v1',p_request_id,p_response) on conflict do nothing;return p_response;end$$;
 create function commit_online_game_server_v2(p_account_id uuid,p_expected_version bigint,p_expected_gold bigint,p_request_id text,p_request_hash text,p_response jsonb,p_contributions jsonb,p_deleted_character_id uuid) returns jsonb language sql as $$select commit_online_game_server_v1(p_account_id,p_expected_version,p_expected_gold,p_request_id,p_request_hash,p_response,p_contributions)$$;
 insert into auth.users values('${uid}');insert into guilds values('${gid}'),('${other}');insert into guild_members(account_id,guild_id) values('${uid}','${gid}');
 insert into online_game_states(account_id,character_id,state) values('${uid}','${uid}','{"account":{},"character":{"gold":100}}');insert into character_wallets values('${uid}',100);
 select set_config('request.jwt.claim.sub','${uid}',false);`);
 await db.exec(readFileSync(new URL('../backend/supabase/migrations/20261001055514_guild_pve_encounters_v1.sql',import.meta.url),'utf8'));

 await db.exec(readFileSync(new URL('../backend/supabase/migrations/20261001065952_guild_pve_balance_v2.sql',import.meta.url),'utf8'));

 const projectSchema=readFileSync(new URL('../backend/supabase/migrations/20260914003000_guild_projects_social_v18.sql',import.meta.url),'utf8');
 await db.exec(projectSchema.slice(0,projectSchema.indexOf('create table if not exists public.guild_decree_selection_windows'))+'commit;');
 await db.exec(`create table guild_activity_feed(id uuid);create schema private;
 create table guild_halls(guild_id uuid primary key,hall_progress bigint,lifetime_projects_completed int,facilities jsonb,revision int,updated_at timestamptz);
 create table guild_hall_trophies(guild_id uuid,trophy_key text,label text,description text,source_kind text,source_id text,earned_at timestamptz,primary key(guild_id,trophy_key));
 create table private.guild_hall_receipts(guild_id uuid,event_id text,fingerprint text,result jsonb,primary key(guild_id,event_id));`);
 await db.exec(readFileSync(new URL('../backend/supabase/migrations/20260918011100_v44_guild_hall_project_hook.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../backend/supabase/migrations/20261001072757_guild_weekly_projects_and_event_rewards.sql',import.meta.url),'utf8'));
 await scalar('select prepare_guild_projects_v2()');
 const project=await scalar('select id from guild_project_instances');
 await scalar('select prepare_guild_projects_v2()');assert.equal(await scalar('select count(*)::int from guild_project_instances'),1);
 const start=Number(await scalar('select extract(epoch from started_at)*1000 from guild_project_instances'));
 const effort=(kind,a,b)=>JSON.stringify([{kind,startsAtMs:a,endsAtMs:b}]);
 const credit=(kind,a,b,account=uid,guild=gid)=>scalar('select credit_guild_project_effort_v2($1,$2,$3,to_timestamp($4/1000.0))',[account,guild,effort(kind,a,b),Math.max(b,start+86400000)]);
 await credit('combat',start,start+3600000);assert.equal(Number(await scalar('select completion_points from guild_project_instances where id=$1',[project])),1200);
 await credit('skilling',start+3600000,start+7200000);assert.equal(await scalar('select status from guild_project_instances where id=$1',[project]),'completed');
 assert.equal(Number(await scalar('select hall_progress from guild_halls')),200);
 await credit('combat',start+7200000,start+10800000);assert.equal(Number(await scalar('select raw_points from guild_project_member_progress where project_instance_id=$1',[project])),2400,'Earned-day cap');
 assert.equal(Number(await scalar('select hall_progress from guild_halls')),200,'Hall reward once');
 assert.equal((await scalar('select claim_guild_project_reward_v2($1)',[project])).gold,500);
 assert.equal((await scalar('select claim_guild_project_reward_v2($1)',[project])).alreadyClaimed,true);
 // Replay through the real shared commit must not credit twice.
 const args=[uid,'project-replay',effort('combat',start+86400000,start+86400000+600000)];
 const rpc="select commit_online_game_guild_pve_v1($1,0,0,$2,'hash',jsonb_build_object('guildProjectEffort',$3::jsonb),'[]')";
 await scalar(rpc,args);const before=await scalar('select raw_points from guild_project_member_progress where project_instance_id=$1',[project]);await scalar(rpc,args);assert.equal(await scalar('select raw_points from guild_project_member_progress where project_instance_id=$1',[project]),before);
 // New roster members cannot claim an old success; a later week captures them.
 const newbie='00000000-0000-0000-0000-000000000103';await db.query('insert into auth.users values($1)',[newbie]);await db.query('insert into guild_members(account_id,guild_id) values($1,$2)',[newbie,gid]);
 await credit('combat',start,start+7200000,newbie);assert.equal(await scalar('select count(*)::int from guild_project_member_progress where account_id=$1',[newbie]),0);
 await scalar('select ensure_guild_weekly_project_v2($1,to_timestamp($2/1000.0))',[gid,start+7*86400000]);assert.equal(await scalar('select count(*)::int from guild_project_instances'),2);
 const next=await scalar('select id from guild_project_instances where id<>$1',[project]);
 const nextStart=start+7*86400000;
 await credit('combat',nextStart,nextStart+7200000);assert.equal(Number(await scalar('select completion_points from guild_project_instances where id=$1',[next])),1200,'One of two members can supply at most half');
 assert.equal(await scalar('select status from guild_project_instances where id=$1',[next]),'active');
 await scalar('select ensure_guild_weekly_project_v2($1,to_timestamp($2/1000.0))',[gid,nextStart+8*86400000]);
 assert.equal(await scalar('select status from guild_project_instances where id=$1',[next]),'expired');
 await scalar('select credit_guild_project_effort_v2($1,$2,$3,to_timestamp($4/1000.0))',[newbie,gid,effort('skilling',nextStart,nextStart+3600000),nextStart+8*86400000]);
 assert.equal(await scalar('select status from guild_project_instances where id=$1',[next]),'completed','Earlier earned offline gathering can complete expired project during grace');
 assert.equal(Number(await scalar('select hall_progress from guild_halls')),400);
 await db.query('update guild_members set guild_id=$1 where account_id=$2',[other,uid]);
 await credit('combat',nextStart,nextStart+3600000,uid,other);
 assert.equal(Number(await scalar('select coalesce(sum(completion_points),0) from guild_project_instances where guild_id=$1',[other])),0,'Week binding blocks guild hopping');
 await db.query('update guild_members set guild_id=$1 where account_id=$2',[gid,uid]);
 await db.exec('grant usage on schema auth to authenticated;set role authenticated');
 assert.equal(await scalar('select count(*)::int from guild_project_reward_claims'),1,'Own receipt visible under RLS');
 await scalar("select set_config('request.jwt.claim.sub',$1,false)",[newbie]);
 assert.equal(await scalar('select count(*)::int from guild_project_reward_claims'),0,'Another account cannot read receipts');
 await db.exec('reset role');await scalar("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
 // Event rewards credit account balances atomically and never the normal weekly boss.
 await db.exec("insert into live_events values('festival','Festival',now()-interval '1 day',now()+interval '6 days',now()+interval '9 days',true)");
 const board=await scalar('select guild_pve_board_v1()');const event=board.find(e=>e.kind==='event'),weekly=board.find(e=>e.kind==='weekly');assert.ok(event&&weekly);
 for(const row of [event,weekly]){await db.query('update guild_pve_encounters_v1 set damage=max_hp where id=$1',[row.id]);await db.query('insert into guild_pve_members_v1 values($1,$2,1000)',[row.id,uid]);}
 const normal=await scalar('select claim_guild_pve_v1($1,100)',[weekly.id]);assert.equal(normal.eventCurrency,0);assert.equal(normal.candy,0);
 for(const pct of [25,50,100])await scalar('select claim_guild_pve_v1($1,$2)',[event.id,pct]);
 let account=await scalar("select state->'account' from online_game_states");assert.equal(account.eventCurrencyBalanceById.festival,700);assert.equal(account.eventProgressById.festival,700);assert.deepEqual(account.eventCandyChargesById,{'festival:candy:skill':1,'festival:candy:combat':1,'festival:candy:companion':2});
 await scalar('select claim_guild_pve_v1($1,100)',[event.id]);assert.deepEqual(await scalar("select state->'account' from online_game_states"),account);
 await db.exec('update live_events set enabled=false');assert.equal((await scalar('select guild_pve_board_v1()')).filter(e=>e.kind==='event').length,0);
 for(const fn of ['ensure_guild_weekly_project_v2(uuid,timestamptz)','credit_guild_project_effort_v2(uuid,uuid,jsonb,timestamptz)'])assert.equal(await scalar("select has_function_privilege('authenticated',$1,'execute')",[fn]),false);
 console.log('PASS weekly projects: generation, combat/gathering, daily cap, Hall hook exactly once, personal claim, replay, fixed roster, rotation; event currency/candy, weekly separation, duplicate claims and permissions.');
}catch(error){console.error(error.message,error.detail,error.where);process.exitCode=1;}finally{await db.close()}
