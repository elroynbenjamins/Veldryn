import {launchPlayer} from '../../combat/content/launch-combat';
import type {CombatantDefinition} from '../../combat/types';
import {WEEKLY_PARTY_EVENT_FAMILIES,buildWeeklyPartySupplyOrders,
 weeklyPartyBudget,type WeeklyPartyFamily,type WeeklyPartyDifficulty,
 type VerifiedSupplyItem} from '../weekly-party-events-v2';
import {partyEventFamilyDesignV8} from '../weekly-party-distinct-finales-v8';
import {simulatePartyEventStoryStageV9,PARTY_EVENT_STORY_STAGES_V9_RELEASED,
 type PartyEventStoryStageV9Input} from '../weekly-party-family-stages-v9';
const assert=(ok:unknown,message:string):void=>{
 if(!ok)throw Error('party-events-story-v9: '+message);
};
const rejects=(fn:()=>unknown,needle:string)=>{
 let msg='';try{fn();}catch(error){msg=String(error);}
 assert(msg.includes(needle),'expected '+needle+', received '+msg);
};
assert(PARTY_EVENT_STORY_STAGES_V9_RELEASED===false,'v9 must remain hidden');
const catalog:VerifiedSupplyItem[]=[
 {itemId:'WOOD_COMMON',category:'wood',tier:'common',secondsPerUnit:20,unlocked:true},
 {itemId:'ORE_COMMON',category:'ore',tier:'common',secondsPerUnit:25,unlocked:true},
 {itemId:'HERB_COMMON',category:'herb',tier:'common',secondsPerUnit:30,unlocked:true},
];
const classes=['Ironwarden','Wayfinder','Dawnkeeper','Ravager'];
const roster=classes.map((name,i)=>({
 ...launchPlayer(name,25),id:'story-player-'+i,
 classId:name.toUpperCase(),
}));
const backgrounds=new Set<string>(),sceneMotifs=new Set<string>(),
 uniqueDescriptions=new Set<string>(),mechanicTraces=new Set<string>();
let total=0,scouting=0,encounters=0,warningEvents=0;
const variants=Object.entries(WEEKLY_PARTY_EVENT_FAMILIES) as [WeeklyPartyFamily,
 (typeof WEEKLY_PARTY_EVENT_FAMILIES)[WeeklyPartyFamily]][];
