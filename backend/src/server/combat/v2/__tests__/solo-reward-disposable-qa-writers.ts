import {strict as assert} from 'node:assert';
import {disposableQaSoloRewardWritersV2} from '../solo-reward-disposable-qa-writers';
import type {CombatV2RewardSqlTransaction} from '../solo-reward-transactional-store';
import type {SoloRewardGrantV2,SoloRewardReceiptV2} from '../solo-reward-settlement';
const scope={
 accountId:'00000000-0000-4000-a000-000000000011',
 characterId:'00000000-0000-4000-a000-000000000022',
 encounterId:'QA_WRITERS_V2_01',
};
const grants=new Map<string,{
 grant_source_id:string;account_id:string;character_id:string;
 kind:SoloRewardGrantV2['kind'];resource_id:string;amount:string;
}>();
const balances=new Map<string,bigint>();
const inbox=new Map<string,{source_key:string;account_id:string;character_id:string;receipt_digest:string}>();
const tx:CombatV2RewardSqlTransaction={
 async query<Row=Record<string,unknown>>(sql:string,values:readonly unknown[]=[]){
  const rows=(result:unknown[])=>({rows:result as Row[]});
  if(sql.includes('insert into private.combat_v2_reward_qa_sources_v1')){
   const [source,account,character,kind,resource,amount]=values.map(String);
   if(grants.has(source))return rows([]);
   const item={grant_source_id:source,account_id:account,character_id:character,
    kind:kind as SoloRewardGrantV2['kind'],resource_id:resource,amount};
   grants.set(source,item);return rows([item]);
  }
  if(sql.includes('from private.combat_v2_reward_qa_sources_v1'))
   return rows(grants.has(String(values[0]))?[grants.get(String(values[0]))]:[]);
  if(sql.includes('insert into private.combat_v2_reward_qa_balances_v1')){
   const [account,character,kind,resource,amount]=values.map(String);
   const key=[account,character,kind,resource].join('|');
   const value=(balances.get(key)??0n)+BigInt(amount);
   balances.set(key,value);return rows([{balance:value.toString()}]);
  }
  if(sql.includes('insert into private.combat_v2_reward_qa_inbox_v1')){
   const [source,account,character,digest]=values.map(String);
   if(inbox.has(source))return rows([]);
   const entry={source_key:source,account_id:account,character_id:character,
    receipt_digest:digest};
   inbox.set(source,entry);return rows([entry]);
  }
  if(sql.includes('from private.combat_v2_reward_qa_inbox_v1'))
   return rows(inbox.has(String(values[0]))?[inbox.get(String(values[0]))]:[]);
  throw Error('Unexpected SQL '+sql);
 },
};
const sourceKey='combat-v2:solo:'+scope.encounterId;
const receipt={
 sourceKey,accountId:scope.accountId,characterId:scope.characterId,
 encounterId:scope.encounterId,receiptDigest:'a'.repeat(64),
} as SoloRewardReceiptV2;
async function run(){
 assert.throws(()=>disposableQaSoloRewardWritersV2(),/disabled/);
 const writers=disposableQaSoloRewardWritersV2(true);
 const kinds=[
  ['gold','gold'],['skill_xp','combat'],['companion_essence','essence'],['material','ore'],
 ] as const;
 const all:SoloRewardGrantV2[]=kinds.map(([kind,resourceId],i)=>({
  kind,resourceId,amount:i+1,grantSourceId:sourceKey+':'+i,
 }));
 for(const grant of all){
  const proof=await writers.applyGrant(tx,scope,grant);
  assert.deepEqual(proof,{grantSourceId:grant.grantSourceId,kind:grant.kind,
   resourceId:grant.resourceId,amount:grant.amount});
 }
 assert.equal(grants.size,4);assert.equal(balances.size,4);
 const balancesBefore=[...balances.entries()];
 for(const grant of all)
  await writers.applyGrant(tx,scope,grant);
 assert.deepEqual([...balances.entries()],balancesBefore,'Source replay must not credit twice');
 await assert.rejects(writers.applyGrant(tx,scope,{...all[0],amount:500}),
  /grant_provenance_mismatch/,'Conflicting source amount must fail');
 await assert.rejects(writers.applyGrant(tx,{...scope,accountId:'00000000-0000-4000-a000-000000000099'},all[0]),
  /grant_provenance_mismatch/,'Cross-account existing sources must reject');
 const box=await writers.appendInbox(tx,scope,receipt);
 assert.deepEqual(box,{sourceKey,accountId:scope.accountId,characterId:scope.characterId});
 await writers.appendInbox(tx,scope,receipt);
 assert.equal(inbox.size,1);
 await assert.rejects(writers.appendInbox(tx,scope,{...receipt,receiptDigest:'b'.repeat(64)}),
  /inbox_provenance_mismatch/);
 await assert.rejects(writers.appendInbox(tx,scope,{...receipt,sourceKey:'other'}),
  /invalid_inbox_scope/);
 assert.equal(grants.size,4);assert.equal(balances.size,4);assert.equal(inbox.size,1);
 console.log('PASS: 4 QA reward channels, source-unique credits, Inbox readback, forged scope and receipt rejection');
}
void run().catch(error=>{console.error(error);process.exitCode=1;});
