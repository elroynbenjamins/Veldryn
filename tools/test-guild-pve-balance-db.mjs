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
 insert into online_game_states(account_id,character_id,state) values('${uid}','${uid}','{"character":{"gold":100}}');insert into character_wallets values('${uid}',100);
 select set_config('request.jwt.claim.sub','${uid}',false);`);
 await db.exec(readFileSync(new URL('../backend/supabase/migrations/20261001055514_guild_pve_encounters_v1.sql',import.meta.url),'utf8'));

 await db.exec(readFileSync(new URL('../backend/supabase/migrations/20261001065952_guild_pve_balance_v2.sql',import.meta.url),'utf8'));
 let board=await scalar('select guild_pve_board_v1()');const weekly=board[0].id;
 assert.equal(board[0].maxHp,75000);assert.equal(board[0].personalCap,30000);assert.equal(board[0].rosterSize,5);assert.equal(board[0].eligible,true);
 await commit(1);assert.equal(await scalar('select damage from guild_pve_encounters_v1 where id=$1',[weekly]),0,'Missing combat intervals never create progress');
 const now=Number(await scalar('select extract(epoch from now())*1000'));
 const day=Date.parse(new Date(now).toISOString().slice(0,10)+'T00:00:00Z');
 const effort=(start,end)=>JSON.stringify([{kind:'combat',units:1,combatEffort:{startsAtMs:start,endsAtMs:end}}]);
 const credit=async(start,end,account=uid,guild=gid)=>scalar('select credit_guild_pve_effort_v2($1,$2,$3,now())',[account,guild,effort(start,end)]);
 // Two hours of successful time earns at most one UTC day's 6,000 damage.
 await credit(day,day+7200000);
 board=await scalar('select guild_pve_board_v1()');assert.equal(board[0].damage,6000);assert.equal(board[0].dailyUsed,6000);
 // UTC-boundary attribution: a later claim uses the earlier earned day's allowance.
 await credit(day-3600000,day);board=await scalar('select guild_pve_board_v1()');assert.equal(board[0].damage,12000);
 // Freeze size and roster; later members cannot join a completed encounter for rewards.
 const newcomer='00000000-0000-0000-0000-000000000102';
 await db.query('insert into auth.users values($1)',[newcomer]);await db.query('insert into guild_members(account_id,guild_id) values($1,$2)',[newcomer,gid]);
 await scalar('select guild_pve_board_v1()');await credit(day-7200000,day,newcomer);
 assert.equal(await scalar('select roster_size from guild_pve_encounters_v1 where id=$1',[weekly]),5);
 assert.equal(await scalar('select count(*)::int from guild_pve_roster_v2 where account_id=$1',[newcomer]),0);
 // Roster member with no earlier damage can qualify after defeat.
 await db.query('delete from guild_pve_members_v1 where encounter_id=$1',[weekly]);await db.exec('delete from guild_pve_daily_v2');
 await db.query('update guild_pve_encounters_v1 set damage=max_hp where id=$1',[weekly]);await credit(day,day+600000);
 assert.equal(await scalar('select damage from guild_pve_members_v1 where encounter_id=$1',[weekly]),2000);
 assert.deepEqual(await scalar('select claim_guild_pve_v1($1,100)',[weekly]),{gold:1000,alreadyClaimed:false});
 assert.deepEqual(await scalar('select claim_guild_pve_v1($1,100)',[weekly]),{alreadyClaimed:true});assert.equal(await scalar('select gold from character_wallets'),1100);
 // The wrapper still gives exactly-once credit after a lost-response retry.
 const args=[uid,'request-effort-replay',effort(day+600000,day+1200000)];
 const rpc="select commit_online_game_guild_pve_v1($1,0,0,$2,'hash',jsonb_build_object('guildPveEffort',$3::jsonb),$3)";
 await scalar(rpc,args);assert.equal(await scalar('select damage from guild_pve_members_v1 where encounter_id=$1',[weekly]),4000);const before=await scalar('select damage from guild_pve_members_v1 where encounter_id=$1',[weekly]);await scalar(rpc,args);
 assert.equal(await scalar('select damage from guild_pve_members_v1 where encounter_id=$1',[weekly]),before);
 // Successful cycles in a claim grace period still credit their original encounter.
 const oldStart=day-8*86400000,oldEnd=day-86400000;
 await scalar("select create_guild_pve_encounter_v2($1,'past-week','weekly','Old',to_timestamp($2/1000.0),to_timestamp($3/1000.0),now()+interval '2 days')",[gid,oldStart,oldEnd]);
 await credit(oldEnd-600000,oldEnd+600000);
 assert.equal(await scalar("select damage from guild_pve_encounters_v1 where scope_key='past-week'"),2000);
 // 14-day festivals double encounter targets and allowances, not the daily cap.
 await db.exec("insert into live_events values('festival','Festival',now()-interval '1 day',now()+interval '13 days',now()+interval '16 days',true)");
 board=await scalar('select guild_pve_board_v1()');const event=board.find(x=>x.kind==='event');
 assert.equal(event.maxHp,150000);assert.equal(event.personalCap,60000);assert.equal(event.dailyCap,6000);
 await db.exec('update live_events set enabled=false');assert.equal((await scalar('select guild_pve_board_v1()')).some(x=>x.kind==='event'),false);
 // Fractional contributions aggregate rather than losing progress per claim.
 await db.exec('delete from guild_pve_daily_v2');await db.query('delete from guild_pve_members_v1 where encounter_id=$1',[weekly]);
 await credit(day,day+150);await credit(day+150,day+300);
 assert.equal(await scalar('select damage from guild_pve_members_v1 where encounter_id=$1',[weekly]),1);
 // Six distinct earned days cannot bypass the encounter cap.
 await scalar("select create_guild_pve_encounter_v2($1,'cap-test','weekly','Cap',now()-interval '7 days',now()+interval '1 day',now()+interval '8 days')",[gid]);
 // 8-day helper fixture scales the personal cap to ceil(30000*8/7).
 for(let d=1;d<=7;d++)await credit(day-d*86400000,day-d*86400000+4*3600000);
 assert.equal(await scalar("select m.damage=e.personal_cap from guild_pve_members_v1 m join guild_pve_encounters_v1 e on e.id=m.encounter_id where e.scope_key='cap-test' and m.account_id=$1",[uid]),true);
 assert.equal(await scalar("select has_function_privilege('authenticated','credit_guild_pve_effort_v2(uuid,uuid,jsonb,timestamptz)','execute')"),false);
 assert.equal(await scalar("select has_table_privilege('authenticated','guild_pve_daily_v2','insert')"),false);
 console.log('PASS Guild PvE v2: frozen roster, scaling, earned-day cap, offline grace, post-defeat qualification, duplicate claims, replay, event duration, emergency disable, fractional credit and permissions.');
}finally{await db.close()}