for(const [family,definition] of variants){
 const design=partyEventFamilyDesignV8(family);
 for(const variation of definition.variations){
  for(const size of [2,3,4]){
   const orders=buildWeeklyPartySupplyOrders(family,weeklyPartyBudget(size,'standard'),catalog,49)
    .map(o=>({...o,donatedQuantity:o.quantity}));
   for(const stage of [1,2,3] as const){
    const options=stage===1?[{stage2Choice:undefined,stage3Choice:undefined}]
     :stage===2?design.stage2.map(choice=>({stage2Choice:choice.id,stage3Choice:undefined}))
     :design.stage2.flatMap(choice=>design.stage3.map(last=>({
       stage2Choice:choice.id,stage3Choice:last.id,
      })));
    for(const choice of options){
     const input:PartyEventStoryStageV9Input={family,variation,stage,
      difficulty:'standard',seed:129,verifiedActors:roster.slice(0,size),
      verifiedOrders:orders,...choice};
     const preview=simulatePartyEventStoryStageV9(input);
     assert(preview.kind==='hidden_non_rewarding_story_stage'
      &&!('eventPoints' in preview)&&!('rewards' in preview)
      &&!('grantedItems' in preview),'no grantable reward or EP in stage preview');
     assert(preview.availableChoices.length===(stage===1?0:2),
      'v9 shows only the current stage voting choices');
     assert(preview.selectedChoice===(stage===1?null:stage===2
      ?choice.stage2Choice:choice.stage3Choice),
      'confirmed ballot matches the visible stage selection');
     assert(preview.previousStageChoice===(stage===3?choice.stage2Choice:null),
      'later stages display only the verified previous route');
     assert(preview.presentation.cues.length===3
      &&preview.presentation.cues.every(c=>c.atMs>=2000&&c.line.length>8),
      'each stage has readable authored presentation cues');
     assert(preview.presentation.backdropToken!==undefined
      &&preview.presentation.motionToken!==undefined
      &&preview.presentation.stageMotion.length>5
      &&Object.values(preview.presentation.supplyCategoryShares).reduce((n,v)=>n+v,0)>.99,
      'pixel stage has artwork/animation tokens');
     assert(preview.verifiedRequiredStages===stage,'only verified complete stage supplies count');
     assert(preview.verifiedOptionalPreparations.length===(stage===1?0:3),
      'optional supplies are not effective before Stage 2');
     assert(preview.verifiedFamilyBenefits.length===(stage===1?0:3),
      'only complete, currently available optional supplies grant unique support');
     assert(preview.actions.length===(stage===2?2:1)
      &&preview.actions.every(a=>a.noncombatAlternative.length>8&&a.skillExamples.length>0),
      'four special actions are available across 3 stages with noncombat paths');
     assert(preview.actions.map(a=>a.id).join(',')===(stage===1?'scout_route':
      stage===2?'secure_approach,support_expedition':'prepare_finale'),
      'no duplicate special action slots or premature Stage 3 action');
     backgrounds.add(preview.presentation.backdropToken);
     sceneMotifs.add(preview.presentation.motionToken);
     uniqueDescriptions.add(preview.presentation.scene);
     if(stage===1){
      assert(preview.combat===null,'scouting must never fabricate combat');
      scouting++;
     }else{
      assert(preview.combat!==null,'Stages 2/3 use real deterministic combat');
      const result=preview.combat!;
      assert(result.durationMs<=72000&&result.familyObjective.value>=0
       &&result.familyObjective.value<=100&&Number.isFinite(result.familyObjective.value),
       'combat and family objective are bounded');
      assert(result.familyObjective.family===family,'story uses matching family combat kit');
      assert(result.combatEvents.some(e=>e.type==='combat_end'),
       'real combat records must include a terminal event');
      assert(result.combatEvents.every(e=>e.atMs>=0&&e.atMs<=result.durationMs),
       'combat timeline is based on actual engine time');
      assert(JSON.stringify(simulatePartyEventStoryStageV9(input))===JSON.stringify(preview),
       'identical verified stage/ballots/orders/seed replay deterministically');
      warningEvents+=result.familyObjective.cues.filter(c=>c.kind==='warning').length;
      mechanicTraces.add(result.familyObjective.metric);
      encounters++;
     }
     total++;
    }
   }
  }
 }
}
assert(scouting===36&&encounters===216&&total===252,
 '4 families x 3 variations x 3 party sizes x 7 story stages/votes');
assert(backgrounds.size===4&&sceneMotifs.size===4
 &&uniqueDescriptions.size===12,
 'four environmental visual identities and three distinct story beats each');
assert(mechanicTraces.size===4&&warningEvents>0,
 'four unique event objective rules are exercised by real combat warnings');
const base:PartyEventStoryStageV9Input={
 family:'nightfall_hunt',variation:'moonfang_pack',stage:2,
 difficulty:'standard',seed:42,verifiedActors:roster,verifiedOrders:[],
 stage2Choice:'clear_trail',
};
const without=simulatePartyEventStoryStageV9(base);
assert(without.verifiedFamilyBenefits.length===0,
 'unverified or omitted supplies never create family-specific stat boosts');
const fullOrders=buildWeeklyPartySupplyOrders('nightfall_hunt',
 weeklyPartyBudget(4,'standard'),catalog,12)
 .map(o=>({...o,donatedQuantity:o.quantity}));
const withSupplies=simulatePartyEventStoryStageV9({...base,verifiedOrders:fullOrders});
assert(withSupplies.verifiedFamilyBenefits.length===3,
 'all three optional preparations provide modest unique bonuses when fully donated');
const partial=fullOrders.map(o=>({...o,donatedQuantity:o.kind==='optional'?0:o.donatedQuantity}));
assert(simulatePartyEventStoryStageV9({...base,verifiedOrders:partial}).verifiedFamilyBenefits.length===0,
 'partial optional orders do not unlock free benefits');
const later=simulatePartyEventStoryStageV9({...base,stage:3,
 verifiedOrders:fullOrders,stage2Choice:'clear_trail',stage3Choice:'hunt_alpha'});
assert(later.presentation.cues[2]!.line.includes('exposure'),
 'Stage 3 tactics explain the unique gameplay risk');
