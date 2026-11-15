/**
 * Guild PvE V10 PostgreSQL persistence TEST ONLY.
 * PGlite 0.5.8 writes to a temporary local filesystem; no Supabase secrets,
 * no real users, no network calls, no live guild data and no wallet grants.
 * PGlite single connection does NOT verify cross-worker row lock behavior.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const requireBackend=createRequire(new URL('../backend/package.json',import.meta.url));
const modulePath=requireBackend.resolve('@electric-sql/pglite');
const {PGlite}=await import(modulePath);
assert.equal(typeof PGlite.create,'function','PGlite must support async initialization');
const {GuildPveV10SqlAtomicPort,GUILD_PVE_V10_LIVE}=
 requireBackend('./dist-v10/server/combat/guild-pve-pg-v10.js');
const {GuildPveV9TransactionService,makeGuildPveV9Run,registerGuildPveV9TestRun}=
 requireBackend('./dist-v10/server/combat/guild-pve-transaction-v9.js');
const {makeGuildPveReferenceV7}=
 requireBackend('./dist-v10/server/combat/guild-pve-broken-forge-v7.js');
const {launchPlayer}=requireBackend('./dist-v10/server/combat/content/launch-combat.js');

assert.equal(GUILD_PVE_V10_LIVE,false);
const baseDir=mkdtempSync(join(tmpdir(),'veldryn-guild-pve-v10-'));
const dbPath=join(baseDir,'postgres-data');
const SQL=readFileSync(join(root,'tools/guild-pve-v10-pglite-qa-schema.sql'),'utf8');
const START=Date.UTC(2026,10,16,0,0,0);
const DAY=86400000;
const CYCLE='GUILD_PVE_V10_NOV16';
const sha=s=>createHash('sha256').update(s).digest('hex');
const reference=attack=>makeGuildPveReferenceV7('T2',{
 attack,defense:620,maxHp:4100
});
function profile(account,character,klass){
 const player=launchPlayer(klass,25);
 return {characterId:character,gameRevision:1,sourceHash:sha(account+':'+character),
  actor:{...player,id:character,classId:klass}};
}
const owners=new Map();
for(const [account,character,klass] of [
 ['ACCT_V10_A','CHAR_V10_A','Ironwarden'],
 ['ACCT_V10_A','CHAR_V10_ALT','Wayfinder'],
 ['ACCT_V10_B','CHAR_V10_B','Ravager'],
 ['ACCT_V10_C','CHAR_V10_C','Dawnkeeper'],
 ['ACCT_V10_D','CHAR_V10_D','Hexweaver'],
])owners.set(account+':'+character,profile(account,character,klass));
const loader={
 async resolveOwnedActor(account,character){
  const verified=owners.get(account+':'+character);
  if(!verified)throw Error('guild_pve_v10_not_owned');
  return verified;
 }
};
/** PGlite only supports one connection in this test. The queue below is a
 * TEST DRIVER EXCLUSIVE CONNECTION, not cross-worker locking proof.
 */
function localPool(pg,options={}){
 let pending=Promise.resolve();
 let failSerialization=options.failSerialization??0;
 let loseCommitAck=options.loseCommitAck??0;
 let released=0;
 let failures=0;
 return {
  get metrics(){return {released,failures,failSerialization,loseCommitAck}},
  async connect(){
   let unlock;
   const previous=pending;
   pending=new Promise(resolve=>{unlock=resolve;});
   await previous;
   let done=false;
   return {
    async query(sql,params=[]){
     if(failSerialization>0&&sql.startsWith('SELECT payload')){
      failSerialization--;failures++;
      const error=new Error('synthetic serialization failure');
      error.code='40001';
      throw error;
     }
     const res=await pg.query(sql,[...params]);
     if(loseCommitAck>0&&sql==='COMMIT'){
      loseCommitAck--;failures++;
      throw Error('guild_pve_v10_lost_commit_ack');
     }
     return {rows:res.rows};
    },
    release(){if(!done){done=true;released++;unlock();}}
   };
  }
 };
}
const cmd=(guild,character,request,node='C1-04',stance='Assault')=>({
 cycleId:CYCLE,guildId:guild,characterId:character,requestId:request,
 nodeId:node,kind:'battle',stance
});
const principal=(account,now=START+DAY)=>({principalAccountId:account,nowUtcMs:now});
const expectReject=async(fn,code)=>{
 let caught=false;
 try{await fn()}catch(e){caught=String(e).includes(code)}
 assert.ok(caught,'expected '+code);
};
let db;
const outputs={fixture:'filesystem PGlite 0.5.8',databaseReopened:false,
 persistedReceiptReplay:false,afterCommitAckLoss:false,
 retry40001:false,rolledBackAfterThrow:false,concurrentStale:false,
 boundAccount:true,liveProjectTouched:false};
