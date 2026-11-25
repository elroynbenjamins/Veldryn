import {
  settleCharacterCareerXpV2,
  type ProgressionV2Transaction,
  type ProgressionV2TransactionStore,
} from '../settlement-service-contract';
import {
  type JournalAwardV2,
  type ServerSettlementProofV2,
} from '../settlement-journal-preview';

function equal(actual:unknown,expected:unknown,message:string){
  if(actual!==expected)throw Error(message+': expected '+String(expected)+' got '+String(actual));
}
async function rejects(work:()=>Promise<unknown>,pattern:RegExp,message:string){
  try{await work()}catch(error){
    if(pattern.test(String(error)))return;
    throw Error(message+': unexpected '+String(error));
  }
  throw Error(message+': expected rejection');
}
const a1='11111111-1111-4111-8111-111111111111';
const a2='22222222-2222-4222-8222-222222222222';
const c1='33333333-3333-4333-8333-333333333333';
const c2='44444444-4444-4444-8444-444444444444';
const claim:ServerSettlementProofV2={
  source:'craft_claim',sourceId:'craft_000001',
  ownerCharacterId:c1,receivingCharacterId:c1,
  completed:true,completedAtMs:2000,professionId:'smithing',
  baseEffortSeconds:240,difficultyBasisPoints:10000,
};
class MemoryAtomicStore implements ProgressionV2TransactionStore {
  owner:Record<string,string>={[c1]:a1,[c2]:a2};
  source:Record<string,ServerSettlementProofV2>={'craft_claim:craft_000001':claim};
  awards:Record<string,JournalAwardV2>={};
  balances:Record<string,number>={[c1]:0,[c2]:0};
  activatedAt:Record<string,number>={[c1]:1000,[c2]:1000};
  failIncrementOnce=false;
  private gate:Promise<void>=Promise.resolve();