rejects(()=>simulatePartyEventStoryStageV9({...base,stage:1,stage2Choice:'clear_trail'}),
 'party_story_early_vote');
rejects(()=>simulatePartyEventStoryStageV9({...base,stage:3}),
 'party_story_unresolved_vote');
rejects(()=>simulatePartyEventStoryStageV9({...base,stage2Choice:'forged'}),
 'party_story_unresolved_vote');
rejects(()=>simulatePartyEventStoryStageV9({...base,variation:'forged'}),
 'party_story_invalid_family_variation');
rejects(()=>simulatePartyEventStoryStageV9({...base,verifiedActors:[
 ...roster.slice(0,2),{...launchPlayer('Ironwarden',25),id:'duplicate-tank'},
]}),'party_story_invalid_role_composition');
rejects(()=>simulatePartyEventStoryStageV9({...base,verifiedOrders:[{
 ...fullOrders[0]!,donatedQuantity:fullOrders[0]!.quantity+1,
}]}),'party_boss_invalid_supply_receipt');
// Further Heroic/Veteran checks use the same real engine with all 3 sizes and
// the two route styles; never alter the persistent Party composition.
let higherDifficulty=0;
for(const diff of ['veteran','heroic'] as WeeklyPartyDifficulty[]){
 for(const [family,definition] of variants){
  const config=partyEventFamilyDesignV8(family);
  for(const size of [2,3,4]){
   for(const i of [0,1] as const){
    const result=simulatePartyEventStoryStageV9({
     family,variation:definition.variations[1],stage:3,difficulty:diff,
     seed:70+i,verifiedActors:roster.slice(0,size),verifiedOrders:[],
     stage2Choice:config.stage2[i].id,stage3Choice:config.stage3[i].id,
    });
    assert(result.combat!==null&&result.combat.durationMs<=72000,
     'higher difficulties remain bounded and legal');
    higherDifficulty++;
   }
  }
 }
}
assert(higherDifficulty===48,'48 Veteran/Heroic route previews');
// Cover all nine playable classes with legal 1 Tank / 2 Damage / 1 Support
// parties and mixed character levels. These are diagnostic simulations, not
// empirical gear-curve balancing or release authorization.
const mixedTeams=[
 ['Ironwarden','Wayfinder','Ravager','Dawnkeeper'],
 ['Bastion','Hexweaver','Knife Dancer','Stonecaller'],
 ['Dreadguard','Wayfinder','Hexweaver','Dawnkeeper'],
 ['Ironwarden','Ravager','Knife Dancer','Stonecaller'],
] as const;
const coveredClasses=new Set<string>();
let mixedRuns=0;
for(const [family,definition] of variants){
 const votes=partyEventFamilyDesignV8(family);
 for(let teamIndex=0;teamIndex<mixedTeams.length;teamIndex++){
  const team=mixedTeams[teamIndex]!.map((name,index)=>{
   const level=[12,25,38,50][index]!;
   coveredClasses.add(name);
   return {...launchPlayer(name,level),
    classId:name.toUpperCase().replaceAll(' ','_'),
    id:'mixed-'+family+'-'+teamIndex+'-'+index};
  });
  for(const difficulty of ['standard','veteran','heroic'] as WeeklyPartyDifficulty[]){
   for(const stage of [2,3] as const){
    const result=simulatePartyEventStoryStageV9({
     family,variation:definition.variations[teamIndex%3]!,stage,difficulty,
     seed:600+teamIndex,verifiedActors:team,verifiedOrders:[],
     stage2Choice:votes.stage2[teamIndex%2]!.id,
     ...(stage===3?{stage3Choice:votes.stage3[teamIndex%2]!.id}:{}),
    });
    assert(result.combat!==null&&result.combat.familyObjective.value>=0
     &&result.combat.familyObjective.value<=100,
     'mixed level/class legal teams produce bounded source combat');
    mixedRuns++;
   }
  }
 }
}
assert(coveredClasses.size===9&&mixedRuns===96,
 'all nine classes and mixed-level legal parties across all four events');
console.log('PASS Party Events hidden v9: '+total+' story stages, '+encounters
 +' real combat encounters, '+higherDifficulty+' difficult variants, '
 +mixedRuns+' mixed-level all-class previews; 4 visual themes, verified bonuses, no grants');
