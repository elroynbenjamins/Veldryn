import {assertCoopSynchronizationPresentation,coopSynchronizationEffectiveTotals,formatCoopSynchronizationValue} from '../src/core/coop-synchronization';

function throws(work:()=>unknown,needle:string){
 let error='';try{work();}catch(value){error=String(value);}
 if(!error.includes(needle))throw new Error('Expected '+needle+', got '+error);
}
const good=assertCoopSynchronizationPresentation({
 activeCount:2,scalePercent:100,partyWide:true,cappedStats:[],personalCpDelta:0,
 requiresProgression:false,canGateEntry:false,canFilterRecruitment:false,
 visibleOnRecruitmentBoard:false,canRankCandidates:false,
 links:[
  {id:'radiant_covenant',name:'Radiant Covenant',classNames:['Bastion','Dawnkeeper'],
   bonuses:[{statKey:'damage_reduction_pct',label:'Damage reduction',bps:300,valueKind:'percent'}]},
  {id:'sanctified_hunt',name:'Sanctified Hunt',classNames:['Bastion','Wayfinder'],
   bonuses:[{statKey:'accuracy_pct',label:'Accuracy',bps:400,valueKind:'percent'}]},
 ],
});
if(good.personalCpDelta!==0||good.canGateEntry||good.canFilterRecruitment||good.requiresProgression||good.visibleOnRecruitmentBoard||good.canRankCandidates)
 throw new Error('Synchronization presentation escaped non-progression/non-gating contract');
throws(()=>assertCoopSynchronizationPresentation({...good,personalCpDelta:1 as 0}),
 'invalid_coop_synchronization_view');
throws(()=>assertCoopSynchronizationPresentation({...good,canGateEntry:true as false}),
 'invalid_coop_synchronization_view');
throws(()=>assertCoopSynchronizationPresentation({...good,canFilterRecruitment:true as false}),
 'invalid_coop_synchronization_view');
throws(()=>assertCoopSynchronizationPresentation({...good,requiresProgression:true as false}),
 'invalid_coop_synchronization_view');
throws(()=>assertCoopSynchronizationPresentation({...good,visibleOnRecruitmentBoard:true as false}),
 'invalid_coop_synchronization_view');
throws(()=>assertCoopSynchronizationPresentation({...good,canRankCandidates:true as false}),
 'invalid_coop_synchronization_view');
throws(()=>assertCoopSynchronizationPresentation({...good,activeCount:3}),
 'invalid_coop_synchronization_view');
throws(()=>assertCoopSynchronizationPresentation({...good,cappedStats:null as never}),
 'invalid_coop_synchronization_view');
console.log('PASS mobile Synchronization view is presentation-only, no CP/progression/queue gating');

if(formatCoopSynchronizationValue(240,'percent')!=='+2.4%')
 throw new Error('basis-point percent formatting changed');
if(formatCoopSynchronizationValue(200,'percentage_points')!=='+2 pp')
 throw new Error('percentage-point formatting changed');
if(formatCoopSynchronizationValue(55,'percent')!=='+0.55%')
 throw new Error('fractional basis-point formatting changed');

const healing=(bps:number)=>({statKey:'healing_received_pct',label:'Healing received',bps,valueKind:'percent' as const});
const capped=assertCoopSynchronizationPresentation({
 ...good,activeCount:3,scalePercent:80,
 links:[
  {id:'radiant_covenant',name:'Radiant Covenant',classNames:['Bastion','Dawnkeeper'],bonuses:[healing(400)]},
  {id:'sacred_bulwark',name:'Sacred Bulwark',classNames:['Ironwarden','Dawnkeeper'],bonuses:[healing(320)]},
  {id:'twilight_accord',name:'Twilight Accord',classNames:['Dreadguard','Dawnkeeper'],bonuses:[healing(320)]},
 ],
 cappedStats:[{statKey:'healing_received_pct',label:'Healing received',rawBps:1040,effectiveBps:1000,valueKind:'percent'}],
});
const totals=coopSynchronizationEffectiveTotals(capped);
if(totals.length!==1||totals[0].bps!==1000)throw Error('Combined capped total must be +10%, not +10.4%');
throws(()=>assertCoopSynchronizationPresentation({...capped,cappedStats:[{...capped.cappedStats[0],rawBps:1030}]}),'invalid_coop_synchronization_view');
throws(()=>assertCoopSynchronizationPresentation({...capped,cappedStats:[...capped.cappedStats,...capped.cappedStats]}),'invalid_coop_synchronization_view');
throws(()=>assertCoopSynchronizationPresentation({...good,links:[good.links[0],good.links[0]]}),'invalid_coop_synchronization_view');
throws(()=>assertCoopSynchronizationPresentation({...good,scalePercent:0}),'invalid_coop_synchronization_view');
throws(()=>assertCoopSynchronizationPresentation({...good,links:[{...good.links[0],bonuses:[{...good.links[0].bonuses[0],bps:-1}]},good.links[1]]}),'invalid_coop_synchronization_view');
const empty=assertCoopSynchronizationPresentation({...good,activeCount:0,scalePercent:0,links:[]});
if(coopSynchronizationEffectiveTotals(empty).length!==0)throw Error('Empty party must not show bonuses');
console.log('PASS combined effective totals, cap consistency and empty-state validation');
