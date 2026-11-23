/**
 * HIDDEN V2 balance-review regression:
 *  - 30 role/slot candidate matrices, physical 9/10-slot source grips
 *  - exact without-replacement role crossover risk at high rarity
 *  - source-range loose stack bounds, unapproved final CP caps
 *  - real Combat V2 affix engine channels on existing class baselines
 *
 * QA envelopes are never authorizations to mint or play proposed stats.
 */
import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import {launchPlayer} from '../../content/launch-combat';
import {CLASS_NAMES_V2} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import type {CombatantDefinition} from '../../types';
import {
 reviewForgeRoleFitAndStackingV2,classifyForgeRoleAffixFitV2,
} from '../equipment-forge-affix-role-balance-review';
import {
 reviewProposedForgeRoleSlotAffixesV2,
} from '../equipment-forge-affix-pool-reconciliation-review';
import {V2_SERVER_AFFIX_RANGES,V2_SERVER_RARITY_BANDS,
 draftEquipmentV2Outcome,EQUIPMENT_V2_SERVER_RULES_VERSION,
 type V2Affix,type V2Slot}
 from '../../../equipment/equipment-crafting-v2-rolls';
import {V2_SERVER_PIECES,V2_SERVER_RECIPES}
 from '../../../equipment/equipment-crafting-v2-manifest';
import {
 compileTrustedEquipmentAffixesV2,EQUIPMENT_AFFIXES_V2,
 type ServerAffixPolicyV2,
 type TrustedEquipmentItemAffixesV2,
} from '../equipment-affixes';
import {EQ2_COMBAT_FROZEN_AFFIX_MAP_V2}
 from '../equipment-frozen-forge-bridge';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.000011,
 'expected '+a+' equal '+b+' within runtime rounding');
const report=reviewForgeRoleFitAndStackingV2();
assert.deepEqual(reviewForgeRoleFitAndStackingV2(),report);
assert.equal(report.scope,'EQ2_ROLE_FIT_AND_MAX_STACK_REVIEW_NOT_A_LOOT_POLICY');
assert.equal(report.originalSourceTemplates,169);
assert.equal(report.sourceRecipes,338);
assert.equal(report.roleSlotRows,30);
assert.equal(report.physicalClassTierCells,340);
assert.equal(report.expectedClassTierLoadouts,36);
assert.equal(report.originalNoOffhandReservations,20);
assert.equal(report.realSourceLoadouts.length,36);
assert.equal(report.roleSlotMatrix.length,30);
assert.equal(report.sensitivity.length,6);
assert.equal(report.originalSourceAffixValuesUntouched,true);
assert.equal(report.noExecutableSetBonuses,true);
assert.equal(report.noCPWeightsApproved,true);
assert.equal(report.noMintPermission,true);
assert.equal(report.releaseReady,false);
const row=(role:'tank'|'damage'|'support',slot:V2Slot)=>{
 const found=report.roleSlotMatrix.find(x=>x.role===role&&x.slot===slot);
 assert.ok(found);
 return found!;
};
const gloves=row('tank','gloves');
assert.equal(gloves.roleCore.length,0);
assert.equal(gloves.highTierMythicForcesCrossover,true,
 'Current T3+ mythic Tank gloves force an offensive crossover stat');
assert.equal(gloves.action,'requires_role_slot_reauthoring');
assert.ok(gloves.utility.length>0);
assert.ok(gloves.crossRole.length>0);
const helm=row('damage','helmet');
assert.equal(helm.roleCore.length,0);
assert.equal(helm.crossRole.length,0,
 'Damage helmet defensive options should not be mistaken for off-role attack');
assert.equal(helm.highTierMythicForcesCrossover,false);
assert.equal(helm.action,'review_defensive_slot_identity');
const cape=row('support','cape');
assert.ok(cape.roleCore.includes('ward'));
assert.equal(cape.highTierMythicForcesCrossover,false);
const amulet=row('support','amulet');
assert.equal(amulet.highTierMythicForcesCrossover,true,
 'Support amulet must not silently force an offensive crossover');
