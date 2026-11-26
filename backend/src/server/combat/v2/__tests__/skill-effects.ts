import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../content/launch-combat';
import {simulateCombatWithServerAuthoritiesV2} from '../../engine';
const simulateCombat=(input:Parameters<typeof simulateCombatWithServerAuthoritiesV2>[0])=>
 simulateCombatWithServerAuthoritiesV2(input,{aiPolicy:'tactical'});
import type {CombatantDefinition} from '../../types';
import {
  CLASS_NAMES_V2,SKILL_IDENTITIES_V2,SKILLS_V2,SPECIALIZATIONS_V2,PASSIVES_V2,
  passiveIdV2,specializationIdV2,serverBuildCatalogV2,
} from '../skill-catalog';
import {
  compileServerSkillBuildV2,simulateCombatWithSkillsV2,type VerifiedSkillBuildV2,
} from '../skill-effects';
import type {ClassIdV2,BuildSelectionV2} from '../build-contract';

assert.equal(SKILL_IDENTITIES_V2.length,54);
assert.equal(SPECIALIZATIONS_V2.length,18);
assert.equal(PASSIVES_V2.length,81);
assert.equal(SKILL_IDENTITIES_V2.reduce((n,s)=>n+s.variants.length,0),162);
assert.equal(new Set(SKILL_IDENTITIES_V2.flatMap(s=>s.variants.map(v=>v.id))).size,162);
assert.equal(new Set(SKILLS_V2.map(s=>s.id)).size,54);
assert.equal(new Set(SPECIALIZATIONS_V2.map(s=>s.id)).size,18);
assert.equal(new Set(PASSIVES_V2.map(s=>s.id)).size,81);

const firstPassive:Record<ClassIdV2,string>={
  IRONWARDEN:'Iron Skin',BASTION:'Stonehide',DREADGUARD:'Blood Iron',
  WAYFINDER:'Eagle Eye',RAVAGER:'Scarred',HEXWEAVER:'Deep Ink',
  KNIFE_DANCER:'Quick Steel',DAWNKEEPER:'Gentle Hands',STONECALLER:'Stone Bond',
};
const enemy:CombatantDefinition={
  id:'E1',name:'Test target',team:'enemies',role:'enemy',level:25,
  stats:{maxHp:1e8,attackPower:4,healingPower:0,defense:0,accuracy:1,evasion:0,critChance:0,critMultiplier:1.5,haste:0},
  basicAttackMs:999999,basicAttackCoeff:0,abilities:[],
};
const results:Record<string,{damage:number;healing:number;casts:number}>={};
for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
  const className=CLASS_NAMES_V2[classId];
  const actor=launchPlayer(className,25);
  const firstTwo=SKILL_IDENTITIES_V2.filter(s=>s.classId===classId).slice(0,2);
  assert.equal(firstTwo.length,2);
  const specializations=SPECIALIZATIONS_V2.filter(s=>s.classId===classId);
  const selection:BuildSelectionV2={
    specializationId:specializations[0].id,equipment:{},
    activeSkills:firstTwo.map(s=>({skillId:s.id,variantId:s.variants[0].id})),
    talentRanks:{[passiveIdV2(classId,firstPassive[classId])]:1},
    signaturePassiveIds:[],capstoneId:null,
  };
  const data:VerifiedSkillBuildV2={
    actor,verified:{classId,level:25,ownedInstanceIds:new Set()},
    selected:selection,ownedItemsById:{},setsById:{},
  };
  const original=JSON.stringify(actor);
  assert.equal(compileServerSkillBuildV2(false,data),actor,'disabled mode must preserve original actor');
  const upgraded=compileServerSkillBuildV2(true,data);
  assert.equal(JSON.stringify(actor),original,'no mutation of authoritative source');
  assert.equal(upgraded.abilities.length,2,'3 active slots but only selected abilities execute');
  assert.ok(upgraded.abilities.every(a=>a.id.includes(':v2:0')));
  assert.ok(upgraded.abilities.every(a=>Number.isFinite(a.cooldownMs)&&a.cooldownMs>0));
  assert.ok(upgraded.tags?.includes('combat-v2'));
  assert.equal(upgraded.role,actor.role);
  assert.equal(upgraded.classId,actor.classId);
  assert.equal(upgraded.level,actor.level);

  const second=compileServerSkillBuildV2(true,{
    ...data,selected:{...selection,specializationId:specializations[1].id},
  });
  assert.notDeepEqual({stats:second.stats,abilities:second.abilities},{stats:upgraded.stats,abilities:upgraded.abilities},'each specialization changes computed combat output');
  // Every first and second signature technique has three server-authored variants.
  for(let i=0;i<2;i++){
    for(let j=0;j<3;j++){
      const picked=compileServerSkillBuildV2(true,{
        ...data,selected:{...selection,activeSkills:[{skillId:firstTwo[i].id,variantId:firstTwo[i].variants[j].id}]},
      });
      assert.equal(picked.abilities.length,1);
      assert.equal(picked.abilities[0].id,actor.abilities.find(x=>x.name===firstTwo[i].name)!.id+':v2:'+j);
      assert.equal(JSON.stringify(actor),original);
    }
  }
  const seed='skill-v2-regression-'+classId;
  const base=simulateCombat({seed,players:[actor],enemies:[enemy],maxDurationMs:25000});
  const a=simulateCombatWithSkillsV2({seed,players:[actor],enemies:[enemy],maxDurationMs:25000},[data],false);
  assert.deepEqual(a,base,'disabled path must preserve exact legacy replay');
  const b=simulateCombatWithSkillsV2({seed,players:[actor],enemies:[enemy],maxDurationMs:25000},[data],true);
  const c=simulateCombatWithSkillsV2({seed,players:[actor],enemies:[enemy],maxDurationMs:25000},[data],true);
  assert.deepEqual(b,c,'new combat must remain fully deterministic');
  assert.ok(b.players[0].damageDone>=0);
  results[classId]={damage:b.players[0].damageDone,healing:b.players[0].healingDone,casts:b.events.filter(e=>e.actorId===actor.id&&e.abilityId?.includes(':v2:')).length};
  const invalid:{[k:string]:any}={...data,selected:{...selection,activeSkills:[{skillId:'client_injected_skill',variantId:'client_exploit'}]}};
  assert.throws(()=>compileServerSkillBuildV2(true,invalid as VerifiedSkillBuildV2),/combat_v2_invalid_build/);
  const unowned:{[k:string]:any}={...data,selected:{...selection,equipment:{ring:'stolen_item'}}};
  assert.throws(()=>compileServerSkillBuildV2(true,unowned as VerifiedSkillBuildV2),/item_not_owned/);
  const mismatched={...data,verified:{...data.verified,level:99}};
  assert.throws(()=>compileServerSkillBuildV2(true,mismatched),/actor_snapshot_mismatch/);
  const fake={...data,actor:{...actor,team:'enemies' as const}};
  assert.throws(()=>compileServerSkillBuildV2(true,fake),/actor_snapshot_mismatch/);
  const another={...data,selected:{...selection,talentRanks:{...selection.talentRanks,
    [passiveIdV2(classId,SKILL_IDENTITIES_V2.find(s=>s.classId===classId)!.name)]:1}}};
  assert.throws(()=>compileServerSkillBuildV2(true,another),/combat_v2_invalid_build/);
}
const sampleId:'IRONWARDEN'='IRONWARDEN';
const sampleActor=launchPlayer('Ironwarden',25);
const first=SKILL_IDENTITIES_V2.find(s=>s.classId===sampleId)!;
const sample:VerifiedSkillBuildV2={
  actor:sampleActor,verified:{classId:sampleId,level:25,ownedInstanceIds:new Set()},
  selected:{specializationId:specializationIdV2(sampleId,'Sentinel'),equipment:{},
    activeSkills:[{skillId:first.id,variantId:first.variants[0].id}],talentRanks:{},
    signaturePassiveIds:[],capstoneId:null},
  ownedItemsById:{},setsById:{},
};
const input={seed:'compound-targeting-v2',players:[sampleActor],enemies:[enemy],maxDurationMs:2000};
const fight=simulateCombatWithSkillsV2(input,[sample],true);
assert.ok(fight.events.some(e=>e.type==='status_apply'&&e.targetId===sampleActor.id&&e.statusTag==='damage_taken'),
  'Rune Challenge variant adds a self ward while targeting the enemy');
assert.ok(fight.events.some(e=>e.type==='damage'&&e.actorId===sampleActor.id&&e.targetId===enemy.id),
  'Rune Challenge still damages its enemy target');
assert.throws(()=>simulateCombatWithSkillsV2(input,[sample,sample],true),/duplicate_build_actor/);
assert.throws(()=>simulateCombatWithSkillsV2(input,[{...sample,actor:{...sampleActor}}],true),/actor_snapshot_mismatch/);
assert.throws(()=>simulateCombatWithSkillsV2(input,[{...sample,actor:{...sampleActor,id:'P_NOT_PRESENT'}}],true),/build_actor_not_in_encounter/);
const locked={...sample,selected:{...sample.selected,capstoneId:SPECIALIZATIONS_V2.find(s=>s.id===sample.selected.specializationId)!.capstoneId}};
assert.throws(()=>compileServerSkillBuildV2(true,locked),/capstone_locked/);
assert.equal(Object.keys(results).length,9);

