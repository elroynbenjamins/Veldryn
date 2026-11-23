/**
 * HIDDEN real-FORGE-roll to real-engine behavioral regression.
 * The actual immutable EQ2 item/affix rolls are produced by the pinned Forge
 * generator and compiled through Combat's trusted affix compiler. Minimal
 * authored abilities are QA fixtures, NOT claims about a final class balance.
 */
import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import type {CombatInput,CombatStats,CombatantDefinition,AbilityDefinition} from '../../types';
import {V2_SERVER_RECIPES,v2ServerPiece} from '../../../equipment/equipment-crafting-v2-manifest';
import {
 draftEquipmentV2Outcome,V2_SERVER_RARITY_BANDS,type V2Affix,
} from '../../../equipment/equipment-crafting-v2-rolls';
import {
 v2ServerCreateExactTemplate,v2ServerExactTemplateConsistent,
} from '../../../equipment/equipment-crafting-v2-instances';
import {
 compileTrustedEquipmentAffixesV2,EQUIPMENT_AFFIXES_V2,
 type ServerAffixPolicyV2,
} from '../equipment-affixes';
import {EQ2_COMBAT_FROZEN_AFFIX_MAP_V2} from '../equipment-frozen-forge-bridge';

const stats:CombatStats={
 maxHp:4000,attackPower:600,healingPower:400,defense:80,
 accuracy:5500,evasion:100,critChance:0,critMultiplier:1.5,haste:0,
};
const policy:ServerAffixPolicyV2={
 limits:Object.fromEntries(Object.keys(EQUIPMENT_AFFIXES_V2).map(key=>
  [key,{min:0,max:1}])) as ServerAffixPolicyV2['limits'],
 countsByTierRarity:Object.fromEntries(V2_SERVER_RARITY_BANDS.map(b=>[
  'T1:'+b.rarity,b.affixesLowTier,
 ])),
 maxFinalHaste:3,maxFinalCritChance:1,maxFinalCritMultiplier:6,
 maxAdvancedEffects:{accuracyPp:1,evasionPp:1,penetrationPp:1,
  wardPp:1,shieldStrengthPct:1,hexPotencyPct:1,
  tenacityPp:1,abilityDamagePct:1,forgeHealingPowerPct:1},
};
const drawFromSeed=(seed:number)=>{
 let state=seed>>>0;
 return (maximum:number)=>{
  state=(Math.imul(state,1664525)+1013904223)>>>0;
  return state%maximum;
 };
};
function sourceRoll(pieceId:string,stat:V2Affix){
 const piece=v2ServerPiece(pieceId);
 const recipe=V2_SERVER_RECIPES.find(r=>r.pieceId===pieceId&&r.route==='foundation');
 if(!piece||!recipe)throw Error('missing_pinned_forge_piece_or_recipe');
 for(let seed=1;seed<=20000;seed++){
  const roll=draftEquipmentV2Outcome({
   recipeId:recipe.id,pieceId,slot:piece.slot,role:piece.role,tier:piece.tier,
  },drawFromSeed(seed));
  if(roll.affixes.length!==1||roll.affixes[0].stat!==stat)continue;
  const exact=v2ServerCreateExactTemplate(piece,roll);
  assert.equal(v2ServerExactTemplateConsistent(exact),true);
  return {exact,roll,seed};
 }
 throw Error('no_original_forge_roll_found:'+pieceId+':'+stat);
}
function actor(id:string,role:'tank'|'damage'|'support',
 abilities:readonly AbilityDefinition[]):CombatantDefinition{
 const resource=role==='tank'?'guard':role==='damage'?'focus':'radiance';
 return {id,name:id,team:'players',role,level:35,
  stats:{...stats},basicAttackMs:40000,basicAttackCoeff:1,
  abilities:abilities.map(a=>({...a,effects:a.effects.map(e=>({...e}))})),
  tags:['combat-v2-gear-base-resolved'],
  combatV2:{version:2,specializationId:'QA_EQ2_ORIGINAL_ROLL',resource}};
}
function powered(
 pieceId:string,stat:V2Affix,
 role:'tank'|'damage'|'support',abilities:readonly AbilityDefinition[],
){
 const saved=sourceRoll(pieceId,stat);
 const affixId=EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[stat];
 if(!affixId)throw Error('unmapped_original_forge_roll:'+stat);
 assert.ok(EQUIPMENT_AFFIXES_V2[affixId].slots.includes(saved.exact.slot));
 const source=actor('QA_EQUIPPED_'+stat,role,abilities);
 const trustedSource=[{
  instanceId:'QA_MINTED_'+stat,slot:saved.exact.slot,
  tier:'T'+saved.exact.tier,rarity:saved.exact.rarity,quality:saved.exact.quality,
  affixes:saved.exact.affixes.map(roll=>({id:affixId,value:roll.percent/100})),
 }];
 const compiled=compileTrustedEquipmentAffixesV2(source,trustedSource,policy,true);
 // Neither a missing authored roll limit nor a missing active effect cap
 // may allow an original EQ2 forged effect to enter a battle.
 const missingRollLimit:ServerAffixPolicyV2={
  ...policy,limits:{...policy.limits,[affixId]:undefined},
 } as unknown as ServerAffixPolicyV2;
 assert.throws(()=>compileTrustedEquipmentAffixesV2(
  source,trustedSource,missingRollLimit,true),
  /combat_v2_missing_approved_roll_limit/,
  'original Forge roll cannot run without exact server limit');
 const effectKey=stat==='tenacity'?'tenacityPp':
  stat==='abilityDamage'?'abilityDamagePct':'forgeHealingPowerPct';
 const missingActiveCap:ServerAffixPolicyV2={
  ...policy,maxAdvancedEffects:{
   accuracyPp:policy.maxAdvancedEffects!.accuracyPp,
   evasionPp:policy.maxAdvancedEffects!.evasionPp,
   penetrationPp:policy.maxAdvancedEffects!.penetrationPp,
   wardPp:policy.maxAdvancedEffects!.wardPp,
   shieldStrengthPct:policy.maxAdvancedEffects!.shieldStrengthPct,
   hexPotencyPct:policy.maxAdvancedEffects!.hexPotencyPct,
   tenacityPp:policy.maxAdvancedEffects!.tenacityPp,
   abilityDamagePct:policy.maxAdvancedEffects!.abilityDamagePct,
   forgeHealingPowerPct:policy.maxAdvancedEffects!.forgeHealingPowerPct,
   [effectKey]:undefined,
  },
 };
 assert.throws(()=>compileTrustedEquipmentAffixesV2(
  source,trustedSource,missingActiveCap,true),
  /combat_v2_invalid_approved_advanced_affix_cap/,
  'original Forge effect cannot run without explicit total cap');
 assert.equal(compiled.sources.length,1);
 assert.equal(compiled.sources[0].id,affixId);
 assert.equal(compiled.sources[0].value,saved.exact.affixes[0].percent/100);
 const actual=compiled.actor.combatV2?.equipmentEffects;
 if(!actual)throw Error('compiled_Forge_affix_missing');
 const baseline:CombatantDefinition={...compiled.actor,
  combatV2:{...compiled.actor.combatV2!,
   equipmentEffects:{...actual,
    tenacityPp:0,abilityDamagePct:0,forgeHealingPowerPct:0},
  },
 };
 return {powered:compiled.actor,baseline,roll:saved.exact.affixes[0].percent/100};
}
function opponent(isBoss=false):CombatantDefinition{
 return {id:'QA_ADVERSARY',name:'QA Adversary',team:'enemies',role:'enemy',level:35,
  ...(isBoss?{boss:true}:{}),
  stats:{...stats,maxHp:250000,attackPower:60,healingPower:0,defense:100},
  basicAttackMs:40000,basicAttackCoeff:0,abilities:[]};
}
function run(players:CombatantDefinition[],enemy:CombatantDefinition,
 seed:string,maxDurationMs=2100,initialPlayerState?:CombatInput['initialPlayerState']){
 return simulateCombat({seed,players,enemies:[enemy],maxDurationMs,
  ...(initialPlayerState?{initialPlayerState}:{}),
 });
}
function eventAmount(events:ReturnType<typeof simulateCombat>['events'],
 type:string,abilityId:string):number{
 const matches=events.filter(e=>e.type===type&&e.abilityId===abilityId);
 assert.ok(matches.length>0,'missing mechanic event: '+type+' '+abilityId);
 return matches.reduce((n,e)=>n+(e.amount??0),0);
}
const directSkill:AbilityDefinition={
 id:'QA_CLASS_DIRECT',name:'Direct Class Strike',target:'current_target',
 priority:200,cooldownMs:30000,castTimeMs:0,
 effects:[{kind:'damage',coeff:1,damageType:'physical'},
  {kind:'dot',coeff:.2,durationMs:1900,tickMs:500,damageType:'physical'}],
};
const dmg=powered('EQ2_WEAPON_T1_WAYFINDER','abilityDamage','damage',[directSkill]);
const dmgBase=run([dmg.baseline],opponent(),'EQ2_REAL_ABILITY_DAMAGE');
const dmgBoost=run([dmg.powered],opponent(),'EQ2_REAL_ABILITY_DAMAGE');
const directBase=eventAmount(dmgBase.events,'damage',directSkill.id);
const directBoost=eventAmount(dmgBoost.events,'damage',directSkill.id);
assert.ok(directBoost>directBase,'actual Ability Damage roll must improve original direct skill');
assert.equal(eventAmount(dmgBase.events,'damage','BASIC'),
 eventAmount(dmgBoost.events,'damage','BASIC'),
 'original Forge Ability Damage must not alter BASIC');
