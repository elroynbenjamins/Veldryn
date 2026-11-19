import {
 PARTY_EVENT_REWARD_GATEWAY_V60_RELEASED,claimPartyEventChestV60,
 exchangePartyEventGearV60,
 type PartyEventRewardReceiptV60,type PartyEventRewardStoreV60,
 type PartyEventRewardTransactionV60,type ServerPartyRewardAuthorityV60,
 type FrozenPartyGearGrantV60,
} from '../weekly-party-event-claim-v60';
import {deriveServerChestRollsV1} from '../../loot/event-chest-server-roll-v1';
import {partyEventGearForFamilyV51} from '../weekly-party-event-gear-v51';
import type {VerifiedPartyChestEvidenceV51} from '../weekly-party-event-chests-v51';

function ensure(ok:unknown,label:string):asserts ok{
 if(!ok)throw Error('party_event_claim_v60_test:'+label);
}
async function rejects(fn:()=>Promise<unknown>,fragment:string){
 let failed=false;try{await fn();}catch(e){failed=String(e).includes(fragment);}
 ensure(failed,'expected_'+fragment);
}
const week=Date.UTC(2026,10,16);
const account='11111111-1111-4111-8111-111111111111';
const authority:ServerPartyRewardAuthorityV60={
 accountId:account,eventStartsAtUtcMs:week,
 secret:new Uint8Array(32).fill(11),source:'private_service_worker',
};
const evidence:VerifiedPartyChestEvidenceV51={
 accountId:account,eventStartsAtUtcMs:week,family:'broken_caravan',
 difficulty:'standard',personalPoints:25,
 contributedToPreparation:true,optionalPreparationGoalCompleted:true,
 verifiedFinaleVictory:true,eligibleGearTier:3,
};
type State={
 receipts:Map<string,PartyEventRewardReceiptV60>;
 balance:number; gold:number;dust:number;essence:number;
 inventory:Map<string,FrozenPartyGearGrantV60>;
 ownedPieceIds:string[];mints:number;writes:number;
};
function clone(s:State):State{return {...s,receipts:new Map(s.receipts),
 inventory:new Map(s.inventory),ownedPieceIds:[...s.ownedPieceIds]};}
