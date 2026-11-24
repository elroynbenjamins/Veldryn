import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../content/launch-combat';
import {simulateCombat} from '../../engine';
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
 const legacy={...healer,combatV2:undefined,tags:[]};
 assert.ok(simulateCombat({...input,players:[legacy,tie,low,down]}).events.some(e=>
   e.actorId===legacy.id&&e.abilityId===damageId&&e.atMs===0),'legacy priority unchanged');
}
console.log('PASS: V2 emergency triage, stable ties, boundaries, cooldowns and legacy priority');
