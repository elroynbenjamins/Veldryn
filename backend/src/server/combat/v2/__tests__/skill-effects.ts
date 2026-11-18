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

console.log('PASS: all nine classes, 18 profiles, 54 variants of 18 existing techniques, deterministic runtime, trust and legacy parity');
