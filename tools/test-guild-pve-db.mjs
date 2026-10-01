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
 create table guilds(id uuid primary key);create table guild_members(account_id uuid primary key,guild_id uuid references guilds(id));
 create table live_events(event_id text,name text,starts_at timestamptz,ends_at timestamptz,claim_ends_at timestamptz,enabled boolean default true);
 create function visible_live_events() returns setof live_events language sql as $$select * from live_events where enabled and claim_ends_at>now()$$;
 create table online_game_states(account_id uuid primary key,character_id uuid,state jsonb,revision bigint default 0,updated_at timestamptz default now());
 create table character_wallets(character_id uuid primary key,gold bigint);
 create table server_action_receipts(account_id uuid,action text,idempotency_key text,response jsonb,primary key(account_id,action,idempotency_key));
 create function commit_online_game_server_v1(p_account_id uuid,p_expected_version bigint,p_expected_gold bigint,p_request_id text,p_request_hash text,p_response jsonb,p_contributions jsonb) returns jsonb language plpgsql as $$begin
 insert into server_action_receipts values(p_account_id,'online_game_v1',p_request_id,p_response) on conflict do nothing;return p_response;end$$;
 create function commit_online_game_server_v2(p_account_id uuid,p_expected_version bigint,p_expected_gold bigint,p_request_id text,p_request_hash text,p_response jsonb,p_contributions jsonb,p_deleted_character_id uuid) returns jsonb language sql as $$select commit_online_game_server_v1(p_account_id,p_expected_version,p_expected_gold,p_request_id,p_request_hash,p_response,p_contributions)$$;
 insert into auth.users values('${uid}');insert into guilds values('${gid}'),('${other}');insert into guild_members values('${uid}','${gid}');
 insert into online_game_states(account_id,character_id,state) values('${uid}','${uid}','{"character":{"gold":100}}');insert into character_wallets values('${uid}',100);
 select set_config('request.jwt.claim.sub','${uid}',false);`);
 await db.exec(readFileSync(new URL('../backend/supabase/migrations/20261001055514_guild_pve_encounters_v1.sql',import.meta.url),'utf8'));
 let board=await scalar('select guild_pve_board_v1()');assert.equal(board.length,1);const weekly=board[0].id;
 await assert.rejects(scalar('select claim_guild_pve_v1($1,25)',[weekly]),/MILESTONE_NOT_REACHED/);
 await commit(60);assert.equal(await scalar('select damage from guild_pve_encounters_v1 where id=$1',[weekly]),50000);
 await commit(10);assert.equal(await scalar('select damage from guild_pve_encounters_v1 where id=$1',[weekly]),50000);
 // A new festival still receives damage after the weekly allowance was exhausted.
 await db.exec(`insert into live_events values('festival','Harvestwake',now()-interval '1 hour',now()+interval '1 day',now()+interval '4 days',true)`);
 await commit(10);board=await scalar('select guild_pve_board_v1()');const event=board.find(x=>x.kind==='event').id;
 assert.equal(board.find(x=>x.id===event).damage,10000);
 const retry=request;await scalar(`select commit_online_game_guild_pve_v1($1,0,0,$2,'hash','{}',$3)`,[uid,'request-'+retry,'[{"kind":"combat","units":10}]']);
 assert.equal(await scalar('select damage from guild_pve_encounters_v1 where id=$1',[event]),10000);
 await db.query('update guild_pve_encounters_v1 set damage=125000 where id=$1',[weekly]);
 assert.deepEqual(await scalar('select claim_guild_pve_v1($1,25)',[weekly]),{gold:250,alreadyClaimed:false});
 assert.equal(await scalar('select gold from character_wallets'),350);assert.equal(await scalar("select (state#>>'{character,gold}')::int from online_game_states"),350);assert.equal(await scalar('select revision from online_game_states'),1);
 assert.deepEqual(await scalar('select claim_guild_pve_v1($1,25)',[weekly]),{alreadyClaimed:true});assert.equal(await scalar('select gold from character_wallets'),350);
 await assert.rejects(scalar('select claim_guild_pve_v1($1,30)',[weekly]),/INVALID_MILESTONE/);
 // Emergency event disable blocks board visibility, progress, and claims.
 await db.exec('update live_events set enabled=false');await commit(5);assert.equal((await scalar('select guild_pve_board_v1()')).length,1);
 assert.equal(await scalar('select damage from guild_pve_encounters_v1 where id=$1',[event]),10000);
 await assert.rejects(scalar('select claim_guild_pve_v1($1,25)',[event]),/EVENT_UNAVAILABLE/);
 await db.exec('update live_events set enabled=true');
 // Guild hopping retains the allowance and claimed milestone across the shared scope.
 await db.query('update guild_members set guild_id=$1',[other]);await commit(10);board=await scalar('select guild_pve_board_v1()');const otherWeek=board.find(x=>x.kind==='weekly');assert.equal(otherWeek.damage,0);assert.equal(otherWeek.allowanceUsed,50000);assert.deepEqual(otherWeek.claimed,[25]);
 await assert.rejects(scalar('select claim_guild_pve_v1($1,50)',[weekly]),/GUILD_MEMBERSHIP_REQUIRED/);
 // A non-contributor cannot claim a guild milestone.
 await db.query('update guild_pve_encounters_v1 set damage=250000 where id=$1',[otherWeek.id]);await assert.rejects(scalar('select claim_guild_pve_v1($1,50)',[otherWeek.id]),/CONTRIBUTE_1000_DAMAGE/);
 await db.query('update guild_members set guild_id=$1',[gid]);
 await db.query("update guild_pve_encounters_v1 set starts_at=now()-interval '15 days',ends_at=now()-interval '8 days',claim_ends_at=now()-interval '1 day',damage=500000 where id=$1",[weekly]);
 await assert.rejects(scalar('select claim_guild_pve_v1($1,50)',[weekly]),/CLAIM_WINDOW_ENDED/);
 // Ineligible roles cannot forge progress or call the service commit.
 assert.equal(await scalar("select has_function_privilege('authenticated','commit_online_game_guild_pve_v1(uuid,bigint,bigint,text,text,jsonb,jsonb,uuid)','execute')"),false);
 assert.equal(await scalar("select has_table_privilege('authenticated','guild_pve_encounters_v1','insert')"),false);
 assert.equal(await scalar("select has_function_privilege('anon','claim_guild_pve_v1(uuid,integer)','execute')"),false);
 await db.exec("select set_config('request.jwt.claim.sub','',false)");await assert.rejects(scalar('select guild_pve_board_v1()'),/AUTH_REQUIRED/);
 console.log('Guild PvE PostgreSQL: weekly/event allowances, replay, rewards, wallet revision, guild hopping, membership, expiry, emergency disable, permissions passed.');
}finally{await db.close()}
