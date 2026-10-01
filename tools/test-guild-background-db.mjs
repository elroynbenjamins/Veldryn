/** In-memory PostgreSQL harness. No network/database credentials, no saved data.
 * Uses real migration/RPC bodies; only the existing schema/auth context is a fixture.
 * Run with PGLITE_MODULE pointing to an isolated @electric-sql/pglite installation.
 */
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
 const results=await db.exec(read('tests/guild_card_backgrounds.sql'));
 for(const result of results)if(result.rows.length)console.log(result.rows);
}finally{await db.close()}
