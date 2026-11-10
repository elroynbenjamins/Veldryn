import {launchPlayer} from '../../combat/content/launch-combat';
import {simulatePartyEventStagePrototype,PARTY_EVENT_STAGE_V3_RELEASED} from '../weekly-party-stage-prototype-v3';
import {WEEKLY_PARTY_EVENT_FAMILIES,buildWeeklyPartySupplyOrders,weeklyPartyBudget,type VerifiedSupplyItem} from '../weekly-party-events-v2';
function assert(value:unknown,msg:string):asserts value {if(!value)throw Error('party-stage-v3: '+msg);}
function rejects(fn:()=>unknown,part:string){let error='';try{fn();}catch(e){error=String(e);}assert(error.includes(part),part+': '+error);}
assert(PARTY_EVENT_STAGE_V3_RELEASED===false,'stage feature must remain disabled');
const catalog:VerifiedSupplyItem[]=[
 {itemId:'GREENWOOD_LOG',category:'wood',tier:'common',secondsPerUnit:20,unlocked:true},
 {itemId:'COPPER_ORE',category:'ore',tier:'common',secondsPerUnit:20,unlocked:true},
 {itemId:'DEWLEAF',category:'herb',tier:'common',secondsPerUnit:30,unlocked:true},
];
const kit=['Ironwarden','Wayfinder','Dawnkeeper','Ravager'].map((name,index)=>({...launchPlayer(name,25),id:'party-stage-player-'+index}));
let count=0,encounters=0,variantCount=0;
for(const [family,data] of Object.entries(WEEKLY_PARTY_EVENT_FAMILIES)){
 for(const variation of data.variations){
  variantCount++;
  for(const partySize of [2,3,4]){
   const orders=buildWeeklyPartySupplyOrders(family as keyof typeof WEEKLY_PARTY_EVENT_FAMILIES,weeklyPartyBudget(partySize,'standard'),catalog,37)
    .map(o=>({...o,donatedQuantity:o.quantity}));
   for(const stage of [1,2,3] as const){
    const choiceId=stage===1?undefined:stage===2
     ?({broken_caravan:'safe_pass',nightfall_hunt:'clear_trail',broken_wards:'ground_spires',lost_reliquary:'quiet_passage'} as Record<string,string>)[family]
     :({broken_caravan:'brace_wagons',nightfall_hunt:'hold_ground',broken_wards:'protect_wards',lost_reliquary:'preserve_seals'} as Record<string,string>)[family];
    const input={family:family as keyof typeof WEEKLY_PARTY_EVENT_FAMILIES,variation,
     stage,difficulty:'standard' as const,seed:211,orders,
     frozenActors:kit.slice(0,partySize),...(choiceId?{choiceId}:{})};
    const preview=simulatePartyEventStagePrototype(input);
    assert(preview.kind==='non_rewarding_prototype','never claim production authority');
    assert(!('eventPoints' in preview)&&!('rewards' in preview),'stage prototype must not grant EP or items');
    assert(preview.cues.length===3&&preview.cues.every(c=>c.atMs>0),'three authored cue windows');
    assert(preview.requiredOrdersComplete===stage,'only current-stage verified supply buffs');
    assert(preview.estimatedObjectiveIntegrity>=0&&preview.estimatedObjectiveIntegrity<=100,'bounded objective integrity');
    if(stage===1)assert(preview.combatResult===null,'scouting has no forced combat');
    else{
     assert(preview.combatResult!==null,'confrontation and defense simulate real combat');
     assert(preview.combatResult.totalDamage>=0&&preview.combatResult.durationMs<=72000,'bounded combat telemetry');
     assert(preview.choices.length===2,'exactly two vote choices');
     encounters++;
    }
    if(count%15===0)assert(JSON.stringify(simulatePartyEventStagePrototype(input))===JSON.stringify(preview),'seeded preview is deterministic');
    count++;
   }
  }
 }
}
assert(variantCount===12&&count===108&&encounters===72,'complete four-family, twelve-variant, all-sizes stage coverage');
const example={family:'broken_caravan' as const,variation:'bandits_crossing',stage:2 as const,difficulty:'standard' as const,
 seed:5,frozenActors:kit.slice(0,2),orders:[],choiceId:'safe_pass'};
const noSupply=simulatePartyEventStagePrototype(example);
const withSupplies=buildWeeklyPartySupplyOrders('broken_caravan',weeklyPartyBudget(2,'standard'),catalog,5)
 .map(o=>({...o,donatedQuantity:o.quantity}));
const supported=simulatePartyEventStagePrototype({...example,orders:withSupplies});
assert(noSupply.requiredOrdersComplete===0&&supported.requiredOrdersComplete===2,'stage2 receives only stage1/2 supplies');
assert(supported.optionalPreparations.length===3,'verified optional orders show in stage2');
rejects(()=>simulatePartyEventStagePrototype({...example,variation:'invented'}),'party_stage_unknown_family_variation');
rejects(()=>simulatePartyEventStagePrototype({...example,choiceId:'invented'}),'party_stage_choice_unresolved');
rejects(()=>simulatePartyEventStagePrototype({...example,stage:1,choiceId:'safe_pass'}),'party_stage_early_vote');
rejects(()=>simulatePartyEventStagePrototype({...example,frozenActors:[kit[0]!]}),'party_stage_invalid_verified_roster');
console.log('PASS hidden Party Events v3 stage preview: '+count+' stages; '+encounters+' deterministic combat encounters; no rewards or EP');