class MockStore implements PartyEventRewardStoreV60{
 state:State={receipts:new Map(),balance:60,gold:0,dust:0,essence:0,
  inventory:new Map(),ownedPieceIds:[],mints:0,writes:0};
 failOnResource=false;
 foreignEvidence=false;
 pointsOverride:number|null=null;
 invalidMint=false;
 private pending:Promise<void>=Promise.resolve();
 async withLockedAccountWeek<T>(
  accountId:string,weekStartMs:number,work:(tx:PartyEventRewardTransactionV60)=>Promise<T>,
 ):Promise<T>{
  ensure(accountId===account&&weekStartMs===week,'auth_lock_identity');
  const op=this.pending.then(async ()=>{
   const snapshot=clone(this.state);
   const tx:PartyEventRewardTransactionV60={
    readVerifiedEvidence:async()=>this.foreignEvidence?
     {...evidence,accountId:'33333333-3333-4333-8333-333333333333'}:
     this.pointsOverride===null?evidence:{...evidence,personalPoints:this.pointsOverride},
    readOwnedPartyGearPieceIds:async()=>[...snapshot.ownedPieceIds],
    readPartySigilsBalance:async()=>snapshot.balance,
    readReceipt:async key=>snapshot.receipts.get(key)??null,
    mintExactEquipmentV2:async ({sourceKey,piece,tier})=>{
     snapshot.mints++;
     return {itemInstanceId:this.invalidMint?'bad':(
      '44444444-4444-4444-8444-'+String(snapshot.mints).padStart(12,'0')),
      pieceId:piece.id,tier,exactItemReceiptVersion:'equipment-v2-authoritative-frozen'};
    },
    insertReceiptOnce:async receipt=>{
     if(snapshot.receipts.has(receipt.sourceKey))throw Error('duplicate_source');
     snapshot.receipts.set(receipt.sourceKey,receipt);snapshot.writes++;
    },
    applyPartySigilsDelta:async (_source,delta)=>{
     if(snapshot.balance+delta<0)throw Error('overspend');
     snapshot.balance+=delta;
    },
    grantExistingResources:async (_source,r)=>{
     if(this.failOnResource)throw Error('simulated_resource_outage');
     snapshot.gold+=r.gold;snapshot.dust+=r.gemDust;
     snapshot.essence+=r.companionEssence;
    },
    grantFrozenEquipment:async (_source,item)=>{
     if(snapshot.inventory.has(item.itemInstanceId))throw Error('duplicate_instance');
     snapshot.inventory.set(item.itemInstanceId,item);
     snapshot.ownedPieceIds.push(item.pieceId);
    },
   };
   const result=await work(tx);
   this.state=snapshot; // Atomically visible after all effects succeed.
   return result;
  });
  this.pending=op.then(()=>undefined,()=>undefined);
  return op;
 }
}
async function run(){
 ensure(!PARTY_EVENT_REWARD_GATEWAY_V60_RELEASED,'feature_off');
 const store=new MockStore();
 const state=()=>store.state;
 await rejects(()=>claimPartyEventChestV60({
  authority,kind:'participation',store,
 }),'hidden_gateway_disabled');
 const nodeEnv=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';
  await rejects(()=>claimPartyEventChestV60({
   authority,kind:'participation',store,
  },true),'hidden_gateway_disabled');
 }finally{process.env.NODE_ENV=nodeEnv;}
 store.failOnResource=true;
 await rejects(()=>claimPartyEventChestV60({
  authority,kind:'participation',store,
 },true),'simulated_resource_outage');
 ensure(state().receipts.size===0&&state().balance===60&&
  state().gold===0&&state().inventory.size===0,
  'failed_transaction_rolled_back_entirely');
 store.failOnResource=false;
 const [first,replay]=await Promise.all([
  claimPartyEventChestV60({authority,kind:'participation',store},true),
  claimPartyEventChestV60({authority,kind:'participation',store},true),
 ]);
 ensure(first===replay&&first.origin==='chest'&&
  first.partySigilsDelta===8,'same_frozen_receipt_on_concurrent_replay');
 ensure(state().receipts.size===1&&state().writes===1&&
  state().balance===68&&state().gold===200,
  'one_receipt_one_currency_credit');
 ensure(state().dust===2&&state().essence===4,'existing_resources_once');
 const key='party-event:'+week+':'+account+':participation';
 const hit=deriveServerChestRollsV1({
  domain:'party_event_v51',committedChestKey:key,secret:authority.secret,
 }).hitRoll<1200;
 ensure(Boolean(first.frozenGear)===hit&&state().mints===(hit?1:0),
  'only_secure_gear_hit_mints');
 // Mutating entropy after a successful receipt must never reroll the item.
 const rotated={...authority,secret:new Uint8Array(32).fill(19)};
 const rotatedReplay=await claimPartyEventChestV60({
  authority:rotated,kind:'participation',store,
 },true);
 ensure(rotatedReplay===first&&state().writes===1,'key_rotation_keeps_frozen_receipt');
 await claimPartyEventChestV60({authority,kind:'preparation',store},true);
 await claimPartyEventChestV60({authority,kind:'finale',store},true);
 ensure(state().receipts.size===3&&state().balance===94&&
  state().gold===1000&&state().dust===10&&state().essence===17,
  'three_chest_max_and_correct_rewards');
 const target=partyEventGearForFamilyV51(evidence.family)
  .find(x=>!state().ownedPieceIds.includes(x.id))!;
 const exchanged=await exchangePartyEventGearV60({
  authority,requestedPieceId:target.id,store,
 },true);
 ensure(exchanged.partySigilsDelta===-60&&exchanged.pieceId===target.id&&
  state().balance===34&&state().receipts.size===4,
  'one_targeted_exchange_spends_existing_wallet');
 const replayExchange=await exchangePartyEventGearV60({
  authority,requestedPieceId:target.id,store,
 },true);
 ensure(replayExchange===exchanged&&state().balance===34,
  'repeat_exchange_does_not_pay_twice');
 const other=partyEventGearForFamilyV51(evidence.family).find(x=>x.id!==target.id)!;
 await rejects(()=>exchangePartyEventGearV60({
  authority,requestedPieceId:other.id,store,
 },true),'already_exchanged_other_piece');
 const foreign=new MockStore();foreign.foreignEvidence=true;
 await rejects(()=>claimPartyEventChestV60({
  authority,kind:'participation',store:foreign,
 },true),'evidence_identity_mismatch');
 ensure(foreign.state.receipts.size===0,'cross_account_no_write');
 const bad=new MockStore();bad.invalidMint=true;
 // Force a hit by selecting a deterministic valid secret.
 let withHit:ServerPartyRewardAuthorityV60|undefined;
 for(let i=0;i<200;i++){
  const next={...authority,secret:new Uint8Array(32).fill(i)};
  const rolls=deriveServerChestRollsV1({
   domain:'party_event_v51',committedChestKey:key,secret:next.secret,
  });
  if(rolls.hitRoll<1200){withHit=next;break;}
 }
 ensure(withHit,'found_deterministic_hit');
 await rejects(()=>claimPartyEventChestV60({
  authority:withHit,kind:'participation',store:bad,
 },true),'unverified_equipment_mint');
 ensure(bad.state.receipts.size===0&&bad.state.balance===60,
  'invalid_item_mint_cannot_credit_currency');
 const notEarned=new MockStore();
 notEarned.pointsOverride=0;
 await rejects(()=>claimPartyEventChestV60({
  authority,kind:'participation',store:notEarned,
 },true),'chest_not_earned');
 console.log('PARTY_EVENT_REWARD_V60_OK: atomic transaction contract, rollback, 3 receipts, replay/key rotation, controlled gear mint, one 60-Sigil exchange, cross-account fail-closed');
}
run().catch(e=>{console.error(e);throw e;});
