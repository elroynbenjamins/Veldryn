import {assertCoopSynchronizationPresentation,formatCoopSynchronizationValue} from '../src/core/coop-synchronization';

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
