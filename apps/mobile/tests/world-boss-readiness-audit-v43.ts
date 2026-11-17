/** V43 offline, no payout or Sigil writes; all data is synthetic. */
import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {WORLD_BOSS_V43_LIVE,WORLD_BOSS_V43_PAYOUT_APPROVED,
 WORLD_BOSS_V43_MAX_EARNABLE_BEFORE_IMPACT,
 WORLD_BOSS_V43_RESERVED_IMPACT_BUDGET,
 reviewWorldBossClassBalanceV43,reconcileWorldBossEconomyV43}
 from '../../../backend/online/world-boss-readiness-audit-v43';
import type {WorldBossV29Audit,WorldBossV29ClassRole,
 WorldBossV29ReferenceCell}
 from '../../../backend/online/world-boss-impact-audit-v29';

const EVENT='30000000-0000-4000-8000-000000000043';
const ACCOUNT='10000000-0000-4000-8000-000000000043';
const classes:WorldBossV29ClassRole[]=CLASSES.map(c=>({
 classId:c.id,role:c.role.toLowerCase() as WorldBossV29ClassRole['role'],
}));
const refs:WorldBossV29ReferenceCell[]=[];
for(const boss of ['hollowroot','sunscar','frostmarch'] as const)
 for(const bracket of [1,2,3,4,5] as const)
  for(const cls of classes){
   const median=cls.role==='tank'?1:cls.role==='damage'?1.1:.9;
   refs.push({boss,bracket,classId:cls.classId,role:cls.role,
    uniqueAccounts:20,medianUtilityPerRootPower:median,
    p10UtilityPerRootPower:median*.8,p90UtilityPerRootPower:median*1.2,
    survivalRate:.90});
  }
const report:WorldBossV29Audit={
 status:'review_only_impact_locked',eventId:EVENT,
 sampledAttempts:2700,uniqueAccounts:2700,
 referenceCells:refs,warnings:[],readyForHumanReview:true,preview:[],
 payoutsAuthorized:false,walletWrites:0,persisted:false,
};
const reject=(f:()=>unknown,key:string)=>{
 let message='';try{f();}catch(error){message=String(error);}
 assert.ok(message.includes(key),'expected '+key+' got '+message);
};
const all={
 eventId:EVENT,accountId:ACCOUNT,
 attempts:[
  {ordinal:1 as const,survived:true,verifiedReplay:true,characterCount:1},
  {ordinal:2 as const,survived:true,verifiedReplay:true,characterCount:5},
  {ordinal:3 as const,survived:true,verifiedReplay:true,characterCount:3},
 ],
 donations:[1,2] as (1|2)[],
 globalMilestones:[70,30,0] as (70|30|0)[],
 ledger:[
  {sourceKey:'battle:1',amount:10},
  {sourceKey:'battle:2',amount:10},
  {sourceKey:'battle:3',amount:10},
  {sourceKey:'supply:1',amount:5},
  {sourceKey:'supply:2',amount:5},
  {sourceKey:'global:70',amount:5},
  {sourceKey:'global:30',amount:10},
  {sourceKey:'global:0',amount:15},
 ],
};
function main(){
 assert.equal(WORLD_BOSS_V43_LIVE,false);
 assert.equal(WORLD_BOSS_V43_PAYOUT_APPROVED,false);
 assert.equal(WORLD_BOSS_V43_MAX_EARNABLE_BEFORE_IMPACT,70);
 assert.equal(WORLD_BOSS_V43_RESERVED_IMPACT_BUDGET,30);
 assert.equal(classes.length,9);
 assert.deepEqual(classes.reduce((acc,c)=>(acc[c.role]++,acc),
  {tank:0,damage:0,support:0}),{tank:3,damage:4,support:2});
 const fair=reviewWorldBossClassBalanceV43(report,classes);
 assert.equal(fair.cellsChecked,135);
 assert.equal(fair.adequatelySampledCells,135);
 assert.equal(fair.warnings.length,0);
 assert.equal(fair.approvedForPayout,false);
 assert.equal(fair.needsManualCalibration,true);
 const gap=refs.map(r=>({...r}));
 const r=gap.find(x=>x.classId==='IRONWARDEN')!;
 r.medianUtilityPerRootPower=2;
 r.p90UtilityPerRootPower=2.4;
 const unfair=reviewWorldBossClassBalanceV43(
  {...report,referenceCells:gap},classes);
 assert.ok(unfair.warnings.some(w=>w.startsWith('class_utility_gap:')));
 const missing=refs.slice(1);
 reject(()=>reviewWorldBossClassBalanceV43(
  {...report,referenceCells:missing},classes),'invalid_balance_report');
 const insufficient=refs.map(x=>({...x}));
 insufficient[0].uniqueAccounts=19;
 assert.equal(reviewWorldBossClassBalanceV43(
  {...report,referenceCells:insufficient},classes).adequatelySampledCells,134);
 const economy=reconcileWorldBossEconomyV43(all);
 assert.equal(economy.expectedEarned,70);
 assert.equal(economy.ledgerEarned,70);
 assert.equal(economy.sourceCount,8);
 assert.equal(economy.accountWide,true);
 assert.equal(economy.approvedForPayout,false);
 // Changing the number of owned fighters cannot multiply an account source.
 const five={...all,attempts:all.attempts.map(x=>({
  ...x,characterCount:5,
 }))};
 assert.equal(reconcileWorldBossEconomyV43(five).expectedEarned,70);
 // Nonparticipants may claim supply receipts but never shared milestones.
 const donor={...all,attempts:[],
  ledger:all.ledger.filter(x=>x.sourceKey.startsWith('supply:'))};
 assert.equal(reconcileWorldBossEconomyV43(donor).expectedEarned,10);
 const loss={...all,attempts:[{ordinal:1 as const,survived:false,
  verifiedReplay:true,characterCount:1}],
  donations:[] as (1|2)[],
  ledger:[{sourceKey:'battle:1',amount:5},...all.ledger.filter(x=>
   x.sourceKey.startsWith('global:'))]};
 assert.equal(reconcileWorldBossEconomyV43(loss).expectedEarned,35);
 reject(()=>reconcileWorldBossEconomyV43({...all,
  attempts:[...all.attempts,all.attempts[0]]}),'invalid_economy_scope');
 reject(()=>reconcileWorldBossEconomyV43({...all,
  attempts:all.attempts.map(a=>({...a,verifiedReplay:false}))}),
  'unverified_or_duplicate_battle');
 reject(()=>reconcileWorldBossEconomyV43({...all,
  donations:[1,1]}),'duplicate_supply');
 reject(()=>reconcileWorldBossEconomyV43({...all,
  ledger:all.ledger.filter(x=>x.sourceKey!=='battle:2')}),
  'unreconciled_ledger');
 reject(()=>reconcileWorldBossEconomyV43({...all,
  ledger:all.ledger.map(x=>x.sourceKey==='battle:1'?
   {...x,amount:50}:x)}),'unreconciled_ledger');
 reject(()=>reconcileWorldBossEconomyV43({...all,
  ledger:[...all.ledger,{sourceKey:'impact:1',amount:30}]}),
  'invalid_economy_scope');
 console.log('WORLD_BOSS_V43_NINE_CLASS_ECONOMY_AUDIT=PASS');
}
main();
