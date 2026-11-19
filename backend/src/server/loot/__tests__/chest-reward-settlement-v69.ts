import {
 CHEST_REWARD_SETTLEMENT_V69_RELEASED,
 createChestRewardSettlementV69,deriveChestSettlementRollsV69,
 type FrozenChestReceiptV69,type ChestGrantTransactionV69,
 type ChestGrantStoreV69,type TrustedChestSourceV69,
} from '../chest-reward-settlement-v69';
import {defineChestLootTableV67} from '../chest-loot-engine-v67';
import {deriveServerChestRollsV1} from '../event-chest-server-roll-v1';
import {partyChestLootTableV68} from '../../party/weekly-party-event-chests-v51';
import {worldBossChestLootTableV68} from '../../combat/world-boss-chests-v58';

function check(ok:unknown,reason:string):asserts ok{
 if(!ok)throw Error('chest_v69_test:'+reason);
}
async function throws(fn:()=>Promise<unknown>,message:string){
 let caught=false;
 try{await fn()}catch(error){caught=String(error).includes(message)}
 check(caught,'reject_'+message);
}
const account='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const character='33333333-3333-4333-8333-333333333333';
const source='seasonal-event:2026_11_16:'+account+':chest_1';
const secret=new Uint8Array(32).fill(19);
const table=defineChestLootTableV67({
 tableId:'future_event_chest',version:'winter_event_v1',
 guarantees:[{id:'gold',quantity:400},{id:'season_token',quantity:3}],
 groups:[
  {id:'material',type:'material',chanceBps:10000,
   duplicatePolicy:'allow_duplicates',entries:[
    {id:'ORE',weight:1,quantity:4},{id:'FISH',weight:2,quantity:3},
   ]},
  {id:'pet',type:'pet',chanceBps:10000,
   duplicatePolicy:'prefer_unowned',entries:[
    {id:'PET_TEST_A',weight:1},{id:'PET_TEST_B',weight:1},
   ]},
 ],
});
interface FakeState{
 receipts:Map<string,FrozenChestReceiptV69>;
 guaranteed:Map<string,string>;
 drops:Map<string,string[]>;
 owned:Set<string>;
}
const fresh=():FakeState=>({
 receipts:new Map(),guaranteed:new Map(),drops:new Map(),owned:new Set(),
});
const clone=(s:FakeState):FakeState=>({
 receipts:new Map(s.receipts),guaranteed:new Map(s.guaranteed),
 drops:new Map([...s.drops].map(([k,v])=>[k,[...v]])),
 owned:new Set(s.owned),
});
class MockDb implements ChestGrantStoreV69{
 state:FakeState=fresh();
 readonly audit:string[]=[];
 proof:TrustedChestSourceV69={
  sourceKey:source,accountId:account,proofVersion:'trusted-seasonal-v1',
  earned:true,recipientCharacterId:null,lootTable:table,
 };
 failAfterFirstDrop=false;
 simulateMissingWallet=false;
 committed=0;
 private pending:Promise<void>=Promise.resolve();
 async withLockedAccountSource<T>(
  accountId:string,sourceKey:string,
  work:(tx:ChestGrantTransactionV69)=>Promise<T>,
 ):Promise<T>{
  const previous=this.pending;
  let release:()=>void=()=>{};
  this.pending=new Promise<void>(resolve=>{release=()=>resolve()});
  await previous;
  const draft=clone(this.state);
  this.audit.push('lock:'+sourceKey);
  const tx:ChestGrantTransactionV69={
   readCommittedReceipt:async key=>{
    this.audit.push('read-receipt');
    return draft.receipts.get(key)??null;
   },
   readTrustedSource:async(owner,key)=>{
    this.audit.push('read-proof');
    check(owner===accountId&&key===sourceKey,'proof_caller_bound');
    return this.proof;
   },
   readOwnedDropIds:async()=>{
    this.audit.push('read-owned');
    return [...draft.owned];
   },
   verifyRecipientCharacter:async(owner,target)=>{
    this.audit.push('verify-character');
    return owner===account&&target===character;
   },
   insertFrozenReceipt:async receipt=>{
    this.audit.push('insert-receipt');
    if(draft.receipts.has(receipt.sourceKey))throw Error('unique_violation');
    draft.receipts.set(receipt.sourceKey,receipt);
   },
   creditGuaranteed:async receipt=>{
    this.audit.push('credit-guaranteed');
    check(draft.receipts.has(receipt.sourceKey),'receipt_first');
    if(!this.simulateMissingWallet){
     draft.guaranteed.set(receipt.sourceKey,
      JSON.stringify(receipt.guaranteed));
    }
   },
   grantDrop:async(receipt,index)=>{
    this.audit.push('grant-drop:'+index);
    check(draft.receipts.has(receipt.sourceKey),'receipt_before_drop');
    const entry=receipt.drops[index];
    if(!entry)throw Error('missing_canonical_drop');
    const prior=draft.drops.get(receipt.sourceKey)??[];
    prior.push(entry.entryId+'x'+entry.quantity);
    draft.drops.set(receipt.sourceKey,prior);
    draft.owned.add(entry.entryId);
    if(this.failAfterFirstDrop)throw Error('mock_inventory_write_failed');
   },
   verifyExactlyGranted:async receipt=>{
    this.audit.push('verify-custody');
    return draft.receipts.get(receipt.sourceKey)===receipt&&
     draft.guaranteed.get(receipt.sourceKey)===
      JSON.stringify(receipt.guaranteed)&&
     JSON.stringify(draft.drops.get(receipt.sourceKey)??[])===
      JSON.stringify(receipt.drops.map(d=>d.entryId+'x'+d.quantity));
   },
  };
  try{
   const result=await work(tx);
   this.state=draft;
   this.committed++;
   this.audit.push('commit');
   return result;
  }catch(error){
   this.audit.push('rollback');
   throw error;
  }finally{release()}
 }
}
async function run(){
 check(!CHEST_REWARD_SETTLEMENT_V69_RELEASED,'hidden_only');
 const db=new MockDb();
 const disabled=createChestRewardSettlementV69(db,{secret});
 await throws(()=>disabled({
  authenticatedAccountId:account,sourceKey:source,
 }),'unreleased');
 const open=createChestRewardSettlementV69(db,{secret},true);
 const first=await open({authenticatedAccountId:account,sourceKey:source});
 check(!first.replayed&&first.receipt.committed&&
  first.receipt.tableVersion==='winter_event_v1'&&
  first.receipt.drops.length===2&&
  first.receipt.drops[0]!.quantity>=3&&
  first.receipt.recipientCharacterId===null,
  'first_full_durable_receipt_with_stack_quantities');
 check(db.state.guaranteed.size===1&&db.state.drops.size===1&&
  db.state.owned.size===2,'all_legs_same_transaction');
 check(db.audit.indexOf('insert-receipt')<
  db.audit.indexOf('credit-guaranteed')&&
  db.audit.indexOf('credit-guaranteed')<
  db.audit.indexOf('grant-drop:0'),'receipt_before_grants');
 const previousAudit=db.audit.length;
 db.proof={...db.proof,lootTable:defineChestLootTableV67({
  ...table,version:'winter_event_v2',
  groups:table.groups.map(g=>({...g,chanceBps:0})),
 })};
 const replay=await open({authenticatedAccountId:account,sourceKey:source});
 check(replay.replayed&&replay.receipt===first.receipt&&
  replay.receipt.tableVersion==='winter_event_v1',
  'old_receipt_survives_table_change');
 check(!db.audit.slice(previousAudit).includes('read-proof')&&
  !db.audit.slice(previousAudit).includes('grant-drop:0'),
  'no_reprove_or_reroll_or_regrant_on_replay');
 const concurrent=await Promise.all([
  open({authenticatedAccountId:account,sourceKey:source}),
  open({authenticatedAccountId:account,sourceKey:source}),
 ]);
 check(concurrent.every(r=>r.replayed)&&db.state.receipts.size===1&&
  db.state.guaranteed.size===1,'concurrent_replays_once');
 await throws(()=>open({authenticatedAccountId:other,sourceKey:source}),
  'invalid_authenticated_source');
 const prod=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';
  await throws(()=>open({authenticatedAccountId:account,sourceKey:source}),
   'unreleased');
 }finally{process.env.NODE_ENV=prod;}
 const attempt=(variant:string)=>'seasonal-event:2026_11_23:'+account+':'+variant;
 const startFresh=(k:string)=>{
  const n=new MockDb();
  n.proof={...n.proof,sourceKey:k,lootTable:table};
  return n;
 };
 {
  const key=attempt('failed_item');
  const s=startFresh(key);
  s.failAfterFirstDrop=true;
  await throws(()=>createChestRewardSettlementV69(s,{secret},true)({
   authenticatedAccountId:account,sourceKey:key,
  }),'mock_inventory_write_failed');
  check(s.state.receipts.size===0&&s.state.guaranteed.size===0&&
   s.state.drops.size===0&&s.state.owned.size===0&&
   s.audit.includes('rollback'),'item_failure_full_rollback');
  s.failAfterFirstDrop=false;
  const retry=await createChestRewardSettlementV69(s,{secret},true)({
   authenticatedAccountId:account,sourceKey:key,
  });
  check(!retry.replayed&&s.state.receipts.size===1,
   'safe_retry_after_atomic_rollback');
 }
 {
  const key=attempt('bad_wallet');
  const s=startFresh(key);s.simulateMissingWallet=true;
  await throws(()=>createChestRewardSettlementV69(s,{secret},true)({
   authenticatedAccountId:account,sourceKey:key,
  }),'incomplete_physical_reward');
  check(s.state.receipts.size===0,'missing_wallet_rollback');
 }
 {
  const key=attempt('unearned');
  const s=startFresh(key);s.proof={...s.proof,earned:false as true};
  await throws(()=>createChestRewardSettlementV69(s,{secret},true)({
   authenticatedAccountId:account,sourceKey:key,
  }),'unearned_or_foreign_source');
  check(s.state.receipts.size===0,'unearned_no_receipt');
 }
 {
  const key=attempt('foreign');
  const s=startFresh(key);s.proof={...s.proof,accountId:other};
  await throws(()=>createChestRewardSettlementV69(s,{secret},true)({
   authenticatedAccountId:account,sourceKey:key,
  }),'unearned_or_foreign_source');
 }
 {
  const gear=defineChestLootTableV67({
   tableId:'equipment_event_test',version:'gear_v1',
   guarantees:[],
   groups:[{id:'equipment',type:'equipment',chanceBps:10000,
    duplicatePolicy:'prefer_unowned',entries:[{id:'EQUIPMENT_BOOTS',weight:1}]}],
  });
  const key=attempt('missing_character');
  const s=startFresh(key);
  s.proof={...s.proof,lootTable:gear,recipientCharacterId:null};
  await throws(()=>createChestRewardSettlementV69(s,{secret},true)({
   authenticatedAccountId:account,sourceKey:key,
  }),'unverified_character_destination');
  check(s.state.receipts.size===0,'gear_destination_missing_cannot_claim');
  s.proof={...s.proof,recipientCharacterId:other};
  await throws(()=>createChestRewardSettlementV69(s,{secret},true)({
   authenticatedAccountId:account,sourceKey:key,
  }),'unverified_character_destination');
  check(s.state.receipts.size===0,'foreign_character_cannot_claim');
  s.proof={...s.proof,recipientCharacterId:character};
  const minted=await createChestRewardSettlementV69(s,{secret},true)({
   authenticatedAccountId:account,sourceKey:key,
  });
  check(!minted.replayed&&
   minted.receipt.recipientCharacterId===character&&
   minted.receipt.drops[0]!.entryId==='EQUIPMENT_BOOTS',
   'approved_character_in_frozen_receipt');
  s.proof={...s.proof,recipientCharacterId:other};
  const replay=await createChestRewardSettlementV69(s,{secret},true)({
   authenticatedAccountId:account,sourceKey:key,
  });
  check(replay.replayed&&
   replay.receipt.recipientCharacterId===character,
   'character_switch_cannot_redirect_issued_gear');
 }
 {
  const party=partyChestLootTableV68({
   kind:'participation',difficulty:'standard',family:'nightfall_hunt',
  });
  const partyKey='party-event:'+Date.UTC(2026,10,16)+':'+account+
   ':participation';
  const old=deriveServerChestRollsV1({
   secret,domain:'party_event_v51',committedChestKey:partyKey,
  });
  const resolved=deriveChestSettlementRollsV69(party,partyKey,secret);
  check(resolved.length===1&&resolved[0]!.hitRoll===old.hitRoll&&
   resolved[0]!.selectionRoll===old.pieceRoll,
   'legacy_party_exact_hmac_compatibility');
  const world=worldBossChestLootTableV68({
   bossId:'hollowroot',kind:'donations_goal',
  });
  const worldKey='world-boss:33333333-3333-4333-8333-333333333333:'+
   account+':donations_goal';
  const oldWorld=deriveServerChestRollsV1({
   secret,domain:'world_boss_v58',committedChestKey:worldKey,
  });
  const worldRolls=deriveChestSettlementRollsV69(world,worldKey,secret);
  check(worldRolls.length===1&&
   worldRolls[0]!.hitRoll===oldWorld.hitRoll&&
   worldRolls[0]!.selectionRoll===oldWorld.pieceRoll,
   'legacy_world_exact_hmac_compatibility');
 }
 console.log('CHEST_SETTLEMENT_V69_OK: receipt-first, exact-once multi-drop payouts, replay after table change/key rollover, concurrent source locks, rollback on missing custody, production fence, legacy HMAC parity');
}
run().catch(e=>{console.error(e);throw e;});
