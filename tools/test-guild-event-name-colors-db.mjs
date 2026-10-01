/** In-memory PostgreSQL harness. No network/database credentials, no saved data.
 * Uses real migration/RPC bodies; only the existing schema/auth context is a fixture.
 * Run with PGLITE_MODULE pointing to an isolated @electric-sql/pglite installation.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const {PGlite}=await import(process.env.PGLITE_MODULE?pathToFileURL(process.env.PGLITE_MODULE).href:'@electric-sql/pglite');
const db=new PGlite();
const read=file=>readFileSync(resolve(root,'backend/supabase',file),'utf8');
const appearance=read('migrations/20260919205929_v52_appearance_completion.sql');
const repairs=read('migrations/20261018000020_post_deploy_lint_repairs.sql');
const fn=(sql,name)=>{const start=sql.indexOf('create or replace function public.'+name+'(');if(start<0)throw Error(name);const end=sql.indexOf('end $$;',start);if(end<0)throw Error('end '+name);return sql.slice(start,end+7)};
try{
 await db.exec(`
 create role anon;create role authenticated;
 create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create table public.guilds(id uuid primary key,level int not null default 1,banner_id text not null default 'world_tree_green',profile_frame_id text not null default 'classic',name_color_id text not null default 'name_ivory',tag_color_id text not null default 'tag_silver',nameplate_id text not null default 'classic',motto text not null default 'Together.');
 create table public.guild_members(guild_id uuid references public.guilds(id),account_id uuid primary key,role text not null);
 create table public.guild_halls(guild_id uuid primary key,hall_progress bigint,facilities jsonb);
 create table public.guild_hall_trophies(guild_id uuid,trophy_key text);
 create table public.guild_appearance(guild_id uuid primary key references public.guilds(id),banner_id text,border_id text,name_color_id text,tag_color_id text,nameplate_id text,revision bigint default 0,updated_at timestamptz default now());
 insert into public.guilds(id) values('00000000-0000-0000-0000-000000000201');
 insert into public.guild_members values('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101','leader');
 `);
 await db.exec(fn(appearance,'guild_appearance_entitlements_v52'));
 await db.exec(fn(repairs,'update_guild_appearance_v52'));
 await db.exec(read('migrations/20260928200007_guild_card_backgrounds.sql'));

 await db.exec(`create table public.guild_cosmetic_unlocks(guild_id uuid,unlock_id text,source_kind text,source_ref text,primary key(guild_id,unlock_id));
 create table public.guild_pve_encounters_v1(id int primary key,guild_id uuid,kind text,event_id text,damage bigint,max_hp bigint);
 update guilds set name_color_id='name_gold';`);
 await db.exec(read('migrations/20261001080000_halloween_guild_event_cosmetics.sql'));
 await db.exec(read('migrations/20261001083516_guild_event_name_colors.sql'));
 const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
 const gid='00000000-0000-0000-0000-000000000201';
 await scalar("select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',false)");
 assert.equal(await scalar('select name_color_id from guilds'),'name_ivory');
 const choose=color=>db.query("select * from update_guild_appearance_with_background_v3('world_tree_green','classic',$1,'tag_silver','classic','Together.','plain')",[color]);
 await choose('name_ivory');
 for(const color of ['name_steel','name_gold','name_emerald','name_sapphire','name_crimson','name_amethyst','name_frost','name_mythic'])await assert.rejects(choose(color),/INVALID_GUILD_NAME_COLOR/);
 await assert.rejects(choose('name_halloween_orange'),/GUILD_NAME_COLOR_LOCKED/);
 await db.query("insert into guild_pve_encounters_v1 values(1,$1,'event','EVT_ANNUAL_010_2026',24,100)",[gid]);
 assert.equal(await scalar('select count(*)::int from guild_cosmetic_unlocks'),0);
 await db.exec('update guild_pve_encounters_v1 set damage=25');
 assert.equal(await scalar('select count(*)::int from guild_cosmetic_unlocks'),1,'Shared milestone grants without personal claim');
 await choose('name_halloween_orange');assert.equal(await scalar('select name_color_id from guilds'),'name_halloween_orange');
 await db.exec('update guild_pve_encounters_v1 set damage=100');assert.equal(await scalar('select count(*)::int from guild_cosmetic_unlocks'),1);
 await db.exec('delete from guild_pve_encounters_v1');await choose('name_ivory');await choose('name_halloween_orange');
 assert.equal((await db.query('select * from guild_appearance_entitlements_v3()')).rows[0].event_cosmetic_ids[0],'name_halloween_orange','Unlock persists after event removal');
 // Later legacy RPC definitions cannot overwrite the new endpoint or bypass its table guard.
 await db.exec(fn(repairs,'update_guild_appearance_v52'));
 await choose('name_halloween_orange');
 await assert.rejects(db.exec("update guilds set name_color_id='name_steel'"),/INVALID_GUILD_NAME_COLOR/);
 await db.exec("update guild_members set role='member'");await assert.rejects(choose('name_ivory'),/GUILD_OFFICER_REQUIRED/);
 console.log('PASS guild event colors: basic only, locked events, automatic 25% unlock, idempotency, permanent ownership, legacy write guard and role validation');
}catch(error){console.error(error.message,error.where);process.exitCode=1;}finally{await db.close()}