assert.equal(amulet.action,'requires_role_slot_reauthoring');
assert.ok(amulet.crossRole.length>0);
assert.equal(classifyForgeRoleAffixFitV2('tank','armor'),'role_core');
assert.equal(classifyForgeRoleAffixFitV2('damage','armor'),'shared_utility');
assert.equal(classifyForgeRoleAffixFitV2('support','abilityDamage'),'role_crossover');
assert.throws(()=>classifyForgeRoleAffixFitV2('support','potency'),
 /unknown_or_ambiguous_stat/);
assert.throws(()=>classifyForgeRoleAffixFitV2('support','FAKE' as V2Affix),
 /unknown_or_ambiguous_stat/);
let physicalCopies=0,forced=0;
for(const c of report.realSourceLoadouts){
 assert.equal(c.role,CLASS_ROLES_V2[c.classId]);
 assert.ok(c.tier>=1&&c.tier<=4);
 assert.equal(c.requiredPhysicalPieces,
  c.sourceGripsWithNoOffhand?9:10);
 assert.equal(c.actualSourcePieceIds.length,c.requiredPhysicalPieces);
 assert.ok(c.actualSourcePieceIds.every(id=>V2_SERVER_PIECES.some(x=>
  x.id===id&&x.tier===c.tier)));
 assert.ok(Object.entries(c.looseStatStackMaximumPercent).every(([stat,pct])=>
  stat!=='potency'&&Number.isFinite(pct)&&pct>0));
 assert.equal(c.alreadyApprovedCaps,false);
 assert.equal(c.forcedCrossoverHighTierMythicSlots.length,
  c.tier>=3?c.forcedCrossoverHighTierMythicSlots.length:0);
 if(c.tier<3)assert.equal(c.forcedCrossoverHighTierMythicSlots.length,0);
 forced+=c.forcedCrossoverHighTierMythicSlots.length;
 physicalCopies+=c.requiredPhysicalPieces;
}
assert.equal(physicalCopies,340);
assert.equal(forced,report.classTierPhysicalCellsForcingHighTierMythicCrossover);
assert.ok(report.roleSlotsWithoutCore>=2);
assert.ok(report.roleSlotsForcingHighTierMythicCrossover>0);
assert.ok(forced>0);
for(const p of report.sensitivity){
 assert.equal(p.notAnObservedPlayerDistribution,true);
 assert.equal(p.weightsApproved,false);
 assert.equal(p.firstRollCrossoverWeightShares.length,10);
 assert.ok(p.maxSlotSingleRollCrossoverChance>=0&&
  p.maxSlotSingleRollCrossoverChance<=1);
 assert.ok(p.maxSlotHighTierMythicCrossoverChance>=0&&
  p.maxSlotHighTierMythicCrossoverChance<=1);
}
assert.ok(report.sensitivity.some(p=>p.role==='tank'&&
 p.maxSlotHighTierMythicCrossoverChance===1),
 'Tank has a currently forced crossover under mythic 3-roll items');
assert.ok(report.sensitivity.some(p=>p.role==='support'&&
 p.maxSlotHighTierMythicCrossoverChance===1),
 'Support has a currently forced crossover under mythic 3-roll items');