assert.equal(eventAmount(dmgBase.events,'dot_tick',directSkill.id),
 eventAmount(dmgBoost.events,'dot_tick',directSkill.id),
 'original Forge Ability Damage must not inflate periodic DoT');
assert.ok(dmg.roll>0);

const healSkill:AbilityDefinition={
 id:'QA_CLASS_HEAL',name:'Direct Class Healing',target:'lowest_hp_ally',
 priority:200,cooldownMs:30000,castTimeMs:0,aiCondition:'ally_below_50',
 effects:[{kind:'heal',coeff:1}],
};
const heal=powered('EQ2_WEAPON_T1_DAWNKEEPER','healingPower','support',[healSkill]);
const injured=actor('QA_INJURED_TANK','tank',[]);
const starting:NonNullable<CombatInput['initialPlayerState']>={
 [injured.id]:{hp:200,downed:false,cooldownRemainingMs:{},basicAttackRemainingMs:0},
};
const healBase=run([heal.baseline,injured],opponent(),'EQ2_REAL_CLASS_HEAL',1100,starting);
const healBoost=run([heal.powered,injured],opponent(),'EQ2_REAL_CLASS_HEAL',1100,starting);
assert.ok(eventAmount(healBoost.events,'heal',healSkill.id)>
 eventAmount(healBase.events,'heal',healSkill.id),
 'original Forge Healing Power must improve real class heal');