// Full catalog audit: every class's six skills and their three individually
// authored variants must build correctly, never depending on untrusted values.
for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
  const actor=launchPlayer(CLASS_NAMES_V2[classId],50);
  const classSkills=SKILL_IDENTITIES_V2.filter(x=>x.classId===classId);
  assert.equal(classSkills.length,6);
  const specializationId=SPECIALIZATIONS_V2.find(x=>x.classId===classId)!.id;
  for(const skill of classSkills){
    const configs=skill.variants.map(variant=>{
      const loadout:VerifiedSkillBuildV2={
        actor,verified:{classId,level:50,ownedInstanceIds:new Set()},
        selected:{specializationId,equipment:{},
          activeSkills:[{skillId:skill.id,variantId:variant.id}],
          talentRanks:{},signaturePassiveIds:[],capstoneId:null},
        ownedItemsById:{},setsById:{},
      };
      const compiled=compileServerSkillBuildV2(true,loadout);
      assert.equal(compiled.abilities.length,1);
      assert.equal(compiled.abilities[0].name,skill.name);
      assert.ok(compiled.abilities[0].cooldownMs>=1200);
      assert.ok(compiled.abilities[0].effects.length>0);
      assert.equal(compiled.combatV2?.resource,({
        IRONWARDEN:'guard',BASTION:'barrier',DREADGUARD:'dread',
        WAYFINDER:'focus',RAVAGER:'fury',HEXWEAVER:'threads',
        KNIFE_DANCER:'rhythm',DAWNKEEPER:'radiance',STONECALLER:'resonance',
      } as Record<ClassIdV2,string>)[classId]);
      return JSON.stringify({
        effects:compiled.abilities[0].effects,cd:compiled.abilities[0].cooldownMs,
        target:compiled.abilities[0].target,
      });
    });
    assert.equal(new Set(configs).size,3,skill.name+' must have 3 distinct executable variants');
  }
}

// Source-event integration: Wayfinder earns Focus from actual successful hits
// and spends held stacks through the server-authored Perfect Quarry.
const focusActor=launchPlayer('Wayfinder',50);
const focusSkills=SKILL_IDENTITIES_V2.filter(x=>x.classId==='WAYFINDER').slice(0,2);
const focusBuild:VerifiedSkillBuildV2={
  actor:focusActor,verified:{classId:'WAYFINDER',level:50,ownedInstanceIds:new Set()},
  selected:{specializationId:SPECIALIZATIONS_V2.find(x=>x.classId==='WAYFINDER')!.id,
    equipment:{},activeSkills:focusSkills.map(x=>({skillId:x.id,variantId:x.variants[0].id})),
    talentRanks:{},signaturePassiveIds:[],capstoneId:null},
  ownedItemsById:{},setsById:{},
};
const focusFight=simulateCombatWithSkillsV2({
  seed:'combat-v2-focus-spend',players:[focusActor],enemies:[enemy],maxDurationMs:30000,
},[focusBuild],true);
assert.ok(focusFight.events.some(x=>x.type==='resource_gain'&&x.resource==='focus'),'hits award Focus');
assert.ok(focusFight.events.some(x=>x.type==='resource_spend'&&x.resource==='focus'),'Perfect Quarry consumes Focus');
assert.ok(focusFight.events.filter(x=>x.type.startsWith('resource_'))
  .every(x=>x.resourceAfter!==undefined&&x.resourceAfter>=0&&x.resourceAfter<=3));


// Polish checks: conditional healing, precise support targeting and proper
// execute-only damage must be represented in the actual compiled effects.
function abilityFor(classId:ClassIdV2,skillName:string,variant:number,
 talentRanks:Record<string,number>={}){
  const actor=launchPlayer(CLASS_NAMES_V2[classId],50);
  const spec=SPECIALIZATIONS_V2.find(s=>s.classId===classId)!;
  const skill=SKILL_IDENTITIES_V2.find(s=>s.classId===classId&&s.name===skillName)!;
  const chosen:VerifiedSkillBuildV2={
    actor,verified:{classId,level:50,ownedInstanceIds:new Set()},
    selected:{specializationId:spec.id,capstoneId:spec.capstoneId,equipment:{},
      activeSkills:[{skillId:skill.id,variantId:skill.variants[variant].id}],
      talentRanks,signaturePassiveIds:[]},
    ownedItemsById:{},setsById:{},
  };
  const compiled=compileServerSkillBuildV2(true,chosen);
  assert.equal(compiled.combatV2?.capstoneId,spec.capstoneId);
  return compiled.abilities[0];
}
const mercy=abilityFor('DAWNKEEPER','Dawn Mend',0);
assert.ok(mercy.effects.some(e=>e.kind==='heal'&&e.healBelowHpPct===.35&&e.healBonus===.25));
const spring=abilityFor('STONECALLER','River Stone',0);
assert.ok(spring.effects.some(e=>e.kind==='heal'&&e.healBelowHpPct===.40&&e.healBonus===.25));
const shared=abilityFor('DAWNKEEPER','Sunthread',1);
assert.equal(shared.target,'two_lowest_hp_allies');
const execution=abilityFor('WAYFINDER','Heartseeker',0);
assert.ok(execution.effects.some(e=>e.executeBelowHpPct===.35&&e.executeBonus===.30));
assert.ok(execution.effects.every(e=>!e.executeBelowHpPct||(e.coeff??0)>1));
const finisher=abilityFor('RAVAGER','Overpower',0);
assert.ok(finisher.effects.some(e=>e.executeBelowHpPct===.35&&e.executeBonus===.30));
assert.ok(finisher.effects.every(e=>!e.executeBelowHpPct||(e.coeff??0)>1));

// Variant-added effects should receive class/talent bonuses without being
// multiplied again by the primary variant's coefficient. This matters for
// low-HP healer variants, reflective shields and bonus taunts.
const reflectiveOath=abilityFor('IRONWARDEN','Oathwall',2);
assert.equal(reflectiveOath.effects.find(e=>e.kind==='shield'&&e.shieldReflectPct===.15)?.coeff,1.4045,
 'Sentinel overall and Oathwall-specific shield bonuses both apply');
assert.ok(reflectiveOath.effects.some(e=>e.kind==='shield'&&e.coeff===0),
 'the primary Oathwall shield stays disabled by the Reflective Oath variant');

const dawnHoT=abilityFor('DAWNKEEPER','Dawn Mend',1,{
  [passiveIdV2('DAWNKEEPER','Gentle Hands')]:1,
  [passiveIdV2('DAWNKEEPER','Healing Flow')]:1,
});
assert.equal(dawnHoT.effects.find(e=>e.kind==='hot')?.coeff,.108,
 'secondary Dawn Mend HoT receives Lightbringer + Healing Flow, not primary heal multiplier');

const enhancedTaunt=abilityFor('IRONWARDEN','Rune Challenge',1,{
  [passiveIdV2('IRONWARDEN','Firm Challenge')]:1,
});
assert.equal(enhancedTaunt.effects.find(e=>e.kind==='taunt'&&e.value===945)?.value,945,
 'secondary Provocation taunt receives the invested threat modifier');

// Thunder Totem is a persistent server-owned actor state, not an instant
// generic strike with a cosmetically named expiration. Its pulses do not
// recursively mint resonance, gem direct-hit procs or passive combos.
const totemActor=launchPlayer('Stonecaller',50);
const totemSkill=SKILL_IDENTITIES_V2.find(x=>x.classId==='STONECALLER'&&x.name==='Thunder Totem')!;
const runeshaper=SPECIALIZATIONS_V2.find(x=>x.id===specializationIdV2('STONECALLER','Runeshaper'))!;
const totemBuild:VerifiedSkillBuildV2={
  actor:totemActor,verified:{classId:'STONECALLER',level:50,ownedInstanceIds:new Set()},
  selected:{specializationId:runeshaper.id,equipment:{},
    activeSkills:[{skillId:totemSkill.id,variantId:totemSkill.variants[0].id}],
    talentRanks:{},signaturePassiveIds:[],capstoneId:runeshaper.capstoneId},
  ownedItemsById:{},setsById:{},
};
const totemEncounter={seed:'stonecaller-persistent-totem',players:[totemActor],enemies:[enemy],
  maxDurationMs:6500,tickMs:100};
const totemFight=simulateCombatWithSkillsV2(totemEncounter,[totemBuild],true);
assert.deepEqual(totemFight,simulateCombatWithSkillsV2(totemEncounter,[totemBuild],true),
 'totem pulse cadence and capstone replay must be deterministic');
const pulses=totemFight.events.filter(e=>e.type==='dot_tick'&&e.abilityId?.startsWith('V2_TOTEM:'));
assert.deepEqual(pulses.map(e=>e.atMs),[2000,4000,6000],
 'one Thunder Totem has exactly three bounded pulses at 2s intervals');
assert.ok(totemFight.events.some(e=>e.type==='capstone_trigger'&&
  e.abilityId===runeshaper.capstoneId&&e.atMs===6000),
 'Ritual Surge triggers on actual totem expiration, not the old 4s shortcut');
assert.equal(totemFight.events.filter(e=>e.type==='resource_gain'&&
  e.abilityId?.startsWith('V2_TOTEM:')).length,0,
 'persistent totem damage cannot generate free Resonance');

// A refreshed V2 buff replaces only the previous cast from its same skill;
// independent effects within a single cast remain intact. The legacy engine
// intentionally retains its original modifier stacking/replay semantics.
const statusActor={...compileServerSkillBuildV2(true,totemBuild),abilities:[{
  id:'TEST_REFRESH:v2:0',name:'Synthetic V2 status',cooldownMs:1000,castTimeMs:0,
  priority:100,target:'self' as const,effects:[
    {kind:'buff' as const,tag:'haste',value:.015,durationMs:5000},
    {kind:'buff' as const,tag:'haste',value:.01,durationMs:5000},
  ],
}]};
const statusInput={seed:'v2-status-refresh',players:[statusActor],enemies:[enemy],
  maxDurationMs:3500,tickMs:100};
