import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';

const here=path.dirname(fileURLToPath(import.meta.url));
const migration=readFileSync(path.join(here,'supabase/migrations/20261103000006_guild_activity_gain_balance.sql'),'utf8');
const db=new PGlite();
const guild='33333333-3333-4333-8333-333333333333';
const one='11111111-1111-4111-8111-111111111111';
const two='22222222-2222-4222-8222-222222222222';
const oldGains={common:45,uncommon:75,rare:120,epic:180,legendary:270};
try{
 await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role;
  create schema private;
  create table public.awards(source_kind text,source_id text,units integer,primary key(source_kind,source_id));
  create table public.guild_muster_daily(
   guild_id uuid,account_id uuid,activity_date date,contribution_points integer,last_contribution_at timestamptz);
  create table public.guild_project_instances(id uuid,guild_id uuid,kind text,status text,completed_at timestamptz);
  create function public.guild_activity_award_v1(p_guild_id uuid,p_source_kind text,p_source_id text,
   p_contribution_units integer,p_occurred_at timestamptz)
   returns table(meter_bps integer,awarded_bps integer,target_units integer) language plpgsql as $fn$
   begin
    insert into public.awards(source_kind,source_id,units) values(p_source_kind,p_source_id,p_contribution_units)
    on conflict do nothing;
    return query select 0,0,100;
   end $fn$;
  create trigger muster_activity after insert or update on public.guild_muster_daily
  for each row execute function public.guild_activity_from_muster_v1();
 `.replace(/create trigger muster_activity[\s\S]*$/, ''));
 await db.exec(migration);
 await db.exec(`
  create trigger muster_activity after insert or update on public.guild_muster_daily
  for each row execute function public.guild_activity_from_muster_v1();
  create trigger project_activity after update on public.guild_project_instances
  for each row execute function public.guild_activity_from_project_completion_v2();
 `);
 for(const [rarity,old] of Object.entries(oldGains)){
  const got=(await db.query('select public.guild_quest_rarity_reward_v3($1) as units',[rarity])).rows[0].units;
  assert.equal(got,Math.ceil(old/10)*5,rarity+' must be half, rounded up to 5');
 }
 // Below the participation threshold yields no Activity. Crossing it credits
 // once, with the halved/rounded amount, even if participation later increases.
 await db.query(`insert into public.guild_muster_daily values($1,$2,current_date,24,now())`,[guild,one]);
 assert.equal((await db.query("select count(*) n from public.awards")).rows[0].n,0);
 await db.query(`update public.guild_muster_daily set contribution_points=25 where account_id=$1`,[one]);
 await db.query(`update public.guild_muster_daily set contribution_points=100 where account_id=$1`,[one]);
 await db.query(`insert into public.guild_muster_daily values($1,$2,current_date,28,now())`,[guild,two]);
 const muster=(await db.query("select units from public.awards where source_kind='muster_day' order by source_id")).rows;
 assert.deepEqual(muster.map(row=>row.units),[15,15]);
 for(const [kind,old] of [['development',250],['event',200],['regular',150]]){
  const projectId=(kind==='development'?'4':kind==='event'?'5':'6')+'3333333-3333-4333-8333-333333333333';
  await db.query('insert into public.guild_project_instances values($1,$2,$3,\'active\',null)',[projectId,guild,kind]);
  await db.query("update public.guild_project_instances set status='completed',completed_at=now() where id=$1",[projectId]);
  await db.query("update public.guild_project_instances set completed_at=now() where id=$1",[projectId]);
  const earned=(await db.query("select units from public.awards where source_kind='guild_project' and source_id=$1",[projectId])).rows[0]?.units;
  assert.equal(earned,Math.ceil(old/10)*5,kind+' project award must be half rounded up to 5');
 }
 assert.equal((await db.query('select count(*) n from public.awards')).rows[0].n,5,
  'all qualifying actions must award exactly once, with no duplicate receipts');
 console.log('PASS: Guild Activity half-rate / up-to-5 rarity, Muster and Guild Project SQL triggers');
}finally{await db.close();}