  /** Serialize transactions and commit snapshots only if the whole callback succeeds. */
  async transaction<T>(body:(tx:ProgressionV2Transaction)=>Promise<T>):Promise<T>{
    const previous=this.gate;
    let release!:()=>void;
    this.gate=new Promise<void>(resolve=>{release=resolve;});
    await previous;
    const stagedAwards={...this.awards};
    const stagedBalances={...this.balances};
    try{
      const tx:ProgressionV2Transaction={
        characterAccountId:async id=>this.owner[id]??null,
        characterXpActivatedAtMs:async id=>this.activatedAt[id]??null,
        completedSource:async locator=>this.source[locator.source+':'+locator.sourceId]??null,
        findAward:async canonical=>stagedAwards[canonical]??null,
        insertAwardOnce:async receipt=>{
          if(stagedAwards[receipt.canonicalKey])return false;
          stagedAwards[receipt.canonicalKey]=receipt;return true;
        },
        incrementOverallXp:async(id,delta)=>{
          if(this.failIncrementOnce){this.failIncrementOnce=false;throw Error('simulated_db_failure');}
          if(!Number.isSafeInteger(delta)||delta<0 ||
             !Number.isSafeInteger((stagedBalances[id]??0)+delta))
            throw Error('simulated_invalid_delta');
          stagedBalances[id]=(stagedBalances[id]??0)+delta;
        },
      };
      const result=await body(tx);
      this.awards=stagedAwards;
      this.balances=stagedBalances;
      return result;
    }finally{release();}
  }
}
async function test(){
  const store=new MemoryAtomicStore();
  const locator={source:'craft_claim' as const,sourceId:'craft_000001'};
  const principal={accountId:a1};
  const first=await settleCharacterCareerXpV2(store,principal,c1,locator);
  equal(first.status,'applied','first completed receipt');
  equal(first.receipt.award.overallCharacterXp,120,'first award amount');
  equal(store.balances[c1],120,'credited once');
  equal(Object.keys(store.awards).length,1,'one unique receipt');

  const replay=await settleCharacterCareerXpV2(store,principal,c1,locator);
  equal(replay.status,'replayed','retry reports replay');
  equal(store.balances[c1],120,'no duplicate credit');
  await rejects(()=>settleCharacterCareerXpV2(store,{accountId:a2},c1,locator),/unauthorized_character/,'cross-account');
  await rejects(()=>settleCharacterCareerXpV2(store,{accountId:a2},c2,locator),/unverified_source/,'wrong character');
  await rejects(()=>settleCharacterCareerXpV2(store,principal,c1,{source:'gathering_claim',sourceId:'craft_000001'}),/unverified_source/,'wrong source class');
  await rejects(()=>settleCharacterCareerXpV2(store,principal,c1,{source:'craft_claim',sourceId:'missing_0001'}),/unverified_source/,'unverified client claim');

  store.source['craft_claim:craft_000001']={...claim,baseEffortSeconds:300};
  await rejects(()=>settleCharacterCareerXpV2(store,principal,c1,locator),/receipt_collision/,'persisted source mutation');
  store.source['craft_claim:craft_000001']=claim;
  store.source['craft_claim:craft_000002']={...claim,sourceId:'craft_000002',completed:false};
  await rejects(()=>settleCharacterCareerXpV2(store,principal,c1,{source:'craft_claim',sourceId:'craft_000002'}),/unverified_source/,'incomplete source');

  // Backfilled careers must NOT credit old receipt history a second time.
  store.source['craft_claim:craft_legacy']={...claim,sourceId:'craft_legacy',completedAtMs:1000};
  await rejects(()=>settleCharacterCareerXpV2(store,principal,c1,{source:'craft_claim',sourceId:'craft_legacy'}),/pre_activation_source/,'old receipt at cutover');
  store.source['craft_claim:craft_before']={...claim,sourceId:'craft_before',completedAtMs:999};
  await rejects(()=>settleCharacterCareerXpV2(store,principal,c1,{source:'craft_claim',sourceId:'craft_before'}),/pre_activation_source/,'old receipt before cutover');
  store.source['craft_claim:craft_nodate']={...claim,sourceId:'craft_nodate',completedAtMs:undefined};
  await rejects(()=>settleCharacterCareerXpV2(store,principal,c1,{source:'craft_claim',sourceId:'craft_nodate'}),/pre_activation_source/,'unverified receipt timestamp');
  const savedActivation=store.activatedAt[c1];
  delete store.activatedAt[c1];
  await rejects(()=>settleCharacterCareerXpV2(store,principal,c1,locator),/character_not_activated/,'unactivated XP bank');
  store.activatedAt[c1]=savedActivation;
  equal(store.balances[c1],120,'migration cutoff rejects historical double credit');

  // Source insert + new XP increment must commit/rollback together.
  store.source['craft_claim:craft_000003']={...claim,sourceId:'craft_000003'};
  store.failIncrementOnce=true;
  await rejects(()=>settleCharacterCareerXpV2(store,principal,c1,{source:'craft_claim',sourceId:'craft_000003'}),/simulated_db_failure/,'transaction rollback');
  equal(store.balances[c1],120,'balance preserved on DB failure');
  equal(store.awards['craft_claim:craft_000003'],undefined,'receipt rolled back with balance');
  const afterFailure=await settleCharacterCareerXpV2(store,principal,c1,{source:'craft_claim',sourceId:'craft_000003'});
  equal(afterFailure.status,'applied','failed transaction can retry cleanly');
  equal(store.balances[c1],240,'credit only after full transaction');

  // Simulate two simultaneously arriving requests for the *same* immutable source.
  store.source['craft_claim:craft_000004']={...claim,sourceId:'craft_000004'};
  const results=await Promise.all([
    settleCharacterCareerXpV2(store,principal,c1,{source:'craft_claim',sourceId:'craft_000004'}),
    settleCharacterCareerXpV2(store,principal,c1,{source:'craft_claim',sourceId:'craft_000004'}),
  ]);
  equal(results.filter(r=>r.status==='applied').length,1,'one winner of simultaneous retries');
  equal(results.filter(r=>r.status==='replayed').length,1,'one safe loser');
  equal(store.balances[c1],360,'simultaneous credits applied once');

  // Simulate a unique-index conflict returned by database INSERT ON CONFLICT.
  const raceReceipt=store.awards['craft_claim:craft_000004'];
  const racing:ProgressionV2TransactionStore={
    transaction:async body=>{
      let reads=0;
      const tx:ProgressionV2Transaction={
        characterAccountId:async()=>a1,
        characterXpActivatedAtMs:async()=>1000,
        completedSource:async()=>store.source['craft_claim:craft_000004'],
        findAward:async()=>++reads===1?null:raceReceipt,
        insertAwardOnce:async()=>false,
        incrementOverallXp:async()=>{throw Error('loser_never_credits');},
      };
      return body(tx);
    },
  };
  const lost=await settleCharacterCareerXpV2(racing,principal,c1,{source:'craft_claim',sourceId:'craft_000004'});
  equal(lost.status,'replayed','unique-index conflict handled');
  equal(store.balances[c1],360,'loser cannot increment XP');

  store.source['gathering_claim:idle_000001']={
    source:'gathering_claim',sourceId:'idle_000001',
    ownerCharacterId:c2,receivingCharacterId:c2,completed:true,completedAtMs:2000,
    professionId:'mining',baseEffortSeconds:600,claimedElapsedSeconds:500,
    difficultyBasisPoints:10000,
  };
  const gather=await settleCharacterCareerXpV2(store,{accountId:a2},c2,{source:'gathering_claim',sourceId:'idle_000001'});
  equal(gather.status,'applied','second account gathers independently');
  equal(store.balances[c2],300,'gathering credits overall character XP');
  equal(store.balances[c1],360,'no account spillover');

  console.log('PASS: isolated transactional XP handshake, authorization, source ownership, rollback, races and replay');
}
void test().catch(error=>{throw error;});