const statusFight=simulateCombat(statusInput);
assert.equal(statusFight.players[0].modifiers.filter(m=>m.tag==='haste').length,2,
 'V2 same-skill recasts refresh both authored status effects instead of growing stacks');
const legacyStatusActor={...statusActor,combatV2:undefined,tags:[]};
const legacyStatus=simulateCombat({...statusInput,players:[legacyStatusActor]});
assert.equal(legacyStatus.players[0].modifiers.filter(m=>m.tag==='haste').length,8,
 'existing legacy status stack behavior must not change');

// Repeated V2 DoT casts refresh exactly their original source/tag, but
// retain both intentional same-cast ticks. Legacy periods remain untouched.
const dotAbilityId='TEST_DOT_REFRESH:v2:0';
const dotActor:CombatantDefinition={...statusActor,abilities:[{
  id:dotAbilityId,name:'Synthetic V2 double DoT',cooldownMs:1000,castTimeMs:0,
  priority:100,target:'current_target',effects:[
    {kind:'dot',coeff:.05,damageType:'shadow',durationMs:5000,tickMs:2000},
    {kind:'dot',coeff:.05,damageType:'shadow',durationMs:5000,tickMs:2000},
  ],
}]};
const dotInput={seed:'v2-periodic-refresh',players:[dotActor],enemies:[enemy],
  maxDurationMs:3500,tickMs:100};
const dotRun=simulateCombat(dotInput);
assert.equal(dotRun.enemies[0].periodic.filter(p=>p.effectId===dotAbilityId).length,2,
 'V2 same-ability DoTs refresh without destroying intentional same-cast twin effects');
const legacyDotActor={...dotActor,combatV2:undefined,tags:[]};
const legacyDot=simulateCombat({...dotInput,players:[legacyDotActor]});
assert.equal(legacyDot.enemies[0].periodic.filter(p=>p.effectId===dotAbilityId).length,8,
 'legacy DoT stacking remains unchanged');

// An Ironwarden's selected Riposte creates a short retaliatory stance.
const ironBase=launchPlayer('Ironwarden',50);
const riposteSkill=SKILL_IDENTITIES_V2.find(x=>x.classId==='IRONWARDEN'&&x.name==='Iron Riposte')!;
const riposteBuild:VerifiedSkillBuildV2={
  actor:ironBase,verified:{classId:'IRONWARDEN',level:50,ownedInstanceIds:new Set()},
  selected:{specializationId:specializationIdV2('IRONWARDEN','Sentinel'),equipment:{},
    activeSkills:[{skillId:riposteSkill.id,variantId:riposteSkill.variants[0].id}],
    talentRanks:{},signaturePassiveIds:[],capstoneId:null},
  ownedItemsById:{},setsById:{},
};
const riposteActor=compileServerSkillBuildV2(true,riposteBuild);
const closeCombatEnemy:CombatantDefinition={...enemy,
  stats:{...enemy.stats,accuracy:100000,attackPower:5},
  basicAttackMs:500,basicAttackCoeff:.15};
const counterInput={seed:'ironwarden-counter-window',players:[riposteActor],
  enemies:[closeCombatEnemy],maxDurationMs:2500,tickMs:100};
const riposteFight=simulateCombat(counterInput);
assert.equal(riposteFight.events.filter(e=>e.abilityId==='V2_COUNTER:IRON_RIPOSTE'&&
  e.type==='damage').length,1,'Riposte triggers one bounded counter during its ward window');
assert.equal(riposteFight.events.filter(e=>e.abilityId==='V2_COUNTER:IRON_RIPOSTE'&&
  e.type==='resource_gain').length,0,'counter cannot mint Guard Marks');
const legacyRiposteActor={...riposteActor,combatV2:undefined,tags:[]};
assert.equal(simulateCombat({...counterInput,players:[legacyRiposteActor]}).events.filter(e=>
  e.abilityId==='V2_COUNTER:IRON_RIPOSTE').length,0,
 'the counter only executes with an authenticated V2 stance');

const hexRupture=abilityFor('HEXWEAVER','Black Thread',1);
assert.ok(hexRupture.effects.some(e=>e.kind==='damage'&&e.consumeOwnedDotFraction===.35),
 'Rupture must consume an already-active self-applied DoT');
const bloodRend=abilityFor('DREADGUARD','Soul Rend',0);
assert.ok(bloodRend.effects.some(e=>e.kind==='damage'&&e.lifestealPct===.12),
 'Dreadguard Blood Rend healing must come from actual damage');
assert.ok(!bloodRend.effects.some(e=>e.kind==='heal'),
 'Flat heal must not duplicate authored lifesteal');
const soulRend=abilityFor('HEXWEAVER','Hex Detonation',1);
assert.ok(soulRend.effects.some(e=>e.kind==='damage'&&e.lifestealPct===.10),
 'Hexweaver Soul Rend must use damage-based lifesteal');
console.log('PASS: all nine classes, 18 profiles, 162 variants across 54 skills, deterministic runtime, trust and legacy parity');

// Critical-support pass: real authored variants, per-recipient resolution,
// exact boundary, dead recipients, mixed legacy isolation and deterministic replay.
const sanctuary=abilityFor('DAWNKEEPER','Solar Hymn',0);
const wideRoots=abilityFor('STONECALLER','Seismic Shelter',1);
assert.ok(sanctuary.effects.some(e=>e.kind==='heal'&&e.healBelowHpPct===.30&&e.healBonus===.20));
assert.ok(wideRoots.effects.some(e=>e.kind==='shield'&&e.shieldBelowHpPct===.30&&e.shieldBonus===.25));
assert.ok(abilityFor('DAWNKEEPER','Solar Hymn',1).effects.every(e=>e.healBelowHpPct===undefined));
assert.ok(abilityFor('STONECALLER','Seismic Shelter',0).effects.every(e=>e.shieldBelowHpPct===undefined));
for(const [classId,skillName,variant,kind,threshold,bonus] of [
 ['DAWNKEEPER','Solar Hymn',0,'heal',.30,.20],
 ['STONECALLER','Seismic Shelter',1,'shield',.30,.25],
 ['DAWNKEEPER','Dawn Mend',0,'heal',.35,.25],
 ['STONECALLER','River Stone',0,'heal',.40,.25],
] as const){
 const base=launchPlayer(CLASS_NAMES_V2[classId],50);
 const skill=SKILL_IDENTITIES_V2.find(s=>s.classId===classId&&s.name===skillName)!;
 const data:VerifiedSkillBuildV2={actor:base,
   verified:{classId,level:50,ownedInstanceIds:new Set()},
   selected:{specializationId:SPECIALIZATIONS_V2.find(s=>s.classId===classId)!.id,
     equipment:{},activeSkills:[{skillId:skill.id,variantId:skill.variants[variant].id}],
     talentRanks:{},signaturePassiveIds:[],capstoneId:null},ownedItemsById:{},setsById:{}};
 const compiled=compileServerSkillBuildV2(true,data);
 // Fixed HP and healing power isolate the authored multiplier from scaling.
 const healer={...compiled,id:'CR_SUPPORT',stats:{...compiled.stats,maxHp:1000,healingPower:100},basicAttackCoeff:0};
 const ally=(id:string):CombatantDefinition=>({...launchPlayer('Ironwarden',50),id,
   stats:{...base.stats,maxHp:1000},abilities:[],basicAttackCoeff:0,basicAttackMs:999999});
 const critical=ally('CR_LOW'),boundary=ally('CR_BOUNDARY'),fallen=ally('CR_DOWN');
 const carry=(hp:number,downed=false)=>({hp,downed,cooldownRemainingMs:{},basicAttackRemainingMs:999999});
 const input={seed:'critical-support-'+skillName,players:[healer,critical,boundary,fallen],
   enemies:[enemy],maxDurationMs:1000,tickMs:100,initialPlayerState:{
     [healer.id]:carry(800),[critical.id]:carry(Math.round(threshold*1000)-1),
     [boundary.id]:carry(Math.round(threshold*1000)),[fallen.id]:carry(0,true)}};
 const plain={...healer,abilities:healer.abilities.map(a=>({...a,effects:a.effects.map(e=>({
   ...e,healBelowHpPct:undefined,healBonus:undefined,shieldBelowHpPct:undefined,shieldBonus:undefined}))}))};
 const run=simulateCombat(input), control=simulateCombat({...input,players:[plain,critical,boundary,fallen]});
 assert.deepEqual(run,simulateCombat(input),'deterministic critical support '+skillName);
 const event=(r:typeof run,id:string)=>r.events.find(e=>e.type===kind&&e.actorId===healer.id&&
   e.targetId===id&&e.abilityId===healer.abilities[0].id);
 const boosted=event(run,critical.id),normal=event(control,critical.id);
 assert.ok(boosted&&normal&&normal.amount!>0,skillName+' must reach injured ally');
 assert.ok(Math.abs(boosted.amount!-normal.amount!*(1+bonus))<=.03,skillName+' conditional multiplier');
 assert.equal(event(run,fallen.id),undefined,'no effect on downed actor');
 if(skillName==='Solar Hymn'||skillName==='Seismic Shelter'){
   assert.ok(event(run,boundary.id),'party-wide skill must include boundary ally');
   assert.equal(event(run,boundary.id)?.amount,event(control,boundary.id)?.amount,'strict below threshold');
   assert.equal(event(run,healer.id)?.amount,event(control,healer.id)?.amount,'healthy recipient unchanged');
 }
 const legacy={...healer,combatV2:undefined,tags:[]};
 const legacyPlain={...plain,combatV2:undefined,tags:[]};
 // Keep a different V2 party member present to exercise mixed-mode isolation.
 const mixed={...boundary,combatV2:compiled.combatV2};
 assert.deepEqual(simulateCombat({...input,players:[legacy,critical,mixed,fallen]}).events,
   simulateCombat({...input,players:[legacyPlain,critical,mixed,fallen]}).events,
   'legacy source must not gain threshold bonus from another V2 party member');
}
console.log('PASS: authored critical-support variants, recipient boundaries, downed exclusion and mixed-mode parity');