const shieldSkill:AbilityDefinition={
 id:'QA_CLASS_SHIELD',name:'Shield not class heal',target:'self',
 priority:200,cooldownMs:30000,castTimeMs:0,
 effects:[{kind:'shield',coeff:1}],
};
const shieldActor=(a:CombatantDefinition):CombatantDefinition=>({
 ...a,abilities:[shieldSkill],
});
const shieldBase=run([shieldActor(heal.baseline)],opponent(),'EQ2_HEAL_SHIELD_EXCLUSION',700);
const shieldBoost=run([shieldActor(heal.powered)],opponent(),'EQ2_HEAL_SHIELD_EXCLUSION',700);
assert.equal(eventAmount(shieldBase.events,'shield',shieldSkill.id),
 eventAmount(shieldBoost.events,'shield',shieldSkill.id),
 'Healing Power must not silently grant extra shield power');
const hotSkill:AbilityDefinition={
 id:'QA_CLASS_HOT',name:'Class periodic heal',target:'lowest_hp_ally',
 priority:200,cooldownMs:30000,castTimeMs:0,aiCondition:'ally_below_50',
 effects:[{kind:'hot',coeff:.8,durationMs:2000,tickMs:500}],
};
const hotActor=(a:CombatantDefinition):CombatantDefinition=>({
 ...a,abilities:[hotSkill],
});
const hotBase=run([hotActor(heal.baseline),injured],opponent(),
 'EQ2_REAL_CLASS_HOT',2100,starting);
