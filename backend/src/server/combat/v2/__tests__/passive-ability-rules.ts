import {strict as assert} from 'node:assert';
import type {AbilityDefinition} from '../../types';
import {PASSIVE_ABILITY_RULES_V2,passiveAbilityRuleIdsV2,applyPassiveAbilityRulesV2} from '../passive-ability-rules';
import {PASSIVES_V2,SKILL_IDENTITIES_V2,passiveIdV2} from '../skill-catalog';
import type {ClassIdV2} from '../build-contract';

assert.equal(PASSIVE_ABILITY_RULES_V2.length,25);
assert.equal(passiveAbilityRuleIdsV2().size,25,'Every new passive has a unique ID');
for(const rule of PASSIVE_ABILITY_RULES_V2){
 const id=passiveIdV2(rule.classId,rule.node);
 assert.ok(PASSIVES_V2.some(x=>x.id===id&&x.classId===rule.classId),'Every passive must exist in catalog: '+id);
 assert.ok(rule.perRank>0&&Number.isFinite(rule.perRank),'Each rule must have a bounded authored amount');
 for(const skill of rule.skillNames)
  assert.ok(SKILL_IDENTITIES_V2.some(x=>x.classId===rule.classId&&x.name===skill),
    'Invalid class skill '+rule.classId+':'+skill);
}
const fx=(name:string,target:AbilityDefinition['target'],effects:AbilityDefinition['effects']):AbilityDefinition=>({
 id:name,name,cooldownMs:5000,castTimeMs:0,priority:50,target,effects,
});
const compare=(cls:ClassIdV2,name:string,skill:AbilityDefinition)=>{
 const relevant=PASSIVE_ABILITY_RULES_V2.find(x=>x.classId===cls&&x.node===name)!;
 const id=passiveIdV2(cls,name);
 const original=JSON.stringify(skill);
 const unchanged=applyPassiveAbilityRulesV2(cls,skill.name,skill,{});
 assert.deepEqual(unchanged,skill);
 assert.equal(JSON.stringify(skill),original,'Rules must never mutate source abilities');
 const r1=applyPassiveAbilityRulesV2(cls,skill.name,skill,{[id]:1});
 const r3=applyPassiveAbilityRulesV2(cls,skill.name,skill,{[id]:3});
 assert.notDeepEqual(r1,skill,cls+':'+name+' rank one must change relevant ability');
 assert.notDeepEqual(r3,r1,cls+':'+name+' ranks must scale');
 assert.equal(JSON.stringify(skill),original);
 assert.equal(relevant.classId,cls);
 return r3;
};
const hit=fx('Titan Swing','current_target',[{kind:'damage',coeff:1.2,damageType:'physical'}]);
assert.ok((compare('RAVAGER','Heavy Hands',hit).effects[0].coeff??0)>1.2);
assert.equal(compare('RAVAGER','Weak Point',hit).effects[0].penetrationPct,.03);
const execute=compare('RAVAGER','Merciless',hit).effects[0];
assert.equal(execute.additionalExecuteBelowHpPct,.30);
assert.equal(execute.additionalExecuteBonus,.06);
const marked=compare('WAYFINDER','Deadly Window',fx('Heartseeker','current_target',[{kind:'damage',coeff:1}])).effects[0];
assert.equal(marked.criticalDamageBonusVsMarked,.06);
assert.equal(compare('WAYFINDER','True Shot',fx('Twin Arrows','current_target',[{kind:'damage',coeff:1}])).effects[0].criticalHitBonusVsMarked,.03);
const poison=compare('HEXWEAVER','Long Curse',fx('Black Thread','current_target',[{kind:'dot',coeff:.3,damageType:'shadow',durationMs:5000,tickMs:1000}])).effects[0];
assert.equal(poison.durationMs,6500);
assert.equal(compare('HEXWEAVER','Unravel',fx('Arcane Needle','current_target',[{kind:'damage',coeff:1}])).effects[0].bonusVsDebuffed,.045);
const ward=compare('HEXWEAVER','Shadow Ward',fx('Veil of Ash','self',[{kind:'buff',tag:'damage_taken',value:-.08,durationMs:4000}])).effects[0];
assert.ok((ward.value??0)<-.08);
const ally=compare('BASTION','Safe Passage',fx('Layered Fortress','threatened_ally',[{kind:'shield',coeff:1}])).effects;
assert.ok(ally.some(x=>x.tag==='evasion'&&x.target==='threatened_ally'));
const shelter=compare('STONECALLER','Deep Shelter',fx('Seismic Shelter','all_allies',[{kind:'shield',coeff:.7}])).effects;
assert.ok(shelter.some(x=>x.tag==='damage_taken'&&x.target==='all_allies'));
const totem=compare('STONECALLER','Thundermark',fx('Thunder Totem','current_target',[{kind:'damage',coeff:.9,damageType:'nature'}])).effects;
assert.ok(totem.some(x=>x.kind==='debuff'&&x.tag==='damage_taken'&&x.value===.03));
const support=compare('DAWNKEEPER','Inspiring Light',fx('Solar Hymn','all_allies',[{kind:'buff',tag:'damage_done',value:.05,durationMs:5000}])).effects[0];
assert.ok((support.value??0)>.05);
assert.throws(()=>applyPassiveAbilityRulesV2('RAVAGER','Titan Swing',hit,{[passiveIdV2('RAVAGER','Weak Point')]:999}),/invalid_passive_rank/);
console.log('PASS: 25 new passive rules, canonical IDs, conditional transformations and immutable ability definitions');
