/**
 * Hidden Guild PvE V18: actual filesystem-backed PGlite persistence.
 * ONE local connection. Not a production adapter, multi-worker PostgreSQL
 * proof, authoritative auth route or Supabase migration.
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
const pm=await import(modulePath);
const PGlite=pm.PGlite??pm.default?.PGlite??pm.default;
assert.equal(typeof PGlite?.create,'function');
const {GuildPveV18PgliteAtomicPort,GUILD_PVE_V18_PGLITE_LIVE}=
 requireBackend('./dist-v18/server/combat/guild-pve-pglite-v18.js');
const {GuildPveV18SettlementService}=
 requireBackend('./dist-v18/server/combat/guild-pve-settlement-v18.js');
const {reviewGuildPveV18Reward}=
 requireBackend('./dist-v18/server/combat/guild-pve-reward-review-v18.js');
const {makeGuildPveV9Run}=
 requireBackend('./dist-v18/server/combat/guild-pve-transaction-v9.js');
const {makeGuildPveReferenceV7}=
 requireBackend('./dist-v18/server/combat/guild-pve-broken-forge-v7.js');
const {launchPlayer}=
 requireBackend('./dist-v18/server/combat/content/launch-combat.js');

assert.equal(GUILD_PVE_V18_PGLITE_LIVE,false);
const base=mkdtempSync(join(tmpdir(),'veldryn-pve-v18-'));
const dbPath=join(base,'qa-postgres-data');
const schema=readFileSync(join(root,'tools/guild-pve-v18-pglite-schema.sql'),'utf8');
const sha=(x)=>createHash('sha256').update(x).digest('hex');
const START=Date.UTC(2026,10,16),DAY=86_400_000,
 CYCLE='GX_V18_PG_CYCLE',GUILD='GX_V18_PG_GUILD',
 A='GX_V18_PG_ACC_A',B='GX_V18_PG_ACC_B',
 CHAR_A='GX_V18_PG_CHAR_A',CHAR_B='GX_V18_PG_CHAR_B';
const ref=makeGuildPveReferenceV7('T2',{
 attack:1000,defense:650,maxHp:4500,
});
const actor=(account,char,klass)=>{
 const p=launchPlayer(klass,25);
 return {actor:{...p,id:char,classId:klass},
  characterId:char,gameRevision:7,
  sourceHash:sha(account+':'+char),
 };
};
const trusted=new Map([
 [A+':'+CHAR_A,actor(A,CHAR_A,'Ironwarden')],
 [B+':'+CHAR_B,actor(B,CHAR_B,'Dawnkeeper')],
]);
const authority={
 async verifyOwnedGuildActor({principalAccountId,guildId,characterId}){
  if(guildId!==GUILD)throw Error('not_owned_guild');
  const result=trusted.get(principalAccountId+':'+characterId);
  if(!result)throw Error('not_owned_character');
  return structuredClone(result);
 }
};
function state(){
 const run=makeGuildPveV9Run({
  cycleId:CYCLE,guildId:GUILD,startMs:START,
  accountIds:[A,B],difficulty:'Scout',reference:ref,
 });
 return {
  guild:{guildRuns:{[JSON.stringify([CYCLE,GUILD])]:run},
   cycleBindings:{},receipts:{}},
  charges:{[JSON.stringify([CYCLE,GUILD])]:{
   shrineChoice:null,protection:0,cleanse:0,insight:0,
  }},
  receipts:{},
 };
}
function pool(pg,opts={}){
 let pending=Promise.resolve(),released=0,fail40001=opts.fail40001??0,
  loseAck=opts.loseAck??0;
 return {
  get metrics(){return {released,fail40001,loseAck}},
  async connect(){
   let unlock;
   const prev=pending;
   pending=new Promise(resolve=>{unlock=resolve;});
   await prev;
   let done=false;
   return {
    async query(sql,args=[]){
     if(sql.startsWith('SELECT payload')&&fail40001>0){
      fail40001--;const err=new Error('injected 40001');err.code='40001';throw err;
     }
     const result=await pg.query(sql,[...args]);
     if(sql==='COMMIT'&&loseAck>0){
      loseAck--;throw Error('lost_ack_after_sql_commit');
     }
     return {rows:result.rows};
    },
    release(){if(!done){done=true;released++;unlock();}},
   };
  },
 };
}
const ask=(service,who,char,nonce,at=START+DAY,stance='Assault')=>
 service.attack({principalAccountId:who,nowUtcMs:at},{
  cycleId:CYCLE,guildId:GUILD,characterId:char,
  requestId:nonce,nodeId:'C1-04',stance,
 });
const reject=async(fn,code)=>{
 let s='';try{await fn()}catch(e){s=String(e)}
 assert.ok(s.includes(code),'expected '+code+', got '+s);
};
let db;
try {
 db=await PGlite.create(dbPath);
 await db.exec(schema);
 let connect=pool(db),port=new GuildPveV18PgliteAtomicPort(connect);
 await port.seedInitialState(state());
 let service=new GuildPveV18SettlementService(port,authority);
 const first=await ask(service,A,CHAR_A,'GX_PG_R1');
 assert.equal(first.status,'committed');
 assert.equal(first.sealDebit,1);
 assert.equal(first.walletWritten,false);
 assert.equal(first.actorSourceHash.length,64);
 const beforeAck=await port.inspect();
 assert.equal(beforeAck.revision,1);
 assert.equal(Object.keys(beforeAck.state.receipts).length,1);
 const lostPool=pool(db,{loseAck:1});
 const lostPort=new GuildPveV18PgliteAtomicPort(lostPool);
 const lostService=new GuildPveV18SettlementService(lostPort,authority);
 await reject(()=>ask(lostService,B,CHAR_B,'GX_PG_LOST_ACK'),'lost_ack_after_sql_commit');
 const afterAck=await port.inspect();
 assert.equal(afterAck.revision,2);
 assert.equal(afterAck.state.guild.guildRuns[JSON.stringify([CYCLE,GUILD])]
  .members[B].sealsSpent,1);
 const replayAfterAck=await ask(service,B,CHAR_B,'GX_PG_LOST_ACK',START+15*DAY);
 assert.equal(replayAfterAck.status,'committed');
 assert.equal((await port.inspect()).revision,2);
 await reject(()=>ask(service,B,CHAR_B,'GX_PG_LOST_ACK',START+15*DAY,'Guard'),
  'nonce_conflict');
 const retryPool=pool(db,{fail40001:1});
 const retryService=new GuildPveV18SettlementService(
  new GuildPveV18PgliteAtomicPort(retryPool),authority);
 const retryReceipt=await ask(retryService,A,CHAR_A,'GX_PG_SERIALIZABLE');
 assert.equal(retryReceipt.status,'committed');
 assert.equal(retryPool.metrics.fail40001,0);
 const beforeAbort=await port.inspect();
 await reject(()=>port.transaction(async state=>{
  const run=state.guild.guildRuns[JSON.stringify([CYCLE,GUILD])];
  run.pressure=100;state.charges[JSON.stringify([CYCLE,GUILD])].protection=2;
  throw Error('intentional_rollback');
 }), 'intentional_rollback');
 assert.deepEqual(await port.inspect(),beforeAbort);
 const partial=reviewGuildPveV18Reward({
  state:beforeAbort.state,cycleId:CYCLE,guildId:GUILD,accountId:A,
 });
 assert.equal(partial.band,'partial_review');
 assert.equal(partial.canClaim,false);
 assert.equal(partial.tokenAmount,null);
 assert.equal(partial.guildXpAmount,null);
 assert.equal(partial.rewardGranted,false);
 const saved=await port.inspect();
 await db.close();db=null;
 db=await PGlite.create(dbPath);
 connect=pool(db);port=new GuildPveV18PgliteAtomicPort(connect);
 assert.deepEqual(await port.inspect(),saved);
 service=new GuildPveV18SettlementService(port,authority);
 assert.deepEqual(await ask(service,A,CHAR_A,'GX_PG_R1',START+15*DAY),first);
 assert.deepEqual(await port.inspect(),saved);
 assert.equal(connect.metrics.released>0,true);
 console.log('GUILD_PVE_V18_PGLITE='+JSON.stringify({
  result:'PASS',realEmbeddedPostgres:true,
  durableReopen:true,lostCommitAckReplay:true,
  retry40001:true,rollback:true,savedReceipts:Object.keys(saved.state.receipts).length,
  persistedRevision:saved.revision,
  walletWrites:0,rewardGrants:0,supabaseTouched:false,
  normalizedMultiWorker:false,productionReady:false,
 }));
}finally{
 if(db)await db.close();
 rmSync(base,{recursive:true,force:true});
}
