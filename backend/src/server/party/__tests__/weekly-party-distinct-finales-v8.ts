import {launchPlayer} from '../../combat/content/launch-combat';
import type {CombatantDefinition} from '../../combat/types';
import type {OwnedCompanionSnapshot} from '../../companions/domain';
import {applyCharacterCompanionAssist} from '../../companions/character-assist';
import {WEEKLY_PARTY_EVENT_FAMILIES,type WeeklyPartyFamily} from '../weekly-party-events-v2';
import {buildHiddenPartyFamilyEncounterV8,deriveHiddenPartyFamilyObjectiveV8,
 partyEventFamilyDesignV8,previewHiddenPartyFamilyFinaleV8,
 PARTY_EVENT_DISTINCT_FINALES_V8_RELEASED} from '../weekly-party-distinct-finales-v8';

const assert=(ok:unknown,message:string):void=>{if(!ok)throw Error('party-events-v8: '+message);};
const rejects=(act:()=>unknown,needle:string):void=>{
 let error='';try{act();}catch(e){error=String(e);}
 assert(error.includes(needle),'expected rejection '+needle+', received '+error);
};
const companion=(companionId:string):OwnedCompanionSnapshot=>({
 companionId,level:10,xp:0,ascensionTier:0,bondLevel:1,bondXp:0,bondTraitUnlocked:false,
});
const standard=[
 {className:'Ironwarden',companionId:'UNIT_001'},
 {className:'Wayfinder',companionId:'UNIT_002'},
 {className:'Ravager',companionId:'UNIT_003'},
 {className:'Dawnkeeper',companionId:'UNIT_007'},
].map((row,index)=>{
 const player=launchPlayer(row.className,25);
 return applyCharacterCompanionAssist({...player,id:'v8-'+index,
  classId:row.className.toUpperCase()},companion(row.companionId));
});
assert(standard.map(p=>p.role).join(',')==='tank,damage,damage,support',
 'full roster must use the enforced dungeon composition');
assert(PARTY_EVENT_DISTINCT_FINALES_V8_RELEASED===false,'new mechanics remain unreleased');