// Emergency triage regression: compile actual Stonecaller and Dawnkeeper
// abilities and isolate their first decision using carried HP and cooldowns.
const triageCarry=(hp:number,downed=false,cooldownRemainingMs:Record<string,number>={})=>
 ({hp,downed,cooldownRemainingMs,basicAttackRemainingMs:999999});
const triageAlly=(id:string):CombatantDefinition=>{
 const base=launchPlayer('Ironwarden',50);
 return {...base,id,stats:{...base.stats,maxHp:1000},abilities:[],basicAttackCoeff:0,basicAttackMs:999999};
};
for(const classId of ['STONECALLER','DAWNKEEPER'] as const){
 const base=launchPlayer(CLASS_NAMES_V2[classId],50);
 const names=classId==='STONECALLER'?['Resonant Armor','River Stone','Thunder Totem']:['Sunthread','Dawn Mend','Sun Smite'];
 const data:VerifiedSkillBuildV2={actor:base,verified:{classId,level:50,ownedInstanceIds:new Set()},
   selected:{specializationId:SPECIALIZATIONS_V2.find(s=>s.classId===classId)!.id,equipment:{},
     activeSkills:names.map(name=>{const s=SKILL_IDENTITIES_V2.find(s=>s.classId===classId&&s.name===name)!;
       return {skillId:s.id,variantId:s.variants[0].id};}),talentRanks:{},signaturePassiveIds:[],capstoneId:null},
   ownedItemsById:{},setsById:{}};
 const compiled=compileServerSkillBuildV2(true,data);
 const healer={...compiled,id:'TR_SUPPORT',stats:{...compiled.stats,maxHp:1000,healingPower:100},
   basicAttackCoeff:0,abilities:compiled.abilities.map(a=>({...a,
     // Force authored priority conflict to exercise selection rather than
     // accidentally passing because the heal already has highest priority.
     priority:a.name===names[2]?200:a.name===names[0]?150:100}))};
 const healId=healer.abilities.find(a=>a.name===names[1])!.id;
 const routineId=healer.abilities.find(a=>a.name===names[0])!.id;
 const damageId=healer.abilities.find(a=>a.name===names[2])!.id;
 const low=triageAlly('TR_A'),tie=triageAlly('TR_B'),down=triageAlly('TR_DOWN');
 const input={seed:'emergency-triage-'+classId,players:[healer,tie,low,down],enemies:[enemy],
   maxDurationMs:500,tickMs:100,initialPlayerState:{
     [healer.id]:triageCarry(1000),[low.id]:triageCarry(200),[tie.id]:triageCarry(200),[down.id]:triageCarry(0,true)}};
 const fight=simulateCombat(input);
 const relevant=fight.events.find(e=>e.actorId===healer.id&&[healId,routineId,damageId].includes(e.abilityId??'')&&
   ['cast_start','heal','shield','damage','miss','status_apply'].includes(e.type));
 assert.equal(relevant?.abilityId,healId,'ready emergency heal beats higher-priority routine skill and damage');
 assert.equal(relevant?.targetId,low.id,'equal critical HP resolves by stable actor ID');
 assert.deepEqual(fight,simulateCombat(input));
 const reordered=simulateCombat({...input,players:[healer,low,tie,down]});
 assert.equal(reordered.events.find(e=>e.actorId===healer.id&&e.abilityId===healId&&
   (e.type==='heal'||e.type==='cast_start'))?.targetId,low.id);
 const boundary={...input,initialPlayerState:{...input.initialPlayerState,[low.id]:triageCarry(300),[tie.id]:triageCarry(300)}};
 assert.ok(simulateCombat(boundary).events.some(e=>e.actorId===healer.id&&e.abilityId===damageId&&e.atMs===0),
   'exactly 30% retains ordinary priority');
 const blocked={...input,initialPlayerState:{...input.initialPlayerState,[healer.id]:triageCarry(1000,false,{[healId]:10000})}};
 const fallback=simulateCombat(blocked);
 assert.ok(!fallback.events.some(e=>e.actorId===healer.id&&e.abilityId===healId),'no cooldown bypass');
 if(classId==='STONECALLER')assert.ok(fallback.events.some(e=>e.type==='shield'&&e.actorId===healer.id&&
   e.abilityId===routineId&&e.targetId===low.id&&e.atMs===0),'ready protective shield before damage');
 else assert.ok(fallback.events.some(e=>e.actorId===healer.id&&e.abilityId===damageId&&e.atMs===0),
   'HoT-only routine is not promoted as immediate healing');
 if(classId==='DAWNKEEPER'){
   // The first target is downed during a 500ms Dawn Mend cast. The
   // surviving critical ally can receive that already-paid cast.
   const killer:CombatantDefinition={...enemy,stats:{...enemy.stats,accuracy:100000},
     abilities:[{id:'TR_LETHAL',name:'Triage test strike',priority:100,
       target:'current_target',cooldownMs:100000,castTimeMs:100,
       effects:[{kind:'damage',damageType:'true',flat:100000}]}]};
   const lost=simulateCombat({...input,players:[healer,low,tie,down],enemies:[killer]});
   assert.ok(lost.events.some(e=>e.type==='down'&&e.targetId===low.id&&e.atMs<500));
   assert.ok(lost.events.some(e=>e.type==='cast_complete'&&e.abilityId===healId&&e.targetId===tie.id));
   assert.ok(lost.events.some(e=>e.type==='heal'&&e.abilityId===healId&&e.targetId===tie.id));
   assert.equal(lost.events.filter(e=>e.type==='cast_start'&&e.abilityId===healId).length,1);
 }
 const legacy={...healer,combatV2:undefined,tags:[]};
 assert.ok(simulateCombat({...input,players:[legacy,tie,low,down]}).events.some(e=>
   e.actorId===legacy.id&&e.abilityId===damageId&&e.atMs===0),'legacy priority unchanged');
}
console.log('PASS: V2 emergency triage, stable ties, boundaries, cooldowns and legacy priority');

// Predictive support: actual compiled shield techniques with a visible
// synthetic boss cast. No pre-cast clairvoyance or cooldown bypass.
const predictiveBase=launchPlayer('Stonecaller',50);
const predictiveNames=['Resonant Armor','Seismic Shelter','Earthen Grasp'];
const predictiveBuild:VerifiedSkillBuildV2={actor:predictiveBase,
 verified:{classId:'STONECALLER',level:50,ownedInstanceIds:new Set()},
 selected:{specializationId:SPECIALIZATIONS_V2.find(s=>s.classId==='STONECALLER')!.id,equipment:{},
   activeSkills:predictiveNames.map(name=>{const s=SKILL_IDENTITIES_V2.find(s=>s.classId==='STONECALLER'&&s.name===name)!;
     return {skillId:s.id,variantId:s.variants[name==='Seismic Shelter'?1:0].id};}),
   talentRanks:{},signaturePassiveIds:[],capstoneId:null},ownedItemsById:{},setsById:{}};
const predictiveCompiled=compileServerSkillBuildV2(true,predictiveBuild);
const predictiveActor={...predictiveCompiled,id:'PR_SUPPORT',stats:{...predictiveCompiled.stats,maxHp:1000,healingPower:100},
 abilities:predictiveCompiled.abilities.map(a=>({...a,priority:a.name==='Earthen Grasp'?200:a.name==='Resonant Armor'?100:90})),
 basicAttackCoeff:0};
const singleShield=predictiveActor.abilities.find(a=>a.name==='Resonant Armor')!.id;
const groupShield=predictiveActor.abilities.find(a=>a.name==='Seismic Shelter')!.id;
const offense=predictiveActor.abilities.find(a=>a.name==='Earthen Grasp')!.id;
const forecastTank=triageAlly('PR_TANK'),forecastOther=triageAlly('PR_OTHER');
const forecastBoss=(target:'current_target'|'all_enemies'|'random_enemy',flat:number,castTimeMs=1000):CombatantDefinition=>({
 ...enemy,boss:true,stats:{...enemy.stats,attackPower:0,accuracy:100000,critChance:0},
 abilities:[{id:'PR_TELEGRAPH',name:'Telegraphed strike',target,castTimeMs,cooldownMs:999999,
   priority:100,effects:[{kind:'damage',flat,damageType:'true'}]}]});
const forecastInput={seed:'predictive-support',players:[predictiveActor,forecastTank,forecastOther],
 enemies:[forecastBoss('current_target',500)],maxDurationMs:1100,tickMs:100,
 initialPlayerState:{[predictiveActor.id]:triageCarry(1000,false,{[offense]:0}),
   [forecastTank.id]:triageCarry(1000),[forecastOther.id]:triageCarry(1000)}};
