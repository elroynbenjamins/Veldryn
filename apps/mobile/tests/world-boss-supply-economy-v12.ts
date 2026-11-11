/** World Boss V12 supply/reward receipt emulator regressions. No live DB / wallet. */
import {assert} from './test-assert';
import {WorldBossSupplyEmulatorV12,previewWorldBossRewardsV12,
 type WorldBossSupplyEventPolicyV12} from '../../../backend/src/server/combat/world-boss-supply-economy-v12';
import {deriveWorldBossWarCampEffectsV11} from '../../../backend/src/server/combat/world-boss-war-camp-v11';

const NOW=1794398400000,EVENT='WORLD_BOSS_V12_SUPPLY';
const policy:WorldBossSupplyEventPolicyV12={
 eventId:EVENT,startsAtUtcMs:NOW-100,endsAtUtcMs:NOW+7*86400000-100,
 goals:{fortifications:{tier1At:1,tier2At:2},
  fieldProvisions:{tier1At:1,tier2At:2},
  siegecraft:{tier1At:1,tier2At:2}},
 recipes:[
  {id:'FORTIFICATION_RAW',track:'fortifications',materials:[{itemId:'WB12_TEST_WOOD',quantity:10},{itemId:'WB12_TEST_BAR',quantity:2}]},
  {id:'FIELD_PROVISION',track:'fieldProvisions',materials:[{itemId:'WB12_TEST_HERB',quantity:5}]},
  {id:'SIEGECRAFT_TOOL',track:'siegecraft',materials:[{itemId:'WB12_TEST_BAR',quantity:4}]},
 ],
};
function inventory(){
 return {WB12_TEST_WOOD:30,WB12_TEST_BAR:15,WB12_TEST_HERB:20};
}
async function expectError(action:()=>Promise<unknown>,code:string){
 let failed=false;try{await action();}catch(e){failed=String(e).includes(code);}
 assert.ok(failed,'expected '+code);
}
const make=()=>new WorldBossSupplyEmulatorV12(policy,{
 A_ACCOUNT:inventory(),B_ACCOUNT:inventory(),C_ACCOUNT:inventory(),
 X_ACCOUNT:{WB12_TEST_WOOD:5,WB12_TEST_BAR:1,WB12_TEST_HERB:0},
});
async function main(){
 const empty=make();
 assert.equal(deriveWorldBossWarCampEffectsV11(empty.snapshot().warCamp).bossDamageReduction,0);
 const req1={principalAccountId:'A_ACCOUNT',requestId:'REQUEST_A_00001',recipeId:'FORTIFICATION_RAW',nowUtcMs:NOW};
 const r1=await empty.donate(req1);
 assert.equal(r1.repeated,false);
 assert.equal(r1.receipt.ordinal,1);
 assert.equal(r1.receipt.hypotheticalSigils,5);
 assert.equal(empty.snapshot().inventory.A_ACCOUNT.WB12_TEST_WOOD,20);
 assert.equal(empty.snapshot().inventory.A_ACCOUNT.WB12_TEST_BAR,13);
 assert.equal(deriveWorldBossWarCampEffectsV11(r1.warCamp).bossDamageReduction,.05);
 const replay=await empty.donate({...req1,nowUtcMs:NOW+10});
 assert.equal(replay.repeated,true);
 assert.deepEqual(replay.receipt,r1.receipt);
 assert.equal(empty.snapshot().inventory.A_ACCOUNT.WB12_TEST_WOOD,20);
 await expectError(()=>empty.donate({...req1,recipeId:'FIELD_PROVISION'}),'supply_idempotency_conflict');

 const r2=await empty.donate({principalAccountId:'A_ACCOUNT',requestId:'REQUEST_A_00002',recipeId:'FIELD_PROVISION',nowUtcMs:NOW});
 assert.equal(r2.receipt.ordinal,2);
 assert.equal(deriveWorldBossWarCampEffectsV11(r2.warCamp).startingHpMultiplier,1.05);
 await expectError(()=>empty.donate({principalAccountId:'A_ACCOUNT',requestId:'REQUEST_A_00003',
  recipeId:'SIEGECRAFT_TOOL',nowUtcMs:NOW}),'supply_account_limit');
 await expectError(()=>empty.donate({principalAccountId:'X_ACCOUNT',requestId:'REQUEST_X_00001',
  recipeId:'FORTIFICATION_RAW',nowUtcMs:NOW}),'insufficient_owned_resources');
 assert.equal(empty.snapshot().inventory.X_ACCOUNT.WB12_TEST_WOOD,5);
 assert.equal(Object.keys(empty.snapshot().receipts).length,2);
 const r3=await empty.donate({principalAccountId:'B_ACCOUNT',requestId:'REQUEST_B_00001',recipeId:'FORTIFICATION_RAW',nowUtcMs:NOW});
 assert.equal(deriveWorldBossWarCampEffectsV11(r3.warCamp).bossDamageReduction,.10);
 await expectError(()=>empty.donate({principalAccountId:'C_ACCOUNT',requestId:'REQUEST_C_00001',recipeId:'FORTIFICATION_RAW',nowUtcMs:NOW}),
  'supply_track_already_completed');
 const r4=await empty.donate({principalAccountId:'B_ACCOUNT',requestId:'REQUEST_B_00002',recipeId:'SIEGECRAFT_TOOL',nowUtcMs:NOW});
 assert.equal(deriveWorldBossWarCampEffectsV11(r4.warCamp).guardBreakMultiplier,1.05);
 const snapshot=empty.snapshot();
 snapshot.inventory.B_ACCOUNT.WB12_TEST_BAR=999999;
 assert.ok(empty.snapshot().inventory.B_ACCOUNT.WB12_TEST_BAR<999999);
 await expectError(()=>empty.donate({principalAccountId:'C_ACCOUNT',requestId:'REQUEST_C_00002',recipeId:'FIELD_PROVISION',nowUtcMs:NOW-101}),
  'supply_event_closed');
 const oldAfterClose=await empty.donate({...req1,nowUtcMs:NOW+7*86400000});
 assert.equal(oldAfterClose.repeated,true,'identical donation receipts are retrievable after closure');

 // Single account/recipe same-network retries consume exactly one inventory debit.
 const duplicates=make();
 const same=await Promise.all(Array.from({length:18},()=>duplicates.donate(req1)));
 assert.equal(same.filter(x=>!x.repeated).length,1);
 assert.equal(same.filter(x=>x.repeated).length,17);
 assert.equal(duplicates.snapshot().inventory.A_ACCOUNT.WB12_TEST_WOOD,20);
 assert.equal(duplicates.snapshot().revision,1);

 // Under contention, a limited supply track unlocks once, no accidental mint,
 // and all distinct account receipts still count independently.
 const contestants=Object.fromEntries(Array.from({length:24},(_,i)=>['TEST_ACCOUNT_'+i,inventory()]));
 const massPolicy:WorldBossSupplyEventPolicyV12={...policy,goals:{
  fortifications:{tier1At:1,tier2At:12},
  fieldProvisions:{tier1At:1,tier2At:2},
  siegecraft:{tier1At:1,tier2At:2},
 }};
 const mass=new WorldBossSupplyEmulatorV12(massPolicy,contestants);
 const done=await Promise.allSettled(Array.from({length:24},(_,i)=>mass.donate({
  principalAccountId:'TEST_ACCOUNT_'+i,
  requestId:'DONATION_'+i+'_RANDOM',
  recipeId:'FORTIFICATION_RAW',nowUtcMs:NOW,
 })));
 assert.equal(done.filter(x=>x.status==='fulfilled').length,12);
 assert.equal(done.filter(x=>x.status==='rejected').length,12);
 assert.equal(mass.snapshot().contributions.fortifications,12);
 assert.equal(mass.snapshot().revision,12);
 assert.equal(deriveWorldBossWarCampEffectsV11(mass.snapshot().warCamp).bossDamageReduction,.10);
 assert.equal(Object.values(mass.snapshot().receipts).reduce((n,r)=>n+r.hypotheticalSigils,0),60);
 // The 60 above is ONLY a preview; no actual currency ledger exists.

 const supply=Object.values(empty.snapshot().receipts).filter(r=>r.accountId==='A_ACCOUNT');
 const attempts=[1,2,3].map(n=>({eventId:EVENT,accountId:'A_ACCOUNT',
  requestId:'BATTLE_'+n+'_ACCOUNT',ordinal:n as 1|2|3,survived:true,impact:1}));
 const maximal=previewWorldBossRewardsV12({eventId:EVENT,accountId:'A_ACCOUNT',
  attempts,supplyReceipts:supply,reachedGlobalMilestones:[70,30,0]});
 assert.equal(maximal.total,100);
 assert.equal(maximal.maxAllowed,100);
 assert.equal(maximal.lines.length,11);
 assert.equal(maximal.rewardEligible,false,'no wallet grant');
 assert.deepEqual(maximal.lines.map(x=>x.key),[
  'attack:1','attack:2','attack:3',
  'impact:0.8','impact:1.8','impact:3',
  'global:70','global:30','global:0','supply:1','supply:2',
 ]);
 const donationsOnly=previewWorldBossRewardsV12({eventId:EVENT,accountId:'A_ACCOUNT',
  attempts:[],supplyReceipts:supply,reachedGlobalMilestones:[70,30,0]});
 assert.equal(donationsOnly.total,10,'without a committed battle there is no community milestone reward');
 const lost=previewWorldBossRewardsV12({eventId:EVENT,accountId:'A_ACCOUNT',
  attempts:[{...attempts[0],survived:false,impact:.4}],supplyReceipts:[],reachedGlobalMilestones:[70,30]});
 assert.equal(lost.total,20);
 await expectError(async()=>previewWorldBossRewardsV12({eventId:EVENT,accountId:'A_ACCOUNT',
  attempts:[attempts[0],attempts[0]],supplyReceipts:[],reachedGlobalMilestones:[]}),
  'invalid_trusted_reward_proof');
 await expectError(async()=>previewWorldBossRewardsV12({eventId:EVENT,accountId:'A_ACCOUNT',
  attempts,supplyReceipts:supply,reachedGlobalMilestones:[70,70]}),'invalid_trusted_reward_proof');
 console.log('WB_V12_SUPPLY_ECONOMY='+JSON.stringify({
  bundleCapPerAccount:2,onceOnlyReceipts:18,parallelAccounts:24,
  successfulAgainst12SlotGoal:12,rejectedAfterGoal:12,
  materialDebitedOnce:true,warCampTiersFromRealDebits:true,
  theoreticalEventCap:maximal.total,donationsOnly:donationsOnly.total,
  actualPostgresTransactions:0,actualWalletCredits:0,liveWorldBossEnabled:false,
 }));
}
void main().catch(e=>{console.error(e);throw e;});