const boss:CombatantDefinition={
 id:'PARTY_EVENT_BOSS',name:'V8 calibration guardian',team:'enemies',role:'enemy',boss:true,
 level:25,basicAttackMs:2900,basicAttackCoeff:.68,
 stats:{maxHp:32000,attackPower:390,healingPower:0,defense:570,
  accuracy:770,evasion:110,critChance:.05,critMultiplier:1.4,haste:.03},
 abilities:[],
};
const families=Object.keys(WEEKLY_PARTY_EVENT_FAMILIES) as WeeklyPartyFamily[];
const signatures=new Set<string>(),metrics=new Set<string>();
let fights=0,warnings=0,companionEvents=0;
for(const family of families){
 const d=partyEventFamilyDesignV8(family);
 assert(d.stage2.length===2&&d.stage3.length===2,'two distinct routes at each vote');
 for(const variation of WEEKLY_PARTY_EVENT_FAMILIES[family].variations){
  const scenes=new Set<string>();
  for(const stage2Choice of d.stage2.map(c=>c.id)){
   for(const stage3Choice of d.stage3.map(c=>c.id)){
    const input={family,variation,stage2Choice,stage3Choice,tier:2,baseline:boss};
    const encounter=buildHiddenPartyFamilyEncounterV8(input);
    assert(JSON.stringify(encounter)===JSON.stringify(buildHiddenPartyFamilyEncounterV8(input)),
     'same frozen choices build identical boss');
    assert(encounter.kind==='hidden_non_rewarding_family_encounter'
     &&!('rewards' in encounter)&&!('eventPoints' in encounter),
     'no direct event point or reward data');
    assert(encounter.stage2.selected===stage2Choice
     &&encounter.stage3.selected===stage3Choice,'vote choices persist');
    assert(encounter.telegraphs.length===2
     &&encounter.telegraphs.every(t=>t.castTimeMs>=3200),
     'both warning timings remain interruptible');
    assert(encounter.boss.abilities.every(a=>a.interruptible),
     'hidden scenario uses accessible non-class-locked counterplay');
    assert(encounter.boss.stats.maxHp>0&&encounter.boss.stats.attackPower>0,
     'encounter must have viable combat budget');
    const run=previewHiddenPartyFamilyFinaleV8({
     encounter,players:standard,seed:'v8:'+family+':'+variation+':'+stage2Choice+':'+stage3Choice,
     maxDurationMs:25000,
    });
    const trace=run.objective;
    assert(trace.kind==='non_rewarding_family_replay'
     &&!('rewardBand' in trace)&&!('eventPoints' in trace),
     'objective is only a preview, never rewards');
    assert(trace.metric===d.metric&&trace.value>=0&&trace.value<=100
     &&Number.isFinite(trace.value),'bounded unique per-event objective');
    assert(trace.hypotheticalClear===(trace.bossVictory&&trace.objectiveMet),
     'completion considers real boss victory and unique objective');
    assert(trace.cues.every(c=>c.atMs>=0&&c.atMs<=run.combat.durationMs),
     'warnings derive only from the combat log');
    assert(trace.companionContributions.length===4,
     'real equipped companion assists are counted for every player');
    assert(JSON.stringify(trace)===JSON.stringify(deriveHiddenPartyFamilyObjectiveV8({
     encounter,players:standard,combat:run.combat,
    })),'replay is deterministic, side-effect free');
    warnings+=trace.cues.filter(c=>c.kind==='warning').length;
    companionEvents+=trace.companionContributions.filter(c=>c.damage>0||c.actualHealing>0||c.shieldCreated>0).length;
    metrics.add(trace.metric);
    scenes.add(encounter.scene);
    fights++;
   }
  }
  assert(scenes.size===1,'the same variation keeps its narrative identity across votes');
 }
 // Detect materially different combat engine mechanics, not different names.
 const sample=buildHiddenPartyFamilyEncounterV8({family,variation:WEEKLY_PARTY_EVENT_FAMILIES[family].variations[0],
  stage2Choice:d.stage2[0].id,stage3Choice:d.stage3[0].id,tier:2,baseline:boss});
 const signature=JSON.stringify({
  abilities:sample.boss.abilities.map(a=>({
   target:a.target,
   effects:a.effects.map(e=>[e.kind,e.damageType??null,e.tag??null]),
  })),
  phases:sample.boss.phases?.map(p=>p.effects.map(e=>[e.kind,e.tag??null])),
 });
 signatures.add(signature);
 const variationNames=WEEKLY_PARTY_EVENT_FAMILIES[family].variations.map(variation=>
  buildHiddenPartyFamilyEncounterV8({family,variation,stage2Choice:d.stage2[0].id,
   stage3Choice:d.stage3[0].id,tier:2,baseline:boss}).scene);
 assert(new Set(variationNames).size===3,'each event has three unique locations/twists');
 const safe=buildHiddenPartyFamilyEncounterV8({family,
  variation:WEEKLY_PARTY_EVENT_FAMILIES[family].variations[0],
  stage2Choice:d.stage2[0].id,stage3Choice:d.stage3[0].id,tier:2,baseline:boss});
 const risky=buildHiddenPartyFamilyEncounterV8({family,
  variation:WEEKLY_PARTY_EVENT_FAMILIES[family].variations[0],
  stage2Choice:d.stage2[1].id,stage3Choice:d.stage3[1].id,tier:2,baseline:boss});
 assert(safe.boss.stats.maxHp>risky.boss.stats.maxHp,
  'every cautious route trades safer mechanics for a slower battle');
 assert(safe.boss.abilities[0]!.effects[0]!.coeff!<risky.boss.abilities[0]!.effects[0]!.coeff!,
  'aggressive choices increase real enemy strike damage');
 if(family==='nightfall_hunt'){
  assert(risky.boss.stats.evasion>safe.boss.stats.evasion,'shadow trail worsens visibility');
  assert(risky.boss.phases!.some(p=>p.effects.some(e=>e.kind==='debuff'&&e.tag==='damage_taken')),
   'alpha tracking opens timed exposure windows');
 }
 if(family==='broken_wards'){
  const shield=(b:CombatantDefinition)=>b.phases!.filter(p=>p.id.startsWith('PE_V8_'))
   .flatMap(p=>p.effects).filter(e=>e.kind==='shield').reduce((n,e)=>n+(e.flat??0),0);
  assert(shield(safe)>shield(risky),'overload route breaks enemy wards but is riskier');
  const burn=(b:CombatantDefinition)=>b.abilities[0]!.effects.find(e=>e.kind==='dot')?.durationMs;
  assert(burn(safe)!<burn(risky)!,'grounded spires shorten actual rune burn');
 }
 if(family==='lost_reliquary'){
  assert(risky.boss.abilities.some(a=>a.effects.some(e=>e.kind==='dot'&&e.damageType==='true')),
   'seal corruption genuinely bypasses shields');
  assert(safe.boss.stats.defense>risky.boss.stats.defense,
   'broken seals expose the guardian to real attacks');
 }
 if(family==='broken_caravan'){
  assert(safe.boss.abilities.some(a=>a.id.endsWith('CARAVAN_BREACH')
   &&a.target==='current_target'),'cargo breaches are targeted, unlike AoE charge');
 }
}
// Full rosters cannot use four Damage or duplicate Tank even in hidden previews.
// Small forming parties can run test-only previews if each role stays under cap.
const sampleFamily:'broken_caravan'='broken_caravan',d=partyEventFamilyDesignV8(sampleFamily);
const example=buildHiddenPartyFamilyEncounterV8({family:sampleFamily,
 variation:'bandits_crossing',stage2Choice:d.stage2[0].id,
 stage3Choice:d.stage3[0].id,tier:2,baseline:boss});