const hotBoost=run([hotActor(heal.powered),injured],opponent(),
 'EQ2_REAL_CLASS_HOT',2100,starting);
assert.ok(eventAmount(hotBoost.events,'hot_tick',hotSkill.id)>
 eventAmount(hotBase.events,'hot_tick',hotSkill.id),
 'original class HoT must receive original Forge Healing Power');

const affliction:AbilityDefinition={
 id:'QA_ENEMY_HOSTILE_STATUS',name:'Ordinary enemy curse',
 priority:200,cooldownMs:30000,castTimeMs:0,target:'current_target',
 effects:[{kind:'debuff',tag:'damage_done',value:-.1,durationMs:5000},
  {kind:'dot',tag:'poison',coeff:.1,damageType:'nature',
   durationMs:5000,tickMs:1000}],
};
const tenacity=powered('EQ2_SOLO_FIELDBORN_STEEL_GREAVES','tenacity','tank',[]);
function adversaryWithCurse(boss=false):CombatantDefinition{
 return {...opponent(boss),abilities:[affliction]};
}
function expiryMap(out:ReturnType<typeof simulateCombat>){
 const applicable=out.events.filter(e=>e.type==='status_apply'&&
  e.abilityId===affliction.id&&(e.statusKind==='debuff'||e.statusKind==='dot'));
 assert.equal(applicable.length,2);
 return Object.fromEntries(applicable.map(e=>[e.statusKind,e.expiresAtMs??0]));
}
const baselineStatus=expiryMap(run([tenacity.baseline],adversaryWithCurse(),
 'EQ2_REAL_TENACITY',900));
const reducedStatus=expiryMap(run([tenacity.powered],adversaryWithCurse(),
 'EQ2_REAL_TENACITY',900));
assert.ok(reducedStatus.debuff<baselineStatus.debuff&&
 reducedStatus.dot<baselineStatus.dot,
 'actual Tenacity roll must shorten both ordinary hostile status durations');
const expectedReduction=Math.round(5000*(1-tenacity.roll));
assert.equal(baselineStatus.debuff-reducedStatus.debuff,5000-expectedReduction);
assert.equal(baselineStatus.dot-reducedStatus.dot,5000-expectedReduction);
const bossBase=expiryMap(run([tenacity.baseline],adversaryWithCurse(true),
 'EQ2_BOSS_TENACITY_EXCLUSION',900));
const bossTenacity=expiryMap(run([tenacity.powered],adversaryWithCurse(true),
 'EQ2_BOSS_TENACITY_EXCLUSION',900));
assert.deepEqual(bossTenacity,bossBase,
 'no unapproved shortening of boss-exclusive statuses');
assert.equal(EQ2_COMBAT_FROZEN_AFFIX_MAP_V2.potency,undefined,
 'ambiguous Forge Potency remains quarantined and never remapped to Hex');
console.log(JSON.stringify({
 kind:'ACTUAL_FROZEN_EQ2_ROLL_SCOPED_ENGINE_QA_NOT_RELEASED',
 abilityDamageOriginalRoll:dmg.roll,healingPowerOriginalRoll:heal.roll,
 tenacityOriginalRoll:tenacity.roll,
 originalSkillDamageIncreased:true,originalClassHealAndHotIncreased:true,
 basicAndDotAndShieldUnchanged:true,bossExclusiveStatusUnchanged:true,
 genericPotencyQuarantined:true,finalCPWeightsApproved:false,
}));
