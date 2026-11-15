/**
 * Guild PvE V11: real postgres:17 ephemeral CI multi-process SQL QA.
 * Uses only fake test accounts, NO Supabase URL or service credentials.
 * All attack damage is trusted synthetic input to private QA function.
 * No production route, loadout owner verification or payout granted.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const url=new URL('..',import.meta.url);
const qaFile=fileURLToPath(new URL('tools/guild-pve-v11-postgres-qa.sql',url));
const seedFile=fileURLToPath(new URL('tools/guild-pve-v11-postgres-seed.sql',url));
const psqlArgs=['-X','-q','-t','-A','-v','ON_ERROR_STOP=1'];
function commandSync(sql,expectedSuccess=true){
 const r=spawnSync('psql',[...psqlArgs,'-c',sql],{
  encoding:'utf8',env:process.env,timeout:20000
 });
 if(r.error)throw r.error;
 if(expectedSuccess&&r.status!==0)
  throw Error('psql failure '+sql.slice(0,250)+'\n'+r.stderr);
 if(!expectedSuccess&&r.status===0)
  throw Error('psql unexpectedly succeeded '+sql);
 return {status:r.status,out:r.stdout.trim(),err:r.stderr};
}
function file(path){
 const r=spawnSync('psql',[...psqlArgs,'-f',path],{
  encoding:'utf8',env:process.env,timeout:20000
 });
 if(r.error||r.status!==0)throw Error('schema/seed failed: '+r.stderr);
}
function commandAsync(sql){
 return new Promise((resolve,reject)=>{
  const p=spawn('psql',[...psqlArgs,'-c',sql],{env:process.env});
  let out='',err='';
  p.stdout.on('data',v=>out+=String(v));
  p.stderr.on('data',v=>err+=String(v));
  p.on('error',reject);
  p.on('close',code=>resolve({status:code,out:out.trim(),err}));
 });
}
const q=(sql)=>commandSync(sql).out;
const sqlLit=s=>"'"+String(s).replaceAll("'","''")+"'";
const stampWeek1='2026-11-17 12:00+00';
const stampWeek2='2026-11-24 12:00+00';
const stampClosed='2026-12-01 12:00+00';
const digest=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
function action({guild='GX11_MAIN',account='GX11_A',nonce,node='C1-04',
  kind='battle',stance='Assault',damage=1,now=stampWeek1,fingerprint}){
 const fp=fingerprint??digest([guild,account,node,kind,stance,damage]);
 return 'SELECT guild_exp_v11_qa.qa_commit_action('+
  [ 'GX11_CYCLE',guild,account,nonce,fp,node,kind,
    kind==='exploration'?null:stance
  ].map(x=>x===null?'NULL':sqlLit(x)).join(',')+
  ','+Number(damage)+'::numeric,'+sqlLit(now)+'::timestamptz)::text;';
}
const parse=r=>JSON.parse(r.out);
const run=x=>parse(commandSync(action(x)));
function fail(x,marker){
 const r=commandSync(action(x),false);
 assert.match(r.err,new RegExp(marker));
}
const scalar=(sql)=>q('SELECT '+sql+';');
const count=(table,where)=>Number(scalar('count(*) FROM guild_exp_v11_qa.'+table+' WHERE '+where));
const roster=(guild,account)=>q(
 "SELECT seals_spent||':'||orders_spent FROM guild_exp_v11_qa.roster"+
 ' WHERE cycle_id='+sqlLit('GX11_CYCLE')+
 ' AND guild_id='+sqlLit(guild)+' AND account_id='+sqlLit(account)+';'
);
const totals=(guild)=>JSON.parse(q('SELECT row_to_json(x)::text FROM ('+
 ' SELECT revision,pressure FROM guild_exp_v11_qa.runs WHERE guild_id='+
 sqlLit(guild)+') x;'));
file(qaFile);file(seedFile);
assert.equal(count('runs',"cycle_id='GX11_CYCLE'"),5);
assert.equal(count('nodes',"cycle_id='GX11_CYCLE'"),90);
assert.equal(count('receipts',"cycle_id='GX11_CYCLE'"),0);
assert.equal(scalar('bool_and(relrowsecurity)::text FROM pg_class c JOIN pg_namespace n'+
 " ON n.oid=c.relnamespace WHERE n.nspname='guild_exp_v11_qa' AND c.relkind='r'"),
 'true','all private tables must have RLS enabled');

fail({account:'GX11_A',nonce:'LOCKED_FIRST',node:'C3-06'},'gx11_locked_prerequisite');
assert.equal(roster('GX11_MAIN','GX11_A'),'0:0');

// Two genuinely independent psql processes race to clear the SAME 1-HP node.
const raceA={guild:'GX11_RACE',account:'GX11_E',nonce:'RACE_E',damage:100};
const raceB={guild:'GX11_RACE',account:'GX11_F',nonce:'RACE_F',damage:100};
const [pa,pb]=await Promise.all([
 commandAsync('SELECT pg_sleep(0.15);'+action(raceA)),
 commandAsync('SELECT pg_sleep(0.15);'+action(raceB)),
]);
assert.equal(pa.status,0,pa.err);
assert.equal(pb.status,0,pb.err);
const raceReceipts=[JSON.parse(pa.out),JSON.parse(pb.out)];
assert.deepEqual(raceReceipts.map(x=>x.status).sort(),['committed','stale']);
assert.equal(raceReceipts.filter(x=>x.costSeals===1).length,1);
assert.equal(raceReceipts.filter(x=>x.costSeals===0).length,1);
assert.equal(count('receipts',"guild_id='GX11_RACE'"),2);
assert.equal(count('cycle_bindings',"guild_id='GX11_RACE'"),1);
assert.equal(q("SELECT hp::text FROM guild_exp_v11_qa.nodes WHERE guild_id='GX11_RACE' AND node_id='C1-04'"),'0.00');

// Replay must match physical saved JSONB after closed window and not add writes.
const same=run({...raceA,now:stampClosed});
assert.deepEqual(same,raceReceipts[0]);
const priorRev=totals('GX11_RACE').revision;
assert.deepEqual(run({...raceA,now:stampClosed}),same);
assert.equal(totals('GX11_RACE').revision,priorRev);
fail({...raceA,damage:999},'gx11_nonce_conflict');
fail({guild:'GX11_RACE',account:'GX11_E',nonce:'NEW_AFTER_CLOSE',now:stampClosed},
 'gx11_not_active');

// Guild binding is global to the cycle, not scoped to the individual guild.
const first=run({nonce:'MAIN_A_FIRST',damage:1});
assert.equal(first.status,'committed');
fail({guild:'GX11_GUILD_B',account:'GX11_A',nonce:'OTHER_GUILD_A'},'gx11_bound_other_guild');
assert.equal(roster('GX11_GUILD_B','GX11_A'),'0:0');

// Two different guilds simultaneously try to bind the same new account.
const p1=action({guild:'GX11_MAIN',account:'GX11_T',nonce:'BIND_MAIN_T',damage:1});
const p2=action({guild:'GX11_GUILD_B',account:'GX11_T',nonce:'BIND_OTHER_T',damage:1});
const [b1,b2]=await Promise.all([commandAsync(p1),commandAsync(p2)]);
assert.deepEqual([b1.status,b2.status].sort(),[0,1],
 'one cross-guild attempt must fail, even across independent SQL processes');
assert.match([b1.err,b2.err].join('\n'),/gx11_bound_other_guild/);
assert.equal(count('cycle_bindings',"account_id='GX11_T'"),1);
assert.equal(count('receipts',"account_id='GX11_T'"),1);

// Crash before commit: one physical SQL transaction advances the ledger but
// rollback discards the receipt, quota and HP. A retry can then succeed.
const beforeRollback=totals('GX11_MAIN');
const beforeSeals=roster('GX11_MAIN','GX11_B');
const tx='BEGIN;'+action({account:'GX11_B',nonce:'ROLLBACK_B'})+'ROLLBACK;';
commandSync(tx);
assert.deepEqual(totals('GX11_MAIN'),beforeRollback);
assert.equal(roster('GX11_MAIN','GX11_B'),beforeSeals);
assert.equal(count('receipts',"request_id='ROLLBACK_B'"),0);
assert.equal(run({account:'GX11_B',nonce:'ROLLBACK_B'}).costSeals,1);

// Four Seals in week 1, then eight cumulative from day 8, regardless of
// character selection. This test port operates on *accounts*, not characters.
for(let i=1;i<=3;i++)assert.equal(run({nonce:'LIMIT_A_'+i,damage:1}).costSeals,1);
assert.equal(roster('GX11_MAIN','GX11_A'),'4:0');
fail({nonce:'LIMIT_A_5',damage:1},'gx11_seals_exhausted');
assert.equal(run({nonce:'LIMIT_A_DAY8',damage:1,now:stampWeek2}).costSeals,1);
assert.equal(roster('GX11_MAIN','GX11_A'),'5:0');

// All seven required gates + 3/6 exploration Orders from one fake account.
// Normalized node phase transitions are attached ONLY to 3 named guardians.
const orderGuild='GX11_ORDERS',orderAccount='GX11_G';
const attack=(n,nonce,now=stampWeek1)=>run({
 guild:orderGuild,account:orderAccount,node:n,nonce,damage:1000,now
});
const explore=(n,nonce,now=stampWeek1)=>run({
 guild:orderGuild,account:orderAccount,node:n,nonce,kind:'exploration',
 damage:0,now
});
for(const [i,n] of ['C1-04','C1-06','C2-01','C2-05'].entries()){
 assert.equal(attack(n,'PATH_W1_'+i).costSeals,1);
}
for(const [i,n] of ['C1-02','C1-05','C2-02'].entries()){
 assert.equal(explore(n,'ORD_W1_'+i).costOrders,1);
}
fail({guild:orderGuild,account:orderAccount,node:'C2-03',nonce:'ORD_LIMIT',
 kind:'exploration',damage:0},'gx11_orders_exhausted');
for(const [i,n] of ['C2-06','C3-01','C3-06'].entries()){
 assert.equal(attack(n,'PATH_W2_'+i,stampWeek2).costSeals,1);
}
for(const [i,n] of ['C2-03','C3-02','C3-04'].entries()){
 assert.equal(explore(n,'ORD_W2_'+i,stampWeek2).costOrders,1);
}
assert.equal(roster(orderGuild,orderAccount),'7:6');
assert.equal(scalar("bool_and(cleared)::text FROM guild_exp_v11_qa.nodes WHERE guild_id='GX11_ORDERS'"+
 " AND required"),'true');
assert.equal(scalar("sum(jsonb_array_length(phase_log)) FROM guild_exp_v11_qa.nodes WHERE guild_id='GX11_ORDERS'"+
 " AND kind IN ('guardian','final')"),'6');
assert.equal(scalar("sum(jsonb_array_length(phase_log)) FROM guild_exp_v11_qa.nodes WHERE guild_id='GX11_ORDERS'"+
 " AND kind='combat'"),'0');

// Shared Pressure caps at 100. Guard and Rally reduce it with their
// representative provisional deltas; no fabricated cross-character healing.
for(const a of ['H','I','J','K','L','M','N','O','P','Q']){
 run({guild:'GX11_PRESSURE',account:'GX11_'+a,nonce:'PRESSURE_'+a,damage:1});
}
assert.equal(totals('GX11_PRESSURE').pressure,100);
run({guild:'GX11_PRESSURE',account:'GX11_R',nonce:'PRESSURE_GUARD',
 stance:'Guard',damage:1});
assert.equal(totals('GX11_PRESSURE').pressure,84);
run({guild:'GX11_PRESSURE',account:'GX11_S',nonce:'PRESSURE_RALLY',
 stance:'Rally',damage:1});
assert.equal(totals('GX11_PRESSURE').pressure,72);

const metrics={
 source:'ephemeral PostgreSQL 17 CI service',realIndependentSqlProcesses:true,
 guilds:5,nodes:90,requestReceipts:count('receipts',"cycle_id='GX11_CYCLE'"),
 concurrentSameTargetNoDoubleDebit:true,crossGuildBindRaceUnique:true,
 sameNonceReplayWithoutLedgerMutation:true,preCommitRollback:true,
 guildPhaseTransitions:6,sharedPressureClamp:true,
 firstWeekSeals:4,totalSeals:8,firstWeekOrders:3,totalOrders:6,
 actualGameplayActorVerification:false,publicFunctionEnabled:false,
 existingGuildTablesTouched:false,supabaseSchemaApplied:false,
 combatInputs:'TEST-ONLY synthetic trusted deltas',
 rewardGrants:0,inventoryDebits:0
};
console.log('GUILD_PVE_V11_POSTGRES='+JSON.stringify(metrics));