const singleForecast=simulateCombat(forecastInput);
const firstShield=(r:typeof singleForecast)=>r.events.find(e=>e.type==='shield'&&e.actorId===predictiveActor.id);
assert.equal(firstShield(singleForecast)?.abilityId,singleShield);
assert.equal(firstShield(singleForecast)?.targetId,forecastTank.id);
assert.equal(firstShield(singleForecast)?.atMs,100,'respond only after visible cast begins');
const aoeForecast=simulateCombat({...forecastInput,enemies:[forecastBoss('all_enemies',500)]});
assert.equal(firstShield(aoeForecast)?.abilityId,groupShield,'group shield covers multiple threatened allies');
assert.equal(aoeForecast.events.filter(e=>e.type==='shield'&&e.abilityId===groupShield&&e.atMs===100).length,3);
assert.deepEqual(aoeForecast,simulateCombat({...forecastInput,enemies:[forecastBoss('all_enemies',500)]}));
// Keep offense ready in the controls so ordinary always-eligible group
// shielding cannot be mistaken for predictive promotion.
const forecastControl=(boss:CombatantDefinition,lockShield=false)=>{
 const actor={...predictiveActor,abilities:predictiveActor.abilities.map(a=>({...a,
   // Keep an always-ready higher-priority offensive rotation.
   cooldownMs:a.id===offense?100:a.cooldownMs}))};
 return simulateCombat({...forecastInput,players:[actor,forecastTank,forecastOther],enemies:[boss],
   maxDurationMs:300,initialPlayerState:{...forecastInput.initialPlayerState,
     [actor.id]:triageCarry(1000,false,lockShield?{[singleShield]:10000,[groupShield]:10000}:{})}});
};
assert.equal(firstShield(forecastControl(forecastBoss('current_target',20))),undefined,'minor hits do not trigger forecast');
assert.equal(firstShield(forecastControl(forecastBoss('random_enemy',500))),undefined,'unknown target is not predicted');
assert.equal(firstShield(forecastControl(forecastBoss('current_target',500,5000))),undefined,'long lead time is ignored');
assert.equal(firstShield(forecastControl(forecastBoss('all_enemies',500),true)),undefined,'no cooldown bypass');
const nonBoss={...forecastBoss('all_enemies',500),boss:false};
assert.equal(firstShield(forecastControl(nonBoss)),undefined,'nonboss attacks do not activate predictive policy');
console.log('PASS: visible boss forecast, group protection, target certainty and cooldown guards');

// Existing sufficient shielding should remove forecast pressure.
const preShieldTank:CombatantDefinition={...forecastTank,abilities:[{
 id:'PR_PRE_SHIELD',name:'Test existing shield',target:'self',castTimeMs:0,cooldownMs:999999,
 priority:100,effects:[{kind:'shield',flat:1000}]}]};
const continuousOffense={...predictiveActor,abilities:predictiveActor.abilities.map(a=>({...a,
 cooldownMs:a.id===offense?100:a.cooldownMs}))};
const covered=simulateCombat({...forecastInput,players:[continuousOffense,preShieldTank,forecastOther],
 maxDurationMs:300});
assert.equal(firstShield(covered),undefined,'already-covered telegraph must not consume another support shield');

// Actual authored Stonecaller recovery: preserve a group cooldown if one
// patient can be returned above 45% using an equally fast ordinary heal.
const conserveNames=['River Stone','Resonance Burst','Earthen Grasp'];
const conserveBuild:VerifiedSkillBuildV2={...predictiveBuild,selected:{...predictiveBuild.selected,
 activeSkills:conserveNames.map(name=>{const s=SKILL_IDENTITIES_V2.find(s=>s.classId==='STONECALLER'&&s.name===name)!;
 return {skillId:s.id,variantId:s.variants[name==='Resonance Burst'?2:0].id};})}};
const conserveCompiled=compileServerSkillBuildV2(true,conserveBuild);
const conserveActor={...conserveCompiled,id:'PR_SUPPORT',stats:{...conserveCompiled.stats,maxHp:1000,healingPower:400},
 abilities:conserveCompiled.abilities.map(a=>({...a,priority:a.name==='Resonance Burst'?200:100})),
 basicAttackCoeff:0};
const ordinaryId=conserveActor.abilities.find(a=>a.name==='River Stone')!.id;
const groupHealId=conserveActor.abilities.find(a=>a.name==='Resonance Burst')!.id;
const conserveInput={...forecastInput,players:[conserveActor,forecastTank,forecastOther],enemies:[enemy],
 maxDurationMs:100,tickMs:100,initialPlayerState:{
  [conserveActor.id]:triageCarry(1000),[forecastTank.id]:triageCarry(200),[forecastOther.id]:triageCarry(1000)}};
const firstRecovery=(r:typeof singleForecast)=>r.events.find(e=>e.type==='heal'&&e.actorId===conserveActor.id);
assert.equal(firstRecovery(simulateCombat(conserveInput))?.abilityId,ordinaryId,'single patient: conserve group recovery');
assert.equal(firstRecovery(simulateCombat({...conserveInput,initialPlayerState:{...conserveInput.initialPlayerState,
 [forecastOther.id]:triageCarry(200)}}))?.abilityId,groupHealId,'multiple critical patients: keep group recovery');
const weakHealer={...conserveActor,stats:{...conserveActor.stats,healingPower:30}};
assert.equal(firstRecovery(simulateCombat({...conserveInput,players:[weakHealer,forecastTank,forecastOther]}))?.abilityId,
 groupHealId,'ordinary heal too weak: retain group recovery');
assert.equal(firstRecovery(simulateCombat({...conserveInput,initialPlayerState:{...conserveInput.initialPlayerState,
 [conserveActor.id]:triageCarry(1000,false,{[ordinaryId]:10000})}}))?.abilityId,
 groupHealId,'ordinary cooldown: retain group recovery');
console.log('PASS: existing shield coverage and nominal single-target healing conservation');

// Tank AI: compiled class techniques, visible dangerous casts, and existing
// authored protection only. Enemy fixture is synthetic, not boss tuning.
for(const [classId,defensive,interrupt,offensive] of [
 ['IRONWARDEN','Oathwall','Rune Bash','Rune Challenge'],
 ['BASTION','Layered Fortress','Fortress Rebuff','Bastion Challenge'],
 ['DREADGUARD','Grim Resolve','Binding Chain','Dread Challenge'],
] as const){
 const base=launchPlayer(CLASS_NAMES_V2[classId],50);
 const data:VerifiedSkillBuildV2={actor:base,verified:{classId,level:50,ownedInstanceIds:new Set()},
   selected:{specializationId:SPECIALIZATIONS_V2.find(s=>s.classId===classId)!.id,equipment:{},
     activeSkills:[defensive,interrupt,offensive].map(name=>{const s=SKILL_IDENTITIES_V2.find(s=>s.classId===classId&&s.name===name)!;
       return {skillId:s.id,variantId:s.variants[0].id};}),talentRanks:{},signaturePassiveIds:[],capstoneId:null},
   ownedItemsById:{},setsById:{}};
 const compiled=compileServerSkillBuildV2(true,data);
 const tank={...compiled,id:'TK_SELF',stats:{...compiled.stats,maxHp:1000,healingPower:100},
   abilities:compiled.abilities.map(a=>({...a,priority:a.name===offensive?200:a.name===defensive?100:50})),
   basicAttackCoeff:0};
 const defenseId=tank.abilities.find(a=>a.name===defensive)!.id;
 const interruptId=tank.abilities.find(a=>a.name===interrupt)!.id;
 const offenseId=tank.abilities.find(a=>a.name===offensive)!.id;
 const ally={...triageAlly('TK_ALLY'),role:'damage' as const};
 const boss=forecastBoss('current_target',500);
 const interruptible={...boss,abilities:boss.abilities.map(a=>({...a,interruptible:true}))};
 const input={seed:'tank-protection-'+classId,players:[tank,ally],enemies:[interruptible],
   maxDurationMs:300,tickMs:100,initialPlayerState:{[tank.id]:triageCarry(1000),[ally.id]:triageCarry(1000)}};
 const result=simulateCombat(input);
 assert.ok(result.events.some(e=>e.type==='interrupt'&&e.abilityId===interruptId&&e.atMs===100),
   classId+' interrupts a dangerous visible boss cast');
 assert.deepEqual(result,simulateCombat(input));
 const blocked=simulateCombat({...input,initialPlayerState:{...input.initialPlayerState,
   [tank.id]:triageCarry(1000,false,{[interruptId]:10000})}});
 assert.ok(!blocked.events.some(e=>e.type==='interrupt'&&e.abilityId===interruptId),'no interrupt cooldown bypass');
 const uninterruptible=simulateCombat({...input,enemies:[boss]});
 assert.ok(!uninterruptible.events.some(e=>e.type==='interrupt'),'uninterruptible cast remains intact');
 if(classId!=='DREADGUARD')assert.ok(uninterruptible.events.some(e=>e.type==='shield'&&
   e.abilityId===defenseId&&e.targetId===tank.id&&e.atMs===100),'ready self shield before heavy hit');
 const injured={...input,enemies:[enemy],initialPlayerState:{...input.initialPlayerState,[tank.id]:triageCarry(200)}};
 const recovery=simulateCombat(injured);
 assert.ok(recovery.events.some(e=>e.abilityId===defenseId&&e.targetId===tank.id&&
   (e.type==='shield'||e.type==='heal')&&e.atMs===0),'critical tank prioritizes own defense');
 assert.ok(!recovery.events.some(e=>e.abilityId===offenseId&&e.atMs===0));
 const legacy={...tank,combatV2:undefined,tags:[]};
 assert.ok(simulateCombat({...injured,players:[legacy,ally]}).events.some(e=>e.abilityId===offenseId&&e.atMs===0),
   'legacy priority unchanged');
}
console.log('PASS: three tank classes, visible interruptible threats, critical defense and cooldown isolation');