const allDamage=Array.from({length:4},(_,i)=>({...launchPlayer('Wayfinder',25),id:'four-damage-'+i}));
rejects(()=>previewHiddenPartyFamilyFinaleV8({
 encounter:example,players:allDamage,seed:'invalid',maxDurationMs:10000,
}),'party_finale_role_composition_invalid');
rejects(()=>previewHiddenPartyFamilyFinaleV8({
 encounter:example,players:[standard[0]!,standard[0]!],seed:'duplicate',
}),'party_finale_invalid_roster');
rejects(()=>buildHiddenPartyFamilyEncounterV8({
 family:sampleFamily,variation:'invalid',stage2Choice:d.stage2[0].id,
 stage3Choice:d.stage3[0].id,tier:2,baseline:boss,
}),'party_finale_invalid_family_variation');
rejects(()=>buildHiddenPartyFamilyEncounterV8({
 family:sampleFamily,variation:'bandits_crossing',stage2Choice:'forged',
 stage3Choice:d.stage3[0].id,tier:2,baseline:boss,
}),'party_finale_unresolved_vote');
const short=previewHiddenPartyFamilyFinaleV8({
 encounter:example,players:standard.slice(0,2),seed:'partial-party',maxDurationMs:15000,
});
assert(short.objective.value>=0&&short.objective.value<=100,'valid forming 2-player Party remains valid');
assert(fights===48,'4 distinct events, 3 variations each, all 4 route ballots');
assert(signatures.size===4&&metrics.size===4,
 'each family has unique underlying engine mechanics and objective meter');
assert(warnings>0,'warnings occur as combat events, not narrative placeholders');
assert(companionEvents>0,'equipped companions change actual combat telemetry');
console.log('PASS hidden Party Events v8: '+fights+' deterministic family / variation / route encounters'
 +', 4 unique engine signatures, real companions, exact 1T2D1S composition');
