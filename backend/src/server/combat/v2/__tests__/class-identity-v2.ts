import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../content/launch-combat';
import type {AbilityDefinition} from '../../types';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {
  CLASS_NAMES_V2,SPECIALIZATIONS_V2,SKILL_IDENTITIES_V2,specializationIdV2,
} from '../skill-catalog';
import {RESOURCE_BY_CLASS_V2,RESOURCE_CAP_V2} from '../resource-runtime';
import {SPECIALIZATION_STYLES_V2,applySpecializationStyleV2} from '../specialization-styles';
import {compileServerSkillBuildV2,type VerifiedSkillBuildV2} from '../skill-effects';
const classIds=Object.keys(CLASS_NAMES_V2) as ClassIdV2[];
assert.equal(classIds.length,9);
assert.equal(SPECIALIZATION_STYLES_V2.length,18);
assert.equal(new Set(SPECIALIZATION_STYLES_V2.map(s=>specializationIdV2(s.classId,s.name))).size,18);
const early:Readonly<Record<ClassIdV2,string>>={
 IRONWARDEN:'Rune Challenge',BASTION:'Layered Fortress',DREADGUARD:'Grim Resolve',
 WAYFINDER:'Windshot',RAVAGER:'Crush Guard',HEXWEAVER:'Black Thread',
 KNIFE_DANCER:'Scarlet Loop',DAWNKEEPER:'Dawn Mend',STONECALLER:'Resonant Armor',
};
for(const cls of classIds){
 const specs=SPECIALIZATIONS_V2.filter(x=>x.classId===cls);
 assert.equal(specs.length,2,'two identities per class: '+cls);
 const styles=SPECIALIZATION_STYLES_V2.filter(x=>x.classId===cls);
 assert.equal(styles.length,2,'two authored styles per class: '+cls);
 for(const rule of styles){
  assert.ok(specs.some(s=>s.id===specializationIdV2(cls,rule.name)),rule.name+' must match canonical specialization');
  assert.ok(SKILL_IDENTITIES_V2.some(skill=>skill.classId===cls&&skill.name===rule.skill),
    rule.name+' references wrong class technique');
  assert.ok(Number.isFinite(rule.amount)&&Math.abs(rule.amount)<=20);
  assert.ok(rule.durationMs===undefined||(rule.durationMs>0&&rule.durationMs<=10000));
 }
 const actor=launchPlayer(CLASS_NAMES_V2[cls],25);
 const earlySkills=SKILL_IDENTITIES_V2.filter(x=>x.classId===cls).slice(0,2);
 assert.ok(earlySkills.some(x=>x.name===early[cls]));
 for(const spec of specs){
  const build:VerifiedSkillBuildV2={
   actor,verified:{classId:cls,level:25,ownedInstanceIds:new Set()},
   selected:{
    specializationId:spec.id,equipment:{},
    activeSkills:earlySkills.map(x=>({skillId:x.id,variantId:x.variants[0].id})),
    talentRanks:{},signaturePassiveIds:[],capstoneId:null,
   },ownedItemsById:{},setsById:{},
  };
  const combat=compileServerSkillBuildV2(true,build);
  assert.equal(combat.combatV2?.resource,RESOURCE_BY_CLASS_V2[cls]);
  assert.ok(RESOURCE_CAP_V2[RESOURCE_BY_CLASS_V2[cls]]>=3);
  assert.equal(combat.abilities.length,2);
  const spender=combat.abilities.find(x=>x.name===early[cls]);
  assert.ok(spender,early[cls]+' must remain equippable at L1');
  assert.equal(spender.combatV2?.spend,1,cls+' must have an early spend loop');
  assert.ok((spender.combatV2?.bonusPerStack??0)>0);
  const style=styles.find(x=>spec.id===specializationIdV2(cls,x.name))!;
  assert.ok(style);
  // Ensure the actual compiled technique, not just the isolated style helper,
  // differs between the class's two specialization identities.
  const otherSpec=specs.find(x=>x.id!==spec.id)!;
  const other=compileServerSkillBuildV2(true,{
    ...build,selected:{...build.selected,specializationId:otherSpec.id},
  });
  const mine=combat.abilities.find(x=>x.name===style.skill);
  const theirs=other.abilities.find(x=>x.name===style.skill);
  assert.ok(mine&&theirs,style.name+' identity ability must be available in early loadout');
  assert.notDeepEqual(
    {cooldown:mine!.cooldownMs,effects:mine!.effects},
    {cooldown:theirs!.cooldownMs,effects:theirs!.effects},
    cls+':'+style.name+' needs a distinct server-calculated signature ability');
 }
}
// Validate all styles against a complete synthetic technique rather than
// assuming every variant retains its source damage/heal/shield/DoT effects.
const template:AbilityDefinition={
 id:'TEST',name:'Test',cooldownMs:8000,castTimeMs:0,
 target:'lowest_hp_ally',priority:50,
 effects:[
  {kind:'damage',coeff:1,damageType:'physical'},
  {kind:'heal',coeff:1,target:'self'},
  {kind:'shield',coeff:1,target:'self'},
  {kind:'dot',coeff:.2,damageType:'shadow',tickMs:1000,durationMs:5000},
 ],
};
for(const style of SPECIALIZATION_STYLES_V2){
 const source={...template,name:style.skill,effects:template.effects.map(x=>({...x}))};
 const before=JSON.stringify(source);
 const active=applySpecializationStyleV2(
  style.classId,specializationIdV2(style.classId,style.name),style.skill,source);
 assert.notDeepEqual(active,source,style.classId+' '+style.name+' must change compiled technique');
 assert.equal(JSON.stringify(source),before,'specialization cannot mutate base effects');
 const different=applySpecializationStyleV2(
  style.classId,specializationIdV2(style.classId,style.name),'Unrelated technique',source);
 assert.equal(different,source,'other techniques must remain untouched');
 const wrong=applySpecializationStyleV2(
  style.classId,'v2:spec:invalid',style.skill,source);
 assert.equal(wrong,source,'untrusted specialization IDs have no impact');
}
const shadow=SPECIALIZATION_STYLES_V2.find(s=>s.classId==='KNIFE_DANCER'&&s.name==='Shadowblade')!;
const defensive:AbilityDefinition={...template,effects:[{kind:'damage',coeff:1}]};
const effect=applySpecializationStyleV2('KNIFE_DANCER',
 specializationIdV2('KNIFE_DANCER',shadow.name),shadow.skill,defensive);
assert.ok(effect.effects.some(e=>e.kind==='buff'&&e.tag==='evasion'&&e.target==='self'));
console.log('PASS: 18 spec skill identities, all nine L1 resource spenders, safe style transforms and class gating');