// Read the original Forge RNG before and after all risk analysis.
const original=V2_SERVER_PIECES.map(piece=>{
 const recipe=V2_SERVER_RECIPES.find(r=>
  r.pieceId===piece.id&&r.route==='foundation');
 assert.ok(recipe);
 return draftEquipmentV2Outcome({
  pieceId:piece.id,recipeId:recipe!.id,
  role:piece.role,slot:piece.slot,tier:piece.tier,
 },()=>0);
});
const qaCaps:ServerAffixPolicyV2={
 limits:Object.fromEntries(Object.keys(EQUIPMENT_AFFIXES_V2)
  .map(key=>[key,{min:0,max:1}])) as ServerAffixPolicyV2['limits'],
 countsByTierRarity:Object.fromEntries(V2_SERVER_RARITY_BANDS.flatMap(b=>
  [1,2,3,4].map(t=>['T'+t+':'+b.rarity,
   t<3?b.affixesLowTier:b.affixesHighTier]))),
 maxFinalHaste:3,maxFinalCritChance:3,maxFinalCritMultiplier:10,
 maxAdvancedEffects:{accuracyPp:1,evasionPp:1,penetrationPp:1,
  wardPp:1,shieldStrengthPct:1,hexPotencyPct:1,
  tenacityPp:1,abilityDamagePct:1,forgeHealingPowerPct:1},
};
const res={tank:'guard',damage:'focus',support:'radiance'} as const;
function qaActor(classId:ClassIdV2):CombatantDefinition{
 const classRole=CLASS_ROLES_V2[classId];
 const launch=launchPlayer(CLASS_NAMES_V2[classId],35);
 return {...launch,
  id:'QA_ROLE_FIT_'+classId,team:'players',role:classRole,
  tags:['combat-v2-gear-base-resolved'],
  combatV2:{version:2,specializationId:'QA_ONLY_SOURCE_ROLE_FIT',
   resource:res[classRole]},
 };
}
function qaAffix(stat:V2Affix,slot:V2Slot,index:number):
 TrustedEquipmentItemAffixesV2{
 const roleChecked=['tank','damage','support'].some(role=>
  reviewProposedForgeRoleSlotAffixesV2(role,slot)
   .proposedCombatCompatible.includes(stat));
 assert.ok(roleChecked);
 const mapped=EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[stat];
 assert.ok(mapped);
 assert.ok(EQUIPMENT_AFFIXES_V2[mapped!].slots.includes(slot));
 return {instanceId:'QA_SHADOW_ONLY_'+slot+'_'+index,
  slot,tier:'T1',rarity:'common',quality:50,
  affixes:[{id:mapped!,value:V2_SERVER_AFFIX_RANGES[stat][0][0]/100}]};
}
let channels=0;
function checkOne(classId:ClassIdV2,slot:V2Slot,stat:V2Affix){
 const actor=qaActor(classId);
 const policy=reviewProposedForgeRoleSlotAffixesV2(
  CLASS_ROLES_V2[classId],slot);
 assert.ok(policy.proposedCombatCompatible.includes(stat));
 const item=qaAffix(stat,slot,0);
 const result=compileTrustedEquipmentAffixesV2(actor,[item],qaCaps,true);
 assert.equal(result.sources.length,1);
 assert.equal(result.sources[0].id,EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[stat]);
 assert.equal(result.actor.tags?.includes('combat-v2-affixes-applied'),true);
 assert.ok(Object.values(result.actor.stats).every(Number.isFinite));
 assert.equal(result.actor.combatV2?.version,2);
 assert.throws(()=>compileTrustedEquipmentAffixesV2(
  result.actor,[item],qaCaps,true),/combat_v2_affix_actor_not_ready/);
 channels++;
 return {original:actor,compiled:result.actor,item};
}
const tankHaste=checkOne('IRONWARDEN','gloves','haste');
assert.ok(tankHaste.compiled.stats.haste>tankHaste.original.stats.haste);
const tankCross=checkOne('IRONWARDEN','gloves','abilityDamage');
assert.ok((tankCross.compiled.combatV2?.equipmentEffects?.abilityDamagePct??0)>0);
const damageDefense=checkOne('WAYFINDER','helmet','armor');
assert.ok(damageDefense.compiled.stats.defense>damageDefense.original.stats.defense);
const supportWard=checkOne('DAWNKEEPER','cape','ward');
assert.ok((supportWard.compiled.combatV2?.equipmentEffects?.wardPp??0)>0);
const supportHeal=checkOne('DAWNKEEPER','amulet','healingPower');
assert.ok((supportHeal.compiled.combatV2?.equipmentEffects?.forgeHealingPowerPct??0)>0);