// Ally-directed shield stays ally-directed; do not gate emergency protection
// on the healthy tank's own HP. Then verify sequential tank/support decisions
// observe existing protection, not a cached pre-action forecast.
const coverBase=launchPlayer('Bastion',50);
const coverSkills=SKILL_IDENTITIES_V2.filter(s=>s.classId==='BASTION');
const coverBuild:VerifiedSkillBuildV2={actor:coverBase,
 verified:{classId:'BASTION',level:50,ownedInstanceIds:new Set()},
 selected:{specializationId:SPECIALIZATIONS_V2.find(s=>s.classId==='BASTION')!.id,equipment:{},
  activeSkills:['Layered Fortress','Fortress Rebuff','Bastion Challenge'].map(name=>{
   const s=coverSkills.find(s=>s.name===name)!;
   return {skillId:s.id,variantId:s.variants[name==='Layered Fortress'?1:0].id};}),
  talentRanks:{},signaturePassiveIds:[],capstoneId:null},
 ownedItemsById:{},setsById:{}};
const coverCompiled=compileServerSkillBuildV2(true,coverBuild);
const coverTank={...coverCompiled,id:'COVER_TANK',stats:{...coverCompiled.stats,maxHp:1000,healingPower:1000},
 abilities:coverCompiled.abilities.map(a=>({...a,priority:a.name==='Bastion Challenge'?200:100})),
 basicAttackCoeff:0};
const coverId=coverTank.abilities.find(a=>a.name==='Layered Fortress')!.id;
const coverInterrupt=coverTank.abilities.find(a=>a.name==='Fortress Rebuff')!.id;
const coverAlly={...triageAlly('COVER_ALLY'),role:'damage' as const};
const coverInput={seed:'tank-ally-protection',players:[coverTank,coverAlly],enemies:[enemy],
 maxDurationMs:100,tickMs:100,initialPlayerState:{
  [coverTank.id]:triageCarry(1000),[coverAlly.id]:triageCarry(200)}};
assert.ok(simulateCombat(coverInput).events.some(e=>e.type==='shield'&&e.abilityId===coverId&&
 e.targetId===coverAlly.id&&e.atMs===0),'healthy tank can shield a critical ally with authored ally-target variant');
const coordinationBoss=forecastBoss('current_target',500);
const coordination={seed:'tank-support-shared-pressure',players:[coverTank,continuousOffense,coverAlly],
 enemies:[coordinationBoss],maxDurationMs:300,tickMs:100,initialPlayerState:{
 [coverTank.id]:triageCarry(1000,false,{[coverInterrupt]:10000}),
 [continuousOffense.id]:triageCarry(1000),[coverAlly.id]:triageCarry(1000)}};
const coordinated=simulateCombat(coordination);
assert.ok(coordinated.events.some(e=>e.type==='shield'&&e.abilityId===coverId&&
 e.targetId===coverTank.id&&e.atMs===100),'tank protective variant covers visible boss pressure');
assert.equal(firstShield(coordinated),undefined,'later support decision sees sufficient tank shielding');
const cancelBoss={...coordinationBoss,abilities:coordinationBoss.abilities.map(a=>({...a,interruptible:true}))};
const cancelled=simulateCombat({...coordination,enemies:[cancelBoss],initialPlayerState:{
 ...coordination.initialPlayerState,[coverTank.id]:triageCarry(1000)}});
assert.ok(cancelled.events.some(e=>e.type==='interrupt'&&e.abilityId===coverInterrupt&&e.atMs===100));
assert.equal(firstShield(cancelled),undefined,'later support does not pre-shield a cancelled cast');
console.log('PASS: tank ally protection and sequential support forecast coordination');

// Damage tactics: use compiled authored Wayfinder setup, burst and execute.
// Synthetic durable boss isolates timing and selected target, not balance.
const tacticBase=launchPlayer('Wayfinder',50);
const tacticBuild:VerifiedSkillBuildV2={actor:tacticBase,
 verified:{classId:'WAYFINDER',level:50,ownedInstanceIds:new Set()},
 selected:{specializationId:SPECIALIZATIONS_V2.find(s=>s.classId==='WAYFINDER')!.id,equipment:{},
 activeSkills:['Hunter Mark','Heartseeker','Perfect Quarry'].map(name=>{
  const s=SKILL_IDENTITIES_V2.find(s=>s.classId==='WAYFINDER'&&s.name===name)!;
  return {skillId:s.id,variantId:s.variants[0].id};}),talentRanks:{},signaturePassiveIds:[],capstoneId:null},
 ownedItemsById:{},setsById:{}};
const tacticCompiled=compileServerSkillBuildV2(true,tacticBuild);
const tacticActor={...tacticCompiled,id:'DPS_TACTIC',stats:{...tacticCompiled.stats,attackPower:100,accuracy:100000},
 abilities:tacticCompiled.abilities.map(a=>({...a,priority:a.name==='Perfect Quarry'?200:a.name==='Heartseeker'?150:100})),
 basicAttackCoeff:0};
const markId=tacticActor.abilities.find(a=>a.name==='Hunter Mark')!.id;
const burstId=tacticActor.abilities.find(a=>a.name==='Perfect Quarry')!.id;
const executeId=tacticActor.abilities.find(a=>a.name==='Heartseeker')!.id;
const tacticBoss={...enemy,id:'DPS_BOSS',boss:true,stats:{...enemy.stats,maxHp:10000}};
const tacticInput={seed:'dps-tactics',players:[tacticActor],enemies:[tacticBoss],maxDurationMs:200,tickMs:100};
const tacticRun=simulateCombat(tacticInput);
assert.ok(tacticRun.events.some(e=>e.type==='status_apply'&&e.abilityId===markId&&e.atMs===0));
assert.ok(tacticRun.events.some(e=>e.type==='damage'&&e.abilityId===burstId&&e.atMs===100),
 'burst follows actual applied vulnerability');
assert.deepEqual(tacticRun,simulateCombat(tacticInput));
const noMark=simulateCombat({...tacticInput,initialPlayerState:{[tacticActor.id]:
 triageCarry(tacticActor.stats.maxHp,false,{[markId]:10000})}});
assert.ok(noMark.events.some(e=>e.type==='damage'&&e.abilityId===burstId&&e.atMs===0),
 'no idle waiting for unavailable setup');
const legacyTactic={...tacticActor,combatV2:undefined,tags:[]};
assert.ok(simulateCombat({...tacticInput,players:[legacyTactic]}).events.some(e=>
 e.type==='damage'&&e.abilityId===burstId&&e.atMs===0),'legacy authored priority');
// Use an earlier allied direct attack to create a genuine low-health add.
const chipper:CombatantDefinition={...triageAlly('DPS_CHIP'),role:'damage',
 abilities:[{id:'DPS_CHIP_HIT',name:'Chip test',target:'all_enemies',castTimeMs:0,cooldownMs:999999,
 priority:100,effects:[{kind:'damage',flat:90,damageType:'true'}]}],stats:{...enemy.stats,accuracy:100000}};
const executeTarget={...enemy,id:'DPS_EXEC_TARGET',stats:{...enemy.stats,maxHp:125}};
const executeRun=simulateCombat({...tacticInput,players:[chipper,tacticActor],enemies:[executeTarget],
 initialPlayerState:{[tacticActor.id]:triageCarry(tacticActor.stats.maxHp,false,{[markId]:10000})}});
assert.ok(executeRun.events.some(e=>e.type==='damage'&&e.abilityId===executeId&&e.targetId===executeTarget.id&&e.atMs===0),
 'eligible execute before ordinary burst');
console.log('PASS: damage setup, burst window, execute, cooldown and legacy priority');

// Remaining DPS classes: authored setups and party-applied vulnerability
// promote ready spenders without changing their selected variant.
for(const [classId,setup,finisher,routine] of [
 ['RAVAGER','Sunder Blow','Overpower','Titan Swing'],
 ['HEXWEAVER','Curse of Frailty','Hex Detonation','Black Thread'],
 ['KNIFE_DANCER','Twin Fang','Final Dance','Scarlet Loop'],
] as const){
 const actor=launchPlayer(CLASS_NAMES_V2[classId],50);
 const loadout:VerifiedSkillBuildV2={actor,verified:{classId,level:50,ownedInstanceIds:new Set()},
  selected:{specializationId:SPECIALIZATIONS_V2.find(s=>s.classId===classId)!.id,equipment:{},
    activeSkills:[setup,finisher,routine].map(name=>{
      const s=SKILL_IDENTITIES_V2.find(s=>s.classId===classId&&s.name===name)!;
      return {skillId:s.id,variantId:s.variants[name==='Curse of Frailty'?1:0].id};}),
    talentRanks:{},signaturePassiveIds:[],capstoneId:null},ownedItemsById:{},setsById:{}};
 const compiled=compileServerSkillBuildV2(true,loadout);
 const dps={...compiled,id:'DPS_REMAINING',stats:{...compiled.stats,attackPower:100,accuracy:100000},
  abilities:compiled.abilities.map(a=>({...a,priority:a.name===routine?200:a.name===finisher?150:100})),
  basicAttackCoeff:0};
 const finishId=dps.abilities.find(a=>a.name===finisher)!.id;
 const setupId=dps.abilities.find(a=>a.name===setup)!.id;
 const routineId=dps.abilities.find(a=>a.name===routine)!.id;
 const preMark:CombatantDefinition={...chipper,id:'DPS_PARTY_MARK',abilities:[{
  id:'DPS_PARTY_MARK_TEST',name:'Party vulnerability',target:'current_target',castTimeMs:0,
  cooldownMs:999999,priority:100,effects:[{kind:'debuff',tag:'damage_taken',value:.05,durationMs:5000}]}]};
 const active=simulateCombat({...tacticInput,players:[preMark,dps],maxDurationMs:100});
 assert.ok(active.events.some(e=>e.type==='damage'&&e.actorId===dps.id&&e.abilityId===finishId&&e.atMs===0),
  classId+' uses existing party vulnerability');
 const alone=simulateCombat({...tacticInput,players:[dps],maxDurationMs:100});
 assert.ok(alone.events.some(e=>e.actorId===dps.id&&e.abilityId===(classId==='KNIFE_DANCER'?routineId:setupId)&&
  e.atMs===0&&e.type==='damage'),classId+' uses setup if authored, otherwise ordinary rotation');
 const blocked=simulateCombat({...tacticInput,players:[preMark,dps],maxDurationMs:100,
  initialPlayerState:{[dps.id]:triageCarry(dps.stats.maxHp,false,{[finishId]:10000})}});
 assert.ok(!blocked.events.some(e=>e.actorId===dps.id&&e.abilityId===finishId),'no burst cooldown bypass');
}
const interruptBase=launchPlayer('Hexweaver',50);
const interruptLoadout:VerifiedSkillBuildV2={actor:interruptBase,
 verified:{classId:'HEXWEAVER',level:50,ownedInstanceIds:new Set()},
 selected:{specializationId:SPECIALIZATIONS_V2.find(s=>s.classId==='HEXWEAVER')!.id,equipment:{},
 activeSkills:['Null Script','Curse of Frailty'].map(name=>{const s=SKILL_IDENTITIES_V2.find(s=>s.classId==='HEXWEAVER'&&s.name===name)!;
 return {skillId:s.id,variantId:s.variants[0].id};}),talentRanks:{},signaturePassiveIds:[],capstoneId:null},
 ownedItemsById:{},setsById:{}};
