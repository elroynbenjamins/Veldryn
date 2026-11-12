import {launchPlayer} from '../../combat/content/launch-combat';
import type {CombatantDefinition} from '../../combat/types';
import {applyCharacterCompanionAssist} from '../../companions/character-assist';
import type {OwnedCompanionSnapshot} from '../../companions/domain';
import {WEEKLY_PARTY_EVENT_FAMILIES,type WeeklyPartyFamily} from '../weekly-party-events-v2';
import {buildHiddenPartyFinaleHazard,previewHiddenPartyFinaleHazardFight} from '../weekly-party-finale-hazards-v6';
import {deriveHiddenPartyFinaleObjectiveReplay,PARTY_EVENT_FINALE_OBJECTIVES_V7_RELEASED} from '../weekly-party-finale-objectives-v7';
function assert(value:unknown,message:string):asserts value{
 if(!value)throw Error('party-finale-objectives-v7: '+message);
}
function rejects(fn:()=>unknown,code:string){
 let error='';try{fn();}catch(e){error=String(e);}
 assert(error.includes(code),'expected '+code+', got '+error);
}
assert(PARTY_EVENT_FINALE_OBJECTIVES_V7_RELEASED===false,'preview feature remains disabled');
const companion=(companionId:string):OwnedCompanionSnapshot=>({
 companionId,level:10,xp:0,ascensionTier:0,bondLevel:1,bondXp:0,bondTraitUnlocked:false,
});
const roster=[
 {className:'Ironwarden',companionId:'UNIT_001'},  // damage assist with tank class
 {className:'Wayfinder',companionId:'UNIT_002'},   // shield with damage class
 {className:'Dawnkeeper',companionId:'UNIT_007'},  // damage with support class
 {className:'Ravager',companionId:'UNIT_003'},    // healing with damage class
].map((row,index)=>applyCharacterCompanionAssist({
 ...launchPlayer(row.className,25),classId:row.className.toUpperCase(),id:'v7-player-'+index,
},companion(row.companionId)));
assert(roster.every(p=>p.abilities.some(a=>a.tags?.includes('combat_companion'))),
 'real server-character-assist abilities, not invented companion buffs');
const boss:CombatantDefinition={
 id:'PARTY_EVENT_BOSS',name:'V7 test boss',role:'enemy',team:'enemies',level:25,boss:true,
 basicAttackMs:2700,basicAttackCoeff:.8,
 stats:{maxHp:180000,attackPower:300,healingPower:0,defense:400,
  accuracy:750,evasion:110,critChance:.04,critMultiplier:1.4,haste:.03},
 abilities:[],
};
const choices:Record<WeeklyPartyFamily,{stage2:[string,string];stage3:[string,string]}>={
 broken_caravan:{stage2:['safe_pass','fast_pass'],stage3:['brace_wagons','disrupt_raiders']},
 nightfall_hunt:{stage2:['clear_trail','shadow_trail'],stage3:['hold_ground','hunt_alpha']},
 broken_wards:{stage2:['ground_spires','charge_sigils'],stage3:['protect_wards','overload_wards']},
 lost_reliquary:{stage2:['quiet_passage','deep_passage'],stage3:['preserve_seals','break_seals']},
};
let scenarios=0,companionDamageDetected=0;
for(const family of Object.keys(WEEKLY_PARTY_EVENT_FAMILIES) as WeeklyPartyFamily[]){
 for(const variation of WEEKLY_PARTY_EVENT_FAMILIES[family].variations){
  for(const vote of [0,1] as const){
   const hazard=buildHiddenPartyFinaleHazard({
    family,variation,stage2Choice:choices[family].stage2[vote],
    stage3Choice:choices[family].stage3[vote],tier:2,baseline:boss,
   });
   for(const size of [2,3,4]){
    const players=roster.slice(0,size);
    const seed='v7:'+family+':'+variation+':'+vote+':'+size;
    const preview=previewHiddenPartyFinaleHazardFight({
     hazard,players,seed,maxDurationMs:21000,
    });
    const trace=deriveHiddenPartyFinaleObjectiveReplay({
     family,hazard,players,combat:preview.combat,
    });
    assert(trace.kind==='non_rewarding_objective_replay'
     &&!('rewards' in trace)&&!('eventPoints' in trace),
     'objective never mints rewards or EP');
    assert(trace.value>=0&&trace.value<=100&&Number.isFinite(trace.pressure),
     'all objective metrics are bounded');
    assert(trace.hazardResolvedHits<=trace.hazardCastStarts*size,
     'each telegraphed hazard can hit up to one target per party member');
    assert(trace.companionContributions.length===size,
     'companion assists measured from owner-bound abilities');
    assert(trace.companionContributions.every(c=>c.ownerId.startsWith('v7-player-')),
     'no fictitious companion actor is created');
    assert(trace.cues.every(c=>c.atMs>=0),'real event timestamps are replayable');
    if(trace.companionContributions.some(c=>c.damage>0))companionDamageDetected++;
    scenarios++;
   }
  }
 }
}
assert(scenarios===72,'72 four-family, 12-variation, 2-ballot, all-size objective previews');
const exampleHazard=buildHiddenPartyFinaleHazard({family:'broken_caravan',
 variation:'bandits_crossing',stage2Choice:'safe_pass',stage3Choice:'brace_wagons',
 tier:2,baseline:boss});
const fullPreview=previewHiddenPartyFinaleHazardFight({
 hazard:exampleHazard,players:roster,seed:'companion-impact-check',maxDurationMs:90000,
});
const trace=deriveHiddenPartyFinaleObjectiveReplay({
 family:'broken_caravan',hazard:exampleHazard,players:roster,combat:fullPreview.combat,
});
assert(trace.companionContributions.some(c=>c.damage>0)||companionDamageDetected>0,
 'genuine server companion damage assists appear in encounter telemetry');
const replay=deriveHiddenPartyFinaleObjectiveReplay({
 family:'broken_caravan',hazard:exampleHazard,players:roster,combat:fullPreview.combat,
});
assert(JSON.stringify(trace)===JSON.stringify(replay),'same immutable combat events yield same objective replay');
rejects(()=>deriveHiddenPartyFinaleObjectiveReplay({
 family:'nightfall_hunt',hazard:exampleHazard,players:roster,combat:fullPreview.combat,
}),'party_finale_objective_mismatch');
console.log('PASS hidden Party Events v7: '+scenarios+
 ' event-derived objective previews, source-built companion assists and deterministic replay');
