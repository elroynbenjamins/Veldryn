/** Disposable PostgreSQL harness for the real chat migration and RPCs.
 * No connection string, network access, saved database or player data is used.
 * PGLITE_MODULE may point at an isolated, pinned @electric-sql/pglite runtime.
 */
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const backendRequire=createRequire(new URL('../backend/package.json',import.meta.url));
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE??backendRequire.resolve('@electric-sql/pglite')).href);
const db=new PGlite();
const read=file=>readFileSync(new URL('../backend/supabase/'+file,import.meta.url),'utf8');
const extractFunction=(source,name)=>{
 const start=source.indexOf('create or replace function public.'+name+'(');
 if(start<0)throw new Error('Missing production function '+name);
 const rest=source.slice(start),match=/\bas\s+(\$[a-zA-Z0-9_]*\$)/i.exec(rest);
 if(!match)throw new Error('Missing production function body '+name);
 const bodyStart=match.index+match[0].length,end=rest.indexOf(match[1],bodyStart);
 if(end<0)throw new Error('Unterminated production function '+name);
 return rest.slice(0,end+match[1].length)+';';
};

try{
 // Fixture only the existing schema/auth context. All changed functions and
 // moderation, identity selection and emote enforcement come from source SQL.
 await db.exec(`
 create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;
 grant usage on schema auth,public to anon,authenticated,service_role;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table auth.users(id uuid primary key,email text);
 create table public.characters(id uuid primary key,account_id uuid references auth.users(id),name text,class_id text,level integer default 1,updated_at timestamptz default now());
 create table public.player_profiles(account_id uuid primary key references auth.users(id),display_name text,active_character_id uuid references public.characters(id));
 create table public.guilds(id uuid primary key,name text,owner_account_id uuid,tag text,tag_color_id text);
 create table public.guild_members(guild_id uuid references public.guilds(id),account_id uuid references auth.users(id),role text default 'member',joined_at timestamptz default now(),primary key(guild_id,account_id));
 create table public.parties(id uuid primary key,leader_character_id uuid references public.characters(id),leader_account_id uuid references auth.users(id),status text default 'forming');
 create table public.party_members(party_id uuid references public.parties(id),character_id uuid references public.characters(id),account_id uuid references auth.users(id),role text,joined_at timestamptz default now(),left_at timestamptz,primary key(party_id,character_id));
 create unique index party_members_one_current_party_per_account_v16 on public.party_members(account_id) where left_at is null;
 create table public.player_blocks(blocker_id uuid references auth.users(id),blocked_id uuid references auth.users(id),primary key(blocker_id,blocked_id));
 create table public.server_action_receipts(account_id uuid references auth.users(id),action text,idempotency_key text,response jsonb not null,created_at timestamptz default now(),primary key(account_id,action,idempotency_key));
 alter table public.server_action_receipts enable row level security;
 revoke all on public.server_action_receipts from public,anon,authenticated;
 `);
 await db.exec(read('migrations/20260831000300_chat_moderation.sql'));
 await db.exec("alter table public.chat_messages add column sender_name text not null default 'Adventurer';");
 await db.exec(extractFunction(read('migrations/20261025000005_chat_guild_identity_authority.sql'),'send_world_chat'));
 await db.exec('revoke all on function public.send_world_chat(text,text,text) from public,anon;grant execute on function public.send_world_chat(text,text,text) to authenticated;');
 await db.exec(read('migrations/20261018000140_guild_chat_online.sql'));
 await db.exec(read('migrations/20261018000150_chat_unread_mentions.sql'));
 await db.exec(read('migrations/20261018000180_chat_emote_limit_v1.sql'));
 // The production receipt trigger must ignore chat receipts, not enter the
 // gathering reward branch. Missing unrelated reward tables fail if it does.
 await db.exec(extractFunction(read('migrations/20261010000000_parties_contracts_guild_seekers_v1.sql'),'party_gathering_receipt_v16'));
 await db.exec('create trigger party_gathering_receipt_v16 after insert on public.server_action_receipts for each row execute function public.party_gathering_receipt_v16();');
 await db.exec(read('migrations/20261102000001_chat_delivery_read_cursors.sql'));
 const results=await db.exec(read('tests/chat_reliability.sql'));
 for(const result of results)for(const row of result.rows)console.log(row.result??row);
 console.log('PASS: actual PostgreSQL chat migration and RPCs; no external database accessed');
}catch(error){
 console.error('FAIL: chat SQL '+error.message);
 if(error.where)console.error(error.where);
 if(error.internalQuery)console.error(error.internalQuery);
 process.exitCode=1;
}finally{await db.close();}
