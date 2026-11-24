import {assertCoopSynchronizationPresentation} from '../src/core/coop-synchronization';

function throws(work:()=>unknown,needle:string){
 let error='';try{work();}catch(value){error=String(value);}
 if(!error.includes(needle))throw new Error('Expected '+needle+', got '+error);
}
const good=assertCoopSynchronizationPresentation({
 activeCount:2,scalePercent:100,partyWide:true,personalCpDelta:0,
 requiresProgression:false,canGateEntry:false,canFilterRecruitment:false,
 links:[
  {id:'radiant_covenant',name:'Radiant Covenant',classNames:['Bastion','Dawnkeeper'],
   bonuses:[{statKey:'damage_reduction_pct',label:'Damage reduction',value:'+3%'}]},
  {id:'sanctified_hunt',name:'Sanctified Hunt',classNames:['Bastion','Wayfinder'],
   bonuses:[{statKey:'accuracy_pct',label:'Accuracy',value:'+4%'}]},
 ],
});
if(good.personalCpDelta!==0||good.canGateEntry||good.canFilterRecruitment||good.requiresProgression)
 throw new Error('Synchronization presentation escaped non-progression/non-gating contract');
throws(()=>assertCoopSynchronizationPresentation({...good,personalCpDelta:1 as 0}),
 'invalid_coop_synchronization_view');
throws(()=>assertCoopSynchronizationPresentation({...good,canGateEntry:true as false}),
 'invalid_coop_synchronization_view');
throws(()=>assertCoopSynchronizationPresentation({...good,canFilterRecruitment:true as false}),
 'invalid_coop_synchronization_view');
throws(()=>assertCoopSynchronizationPresentation({...good,requiresProgression:true as false}),
 'invalid_coop_synchronization_view');
throws(()=>assertCoopSynchronizationPresentation({...good,activeCount:3}),
 'invalid_coop_synchronization_view');
console.log('PASS mobile Synchronization view is presentation-only, no CP/progression/queue gating');