const interruptDps0=compileServerSkillBuildV2(true,interruptLoadout);
const interruptDps={...interruptDps0,id:'DPS_INTERRUPT',stats:{...interruptDps0.stats,maxHp:1000},
 abilities:interruptDps0.abilities.map(a=>({...a,priority:a.name==='Curse of Frailty'?200:100,cooldownMs:a.name==='Curse of Frailty'?100:a.cooldownMs}))};
const interruptBoss=forecastBoss('all_enemies',500);
const interruptDpsRun=simulateCombat({seed:'dps-interrupt',players:[interruptDps],enemies:[{
 ...interruptBoss,abilities:interruptBoss.abilities.map(a=>({...a,interruptible:true}))}],
 maxDurationMs:200,tickMs:100});
assert.ok(interruptDpsRun.events.some(e=>e.type==='interrupt'&&e.actorId===interruptDps.id&&e.atMs===100),
 'damage role interrupts visible dangerous cast before ordinary rotation');
console.log('PASS: all four DPS classes, party vulnerability and dangerous interrupt coverage');

const finishingChip:CombatantDefinition={...chipper,abilities:chipper.abilities.map(a=>({...a,
 effects:[{kind:'damage',flat:115,damageType:'true'}]}))};
const cheapFinish=simulateCombat({...tacticInput,players:[finishingChip,tacticActor],enemies:[executeTarget],
 maxDurationMs:100});
assert.ok(cheapFinish.events.some(e=>e.type==='damage'&&e.actorId===tacticActor.id&&e.abilityId===markId&&e.atMs===0),
 'nearly defeated nonboss uses nominal inexpensive hit instead of burst');

// Party coordination: two support actors can share information about a
// real pending cast without locking out emergency recovery.
const coordinationSupport=(classId:'DAWNKEEPER'|'STONECALLER',name:string,id:string,power:number)=>{
 const actor=launchPlayer(CLASS_NAMES_V2[classId],50);
 const s=SKILL_IDENTITIES_V2.find(s=>s.classId===classId&&s.name===name)!;
 const built=compileServerSkillBuildV2(true,{actor,verified:{classId,level:50,ownedInstanceIds:new Set()},
  selected:{specializationId:SPECIALIZATIONS_V2.find(s=>s.classId===classId)!.id,equipment:{},
    activeSkills:[{skillId:s.id,variantId:s.variants[0].id}],talentRanks:{},signaturePassiveIds:[],capstoneId:null},
  ownedItemsById:{},setsById:{}});
 return {...built,id,stats:{...built.stats,maxHp:1000,healingPower:power},basicAttackCoeff:0};
};
const pendingDawn=coordinationSupport('DAWNKEEPER','Dawn Mend','CO_DAWN',500);
const instantStone=coordinationSupport('STONECALLER','River Stone','CO_STONE',100);
const patientA=triageAlly('CO_A'),patientB=triageAlly('CO_B');
const healCoordInput={seed:'party-heal-coordination',players:[pendingDawn,instantStone,patientA,patientB],enemies:[enemy],
 maxDurationMs:500,tickMs:100,initialPlayerState:{
 [pendingDawn.id]:triageCarry(1000),[instantStone.id]:triageCarry(1000),
 [patientA.id]:triageCarry(200),[patientB.id]:triageCarry(250)}};
const splitRecovery=simulateCombat(healCoordInput);
assert.ok(splitRecovery.events.some(e=>e.type==='cast_start'&&e.actorId===pendingDawn.id&&e.targetId===patientA.id));
assert.ok(splitRecovery.events.some(e=>e.type==='heal'&&e.actorId===instantStone.id&&e.targetId===patientB.id&&e.atMs===0),
 'second support prioritizes other critical patient with adequate pending healing');
assert.ok(splitRecovery.events.some(e=>e.type==='heal'&&e.actorId===pendingDawn.id&&e.targetId===patientA.id&&e.atMs===500),
 'pending cast delivers to its selected patient');
assert.deepEqual(splitRecovery,simulateCombat(healCoordInput));
const loneCritical=simulateCombat({...healCoordInput,initialPlayerState:{...healCoordInput.initialPlayerState,
 [patientB.id]:triageCarry(1000)}});
assert.ok(loneCritical.events.some(e=>e.type==='heal'&&e.actorId===instantStone.id&&e.targetId===patientA.id&&e.atMs===0),
 'sole critical patient must never be denied an instant heal');
const weakDawn={...pendingDawn,stats:{...pendingDawn.stats,healingPower:20}};
assert.ok(simulateCombat({...healCoordInput,players:[weakDawn,instantStone,patientA,patientB]}).events.some(e=>
 e.type==='heal'&&e.actorId===instantStone.id&&e.targetId===patientA.id&&e.atMs===0),
 'insufficient pending heal does not divert urgent recovery');
const moderate=simulateCombat({...healCoordInput,initialPlayerState:{...healCoordInput.initialPlayerState,
 [patientA.id]:triageCarry(400),[patientB.id]:triageCarry(1000)}});
assert.ok(!moderate.events.some(e=>e.type==='heal'&&e.actorId===instantStone.id&&e.atMs===0),
 'adequately covered moderate patient may preserve instant cooldown');
console.log('PASS: pending healing coverage, alternate critical patient and safe fallback');

// Two protective tanks cannot spend an interrupt on a cast already stopped.
const secondCover={...coverTank,id:'COVER_SECOND'};
const duplicateInterrupt=simulateCombat({seed:'coordination-interrupt',
 players:[coverTank,secondCover],enemies:[cancelBoss],maxDurationMs:200,tickMs:100});
assert.equal(duplicateInterrupt.events.filter(e=>e.type==='interrupt').length,1);
assert.ok(duplicateInterrupt.events.some(e=>e.type==='interrupt'&&e.actorId===coverTank.id));
assert.ok(!duplicateInterrupt.events.some(e=>e.actorId===secondCover.id&&e.abilityId===coverInterrupt),
 'second tank does not consume an interrupt after the first cancels');
const groupProtectSkill=coverSkills.find(s=>s.name==='Bulwark Pulse')!;
const groupProtectCompiled=compileServerSkillBuildV2(true,{...coverBuild,
 selected:{...coverBuild.selected,activeSkills:[{skillId:groupProtectSkill.id,variantId:groupProtectSkill.variants[1].id}]}});
const firstProtector={...groupProtectCompiled,id:'CO_FIRST_SHIELD',stats:{...groupProtectCompiled.stats,maxHp:1000,healingPower:1000}};
const secondProtector={...firstProtector,id:'CO_SECOND_SHIELD'};
const redundantDefense=simulateCombat({seed:'coordination-shields',players:[firstProtector,secondProtector],
 enemies:[enemy],maxDurationMs:100,tickMs:100});
assert.ok(redundantDefense.events.some(e=>e.type==='shield'&&e.actorId===firstProtector.id));
assert.ok(!redundantDefense.events.some(e=>e.type==='shield'&&e.actorId===secondProtector.id),
 'pure group shield preserved when all healthy allies already sufficiently shielded');
const legacyProtector={...secondProtector,combatV2:undefined,tags:[]};
assert.ok(simulateCombat({seed:'coordination-shields',players:[firstProtector,legacyProtector],enemies:[enemy],
 maxDurationMs:100,tickMs:100}).events.some(e=>e.type==='shield'&&e.actorId===legacyProtector.id),
 'legacy protection rotation unchanged');
console.log('PASS: duplicate interrupt avoidance and redundant pure shield conservation');