try{
 db=await PGlite.create(dbPath);
 await db.exec(SQL);
 let driver=localPool(db);
 let port=new GuildPveV10SqlAtomicPort(driver);
 await port.seedEmptyState();
 const guild='GUILD_V10_MAIN',raceGuild='GUILD_V10_RACE';
 await registerGuildPveV9TestRun(port,makeGuildPveV9Run({
  cycleId:CYCLE,guildId:guild,startMs:START,difficulty:'Scout',
  reference:reference(5000),accountIds:['ACCT_V10_A','ACCT_V10_B'],
 }));
 await registerGuildPveV9TestRun(port,makeGuildPveV9Run({
  cycleId:CYCLE,guildId:raceGuild,startMs:START,difficulty:'Scout',
  reference:reference(1),accountIds:['ACCT_V10_C','ACCT_V10_D'],
 }));
 const server=new GuildPveV9TransactionService(port,loader);
 const initial=await server.commit(principal('ACCT_V10_A'),cmd(guild,'CHAR_V10_A','V10_COMMIT_ONE'));
 assert.equal(initial.status,'committed');
 assert.equal(initial.costSeals,1);
 assert.equal(initial.inventorySpent,false);
 assert.equal(initial.databasePersisted,false,'V9 receipt field still marks no production persistence');
 const after=await port.inspect();
 assert.equal(Object.keys(after.payload.receipts).length,1);
 assert.equal(after.payload.guildRuns[JSON.stringify([CYCLE,guild])].members['ACCT_V10_A'].sealsSpent,1);
 // A POST-COMMIT connection error cannot erase a committed ledger entry.
 const lost=localPool(db,{loseCommitAck:1});
 const lostPort=new GuildPveV10SqlAtomicPort(lost);
 const lostService=new GuildPveV9TransactionService(lostPort,loader);
 await expectReject(()=>lostService.commit(principal('ACCT_V10_A'),
  cmd(guild,'CHAR_V10_ALT','V10_LOST_ACK','C1-04','Guard')), 'lost_commit_ack');
 const afterLost=await port.inspect();
 assert.equal(afterLost.payload.guildRuns[JSON.stringify([CYCLE,guild])].members['ACCT_V10_A'].sealsSpent,2);
 const lostReplayed=await server.commit(principal('ACCT_V10_A',START+15*DAY),
  cmd(guild,'CHAR_V10_ALT','V10_LOST_ACK','C1-04','Guard'));
 assert.equal(lostReplayed.status,'committed');
 assert.equal(lostReplayed.costSeals,1);
 assert.equal((await port.inspect()).revision,afterLost.revision+1,
  'replay itself records no extra Seal; adapter QA row revision is bookkeeping');
 outputs.afterCommitAckLoss=true;
 // A transient serialization error must abort+retry whole decision.
 const transient=localPool(db,{failSerialization:1});
 const transientPort=new GuildPveV10SqlAtomicPort(transient);
 const viaTransient=new GuildPveV9TransactionService(transientPort,loader);
 const recovered=await viaTransient.commit(principal('ACCT_V10_B'),
  cmd(guild,'CHAR_V10_B','V10_RETRY_40001'));
 assert.equal(recovered.status,'committed');
 assert.equal(transient.metrics.failures,1);
 assert.equal((await port.inspect()).payload.guildRuns[JSON.stringify([CYCLE,guild])].members['ACCT_V10_B'].sealsSpent,1);
 outputs.retry40001=true;
 // Force an exception during a callback, after it modifies its private view.
 const beforeAbort=await port.inspect();
 await expectReject(()=>port.transaction(async state=>{
  const key=JSON.stringify([CYCLE,guild]);
  state.guildRuns[key].pressure=77;
  state.guildRuns[key].members['ACCT_V10_A'].sealsSpent=8;
  throw Error('v10_intentionally_aborted');
 }), 'v10_intentionally_aborted');
 assert.deepEqual(await port.inspect(),beforeAbort);
 outputs.rolledBackAfterThrow=true;
 // Concurrent services against the same (serialized PGlite) connection.
 const another=new GuildPveV9TransactionService(
  new GuildPveV10SqlAtomicPort(driver),loader);
 const [one,two]=await Promise.all([
  server.commit(principal('ACCT_V10_C'),
   cmd(raceGuild,'CHAR_V10_C','V10_RACE_C')),
  another.commit(principal('ACCT_V10_D'),
   cmd(raceGuild,'CHAR_V10_D','V10_RACE_D')),
 ]);
 assert.equal(one.status,'committed');
 assert.equal(two.status,'stale');
 assert.equal(two.costSeals,0);
 outputs.concurrentStale=true;
 // Binding is isolated across guilds but unique within a cycle.
 await registerGuildPveV9TestRun(port,makeGuildPveV9Run({
  cycleId:CYCLE,guildId:'GUILD_V10_SECOND',startMs:START,
  difficulty:'Scout',reference:reference(1),accountIds:['ACCT_V10_A'],
 }));
 await expectReject(()=>server.commit(principal('ACCT_V10_A'),
  cmd('GUILD_V10_SECOND','CHAR_V10_A','V10_CROSS_GUILD')),
  'already_bound_to_other_guild');
 const snapshotBeforeReopen=await port.inspect();
 await db.close();db=null;
 // This is genuine filesystem-backed embedded PostgreSQL persistence.
 db=await PGlite.create(dbPath);
 driver=localPool(db);
 port=new GuildPveV10SqlAtomicPort(driver);
 const reopened=await port.inspect();
 assert.deepEqual(reopened,snapshotBeforeReopen);
 outputs.databaseReopened=true;
 const resumed=new GuildPveV9TransactionService(port,loader);
 const replay=await resumed.commit(principal('ACCT_V10_A',START+15*DAY),
  cmd(guild,'CHAR_V10_A','V10_COMMIT_ONE'));
 assert.deepEqual(replay,initial,'saved reel/receipt remains after DB reopen');
 assert.deepEqual(await port.inspect(),reopened,'retry after reopen is read-only logically');
 outputs.persistedReceiptReplay=true;
 console.log('GUILD_PVE_V10_PGLITE='+JSON.stringify({
  ...outputs,records:Object.keys(reopened.payload.receipts).length,
  physicalRevision:reopened.revision,
  actualMultiWorkerPostgres:false,productionReady:false,
  testSchema:'guild_pve_v10_qa (local only)',
  committedRewards:0,spentInventory:0
 }));
}finally{
 if(db)await db.close();
 rmSync(baseDir,{recursive:true,force:true});
}
