/** Isolated PostgreSQL regression test; never connects to a saved/live database. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const {PGlite}=await import(process.env.PGLITE_MODULE?pathToFileURL(process.env.PGLITE_MODULE).href:'@electric-sql/pglite');
const read=file=>readFileSync(resolve(root,'backend/supabase/migrations',file),'utf8');
const limit=read('20260928204145_guild_name_display_limit.sql');
const safety=read('20261018000170_identity_name_safety.sql');
const identityTriggers=safety.slice(safety.indexOf('create or replace function public.safe_identity_name_v1'),safety.indexOf('create or replace function public.sync_active_profile_display_name_v1'));
for(const order of [[limit,identityTriggers],[identityTriggers,limit]]){
 const db=new PGlite();
 try{
  await db.exec("create role anon; create role authenticated; create table public.guilds(id int primary key,name text not null,motto text); create table public.characters(name text); insert into public.guilds values(1,'The Silverbrook Sentinels','old');");
  for(const sql of order)await db.exec(sql);
  await db.exec("insert into public.guilds values(2,'Wardens of the Silver','new'); update public.guilds set motto='changed' where id=1; update public.guilds set name=name where id=1;");
  assert.equal((await db.query("select name from public.guilds where id=1")).rows[0].name,'The Silverbrook Sentinels');
  await assert.rejects(db.exec("insert into public.guilds values(3,'Wardens of the Silvers','bad');"),/invalid_guild_name/);
  await assert.rejects(db.exec("update public.guilds set name='Wardens of the Silvers' where id=2;"),/invalid_guild_name/);
  await assert.rejects(db.exec("insert into public.guilds values(4,'Invalid123','bad');"),/invalid_guild_name/);
  await db.exec("update public.guilds set name='Silver Wardens' where id=1; insert into public.characters values('Aelric');");
  assert.equal((await db.query("select has_function_privilege('authenticated','public.enforce_guild_name_display_limit()','execute') as allowed")).rows[0].allowed,false);
 }finally{await db.close()}
}
console.log('PASS: 21-char guild limit, both migration orders, unchanged existing names, rename checks, existing safety rules, restricted function');