// Sequencing: real authored Wayfinder spender plus instant no-cost
// damage technique, with no available mark or execute opportunity.
const seqBase=launchPlayer('Wayfinder',50);
const seqBuild:VerifiedSkillBuildV2={actor:seqBase,verified:{classId:'WAYFINDER',level:50,ownedInstanceIds:new Set()},
 selected:{specializationId:SPECIALIZATIONS_V2.find(s=>s.classId==='WAYFINDER')!.id,equipment:{},
 activeSkills:['Perfect Quarry','Snare Shot'].map(name=>{const s=SKILL_IDENTITIES_V2.find(s=>s.classId==='WAYFINDER'&&s.name===name)!;
 return {skillId:s.id,variantId:s.variants[0].id};}),talentRanks:{},signaturePassiveIds:[],capstoneId:null},
 ownedItemsById:{},setsById:{}};
const seqCompiled=compileServerSkillBuildV2(true,seqBuild);
const seqActor={...seqCompiled,id:'SEQ_DPS',stats:{...seqCompiled.stats,attackPower:100,accuracy:100000},
 abilities:seqCompiled.abilities.map(a=>({...a,priority:a.name==='Perfect Quarry'?200:100})),basicAttackCoeff:0};
const seqBurst=seqActor.abilities.find(a=>a.name==='Perfect Quarry')!.id;
const seqBuilder=seqActor.abilities.find(a=>a.name==='Snare Shot')!.id;
const seqInput={seed:'advanced-sequence',players:[seqActor],enemies:[tacticBoss],maxDurationMs:300,tickMs:100};
const seqRun=simulateCombat(seqInput);
assert.ok(seqRun.events.some(e=>e.type==='damage'&&e.abilityId===seqBuilder&&e.atMs===0),'low resource opens with ready no-cost builder');
assert.ok(seqRun.events.some(e=>e.type==='resource_spend'&&e.abilityId===seqBurst&&e.atMs===100),
 'no idle delay when builder is unavailable');
assert.deepEqual(seqRun,simulateCombat(seqInput));
const seqBlocked=simulateCombat({...seqInput,initialPlayerState:{[seqActor.id]:
 triageCarry(seqActor.stats.maxHp,false,{[seqBuilder]:10000})}});
assert.ok(seqBlocked.events.some(e=>e.type==='damage'&&e.abilityId===seqBurst&&e.atMs===0),'no resource gate without available alternate');
const seqRapid={...seqActor,abilities:seqActor.abilities.map(a=>({...a,cooldownMs:a.id===seqBuilder?100:a.cooldownMs}))};
const seqRapidRun=simulateCombat({...seqInput,players:[seqRapid],maxDurationMs:2000});
assert.ok(seqRapidRun.events.some(e=>e.type==='damage'&&e.abilityId===seqBurst&&e.atMs<=1500),'bounded hold');
const seqLegacy={...seqActor,combatV2:undefined,tags:[]};
assert.ok(simulateCombat({...seqInput,players:[seqLegacy]}).events.some(e=>e.type==='damage'&&e.abilityId===seqBurst&&e.atMs===0),
 'legacy action order retained');

// Exact-source periodic refresh guard: use compiled Black Thread with
// accelerated test-only cooldown and instant cast to isolate selection.
const dotSeqBase=launchPlayer('Hexweaver',50);
const dotSeqBuild:VerifiedSkillBuildV2={actor:dotSeqBase,verified:{classId:'HEXWEAVER',level:50,ownedInstanceIds:new Set()},
 selected:{specializationId:SPECIALIZATIONS_V2.find(s=>s.classId==='HEXWEAVER')!.id,equipment:{},
 activeSkills:['Black Thread','Curse of Frailty'].map(name=>{const s=SKILL_IDENTITIES_V2.find(s=>s.classId==='HEXWEAVER'&&s.name===name)!;
 return {skillId:s.id,variantId:s.variants[0].id};}),talentRanks:{},signaturePassiveIds:[],capstoneId:null},
 ownedItemsById:{},setsById:{}};
const dotSeqCompiled=compileServerSkillBuildV2(true,dotSeqBuild);
const dotSeqActor={...dotSeqCompiled,id:'SEQ_HEX',stats:{...dotSeqCompiled.stats,attackPower:100,accuracy:100000},
 abilities:dotSeqCompiled.abilities.map(a=>({...a,castTimeMs:0,priority:a.name==='Black Thread'?200:100,
 cooldownMs:a.name==='Black Thread'?100:a.cooldownMs})),basicAttackCoeff:0};
const dotSeqId=dotSeqActor.abilities.find(a=>a.name==='Black Thread')!.id;
const dotAltId=dotSeqActor.abilities.find(a=>a.name==='Curse of Frailty')!.id;
const dotSeqInput={...seqInput,players:[dotSeqActor],maxDurationMs:300};
const dotSeqRun=simulateCombat(dotSeqInput);
assert.ok(dotSeqRun.events.some(e=>e.type==='status_apply'&&e.abilityId===dotSeqId&&e.statusKind==='dot'&&e.atMs===0));
assert.ok(dotSeqRun.events.some(e=>e.type==='damage'&&e.abilityId===dotAltId&&e.atMs===100),'avoid clipping own active DoT while other skill is ready');
assert.ok(dotSeqRun.events.some(e=>e.type==='status_apply'&&e.abilityId===dotSeqId&&e.statusKind==='dot'&&e.atMs===200),
 'fallback refresh when other action unavailable');
console.log('PASS: bounded resource sequencing and exact-source DoT refresh avoidance');

// Active party vulnerability overrides low-resource diversion.
const seqMarkAlly:CombatantDefinition={...chipper,id:'SEQ_MARK_ALLY',abilities:[{
 id:'SEQ_MARK_TEST',name:'Test vulnerability',target:'current_target',castTimeMs:0,
 cooldownMs:999999,priority:100,effects:[{kind:'debuff',tag:'damage_taken',value:.05,durationMs:5000}]}]};
assert.ok(simulateCombat({...seqInput,players:[seqMarkAlly,seqActor]}).events.some(e=>
 e.type==='damage'&&e.abilityId===seqBurst&&e.actorId===seqActor.id&&e.atMs===0),
 'real active vulnerability takes precedence over low-resource diversion');
// Own debuff refresh avoidance, with a non-vulnerability authored debuff
// so earlier vulnerability tactics cannot obscure the ordinary sequence.
const debuffSeqActor={...seqActor,abilities:seqActor.abilities.map(a=>({...a,
 priority:a.id===seqBuilder?200:100,cooldownMs:a.id===seqBuilder?100:a.cooldownMs}))};
// A no-cost alternative from the same compiled class.
const debuffAltSkill=SKILL_IDENTITIES_V2.find(s=>s.classId==='WAYFINDER'&&s.name==='Hunter Mark')!;
const debuffAltBuild=compileServerSkillBuildV2(true,{...seqBuild,selected:{...seqBuild.selected,
 activeSkills:[{skillId:debuffAltSkill.id,variantId:debuffAltSkill.variants[0].id}]}});
const debuffSeq={...debuffSeqActor,abilities:[
 debuffSeqActor.abilities.find(a=>a.id===seqBuilder)!,
 ...debuffAltBuild.abilities.map(a=>({...a,priority:100}))]};
const debuffAltId=debuffAltBuild.abilities[0].id;
const debuffSeqRun=simulateCombat({...seqInput,players:[debuffSeq],maxDurationMs:200});
assert.ok(debuffSeqRun.events.some(e=>e.type==='status_apply'&&e.abilityId===seqBuilder&&e.statusKind==='debuff'&&e.atMs===0));
assert.ok(debuffSeqRun.events.some(e=>e.type==='damage'&&e.abilityId===debuffAltId&&e.atMs===100),
 'identical active own debuff favors another ready action');
console.log('PASS: active burst window and exact-source debuff sequencing');

// Due-tick forecast: player actions run before enemy cast completion.
// Make offensive fallback continuously ready so the shield/interrupt
// cannot pass merely from ordinary priority after a long cooldown.
const dueTickBoss=forecastBoss('current_target',500,100);
const dueShieldRun=forecastControl(dueTickBoss);
assert.ok(dueShieldRun.events.some(e=>e.type==='shield'&&e.actorId===predictiveActor.id&&
 e.abilityId===singleShield&&e.targetId===forecastTank.id&&e.atMs===100),
 'last-tick visible cast must remain eligible for preventive protection');
const dueShieldIndex=dueShieldRun.events.findIndex(e=>e.type==='shield'&&e.actorId===predictiveActor.id&&e.atMs===100);
const dueDamageIndex=dueShieldRun.events.findIndex(e=>e.type==='damage'&&e.abilityId==='PR_TELEGRAPH'&&e.atMs===100);
assert.ok(dueDamageIndex>dueShieldIndex&&dueShieldIndex>=0,'same-tick shield precedes enemy resolution');
const dueInterruptBoss={...dueTickBoss,abilities:dueTickBoss.abilities.map(a=>({...a,interruptible:true}))};
const dueTank={...coverTank,abilities:coverTank.abilities.map(a=>({...a,
 cooldownMs:a.name==='Bastion Challenge'?100:a.cooldownMs}))};
const dueInterruptRun=simulateCombat({seed:'due-tick-interrupt',players:[dueTank,coverAlly],
 enemies:[dueInterruptBoss],maxDurationMs:200,tickMs:100});
assert.ok(dueInterruptRun.events.some(e=>e.type==='interrupt'&&e.actorId===dueTank.id&&
 e.abilityId===coverInterrupt&&e.atMs===100),'due-tick dangerous cast must remain eligible for interruption');
assert.ok(!dueInterruptRun.events.some(e=>e.type==='cast_complete'&&e.abilityId==='PR_TELEGRAPH'),
 'successful last-tick interrupt prevents cast resolution');
console.log('PASS: same-tick defensive response before enemy cast resolution');