// Explicit QA-only stack application via Combat's REAL additive compiler.
const support=qaActor('DAWNKEEPER');
const wardItems=[qaAffix('ward','helmet',1),qaAffix('ward','cape',2)];
const wardCompiled=compileTrustedEquipmentAffixesV2(support,wardItems,qaCaps,true);
const wardSum=wardItems.reduce((n,x)=>n+x.affixes[0].value,0);
close(wardCompiled.actor.combatV2!.equipmentEffects!.wardPp,wardSum);
const missingWardCap={...qaCaps,maxAdvancedEffects:{
 ...qaCaps.maxAdvancedEffects!,wardPp:0,
}};
assert.throws(()=>compileTrustedEquipmentAffixesV2(
 support,wardItems,missingWardCap,true),
 /combat_v2_advanced_affix_exceeds_approved_cap:wardPp/);
const hpItems=[qaAffix('maxHp','cape',3),qaAffix('maxHp','ring',4)];
const hpCompiled=compileTrustedEquipmentAffixesV2(support,hpItems,qaCaps,true);
close(hpCompiled.actor.stats.maxHp,
 support.stats.maxHp*(1+hpItems.reduce((n,x)=>n+x.affixes[0].value,0)));
assert.throws(()=>compileTrustedEquipmentAffixesV2(
 support,[...hpItems,hpItems[0]],qaCaps,true),
 /combat_v2_affix_item_duplicate/);
const untrusted=compileTrustedEquipmentAffixesV2(
 support,[supportWard.item],qaCaps,false);
assert.equal(untrusted.actor,support);
assert.equal(untrusted.sources.length,0);
// QA actual combat engine playthrough: no invented success/mint guarantee.
// Same fixed seed is repeatable; base class remains original launch class.
const enemy:CombatantDefinition={
 id:'QA_COUNTER_ENEMY',team:'enemies',name:'QA counter enemy',
 role:'enemy',level:35,
 stats:{...support.stats,maxHp:30000,attackPower:100},
 basicAttackMs:1500,basicAttackCoeff:0.2,abilities:[],
};
const baseline=simulateCombat({seed:'QA_ROLE_STACK_SOURCE',
 players:[support],enemies:[enemy],maxDurationMs:2500});
const tested=simulateCombat({seed:'QA_ROLE_STACK_SOURCE',
 players:[wardCompiled.actor],enemies:[enemy],maxDurationMs:2500});
assert.ok(Array.isArray(baseline.events)&&Array.isArray(tested.events));
assert.deepEqual(tested,simulateCombat({seed:'QA_ROLE_STACK_SOURCE',
 players:[wardCompiled.actor],enemies:[enemy],maxDurationMs:2500}),
 'QA engine effect event replay must remain deterministic');
assert.deepEqual(baseline,simulateCombat({seed:'QA_ROLE_STACK_SOURCE',
 players:[support],enemies:[enemy],maxDurationMs:2500}));
const after=V2_SERVER_PIECES.map(piece=>{
 const recipe=V2_SERVER_RECIPES.find(r=>
  r.pieceId===piece.id&&r.route==='foundation');
 assert.ok(recipe);
 return draftEquipmentV2Outcome({
  pieceId:piece.id,recipeId:recipe!.id,
  role:piece.role,slot:piece.slot,tier:piece.tier,
 },()=>0);
});
assert.deepEqual(original,after);
assert.ok(after.every(x=>x.rulesVersion===EQUIPMENT_V2_SERVER_RULES_VERSION));
console.log(JSON.stringify({
 kind:report.scope,roleSlotPolicies:report.roleSlotRows,
 noRoleCorePolicies:report.roleSlotsWithoutCore,
 forcedCrossoverPoliciesAtThreeAffixes:
  report.roleSlotsForcingHighTierMythicCrossover,
 forcedCrossoverPhysicalTierCells:
  report.classTierPhysicalCellsForcingHighTierMythicCrossover,
 originalPhysicalLoadoutCells:physicalCopies,
 roleFitEngineChannelsVerified:channels,
 trueCombatV2EngineReplay:true,originalForgeRngOutcomesChanged:0,
 allowedUnapprovedStatMints:0,releaseReady:false,
}));
