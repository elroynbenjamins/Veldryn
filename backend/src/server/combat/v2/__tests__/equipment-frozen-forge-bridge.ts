/**
 * HIDDEN: actual Equipment 2.0 Forge manifest/roll/exact-copy -> Combat 2.0.
 * Strictly QA mock custody verification; NOT real authenticated DB or live.
 */
import {strict as assert} from 'node:assert';
import {reviewFrozenForgeSocketsV2,FORGE_SOCKET_MECHANICS_REVIEW_V2,type ForgeSocketReviewPolicyV2} from '../frozen-forge-socket-review';
import {inspectSocketStackingCapReviewV2,SOCKET_CAP_DIMINISHING_V2,SOCKET_CAP_GENTLE_V2,diminishingSocketContributionV2,type SocketStackLaneV2} from '../socket-stacking-cap-review';
import {reviewUtilityGemSemanticsV2,UTILITY_GEM_REVIEW_V2} from '../socket-utility-gem-review';
import {reviewEffectGemResonanceV2,EFFECT_RESONANCE_REVIEW_V2} from '../effect-gem-resonance-review';
import {runEffectTriggerBoundaryReviewV2} from './effect-gem-trigger-review';
import {inspectEffectGemInteractionsV2,EFFECT_INTERACTION_REVIEW_V2,type EffectInteractionActionV2} from '../effect-gem-interaction-review';
import {runEffectEventProvenanceReviewV2} from './effect-gem-event-provenance-review';
import {runEffectLifecycleReviewV2} from './effect-gem-lifecycle-review';
import {createGentleStatCombatReviewV2} from './gentle-stat-gem-combat-review';
import {createGentleGemPartyPressureReviewV2} from './gentle-gem-party-pressure-review';
import {compactUnifiedStatsV2,compactCoreCpIndexV2} from './compact-unified-calibration-fixture';
import {regionalProgressionAtV2,regionalPressureReviewV2} from './regional-progression-review';
import {runRegionalProgressionReviewV2} from './regional-progression-forge-audit';
import {regionalMechanicsV2,regionalMechanicPressureV2,type RegionalMechanicArm} from './regional-mechanics-review';
import {selectSoloReviewLoadoutsV2,type SoloReviewArm} from './solo-counterbuild-review';
import {secondaryOffenseActorReviewV2,secondaryOffenseAmountV2,type SecondaryOffenseArm} from './secondary-offense-review';
import {soloOffenseLoopReviewV2,type SoloOffenseLoopArm} from './solo-offense-loop-review';
import {soloRoleBudgetReviewV2,type SoloRoleBudgetArm} from './solo-role-budget-review';
import {soloOffensiveProgressionReviewV2,type SoloProgressionArm} from './solo-offensive-progression-review';
import {COMPLETION_BOSSES_REVIEW_V2,createCompletionBossReviewV2,type CompletionBossArmV2} from './regional-completion-boss-review';
import {completionBossPressureReviewV2,completionBossOffenseReviewV2} from './regional-completion-counterplay-review';
import {runRegionalCompletionLedgerReviewV2} from './regional-completion-ledger-boundaries';
import {STAT_GEMS_V1,EFFECT_GEMS_V1,gemItemId,type GemGrade,GEM_BALANCE_REVIEW_V2,STAT_GEMS_REVIEW_V2,EFFECT_GEMS_REVIEW_V2,EFFECT_GEM_REVIEW_MULTIPLIERS_V2} from '../../../equipment/gems/gem-catalog-v1';
import type {V2GemSidecarState} from '../../../equipment/equipment-crafting-v2-gem-sidecar-types';
import {writeFileSync} from 'node:fs';
import {launchPlayer} from '../../content/launch-combat';
import type {CombatantDefinition,CombatInput,CombatStats} from '../../types';
import {
 CLASS_NAMES_V2,SKILL_IDENTITIES_V2,SPECIALIZATIONS_V2,
} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {EQUIPMENT_AFFIXES_V2,validateTrustedAffixesV2,type ServerAffixPolicyV2} from '../equipment-affixes';
import {
 compileRealFrozenForgeActorV2,simulateRealFrozenForgeCombatV2,
 EQ2_COMBAT_FROZEN_AFFIX_MAP_V2,type TrustedFrozenForgeCombatSourceV2,
} from '../equipment-frozen-forge-bridge';
import {
 V2_SERVER_PIECES,V2_SERVER_RECIPES,V2_SERVER_MANIFEST_VERSION,v2ServerPiece,v2ServerRecipeAndPiece,
} from '../../../equipment/equipment-crafting-v2-manifest';
import {
 draftEquipmentV2Outcome,V2_SERVER_RARITY_BANDS,EQUIPMENT_V2_SERVER_RULES_VERSION,
 type V2DraftRollOutcome,
} from '../../../equipment/equipment-crafting-v2-rolls';
import {
 v2ServerCreateExactTemplate,v2ServerExactTemplateConsistent,
 type V2ExactEquipmentTemplate,
} from '../../../equipment/equipment-crafting-v2-instances';
import type {V2DraftItem,V2DraftReceipt,V2DraftJob,V2DraftSkillAward} from '../../../equipment/equipment-crafting-v2-transaction';
import type {V2CustodyCopy} from '../../../equipment/equipment-crafting-v2-custody';
import type {V2HiddenStorageReservation}
 from '../../../equipment/equipment-crafting-v2-storage-reservations';
import {v2VirtualFingerprint,type V2VirtualMoveReceipt}
 from '../../../equipment/equipment-crafting-v2-virtual-history';
import {compileServerSkillBuildV2,type VerifiedSkillBuildV2} from '../skill-effects';
import {issueClassOnlyActorV2} from '../class-baseline';
import {selectReviewSkillLoadoutV2} from '../ability-counterplay-strategies';
import {inspectFrozenForgeCombatHandoffV2} from '../equipment-frozen-forge-handoff-audit';
import {simulateOriginalForgeAuthoredBossReviewV2}
 from '../equipment-original-forge-authored-boss';
import {prepareSoloEnemyKitsV2,verifyPersistedEnemyKitsV2} from '../enemy-kit-composer';
import {issueEnemyV2EngineAuthority} from '../enemy-engine-authority';
import {simulateCombat} from '../../engine';
import {issueEq2PrivateHitQaV22,type Eq2PrivateHitIdV22} from '../equipment-private-hit-qa-v22';
import {runPrivateConditionalBoundaries,runPrivateSupportBoundaries} from './equipment-private-conditional-boundaries';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';
import {reviewOriginalForgeSetBossOpportunitiesV2}
 from '../equipment-forge-set-boss-opportunity-review';
import {reviewOriginalForgeBossThreeWayV2,
 type OriginalForgeBossThreewayInputV2}
 from '../equipment-original-forge-boss-threeway-review';
import {reviewOriginalForgeToUniversalBonusGateV2}
 from '../../../equipment/equipment-crafting-v2-universal-mint-gate-review';
import {previewClassIndependentOriginalForgeAffixesV2}
 from '../../../equipment/equipment-crafting-v2-universal-affix-preview';
import {
 PLANNED_T1_T4_SETS_V2,PLANNED_T1_T4_MEMBERS_V2,
} from '../equipment-expanded-launch-registry';
import {inspectOnlineGameStateForgeCombatV2}
 from '../equipment-online-readback-review';
import {
 prepareForgeCombatRevisionPreflightV2,recheckForgeCombatRevisionV2,
 recheckForgeCombatPartyRevisionsV2,
} from '../equipment-online-cas-recheck';
import {reviewWornRealForgeSetsV2}
 from '../equipment-forge-set-worn-readiness';

assert.equal(V2_SERVER_PIECES.length,169,'must import the genuine pinned EQ2 Forge catalogue');
assert.equal(V2_SERVER_RECIPES.length,338,'must import its real recipe routes');
const existingSetCopies=V2_SERVER_PIECES.filter(x=>Boolean(x.setId));
assert.equal(existingSetCopies.length,42,'Forge has exactly 42 pinned set pieces');
assert.equal(new Set(existingSetCopies.map(x=>x.setId)).size,15,
 '15 original Forge set identities still need reconciled executable effects');
assert.equal(PLANNED_T1_T4_SETS_V2.length,48);
assert.equal(PLANNED_T1_T4_MEMBERS_V2.length,204);
assert.ok(PLANNED_T1_T4_SETS_V2.every(s=>!s.combatReady));
assert.ok(PLANNED_T1_T4_MEMBERS_V2.every(s=>
 !s.combatReady&&!s.equippable&&!s.craftable),
 'unissued expanded set concepts may NEVER enter 2.0 combat');

const statKeys:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy',
 'evasion','critChance','critMultiplier','haste',
];
const qaCaps:ServerAffixPolicyV2={
 // Caps are intentionally explicit TEST-ONLY stand-ins; approval of final
 // per-tier/rarity limits and CP weights is still an external release gate.
 limits:Object.fromEntries(Object.keys(EQUIPMENT_AFFIXES_V2)
  .map(key=>[key,{min:0,max:1}])) as ServerAffixPolicyV2['limits'],
 countsByTierRarity:Object.fromEntries(V2_SERVER_RARITY_BANDS.flatMap(band=>
  [1,2,3,4].map(tier=>['T'+tier+':'+band.rarity,
   tier<=2?band.affixesLowTier:band.affixesHighTier]))),
 maxFinalHaste:3,maxFinalCritChance:3,maxFinalCritMultiplier:10,
 maxAdvancedEffects:{accuracyPp:1,evasionPp:1,penetrationPp:1,
  wardPp:1,shieldStrengthPct:1,hexPotencyPct:1,
  tenacityPp:1,abilityDamagePct:1,forgeHealingPowerPct:1},
};
const drawFor=(seed:number)=>{
 let state=seed>>>0;
 return (exclusiveMax:number)=>{
  state=(Math.imul(state,1664525)+1013904223)>>>0;
  return state%exclusiveMax;
 };
};
function generated(pieceId:string,accept:(roll:V2DraftRollOutcome)=>boolean=()=>true){
 const piece=v2ServerPiece(pieceId);
 const recipe=V2_SERVER_RECIPES.find(x=>x.pieceId===pieceId&&x.route==='foundation');
 if(!piece||!recipe)throw Error('missing canonical EQ2 item or recipe: '+pieceId);
 for(let seed=1;seed<=40000;seed++){
  const roll=draftEquipmentV2Outcome({
   recipeId:recipe.id,pieceId:piece.id,slot:piece.slot,
   role:piece.role,tier:piece.tier,
  },drawFor(seed));
  if(!accept(roll))continue;
  const exact=v2ServerCreateExactTemplate(piece,roll);
  assert.ok(v2ServerExactTemplateConsistent(exact));
  return {roll,exact,profession:recipe.profession};
 }
 throw Error('Could not locate a deterministic Forge QA roll for '+pieceId);
}
function eligible(pieceId:string){
 const piece=v2ServerPiece(pieceId);
 if(!piece)throw Error('missing canonical EQ2 eligible item: '+pieceId);
 return (roll:V2DraftRollOutcome)=>roll.affixes.every(a=>{
  const id=EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[a.stat];
  // A genuine original Forge roll is selected by ROLE pool, with only 70%
  // slot preference. Its exact provenance (not generic slot preferences)
  // determines eligibility for the source-specific compiler.
  return Boolean(id);
 });
}
const tierItems:Readonly<Record<1|2|3|4,Readonly<Record<'tank'|'damage'|'support',string>>>>={
 1:{tank:'EQ2_SOLO_FIELDBORN_STEEL_GREAVES',
   damage:'EQ2_EXP_T1_DAMAGE_RING',support:'EQ2_SOLO_FIELDBORN_PRAYER_HOOD'},
 2:{tank:'EQ2_SOLO_IRONWOOD_IRONCAP',
   damage:'EQ2_EXP_T2_DAMAGE_AMULET',support:'EQ2_EXP_T2_SUPPORT_CAPE'},
 3:{tank:'EQ2_SOLO_SUNSCAR_GATEHELM',
   damage:'EQ2_EXP_T3_DAMAGE_RING',support:'EQ2_EXP_T3_SUPPORT_RING'},
 // The actual T4 Tank expansion RING permits Forge MaxHP, which Combat
 // explicitly supports on rings; no imaginary slot override is needed.
 4:{tank:'EQ2_EXP_T4_TANK_RING',
   damage:'EQ2_SOLO_GLASSBOUND_EMBER_RING',
   support:'EQ2_SOLO_GLASSBOUND_DEVOTION_CAPE'},
};
const minByTier:Readonly<Record<1|2|3|4,number>>={1:2,2:12,3:26,4:40};
function make(classId:ClassIdV2,specIndex:0|1,
 kind:'supported'|'unsupported'|'offslot'|'set'='supported',tier:1|2|3|4=1,
 originalPieceId?:string,uniqueTag?:string,forcedLevel?:number,rollFilter:(roll:V2DraftRollOutcome)=>boolean=()=>true){
 const role=CLASS_ROLES_V2[classId];
 const pieceId=originalPieceId??(kind==='set'?
  (specIndex===0?'EQ2_FIELDBORN_GUARD_HELMET':'EQ2_FIELDBORN_GUARD_CHEST'):
  tierItems[tier][role]);
 const acceptance:(roll:V2DraftRollOutcome)=>boolean=kind==='supported'?eligible(pieceId):
  kind==='unsupported'?roll=>roll.affixes.length>0&&!EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[roll.affixes[0].stat]:
  kind==='offslot'?roll=>roll.affixes.length>0&&
   Boolean(EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[roll.affixes[0].stat])&&
   !EQUIPMENT_AFFIXES_V2[EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[roll.affixes[0].stat]!]
    .slots.includes(v2ServerPiece(pieceId)!.slot):()=>true;
 const selection=generated(pieceId,roll=>acceptance(roll)&&rollFilter(roll));
 const {roll,exact,profession}=selection;
 const originalRecipe=V2_SERVER_RECIPES.find(r=>r.id===roll.recipeId);
 const originalPiece=v2ServerPiece(exact.pieceId);
 if(!originalRecipe||!originalPiece)throw Error('missing pinned Forge source');
 const level=forcedLevel??(tier===4?55:tier===3?45:35);
 const actor={...launchPlayer(CLASS_NAMES_V2[classId],level),
  id:'QA_EQ2_'+classId+'_'+specIndex+'_T'+tier};
 const uniqueScope=classId+'_'+specIndex+'_T'+tier+(uniqueTag?'_'+uniqueTag:'');
 const copyId='QA_EQ2_COPY_'+uniqueScope,
  accountId='QA_ACCOUNT_'+classId+'_'+specIndex+'_T'+tier,
  characterId='QA_CHARACTER_'+classId+'_'+specIndex+'_T'+tier;
 const claimRequestId='QA_CLAIM_'+uniqueScope;
 const mint:V2DraftItem={id:copyId,accountId,ownerCharacterId:characterId,
  createdAtMs:3000,jobId:'QA_CRAFT_'+uniqueScope,
  outcome:roll,exactItem:exact};
 const claim:V2DraftReceipt={requestId:claimRequestId,
  commandFingerprint:'claim:'+mint.jobId,
  response:{kind:'claimed',jobId:mint.jobId,instanceId:mint.id,
   exactItem:exact,outcome:roll,profession,xpAwarded:originalRecipe.xp,version:5}};
 const start:V2DraftReceipt={requestId:'QA_START_'+uniqueScope,
  commandFingerprint:'start:'+originalRecipe.id,
  response:{kind:'started',jobId:mint.jobId,recipeId:originalRecipe.id,
   pieceId:originalPiece.id,finishesAtMs:2000,goldCharged:originalRecipe.gold,version:4}};
 const job:V2DraftJob={
  id:mint.jobId,accountId,ownerCharacterId:characterId,
  recipeId:originalRecipe.id,pieceId:originalPiece.id,startedAtMs:1000,
  finishesAtMs:2000,slotIndex:0,goldReserved:originalRecipe.gold,
  materialsReserved:[],status:'claimed',resultId:copyId,
  craftContract:{manifestVersion:V2_SERVER_MANIFEST_VERSION,
   rulesVersion:EQUIPMENT_V2_SERVER_RULES_VERSION,
   recipeId:originalRecipe.id,piece:originalPiece,
   profession:originalRecipe.profession,assemblyGold:originalRecipe.gold,
   xpAwarded:originalRecipe.xp,craftSeconds:originalRecipe.seconds},
 };
 const award:V2DraftSkillAward={characterId,profession:originalRecipe.profession,
  xp:originalRecipe.xp,jobId:mint.jobId};
 const custody:V2CustodyCopy={instanceId:copyId,accountId,
  ownerCharacterId:characterId,location:'equipped',equippedSlot:exact.slot,
  item:exact,locked:false,favorite:false};
 const reservation:V2HiddenStorageReservation={
  instanceId:copyId,jobId:mint.jobId,ownerCharacterId:characterId,
  itemId:exact.pieceId,destination:'equipment_pouch',quantity:1,
 };
 const equipReceipt:V2VirtualMoveReceipt={
  requestId:'QA_EQUIP_'+uniqueScope,
  fingerprint:v2VirtualFingerprint('equip',copyId),
  instanceId:copyId,actorCharacterId:characterId,
  from:'pouch',to:'equipped',oldHolder:characterId,
  newHolder:characterId,version:6,equippedSlot:exact.slot,
  physicallyDelivered:false,
 };
 const skill=SKILL_IDENTITIES_V2.filter(s=>s.classId===classId).slice(0,2);
 const spec=SPECIALIZATIONS_V2.filter(s=>s.classId===classId)[specIndex];
 const build:VerifiedSkillBuildV2={
  actor,verified:{classId,level,ownedInstanceIds:new Set([copyId])},
  selected:{specializationId:spec.id,equipment:{[exact.slot]:copyId},
   activeSkills:skill.map(s=>({skillId:s.id,variantId:s.variants[0].id})),
   talentRanks:{},signaturePassiveIds:[],capstoneId:null},
  ownedItemsById:{[copyId]:{instanceId:copyId,slot:exact.slot,
   tier:'T'+exact.tier,requiredLevel:minByTier[tier],eligibleRoles:[role]}},
  setsById:{},
 };
 const classStats={...actor.stats};
 const source:TrustedFrozenForgeCombatSourceV2={
  actorId:actor.id,accountId,characterId,
  items:[mint],jobs:[job],awards:[award],claims:[start,claim],
  reservations:[reservation],custodyReceipts:[equipReceipt],
  ledgerRevision:6,
  custody:{accountId,characters:[{id:characterId,classId,level}],copies:[custody]},
  classBaselinePolicy:{version:'QA_LEVEL_ONLY_REAL_EQ2_ITEMS',profiles:{
   [classId]:{classId,minLevel:1,maxLevel:75,statsAtLevel:()=>({...classStats}),
    abilities:actor.abilities,basicAttackMs:actor.basicAttackMs,
    basicAttackCoeff:actor.basicAttackCoeff},
  }},
  affixPolicy:qaCaps,
  verifyPersisted:(digest:string,revision:number)=>
   revision===6&&/^[0-9a-f]{64}$/.test(digest),
 };
 return {actor,build,source,mint,exact,claim,start,job,award,custody,
  reservation,equipReceipt};
}
// Real pinned Forge copies plus synthetic, replay-valid installed socket receipts.
// No character or item mutation, and no release or combat authority.
{
 const qa=make('IRONWARDEN',0);
 const base=compileRealFrozenForgeActorV2(qa.actor,qa.build,qa.source);
 const policy={version:'QA_SOCKET_CAPS_V1',maxFinalHp:1e8,maxFinalDefense:1e8};
 const empty=reviewFrozenForgeSocketsV2(qa.actor,qa.build,qa.source,{slots:[],receipts:[]},policy);
 assert.deepEqual(empty.stats,base.actor.stats);
 assert.deepEqual(empty.advanced,base.actor.combatV2?.equipmentEffects);
 const original=JSON.stringify(qa.source.items);
 const source={...qa.source,ledgerRevision:7,verifyPersisted:(digest:string,rev:number)=>rev===7&&/^[0-9a-f]{64}$/.test(digest)};
 const sidecar=(gemId:string):V2GemSidecarState=>({
  slots:[{instanceId:qa.mint.id,stat:{gemId,rollPercent:120}}],
  receipts:[{requestId:'QA_SOCKET_RECEIPT',fingerprint:'gem:'+qa.mint.id+':'+gemId,
   instanceId:qa.mint.id,socket:'stat',gemId,source:'gem_pouch',
   rollPercent:120,burnedGemId:null,version:7}],
 });
 const raw=(id:string)=>base.evidence.affixSources.filter(x=>x.id===id).reduce((n,x)=>n+x.value,0);
 const before=base.evidence.stages.afterFrozenBase;
 const round5=(x:number)=>Math.round(x*1e5)/1e5;
 for(const family of ['vitality','iron','keen','precision']){
  const s=sidecar('gem:stat_'+family+':g5');
  const out=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,s,policy);
  assert.equal(out.gemSources.length,1);
  const bonus=out.gemSources[0].fraction;
  if(family==='vitality')assert.equal(out.stats.maxHp,round5(before.maxHp*(1+raw('max_hp_pct')+bonus)));
  if(family==='iron')assert.equal(out.stats.defense,round5(before.defense*(1+raw('defense_pct')+bonus)));
  if(family==='keen')assert.equal(out.stats.critChance,round5(before.critChance+raw('crit_rate_pp')+bonus));
  if(family==='precision')assert.equal(out.advanced.accuracyPp,round5(raw('accuracy_pp')+bonus));
  assert.equal(out.canExecuteCombat,false);
  assert.equal(out.cpApproved,false);
  assert.deepEqual(out,reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,s,policy));
 }
 assert.equal(JSON.stringify(qa.source.items),original);
 assert.throws(()=>reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,sidecar('gem:stat_might:g5'),policy),/unreconciled_stat_gem/);
 assert.throws(()=>reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,sidecar('gem:stat_vitality:g5'),{...policy,maxFinalHp:1}),/combined_stat_cap/);
 // Every verification boundary must reject source/policy changes before projection.
 for(const mutateAt of [1,2,3]){
  const mutablePolicy={...policy};
  let reads=0;
  assert.throws(()=>reviewFrozenForgeSocketsV2(qa.actor,qa.build,{...source,verifyPersisted:()=>{
   if(++reads===mutateAt)mutablePolicy.maxFinalHp+=1;
   return true;
  }},sidecar('gem:stat_keen:g5'),mutablePolicy),/mutated_source/);
 }
 // Ownership Set and executable class curve are projected explicitly, not
 // discarded by JSON serialization. Reject changes at any verifier boundary.
 for(const mutateAt of [1,2,3]){
  const ownedIds=new Set(qa.build.verified.ownedInstanceIds);
  const mutableBuild={...qa.build,verified:{...qa.build.verified,ownedInstanceIds:ownedIds}};
  let reads=0;
  assert.throws(()=>reviewFrozenForgeSocketsV2(qa.actor,mutableBuild,{...source,verifyPersisted:()=>{
   if(++reads===mutateAt)ownedIds.add('QA_FOREIGN_COPY');
   return true;
  }},sidecar('gem:stat_keen:g5'),policy),/mutated_source/);
 }
 const profile=source.classBaselinePolicy.profiles.IRONWARDEN;
 if(!profile)throw Error('missing QA class profile');
 for(const mutateAt of [1,2,3]){
  let extra=0,reads=0;
  const mutableProfile={...profile,statsAtLevel:(level:number)=>{
   const stats=profile.statsAtLevel(level);
   return {...stats,maxHp:stats.maxHp+extra};
  }};
  const mutableSource={...source,classBaselinePolicy:{...source.classBaselinePolicy,
   profiles:{...source.classBaselinePolicy.profiles,IRONWARDEN:mutableProfile}},
   verifyPersisted:()=>{if(++reads===mutateAt)extra++;return true;}};
  assert.throws(()=>reviewFrozenForgeSocketsV2(qa.actor,qa.build,mutableSource,
   sidecar('gem:stat_keen:g5'),policy),/mutated_source/);
 }
 let verifies=0;
 assert.throws(()=>reviewFrozenForgeSocketsV2(qa.actor,qa.build,{...source,verifyPersisted:()=>++verifies<3},sidecar('gem:stat_keen:g5'),policy),/unverified_combined_snapshot/);
}
// Stratified grade and roll calibration on real draft exact Forge copies.
{
 const compatible=new Set(['stat_vitality','stat_iron','stat_keen','stat_precision']);
 const grades:readonly GemGrade[]=[1,2,3,4,5];
 const rolls=[80,100,120] as const;
 const policy={version:'QA_SOCKET_GRADE_ROLL_V1',maxFinalHp:1e8,maxFinalDefense:1e8};
 const qaRows:{classId:ClassIdV2;spec:number;family:string;grade:GemGrade;roll:number;fraction:number;delta:number;unit:string}[]=[];
 const socket=(instanceId:string,gemId:string,rollPercent:number,kind:'stat'|'effect'):V2GemSidecarState=>({
  slots:[{instanceId,[kind]:{gemId,rollPercent}}],
  receipts:[{requestId:'QA_GRADE_ROLL_RECEIPT',fingerprint:'gem:'+instanceId+':'+gemId,
   instanceId,socket:kind,gemId,source:'gem_pouch',rollPercent,burnedGemId:null,version:7}],
 });
 const round5=(n:number)=>Math.round(n*1e5)/1e5;
 for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[])for(const spec of [0,1] as const){
  const qa=make(classId,spec);
  const source={...qa.source,ledgerRevision:7,verifyPersisted:(digest:string,revision:number)=>revision===7&&/^[a-f0-9]{64}$/.test(digest)};
  const baseline=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,{slots:[],receipts:[]},policy);
  const raw=(id:string)=>baseline.forgeEvidence.affixSources.filter(x=>x.id===id).reduce((n,x)=>n+x.value,0);
  const pre=baseline.forgeEvidence.stages.afterFrozenBase;
  const original=JSON.stringify(source.items);
  for(const def of STAT_GEMS_V1.filter(x=>compatible.has(x.familyId)))for(const grade of grades)for(const roll of rolls){
   const gemId=gemItemId(def.familyId,grade);
   const out=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,socket(qa.mint.id,gemId,roll,'stat'),policy);
   const fraction=Math.round(def.values[grade]*roll/100*1e9)/1e9;
   assert.equal(out.gemSources.length,1);
   assert.equal(out.gemSources[0].fraction,fraction);
   const stats={...baseline.stats},advanced={...baseline.advanced};
   let delta:number;
   if(def.familyId==='stat_vitality'){
    stats.maxHp=round5(pre.maxHp*(1+raw('max_hp_pct')+fraction));delta=stats.maxHp-baseline.stats.maxHp;
   }else if(def.familyId==='stat_iron'){
    stats.defense=round5(pre.defense*(1+raw('defense_pct')+fraction));delta=stats.defense-baseline.stats.defense;
   }else if(def.familyId==='stat_keen'){
    stats.critChance=round5(pre.critChance+raw('crit_rate_pp')+fraction);delta=stats.critChance-baseline.stats.critChance;
   }else{
    advanced.accuracyPp=round5(raw('accuracy_pp')+fraction);delta=advanced.accuracyPp-baseline.advanced.accuracyPp;
   }
   assert.deepEqual(out.stats,stats);assert.deepEqual(out.advanced,advanced);
   assert.ok(Number.isFinite(delta)&&delta>=0);
   assert.equal(out.canExecuteCombat,false);assert.equal(out.cpApproved,false);assert.equal(out.releaseEnabled,false);
   qaRows.push({classId,spec,family:def.familyId,grade,roll,fraction,delta,unit:def.unit});
  }
  assert.equal(JSON.stringify(source.items),original);
 }
 assert.equal(qaRows.length,18*4*5*3);
 // One fixed copy is sufficient for checking unsupported families and that
 // all effect gem families are merely deferred, never projected into stats.
 const qa=make('IRONWARDEN',0);
 const source={...qa.source,ledgerRevision:7,verifyPersisted:(digest:string,revision:number)=>revision===7&&/^[a-f0-9]{64}$/.test(digest)};
 const baseline=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,{slots:[],receipts:[]},policy);
 const blocked=STAT_GEMS_V1.filter(x=>!compatible.has(x.familyId));
 for(const def of blocked)for(const grade of grades)
  assert.throws(()=>reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,socket(qa.mint.id,gemItemId(def.familyId,grade),100,'stat'),policy),/unreconciled_stat_gem/);
 let deferred=0;
 for(const def of EFFECT_GEMS_V1)for(const grade of grades)for(const roll of [80,120]){
  const out=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,socket(qa.mint.id,gemItemId(def.familyId,grade),roll,'effect'),policy);
  assert.deepEqual(out.stats,baseline.stats);assert.deepEqual(out.advanced,baseline.advanced);
  assert.equal(out.deferredEffectSources.length,1);
  assert.equal(out.deferredEffectSources[0].familyId,def.familyId);
  assert.equal(out.deferredEffectSources[0].runtimeEnabled,false);
  assert.equal(out.canExecuteCombat,false);assert.equal(out.cpApproved,false);deferred++;
 }
 assert.equal(deferred,20*5*2);
 console.log('FORGE_SOCKET_GRADE_CALIBRATION '+JSON.stringify({kind:'PRIVATE_SOCKET_PROJECTION_NOT_CP',
  compatibleProjections:qaRows.length,blockedStatCases:blocked.length*5,deferredEffectCases:deferred,
  classes:9,specializations:18,grades,rolls,
  families:STAT_GEMS_V1.map(def=>({id:def.familyId,stat:def.stat,unit:def.unit,
   supported:compatible.has(def.familyId),g1Min:def.values[1]*.8,g5Max:def.values[5]*1.2})),
  rows:qaRows}));
}
// Approved magnitude direction, independently versioned and digest-bound.
{
 const grades=[1,2,3,4,5] as const;
 assert.equal(STAT_GEMS_REVIEW_V2.length,11);assert.equal(STAT_GEMS_V1.length,12);assert.equal(EFFECT_GEMS_REVIEW_V2.length,20);
 assert.ok(STAT_GEMS_V1.some(x=>x.familyId==='stat_resolute'));
 assert.ok(!STAT_GEMS_REVIEW_V2.some(x=>x.familyId==='stat_resolute'||x.stat==='tenacity'));
 for(const old of STAT_GEMS_V1.filter(x=>x.familyId!=='stat_resolute')){
  const next=STAT_GEMS_REVIEW_V2.find(x=>x.familyId===old.familyId)!;
  const {values:_a,...identity}=old,{values:_b,...nextIdentity}=next;
  assert.deepEqual(nextIdentity,identity);
  for(const grade of grades)assert.ok(Math.abs(next.values[grade]-old.values[grade]*2)<1e-10);
 }
 for(const old of EFFECT_GEMS_V1){
  const next=EFFECT_GEMS_REVIEW_V2.find(x=>x.familyId===old.familyId)!;
  const {values:_a,...identity}=old,{values:_b,...nextIdentity}=next;
  assert.deepEqual(nextIdentity,identity);
  const factor=EFFECT_GEM_REVIEW_MULTIPLIERS_V2[old.familyId];
  assert.ok(factor===1.25||factor===1.5);
  for(const grade of grades)assert.ok(Math.abs(next.values[grade]-old.values[grade]*factor)<1e-10);
 }
 const qa=make('IRONWARDEN',0);
 const source={...qa.source,ledgerRevision:7,verifyPersisted:(digest:string,revision:number)=>revision===7&&/^[0-9a-f]{64}$/.test(digest)};
 const legacy={version:'QA_GEM_STRENGTH',maxFinalHp:1e8,maxFinalDefense:1e8};
 const policy={...legacy,gemBalancePolicy:GEM_BALANCE_REVIEW_V2};
 const socket=(gemId:string,kind:'stat'|'effect'):V2GemSidecarState=>({
  slots:[{instanceId:qa.mint.id,[kind]:{gemId,rollPercent:120}}],
  receipts:[{requestId:'QA_MAGNITUDE_RECEIPT',fingerprint:'gem:'+qa.mint.id+':'+gemId,
   instanceId:qa.mint.id,socket:kind,gemId,source:'gem_pouch',rollPercent:120,burnedGemId:null,version:7}],
 });
 const empty=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,{slots:[],receipts:[]},policy);
 const original=JSON.stringify(source.items);
 for(const family of ['stat_vitality','stat_iron','stat_keen','stat_precision'])for(const grade of grades){
  const state=socket(gemItemId(family,grade),'stat');
  const before=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,state,legacy);
  const after=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,state,policy);
  assert.notEqual(after.digest,before.digest);
  assert.ok(Math.abs(after.gemSources[0].fraction-before.gemSources[0].fraction*2)<1e-9);
  assert.equal(after.canExecuteCombat,false);assert.equal(after.cpApproved,false);
 }
 for(const def of EFFECT_GEMS_REVIEW_V2)for(const grade of grades){
  const state=socket(gemItemId(def.familyId,grade),'effect');
  const out=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,state,policy);
  assert.deepEqual(out.stats,empty.stats);assert.deepEqual(out.advanced,empty.advanced);
  assert.equal(out.deferredEffectSources[0].runtimeEnabled,false);
  assert.ok(Math.abs(out.deferredEffectSources[0].candidateFraction!-def.values[grade]*1.2)<1e-9);
 }
 assert.throws(()=>reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,socket('gem:stat_might:g5','stat'),policy),/unreconciled_stat_gem/);
 assert.equal(JSON.stringify(source.items),original);
 console.log('GEM_BALANCE_REVIEW_V2 '+JSON.stringify({policy:GEM_BALANCE_REVIEW_V2,
  statFamilies:11,retiredStatFamilies:['stat_resolute'],statFactor:2,effectFamilies:20,effectFactors:EFFECT_GEM_REVIEW_MULTIPLIERS_V2,
  maxVitalityTenSockets:.03*1.2*10,compatibleSocketComparisons:20,deferredEffectComparisons:100,
  releaseEnabled:false}));
}
// Seven newly mapped semantics are a separate private proposal. The
// stronger magnitudes alone must not enable an implicit unit migration.
{
 const policy:ForgeSocketReviewPolicyV2={version:'QA_GEM_FULL_MECHANICS',
  gemBalancePolicy:GEM_BALANCE_REVIEW_V2,mechanicsReview:{version:FORGE_SOCKET_MECHANICS_REVIEW_V2,maxFinalAttackPower:1e8},
  maxFinalHp:1e8,maxFinalDefense:1e8};
 const families=['stat_might','stat_ward','stat_savage','stat_piercing','stat_swift','stat_potent','stat_elusive'];
 const grades=[1,2,3,4,5] as const,rolls=[80,100,120] as const;
 const round5=(n:number)=>Math.round(n*1e5)/1e5;
 const rows:{classId:ClassIdV2;spec:number;family:string;grade:number;roll:number;fraction:number;delta:number}[]=[];
 const socket=(instanceId:string,gemId:string,rollPercent:number):V2GemSidecarState=>({
  slots:[{instanceId,stat:{gemId,rollPercent}}],
  receipts:[{requestId:'QA_MECHANIC_SOCKET_RECEIPT',fingerprint:'gem:'+instanceId+':'+gemId,
   instanceId,socket:'stat',gemId,source:'gem_pouch',rollPercent,burnedGemId:null,version:7}],
 });
 for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[])for(const spec of [0,1] as const){
  const qa=make(classId,spec);
  const source={...qa.source,ledgerRevision:7,verifyPersisted:(digest:string,revision:number)=>revision===7&&/^[0-9a-f]{64}$/.test(digest)};
  const baseline=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,{slots:[],receipts:[]},policy);
  const raw=(id:string)=>baseline.forgeEvidence.affixSources.filter(x=>x.id===id).reduce((n,x)=>n+x.value,0);
  const base=baseline.forgeEvidence.stages.afterFrozenBase;
  const snapshot=JSON.stringify(source.items);
  for(const family of families)for(const grade of grades)for(const roll of rolls){
   const def=STAT_GEMS_REVIEW_V2.find(x=>x.familyId===family)!;
   const state=socket(qa.mint.id,gemItemId(family,grade),roll);
   const out=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,state,policy);
   const fraction=Math.round(def.values[grade]*roll/100*1e9)/1e9;
   assert.equal(out.gemSources[0].fraction,fraction);
   const stats={...baseline.stats},effects={...baseline.advanced};
   let delta:number;
   switch(family){
    case 'stat_might':stats.attackPower=round5(base.attackPower*(1+raw('attack_pct')+fraction));delta=stats.attackPower-baseline.stats.attackPower;break;
    case 'stat_savage':stats.critMultiplier=round5(base.critMultiplier*(1+raw('crit_damage_pct'))+fraction);delta=stats.critMultiplier-baseline.stats.critMultiplier;break;
    case 'stat_swift':stats.haste=round5(base.haste*(1+fraction)+raw('haste_pp'));delta=stats.haste-baseline.stats.haste;break;
    case 'stat_ward':effects.wardPp=round5(raw('ward_pp')+fraction);delta=effects.wardPp-baseline.advanced.wardPp;break;
    case 'stat_piercing':effects.penetrationPp=round5(raw('penetration_pp')+fraction);delta=effects.penetrationPp-baseline.advanced.penetrationPp;break;
    case 'stat_potent':effects.abilityDamagePct=round5(raw('ability_damage_pct')+fraction);delta=effects.abilityDamagePct-(baseline.advanced.abilityDamagePct??0);break;
    case 'stat_elusive':effects.evasionPp=round5(raw('evasion_pp')+fraction);delta=effects.evasionPp-baseline.advanced.evasionPp;break;
    default:throw Error('unknown QA gem');
   }
   assert.deepEqual(out.stats,stats);assert.deepEqual(out.advanced,effects);
   assert.ok(Number.isFinite(delta)&&delta>=-1e-8);
   assert.equal(out.mechanicsReview,FORGE_SOCKET_MECHANICS_REVIEW_V2);
   assert.equal(out.requiresMigrationApproval,true);
   assert.equal(out.canExecuteCombat,false);assert.equal(out.cpApproved,false);assert.equal(out.releaseEnabled,false);
   rows.push({classId,spec,family,grade,roll,fraction,delta});
  }
  assert.equal(JSON.stringify(source.items),snapshot);
 }
 assert.equal(rows.length,18*7*5*3);
 const qa=make('IRONWARDEN',0);
 const source={...qa.source,ledgerRevision:7,verifyPersisted:(digest:string,revision:number)=>revision===7&&/^[0-9a-f]{64}$/.test(digest)};
 const state=socket(qa.mint.id,'gem:stat_might:g5',120);
 const {mechanicsReview:_,...strengthOnly}=policy;
 assert.throws(()=>reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,state,strengthOnly),/unreconciled_stat_gem/);
 assert.throws(()=>reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,state,{...policy,gemBalancePolicy:undefined}),/invalid_mechanics_review_policy/);
 assert.throws(()=>reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,state,{...policy,mechanicsReview:{version:FORGE_SOCKET_MECHANICS_REVIEW_V2,maxFinalAttackPower:1}}),/combined_stat_cap/);
 // Set cap at the existing Forge ward contribution, not zero: the
 // preexisting affix must pass, while the additional gem must exceed it.
 const originalWard=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,{slots:[],receipts:[]},policy).advanced.wardPp;
 const caps={...source.affixPolicy,maxAdvancedEffects:{...source.affixPolicy.maxAdvancedEffects!,wardPp:originalWard}};
 assert.throws(()=>reviewFrozenForgeSocketsV2(qa.actor,qa.build,{...source,affixPolicy:caps},socket(qa.mint.id,'gem:stat_ward:g5',120),policy),/combined_stat_cap/);
 // All retired grades/rolls fail closed in both newer modes. Legacy identity
 // and installed history remain valid; no socket or inventory is rewritten.
 for(const grade of grades)for(const roll of rolls){
  const retired=socket(qa.mint.id,gemItemId('stat_resolute',grade),roll);
  for(const p of [strengthOnly,policy])
   assert.throws(()=>reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,retired,p),/retired_stat_gem_requires_migration/);
  const {gemBalancePolicy:_old,...legacy}=strengthOnly;
  assert.throws(()=>reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,retired,legacy),/unreconciled_stat_gem/);
 }
 console.log('FORGE_SOCKET_MECHANICS_CALIBRATION '+JSON.stringify({policy:FORGE_SOCKET_MECHANICS_REVIEW_V2,
  projections:rows.length,families,grades,rolls,requiresMigrationApproval:true,cpApproved:false,releaseEnabled:false,
  byFamily:families.map(family=>{const a=rows.filter(r=>r.family===family);return {family,cases:a.length,zero:a.filter(r=>r.delta===0).length,
   minDelta:Math.min(...a.map(r=>r.delta)),maxDelta:Math.max(...a.map(r=>r.delta))};})}));
}
let checked=0,actualFrozenPositive=0,mappedAffixes=0;
for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
 for(const index of [0,1] as const){
  const qa=make(classId,index);
  const a=compileRealFrozenForgeActorV2(qa.actor,qa.build,qa.source);
  const replay=compileRealFrozenForgeActorV2(qa.actor,qa.build,qa.source);
  assert.deepEqual(a,replay,'same EQ2 Forge snapshot must compile identically');
  assert.equal(a.evidence.source,'EQ2_FROZEN_FORGE_PRE_SCALED_NO_DOUBLE_MULTIPLIER');
  assert.equal(a.evidence.items.length,1);
  assert.equal(a.evidence.items[0].pieceId,qa.exact.pieceId);
  const base=a.evidence.stages.afterFrozenBase;
  const skilled=a.evidence.stages.afterSkills;
  const sum=qa.exact.baseStats;
  for(const [stat,forgeKey] of [
   ['attackPower','attack'],['defense','defense'],['maxHp','hp'],
  ] as const)
   assert.ok(Math.abs(base[stat]-skilled[stat]-sum[forgeKey])<.00001,
    'final frozen rarity+quality-scaled '+stat+' is applied exactly once');
  assert.ok(a.evidence.affixSources.length===qa.exact.affixes.length,
   'actual EQ2 rolled affixes may not disappear');
  assert.ok(statKeys.every(key=>Number.isFinite(a.actor.stats[key])));
  assert.ok(qa.exact.baseStats.attack+qa.exact.baseStats.defense+
   qa.exact.baseStats.hp>0);
  checked++;actualFrozenPositive++;mappedAffixes+=a.evidence.affixSources.length;
 }
}
assert.equal(checked,18);
// Cross-tier stage coverage uses genuine Forge T2-T4 exact-copy outcomes.
// The existing T4 Tank expansion ring provides the legal MaxHP route.
let extendedTiers=0;
for(const tier of [2,3,4] as const){
 for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
  for(const index of [0,1] as const){
   const qa=make(classId,index,'supported',tier);
   const result=compileRealFrozenForgeActorV2(qa.actor,qa.build,qa.source);
   assert.equal(result.evidence.items[0].tier,tier);
   assert.equal(result.evidence.items[0].pieceId,qa.exact.pieceId);
   assert.equal(result.evidence.stages.afterFrozenBase.attackPower,
    Math.round((result.evidence.stages.afterSkills.attackPower+
     qa.exact.baseStats.attack)*1e6)/1e6);
   assert.ok(result.evidence.affixSources.length>=1);
   extendedTiers++;
  }
 }
}
assert.equal(extendedTiers,54,'T2:18 + T3:18 + T4:18 all nine classes');
const teamClasses:readonly ClassIdV2[]=[
 'IRONWARDEN','WAYFINDER','HEXWEAVER','STONECALLER',
];
const qaTeam=teamClasses.map(c=>make(c,0));
const boss:CombatantDefinition={id:'QA_REAL_EQ2_ENEMY',name:'QA Forge-proof boss',
 team:'enemies',role:'enemy',level:35,boss:true,
 stats:{maxHp:150000,attackPower:120,healingPower:0,defense:180,
  accuracy:1000,evasion:80,critChance:0,critMultiplier:1.5,haste:0},
 basicAttackMs:2400,basicAttackCoeff:.6,abilities:[],tags:['pve:archetype:caster'],
};
const input:CombatInput={
 seed:'EQ2_REAL_MINTED_ITEM_FOUR_PLAYER',
 players:qaTeam.map(x=>x.actor),enemies:[boss],maxDurationMs:4500,
};
const part=simulateRealFrozenForgeCombatV2(
 input,qaTeam.map(x=>x.build),qaTeam.map(x=>x.source),true);
assert.deepEqual(simulateRealFrozenForgeCombatV2(
 input,qaTeam.map(x=>x.build),qaTeam.map(x=>x.source),true),part,
 'four Equipment 2.0 minted copies must produce deterministic battle replay');
assert.equal(part.combat.players.length,4);
assert.equal(part.equipmentEvidence.length,4);
assert.deepEqual(part.combat.players.map(p=>p.definition.role),
 ['tank','damage','damage','support']);
assert.ok(part.enemyMechanicLabels.some(x=>x.includes('Disruptible Channel')));
assert.ok(part.equipmentEvidence.every(e=>e.items.length===1&&
 e.affixSources.length>0),'real Forge identity and affixes preserved for every member');
assert.throws(()=>simulateRealFrozenForgeCombatV2(input,
 qaTeam.map(x=>x.build),qaTeam.map(x=>x.source),false),/release_gate_off/);
assert.throws(()=>simulateRealFrozenForgeCombatV2({
 ...input,initialPlayerState:{[input.players[0].id]:{
 hp:50,downed:false,cooldownRemainingMs:{},basicAttackRemainingMs:0,
 }}},qaTeam.map(x=>x.build),qaTeam.map(x=>x.source),true),
 /complete_new_encounter_required/);
const initial=qaTeam[0];
// A real same-account Bank transfer changes current custody, NEVER the
// immutable original Forge crafter/mint/receipt identity.
const secondCharacterId='QA_SAME_ACCOUNT_SECOND_CHARACTER';
const moves:V2VirtualMoveReceipt[]=[
 {
  requestId:'QA_BANK_DEPOSIT_TRANSFER_1',
  fingerprint:v2VirtualFingerprint('deposit_bank',initial.mint.id),
  instanceId:initial.mint.id,actorCharacterId:initial.mint.ownerCharacterId,
  from:'pouch',to:'bank',oldHolder:initial.mint.ownerCharacterId,
  newHolder:null,version:6,physicallyDelivered:false,
 },
 {
  requestId:'QA_BANK_WITHDRAW_TRANSFER_2',
  fingerprint:v2VirtualFingerprint('withdraw_bank',initial.mint.id),
  instanceId:initial.mint.id,actorCharacterId:secondCharacterId,
  from:'bank',to:'pouch',oldHolder:null,newHolder:secondCharacterId,
  version:7,physicallyDelivered:false,
 },
 {
  requestId:'QA_BANK_EQUIP_TRANSFER_3',
  fingerprint:v2VirtualFingerprint('equip',initial.mint.id),
  instanceId:initial.mint.id,actorCharacterId:secondCharacterId,
  from:'pouch',to:'equipped',oldHolder:secondCharacterId,
  newHolder:secondCharacterId,version:8,
  equippedSlot:initial.exact.slot,physicallyDelivered:false,
 },
];
const transferSource:TrustedFrozenForgeCombatSourceV2={
 ...initial.source,characterId:secondCharacterId,
 custodyReceipts:moves,ledgerRevision:8,
 custody:{...initial.source.custody,
  characters:[...initial.source.custody.characters,{
   id:secondCharacterId,classId:'IRONWARDEN',level:35,
  }],
  copies:[{...initial.custody,ownerCharacterId:secondCharacterId}],
 },
 verifyPersisted:(digest:string,revision:number)=>revision===8&&
  /^[0-9a-f]{64}$/.test(digest),
};
// Actual staging online_game_states is account_id/character_id/state/revision.
// This is read-only adapter QA, never evidence that a transaction was locked.
function dbRow(source:TrustedFrozenForgeCombatSourceV2,
 activeCharacterId=source.characterId){
 const accountCharacters=source.custody.characters.map(character=>({
  id:character.id,classId:character.classId,level:character.level,
 }));
 const active=accountCharacters.find(c=>c.id===activeCharacterId);
 if(!active)throw Error('staging source missing active character');
 return {
  account_id:source.accountId,character_id:activeCharacterId,
  revision:source.ledgerRevision,
  state:{version:11,character:active,
   otherCharacters:accountCharacters.filter(x=>x.id!==activeCharacterId)
    .map(character=>({character})),
   account:{equipmentV2Hidden:{
    schemaVersion:'eq2-hidden-game-state-v1',
    jobs:source.jobs,items:source.items,receipts:source.claims,
    skillAwards:source.awards,storageReservations:source.reservations,
    custodyReceipts:source.custodyReceipts,
   }},
  },
 };
}
const row=dbRow(initial.source);
const readback=inspectOnlineGameStateForgeCombatV2({
 authenticatedAccountId:initial.source.accountId,
 characterId:initial.source.characterId,
 expectedRevision:initial.source.ledgerRevision,row,
});
assert.equal(readback.combatAuthority,false,
 'a matching database-shaped snapshot is NOT authentication or a transaction');
assert.equal(readback.requiresAuthenticatedLockAndRevisionRecheck,true);
assert.equal(readback.scope,'ONLINE_EQ2_STAGING_READBACK_NO_DATABASE_LOCK_OR_AUTH');
assert.deepEqual(readback.custody,initial.source.custody);
assert.deepEqual(readback.items,initial.source.items);
assert.deepEqual(readback.custodyReceipts,initial.source.custodyReceipts);
const authRead={
 authenticatedAccountId:initial.source.accountId,
 characterId:initial.source.characterId,
 expectedRevision:initial.source.ledgerRevision,row,
};
const casPreflight=prepareForgeCombatRevisionPreflightV2(authRead);
assert.equal(casPreflight.mayAuthorizeCombat,false);
assert.equal(casPreflight.maySettleRewards,false);
assert.equal(casPreflight.requiresActualAccountLock,true);
assert.equal(casPreflight.inspection.combatAuthority,false);
const sameRevisionRecheck=recheckForgeCombatRevisionV2(casPreflight,authRead);
assert.equal(sameRevisionRecheck.matchesOriginalState,true);
assert.equal(sameRevisionRecheck.maySettleRewards,false);
assert.equal(sameRevisionRecheck.requiresActualAtomicCasAndServiceAuth,true);
assert.equal(sameRevisionRecheck.sourceDigest,
 casPreflight.exactForgeLedgerDigest);
assert.throws(()=>recheckForgeCombatRevisionV2(casPreflight,{
 ...authRead,expectedRevision:row.revision+1,
 row:{...row,revision:row.revision+1},
}),/revision_moved_concurrent_update/,
 'concurrent Bank/craft transition invalidates encounter settlement');
assert.throws(()=>recheckForgeCombatRevisionV2(casPreflight,{
 ...authRead,row:{...row,state:{...row.state,
  outOfCombatSinceMs:12345678}},
}),/same_revision_but_state_mutated/,
 'same revision but modified game state must still fail closed');
assert.throws(()=>recheckForgeCombatRevisionV2(casPreflight,{
 ...authRead,authenticatedAccountId:'QA_OTHER_ACCOUNT',
}),/rechecked_account_or_character_changed/,
 'another account cannot reuse previous revision authorization');
assert.throws(()=>recheckForgeCombatRevisionV2(casPreflight,{
 ...authRead,characterId:'QA_OTHER_CHARACTER',
}),/rechecked_account_or_character_changed/,
 'switching characters after preview invalidates the readback');
const wrongAccount={...row,account_id:'QA_OTHER_ACCOUNT'};
assert.throws(()=>inspectOnlineGameStateForgeCombatV2({
 authenticatedAccountId:initial.source.accountId,
 characterId:initial.source.characterId,
 expectedRevision:initial.source.ledgerRevision,row:wrongAccount,
}),/account_or_revision_mismatch/);
assert.throws(()=>inspectOnlineGameStateForgeCombatV2({
 authenticatedAccountId:initial.source.accountId,
 characterId:initial.source.characterId,
 expectedRevision:initial.source.ledgerRevision-1,row,
}),/account_or_revision_mismatch/);
assert.throws(()=>inspectOnlineGameStateForgeCombatV2({
 authenticatedAccountId:initial.source.accountId,
 characterId:'QA_STRANGER',
 expectedRevision:initial.source.ledgerRevision,row,
}),/unowned_combat_character/);
assert.throws(()=>inspectOnlineGameStateForgeCombatV2({
 authenticatedAccountId:initial.source.accountId,
 characterId:initial.source.characterId,
 expectedRevision:initial.source.ledgerRevision,
 row:{...row,character_id:'QA_WRONG_ACTIVE'},
}),/database_active_character_mismatch/);
const swappedBody={...row,state:{...row.state,account:{...row.state.account,
 equipmentV2Hidden:{...row.state.account.equipmentV2Hidden,
  custodyReceipts:row.state.account.equipmentV2Hidden.custodyReceipts.map(
   (receipt,i)=>i===0?{...receipt,newHolder:'QA_OTHER_ACCOUNT'}:receipt),
 }}}};
assert.throws(()=>inspectOnlineGameStateForgeCombatV2({
 authenticatedAccountId:initial.source.accountId,
 characterId:initial.source.characterId,
 expectedRevision:initial.source.ledgerRevision,row:swappedBody,
}),/v2_virtual_move_owner_conflict|foreign_custody_movement/);
const oldCopy={...row,state:{...row.state,account:{...row.state.account,
 equipmentV2Hidden:{...row.state.account.equipmentV2Hidden,
  items:row.state.account.equipmentV2Hidden.items.map((item,i)=>i===0?{
   ...item,exactItem:{...item.exactItem,baseStats:{...item.exactItem.baseStats,
    hp:item.exactItem.baseStats.hp+999}},
  }:item),
 }}}};
assert.throws(()=>inspectOnlineGameStateForgeCombatV2({
 authenticatedAccountId:initial.source.accountId,
 characterId:initial.source.characterId,
 expectedRevision:initial.source.ledgerRevision,row:oldCopy,
}),/invalid_hidden_v2_exact_copy/);
const fourPartyReads=qaTeam.map(member=>({
 authenticatedAccountId:member.source.accountId,
 characterId:member.source.characterId,
 expectedRevision:member.source.ledgerRevision,
 row:dbRow(member.source),
}));
const fourPartyPreflights=fourPartyReads.map(
 prepareForgeCombatRevisionPreflightV2);
const fourPartyRechecks=recheckForgeCombatPartyRevisionsV2(
 fourPartyPreflights,fourPartyReads);
assert.equal(fourPartyRechecks.length,4);
assert.ok(fourPartyRechecks.every(c=>c.matchesOriginalState&&
 c.maySettleRewards===false));
assert.throws(()=>recheckForgeCombatPartyRevisionsV2(
 [fourPartyPreflights[0],fourPartyPreflights[0]],
 [fourPartyReads[0],fourPartyReads[0]]),
 /party_duplicate_character/,
 'duplicate party character cannot reuse one account snapshot twice');
assert.throws(()=>recheckForgeCombatPartyRevisionsV2(
 fourPartyPreflights,fourPartyReads.map((entry,i)=>i===1?{
  ...entry,expectedRevision:entry.expectedRevision+1,
  row:{...entry.row,revision:entry.row.revision+1},
 }:entry)),
 /revision_moved_concurrent_update/,
 'one stale participant invalidates entire party CAS review');
const bankDb=dbRow(transferSource,initial.source.characterId);
const sharedBankReadback=inspectOnlineGameStateForgeCombatV2({
 authenticatedAccountId:transferSource.accountId,
 characterId:transferSource.characterId,
 expectedRevision:transferSource.ledgerRevision,row:bankDb,
});
assert.equal(sharedBankReadback.characterId,transferSource.characterId);
assert.equal(sharedBankReadback.currentClassId,'IRONWARDEN');
assert.equal(sharedBankReadback.custody.copies[0].ownerCharacterId,
 transferSource.characterId);
assert.equal(sharedBankReadback.combatAuthority,false);
// Same-account characters must share one lock/revision, not be forbidden.
const sharedAccountRead1={
 authenticatedAccountId:transferSource.accountId,
 characterId:initial.mint.ownerCharacterId,
 expectedRevision:transferSource.ledgerRevision,row:bankDb,
};
const sharedAccountRead2={
 ...sharedAccountRead1,characterId:transferSource.characterId,
};
const sameAccountParty=recheckForgeCombatPartyRevisionsV2(
 [prepareForgeCombatRevisionPreflightV2(sharedAccountRead1),
  prepareForgeCombatRevisionPreflightV2(sharedAccountRead2)],
 [sharedAccountRead1,sharedAccountRead2]);
assert.equal(sameAccountParty.length,2);
assert.equal(sameAccountParty[0].accountId,sameAccountParty[1].accountId);
assert.notEqual(sameAccountParty[0].characterId,
 sameAccountParty[1].characterId);
const splitAccountFirst=prepareForgeCombatRevisionPreflightV2(sharedAccountRead1);
const splitAccountSecond=prepareForgeCombatRevisionPreflightV2({
 ...sharedAccountRead2,expectedRevision:sharedAccountRead2.expectedRevision+1,
 row:{...bankDb,revision:bankDb.revision+1},
});
assert.throws(()=>recheckForgeCombatPartyRevisionsV2(
 [splitAccountFirst,splitAccountSecond],
 [sharedAccountRead1,sharedAccountRead2]),
 /party_account_snapshot_disagreement/,
 'two alts of one account must not use different account snapshot revisions');
const transferred=compileRealFrozenForgeActorV2(
 initial.actor,initial.build,transferSource);
assert.deepEqual(transferred.evidence.equippedInstanceIds,[initial.mint.id]);
assert.equal(initial.mint.ownerCharacterId,initial.source.characterId);
assert.notEqual(initial.mint.ownerCharacterId,transferSource.characterId);
assert.equal(transferred.evidence.items[0].pieceId,initial.exact.pieceId);
const missingOriginalCharacter:TrustedFrozenForgeCombatSourceV2={
 ...transferSource,custody:{...transferSource.custody,
  characters:transferSource.custody.characters.filter(
   row=>row.id!==initial.mint.ownerCharacterId),
 },
};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,missingOriginalCharacter),
 /custody_history_other_account_character/,
 'legitimate Bank handoff is impossible without both same-account characters');
const spoofedWithdraw:TrustedFrozenForgeCombatSourceV2={
 ...transferSource,custodyReceipts:moves.map((row,i)=>
  i===1?{...row,actorCharacterId:'QA_OUTSIDE_ACCOUNT'}:row),
};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,spoofedWithdraw),
 /custody_history_other_account_character/,
 'other-account actor cannot withdraw a minted EQ2 copy');
const denied={...initial.source,verifyPersisted:()=>false};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,denied),/persisted_custody_not_verified/);
const banked={...initial.source,custody:{...initial.source.custody,
 copies:initial.source.custody.copies.map(x=>({...x,location:'bank' as const,
  equippedSlot:undefined,ownerCharacterId:null}))}};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,banked),/virtual_custody_projection_mismatch/);
const missingMove={...initial.source,custodyReceipts:[]};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,missingMove),
 /virtual_custody_projection_mismatch/,
 'a claim reservation alone cannot authorize an equipped EQ2 copy');
const forgedMove={...initial.source,custodyReceipts:[{
 ...initial.equipReceipt,newHolder:'QA_FOREIGN_CHARACTER',
}]};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,forgedMove),
 /custody_history_other_account_character/,
 'an equip receipt for a character outside the account must fail immediately');
const ownerMismatch={...initial.source,custodyReceipts:[{
 ...initial.equipReceipt,newHolder:null,
}]};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,ownerMismatch),
 /v2_virtual_move_owner_conflict/,
 'even same-account equip receipts must name their exact replayed holder');
const wrongReservedLocation={...initial.source,reservations:[{
 ...initial.reservation,destination:'inventory' as const,
}]};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,wrongReservedLocation),
 /v2_virtual_move_history_conflict/,
 'equip replay requires original claim placement, not a forged location');
const reusedRequest={...initial.source,custodyReceipts:[{
 ...initial.equipReceipt,requestId:initial.claim.requestId,
}]};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,reusedRequest),
 /duplicate_cross_system_v2_receipt_id/,
 'Forge claim and equipment movement cannot share a request ID');
const duplicate={...initial.source,custody:{...initial.source.custody,
 copies:[...initial.source.custody.copies,...initial.source.custody.copies]}};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,duplicate),/duplicate_account_copy/);
const forged={...initial.source,items:initial.source.items.map(item=>({
 ...item,exactItem:{...item.exactItem,
  baseStats:{...item.exactItem.baseStats,attack:item.exactItem.baseStats.attack+2000}},
}))};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,forged),/invalid_hidden_v2_claim_receipt|invalid_hidden_v2_exact_copy/);
const duplicateClaim={...initial.source,claims:[
 ...initial.source.claims,...initial.source.claims]};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,duplicateClaim),
 /duplicate_hidden_v2_receipt/,
 'same forged EQ2 claim request cannot appear twice');
if(initial.claim.response.kind!=='claimed')throw Error('invalid test-only minted claim');
const redirectedClaim:V2DraftReceipt={...initial.claim,
 response:{...initial.claim.response,instanceId:'QA_FOREIGN_COPY'}};
const wrongClaim={...initial.source,claims:[initial.start,redirectedClaim]};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,wrongClaim),
 /invalid_hidden_v2_claim_receipt/,'wrong item-copy claim must be denied');
const inflatedItem={...initial.mint.exactItem,baseStats:{
 ...initial.mint.exactItem.baseStats,
 defense:initial.mint.exactItem.baseStats.defense+999,
}};
const stolenProjection={...initial.source,
 items:[{...initial.mint,exactItem:inflatedItem}],
 claims:[initial.start,{...initial.claim,response:{...initial.claim.response,
  exactItem:inflatedItem}}],
 custody:{...initial.source.custody,copies:[{...initial.custody,item:inflatedItem}]},
};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,stolenProjection),
 /invalid_hidden_v2_exact_copy/,'coordinated forged base-stat snapshots must be rejected by canonical EQ2 policy');
const withoutAward={...initial.source,awards:[]};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,withoutAward),
 /invalid_hidden_v2_claim_settlement/,
 'no equipment combat from claim lacking the original crafting XP settlement');
const staleVersion={...initial.source,ledgerRevision:5};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,staleVersion),/stale_custody_ledger_revision/,
 'newer verified Forge claim may never compile using an older account revision');
const alteredAward={...initial.source,awards:initial.source.awards.map(row=>({
 ...row,xp:row.xp+1,
}))};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,alteredAward),
 /invalid_hidden_v2_claim_settlement/,'no accepted bonus from tampered craft XP');
const copiedGear={...qaTeam[1].build,
 selected:{...qaTeam[1].build.selected,equipment:{[qaTeam[1].exact.slot]:initial.mint.id}}};
assert.throws(()=>simulateRealFrozenForgeCombatV2(input,[
 qaTeam[0].build,copiedGear,...qaTeam.slice(2).map(x=>x.build)],
 qaTeam.map(x=>x.source),true),/cross_character_worn_copy/);
const setItem=make('IRONWARDEN',0,'set');
assert.throws(()=>compileRealFrozenForgeActorV2(
 setItem.actor,setItem.build,setItem.source),/set_source_bonus_unreconciled/,
 'never invent 48-set or preapproved Forge set bonuses');
// The source-owned two-piece review is allowed to COUNT milestones but NEVER
// issue bonuses. Merge two independently minted source-confirmed pieces into
// one same-account, same-character Forge ledger with ordered virtual receipts.
const setSecond=make('IRONWARDEN',1,'set');
const normalizedSecond={
 mint:{...setSecond.mint,accountId:setItem.source.accountId,
  ownerCharacterId:setItem.source.characterId},
 job:{...setSecond.job,accountId:setItem.source.accountId,
  ownerCharacterId:setItem.source.characterId},
 award:{...setSecond.award,characterId:setItem.source.characterId},
 reservation:{...setSecond.reservation,ownerCharacterId:setItem.source.characterId},
 equipReceipt:{...setSecond.equipReceipt,
  actorCharacterId:setItem.source.characterId,
  oldHolder:setItem.source.characterId,newHolder:setItem.source.characterId,
  version:7},
 custody:{...setSecond.custody,accountId:setItem.source.accountId,
  ownerCharacterId:setItem.source.characterId},
};
const twoSetSource:TrustedFrozenForgeCombatSourceV2={
 ...setItem.source,ledgerRevision:7,
 items:[...setItem.source.items,normalizedSecond.mint],
 jobs:[...setItem.source.jobs,normalizedSecond.job],
 awards:[...setItem.source.awards,normalizedSecond.award],
 claims:[...setItem.source.claims,...setSecond.source.claims],
 reservations:[...setItem.source.reservations,normalizedSecond.reservation],
 custodyReceipts:[...setItem.source.custodyReceipts,
  normalizedSecond.equipReceipt],
 custody:{...setItem.source.custody,copies:[
  ...setItem.source.custody.copies,normalizedSecond.custody]},
};
const twoSetReadback=inspectOnlineGameStateForgeCombatV2({
 authenticatedAccountId:twoSetSource.accountId,
 characterId:twoSetSource.characterId,
 expectedRevision:twoSetSource.ledgerRevision,
 row:dbRow(twoSetSource),
});
const setReview=reviewWornRealForgeSetsV2(twoSetReadback);
assert.equal(setReview.wornItemCount,2);
assert.equal(setReview.uniqueEquipmentSlots,2);
assert.equal(setReview.candidateSets.length,1);
assert.deepEqual(setReview.candidateSets[0].wornPieceIds.slice().sort(),
 ['EQ2_FIELDBORN_GUARD_CHEST','EQ2_FIELDBORN_GUARD_HELMET'],
 'set milestone uses canonical item identity, never order of minted copies');
assert.deepEqual(setReview.candidateSets[0].reachedReviewMilestones,[2]);
assert.equal(setReview.totalReviewMilestonesReached,1);
assert.equal(setReview.activatedSetBonuses,0);
assert.equal(setReview.authorizedToExecuteCombat,false);
const fakeSetCountSource={...twoSetReadback,custody:{
 ...twoSetReadback.custody,copies:[
  ...twoSetReadback.custody.copies,
  {...twoSetReadback.custody.copies[0],
   instanceId:'QA_FORGED_DUPLICATE_SET_PIECE',
   equippedSlot:'gloves' as const},
 ]}};
assert.throws(()=>reviewWornRealForgeSetsV2(fakeSetCountSource),
 /wrong_or_duplicate_equipment|unverified_worn_source/,
 'invented copy cannot increase source-backed Forge milestone eligibility');
const wrongRoleReadback={...twoSetReadback,currentClassId:'WAYFINDER' as const,
 custody:{...twoSetReadback.custody,
  characters:twoSetReadback.custody.characters.map(row=>({
   ...row,classId:'WAYFINDER',
  })),
 }};
assert.throws(()=>reviewWornRealForgeSetsV2(wrongRoleReadback),
 /unverified_worn_source/,
 'a real Tank set does not qualify for a different class role');
const underLevelReadback={...twoSetReadback,currentLevel:1,
 custody:{...twoSetReadback.custody,
  characters:twoSetReadback.custody.characters.map(row=>({
   ...row,level:1,
  })),
 }};
assert.throws(()=>reviewWornRealForgeSetsV2(underLevelReadback),
 /unverified_worn_source/,
 'a genuine but level-locked piece grants no design milestone');
const tamperedRollReadback={...twoSetReadback,
 custody:{...twoSetReadback.custody,
  copies:twoSetReadback.custody.copies.map((row,i)=>i===0?{
   ...row,item:{...row.item,baseStats:{...row.item.baseStats,
    hp:row.item.baseStats.hp+1}},
  }:row),
 }};
assert.throws(()=>reviewWornRealForgeSetsV2(tamperedRollReadback),
 /wrong_or_duplicate_equipment|unverified_worn_source/,
 'a mutated frozen item cannot count as valid forged Equipment 2.0');
const twoSetBuild={...setItem.build,
 verified:{...setItem.build.verified,
  ownedInstanceIds:new Set([setItem.mint.id,setSecond.mint.id])},
 ownedItemsById:{...setItem.build.ownedItemsById,
  [setSecond.mint.id]:{
   instanceId:setSecond.mint.id,slot:'chest' as const,tier:'T1',
   requiredLevel:2,eligibleRoles:['tank' as const],
  }},
 selected:{...setItem.build.selected,
  equipment:{helmet:setItem.mint.id,chest:setSecond.mint.id},
 },
};
assert.throws(()=>compileRealFrozenForgeActorV2(
 setItem.actor,twoSetBuild,twoSetSource),
 /set_source_bonus_unreconciled/,
 'two genuinely owned EQ2 set copies still cannot activate unapproved effects');
const offslot=make('HEXWEAVER',1,'offslot');
const offslotResult=compileRealFrozenForgeActorV2(
 offslot.actor,offslot.build,offslot.source);
const originalRolledId=EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[
 offslot.exact.affixes[0].stat]!;
assert.equal(offslotResult.evidence.affixSources[0].id,originalRolledId);
assert.equal(offslotResult.evidence.affixSources[0].instanceId,offslot.mint.id);
assert.throws(()=>validateTrustedAffixesV2({
 instanceId:offslot.mint.id,slot:offslot.exact.slot,tier:'T1',
 rarity:offslot.exact.rarity,quality:offslot.exact.quality,
 affixes:[{id:originalRolledId,value:offslot.exact.affixes[0].percent/100}],
},qaCaps),/combat_v2_affix_slot_ineligible/,
 'Generic or legacy Combat affix snapshots cannot borrow original Forge slot provenance');
const unsupported=make('HEXWEAVER',1,'unsupported');
assert.throws(()=>compileRealFrozenForgeActorV2(
 unsupported.actor,unsupported.build,unsupported.source),
 /combat_v2_forge_original_affix_unimplemented/,'ambiguous original Forge Potency must not be silently mapped');
// Private cross-stack integration: the EXACT same Skills 2.0 authored
// generic / targeted / alternative selector imported from hidden PR #1700,
// now run with REAL original Forge rolled copies, jobs, claims, XP and current
// virtual custody from the source-owning Equipment 2.0 branch. Boss identities
// route the tactic selector but opponents still use the GENERIC V2 enemy
// compiler, NOT a signed six-boss authored encounter kit or final boss balance.
const forgeTacticalBosses=[
 {id:'BOSS_EXP_ROOT',tier:1},
 {id:'BOSS_EXP_BELL',tier:2},
 {id:'BOSS_EXP_SOLAR',tier:3},
 {id:'BOSS_EXP_SPHINX',tier:3},
 {id:'BOSS_EXP_BELLBEAST',tier:4},
 {id:'BOSS_EXP_CANTOR',tier:4},
] as const;
const tacticalStrategies=['generic','targeted','alternative'] as const;
let realForgeTacticalEncounters=0,realForgeSkillDiffering=0;
let eligibleRealForgeCounterSpecs=0,buildPinnedRejections=0;
const realForgeTacticalByGroup=new Map<string,string>();
const tacticalGearByGroup=new Map<string,string>();
const tacticalScopedReceiptByGroup=new Map<string,string>();
for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
 for(const specIndex of [0,1] as const){
  for(const bossCase of forgeTacticalBosses){
   const qa=make(classId,specIndex,'supported',bossCase.tier);
   const spec=SPECIALIZATIONS_V2.filter(s=>s.classId===classId)[specIndex];
   const key=classId+'|'+specIndex+'|'+bossCase.id;
   const signedInputs=JSON.stringify({
    mint:qa.mint,claims:qa.source.claims,jobs:qa.source.jobs,
    awards:qa.source.awards,custody:qa.source.custody,
    reservations:qa.source.reservations,
    custodyReceipts:qa.source.custodyReceipts,
   });
   const enemy:CombatantDefinition={
    ...boss,id:bossCase.id,level:qa.actor.level,
   };
   const encounter:CombatInput={
    seed:'EQ2_REAL_FORGE_SKILL_'+key,players:[qa.actor],
    enemies:[enemy],maxDurationMs:12000,
   };
   let genericSkills='';
   for(const strategy of tacticalStrategies){
    const choice=selectReviewSkillLoadoutV2(
     classId,spec.id,qa.actor,bossCase.id,strategy);
    const build:VerifiedSkillBuildV2={
     ...qa.build,selected:{...qa.build.selected,activeSkills:choice.activeSkills},
    };
    const replay=simulateRealFrozenForgeCombatV2(
     encounter,[build],[qa.source],true);
    const repeat=simulateRealFrozenForgeCombatV2(
     encounter,[build],[qa.source],true);
    assert.deepEqual(replay,repeat,
     'Original minted gear + the same authored ability must replay: '+key);
    const compiled=compileRealFrozenForgeActorV2(qa.actor,build,qa.source);
    assert.deepEqual(replay.equipmentEvidence,[compiled.evidence],
     'Signed original Forge compiler stages must be exactly those used in combat');
    const classOnly=issueClassOnlyActorV2(
     qa.actor,build.verified,qa.source.classBaselinePolicy);
    const skills=compileServerSkillBuildV2(true,{...build,actor:classOnly});
    const inspection=inspectFrozenForgeCombatHandoffV2(
     qa.actor.id,[qa.mint.id],skills.stats,compiled.evidence);
    assert.equal(inspection.equipmentCount,1);
    assert.equal(inspection.doubleScaled,false);
    assert.equal(inspection.canAuthorizeCombat,false);
    assert.equal(inspection.canListOnMarket,false);
    assert.equal(inspection.canGrantLoot,false);
    assert.equal(inspection.releaseApproved,false);
    assert.equal(replay.combat.players[0].definition.abilities.length,2);
    assert.ok(replay.combat.events.some(event=>event.type==='combat_start'));
    assert.equal(replay.combat.players[0].definition.combatV2?.version,2);
    assert.equal(JSON.stringify({
     mint:qa.mint,claims:qa.source.claims,jobs:qa.source.jobs,
     awards:qa.source.awards,custody:qa.source.custody,
     reservations:qa.source.reservations,
     custodyReceipts:qa.source.custodyReceipts,
    }),signedInputs,'QA combat cannot mutate original Forge settlement/custody');
    const sourceDigest=JSON.stringify({
     items:compiled.evidence.items,
     afterSkills:compiled.evidence.stages.afterSkills,
     afterFrozenBase:compiled.evidence.stages.afterFrozenBase,
     afterForgeAffixes:compiled.evidence.stages.afterForgeAffixes,
    });
    const earlier=tacticalGearByGroup.get(key);
    if(earlier===undefined)tacticalGearByGroup.set(key,sourceDigest);
    else assert.equal(sourceDigest,earlier,
     'Changing only skill variants cannot change original Forge minted stats');
    const selected=JSON.stringify(choice.activeSkills);
    // The original Forge ledger digest correctly binds the selected Skills
    // build as well as minted equipment. Unlike frozen ITEM stats, this
    // authorization digest MUST change when skill variants change.
    const scoped=compiled.evidence.receiptDigest;
    assert.match(scoped,/^[a-f0-9]{64}$/);
    if(strategy==='generic'){
     genericSkills=selected;
     tacticalScopedReceiptByGroup.set(key,scoped);
    }else{
     assert.equal(scoped===tacticalScopedReceiptByGroup.get(key),
      selected===genericSkills,
      'Build-bound Forge digest must change iff selected tactics change');
     if(selected!==genericSkills){
      realForgeSkillDiffering++;
      if(buildPinnedRejections===0){
       // A service-owned pinned receipt binds the GENERIC build. Reusing it
       // with newly selected tactical skills without a fresh approved build
       // must reject, even when all minted gear is still physically identical.
       const pinned={...qa.source,
        verifyPersisted:(digest:string,revision:number)=>
         revision===qa.source.ledgerRevision&&
         digest===tacticalScopedReceiptByGroup.get(key)};
       const baseline=selectReviewSkillLoadoutV2(
        classId,spec.id,qa.actor,bossCase.id,'generic');
       const baselineBuild:VerifiedSkillBuildV2={
        ...qa.build,selected:{...qa.build.selected,
         activeSkills:baseline.activeSkills},
       };
       assert.doesNotThrow(()=>
        compileRealFrozenForgeActorV2(qa.actor,baselineBuild,pinned));
       assert.throws(()=>
        compileRealFrozenForgeActorV2(qa.actor,build,pinned),
        /persisted_custody_not_verified/,
        'Original account-bound build receipt cannot be replayed with new skills');
       buildPinnedRejections++;
      }
     }
    }
    if(strategy==='targeted'&&choice.hasMatchingCounter)
     eligibleRealForgeCounterSpecs++;
    realForgeTacticalEncounters++;
   }
   realForgeTacticalByGroup.set(key,genericSkills);
  }
 }
}
assert.equal(realForgeTacticalEncounters,9*2*6*3);
assert.equal(realForgeTacticalByGroup.size,9*2*6);
assert.equal(tacticalGearByGroup.size,9*2*6);
assert.equal(tacticalScopedReceiptByGroup.size,9*2*6);
assert.equal(buildPinnedRejections,1);
assert.ok(realForgeSkillDiffering>0,
 'Forge-backed QA must actually vary original authored class skill loadouts');
// Actual original-source evidence must reject changes even when supplied
// to the Skills branch's read-only shape inspector. These rows are generated
// from one real pinned Forge roll and its complete original QA ledger; the
// cross-branch inspector does not authenticate ownership or permit combat.
// Protect the true old Forge minted source from the next version's
// class-free proposed bonus rolls. A preview cannot be grandfathered into
// a claimed Forge item, listed, resold or granted as new combat gear.
let universalGatePositive=0,universalGateNegative=0;
for(const tier of [1,2,3,4] as const){
 const actual=make('IRONWARDEN',0,'supported',tier);
 const draft=previewClassIndependentOriginalForgeAffixesV2(
  actual.exact.pieceId,actual.mint.outcome.recipeId,(max:number)=>max-1);
 const gate=reviewOriginalForgeToUniversalBonusGateV2(actual.mint,draft);
 assert.equal(gate.sourceItemIsOriginalForge,true);
 assert.equal(gate.originalCopyCanBeRebrandedUniversal,false);
 assert.equal(gate.canMintUniversalFromPreview,false);
 assert.equal(gate.canListUniversalPreviewOnMarket,false);
 assert.equal(gate.canSellOrResellLegacy,false);
 assert.equal(gate.canGrantRewards,false);
 assert.equal(gate.canAuthorizeCombat,false);
 assert.equal(gate.releaseApproved,false);
 assert.equal(gate.requiresNewClaimAndCustodyVersion,true);
 universalGatePositive++;
 assert.throws(()=>reviewOriginalForgeToUniversalBonusGateV2(
  actual.mint,{...draft,canMint:true} as unknown as typeof draft),
  /unissued_proposal_attests_false_mint_authority/);universalGateNegative++;
 assert.throws(()=>reviewOriginalForgeToUniversalBonusGateV2(
  actual.mint,{...draft,originalRecipeId:'FAKE_RECIPE'} as typeof draft),
  /unissued_proposal_attests_false_mint_authority/);universalGateNegative++;
 assert.throws(()=>reviewOriginalForgeToUniversalBonusGateV2(
  actual.mint,{...draft,bonusStats:[
   {...draft.bonusStats[0],stat:'potency'}]} as typeof draft),
  /proposal_roll_identity_unapproved|proposal_roll_count_invalid/);
 universalGateNegative++;
 assert.throws(()=>reviewOriginalForgeToUniversalBonusGateV2(
  {...actual.mint,outcome:{...actual.mint.outcome,
   rulesVersion:'eq2-universal-class-independent-bonus-proposal-v1' as
    typeof actual.mint.outcome.rulesVersion}},draft),
  /original_mint_not_source_verified/);universalGateNegative++;
 assert.throws(()=>reviewOriginalForgeToUniversalBonusGateV2(
  {...actual.mint,exactItem:{...actual.mint.exactItem,baseStats:{
   ...actual.mint.exactItem.baseStats,
   defense:actual.mint.exactItem.baseStats.defense+1,
  }}},draft),/original_mint_not_source_verified/);
 universalGateNegative++;
}
assert.equal(universalGatePositive,4);
assert.equal(universalGateNegative,20);
console.log('PASS: '+universalGatePositive+
 ' authenticated-shape original Forge mint-vs-universal review cases, '+
 universalGateNegative+' version/copy/preview/market tamper negatives; '+
 'all original copies unchanged, all universal drafts UNISSUABLE');
// ----------------------------------------------------------------------
const originalAudit=make('IRONWARDEN',0,'supported',2);
const originalCompiled=compileRealFrozenForgeActorV2(
 originalAudit.actor,originalAudit.build,originalAudit.source);
const originalClassOnly=issueClassOnlyActorV2(
 originalAudit.actor,originalAudit.build.verified,
 originalAudit.source.classBaselinePolicy);
const originalSkills=compileServerSkillBuildV2(true,{
 ...originalAudit.build,actor:originalClassOnly,
});
const originalId=originalAudit.mint.id;
const originalEvidence=originalCompiled.evidence;
const audit=(row:typeof originalEvidence)=>
 inspectFrozenForgeCombatHandoffV2(
  originalAudit.actor.id,[originalId],originalSkills.stats,row);
const approvedShape=audit(originalEvidence);
assert.equal(approvedShape.canAuthorizeCombat,false);
assert.equal(approvedShape.canGrantLoot,false);
assert.equal(approvedShape.canListOnMarket,false);
assert.equal(approvedShape.releaseApproved,false);
assert.deepEqual(approvedShape.frozenBaseDelta,
 originalAudit.exact.baseStats,
 'Original Forge authored roll was already scaled by rarity and quality');
assert.throws(()=>audit({...originalEvidence,stages:{
 ...originalEvidence.stages,
 afterFrozenBase:{...originalEvidence.stages.afterFrozenBase,
  defense:originalEvidence.stages.afterFrozenBase.defense+1},
}}),/frozen_forge_scaled_twice_or_stat_basis_drift/);
assert.throws(()=>audit({...originalEvidence,items:[
 {...originalEvidence.items[0],scaledBaseStats:{
  ...originalEvidence.items[0].scaledBaseStats,
  hp:originalEvidence.items[0].scaledBaseStats.hp+1,
 }},
]}),/frozen_forge_scaled_twice_or_stat_basis_drift/);
assert.throws(()=>audit({...originalEvidence,
 equippedInstanceIds:['WRONG_BANK_COPY'],
}),/forged_or_missing_source_item/);
assert.throws(()=>audit({...originalEvidence,
 setBonuses:'UNAPPROVED' as typeof originalEvidence.setBonuses,
}),/unapproved_or_missing_forge_evidence/);
assert.throws(()=>audit({...originalEvidence,affixSources:[
 ...originalEvidence.affixSources,
 {instanceId:'INVENTED_BONUS',id:'attack_pct' as const,
  value:.02,unit:'relative_percent' as const},
]}),/unverified_forge_affix_source_shape/);
// One real source-proven Tank/2 Damage/Support party must also allow changing
// Skills 2.0 tactics without changing the four ORIGINAL minted gear copies.
const partySkilledBuilds=qaTeam.map(x=>{
 const spec=SPECIALIZATIONS_V2.find(s=>s.classId===x.build.verified.classId)!;
 const choice=selectReviewSkillLoadoutV2(
  x.build.verified.classId,spec.id,x.actor,'BOSS_EXP_BELL','targeted');
 return {...x.build,selected:{...x.build.selected,activeSkills:choice.activeSkills}};
});
const partySkillsResult=simulateRealFrozenForgeCombatV2(
 input,partySkilledBuilds,qaTeam.map(x=>x.source),true);
const partySkillsAgain=simulateRealFrozenForgeCombatV2(
 input,partySkilledBuilds,qaTeam.map(x=>x.source),true);
assert.deepEqual(partySkillsResult,partySkillsAgain);
assert.deepEqual(
 partySkillsResult.equipmentEvidence.map(x=>({
  items:x.items,
  afterFrozenBase:x.stages.afterFrozenBase,
 })),
 part.equipmentEvidence.map(x=>({
  items:x.items,
  afterFrozenBase:x.stages.afterFrozenBase,
 })),
 'Party skill variants cannot change independently verified original Forge copies');
console.log('PASS: '+realForgeTacticalEncounters+
 ' real original-Forge source-owned Skills × generic-boss-engine encounters, '+
 tacticalGearByGroup.size+' source-matched triplets, '+realForgeSkillDiffering+
 ' nonbaseline tactical builds, '+buildPinnedRejections+
 ' changed-skill pinned-ledger rejections and '+eligibleRealForgeCounterSpecs+
 ' counter-capable class/boss selections; original exact Forge frozen values applied once; 4-player replay; NO release approval');
// ------------------------------------------------------------------------
// Full original Forge equipped-copy QA using the REAL original 169-piece
// catalog — only source-pinned NON-SET pieces may execute until the original
// Forge 15-set and 48 proposed-set effects are reconciled. A class's two-hand
// weapon may intentionally occupy weapon without inventing an offhand.
const originalSlots=['helmet','chest','legs','gloves','boots','cape',
 'amulet','ring','weapon','offhand'] as const;
let multiForgeCombatRuns=0,multiForgeVerifiedCopies=0;
let multiForgeNineSlot=0,multiForgeTenSlot=0,multiForgeBadCopies=0;
let multiForgeSourceGaps=0,multiForgeMinSlots=10;
const multiForgeSlotDistribution=new Map<number,number>();
for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
 for(const specIndex of [0,1] as const){
  const role=CLASS_ROLES_V2[classId];
  const pinned=originalSlots.flatMap(slot=>{
   const candidates=V2_SERVER_PIECES
    .filter(p=>p.role===role&&p.slot===slot&&!p.setId&&
     (!p.classRestriction||p.classRestriction===classId))
    .sort((a,b)=>a.tier-b.tier||a.id.localeCompare(b.id));
   for(const piece of candidates){
    try{
     return [make(classId,specIndex,'supported',
      piece.tier as 1|2|3|4,piece.id,slot,55)];
    }catch(error){
     // Actual original Forge affix/slot incompatibility is a source gap.
     // NEVER silently discard a real roll or invent a compatible roll.
     if(!String(error).includes('Could not locate a deterministic Forge QA roll'))
      throw error;
    }
   }
   if(candidates.length>0||slot!=='offhand')multiForgeSourceGaps++;
   return [];
  });
  // This is a GAP AUDIT, not a fictitious 10-slot release certificate.
  assert.ok(pinned.length>=2&&pinned.length<=10,
   'At least two original source-valid equipped copies are required');
  multiForgeMinSlots=Math.min(multiForgeMinSlots,pinned.length);
  multiForgeSlotDistribution.set(pinned.length,
   (multiForgeSlotDistribution.get(pinned.length)??0)+1);
  const first=pinned[0],accountId=first.source.accountId,
   characterId=first.source.characterId;
  const revision=6+3*(pinned.length-1);
  const originalActor=first.actor;
  const composedSource:TrustedFrozenForgeCombatSourceV2={
   ...first.source,actorId:originalActor.id,accountId,characterId,
   items:pinned.map(p=>({...p.mint,accountId,ownerCharacterId:characterId})),
   jobs:pinned.map(p=>({...p.job,accountId,ownerCharacterId:characterId})),
   awards:pinned.map(p=>({...p.award,characterId})),
   claims:pinned.flatMap((p,i)=>[
    {...p.start,response:{...p.start.response,version:4+3*i}},
    {...p.claim,response:{...p.claim.response,version:5+3*i}},
   ]),
   reservations:pinned.map(p=>({...p.reservation,ownerCharacterId:characterId})),
   custodyReceipts:pinned.map((p,i)=>({...p.equipReceipt,
    actorCharacterId:characterId,oldHolder:characterId,
    newHolder:characterId,version:6+3*i})),
   custody:{accountId,characters:[{id:characterId,classId,level:55}],
    copies:pinned.map(p=>({...p.custody,accountId,
     ownerCharacterId:characterId}))},
   ledgerRevision:revision,
   verifyPersisted:(digest:string,version:number)=>
    version===revision&&/^[a-f0-9]{64}$/.test(digest),
  };
  const ids=pinned.map(x=>x.mint.id);
  const allSelections=Object.fromEntries(pinned.map(p=>[
   p.exact.slot,p.mint.id])) as VerifiedSkillBuildV2['selected']['equipment'];
  const build:VerifiedSkillBuildV2={
   ...first.build,actor:originalActor,
   verified:{...first.build.verified,level:55,
    ownedInstanceIds:new Set(ids)},
   selected:{...first.build.selected,equipment:allSelections},
   ownedItemsById:Object.assign({},...pinned.map(p=>p.build.ownedItemsById)),
  };
  const allSlots=Object.keys(build.selected.equipment);
  assert.equal(allSlots.length,pinned.length);
  assert.equal(new Set(ids).size,ids.length);
  const input:CombatInput={
   seed:'FULL_ORIGINAL_FORGE_'+classId+'_'+specIndex,
   players:[originalActor],enemies:[{...boss,
    id:'EQ2_REAL_FORGE_FULL_SOURCE_BOSS'}],
   maxDurationMs:9000,
  };
  const spec=SPECIALIZATIONS_V2.filter(s=>s.classId===classId)[specIndex];
  let baselineFrozen='';
  for(const strategy of ['generic','targeted'] as const){
   const choice=selectReviewSkillLoadoutV2(classId,spec.id,originalActor,
    'BOSS_EXP_BELL',strategy);
   const tacticalBuild:VerifiedSkillBuildV2={
    ...build,selected:{...build.selected,activeSkills:choice.activeSkills},
   };
   const fight=simulateRealFrozenForgeCombatV2(
    input,[tacticalBuild],[composedSource],true);
   const repeated=simulateRealFrozenForgeCombatV2(
    input,[tacticalBuild],[composedSource],true);
   assert.deepEqual(fight,repeated,
    'Full original 9/10-slot minted item ledger must replay deterministically');
   const evidence=fight.equipmentEvidence[0];
   assert.equal(evidence.items.length,pinned.length);
   assert.equal(evidence.equippedInstanceIds.length,pinned.length);
   assert.deepEqual(new Set(evidence.equippedInstanceIds),new Set(ids));
   const compiledClass=issueClassOnlyActorV2(
    originalActor,tacticalBuild.verified,composedSource.classBaselinePolicy);
   const compiledSkills=compileServerSkillBuildV2(true,{
    ...tacticalBuild,actor:compiledClass});
   const audit=inspectFrozenForgeCombatHandoffV2(
    originalActor.id,ids,compiledSkills.stats,evidence);
   assert.equal(audit.equipmentCount,pinned.length);
   assert.equal(audit.doubleScaled,false);
   assert.equal(audit.canAuthorizeCombat,false);
   assert.equal(audit.canListOnMarket,false);
   assert.equal(audit.canGrantLoot,false);
   assert.equal(audit.releaseApproved,false);
   const frozen=JSON.stringify({items:evidence.items,
    base:evidence.stages.afterFrozenBase,
    affixes:evidence.affixSources});
   if(strategy==='generic')baselineFrozen=frozen;
   else assert.equal(frozen,baselineFrozen,
    'Class skill tactics may change build digest, never a frozen Forge copy');
   multiForgeCombatRuns++;
   multiForgeVerifiedCopies+=pinned.length;
  }
  if(pinned.length===9)multiForgeNineSlot++;
  if(pinned.length===10)multiForgeTenSlot++;
  if(classId==='IRONWARDEN'&&specIndex===0){
   const badSource={...composedSource,custody:{
    ...composedSource.custody,
    copies:composedSource.custody.copies.map((row,i)=>i===0?{
     ...row,instanceId:'QA_FOREIGN_BANK_SUBSTITUTION'}:row),
   }};
   assert.throws(()=>simulateRealFrozenForgeCombatV2(
    input,[build],[badSource],true),
    /virtual_custody_projection_mismatch/);
   multiForgeBadCopies++;
   const [firstSlot,secondSlot]=Object.keys(build.selected.equipment);
   const duplicatedBuild={...build,selected:{...build.selected,equipment:{
    ...build.selected.equipment,[secondSlot]:build.selected.equipment[
     firstSlot as keyof typeof build.selected.equipment],
   }}};
   assert.throws(()=>simulateRealFrozenForgeCombatV2(
    input,[duplicatedBuild],[composedSource],true),
    /skill_or_equipment_build_invalid|duplicate_worn_copy|cross_character_worn_copy/);
   multiForgeBadCopies++;
   const counterfeit={...composedSource,items:[
    {...composedSource.items[0],exactItem:{
     ...composedSource.items[0].exactItem,
     baseStats:{...composedSource.items[0].exactItem.baseStats,
      attack:composedSource.items[0].exactItem.baseStats.attack+1},
    }},
    ...composedSource.items.slice(1),
   ]};
   assert.throws(()=>simulateRealFrozenForgeCombatV2(
    input,[build],[counterfeit],true),
    /invalid_hidden_v2|forge_manifest_roll_source_mismatch|exact_copy/);
   multiForgeBadCopies++;
  }
 }
}
assert.equal(multiForgeCombatRuns,36);
assert.equal([...multiForgeSlotDistribution.values()].reduce((a,b)=>a+b,0),18);
assert.ok(multiForgeMinSlots>=2);
assert.ok(multiForgeVerifiedCopies>=72);
assert.ok(multiForgeSourceGaps>=0);
assert.equal(multiForgeBadCopies,3);
console.log('PASS: '+multiForgeCombatRuns+
 ' source-compatible original Forge multi-slot engine runs (18 class/spec sets): '+
 multiForgeVerifiedCopies+' immutable original source-copy compilations, '+
 multiForgeNineSlot+' nine-slot two-hand/paired cases, '+multiForgeTenSlot+
 ' ten-slot one-hand cases; slots-by-spec '+JSON.stringify(
  [...multiForgeSlotDistribution.entries()].sort((a,b)=>a[0]-b[0]))+
 '; '+multiForgeSourceGaps+' source-gap slots, '+multiForgeBadCopies+
 ' invalid-ledger attacks; original Forge set bonuses DENIED');
// ----------------------------------------------------------------------
// Real original Forge mint+claim+virtual-equip source through the GENUINE
// server-persisted six regional Enemy V2 boss profiles. Unlike the earlier
// 324-case identity-only experiment, these use original authored cast/phase
// scripts and Enemy V2 engine authority, NOT generic V2_ENEMY pressure phases.
const exactBossProfiles=[
 {id:'BOSS_EXP_ROOT',region:'asterfall',tier:2,forgeTier:1,level:25},
 {id:'BOSS_EXP_BELL',region:'asterfall',tier:2,forgeTier:2,level:25},
 {id:'BOSS_EXP_SOLAR',region:'sunscar',tier:3,forgeTier:3,level:40},
 {id:'BOSS_EXP_SPHINX',region:'sunscar',tier:3,forgeTier:3,level:40},
 {id:'BOSS_EXP_BELLBEAST',region:'frostmarch',tier:4,forgeTier:4,level:60},
 {id:'BOSS_EXP_CANTOR',region:'frostmarch',tier:4,forgeTier:4,level:60},
] as const;
// QA-only counterfactuals: one permanent set channel at a time on the
// identical original source-compiled actor. These are NOT owned set copies,
// candidate mint receipts, or an authorization to wear/apply a set.
const v19PermanentEffects={
 asterfall:{tank:{channel:'defense_pct',pct:3},damage:{channel:'attack_pct',pct:3},support:{channel:'forge_healing_power_pct',pct:3}},
 sunscar:{tank:{channel:'defense_pct',pct:3.5},damage:{channel:'ability_damage_pct',pct:3.5},support:{channel:'forge_healing_power_pct',pct:3.5}},
 frostmarch:{tank:{channel:'max_hp_pct',pct:4},damage:{channel:'attack_pct',pct:4},support:{channel:'forge_healing_power_pct',pct:4}},
} as const;
type V19Effect=typeof v19PermanentEffects[keyof typeof v19PermanentEffects][keyof typeof v19PermanentEffects['asterfall']];
function v19ApplyPermanentSensitivity(actor:CombatantDefinition,effect:V19Effect):CombatantDefinition{
 const result=structuredClone(actor),factor=1+effect.pct/100;
 const meta=result.combatV2,gear=meta?.equipmentEffects;
 if(!meta||!gear)throw Error('v19_verified_source_actor_required');
 switch(effect.channel){
  case 'defense_pct':result.stats.defense*=factor;break;
  case 'attack_pct':result.stats.attackPower*=factor;break;
  case 'max_hp_pct':result.stats.maxHp*=factor;break;
  case 'ability_damage_pct':result.combatV2={...meta,equipmentEffects:{...gear,abilityDamagePct:(gear.abilityDamagePct??0)+effect.pct/100}};break;
  case 'forge_healing_power_pct':result.combatV2={...meta,equipmentEffects:{...gear,forgeHealingPowerPct:(gear.forgeHealingPowerPct??0)+effect.pct/100}};break;
 }
 return result;
}

// V21: original Forge QA receipts only, no new catalogue items or grants.
// Prefer the highest source-compatible tier at or below the intended tier;
// gaps and downgrades are reported, not filled by invented pieces.
type SoloGearReviewProfile='pinned_reference'|'low_common'|'transition_common';
function makeV21Loadout(classId:ClassIdV2,specIndex:0|1,targetTier:1|2|3|4,targetLevel:number,gearProfile:SoloGearReviewProfile='pinned_reference'){
 const low=gearProfile!=='pinned_reference';
 const rollFilter=(roll:V2DraftRollOutcome)=>!low||(roll.rarity==='common'&&roll.quality>=10&&roll.quality<=30);
 const role=CLASS_ROLES_V2[classId];
 const pinned:ReturnType<typeof make>[]=[];
 const missing:string[]=[];
 const slots=['weapon','offhand','helmet','chest','gloves','legs','boots','cape','amulet','ring'] as const;
 for(const slot of slots){
  if(slot==='offhand'&&pinned.some(p=>p.exact.slot==='weapon'&&p.exact.hands!=='one'))continue;
  const slotTarget=gearProfile==='transition_common'&&['helmet','legs','cape','ring'].includes(slot)?Math.max(1,targetTier-1):targetTier;
  const choices=V2_SERVER_PIECES.filter(p=>p.role===role&&p.slot===slot&&!p.setId&&p.tier<=slotTarget&&(!p.classRestriction||p.classRestriction===classId))
   .sort((a,b)=>b.tier-a.tier||a.id.localeCompare(b.id));
  let picked:ReturnType<typeof make>|undefined;
  for(const piece of choices){
   try{picked=make(classId,specIndex,'supported',piece.tier as 1|2|3|4,piece.id,'V21_'+slot+(low?'_'+gearProfile:''),targetLevel,rollFilter);break;}
   catch(e){if(!String(e).includes('Could not locate a deterministic Forge QA roll'))throw e;}
  }
  if(picked)pinned.push(picked);else missing.push(slot);
 }
 if(!pinned.length)throw Error('v21_no_source_compatible_copies');
 if(!pinned.some(p=>p.exact.slot==='weapon'))throw Error('v21_missing_weapon');
  const first=pinned[0],accountId=first.source.accountId,
   characterId=first.source.characterId;
  const revision=6+3*(pinned.length-1);
  const originalActor=first.actor;
  const composedSource:TrustedFrozenForgeCombatSourceV2={
   ...first.source,actorId:originalActor.id,accountId,characterId,
   items:pinned.map(p=>({...p.mint,accountId,ownerCharacterId:characterId})),
   jobs:pinned.map(p=>({...p.job,accountId,ownerCharacterId:characterId})),
   awards:pinned.map(p=>({...p.award,characterId})),
   claims:pinned.flatMap((p,i)=>[
    {...p.start,response:{...p.start.response,version:4+3*i}},
    {...p.claim,response:{...p.claim.response,version:5+3*i}},
   ]),
   reservations:pinned.map(p=>({...p.reservation,ownerCharacterId:characterId})),
   custodyReceipts:pinned.map((p,i)=>({...p.equipReceipt,
    actorCharacterId:characterId,oldHolder:characterId,
    newHolder:characterId,version:6+3*i})),
   custody:{accountId,characters:[{id:characterId,classId,level:targetLevel}],
    copies:pinned.map(p=>({...p.custody,accountId,
     ownerCharacterId:characterId}))},
   ledgerRevision:revision,
   verifyPersisted:(digest:string,version:number)=>
    version===revision&&/^[a-f0-9]{64}$/.test(digest),
  };
  const ids=pinned.map(x=>x.mint.id);
  const allSelections=Object.fromEntries(pinned.map(p=>[
   p.exact.slot,p.mint.id])) as VerifiedSkillBuildV2['selected']['equipment'];
  const build:VerifiedSkillBuildV2={
   ...first.build,actor:originalActor,
   verified:{...first.build.verified,level:targetLevel,
    ownedInstanceIds:new Set(ids)},
   selected:{...first.build.selected,equipment:allSelections},
   ownedItemsById:Object.assign({},...pinned.map(p=>p.build.ownedItemsById)),
  };

 return {actor:originalActor,build,source:composedSource,ids,missing,
  tiers:pinned.map(p=>({slot:p.exact.slot,tier:p.exact.tier,pieceId:p.exact.pieceId,instanceId:p.mint.id})),
  downgraded:pinned.filter(p=>p.exact.tier<targetTier).length,
  gearProfile,rolls:pinned.map(p=>({slot:p.exact.slot,tier:p.exact.tier,rarity:p.mint.outcome.rarity,quality:p.mint.outcome.quality}))};
}

// Full worn-loadout gem stacking on actual draft Forge source copies.
// Do not fill missing slots or add an illegal offhand to two-hand weapons.
{
 const policy:ForgeSocketReviewPolicyV2={version:'QA_FULL_SOCKET_STACK_V2',gemBalancePolicy:GEM_BALANCE_REVIEW_V2,
  mechanicsReview:{version:FORGE_SOCKET_MECHANICS_REVIEW_V2,maxFinalAttackPower:1e8},
  maxFinalHp:1e8,maxFinalDefense:1e8};
 const families=STAT_GEMS_REVIEW_V2.map(d=>d.familyId);
 assert.equal(families.length,11);
 const rows:{classId:ClassIdV2;spec:number;slots:number;arm:string;channels:ReturnType<typeof inspectSocketStackingCapReviewV2>['channels'];diminishing:ReturnType<typeof inspectSocketStackingCapReviewV2>['channels'];gentle:ReturnType<typeof inspectSocketStackingCapReviewV2>['channels'];utility:ReturnType<typeof reviewUtilityGemSemanticsV2>;hasteDelta:number;attackDelta:number}[]=[];
 const coverage:{classId:ClassIdV2;spec:number;slots:number;missing:string[];downgraded:number}[]=[];
 const statCombatRows:{classId:ClassIdV2;spec:number;arm:string;result:ReturnType<ReturnType<typeof createGentleStatCombatReviewV2>>}[]=[];
 const potentCombatRows:typeof statCombatRows=[];
 for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[])for(const spec of [0,1] as const){
  const qa=makeV21Loadout(classId,spec,4,55);
  const n=qa.ids.length;
  assert.ok(n>0&&n<=10);
  coverage.push({classId,spec,slots:n,missing:qa.missing,downgraded:qa.downgraded});
  const revision=qa.source.ledgerRevision+n;
  const source={...qa.source,ledgerRevision:revision,verifyPersisted:(digest:string,rev:number)=>rev===revision&&/^[a-f0-9]{64}$/.test(digest)};
  const original=JSON.stringify(source.items);
  const baseline=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,{slots:[],receipts:[]},policy);
  const baselineUtility=reviewUtilityGemSemanticsV2(baseline);
  const compiled=compileRealFrozenForgeActorV2(qa.actor,qa.build,source);
  const fight=createGentleStatCombatReviewV2(compiled,baseline,{...boss,id:'BOSS_EXP_BELLBEAST',name:'The Bellbeast of Shiverlake',level:60},'GENTLE_'+classId+'_'+spec);
  const potentFight=createGentleStatCombatReviewV2(compiled,baseline,{...boss,id:'BOSS_EXP_BELLBEAST',name:'The Bellbeast of Shiverlake',level:60},'GENTLE_'+classId+'_'+spec,true);
  assert.equal(baselineUtility.haste.incrementalGem,0);
  assert.ok(baselineUtility.potency.every(c=>c.incrementalGem===0));
  const arms=[...families,'mixed-role','mixed-all'];
  for(const arm of arms){
   const role=CLASS_ROLES_V2[classId];
   const pool=arm==='mixed-role'?(role==='tank'?['stat_vitality','stat_iron','stat_ward','stat_elusive']:
     role==='damage'?['stat_might','stat_keen','stat_savage','stat_piercing','stat_potent','stat_precision']:
     ['stat_swift','stat_vitality','stat_ward','stat_iron']):arm==='mixed-all'?families:[arm];
   const sockets:V2GemSidecarState={slots:[],receipts:[]};
   for(const [i,instanceId] of qa.ids.entries()){
    const gemId=gemItemId(pool[i%pool.length],5);
    sockets.slots.push({instanceId,stat:{gemId,rollPercent:120}});
    sockets.receipts.push({requestId:'QA_FULL_SOCKET_'+i,fingerprint:'gem:'+instanceId+':'+gemId,instanceId,
     socket:'stat',gemId,source:'gem_pouch',rollPercent:120,burnedGemId:null,version:qa.source.ledgerRevision+i+1});
   }
   const out=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,sockets,policy);
   assert.equal(out.gemSources.length,n);
   assert.deepEqual(out.forgeEvidence,baseline.forgeEvidence);
   assert.equal(out.advanced.tenacityPp,baseline.advanced.tenacityPp);
   assert.equal(out.canExecuteCombat,false);assert.equal(out.cpApproved,false);
   const report=inspectSocketStackingCapReviewV2(out);
   const continuous=inspectSocketStackingCapReviewV2(out,SOCKET_CAP_DIMINISHING_V2);
   const gentle=inspectSocketStackingCapReviewV2(out,SOCKET_CAP_GENTLE_V2);
   const utility=reviewUtilityGemSemanticsV2(out);
   assert.equal(utility.sourceDigest,out.digest);
   assert.equal(utility.version,UTILITY_GEM_REVIEW_V2);
   assert.equal(utility.canExecuteCombat,false);assert.equal(utility.cpApproved,false);assert.equal(utility.releaseEnabled,false);
   assert.equal(utility.haste.baselineHaste,baselineUtility.haste.projectedHaste);
   assert.ok(utility.haste.incrementalGem>=0&&utility.haste.incrementalGem<=utility.haste.gem+1e-9);
   if(utility.haste.gem>0){assert.ok(utility.haste.incrementalGem>0);assert.ok(utility.haste.incrementalGem>utility.haste.historicalRelativeGem);}
   for(const [i,c] of utility.potency.entries()){
    assert.equal(c.baseline,baselineUtility.potency[i].effective);
    assert.ok(c.incrementalGem>=0&&c.incrementalGem<=c.gem+1e-9);
    if(c.gem>0)assert.ok(c.incrementalGem>0);
   }
   if(arm==='stat_swift')assert.ok(utility.potency.every(c=>c.incrementalGem===0));
   if(arm==='stat_potent')assert.equal(utility.haste.incrementalGem,0);
   assert.equal(continuous.socketCount,n);assert.equal(gentle.socketCount,n);
   for(const [i,c] of gentle.channels.entries()){
    const prior=continuous.channels[i];
    assert.equal(c.raw,prior.raw);assert.equal(c.affix,prior.affix);assert.equal(c.gem,prior.gem);
    assert.equal(c.hard,null);
    assert.ok(c.effective>=prior.effective-1e-9&&c.effective<=c.raw+1e-9);
    assert.ok(c.incrementalGem>=prior.incrementalGem-1e-9&&c.incrementalGem<=c.gem+1e-9);
    if(c.gem>0)assert.ok(c.incrementalGem>0);
    const key=c.key as SocketStackLaneV2;
    assert.equal(diminishingSocketContributionV2(key,c.knee,SOCKET_CAP_GENTLE_V2),c.knee);
    let last=0,lastGain=Infinity;
    for(let step=1;step<=400;step++){
     const raw=step*.025,next=diminishingSocketContributionV2(key,raw,SOCKET_CAP_GENTLE_V2),gain=next-last;
     assert.ok(next>=diminishingSocketContributionV2(key,raw)-1e-12);
     assert.ok(gain>0&&gain<=lastGain+1e-12);
     if(key==='ward:percent'||key.endsWith(':percentage_point'))assert.ok(next<1);
     last=next;lastGain=gain;
    }
   }
   for(const [i,c] of continuous.channels.entries()){
    const prior=report.channels[i];
    assert.equal(c.raw,prior.raw);assert.equal(c.affix,prior.affix);assert.equal(c.gem,prior.gem);
    assert.equal(c.hard,null);
    assert.ok(c.effective<=c.raw+1e-9&&c.incrementalGem>=0&&c.incrementalGem<=c.gem+1e-9);
    if(c.gem>0)assert.ok(c.incrementalGem>0,'every additional gem must retain value');
    const key=c.key as SocketStackLaneV2;
    assert.equal(diminishingSocketContributionV2(key,c.knee),c.knee);
    // Strict monotonicity, decreasing marginal gains, no finite plateau
    // including well beyond the previous hard-cap thresholds.
    let last=diminishingSocketContributionV2(key,0),lastGain=Infinity;
    for(let step=1;step<=400;step++){
     const next=diminishingSocketContributionV2(key,step*.025),gain=next-last;
     assert.ok(gain>0&&gain<=lastGain+1e-12);
     if(key==='ward:percent'||key.endsWith(':percentage_point'))assert.ok(next<1);
     last=next;lastGain=gain;
    }
   }
   assert.equal(report.socketCount,n);assert.equal(report.wornSlots,n);
   for(const c of report.channels){
    assert.ok(c.hard!==null&&c.effective<=c.raw+1e-9&&c.effective<=c.hard+1e-9);
    assert.ok(c.incrementalGem>=0&&c.incrementalGem<=c.gem+1e-9);
    const expected=out.gemSources.filter(g=>g.stat+':'+g.unit===c.key).reduce((a,g)=>a+g.fraction,0);
    assert.ok(Math.abs(c.gem-expected)<1e-8);
   }
   if(families.includes(arm)){
    const def=STAT_GEMS_REVIEW_V2.find(d=>d.familyId===arm)!;
    const c=report.channels.find(c=>c.key===def.stat+':'+def.unit)!;
    assert.ok(Math.abs(c.gem-n*def.values[5]*1.2)<1e-8);
    assert.equal(report.channels.filter(c=>c.gem>0).length,1);
   }
   if(families.includes(arm)&&arm!=='stat_potent')statCombatRows.push({classId,spec,arm,result:fight(out)});
   if(arm==='stat_potent'||arm==='mixed-role'||arm==='mixed-all')potentCombatRows.push({classId,spec,arm,result:potentFight(out)});
   rows.push({classId,spec,slots:n,arm,channels:report.channels,diminishing:continuous.channels,gentle:gentle.channels,utility,
    hasteDelta:out.stats.haste-baseline.stats.haste,attackDelta:out.stats.attackPower-baseline.stats.attackPower});
  }
  assert.equal(JSON.stringify(source.items),original);
 }
 assert.equal(rows.length,18*13);
 assert.equal(statCombatRows.length,18*10);
 assert.equal(potentCombatRows.length,18*3);
 assert.ok(potentCombatRows.every(r=>r.result.boundaryCases===6));
 console.log('POTENT_AUTHORED_COMBAT_REVIEW '+JSON.stringify({cases:potentCombatRows.length,
  scope:'PRIVATE_AUTHORED_COEFFICIENT_SENSITIVITY_ONLY',boundaryCases:potentCombatRows.reduce((n,r)=>n+r.result.boundaryCases,0),
  lanes:[...new Set(potentCombatRows.flatMap(r=>r.result.potentRows.map(x=>x.lane)))],
  arms:['stat_potent','mixed-role','mixed-all'].map(arm=>{const a=potentCombatRows.filter(r=>r.arm===arm);return {arm,cases:a.length,
   meanDamageDelta:a.reduce((n,r)=>n+r.result.candidate.damage-r.result.baseline.damage,0)/a.length,
   meanHealingDelta:a.reduce((n,r)=>n+r.result.candidate.healing-r.result.baseline.healing,0)/a.length,
   outputTotals:Object.fromEntries(['damage','dot_tick','heal','hot_tick','shield'].map(kind=>[kind,{
    baseline:a.reduce((n,r)=>n+(r.result.authoredOutputs.baseline[kind]??0),0),
    candidate:a.reduce((n,r)=>n+(r.result.authoredOutputs.candidate[kind]??0),0)}]))};}),
  releaseEnabled:false,cpApproved:false}));
 console.log('GENTLE_STAT_GEM_COMBAT_REVIEW '+JSON.stringify({cases:statCombatRows.length,scope:'PRIVATE_STATIC_GEM_COMBAT_ONLY',
  boss:'BOSS_EXP_BELLBEAST',durationMs:15000,excluded:['stat_potent','effect_gems'],
  families:families.filter(f=>f!=='stat_potent').map(f=>{const a=statCombatRows.filter(r=>r.arm===f);return {family:f,cases:a.length,
   meanDamageDelta:a.reduce((n,r)=>n+r.result.candidate.damage-r.result.baseline.damage,0)/a.length,
   meanDamageTakenDelta:a.reduce((n,r)=>n+r.result.candidate.damageTaken-r.result.baseline.damageTaken,0)/a.length,
   meanHealingDelta:a.reduce((n,r)=>n+r.result.candidate.healing-r.result.baseline.healing,0)/a.length,
   lostVictories:a.filter(r=>r.result.baseline.victory&&!r.result.candidate.victory).length};}),
  releaseEnabled:false,cpApproved:false}));
 console.log('FULL_FORGE_SOCKET_STACK_CALIBRATION '+JSON.stringify({scope:'CANDIDATE_SHARED_CAP_DIAGNOSTIC_ONLY',
  cases:rows.length,coverage,byFamily:families.map(family=>{
   const a=rows.filter(r=>r.arm===family);
   const c=a.map(r=>r.channels.find(c=>c.gem>0)!);
   return {family,cases:a.length,minRaw:Math.min(...c.map(x=>x.gem)),maxRaw:Math.max(...c.map(x=>x.gem)),
    reduced:c.filter(x=>x.incrementalGem<x.gem-1e-9).length,
    minIncremental:Math.min(...c.map(x=>x.incrementalGem)),maxIncremental:Math.max(...c.map(x=>x.incrementalGem))};
  }),continuousPolicy:SOCKET_CAP_DIMINISHING_V2,continuousByFamily:families.map(family=>{
   const a=rows.filter(r=>r.arm===family);
   const c=a.map(r=>r.diminishing.find(c=>c.gem>0)!);
   const old=a.map(r=>r.channels.find(c=>c.gem>0)!);
   return {family,cases:a.length,minIncremental:Math.min(...c.map(x=>x.incrementalGem)),
    maxIncremental:Math.max(...c.map(x=>x.incrementalGem)),
    meanRetained:c.reduce((n,x)=>n+x.incrementalGem/x.gem,0)/c.length,
    previousMeanRetained:old.reduce((n,x)=>n+x.incrementalGem/x.gem,0)/old.length};
  }),gentlePolicy:SOCKET_CAP_GENTLE_V2,gentleByFamily:families.map(family=>{
   const a=rows.filter(r=>r.arm===family);
   const c=a.map(r=>r.gentle.find(c=>c.gem>0)!);
   const old=a.map(r=>r.diminishing.find(c=>c.gem>0)!);
   return {family,cases:a.length,minIncremental:Math.min(...c.map(x=>x.incrementalGem)),
    maxIncremental:Math.max(...c.map(x=>x.incrementalGem)),
    meanRetained:c.reduce((n,x)=>n+x.incrementalGem/x.gem,0)/c.length,
    previousMeanRetained:old.reduce((n,x)=>n+x.incrementalGem/x.gem,0)/old.length};
  }),swiftDelta:rows.filter(r=>r.arm==='stat_swift').map(r=>({classId:r.classId,spec:r.spec,delta:r.hasteDelta})),
  cpApproved:false,releaseEnabled:false}));
 const swift=rows.filter(r=>r.arm==='stat_swift'),potent=rows.filter(r=>r.arm==='stat_potent');
 console.log('UTILITY_GEM_SEMANTICS_CALIBRATION '+JSON.stringify({policy:UTILITY_GEM_REVIEW_V2,cases:rows.length,
  swift:swift.map(r=>({classId:r.classId,spec:r.spec,raw:r.utility.haste.gem,
   old:r.utility.haste.historicalRelativeGem,next:r.utility.haste.incrementalGem})),
  potent:potent[0].utility.potency.map((c,i)=>({scope:c.scope,
   min:Math.min(...potent.map(r=>r.utility.potency[i].incrementalGem)),
   max:Math.max(...potent.map(r=>r.utility.potency[i].incrementalGem))})),
  requiresMigrationApproval:true,cpApproved:false,releaseEnabled:false}));
}
// Stronger fresh party pressure, full-range action RNG, original exact
// Forge source copies. No set effects or live party authorization.
{
 const policy:ForgeSocketReviewPolicyV2={version:'QA_GENTLE_PARTY_GEMS_V2',gemBalancePolicy:GEM_BALANCE_REVIEW_V2,
  mechanicsReview:{version:FORGE_SOCKET_MECHANICS_REVIEW_V2,maxFinalAttackPower:1e8},
  maxFinalHp:1e8,maxFinalDefense:1e8};
 const parties:ClassIdV2[][]=[['IRONWARDEN','WAYFINDER','HEXWEAVER','STONECALLER'],
  ['BASTION','RAVAGER','KNIFE_DANCER','DAWNKEEPER'],['DREADGUARD','HEXWEAVER','RAVAGER','STONECALLER']];
 const arms=['stat_precision','stat_elusive','stat_potent','mixed-role'];
 const originalEffectFamilies=['effect_execution','effect_opening_strike','effect_predator'];
 const stackEffectFamilies=['effect_momentum','effect_critical_surge','effect_flow'];
 const conditionalEffectFamilies=['effect_ruin','effect_opportunist','effect_retaliation'];
 const effectFamilies=[...originalEffectFamilies,...stackEffectFamilies,...conditionalEffectFamilies];
  const defensiveEffectFamilies=['effect_unyielding','effect_last_stand','effect_guardians_gift'];
  const newSupportFamilies=['effect_aegis','effect_mercy','effect_renewal','effect_benediction','effect_shared_resolve'];
  const hybridFamilies=['effect_sustenance','effect_battle_rhythm'];
 const profiles=[{id:'BOSS_EXP_SPHINX',name:'The Veiled Sphinx',region:'sunscar' as const,tier:3 as const,level:40},
  {id:'BOSS_EXP_BELLBEAST',name:'The Bellbeast of Shiverlake',region:'frostmarch' as const,tier:4 as const,level:60}];
 const rows:{classId:ClassIdV2;spec:number;arm:string;boss:string;seed:number;result:ReturnType<ReturnType<typeof createGentleGemPartyPressureReviewV2>>}[]=[];
 const effectRows:{family:string;rank:number;classId:ClassIdV2;spec:number;boss:string;seed:number;result:ReturnType<ReturnType<typeof createGentleGemPartyPressureReviewV2>>}[]=[];
 let baseEncounters=0;
 const mixedRows:{classId:ClassIdV2;spec:number;boss:string;seed:number;mix:string;pressure:string;result:ReturnType<ReturnType<typeof createGentleGemPartyPressureReviewV2>>}[]=[];
 for(const profile of profiles){
  const level=profile.level;
  const fixtures=new Map<ClassIdV2,ReturnType<typeof makeV21Loadout>[]>();
  for(const id of Object.keys(CLASS_NAMES_V2) as ClassIdV2[])fixtures.set(id,[makeV21Loadout(id,0,profile.tier,level),makeV21Loadout(id,1,profile.tier,level)]);
  // One fixed pressure reference per boss across all compositions, never
  // rescaled to the socket variant or selected party.
  const reference=[...fixtures.values()].flat().map(x=>compileRealFrozenForgeActorV2(x.actor,x.build,x.source).actor);
  const meanHp=reference.reduce((n,x)=>n+x.stats.maxHp,0)/reference.length;
  const meanAttack=reference.reduce((n,x)=>n+x.stats.attackPower,0)/reference.length;
  const enemy={...boss,id:profile.id,name:profile.name,level,
   stats:{...boss.stats,maxHp:Math.round(meanAttack*4*30),attackPower:Math.round(meanHp*.30)}};
  for(const [partyIndex,ids] of parties.entries())for(const spec of [0,1] as const){
   const members=ids.map(classId=>{
    const qa=fixtures.get(classId)![spec];
    const chosen=selectReviewSkillLoadoutV2(classId,qa.build.selected.specializationId!,qa.actor,profile.id,'targeted');
    const build={...qa.build,selected:{...qa.build.selected,activeSkills:chosen.activeSkills}};
    const revision=qa.source.ledgerRevision+qa.ids.length;
    const source={...qa.source,ledgerRevision:revision,verifyPersisted:(d:string,r:number)=>r===revision&&/^[a-f0-9]{64}$/.test(d)};
    const compiled=compileRealFrozenForgeActorV2(qa.actor,build,source);
    const baseline=reviewFrozenForgeSocketsV2(qa.actor,build,source,{slots:[],receipts:[]},policy);
    const variants=arms.map(arm=>{
     const role=CLASS_ROLES_V2[classId];
     const pool=arm==='mixed-role'?(role==='tank'?['stat_vitality','stat_iron','stat_ward','stat_elusive']:
      role==='damage'?['stat_might','stat_keen','stat_savage','stat_piercing','stat_potent','stat_precision']:
      ['stat_swift','stat_potent','stat_vitality','stat_ward']):[arm];
     const sockets:V2GemSidecarState={slots:[],receipts:[]};
     for(const [i,instanceId] of qa.ids.entries()){
      const gemId=gemItemId(pool[i%pool.length],5);
      sockets.slots.push({instanceId,stat:{gemId,rollPercent:120}});
      sockets.receipts.push({requestId:'QA_PARTY_GEM_'+i,fingerprint:'gem:'+instanceId+':'+gemId,instanceId,
       socket:'stat',gemId,source:'gem_pouch',rollPercent:120,burnedGemId:null,version:qa.source.ledgerRevision+i+1});
     }
     return reviewFrozenForgeSocketsV2(qa.actor,build,source,sockets,policy);
    });
    const selectedEffectFamilies=CLASS_ROLES_V2[classId]==='damage'?[...effectFamilies.filter(f=>f!=='effect_retaliation'),...hybridFamilies]:
     CLASS_ROLES_V2[classId]==='tank'?['effect_retaliation','effect_unyielding','effect_last_stand','effect_bulwark']:['effect_guardians_gift',...newSupportFamilies];
    const effects=selectedEffectFamilies.flatMap(family=>[1,2,3].map(rank=>{
     const sockets:V2GemSidecarState={slots:[],receipts:[]};
     for(let i=0;i<rank;i++){
      const instanceId=qa.ids[i],gemId=gemItemId(family,5);
      sockets.slots.push({instanceId,effect:{gemId,rollPercent:120}});
      sockets.receipts.push({requestId:'QA_PARTY_EFFECT_'+i,fingerprint:'gem:'+instanceId+':'+gemId,instanceId,
       socket:'effect',gemId,source:'gem_pouch',rollPercent:120,burnedGemId:null,version:qa.source.ledgerRevision+i+1});
     }
     return {family,rank,projection:reviewFrozenForgeSocketsV2(qa.actor,build,source,sockets,policy)};
    }));
    const role=CLASS_ROLES_V2[classId];
    const mixes=role==='tank'?
     [['effect_unyielding','effect_last_stand','effect_bulwark'],['effect_retaliation','effect_bulwark','effect_sustenance']]:
     role==='damage'?[['effect_execution','effect_momentum','effect_predator'],['effect_flow','effect_battle_rhythm','effect_opportunist']]:
     [['effect_aegis','effect_mercy','effect_renewal'],['effect_benediction','effect_shared_resolve','effect_guardians_gift']];
    const mixed=mixes.flatMap(families=>[1,2,3].filter(rank=>families.length*rank<=qa.ids.length).map(rank=>{
     const sockets:V2GemSidecarState={slots:[],receipts:[]};
     for(const [i,family] of families.flatMap(f=>Array.from({length:rank},()=>f)).entries()){
      const instanceId=qa.ids[i],gemId=gemItemId(family,5);
      sockets.slots.push({instanceId,effect:{gemId,rollPercent:120}});
      sockets.receipts.push({requestId:'QA_PARTY_MIX_'+i,fingerprint:'gem:'+instanceId+':'+gemId,instanceId,
       socket:'effect',gemId,source:'gem_pouch',rollPercent:120,burnedGemId:null,version:qa.source.ledgerRevision+i+1});
     }
     const projection=reviewFrozenForgeSocketsV2(qa.actor,build,source,sockets,policy);
     assert.equal(projection.effectResonanceReview!.families.length,3);
     assert.equal(projection.effectResonanceReview!.copyCount,rank*3);
     return {mix:families.join('+')+'@'+rank,rank,projection};
    }));
    assert.ok(mixed.length>=4);
    return {classId,accountId:source.accountId,characterId:source.characterId,revision,compiled,baseline,variants,effects,mixed};
   });
   for(const seed of [0,1]){
    const fight=createGentleGemPartyPressureReviewV2(members,{region:profile.region,tier:profile.tier,enemy},
     [profile.id,partyIndex,spec,seed].join('_'));
    baseEncounters++;
    for(const [i,member] of members.entries())for(const [j,arm] of arms.entries())
     rows.push({classId:member.classId,spec,arm,boss:profile.id,seed,result:fight(i,member.variants[j],seed===0&&j===0)});
    // One varied damage wearer per baseline, alternating the two damage
    // slots by specialization. No static gem or trait overlays.
    const i=1+spec,member=members[i];
    for(const arm of member.effects)effectRows.push({family:arm.family,rank:arm.rank,classId:member.classId,spec,
     boss:profile.id,seed,result:fight(i,arm.projection,seed===0&&arm.rank===3)});
    for(const arm of members[0].effects)effectRows.push({family:arm.family,rank:arm.rank,classId:members[0].classId,spec,
     boss:profile.id,seed,result:fight(0,arm.projection,seed===0&&arm.rank===3)});
    for(const arm of members[3].effects)effectRows.push({family:arm.family,rank:arm.rank,classId:members[3].classId,spec,
     boss:profile.id,seed,result:fight(3,arm.projection,seed===0&&arm.rank===3)});
    for(const [i,member] of members.entries())for(const arm of member.mixed)
     mixedRows.push({classId:member.classId,spec,boss:profile.id,seed,mix:arm.mix,pressure:'standard',result:fight(i,arm.projection,seed===0&&arm.rank===3)});
    // Fixed pressure across compared socket builds. Reuse identical authored
    // enemy and seed; only attack changes for this distinct pressure band.
    for(const [pressure,factor] of [['low',.8],['high',1.25]] as const){
     const pressured={...enemy,stats:{...enemy.stats,attackPower:Math.round(enemy.stats.attackPower*factor)}};
     const pressureFight=createGentleGemPartyPressureReviewV2(members,{region:profile.region,tier:profile.tier,enemy:pressured},
      [profile.id,partyIndex,spec,seed].join('_'));
     for(const [i,member] of members.entries()){
      const arm=member.mixed.find(x=>x.rank===2)!;
      mixedRows.push({classId:member.classId,spec,boss:profile.id,seed,mix:arm.mix,pressure,result:pressureFight(i,arm.projection,seed===0)});
     }
    }
   }
  }
 }
 assert.equal(baseEncounters,24);assert.equal(rows.length,384);
 assert.equal(effectRows.length,1440);
 assert.ok(effectRows.filter(r=>r.family==='effect_opening_strike'||r.family==='effect_predator').every(r=>r.result.triggerCount>0));
 console.log('PRIVATE_DAMAGE_GEM_COMBAT_REVIEW '+JSON.stringify({cases:effectRows.filter(r=>originalEffectFamilies.includes(r.family)).length,baseEncounters,
  scope:'THREE_EFFECT_FAMILY_EXECUTABLE_QA',byFamilyRank:originalEffectFamilies.flatMap(family=>[1,2,3].map(rank=>{
   const a=effectRows.filter(r=>r.family===family&&r.rank===rank);return {family,rank,cases:a.length,
    activeEncounters:a.filter(r=>r.result.triggerCount>0).length,triggers:a.reduce((n,r)=>n+r.result.triggerCount,0),
    maxFraction:Math.max(...a.map(r=>r.result.maxFraction)),meanDpsDelta:a.reduce((n,r)=>n+r.result.after.dps-r.result.before.dps,0)/a.length,
    lostVictories:a.filter(r=>r.result.before.victory>r.result.after.victory).length};})),releaseEnabled:false,cpApproved:false}));
 const stackRows=effectRows.filter(r=>stackEffectFamilies.includes(r.family));
 assert.equal(stackRows.length,216);
 console.log('PRIVATE_STACK_GEM_COMBAT_REVIEW '+JSON.stringify({cases:stackRows.length,baseEncounters,
  scope:'THREE_STACK_FAMILY_EXECUTABLE_QA',byFamilyRank:stackEffectFamilies.flatMap(family=>[1,2,3].map(rank=>{
   const a=stackRows.filter(r=>r.family===family&&r.rank===rank);return {family,rank,cases:a.length,
    activeEncounters:a.filter(r=>r.result.stackTriggers>0).length,
    stackTriggers:a.reduce((n,r)=>n+r.result.stackTriggers,0),hasteUses:a.reduce((n,r)=>n+r.result.hasteUses,0),
    maxStacks:Math.max(...a.map(r=>r.result.maxStacks)),maxFraction:Math.max(...a.map(r=>r.result.maxFraction)),
    meanDpsDelta:a.reduce((n,r)=>n+r.result.after.dps-r.result.before.dps,0)/a.length,
    lostVictories:a.filter(r=>r.result.before.victory>r.result.after.victory).length};})),releaseEnabled:false,cpApproved:false}));
 const conditionalRows=effectRows.filter(r=>conditionalEffectFamilies.includes(r.family));
 assert.equal(conditionalRows.length,216);
 console.log('PRIVATE_CONDITIONAL_GEM_COMBAT_REVIEW '+JSON.stringify({cases:conditionalRows.length,baseEncounters,
  scope:'THREE_CONDITIONAL_FAMILY_EXECUTABLE_QA',byFamilyRank:conditionalEffectFamilies.flatMap(family=>[1,2,3].map(rank=>{
   const a=conditionalRows.filter(r=>r.family===family&&r.rank===rank);return {family,rank,cases:a.length,
    activeEncounters:a.filter(r=>r.result.triggerCount>0).length,
    triggers:a.reduce((n,r)=>n+r.result.triggerCount,0),armed:a.reduce((n,r)=>n+r.result.armed,0),
    recoveryEvents:a.reduce((n,r)=>n+r.result.recoveryEvents,0),
    maxFraction:Math.max(...a.map(r=>r.result.maxFraction)),meanDpsDelta:a.reduce((n,r)=>n+r.result.after.dps-r.result.before.dps,0)/a.length,
    lostVictories:a.filter(r=>r.result.before.victory>r.result.after.victory).length};})),releaseEnabled:false,cpApproved:false}));
 const defenseRows=effectRows.filter(r=>defensiveEffectFamilies.includes(r.family));
 assert.equal(defenseRows.length,216);
 console.log('PRIVATE_DEFENSIVE_GEM_COMBAT_REVIEW '+JSON.stringify({cases:defenseRows.length,baseEncounters,
  scope:'THREE_DEFENSIVE_FAMILY_EXECUTABLE_QA',byFamilyRank:defensiveEffectFamilies.flatMap(family=>[1,2,3].map(rank=>{
   const a=defenseRows.filter(r=>r.family===family&&r.rank===rank);assert.equal(a.length,24);
   return {family,rank,cases:a.length,activeEncounters:a.filter(r=>r.result.defenseEarned>0).length,
    earned:a.reduce((n,r)=>n+r.result.defenseEarned,0),uses:a.reduce((n,r)=>n+r.result.defenseUses,0),
    meanDamageTakenDelta:a.reduce((n,r)=>n+r.result.after.damageTaken-r.result.before.damageTaken,0)/a.length,
    meanHpFractionDelta:a.reduce((n,r)=>n+r.result.after.hpFraction-r.result.before.hpFraction,0)/a.length,
    lostVictories:a.filter(r=>r.result.before.victory>r.result.after.victory).length};})),releaseEnabled:false,cpApproved:false}));
 const supportRows=effectRows.filter(r=>r.family==='effect_bulwark'||newSupportFamilies.includes(r.family));
 assert.equal(supportRows.length,432);
 console.log('PRIVATE_SUPPORT_GEM_COMBAT_REVIEW '+JSON.stringify({cases:supportRows.length,baseEncounters,
  scope:'SIX_FAMILY_PARTIAL_OR_EXECUTABLE_QA',byFamilyRank:['effect_bulwark',...newSupportFamilies].flatMap(family=>[1,2,3].map(rank=>{
   const a=supportRows.filter(r=>r.family===family&&r.rank===rank);assert.equal(a.length,24);
   return {family,rank,cases:a.length,activeEncounters:a.filter(r=>r.result.supportEvents+r.result.lifecycleEvents+r.result.defenseEarned>0).length,
    supportEvents:a.reduce((n,r)=>n+r.result.supportEvents,0),lifecycleEvents:a.reduce((n,r)=>n+r.result.lifecycleEvents,0),
    terminalHeals:a.reduce((n,r)=>n+r.result.terminalHeals,0),defenseEarned:a.reduce((n,r)=>n+r.result.defenseEarned,0),
    meanHpsDelta:a.reduce((n,r)=>n+r.result.after.hps-r.result.before.hps,0)/a.length,
    meanShieldDelta:a.reduce((n,r)=>n+r.result.after.shield-r.result.before.shield,0)/a.length,
    lostVictories:a.filter(r=>r.result.before.victory>r.result.after.victory).length};})),releaseEnabled:false,cpApproved:false}));
 const hybridRows=effectRows.filter(r=>hybridFamilies.includes(r.family));
 assert.equal(hybridRows.length,144);
 console.log('PRIVATE_HYBRID_GEM_COMBAT_REVIEW '+JSON.stringify({cases:hybridRows.length,byFamilyRank:hybridFamilies.flatMap(family=>[1,2,3].map(rank=>{
  const a=hybridRows.filter(r=>r.family===family&&r.rank===rank);assert.equal(a.length,24);
  return {family,rank,cases:a.length,activeEncounters:a.filter(r=>r.result.hybridEvents>0).length,
   rhythmActivations:a.reduce((n,r)=>n+r.result.rhythmActivations,0),sustenanceKills:a.reduce((n,r)=>n+r.result.sustenanceKills,0),
   lostVictories:a.filter(r=>r.result.before.victory>r.result.after.victory).length};})),releaseEnabled:false,cpApproved:false}));
 const standard=mixedRows.filter(r=>r.pressure==='standard');
 const pressureRows=mixedRows.filter(r=>r.pressure!=='standard');
 assert.ok(standard.length>=384&&standard.length<=576);assert.equal(pressureRows.length,192);
 const classKeys=[...new Set(mixedRows.map(r=>r.classId+'|'+r.spec+'|'+r.pressure))].sort();
 assert.equal(new Set(mixedRows.map(r=>r.classId)).size,9);
 assert.equal(classKeys.length,54);
 const mean=(values:number[])=>values.reduce((n,v)=>n+v,0)/values.length;
 console.log('PRIVATE_MIXED_GEM_ROLE_PRESSURE_REVIEW '+JSON.stringify({cases:mixedRows.length,standard:standard.length,pressure:pressureRows.length,
  classSpecPressure:classKeys.map(key=>{
   const a=mixedRows.filter(r=>r.classId+'|'+r.spec+'|'+r.pressure===key);
   return {key,role:CLASS_ROLES_V2[a[0].classId],cases:a.length,
    baselineDps:mean(a.map(r=>r.result.before.dps)),candidateDps:mean(a.map(r=>r.result.after.dps)),
    baselineHps:mean(a.map(r=>r.result.before.hps)),candidateHps:mean(a.map(r=>r.result.after.hps)),
    meanShieldDelta:mean(a.map(r=>r.result.after.shield-r.result.before.shield)),
    meanHpFractionDelta:mean(a.map(r=>r.result.after.hpFraction-r.result.before.hpFraction)),
    meanDamageTakenDelta:mean(a.map(r=>r.result.after.damageTaken-r.result.before.damageTaken)),
    lostVictories:a.filter(r=>r.result.before.victory>r.result.after.victory).length,
    gainedVictories:a.filter(r=>r.result.before.victory<r.result.after.victory).length,
    wearerDowns:a.filter(r=>!r.result.after.alive).length,
    partyDownDelta:a.reduce((n,r)=>n+r.result.before.partyAlive-r.result.after.partyAlive,0)};}),
  releaseEnabled:false,cpApproved:false}));
 const groups=new Map<string,typeof rows>();
 for(const r of rows){const k=CLASS_ROLES_V2[r.classId]+'|'+r.arm;groups.set(k,[...(groups.get(k)??[]),r]);}
 console.log('GENTLE_GEM_PARTY_PRESSURE_REVIEW '+JSON.stringify({cases:rows.length,baseEncounters,seedCount:2,
  bosses:profiles.map(p=>p.id),classes:new Set(rows.map(r=>r.classId)).size,scope:'PRIVATE_FULL_RANGE_PARTY_GEM_SENSITIVITY',
  byRoleArm:Object.fromEntries([...groups].map(([key,a])=>[key,{cases:a.length,
   meanDpsDelta:a.reduce((n,r)=>n+r.result.after.dps-r.result.before.dps,0)/a.length,
   meanHpsDelta:a.reduce((n,r)=>n+r.result.after.hps-r.result.before.hps,0)/a.length,
   meanDamageTakenDelta:a.reduce((n,r)=>n+r.result.after.damageTaken-r.result.before.damageTaken,0)/a.length,
   meanShieldDelta:a.reduce((n,r)=>n+r.result.after.shield-r.result.before.shield,0)/a.length,
   critDelta:a.reduce((n,r)=>n+r.result.after.crits-r.result.before.crits,0),
   missDelta:a.reduce((n,r)=>n+r.result.after.misses-r.result.before.misses,0),
   survivorGains:a.filter(r=>r.result.after.partyAlive>r.result.before.partyAlive).length,
   survivorLosses:a.filter(r=>r.result.after.partyAlive<r.result.before.partyAlive).length,
   lostVictories:a.filter(r=>r.result.before.victory>r.result.after.victory).length}])),
  releaseEnabled:false,cpApproved:false}));
}
// Fail-fast source audit independent of the longer combat matrix.
runRegionalProgressionReviewV2();
// Midpoint and region-entry pressure, independently frozen normal/elite
// enemy reference and authentic compact class + Forge build. Compare the
// same character level before/after a pressure step, then the intended
// equipment upgrade at the same pressure. No release-facing coefficients.
{
 const comparisons:{level:number;classId:ClassIdV2;spec:number;kind:string;seed:number;priorTier:number;nextTier:number;
  before:{win:number;hp:number;enemyHp:number;duration:number};pressure:{win:number;hp:number;enemyHp:number;duration:number};
  upgrade:{win:number;hp:number;enemyHp:number;duration:number}}[]=[];
 for(const level of [13,26,38,51,63]){
  const prior=regionalProgressionAtV2(level-1),next=regionalProgressionAtV2(level);
  if(!next.regionLaunchEligible||next.region==='region4'||prior.expectedTier===5||next.expectedTier===5)throw Error('region_review_scope');
  const previousPressure=regionalPressureReviewV2(level-1),nextPressure=regionalPressureReviewV2(level);
  const oldTier=prior.expectedTier,newTier=next.expectedTier;
  const region=next.region as 'asterfall'|'sunscar'|'frostmarch';
  const enemyTier=Math.max(2,newTier) as 2|3|4;
  const k=30+2*level;
  const all=Object.keys(CLASS_NAMES_V2) as ClassIdV2[];
  const compile=(classId:ClassIdV2,spec:0|1,tier:1|2|3|4)=>{
   const qa=makeV21Loadout(classId,spec,tier,level);
   const classProfile=qa.source.classBaselinePolicy.profiles[classId]!;
   const source={...qa.source,classBaselinePolicy:{version:'QA_COMPACT_REGION_STEP_20261127',profiles:{
    [classId]:{...classProfile,maxLevel:100,statsAtLevel:(n:number)=>compactUnifiedStatsV2(classId,n)}}}};
   return compileRealFrozenForgeActorV2(qa.actor,qa.build,source).actor;
  };
  const builds=all.flatMap(classId=>([0,1] as const).map(spec=>({classId,spec,
   old:compile(classId,spec,oldTier),next:oldTier===newTier?undefined:compile(classId,spec,newTier)})));
  const meanHp=builds.reduce((n,x)=>n+x.old.stats.maxHp,0)/builds.length;
  const meanAttack=builds.reduce((n,x)=>n+x.old.stats.attackPower,0)/builds.length;
  const base={hp:meanAttack*16,attack:meanHp*.085,defense:k*.35};
  for(const row of builds)for(const kind of ['normal','elite'] as const)for(const seedIndex of [0,1]){
   const seed=['QA_REGION_STEP',level,row.classId,row.spec,kind,seedIndex].join('_');
   const id='QA_REGION_STEP_ENEMY';
   const enemy=(p:ReturnType<typeof regionalPressureReviewV2>):CombatantDefinition=>({...boss,
    id,name:'Regional pressure fixture',level,boss:false,phases:undefined,abilities:[],
    stats:{...boss.stats,maxHp:Math.round(base.hp*p.hp*(kind==='elite'?1.5:1)),
     attackPower:Math.round(base.attack*p.attack*(kind==='elite'?1.2:1)),
     defense:Math.round(base.defense*p.defense)}});
   const run=(actor:CombatantDefinition,foe:CombatantDefinition)=>{
    const proposed=prepareSoloEnemyKitsV2([foe],{ruleset:ENEMY_V2_RULESET,region,equipmentTier:enemyTier,
     encounterId:seed,serverSeed:seed,eliteEnemyIds:kind==='elite'?[id]:[]});
    const persisted={...proposed,source:'server-persisted-v2' as const,revision:6};
    const verified=verifyPersistedEnemyKitsV2([foe],persisted);
    const input:CombatInput={seed,players:[actor],enemies:[...verified.enemies],maxDurationMs:30000,mitigationConstant:k};
    const scope={source:'server-persisted-v2' as const,version:2 as const,ruleset:persisted.ruleset,
     mode:'solo' as const,encounterId:persisted.encounterId,revision:persisted.revision,seed:persisted.seed,
     playerIds:[actor.id],enemyIds:persisted.enemyIds,bossIds:persisted.bossIds};
    const result=simulateCombat(input,issueEnemyV2EngineAuthority(scope,input,(_s,d)=>/^[a-f0-9]{64}$/.test(d)));
    assert.ok(result.players[0].hp>=0&&result.players[0].hp<=actor.stats.maxHp+1e-8);
    assert.ok(result.events.every(e=>e.amount===undefined||Number.isFinite(e.amount)));
    return {win:Number(result.victory),hp:result.players[0].hp/actor.stats.maxHp,
     enemyHp:result.enemies[0].hp/result.enemies[0].definition.stats.maxHp,duration:result.durationMs};
   };
   const pre=enemy(previousPressure),post=enemy(nextPressure);
   assert.ok(post.stats.maxHp>=pre.stats.maxHp&&post.stats.attackPower>=pre.stats.attackPower&&post.stats.defense>=pre.stats.defense);
   const before=run(row.old,pre),pressure=run(row.old,post),upgrade=row.next?run(row.next,post):pressure;
   if(seedIndex===0&&kind==='normal')assert.deepEqual(run(row.old,post),pressure);
   comparisons.push({level,classId:row.classId,spec:row.spec,kind,seed:seedIndex,priorTier:oldTier,nextTier:newTier,before,pressure,upgrade});
  }
 }
 assert.equal(comparisons.length,360);
 const keys=[...new Set(comparisons.map(r=>r.level+'|'+CLASS_ROLES_V2[r.classId]+'|'+r.kind))].sort();
 assert.equal(keys.length,30);
 const mean=(values:number[])=>values.reduce((n,v)=>n+v,0)/values.length;
 console.log('REGIONAL_STEP_COMBAT_REVIEW '+JSON.stringify({cases:comparisons.length,groups:keys.map(key=>{
  const rows=comparisons.filter(r=>r.level+'|'+CLASS_ROLES_V2[r.classId]+'|'+r.kind===key);
  return {key,cases:rows.length,priorTier:rows[0].priorTier,nextTier:rows[0].nextTier,
   beforeWins:rows.reduce((n,r)=>n+r.before.win,0),pressureWins:rows.reduce((n,r)=>n+r.pressure.win,0),
   upgradedWins:rows.reduce((n,r)=>n+r.upgrade.win,0),pressureHpDelta:mean(rows.map(r=>r.pressure.hp-r.before.hp)),
   upgradeHpDelta:mean(rows.map(r=>r.upgrade.hp-r.pressure.hp)),pressureEnemyHpDelta:mean(rows.map(r=>r.pressure.enemyHp-r.before.enemyHp)),
   upgradeEnemyHpDelta:mean(rows.map(r=>r.upgrade.enemyHp-r.pressure.enemyHp))};
 }),releaseEnabled:false,cpApproved:false}));
}
// Mechanics vs stats on identical compact Forge builds and fixed reference
// stats. 180 matched four-arm sets, no newly minted or live enemy definitions.
{
 const arms:RegionalMechanicArm[]=['reference','stats_only','mechanics_only','mixed'];
 const rows:{level:number;classId:ClassIdV2;spec:number;kind:string;arm:RegionalMechanicArm;win:number;hp:number;enemyHp:number;duration:number;cast:number;interrupt:number;dot:number;debuff:number;shield:number}[]=[];
 for(const level of [13,26,38,51,63]){
  const progression=regionalProgressionAtV2(level);
  if(progression.region==='region4'||progression.expectedTier===5)throw Error('regional_mechanics_scope');
  const tier=progression.expectedTier,region=progression.region,k=30+2*level;
  const builds=(Object.keys(CLASS_NAMES_V2) as ClassIdV2[]).flatMap(classId=>([0,1] as const).map(spec=>{
   const qa=makeV21Loadout(classId,spec,tier,level);
   const classProfile=qa.source.classBaselinePolicy.profiles[classId]!;
   const source={...qa.source,classBaselinePolicy:{version:'QA_COMPACT_REGION_MECHANICS',profiles:{
    [classId]:{...classProfile,maxLevel:100,statsAtLevel:(n:number)=>compactUnifiedStatsV2(classId,n)}}}};
   return {classId,spec,actor:compileRealFrozenForgeActorV2(qa.actor,qa.build,source).actor};
  }));
  const meanHp=builds.reduce((n,x)=>n+x.actor.stats.maxHp,0)/builds.length;
  const meanAttack=builds.reduce((n,x)=>n+x.actor.stats.attackPower,0)/builds.length;
  for(const row of builds)for(const kind of ['normal','elite'] as const){
   const seed=['QA_REGION_MECHANICS',level,row.classId,row.spec,kind].join('_');
   const id='QA_REGION_MECHANIC_ENEMY';
   let previousStats:CombatantDefinition['stats']|undefined;
   for(const arm of arms){
    const p=regionalMechanicPressureV2(level,arm);
    const base:CombatantDefinition={...boss,id,name:'Regional mechanics fixture',level,boss:false,
     phases:undefined,abilities:[],tags:[kind==='elite'?'pve:archetype:guardian':'pve:archetype:caster'],
     stats:{...boss.stats,maxHp:Math.round(meanAttack*10*p.hp*(kind==='elite'?1.5:1)),
      attackPower:Math.round(meanHp*.055*p.attack*(kind==='elite'?1.2:1)),defense:Math.round(k*.30*p.defense)}};
    const foe=regionalMechanicsV2(base,kind,arm==='mechanics_only'||arm==='mixed');
    assert.deepEqual(foe.stats,base.stats);
    assert.equal(base.abilities.length,0);
    if(arm==='reference')previousStats=foe.stats;
    if(arm==='mechanics_only')assert.deepEqual(foe.stats,previousStats);
    assert.ok(foe.abilities.length===((arm==='mechanics_only'||arm==='mixed')&&kind==='elite'?2:1));
    const proposed=prepareSoloEnemyKitsV2([foe],{ruleset:ENEMY_V2_RULESET,region,equipmentTier:Math.max(2,tier) as 2|3|4,
     encounterId:seed,serverSeed:seed,eliteEnemyIds:kind==='elite'?[id]:[]});
    const persisted={...proposed,source:'server-persisted-v2' as const,revision:6};
    const verified=verifyPersistedEnemyKitsV2([foe],persisted);
    const input:CombatInput={seed,players:[row.actor],enemies:[...verified.enemies],maxDurationMs:60000,mitigationConstant:k};
    const scope={source:'server-persisted-v2' as const,version:2 as const,ruleset:persisted.ruleset,
     mode:'solo' as const,encounterId:persisted.encounterId,revision:persisted.revision,seed:persisted.seed,
     playerIds:[row.actor.id],enemyIds:persisted.enemyIds,bossIds:persisted.bossIds};
    const run=()=>simulateCombat(input,issueEnemyV2EngineAuthority(scope,input,(_s,d)=>/^[a-f0-9]{64}$/.test(d)));
    const result=run();
    if(row.spec===0&&kind==='normal'&&arm==='mechanics_only')assert.deepEqual(run(),result);
    const own=result.events.filter(e=>e.actorId===id&&e.abilityId?.startsWith('QA_REGION_'));
    assert.ok(result.events.every(e=>e.amount===undefined||Number.isFinite(e.amount)));
    assert.ok(result.players[0].hp>=0&&result.players[0].hp<=row.actor.stats.maxHp+1e-8);
    rows.push({level,classId:row.classId,spec:row.spec,kind,arm,win:Number(result.victory),
     hp:result.players[0].hp/row.actor.stats.maxHp,enemyHp:result.enemies[0].hp/result.enemies[0].definition.stats.maxHp,
     duration:result.durationMs,cast:own.filter(e=>e.type==='cast_complete').length,
     interrupt:result.events.filter(e=>e.type==='interrupt'&&e.targetId===id).length,
     dot:own.filter(e=>e.type==='dot_tick').length,debuff:own.filter(e=>e.type==='status_apply'&&e.statusKind==='debuff').length,
     shield:own.filter(e=>e.type==='shield').length});
   }
  }
 }
 assert.equal(rows.length,720);
 const keys=[...new Set(rows.map(r=>r.level+'|'+CLASS_ROLES_V2[r.classId]+'|'+r.kind+'|'+r.arm))].sort();
 assert.equal(keys.length,120);
 const mean=(values:number[])=>values.reduce((n,v)=>n+v,0)/values.length;
 console.log('REGIONAL_MECHANICS_COMPARISON '+JSON.stringify({matchedSets:rows.length/4,executions:rows.length,groups:keys.map(key=>{
  const a=rows.filter(r=>r.level+'|'+CLASS_ROLES_V2[r.classId]+'|'+r.kind+'|'+r.arm===key);
  return {key,cases:a.length,wins:a.reduce((n,r)=>n+r.win,0),meanHp:mean(a.map(r=>r.hp)),meanEnemyHp:mean(a.map(r=>r.enemyHp)),
   meanDuration:mean(a.map(r=>r.duration)),casts:a.reduce((n,r)=>n+r.cast,0),interrupts:a.reduce((n,r)=>n+r.interrupt,0),
   dotTicks:a.reduce((n,r)=>n+r.dot,0),debuffs:a.reduce((n,r)=>n+r.debuff,0),shields:a.reduce((n,r)=>n+r.shield,0)};
 }),releaseEnabled:false,cpApproved:false}));
}
// Legal active-slot utilization and actual offensive/counter variants.
// Freeze the previous mixed pressure enemy reference on the ORIGINAL
// two-skill builds. No player-specific enemy scaling or coefficient changes.
{
 const arms:SoloReviewArm[]=['default_two','default_full','offensive_full','counter_full'];
 const rows:{level:number;classId:ClassIdV2;spec:number;kind:string;arm:SoloReviewArm;win:number;reason:string;hp:number;enemyHp:number;duration:number;damage:number;interrupts:number;cleanses:number;skills:readonly string[];counterAvailable:boolean}[]=[];
 for(const level of [13,26,38,51,63]){
  const progression=regionalProgressionAtV2(level);
  if(progression.region==='region4'||progression.expectedTier===5)throw Error('solo_counter_scope');
  const tier=progression.expectedTier,region=progression.region,k=30+2*level;
  const builds=(Object.keys(CLASS_NAMES_V2) as ClassIdV2[]).flatMap(classId=>([0,1] as const).map(spec=>{
   const qa=makeV21Loadout(classId,spec,tier,level);
   const classProfile=qa.source.classBaselinePolicy.profiles[classId]!;
   const source={...qa.source,classBaselinePolicy:{version:'QA_COMPACT_REGION_MECHANICS',profiles:{
    [classId]:{...classProfile,maxLevel:100,statsAtLevel:(n:number)=>compactUnifiedStatsV2(classId,n)}}}};
   const original=compileRealFrozenForgeActorV2(qa.actor,qa.build,source);
   const choice=selectSoloReviewLoadoutsV2(qa.build,region);
   assert.equal(choice.capacity,3);
   const actors=Object.fromEntries(arms.map(arm=>{
    const selected={...qa.build.selected,activeSkills:choice.selections[arm]};
    const compiled=compileRealFrozenForgeActorV2(qa.actor,{...qa.build,selected},source);
    assert.deepEqual(compiled.evidence.equippedInstanceIds,original.evidence.equippedInstanceIds);
    assert.deepEqual(compiled.actor.stats,original.actor.stats,'skill selection must not change stats');
    assert.deepEqual(compiled.actor.combatV2?.equipmentEffects,original.actor.combatV2?.equipmentEffects);
    if(arm==='default_two')assert.deepEqual(compiled.actor,original.actor);
    return [arm,compiled.actor];
   })) as Record<SoloReviewArm,CombatantDefinition>;
   return {classId,spec,original:original.actor,actors,choice};
  }));
  const meanHp=builds.reduce((n,x)=>n+x.original.stats.maxHp,0)/builds.length;
  const meanAttack=builds.reduce((n,x)=>n+x.original.stats.attackPower,0)/builds.length;
  const p=regionalMechanicPressureV2(level,'mixed');
  for(const row of builds)for(const kind of ['normal','elite'] as const){
   // Identical seed, enemy ID, stats and kit to #1928 mixed arm.
   const seed=['QA_REGION_MECHANICS',level,row.classId,row.spec,kind].join('_');
   const id='QA_REGION_MECHANIC_ENEMY';
   const base:CombatantDefinition={...boss,id,name:'Regional mechanics fixture',level,boss:false,
    phases:undefined,abilities:[],tags:[kind==='elite'?'pve:archetype:guardian':'pve:archetype:caster'],
    stats:{...boss.stats,maxHp:Math.round(meanAttack*10*p.hp*(kind==='elite'?1.5:1)),
     attackPower:Math.round(meanHp*.055*p.attack*(kind==='elite'?1.2:1)),defense:Math.round(k*.30*p.defense)}};
   const foe=regionalMechanicsV2(base,kind,true);
   const proposed=prepareSoloEnemyKitsV2([foe],{ruleset:ENEMY_V2_RULESET,region,equipmentTier:Math.max(2,tier) as 2|3|4,
    encounterId:seed,serverSeed:seed,eliteEnemyIds:kind==='elite'?[id]:[]});
   const persisted={...proposed,source:'server-persisted-v2' as const,revision:6};
   const verified=verifyPersistedEnemyKitsV2([foe],persisted);
   for(const arm of arms){
    const actor=row.actors[arm];
    const input:CombatInput={seed,players:[actor],enemies:[...verified.enemies],maxDurationMs:60000,mitigationConstant:k};
    const scope={source:'server-persisted-v2' as const,version:2 as const,ruleset:persisted.ruleset,
     mode:'solo' as const,encounterId:persisted.encounterId,revision:persisted.revision,seed:persisted.seed,
     playerIds:[actor.id],enemyIds:persisted.enemyIds,bossIds:persisted.bossIds};
    const run=()=>simulateCombat(input,issueEnemyV2EngineAuthority(scope,input,(_s,d)=>/^[a-f0-9]{64}$/.test(d)));
    const result=run();
    if(row.spec===0&&kind==='normal'&&arm==='counter_full')assert.deepEqual(run(),result);
    assert.ok(result.events.every(e=>e.amount===undefined||Number.isFinite(e.amount)));
    assert.ok(result.players[0].hp>=0&&result.players[0].hp<=actor.stats.maxHp+1e-8);
    rows.push({level,classId:row.classId,spec:row.spec,kind,arm,win:Number(result.victory),reason:result.reason,
     hp:result.players[0].hp/actor.stats.maxHp,enemyHp:result.enemies[0].hp/result.enemies[0].definition.stats.maxHp,
     duration:result.durationMs,damage:result.players[0].damageDone,
     interrupts:result.events.filter(e=>e.type==='interrupt'&&e.actorId===actor.id&&e.targetId===id).length,
     cleanses:result.events.filter(e=>e.type==='status_remove'&&e.actorId===actor.id&&e.targetId===actor.id&&actor.abilities.some(a=>a.id===e.abilityId&&a.effects.some(f=>f.kind==='cleanse'))).length,
     skills:actor.abilities.map(a=>a.id),counterAvailable:row.choice.counterAvailable});
   }
  }
 }
 assert.equal(rows.length,720);
 const keys=[...new Set(rows.map(r=>r.level+'|'+CLASS_ROLES_V2[r.classId]+'|'+r.kind+'|'+r.arm))].sort();
 assert.equal(keys.length,120);
 const mean=(values:number[])=>values.reduce((n,v)=>n+v,0)/values.length;
 const originals=rows.filter(r=>r.arm==='default_two');
 // Same fixed prior QA fixtures: fail if the reference silently drifts.
 assert.equal(originals.reduce((n,r)=>n+r.win,0),89);
 console.log('REGIONAL_SOLO_COUNTERBUILD_REVIEW '+JSON.stringify({matchedSets:rows.length/4,executions:rows.length,groups:keys.map(key=>{
  const a=rows.filter(r=>r.level+'|'+CLASS_ROLES_V2[r.classId]+'|'+r.kind+'|'+r.arm===key);
  return {key,cases:a.length,wins:a.reduce((n,r)=>n+r.win,0),reasons:Object.fromEntries(['victory','wipe','timeout'].map(reason=>[reason,a.filter(r=>r.reason===reason).length])),
   meanHp:mean(a.map(r=>r.hp)),meanEnemyHp:mean(a.map(r=>r.enemyHp)),meanDuration:mean(a.map(r=>r.duration)),meanDamage:mean(a.map(r=>r.damage)),
   interrupts:a.reduce((n,r)=>n+r.interrupts,0),cleanses:a.reduce((n,r)=>n+r.cleanses,0),counterAvailable:a.filter(r=>r.counterAvailable).length};
 }),loadouts:rows.filter(r=>r.kind==='normal').map(({level,classId,spec,arm,skills,counterAvailable})=>({level,classId,spec,arm,skills,counterAvailable})),
 releaseEnabled:false,cpApproved:false}));
}
// Secondary offense: same gear/skills per comparison, all T1–T4.
{
 const arms:SecondaryOffenseArm[]=['baseline','approved_start','sensitivity_double'];
 const loopArms:SoloOffenseLoopArm[]=['expanded_start','expanded_double','solo_tempo'];
 const budgetArms:SoloRoleBudgetArm[]=['role_budget','role_budget_skill'];
 const budgetRows:{level:number;classId:ClassIdV2;spec:number;kind:string;arm:SoloRoleBudgetArm;win:number;reason:string;duration:number;hp:number;enemyHp:number;damage:number;basicDamage:number;directDamage:number;dotDamage:number;heal:number;ratio:number;additionalScale:number;adjustedSkills:string[]}[]=[];
 const loopRows:{level:number;tier:number;classId:ClassIdV2;spec:number;kind:string;arm:SoloOffenseLoopArm;win:number;reason:string;duration:number;hp:number;enemyHp:number;damage:number;basicDamage:number;basicHits:number;directDamage:number;dotDamage:number;heal:number;periodicSkills:number;tempoSkills:number;ratio:number}[]=[];
 const rows:{level:number;tier:number;classId:ClassIdV2;spec:number;kind:string;arm:SecondaryOffenseArm;win:number;reason:string;hp:number;enemyHp:number;duration:number;damage:number;ratio:number;additional:number;skills:number}[]=[];
 for(const level of [10,13,26,38,51,63]){
  const progression=regionalProgressionAtV2(level);
  if(progression.region==='region4'||progression.expectedTier===5)throw Error('secondary_offense_scope');
  const tier=progression.expectedTier,region=progression.region,k=30+2*level;
  const builds=(Object.keys(CLASS_NAMES_V2) as ClassIdV2[]).flatMap(classId=>([0,1] as const).map(spec=>{
   const qa=makeV21Loadout(classId,spec,tier,level);
   const classProfile=qa.source.classBaselinePolicy.profiles[classId]!;
   const source={...qa.source,classBaselinePolicy:{version:'QA_COMPACT_REGION_MECHANICS',profiles:{
    [classId]:{...classProfile,maxLevel:100,statsAtLevel:(n:number)=>compactUnifiedStatsV2(classId,n)}}}};
   const original=compileRealFrozenForgeActorV2(qa.actor,qa.build,source);
   const choice=selectSoloReviewLoadoutsV2(qa.build,region);
   const compiled=compileRealFrozenForgeActorV2(qa.actor,{...qa.build,selected:{...qa.build.selected,activeSkills:choice.selections.counter_full}},source);
   assert.deepEqual(compiled.evidence.equippedInstanceIds,original.evidence.equippedInstanceIds);
   assert.deepEqual(compiled.actor.stats,original.actor.stats);
   const candidates=arms.map(arm=>secondaryOffenseActorReviewV2(classId,compiled.actor,arm));
   assert.deepEqual(candidates[0].actor,compiled.actor);
   for(const candidate of candidates){
    assert.deepEqual(candidate.actor.stats,compiled.actor.stats);
    assert.deepEqual(candidate.actor.combatV2,compiled.actor.combatV2);
    assert.equal(candidate.actor.basicAttackCoeff,compiled.actor.basicAttackCoeff);
    assert.ok(candidate.effective<=compiled.actor.stats.attackPower*2+1e-8);
    assert.ok(candidate.ratio>=1);
    if(compiled.actor.role==='damage')assert.deepEqual(candidate.actor,compiled.actor);
    for(const [i,a] of candidate.actor.abilities.entries())for(const [j,e] of a.effects.entries()){
     const before=compiled.actor.abilities[i].effects[j];
     if(e.kind!=='damage'||e.damageType==='true')assert.deepEqual(e,before);
     else assert.deepEqual({...e,coeff:before.coeff},before);
    }
   }
   assert.ok(candidates[2].effective>=candidates[1].effective);
   const extreme={...compiled.actor,stats:{...compiled.actor.stats,defense:1e6,maxHp:1e6,healingPower:1e6}};
   const bound=secondaryOffenseAmountV2(classId,extreme,'approved_start');
   assert.ok(bound.effective<=extreme.stats.attackPower*2+1e-8);
   return {classId,spec,original:original.actor,candidates};
  }));
  const meanHp=builds.reduce((n,x)=>n+x.original.stats.maxHp,0)/builds.length;
  const meanAttack=builds.reduce((n,x)=>n+x.original.stats.attackPower,0)/builds.length;
  const p=level===10?regionalPressureReviewV2(level):regionalMechanicPressureV2(level,'mixed');
  for(const row of builds)for(const kind of ['normal','elite'] as const){
   const seed=['QA_REGION_MECHANICS',level,row.classId,row.spec,kind].join('_');
   const id='QA_REGION_MECHANIC_ENEMY';
   const base:CombatantDefinition={...boss,id,name:'Regional mechanics fixture',level,boss:false,
    phases:undefined,abilities:[],tags:[kind==='elite'?'pve:archetype:guardian':'pve:archetype:caster'],
    stats:{...boss.stats,maxHp:Math.round(meanAttack*10*p.hp*(kind==='elite'?1.5:1)),
     attackPower:Math.round(meanHp*.055*p.attack*(kind==='elite'?1.2:1)),defense:Math.round(k*.30*p.defense)}};
   const foe=regionalMechanicsV2(base,kind,level!==10);
   const proposed=prepareSoloEnemyKitsV2([foe],{ruleset:ENEMY_V2_RULESET,region,equipmentTier:Math.max(2,tier) as 2|3|4,
    encounterId:seed,serverSeed:seed,eliteEnemyIds:kind==='elite'?[id]:[]});
   const persisted={...proposed,source:'server-persisted-v2' as const,revision:6};
   const verified=verifyPersistedEnemyKitsV2([foe],persisted);
   // Extend the exact original unmodified compiled counter-build, never
   // the already-converted candidate. Scope checked by private input adapter.
   const originalInput:CombatInput={seed,players:[row.candidates[0].actor],enemies:[...verified.enemies],maxDurationMs:60000,mitigationConstant:k};
   const loopScope={source:'server-persisted-v2' as const,version:2 as const,ruleset:persisted.ruleset,
    mode:'solo' as const,encounterId:persisted.encounterId,revision:persisted.revision,seed:persisted.seed,
    playerIds:[row.candidates[0].actor.id],enemyIds:persisted.enemyIds,bossIds:persisted.bossIds};
   const loopBaseline=simulateCombat(originalInput,issueEnemyV2EngineAuthority(loopScope,originalInput,(_s,d)=>/^[a-f0-9]{64}$/.test(d)));
   if(row.spec===0&&kind==='normal'){
    assert.throws(()=>soloOffenseLoopReviewV2(row.classId,{...originalInput,players:[...originalInput.players,...originalInput.players]},'solo_tempo'),/fresh_solo_only/);
    assert.throws(()=>soloOffenseLoopReviewV2(row.classId,{...originalInput,enemies:[{...originalInput.enemies[0],boss:true}]},'solo_tempo'),/fresh_solo_only/);
    assert.throws(()=>soloOffenseLoopReviewV2(row.classId,{...originalInput,initialPlayerState:{}},'solo_tempo'),/fresh_solo_only/);
   }
   for(const arm of loopArms){
    const original=row.candidates[0].actor;
    const candidate=soloOffenseLoopReviewV2(row.classId,originalInput,arm);
    const input=candidate.input,actor=input.players[0];
    assert.deepEqual(input.enemies,originalInput.enemies);
    assert.deepEqual(actor.stats,original.stats);
    assert.deepEqual(actor.combatV2,original.combatV2);
    assert.equal(actor.role,original.role);
    for(const [i,a] of actor.abilities.entries()){
     const before=original.abilities[i];
     assert.equal(a.id,before.id);assert.equal(a.castTimeMs,before.castTimeMs);
     assert.deepEqual(a.combatV2,before.combatV2);
     if(a.cooldownMs!==before.cooldownMs)assert.ok(a.effects.every(e=>(e.kind==='damage'||e.kind==='dot')&&!e.lifestealPct&&!e.consumeOwnedDotFraction));
     for(const [j,e] of a.effects.entries()){
      const prior=before.effects[j];
      if(!['damage','dot'].includes(e.kind)||e.damageType==='true')assert.deepEqual(e,prior);
      else assert.deepEqual({...e,coeff:prior.coeff},prior);
     }
    }
    const run=()=>simulateCombat(input,issueEnemyV2EngineAuthority(loopScope,input,(_s,d)=>/^[a-f0-9]{64}$/.test(d)));
    const result=run();
    if(original.role==='damage'){assert.deepEqual(actor,original);assert.deepEqual(result,loopBaseline);}
    if(row.spec===0&&kind==='normal'&&arm==='solo_tempo')assert.deepEqual(run(),result);
    assert.ok(result.events.every(e=>e.amount===undefined||Number.isFinite(e.amount)));
    assert.ok(result.players[0].hp>=0&&result.players[0].hp<=actor.stats.maxHp+1e-8);
    const own=result.events.filter(e=>e.actorId===actor.id);
    const basic=own.filter(e=>e.type==='damage'&&e.abilityId==='BASIC');
    const sum=(events:typeof own)=>events.reduce((n,e)=>n+(e.amount??0),0);
    loopRows.push({level,tier,classId:row.classId,spec:row.spec,kind,arm,win:Number(result.victory),reason:result.reason,
     duration:result.durationMs,hp:result.players[0].hp/actor.stats.maxHp,enemyHp:result.enemies[0].hp/result.enemies[0].definition.stats.maxHp,
     damage:result.players[0].damageDone,basicDamage:sum(basic),basicHits:basic.length,
     directDamage:sum(own.filter(e=>e.type==='damage'&&actor.abilities.some(a=>a.id===e.abilityId))),
     dotDamage:sum(own.filter(e=>e.type==='dot_tick')),heal:result.players[0].healingDone,
     periodicSkills:candidate.periodicSkills,tempoSkills:candidate.tempoSkills,ratio:candidate.ratio});
   }
   // New sensitivity retains the exact previous encounter and source build.
   // Compare both changes against the already measured solo_tempo arm.
   const tempo=soloOffenseLoopReviewV2(row.classId,originalInput,'solo_tempo').input.players[0];
   if(row.spec===0&&kind==='normal'){
    const original=originalInput.players[0];
    const extreme={...original,stats:{...original.stats,defense:1e6,maxHp:1e6,healingPower:1e6}};
    const extremeInput={...originalInput,players:[extreme]};
    const x=soloRoleBudgetReviewV2(row.classId,extremeInput,'role_budget');
    const y=soloRoleBudgetReviewV2(row.classId,originalInput,'role_budget');
    assert.ok(x.input.players[0].basicAttackCoeff>=original.basicAttackCoeff);
    assert.ok(y.ratio>=1);
    assert.ok(x.ratio<=3.25+1e-8);
    assert.deepEqual(x.input.players[0].stats,extreme.stats);
    assert.deepEqual(originalInput.players[0],row.candidates[0].actor);
   }
   for(const arm of budgetArms){
    const candidate=soloRoleBudgetReviewV2(row.classId,originalInput,arm);
    const input=candidate.input,actor=input.players[0];
    assert.deepEqual(input.enemies,originalInput.enemies);
    assert.deepEqual(actor.stats,tempo.stats);
    assert.deepEqual(actor.combatV2,tempo.combatV2);
    assert.equal(actor.basicAttackMs,tempo.basicAttackMs);
    assert.equal(actor.role,tempo.role);
    assert.ok(candidate.additionalScale>=1&&candidate.ratio>=1);
    if(arm==='role_budget')assert.equal(candidate.adjustedSkills.length,0);
    for(const [i,a] of actor.abilities.entries()){
     const before=tempo.abilities[i];
     assert.equal(a.id,before.id);assert.equal(a.cooldownMs,before.cooldownMs);assert.equal(a.castTimeMs,before.castTimeMs);
     assert.deepEqual(a.combatV2,before.combatV2);
     for(const [j,e] of a.effects.entries()){
      const prior=before.effects[j];
      if(!['damage','dot'].includes(e.kind)||e.damageType==='true')assert.deepEqual(e,prior);
      else assert.deepEqual({...e,coeff:prior.coeff},prior);
     }
    }
    const run=()=>simulateCombat(input,issueEnemyV2EngineAuthority(loopScope,input,(_s,d)=>/^[a-f0-9]{64}$/.test(d)));
    const result=run();
    if(tempo.role==='damage'){assert.deepEqual(actor,tempo);assert.deepEqual(result,loopBaseline);}
    if(row.spec===0&&kind==='normal'&&arm==='role_budget_skill'){
     assert.deepEqual(run(),result);
     assert.throws(()=>soloRoleBudgetReviewV2(row.classId,{...originalInput,enemies:[{...originalInput.enemies[0],boss:true}]},arm),/fresh_solo_only/);
     assert.throws(()=>soloRoleBudgetReviewV2(row.classId,{...originalInput,players:[...originalInput.players,...originalInput.players]},arm),/fresh_solo_only/);
    }
    assert.ok(result.events.every(e=>e.amount===undefined||Number.isFinite(e.amount)));
    assert.ok(result.players[0].hp>=0&&result.players[0].hp<=actor.stats.maxHp+1e-8);
    const own=result.events.filter(e=>e.actorId===actor.id);
    const sum=(events:typeof own)=>events.reduce((n,e)=>n+(e.amount??0),0);
    budgetRows.push({level,classId:row.classId,spec:row.spec,kind,arm,win:Number(result.victory),reason:result.reason,
     duration:result.durationMs,hp:result.players[0].hp/actor.stats.maxHp,enemyHp:result.enemies[0].hp/result.enemies[0].definition.stats.maxHp,
     damage:result.players[0].damageDone,basicDamage:sum(own.filter(e=>e.type==='damage'&&e.abilityId==='BASIC')),
     directDamage:sum(own.filter(e=>e.type==='damage'&&actor.abilities.some(a=>a.id===e.abilityId))),dotDamage:sum(own.filter(e=>e.type==='dot_tick')),
     heal:result.players[0].healingDone,ratio:candidate.ratio,additionalScale:candidate.additionalScale,adjustedSkills:candidate.adjustedSkills});
   }
   for(const [i,arm] of arms.entries()){
    const candidate=row.candidates[i],actor=candidate.actor;
    const input:CombatInput={seed,players:[actor],enemies:[...verified.enemies],maxDurationMs:60000,mitigationConstant:k};
    const scope={source:'server-persisted-v2' as const,version:2 as const,ruleset:persisted.ruleset,
     mode:'solo' as const,encounterId:persisted.encounterId,revision:persisted.revision,seed:persisted.seed,
     playerIds:[actor.id],enemyIds:persisted.enemyIds,bossIds:persisted.bossIds};
    const run=()=>simulateCombat(input,issueEnemyV2EngineAuthority(scope,input,(_s,d)=>/^[a-f0-9]{64}$/.test(d)));
    const result=run();
    if(row.spec===0&&kind==='normal'&&arm==='approved_start')assert.deepEqual(run(),result);
    assert.ok(result.events.every(e=>e.amount===undefined||Number.isFinite(e.amount)));
    assert.ok(result.players[0].hp>=0&&result.players[0].hp<=actor.stats.maxHp+1e-8);
    rows.push({level,tier,classId:row.classId,spec:row.spec,kind,arm,win:Number(result.victory),reason:result.reason,
     hp:result.players[0].hp/actor.stats.maxHp,enemyHp:result.enemies[0].hp/result.enemies[0].definition.stats.maxHp,
     duration:result.durationMs,damage:result.players[0].damageDone,ratio:candidate.ratio,additional:candidate.additional,skills:candidate.abilityIds.length});
   }
  }
 }
 assert.equal(rows.length,648);
 const original=rows.filter(r=>r.level!==10&&r.arm==='baseline');
 assert.equal(original.reduce((n,r)=>n+r.win,0),146);
 const mean=(values:number[])=>values.reduce((n,v)=>n+v,0)/values.length;
 const keys=[...new Set(rows.map(r=>r.level+'|'+r.classId+'|'+r.kind+'|'+r.arm))].sort();
 console.log('SECONDARY_OFFENSE_SOLO_REVIEW '+JSON.stringify({matchedSets:216,executions:rows.length,groups:keys.map(key=>{
  const a=rows.filter(r=>r.level+'|'+r.classId+'|'+r.kind+'|'+r.arm===key);
  return {key,cases:a.length,wins:a.reduce((n,r)=>n+r.win,0),timeouts:a.filter(r=>r.reason==='timeout').length,
   wipes:a.filter(r=>r.reason==='wipe').length,meanHp:mean(a.map(r=>r.hp)),meanEnemyHp:mean(a.map(r=>r.enemyHp)),
   meanDuration:mean(a.map(r=>r.duration)),meanDamage:mean(a.map(r=>r.damage)),meanRatio:mean(a.map(r=>r.ratio)),
   meanAddedPower:mean(a.map(r=>r.additional)),meanQualifyingSkills:mean(a.map(r=>r.skills))};
 }),releaseEnabled:false,cpApproved:false}));
 assert.equal(loopRows.length,648);
 const loopKeys=[...new Set(loopRows.map(r=>r.level+'|'+r.classId+'|'+r.kind+'|'+r.arm))].sort();
 // Throughput includes all time spent on failed/time-limited attempts,
 // not just successful kills. Same enemy reference within each band.
 const killsPerMinute=(a:readonly {win:number;duration:number}[])=>60000*a.reduce((n,r)=>n+r.win,0)/a.reduce((n,r)=>n+r.duration,0);
 console.log('SOLO_OFFENSE_LOOP_REVIEW '+JSON.stringify({matchedSets:216,executions:loopRows.length,
 groups:loopKeys.map(key=>{
  const a=loopRows.filter(r=>r.level+'|'+r.classId+'|'+r.kind+'|'+r.arm===key);
  const old=rows.filter(r=>r.level===a[0].level&&r.classId===a[0].classId&&r.kind===a[0].kind&&r.arm==='approved_start');
  const damageReference=loopRows.filter(r=>r.level===a[0].level&&r.kind===a[0].kind&&r.arm===a[0].arm&&CLASS_ROLES_V2[r.classId]==='damage');
  const throughput=killsPerMinute(a),reference=killsPerMinute(damageReference);
  return {key,cases:a.length,wins:a.reduce((n,r)=>n+r.win,0),timeouts:a.filter(r=>r.reason==='timeout').length,wipes:a.filter(r=>r.reason==='wipe').length,
   meanDuration:mean(a.map(r=>r.duration)),meanHp:mean(a.map(r=>r.hp)),meanEnemyHp:mean(a.map(r=>r.enemyHp)),
   meanDamage:mean(a.map(r=>r.damage)),meanBasicDamage:mean(a.map(r=>r.basicDamage)),meanBasicHits:mean(a.map(r=>r.basicHits)),
   meanDirectDamage:mean(a.map(r=>r.directDamage)),meanDotDamage:mean(a.map(r=>r.dotDamage)),meanHeal:mean(a.map(r=>r.heal)),
   meanRatio:mean(a.map(r=>r.ratio)),meanPeriodicSkills:mean(a.map(r=>r.periodicSkills)),meanTempoSkills:mean(a.map(r=>r.tempoSkills)),
   killsPerMinute:throughput,priorDirectOnlyKillsPerMinute:killsPerMinute(old),
   damageReferenceKillsPerMinute:reference,relativeEfficiency:reference>0?throughput/reference:null};
 }),releaseEnabled:false,cpApproved:false}));

 assert.equal(budgetRows.length,432);
 const budgetKeys=[...new Set(budgetRows.map(r=>r.level+'|'+r.classId+'|'+r.kind+'|'+r.arm))].sort();
 assert.equal(budgetKeys.length,216);
 console.log('SOLO_ROLE_BUDGET_REVIEW '+JSON.stringify({matchedSets:216,executions:budgetRows.length,
 groups:budgetKeys.map(key=>{
  const a=budgetRows.filter(r=>r.level+'|'+r.classId+'|'+r.kind+'|'+r.arm===key);
  const old=loopRows.filter(r=>r.level===a[0].level&&r.classId===a[0].classId&&r.kind===a[0].kind&&r.arm==='solo_tempo');
  const damageReference=loopRows.filter(r=>r.level===a[0].level&&r.kind===a[0].kind&&r.arm==='solo_tempo'&&CLASS_ROLES_V2[r.classId]==='damage');
  const throughput=killsPerMinute(a),reference=killsPerMinute(damageReference);
  return {key,cases:a.length,wins:a.reduce((n,r)=>n+r.win,0),timeouts:a.filter(r=>r.reason==='timeout').length,wipes:a.filter(r=>r.reason==='wipe').length,
   meanDuration:mean(a.map(r=>r.duration)),meanHp:mean(a.map(r=>r.hp)),meanEnemyHp:mean(a.map(r=>r.enemyHp)),
   meanDamage:mean(a.map(r=>r.damage)),meanBasicDamage:mean(a.map(r=>r.basicDamage)),meanDirectDamage:mean(a.map(r=>r.directDamage)),
   meanDotDamage:mean(a.map(r=>r.dotDamage)),meanHeal:mean(a.map(r=>r.heal)),meanRatio:mean(a.map(r=>r.ratio)),
   meanAdditionalScale:mean(a.map(r=>r.additionalScale)),adjustedSkills:[...new Set(a.flatMap(r=>r.adjustedSkills))].sort(),
   killsPerMinute:throughput,priorSoloTempoKillsPerMinute:killsPerMinute(old),damageReferenceKillsPerMinute:reference,
   relativeEfficiency:reference>0?throughput/reference:null};
 }),releaseEnabled:false,cpApproved:false}));

}
// Robustness: independently rolled common items and incomplete tier upgrades.
// Enemy references remain fixed on the original two-skill pinned loadouts,
// never scaled to the weaker or stronger equipped actor in each test.
{
 const arms=['solo_tempo','role_budget','role_budget_skill'] as const;
 type Arm=typeof arms[number];
 const progressionArms:SoloProgressionArm[]=['efficient_defense','offensive_progression'];
 const progressionRows:{level:number;classId:ClassIdV2;spec:number;profile:SoloGearReviewProfile;seed:number;kind:string;arm:SoloProgressionArm;win:number;reason:string;duration:number;hp:number;enemyHp:number;damage:number;healing:number;priorityChanges:string[];strengthChanges:string[];supportActions:number;interrupts:number}[]=[];
 const rows:{level:number;classId:ClassIdV2;spec:number;profile:SoloGearReviewProfile;seed:number;kind:string;arm:Arm;
  win:number;reason:string;duration:number;hp:number;enemyHp:number;damage:number;healing:number;ratio:number}[]=[];
 const gearRows:{level:number;classId:ClassIdV2;spec:number;profile:SoloGearReviewProfile;
  slots:number;downgraded:number;meanQuality:number;rarities:string[];rolls:ReturnType<typeof makeV21Loadout>['rolls'];
  attack:number;defense:number;maxHp:number;healingPower:number}[]=[];
 for(const level of [10,13,38,63]){
  const progression=regionalProgressionAtV2(level);
  if(progression.region==='region4'||progression.expectedTier===5)throw Error('solo_robustness_scope');
  const tier=progression.expectedTier,region=progression.region,k=30+2*level;
  const ids=Object.keys(CLASS_NAMES_V2) as ClassIdV2[];
  const build=(classId:ClassIdV2,spec:0|1,profile:SoloGearReviewProfile)=>{
   const qa=makeV21Loadout(classId,spec,tier,level,profile);
   assert.ok(qa.rolls.length===qa.ids.length&&qa.rolls.length>0);
   if(profile!=='pinned_reference')assert.ok(qa.rolls.every(r=>r.rarity==='common'&&r.quality>=10&&r.quality<=30));
   if(profile==='transition_common')assert.ok(qa.rolls.every(r=>!['helmet','legs','cape','ring'].includes(r.slot)||r.tier<=tier-1));
   const classProfile=qa.source.classBaselinePolicy.profiles[classId]!;
   const source={...qa.source,classBaselinePolicy:{version:'QA_COMPACT_REGION_MECHANICS',profiles:{
    [classId]:{...classProfile,maxLevel:100,statsAtLevel:(n:number)=>compactUnifiedStatsV2(classId,n)}}}};
   const original=compileRealFrozenForgeActorV2(qa.actor,qa.build,source);
   const choice=selectSoloReviewLoadoutsV2(qa.build,region);
   const compiled=compileRealFrozenForgeActorV2(qa.actor,{...qa.build,selected:{...qa.build.selected,activeSkills:choice.selections.counter_full}},source);
   assert.deepEqual(compiled.evidence.equippedInstanceIds,original.evidence.equippedInstanceIds);
   assert.deepEqual(compiled.actor.stats,original.actor.stats);
   const stats=compiled.actor.stats;
   gearRows.push({level,classId,spec,profile,slots:qa.ids.length,downgraded:qa.downgraded,
    meanQuality:qa.rolls.reduce((n,r)=>n+r.quality,0)/qa.rolls.length,rarities:[...new Set(qa.rolls.map(r=>r.rarity))],rolls:qa.rolls,
    attack:stats.attackPower,defense:stats.defense,maxHp:stats.maxHp,healingPower:stats.healingPower});
   return {classId,spec,profile,original:original.actor,actor:compiled.actor,skills:choice.selections.counter_full};
  };
  const references=ids.flatMap(classId=>([0,1] as const).map(spec=>build(classId,spec,'pinned_reference')));
  const profiles:SoloGearReviewProfile[]=tier===1?['low_common']:['low_common','transition_common'];
  const candidates=[...references,...references.flatMap(r=>profiles.map(profile=>{
   const candidate=build(r.classId,r.spec,profile);
   assert.deepEqual(candidate.skills,r.skills,'gear profile must not select different skills');
   return candidate;
  }))];
  const meanHp=references.reduce((n,x)=>n+x.original.stats.maxHp,0)/references.length;
  const meanAttack=references.reduce((n,x)=>n+x.original.stats.attackPower,0)/references.length;
  const p=level===10?regionalPressureReviewV2(level):regionalMechanicPressureV2(level,'mixed');
  for(const row of candidates)for(const kind of ['normal','elite'] as const)for(const seedIndex of [0,1]){
   // Different deterministic encounter RNG streams, not a resampled favorable outcome.
   // Same seeds and kit across every profile and policy arm for this class/spec.
   const seed=['QA_REGION_ROBUST',level,row.classId,row.spec,kind,seedIndex].join('_');
   const id='QA_REGION_MECHANIC_ENEMY';
   const base:CombatantDefinition={...boss,id,name:'Regional mechanics fixture',level,boss:false,
    phases:undefined,abilities:[],tags:[kind==='elite'?'pve:archetype:guardian':'pve:archetype:caster'],
    stats:{...boss.stats,maxHp:Math.round(meanAttack*10*p.hp*(kind==='elite'?1.5:1)),
     attackPower:Math.round(meanHp*.055*p.attack*(kind==='elite'?1.2:1)),defense:Math.round(k*.30*p.defense)}};
   const foe=regionalMechanicsV2(base,kind,level!==10);
   const proposed=prepareSoloEnemyKitsV2([foe],{ruleset:ENEMY_V2_RULESET,region,equipmentTier:Math.max(2,tier) as 2|3|4,
    encounterId:seed,serverSeed:seed,eliteEnemyIds:kind==='elite'?[id]:[]});
   const persisted={...proposed,source:'server-persisted-v2' as const,revision:6};
   const verified=verifyPersistedEnemyKitsV2([foe],persisted);
   const originalInput:CombatInput={seed,players:[row.actor],enemies:[...verified.enemies],maxDurationMs:60000,mitigationConstant:k};
   const scope={source:'server-persisted-v2' as const,version:2 as const,ruleset:persisted.ruleset,
    mode:'solo' as const,encounterId:persisted.encounterId,revision:persisted.revision,seed:persisted.seed,
    playerIds:[row.actor.id],enemyIds:persisted.enemyIds,bossIds:persisted.bossIds};
   let reference:ReturnType<typeof simulateCombat>|undefined;
   for(const arm of arms){
    const candidate=arm==='solo_tempo'?soloOffenseLoopReviewV2(row.classId,originalInput,arm):soloRoleBudgetReviewV2(row.classId,originalInput,arm);
    const input=candidate.input,actor=input.players[0];
    assert.deepEqual(input.enemies,originalInput.enemies);
    assert.deepEqual(actor.stats,row.actor.stats);
    assert.deepEqual(actor.combatV2,row.actor.combatV2);
    const run=()=>simulateCombat(input,issueEnemyV2EngineAuthority(scope,input,(_s,d)=>/^[a-f0-9]{64}$/.test(d)));
    const result=run();
    if(arm==='solo_tempo')reference=result;
    if(actor.role==='damage'){assert.deepEqual(actor,row.actor);assert.deepEqual(result,reference);}
    if(row.spec===0&&kind==='normal'&&seedIndex===0&&arm==='role_budget_skill')assert.deepEqual(run(),result);
    assert.ok(result.events.every(e=>e.amount===undefined||Number.isFinite(e.amount)));
    assert.ok(result.players[0].hp>=0&&result.players[0].hp<=actor.stats.maxHp+1e-8);
    rows.push({level,classId:row.classId,spec:row.spec,profile:row.profile,seed:seedIndex,kind,arm,
     win:Number(result.victory),reason:result.reason,duration:result.durationMs,
     hp:result.players[0].hp/actor.stats.maxHp,enemyHp:result.enemies[0].hp/result.enemies[0].definition.stats.maxHp,
     damage:result.players[0].damageDone,healing:result.players[0].healingDone,ratio:candidate.ratio});
   }
   const prior=soloRoleBudgetReviewV2(row.classId,originalInput,'role_budget_skill').input.players[0];
   for(const arm of progressionArms){
    const candidate=soloOffensiveProgressionReviewV2(row.classId,originalInput,arm);
    const input=candidate.input,actor=input.players[0];
    assert.deepEqual(input.enemies,originalInput.enemies);
    assert.deepEqual(actor.stats,prior.stats);
    assert.deepEqual(actor.combatV2,prior.combatV2);
    assert.equal(actor.basicAttackCoeff,prior.basicAttackCoeff);
    assert.equal(actor.basicAttackMs,prior.basicAttackMs);
    assert.equal(actor.abilities.length,prior.abilities.length);
    if(arm==='efficient_defense')assert.equal(candidate.strengthChanges.length,0);
    for(const [i,a] of actor.abilities.entries()){
     const before=prior.abilities[i];
     assert.equal(a.id,before.id);assert.equal(a.cooldownMs,before.cooldownMs);assert.equal(a.castTimeMs,before.castTimeMs);
     assert.deepEqual(a.combatV2,before.combatV2);
     assert.equal(a.target,before.target);
     if(a.aiCondition!==before.aiCondition){
      assert.equal(before.aiCondition,'ally_below_80_or_targeted');assert.equal(a.aiCondition,'ally_below_80');
      assert.ok(a.effects.every(e=>['heal','hot','shield'].includes(e.kind)));
     }
     for(const [j,e] of a.effects.entries()){
      const old=before.effects[j];
      if(e.kind!=='damage'||e.damageType==='true'||arm==='efficient_defense')assert.deepEqual(e,old);
      else assert.deepEqual({...e,coeff:old.coeff},old);
     }
    }
    const run=()=>simulateCombat(input,issueEnemyV2EngineAuthority(scope,input,(_s,d)=>/^[a-f0-9]{64}$/.test(d)));
    const result=run();
    if(actor.role==='damage'){assert.deepEqual(actor,row.actor);assert.deepEqual(result,reference);}
    if(row.spec===0&&kind==='normal'&&seedIndex===0&&arm==='offensive_progression'){
     assert.deepEqual(run(),result);
     assert.throws(()=>soloOffensiveProgressionReviewV2(row.classId,{...originalInput,enemies:[{...originalInput.enemies[0],boss:true}]},arm),/fresh_solo_only/);
     assert.throws(()=>soloOffensiveProgressionReviewV2(row.classId,{...originalInput,players:[...originalInput.players,...originalInput.players]},arm),/fresh_solo_only/);
    }
    assert.ok(result.events.every(e=>e.amount===undefined||Number.isFinite(e.amount)));
    assert.ok(result.players[0].hp>=0&&result.players[0].hp<=actor.stats.maxHp+1e-8);
    const own=result.events.filter(e=>e.actorId===actor.id);
    progressionRows.push({level,classId:row.classId,spec:row.spec,profile:row.profile,seed:seedIndex,kind,arm,
     win:Number(result.victory),reason:result.reason,duration:result.durationMs,
     hp:result.players[0].hp/actor.stats.maxHp,enemyHp:result.enemies[0].hp/result.enemies[0].definition.stats.maxHp,
     damage:result.players[0].damageDone,healing:result.players[0].healingDone,
     priorityChanges:candidate.priorityChanges,strengthChanges:candidate.strengthChanges,
     supportActions:own.filter(e=>e.type==='heal'||e.type==='shield'||e.type==='hot_tick').length,
     interrupts:own.filter(e=>e.type==='interrupt').length});
   }
  }
 }
 assert.equal(gearRows.length,198);
 assert.equal(rows.length,2376);
 assert.equal(new Set(rows.map(r=>[r.level,r.classId,r.spec,r.profile,r.seed,r.kind,r.arm].join('|'))).size,rows.length);
 const mean=(values:number[])=>values.reduce((n,v)=>n+v,0)/values.length;
 const killsPerMinute=(a:readonly {win:number;duration:number}[])=>60000*a.reduce((n,r)=>n+r.win,0)/a.reduce((n,r)=>n+r.duration,0);
 const keys=[...new Set(rows.map(r=>r.level+'|'+r.classId+'|'+r.profile+'|'+r.kind+'|'+r.arm))].sort();
 assert.equal(keys.length,594);
 // Concise decision summary kept separately from full per-band diagnostics.
 const summaryKeys=[...new Set(rows.map(r=>r.classId+'|'+r.profile+'|'+r.arm))].sort();
 console.log('SOLO_EQUIPMENT_ROBUSTNESS_SUMMARY '+JSON.stringify({matchedSets:rows.length/3,executions:rows.length,groups:summaryKeys.map(key=>{
  const a=rows.filter(r=>r.classId+'|'+r.profile+'|'+r.arm===key);
  const bands=[...new Set(a.map(r=>r.level+'|'+r.kind))];
  const relative=bands.map(band=>{
   const subset=a.filter(r=>r.level+'|'+r.kind===band),s=subset[0];
   const reference=rows.filter(r=>r.level===s.level&&r.kind===s.kind&&r.profile===s.profile&&r.arm===s.arm&&CLASS_ROLES_V2[r.classId]==='damage');
   const rate=killsPerMinute(reference);
   return rate>0?killsPerMinute(subset)/rate:null;
  }).filter((r):r is number=>r!==null);
  return {key,cases:a.length,wins:a.reduce((n,r)=>n+r.win,0),timeouts:a.filter(r=>r.reason==='timeout').length,wipes:a.filter(r=>r.reason==='wipe').length,
   meanRelative:relative.length?mean(relative):null,minRelative:relative.length?Math.min(...relative):null,maxRelative:relative.length?Math.max(...relative):null,
   below75:relative.filter(r=>r<.75).length,withinTarget:relative.filter(r=>r>=.75&&r<=.85).length,above85:relative.filter(r=>r>.85).length,
   bandsWithoutDamageReference:bands.length-relative.length};
 }),releaseEnabled:false}));
 console.log('SOLO_EQUIPMENT_ROBUSTNESS_REVIEW '+JSON.stringify({matchedSets:rows.length/3,executions:rows.length,
  gearProfiles:gearRows.map(({rolls,...r})=>({...r,minQuality:Math.min(...rolls.map(x=>x.quality)),maxQuality:Math.max(...rolls.map(x=>x.quality))})),
  groups:keys.map(key=>{
   const a=rows.filter(r=>r.level+'|'+r.classId+'|'+r.profile+'|'+r.kind+'|'+r.arm===key);
   const sample=a[0];
   const sameGearDamage=rows.filter(r=>r.level===sample.level&&r.kind===sample.kind&&r.profile===sample.profile&&r.arm===sample.arm&&CLASS_ROLES_V2[r.classId]==='damage');
   const pinnedDamage=rows.filter(r=>r.level===sample.level&&r.kind===sample.kind&&r.profile==='pinned_reference'&&r.arm===sample.arm&&CLASS_ROLES_V2[r.classId]==='damage');
   const throughput=killsPerMinute(a),reference=killsPerMinute(sameGearDamage),pinnedReference=killsPerMinute(pinnedDamage);
   return {key,cases:a.length,wins:a.reduce((n,r)=>n+r.win,0),timeouts:a.filter(r=>r.reason==='timeout').length,wipes:a.filter(r=>r.reason==='wipe').length,
    meanDuration:mean(a.map(r=>r.duration)),meanHp:mean(a.map(r=>r.hp)),meanEnemyHp:mean(a.map(r=>r.enemyHp)),
    meanDamage:mean(a.map(r=>r.damage)),meanHealing:mean(a.map(r=>r.healing)),meanRatio:mean(a.map(r=>r.ratio)),
    killsPerMinute:throughput,sameGearDamageKillsPerMinute:reference,pinnedDamageKillsPerMinute:pinnedReference,
    relativeEfficiency:reference>0?throughput/reference:null,relativePinnedEfficiency:pinnedReference>0?throughput/pinnedReference:null};
  }),releaseEnabled:false,cpApproved:false}));
 assert.equal(progressionRows.length,1584);
 const progressionKeys=[...new Set(progressionRows.map(r=>r.classId+'|'+r.profile+'|'+r.arm))].sort();
 assert.equal(progressionKeys.length,54);
 console.log('SOLO_OFFENSIVE_PROGRESSION_SUMMARY '+JSON.stringify({matchedSets:792,executions:progressionRows.length,
 groups:progressionKeys.map(key=>{
  const a=progressionRows.filter(r=>r.classId+'|'+r.profile+'|'+r.arm===key);
  const old=rows.filter(r=>r.classId===a[0].classId&&r.profile===a[0].profile&&r.arm==='role_budget_skill');
  const bands=[...new Set(a.map(r=>r.level+'|'+r.kind))];
  const relative=bands.map(band=>{
   const subset=a.filter(r=>r.level+'|'+r.kind===band),s=subset[0];
   const reference=rows.filter(r=>r.level===s.level&&r.kind===s.kind&&r.profile===s.profile&&r.arm==='role_budget_skill'&&CLASS_ROLES_V2[r.classId]==='damage');
   const prior=old.filter(r=>r.level+'|'+r.kind===band);
   const rate=killsPerMinute(reference);
   return {band,efficiency:rate>0?killsPerMinute(subset)/rate:null,priorEfficiency:rate>0?killsPerMinute(prior)/rate:null,
    wins:subset.reduce((n,r)=>n+r.win,0),cases:subset.length,meanHp:mean(subset.map(r=>r.hp))};
  });
  const valid=relative.map(r=>r.efficiency).filter((r):r is number=>r!==null);
  return {key,cases:a.length,wins:a.reduce((n,r)=>n+r.win,0),priorWins:old.reduce((n,r)=>n+r.win,0),
   timeouts:a.filter(r=>r.reason==='timeout').length,wipes:a.filter(r=>r.reason==='wipe').length,
   meanRelative:valid.length?mean(valid):null,minRelative:valid.length?Math.min(...valid):null,maxRelative:valid.length?Math.max(...valid):null,
   below75:valid.filter(r=>r<.75).length,withinTarget:valid.filter(r=>r>=.75&&r<=.85).length,above85:valid.filter(r=>r>.85).length,
   priorityChanges:[...new Set(a.flatMap(r=>r.priorityChanges))],strengthChanges:[...new Set(a.flatMap(r=>r.strengthChanges))],
   meanHp:mean(a.map(r=>r.hp)),meanHeal:mean(a.map(r=>r.healing)),meanSupportEvents:mean(a.map(r=>r.supportActions)),
   interrupts:a.reduce((n,r)=>n+r.interrupts,0),bands:relative};
 }),releaseEnabled:false,cpApproved:false}));

}
runRegionalCompletionLedgerReviewV2();
// Regional completion bosses, NOT dungeon kits. Source identities preserved.
// Separate fresh QA issuer binds the exact authored input; no changes to
// dungeon composer allowlist, actual persistence, rewards or progression.
{
 const arms:CompletionBossArmV2[]=['reference','mechanics','mixed'];
 const counterArms=['mixed_counter','pressure_counter','pressure_default','pressure_offensive','pressure_counter_basic'] as const;
 type CounterArm=typeof counterArms[number];
 const counterRows:{boss:string;classId:ClassIdV2;spec:number;profile:SoloGearReviewProfile;seed:number;arm:CounterArm;
  win:number;reason:string;duration:number;hp:number;enemyHp:number;phases:number;casts:number;interrupts:number;cleanses:number;phaseDamage:number;damageTaken:number;healing:number;skills:string[]}[]=[];
 const rows:{boss:string;level:number;classId:ClassIdV2;spec:number;profile:SoloGearReviewProfile;seed:number;arm:string;win:number;reason:string;duration:number;hp:number;enemyHp:number;phases:number;casts:number;interrupts:number;dots:number;shields:number;heal:number}[]=[];
 for(const profile of COMPLETION_BOSSES_REVIEW_V2){
  const level=profile.level,tier=profile.tier,k=30+2*level;
  const ids=Object.keys(CLASS_NAMES_V2) as ClassIdV2[];
  const build=(classId:ClassIdV2,spec:0|1,gear:SoloGearReviewProfile)=>{
   const qa=makeV21Loadout(classId,spec,tier,level,gear);
   const classProfile=qa.source.classBaselinePolicy.profiles[classId]!;
   const source={...qa.source,classBaselinePolicy:{version:'QA_COMPACT_COMPLETION_BOSS',profiles:{
    [classId]:{...classProfile,maxLevel:100,statsAtLevel:(n:number)=>compactUnifiedStatsV2(classId,n)}}}};
   const original=compileRealFrozenForgeActorV2(qa.actor,qa.build,source);
   const choice=selectSoloReviewLoadoutsV2(qa.build,profile.region);
   const compiled=compileRealFrozenForgeActorV2(qa.actor,{...qa.build,selected:{...qa.build.selected,activeSkills:choice.selections.counter_full}},source);
   assert.deepEqual(compiled.evidence.equippedInstanceIds,original.evidence.equippedInstanceIds);
   assert.deepEqual(compiled.actor.stats,original.actor.stats);
   if(gear!=='pinned_reference')assert.ok(qa.rolls.every(r=>r.rarity==='common'&&r.quality>=10&&r.quality<=30));
   if(gear==='transition_common')assert.ok(qa.rolls.every(r=>!['helmet','legs','cape','ring'].includes(r.slot)||r.tier<=tier-1));
   const actor=secondaryOffenseActorReviewV2(classId,compiled.actor,'approved_start').actor;
   assert.deepEqual(actor.stats,compiled.actor.stats);
   const alternatives=Object.fromEntries((['default_full','offensive_full'] as const).map(arm=>{
    const alt=compileRealFrozenForgeActorV2(qa.actor,{...qa.build,selected:{...qa.build.selected,activeSkills:choice.selections[arm]}},source);
    assert.deepEqual(alt.evidence.equippedInstanceIds,compiled.evidence.equippedInstanceIds);
    assert.deepEqual(alt.actor.stats,compiled.actor.stats);
    assert.deepEqual(alt.actor.combatV2,compiled.actor.combatV2);
    return [arm,alt.actor];
   })) as Record<'default_full'|'offensive_full',CombatantDefinition>;
   return {classId,spec,gear,original:original.actor,baseline:compiled.actor,actor,alternatives};
  };
  const references=ids.flatMap(classId=>([0,1] as const).map(spec=>build(classId,spec,'pinned_reference')));
  const builds=[...references,...references.map(r=>build(r.classId,r.spec,'low_common'))];
  const meanHp=references.reduce((n,r)=>n+r.original.stats.maxHp,0)/references.length;
  const meanAttack=references.reduce((n,r)=>n+r.original.stats.attackPower,0)/references.length;
  // Fixed initial boss calibration, not derived from an individual player's
  // gear, level or selected skill. A separate 120s boss window.
  const referenceStats:CombatStats={...boss.stats,maxHp:Math.round(meanAttack*20),
   attackPower:Math.round(meanHp*.045),defense:Math.round(k*.35)};
  const fixtures=arms.map(arm=>createCompletionBossReviewV2(profile.id,referenceStats,arm));
  assert.deepEqual(fixtures[0].enemy.stats,fixtures[1].enemy.stats);
  assert.ok(fixtures.every(f=>!f.releaseEnabled&&!f.rewardEnabled&&!f.unlockEnabled&&f.enemy.boss&&f.enemy.id===profile.id));
  assert.ok(fixtures[1].enemy.phases?.length===2&&fixtures[2].enemy.phases?.length===2);
  assert.ok(fixtures[1].enemy.abilities.every(a=>a.interruptible&&a.castTimeMs>0));
  for(const row of builds)for(const seedIndex of [0,1]){
   const seed=['QA_COMPLETION',profile.id,row.classId,row.spec,seedIndex].join('_');
   for(const arm of [...arms,'mixed_unconverted'] as const){
    const fixture=fixtures[arm==='mixed_unconverted'?2:arms.indexOf(arm)];
    const actor=arm==='mixed_unconverted'?row.baseline:row.actor;
    const input:CombatInput={seed,players:[actor],enemies:[fixture.enemy],maxDurationMs:120000,mitigationConstant:k};
    const scope={source:'server-persisted-v2' as const,version:2 as const,ruleset:ENEMY_V2_RULESET,
     mode:'solo' as const,encounterId:seed,revision:1,seed,playerIds:[actor.id],enemyIds:[profile.id],bossIds:[profile.id]};
    // Mock verifier for private QA; not a new persisted boss composer or
    // grant authority. The opaque engine issuer still binds full input.
    const authority=issueEnemyV2EngineAuthority(scope,input,(_s,d)=>/^[a-f0-9]{64}$/.test(d));
    const result=simulateCombat(input,authority);
    if(row.spec===0&&seedIndex===0&&row.gear==='pinned_reference'&&arm==='mechanics'){
     assert.deepEqual(simulateCombat(input,authority),result);
     assert.throws(()=>simulateCombat({...input,maxDurationMs:119900},authority),/scope_does_not_match/);
     assert.throws(()=>soloOffensiveProgressionReviewV2(row.classId,input,'offensive_progression'),/fresh_solo_only/);
    }
    assert.ok(result.events.every(e=>e.amount===undefined||Number.isFinite(e.amount)));
    assert.ok(result.players[0].hp>=0&&result.players[0].hp<=actor.stats.maxHp+1e-8);
    const phases=result.events.filter(e=>e.type==='phase'&&e.actorId===profile.id);
    assert.ok(phases.length<=(fixture.enemy.phases?.length??0));
    const own=result.events.filter(e=>e.actorId===profile.id);
    rows.push({boss:profile.id,level,classId:row.classId,spec:row.spec,profile:row.gear,seed:seedIndex,arm,
     win:Number(result.victory),reason:result.reason,duration:result.durationMs,
     hp:result.players[0].hp/actor.stats.maxHp,enemyHp:result.enemies[0].hp/fixture.enemy.stats.maxHp,
     phases:phases.length,casts:own.filter(e=>e.type==='cast_complete').length,
     interrupts:result.events.filter(e=>e.type==='interrupt'&&e.targetId===profile.id).length,
     dots:own.filter(e=>e.type==='dot_tick').length,shields:own.filter(e=>e.type==='shield').length,
     heal:result.players[0].healingDone});
   }
  }
  // Same boss reference and frozen gear; additionally test partial upgrades.
  const robustness=[...builds,...references.map(r=>build(r.classId,r.spec,'transition_common'))];
  const mixed=fixtures[2].enemy,pressure=completionBossPressureReviewV2(mixed);
  assert.deepEqual(pressure.stats,mixed.stats);
  assert.equal(pressure.id,mixed.id);assert.equal(pressure.level,mixed.level);
  assert.equal(pressure.abilities.length,mixed.abilities.length);
  for(const [i,a] of pressure.abilities.entries()){
   const old=mixed.abilities[i];
   assert.ok(a.cooldownMs<old.cooldownMs);
   assert.deepEqual({...a,cooldownMs:old.cooldownMs},old);
  }
  for(const [i,p] of pressure.phases!.entries()){
   const old=mixed.phases![i];
   assert.deepEqual({...p,effects:p.effects.slice(0,-1)},old);
   assert.equal(p.effects.at(-1)?.kind,'damage');
  }
  for(const row of robustness)for(const seedIndex of [0,1]){
   const seed=['QA_COMPLETION',profile.id,row.classId,row.spec,seedIndex].join('_');
   for(const arm of counterArms){
    const baseline=arm==='pressure_default'?row.alternatives.default_full:arm==='pressure_offensive'?row.alternatives.offensive_full:row.baseline;
    const enemy=arm==='mixed_counter'?mixed:pressure;
    const original:CombatInput={seed,players:[baseline],enemies:[enemy],maxDurationMs:120000,mitigationConstant:k};
    const candidate=completionBossOffenseReviewV2(row.classId,original,arm==='pressure_counter_basic');
    const input=candidate.input,actor=input.players[0];
    assert.deepEqual(actor.stats,baseline.stats);
    assert.deepEqual(actor.combatV2,baseline.combatV2);
    assert.equal(actor.basicAttackMs,baseline.basicAttackMs);
    assert.deepEqual(actor.abilities,secondaryOffenseActorReviewV2(row.classId,baseline,'approved_start').actor.abilities);
    if(actor.role==='damage')assert.deepEqual(actor,baseline);
    if(arm!=='pressure_counter_basic')assert.equal(actor.basicAttackCoeff,baseline.basicAttackCoeff);
    else assert.ok(actor.basicAttackCoeff>=baseline.basicAttackCoeff&&actor.basicAttackCoeff<=baseline.basicAttackCoeff*2+1e-8);
    const scope={source:'server-persisted-v2' as const,version:2 as const,ruleset:ENEMY_V2_RULESET,
     mode:'solo' as const,encounterId:seed,revision:1,seed,playerIds:[actor.id],enemyIds:[profile.id],bossIds:[profile.id]};
    const run=()=>simulateCombat(input,issueEnemyV2EngineAuthority(scope,input,(_s,d)=>/^[a-f0-9]{64}$/.test(d)));
    const result=run();
    if(row.spec===0&&seedIndex===0&&row.gear==='pinned_reference'&&arm==='pressure_counter_basic'){
     assert.deepEqual(run(),result);
     assert.throws(()=>completionBossOffenseReviewV2(row.classId,{...original,enemies:[{...enemy,id:'BOSS_EXP_ROOT'}]},true),/fresh_review_boss/);
     assert.throws(()=>completionBossOffenseReviewV2(row.classId,{...original,players:[...original.players,...original.players]},true),/fresh_review_boss/);
     assert.throws(()=>completionBossOffenseReviewV2(row.classId,{...original,initialPlayerState:{}},true),/fresh_review_boss/);
    }
    assert.ok(result.events.every(e=>e.amount===undefined||Number.isFinite(e.amount)));
    assert.ok(result.players[0].hp>=0&&result.players[0].hp<=actor.stats.maxHp+1e-8);
    const phaseIds=new Set(enemy.phases?.map(p=>p.id));
    const phases=result.events.filter(e=>e.type==='phase'&&e.actorId===profile.id);
    assert.ok(phases.length<=2&&new Set(phases.map(e=>e.abilityId)).size===phases.length);
    const own=result.events.filter(e=>e.actorId===profile.id);
    counterRows.push({boss:profile.id,classId:row.classId,spec:row.spec,profile:row.gear,seed:seedIndex,arm,
     win:Number(result.victory),reason:result.reason,duration:result.durationMs,
     hp:result.players[0].hp/actor.stats.maxHp,enemyHp:result.enemies[0].hp/enemy.stats.maxHp,
     phases:phases.length,casts:own.filter(e=>e.type==='cast_complete').length,
     interrupts:result.events.filter(e=>e.type==='interrupt'&&e.targetId===profile.id).length,
     cleanses:result.events.filter(e=>e.type==='status_remove'&&e.actorId===actor.id&&e.detail==='combat_v2_cleanse').length,
     phaseDamage:own.filter(e=>e.type==='damage'&&e.abilityId&&phaseIds.has(e.abilityId)).reduce((n,e)=>n+(e.amount??0),0),
     damageTaken:result.players[0].damageTaken,healing:result.players[0].healingDone,skills:actor.abilities.map(a=>a.id)});
   }
  }
 }
 assert.equal(rows.length,864);
 const keys=[...new Set(rows.map(r=>r.boss+'|'+r.classId+'|'+r.profile+'|'+r.arm))].sort();
 assert.equal(keys.length,216);
 const mean=(a:number[])=>a.reduce((n,v)=>n+v,0)/a.length;
 console.log('REGIONAL_COMPLETION_BOSS_REVIEW '+JSON.stringify({matchedSets:216,executions:rows.length,
  groups:keys.map(key=>{
   const a=rows.filter(r=>r.boss+'|'+r.classId+'|'+r.profile+'|'+r.arm===key);
   return {key,cases:a.length,wins:a.reduce((n,r)=>n+r.win,0),timeouts:a.filter(r=>r.reason==='timeout').length,wipes:a.filter(r=>r.reason==='wipe').length,
    meanDuration:mean(a.map(r=>r.duration)),meanHp:mean(a.map(r=>r.hp)),meanEnemyHp:mean(a.map(r=>r.enemyHp)),
    phases:a.reduce((n,r)=>n+r.phases,0),casts:a.reduce((n,r)=>n+r.casts,0),interrupts:a.reduce((n,r)=>n+r.interrupts,0),
    dots:a.reduce((n,r)=>n+r.dots,0),shields:a.reduce((n,r)=>n+r.shields,0),meanHeal:mean(a.map(r=>r.heal))};
  }),releaseEnabled:false,rewardEnabled:false,unlockEnabled:false,cpApproved:false}));
 assert.equal(counterRows.length,1620);
 assert.equal(counterRows.filter(r=>r.arm==='mixed_counter'&&r.profile!=='transition_common').reduce((n,r)=>n+r.win,0),216);
 const counterKeys=[...new Set(counterRows.map(r=>r.boss+'|'+r.classId+'|'+r.profile+'|'+r.arm))].sort();
 assert.equal(counterKeys.length,405);
 console.log('REGIONAL_COMPLETION_COUNTERPLAY_REVIEW '+JSON.stringify({matchedSets:324,executions:counterRows.length,
 groups:counterKeys.map(key=>{
  const a=counterRows.filter(r=>r.boss+'|'+r.classId+'|'+r.profile+'|'+r.arm===key);
  return {key,cases:a.length,wins:a.reduce((n,r)=>n+r.win,0),timeouts:a.filter(r=>r.reason==='timeout').length,wipes:a.filter(r=>r.reason==='wipe').length,
   meanDuration:mean(a.map(r=>r.duration)),meanHp:mean(a.map(r=>r.hp)),meanEnemyHp:mean(a.map(r=>r.enemyHp)),
   phases:a.reduce((n,r)=>n+r.phases,0),casts:a.reduce((n,r)=>n+r.casts,0),interrupts:a.reduce((n,r)=>n+r.interrupts,0),
   cleanses:a.reduce((n,r)=>n+r.cleanses,0),meanPhaseDamage:mean(a.map(r=>r.phaseDamage)),
   meanDamageTaken:mean(a.map(r=>r.damageTaken)),meanHealing:mean(a.map(r=>r.healing)),
   skills:[...new Set(a.flatMap(r=>r.skills))]};
 }),releaseEnabled:false,rewardEnabled:false,unlockEnabled:false,cpApproved:false}));

}
// Unified compact class -> actual V2 skills -> original Forge -> exact socket
// projection -> verified authored party enemy kits. The only modified source
// policy is the versioned test class baseline; no post-compile stat scaling.
{
 const policy:ForgeSocketReviewPolicyV2={version:'QA_UNIFIED_COMPACT_V2',gemBalancePolicy:GEM_BALANCE_REVIEW_V2,
  mechanicsReview:{version:FORGE_SOCKET_MECHANICS_REVIEW_V2,maxFinalAttackPower:1e8},
  maxFinalHp:1e8,maxFinalDefense:1e8};
 const parties:ClassIdV2[][]=[['IRONWARDEN','WAYFINDER','HEXWEAVER','STONECALLER'],
  ['BASTION','RAVAGER','KNIFE_DANCER','DAWNKEEPER'],['DREADGUARD','HEXWEAVER','RAVAGER','STONECALLER']];
 const roleMix={tank:['effect_unyielding','effect_last_stand','effect_bulwark'],
  damage:['effect_execution','effect_momentum','effect_predator'],
  support:['effect_benediction','effect_shared_resolve','effect_guardians_gift']} as const;
 const statMix={tank:['stat_vitality','stat_iron','stat_ward','stat_elusive'],
  damage:['stat_might','stat_keen','stat_savage','stat_precision'],
  support:['stat_swift','stat_potent','stat_vitality','stat_ward']} as const;
 type Comparison=ReturnType<ReturnType<typeof createGentleGemPartyPressureReviewV2>>;
 const partySecondaryRows:{boss:string;band:string;result:ReturnType<ReturnType<typeof createGentleGemPartyPressureReviewV2>['compareSecondaryOffense']>}[]=[];
 const rows:{region:string;boss:string;band:string;classId:ClassIdV2;spec:number;seed:number;cp:number;arm:'stat'|'effect';result:Comparison}[]=[];
 const cpRows:{boss:string;classId:ClassIdV2;spec:number;index:number;gearPoints:number;slots:number}[]=[];
 let baseCount=0;
 for(const profile of exactBossProfiles){
  const level=profile.level,k=30+2*level;
  const all=Object.keys(CLASS_NAMES_V2) as ClassIdV2[];
  const membersByClass=new Map(all.map(classId=>[classId,([0,1] as const).map(spec=>{
   const qa=makeV21Loadout(classId,spec,profile.forgeTier,level);
   const classProfile=qa.source.classBaselinePolicy.profiles[classId]!;
   const revision=qa.source.ledgerRevision+qa.ids.length;
   const source={...qa.source,ledgerRevision:revision,verifyPersisted:(d:string,r:number)=>r===revision&&/^[a-f0-9]{64}$/.test(d),
    classBaselinePolicy:{version:'QA_COMPACT_CLASS_CURVE_20261126',profiles:{[classId]:{...classProfile,maxLevel:100,statsAtLevel:(n:number)=>compactUnifiedStatsV2(classId,n)}}}};
   const chosen=selectReviewSkillLoadoutV2(classId,qa.build.selected.specializationId!,qa.actor,profile.id,'targeted');
   const build={...qa.build,selected:{...qa.build.selected,activeSkills:chosen.activeSkills}};
   const compiled=compileRealFrozenForgeActorV2(qa.actor,build,source);
   const baseline=reviewFrozenForgeSocketsV2(qa.actor,build,source,{slots:[],receipts:[]},policy);
   assert.deepEqual(baseline.stats,compiled.actor.stats);
   const exactGear=compiled.evidence.items.reduce((a,x)=>({attack:a.attack+x.scaledBaseStats.attack,
    defense:a.defense+x.scaledBaseStats.defense,hp:a.hp+x.scaledBaseStats.hp}),{attack:0,defense:0,hp:0});
   const cp=compactCoreCpIndexV2(level,exactGear);
   assert.ok(cp.index>40*level/25&&cp.cpApproved===false);
   cpRows.push({boss:profile.id,classId,spec,index:cp.index,gearPoints:cp.gearPoints,slots:qa.ids.length});
   const role=CLASS_ROLES_V2[classId];
   const project=(kind:'stat'|'effect')=>{
    const sockets:V2GemSidecarState={slots:[],receipts:[]};
    const pool=kind==='stat'?statMix[role]:roleMix[role];
    const ids=kind==='stat'?qa.ids:qa.ids.slice(0,6);
    assert.ok(ids.length>=6);
    for(const [i,instanceId] of ids.entries()){
     const family=kind==='stat'?pool[i%pool.length]:pool[Math.floor(i/2)];
     const gemId=gemItemId(family,5);
     sockets.slots.push(kind==='stat'?{instanceId,stat:{gemId,rollPercent:100}}:{instanceId,effect:{gemId,rollPercent:100}});
     sockets.receipts.push({requestId:'QA_COMPACT_GEM_'+i,fingerprint:'gem:'+instanceId+':'+gemId,instanceId,
      socket:kind,gemId,source:'gem_pouch',rollPercent:100,burnedGemId:null,version:qa.source.ledgerRevision+i+1});
    }
    const projection=reviewFrozenForgeSocketsV2(qa.actor,build,source,sockets,policy);
    assert.equal(projection.cpApproved,false);
    return projection;
   };
   return {classId,accountId:source.accountId,characterId:source.characterId,revision,compiled,baseline,cp:cp.index,
    stat:project('stat'),effect:project('effect')};
  })] as const));
  const reference=[...membersByClass.values()].flat().map(x=>x.compiled.actor);
  const meanHp=reference.reduce((n,x)=>n+x.stats.maxHp,0)/reference.length;
  const meanAttack=reference.reduce((n,x)=>n+x.stats.attackPower,0)/reference.length;
  // Same fixed boss input for all parties and both gem arms; not dynamic
  // scaling to a wearer's CP or gear. Region progression follows reference
  // fixture stats and the mitigation curve, not approved difficulty values.
  const names:Readonly<Record<typeof profile.id,string>>={BOSS_EXP_ROOT:'Asterfall Root',BOSS_EXP_BELL:'Asterfall Bell',BOSS_EXP_SOLAR:'The Buried Heliarch',BOSS_EXP_SPHINX:'The Veiled Sphinx',BOSS_EXP_BELLBEAST:'The Bellbeast of Shiverlake',BOSS_EXP_CANTOR:'The Frozen Cantor'};
  const fixed={...boss,id:profile.id,name:names[profile.id],level,abilities:[],phases:undefined,
   stats:{...boss.stats,maxHp:Math.round(meanAttack*4*30),attackPower:Math.round(meanHp*.30),defense:Math.round(k*.60)}};
  for(const [pi,ids] of parties.entries())for(const spec of [0,1] as const){
   const members=ids.map(id=>membersByClass.get(id)![spec]);
   for(const seed of [0,1])for(const [band,hpFactor,apFactor] of [['accessible',.8,.8],['standard',1,1],['pressure',1.25,1.25]] as const){
    const enemy={...fixed,stats:{...fixed.stats,maxHp:Math.round(fixed.stats.maxHp*hpFactor),attackPower:Math.round(fixed.stats.attackPower*apFactor)}};
    const fight=createGentleGemPartyPressureReviewV2(members,{region:profile.region,tier:profile.tier,enemy,mitigationConstant:k},
     ['COMPACT',profile.id,pi,spec,seed,band].join('_'));
    for(const arm of ['approved_start','sensitivity_double'] as const)partySecondaryRows.push({boss:profile.id,band,result:fight.compareSecondaryOffense(arm)});
    baseCount++;
    // Rotate wearer deterministically; across two specs/seeds all four
    // positions are exercised. Compare independent stat/effect arms only.
    const index=spec*2+seed,member=members[index];
    for(const arm of ['stat','effect'] as const)rows.push({region:profile.region,boss:profile.id,band,classId:member.classId,spec,seed,cp:member.cp,arm,
     result:fight(index,member[arm],seed===0)});
   }
  }
 }
 assert.equal(cpRows.length,108);assert.equal(baseCount,216);assert.equal(rows.length,432);
 assert.equal(new Set(rows.map(r=>r.classId)).size,9);
 const keys=[...new Set(rows.map(r=>r.boss+'|'+r.band+'|'+r.arm))].sort();
 assert.equal(keys.length,36);
 const mean=(values:number[])=>values.reduce((n,v)=>n+v,0)/values.length;
 console.log('PRIVATE_COMPACT_CP_REGIONAL_REVIEW '+JSON.stringify({cases:rows.length,baseCount,cpProfiles:cpRows,
  scope:'UNIFIED_COMPACT_CLASS_ORIGINAL_FORGE_V2_SKILLS_SOCKET_AUTHORED_BOSS_QA',
  byBossBandArm:keys.map(key=>{
   const a=rows.filter(r=>r.boss+'|'+r.band+'|'+r.arm===key);
   return {key,cases:a.length,meanCoreCp:mean(a.map(r=>r.cp)),baselineWins:a.reduce((n,r)=>n+r.result.before.victory,0),
    candidateWins:a.reduce((n,r)=>n+r.result.after.victory,0),meanBaselinePartyAlive:mean(a.map(r=>r.result.before.partyAlive)),
    meanCandidatePartyAlive:mean(a.map(r=>r.result.after.partyAlive)),meanBaselineEnemyHp:mean(a.map(r=>r.result.before.enemyHp)),
    meanCandidateEnemyHp:mean(a.map(r=>r.result.after.enemyHp)),lostVictories:a.filter(r=>r.result.before.victory>r.result.after.victory).length,
    gainedVictories:a.filter(r=>r.result.before.victory<r.result.after.victory).length,
    meanDpsDelta:mean(a.map(r=>r.result.after.dps-r.result.before.dps)),meanHpsDelta:mean(a.map(r=>r.result.after.hps-r.result.before.hps)),
    meanWearerHpDelta:mean(a.map(r=>r.result.after.hpFraction-r.result.before.hpFraction))};
  }),releaseEnabled:false,cpApproved:false}));
 assert.equal(partySecondaryRows.length,432);
 const partyKeys=[...new Set(partySecondaryRows.map(r=>r.boss+'|'+r.band+'|'+r.result.arm))].sort();
 console.log('SECONDARY_OFFENSE_PARTY_REVIEW '+JSON.stringify({cases:partySecondaryRows.length,groups:partyKeys.map(key=>{
  const a=partySecondaryRows.filter(r=>r.boss+'|'+r.band+'|'+r.result.arm===key);
  return {key,cases:a.length,baselineWins:a.filter(r=>r.result.beforeReason==='victory').length,candidateWins:a.filter(r=>r.result.afterReason==='victory').length,
   lostVictories:a.filter(r=>r.result.beforeReason==='victory'&&r.result.afterReason!=='victory').length,
   byRole:['tank','damage','support'].map(role=>{
    const b=a.flatMap(r=>r.result.before.filter(x=>x.role===role)),c=a.flatMap(r=>r.result.after.filter(x=>x.role===role));
    return {role,baselineDps:mean(b.map(x=>x.dps)),candidateDps:mean(c.map(x=>x.dps)),
     baselineHps:mean(b.map(x=>x.hps)),candidateHps:mean(c.map(x=>x.hps)),
     baselineShield:mean(b.map(x=>x.shield)),candidateShield:mean(c.map(x=>x.shield)),
     baselineDowns:b.filter(x=>!x.alive).length,candidateDowns:c.filter(x=>!x.alive).length};
   })};
 }),releaseEnabled:false,cpApproved:false}));

}
// Exact-copy effect magnitude and resonance: every family at 1/2/3
// copies, low, mixed and max strength. No execution of effect hooks here.
{
 const policy:ForgeSocketReviewPolicyV2={version:'QA_EFFECT_RESONANCE_V2',gemBalancePolicy:GEM_BALANCE_REVIEW_V2,
  mechanicsReview:{version:FORGE_SOCKET_MECHANICS_REVIEW_V2,maxFinalAttackPower:1e8},
  maxFinalHp:1e8,maxFinalDefense:1e8};
 const qa=makeV21Loadout('IRONWARDEN',0,4,55);
 assert.ok(qa.ids.length>=4);
 const source={...qa.source,ledgerRevision:qa.source.ledgerRevision+qa.ids.length,
  verifyPersisted:(digest:string,rev:number)=>rev===qa.source.ledgerRevision+qa.ids.length&&/^[a-f0-9]{64}$/.test(digest)};
 const empty=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,{slots:[],receipts:[]},policy);
 const original=JSON.stringify(source.items);
 const sidecar=(gems:{family:string;grade:GemGrade;roll:number}[]):V2GemSidecarState=>{
  const slots:V2GemSidecarState['slots']=[],receipts:V2GemSidecarState['receipts']=[];
  for(const [i,g] of gems.entries()){
   const instanceId=qa.ids[i],gemId=gemItemId(g.family,g.grade);
   slots.push({instanceId,effect:{gemId,rollPercent:g.roll}});
   receipts.push({requestId:'QA_RESONANCE_'+i,fingerprint:'gem:'+instanceId+':'+gemId,
    instanceId,socket:'effect',gemId,source:'gem_pouch',rollPercent:g.roll,burnedGemId:null,
    version:qa.source.ledgerRevision+i+1});
  }
  return {slots,receipts};
 };
 const profiles=[
  {id:'low',grades:[1,1,1] as const,rolls:[80,80,80]},
  {id:'mixed',grades:[2,4,5] as const,rolls:[85,100,115]},
  {id:'max',grades:[5,5,5] as const,rolls:[120,120,120]},
 ];
 const rows:{family:string;profile:string;copies:number;total:number;legacy:number;peak:number;unit:string}[]=[];
 const triggers:NonNullable<ReturnType<typeof runEffectTriggerBoundaryReviewV2>>[]=[];
 for(const def of EFFECT_GEMS_REVIEW_V2){
  const legacy=EFFECT_GEMS_V1.find(x=>x.familyId===def.familyId)!;
  for(const profile of profiles)for(const copies of [1,2,3] as const){
   const gems=Array.from({length:copies},(_,i)=>({family:def.familyId,grade:profile.grades[i],roll:profile.rolls[i]}));
   const state=sidecar(gems);
   const out=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,state,policy);
   assert.deepEqual(out.stats,empty.stats);assert.deepEqual(out.advanced,empty.advanced);
   const report=out.effectResonanceReview!;
   assert.equal(report.version,EFFECT_RESONANCE_REVIEW_V2);
   assert.equal(report.copyCount,copies);assert.equal(report.families.length,1);
   const group=report.families[0];
   assert.equal(group.copies,copies);assert.equal(group.resonance,copies);
   assert.equal(group.unlockedResonance.length,copies-1);
   assert.equal(group.runtimeEnabled,false);assert.equal(report.canExecuteEffects,false);
   const expected=gems.reduce((n,g)=>n+Math.round(def.values[g.grade]*g.roll/100*1e9)/1e9,0);
   const expectedLegacy=gems.reduce((n,g)=>n+Math.round(legacy.values[g.grade]*g.roll/100*1e9)/1e9,0);
   assert.ok(Math.abs(group.totalValue-expected)<1e-9);
   assert.ok(Math.abs(group.legacyTotalValue-expectedLegacy)<1e-9);
   assert.equal(group.sources.length,copies);assert.ok(group.peak.candidate>=group.totalValue);
   assert.ok(Math.abs(group.peak.candidate-group.peak.legacy*EFFECT_GEM_REVIEW_MULTIPLIERS_V2[def.familyId])<1e-8);
   const trigger=runEffectTriggerBoundaryReviewV2(qa.actor,group);
   if(trigger)triggers.push(trigger);
   rows.push({family:def.familyId,profile:profile.id,copies,total:group.totalValue,legacy:group.legacyTotalValue,
    peak:group.peak.candidate,unit:group.peak.unit});
  }
  const four=sidecar(Array.from({length:4},()=>({family:def.familyId,grade:5 as const,roll:120})));
  assert.throws(()=>reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,four,policy),/family_copy_cap/);
 }
 const combo=sidecar(EFFECT_GEMS_REVIEW_V2.slice(0,3).flatMap(def=>Array.from({length:3},()=>({family:def.familyId,grade:5 as const,roll:120}))));
 const mixed=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,combo,policy);
 assert.equal(mixed.effectResonanceReview!.families.length,3);
 assert.equal(mixed.effectResonanceReview!.copyCount,9);
 assert.ok(mixed.effectResonanceReview!.families.every(g=>g.resonance===3));
 assert.deepEqual(mixed.stats,empty.stats);assert.deepEqual(mixed.advanced,empty.advanced);
 // All 190 distinct two-family pairs at maximum legal resonance.
 // Six exact worn copies per pair, plus four nine/ten-copy builds.
 const contexts:EffectInteractionActionV2[]=['authored_direct_damage','basic_damage','authored_periodic_damage',
  'authored_direct_heal','authored_periodic_heal','authored_barrier','secondary_proc','companion_action'];
 const peaks=new Map<string,{familyIds:string[];action:string;raw:number;combined:number;alternative:number|null}>();
 let pairs=0,fullBuilds=0,contextCases=0;
 const exercise=(families:readonly string[],counts:readonly number[])=>{
  const gems=families.flatMap((family,i)=>Array.from({length:counts[i]},()=>({family,grade:5 as const,roll:120})));
  assert.ok(gems.length<=qa.ids.length);
  const out=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,sidecar(gems),policy);
  assert.deepEqual(out.stats,empty.stats);assert.deepEqual(out.advanced,empty.advanced);
  const original=JSON.stringify(out);
  for(const action of contexts){
   const report=inspectEffectGemInteractionsV2(out,action);
   assert.equal(report.version,EFFECT_INTERACTION_REVIEW_V2);
   assert.equal(report.copyCount,gems.length);assert.equal(report.sourceDigest,out.digest);
   assert.equal(report.canExecuteEffects,false);assert.equal(report.secondaryOutputMayReproc,false);
   const excluded=action==='secondary_proc'||action==='companion_action';
   assert.equal(report.mayGenerateSecondaryEffects,!excluded);
   for(const c of report.channels){
    assert.ok(c.sources.every(r=>families.includes(r.familyId)));
    assert.equal(new Set(c.sources.map(r=>r.familyId)).size,c.sources.length);
    assert.ok(Math.abs(c.raw-c.sources.reduce((n,r)=>n+r.fraction,0))<1e-8);
    assert.ok(c.combined>=0&&c.combined<=c.raw+1e-9);
    if(c.lane==='damageReduction')assert.ok(c.combined<1);
    else assert.equal(c.combined,c.raw);
    if(c.multiplicativeAlternative!==null)assert.ok(c.multiplicativeAlternative>=c.raw-1e-9);
    if(excluded&&['damage','healing','barrier','overhealConversion','renewal','killHeal','retaliationHeal'].includes(c.lane))
     assert.equal(c.raw,0);
    if(action==='authored_periodic_heal'&&['overhealConversion','renewal'].includes(c.lane))assert.equal(c.raw,0);
    if(action==='basic_damage'&&c.lane==='damage')
     assert.ok(c.sources.every(r=>r.familyId!=='effect_retaliation'&&r.familyId!=='effect_battle_rhythm'));
    if(action==='authored_periodic_damage'&&c.lane==='damage')
     assert.ok(c.sources.every(r=>!['effect_retaliation','effect_momentum','effect_opportunist','effect_battle_rhythm'].includes(r.familyId)));
    const prior=peaks.get(c.lane);
    if(!prior||prior.combined<c.combined)peaks.set(c.lane,{familyIds:[...families],action,raw:c.raw,
     combined:c.combined,alternative:c.multiplicativeAlternative});
   }
   contextCases++;
  }
  assert.equal(JSON.stringify(out),original);
 };
 const ids=EFFECT_GEMS_REVIEW_V2.map(d=>d.familyId);
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
  exercise([ids[i],ids[j]],[3,3]);pairs++;
 }
 for(const families of [
  ['effect_retaliation','effect_execution','effect_momentum','effect_predator'],
  ['effect_last_stand','effect_bulwark','effect_guardians_gift','effect_unyielding'],
  ['effect_aegis','effect_benediction','effect_shared_resolve','effect_renewal'],
  ['effect_critical_surge','effect_flow','effect_battle_rhythm','effect_opportunist'],
 ]){
  exercise(families,[3,3,3,qa.ids.length>=10?1:0]);fullBuilds++;
 }
 assert.equal(pairs,190);assert.equal(fullBuilds,4);assert.equal(contextCases,(190+4)*8);
 console.log('EFFECT_GEM_INTERACTION_PEAK_REVIEW '+JSON.stringify({policy:EFFECT_INTERACTION_REVIEW_V2,
  pairs,fullBuilds,contextCases,peaks:Object.fromEntries(peaks),canExecuteEffects:false,releaseEnabled:false}));
 const provenanceCases=[];
 for(const roll of [80,100,120]){
  const build=(ids:string[])=>reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,
   sidecar(ids.map(family=>({family,grade:5 as const,roll}))),policy);
  const support=build(['effect_mercy','effect_renewal','effect_benediction','effect_guardians_gift','effect_shared_resolve']);
  const damage=build(['effect_momentum','effect_critical_surge','effect_retaliation','effect_retaliation','effect_retaliation','effect_sustenance']);
  provenanceCases.push({roll,...runEffectEventProvenanceReviewV2(support,damage)});
 }
 console.log('EFFECT_GEM_EVENT_PROVENANCE_REVIEW '+JSON.stringify({cases:provenanceCases.length,results:provenanceCases,releaseEnabled:false}));
 const lifecycleCases=[];
 for(const rank of [1,2,3])for(const roll of [80,100,120]){
  const gems=['effect_aegis','effect_mercy','effect_renewal'].flatMap(family=>Array.from({length:rank},()=>({family,grade:5 as const,roll})));
  const out=reviewFrozenForgeSocketsV2(qa.actor,qa.build,source,sidecar(gems),policy);
  lifecycleCases.push({roll,...runEffectLifecycleReviewV2(out)});
 }
 assert.equal(lifecycleCases.length,9);
 console.log('EFFECT_GEM_LIFECYCLE_REVIEW '+JSON.stringify({cases:lifecycleCases.length,results:lifecycleCases,releaseEnabled:false}));
 const sample=mixed.deferredEffectSources[0];
 assert.throws(()=>reviewEffectGemResonanceV2([{...sample,candidateFraction:99}],qa.ids),/invalid_copy/);
 assert.throws(()=>reviewEffectGemResonanceV2([sample,sample],qa.ids),/invalid_copy/);
 assert.throws(()=>reviewEffectGemResonanceV2([sample],qa.ids.filter(id=>id!==sample.instanceId)),/invalid_scope|invalid_copy/);
 assert.equal(JSON.stringify(source.items),original);
 assert.equal(rows.length,20*3*3);
 assert.equal(triggers.length,20*3*3);
 console.log('EFFECT_GEM_TRIGGER_BOUNDARY_REVIEW '+JSON.stringify({cases:triggers.length,
  assertions:triggers.reduce((n,r)=>n+r.assertions,0),legacyGapCases:triggers.filter(r=>r.legacyGap).length,
  families:[...new Set(triggers.map(r=>r.family))],releaseEnabled:false}));
 console.log('EFFECT_GEM_RESONANCE_CALIBRATION '+JSON.stringify({policy:EFFECT_RESONANCE_REVIEW_V2,
  cases:rows.length,fourthCopyRejections:20,mixedFamilies:3,mixedCopies:9,
  maxRollThreeCopy:rows.filter(r=>r.profile==='max'&&r.copies===3),
  canExecuteEffects:false,cpApproved:false,releaseEnabled:false}));
}
const v19SensitivityRows: {bossId:string;classId:string;specIndex:number;strategy:string;channel:string;pct:number;
 baseline:{victory:boolean;reason:string;durationMs:number;damage:number;healing:number;hp:number};
 candidate:{victory:boolean;reason:string;durationMs:number;damage:number;healing:number;hp:number}}[]=[];
const v18TraceRows: {bossId:string;classId:string;specIndex:number;strategy:string;actorId:string;events:unknown[];victory:boolean;durationMs:number}[]=[];
let realForgeAuthoredBossRuns=0,realForgeAuthoredBossThreats=0;
let realOriginalBossThreewayComparisons=0,comparableThreewayTactics=0;
const originalThreewayOutcomes=new Map<string,number>();
let sourceThreewayGuards=0;
let originalForgeSetBossMatrixCount=0,sourceSetBossOpportunities=0;
let authoredButUnseen=0,sourceSetBossMechanicAbsent=0;
const bossSetOpportunityProfiles=new Set<string>();
let forgedRegionalChecks=0;
const sameForgeBossGroups=new Set<string>();
for(const profile of exactBossProfiles){
 for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
  for(const specIndex of [0,1] as const){
   const qa=make(classId,specIndex,'supported',profile.forgeTier);
   const canonicalBossNames:Readonly<Record<typeof profile.id,string>>={
    BOSS_EXP_ROOT:'Asterfall Root',
    BOSS_EXP_BELL:'Asterfall Bell',
    BOSS_EXP_SOLAR:'The Buried Heliarch',
    BOSS_EXP_SPHINX:'The Veiled Sphinx',
    BOSS_EXP_BELLBEAST:'The Bellbeast of Shiverlake',
    BOSS_EXP_CANTOR:'The Frozen Cantor',
   };
   const bossBase:CombatantDefinition={
    ...boss,id:profile.id,name:canonicalBossNames[profile.id],
    level:profile.level,abilities:[],phases:undefined,
   };
   const seed='ORIGINAL_FORGE_AUTHORED_'+profile.id+'_'+classId+'_'+specIndex;
   const input:CombatInput={
    seed,players:[qa.actor],enemies:[bossBase],maxDurationMs:35000,
   };
   const proposed=prepareSoloEnemyKitsV2([bossBase],{
    ruleset:ENEMY_V2_RULESET,region:profile.region,
    equipmentTier:profile.tier,encounterId:'QA_ORIGINAL_'+profile.id+
      '_'+classId+'_'+specIndex,serverSeed:seed,
   });
   const persisted={...proposed,source:'server-persisted-v2' as const,
    revision:6};
   const kit={
    snapshot:persisted,
    verifyPersisted:(snap:typeof persisted,digest:string)=>
      snap===persisted&&/^[0-9a-f]{64}$/.test(digest),
   };
   const spec=SPECIALIZATIONS_V2.filter(s=>s.classId===classId)[specIndex];
   const group=profile.id+'|'+classId+'|'+specIndex;
   let originalFreeze='';
   const threeWay:OriginalForgeBossThreewayInputV2[]=[];
   for(const strategy of ['generic','targeted','alternative'] as const){
    const chosen=selectReviewSkillLoadoutV2(
     classId,spec.id,qa.actor,profile.id,strategy);
    const build:VerifiedSkillBuildV2={...qa.build,selected:{
     ...qa.build.selected,activeSkills:chosen.activeSkills,
    }};
    const first=simulateOriginalForgeAuthoredBossReviewV2(
     input,build,qa.source,kit,true);
    const replay=simulateOriginalForgeAuthoredBossReviewV2(
     input,build,qa.source,kit,true);
    assert.deepEqual(first,replay,
     'Original Forge + authored persisted boss replay must be deterministic');
    assert.equal(first.authenticBossProfile,true);
    assert.equal(first.equipmentSource,'ORIGINAL_EQ2_MINT_AND_CUSTODY_TEST_LEDGER');
    assert.equal(first.grantAllowed,false);
    assert.equal(first.marketTradeAllowed,false);
    assert.equal(first.releaseApproved,false);
    assert.ok(first.bossMechanicLabels.length>=1);
    assert.equal(first.equipmentEvidence.items.length,1);
    assert.equal(first.equipmentEvidence.items[0].instanceId,qa.mint.id);
    assert.ok(first.combat.events.some(e=>e.type==='combat_start'));
    assert.ok(!first.bossMechanicLabels.some(label=>label.includes('V2_BOSS_PRESSURE')),
     'No generic boss pressure script may replace the authored kit');
    threeWay.push({choice:chosen,result:first});
    if(process.env.EQ2_V19_PERMANENT_SENSITIVITY_PATH){
     const compiled=compileRealFrozenForgeActorV2(input.players[0],build,qa.source);
     assert.deepEqual(compiled.evidence,first.equipmentEvidence);
     const verified=verifyPersistedEnemyKitsV2(input.enemies,persisted);
     const baselineInput:CombatInput={...input,players:[compiled.actor],enemies:[...verified.enemies]};
     const scope={source:'server-persisted-v2' as const,version:2 as const,ruleset:persisted.ruleset,
      mode:'solo' as const,encounterId:persisted.encounterId,revision:persisted.revision,seed:persisted.seed,
      playerIds:[compiled.actor.id],enemyIds:persisted.enemyIds,bossIds:persisted.bossIds};
     const run=(caseInput:CombatInput)=>simulateCombat(caseInput,issueEnemyV2EngineAuthority(scope,caseInput,
      (_scope,digest)=>kit.verifyPersisted(persisted,digest)));
     const before=run(baselineInput);
     assert.deepEqual(before,first.combat,'baseline must reproduce pinned real source run');
     const effect=v19PermanentEffects[profile.region][CLASS_ROLES_V2[classId]];
     const actor=v19ApplyPermanentSensitivity(compiled.actor,effect);
     const scenario:CombatInput={...baselineInput,players:[actor]};
     const after=run(scenario);
     assert.deepEqual(after,run(scenario),'QA-only static effect counterfactual must replay');
     assert.deepEqual(run(baselineInput),before,'counterfactual cannot mutate source actor');
     const metrics=(fight:typeof before)=>({victory:fight.victory,reason:fight.reason,durationMs:fight.durationMs,
      damage:fight.players[0].damageDone,healing:fight.players[0].healingDone,hp:fight.players[0].hp});
     v19SensitivityRows.push({bossId:profile.id,classId,specIndex,strategy,channel:effect.channel,pct:effect.pct,
      baseline:metrics(before),candidate:metrics(after)});
    }
    if(process.env.EQ2_V18_TRACE_PATH)v18TraceRows.push({bossId:profile.id,classId,specIndex,strategy,actorId:qa.actor.id,events:first.combat.events,victory:first.combat.victory,durationMs:first.combat.durationMs});
    const freezing=JSON.stringify({
     items:first.equipmentEvidence.items,
     stages:first.equipmentEvidence.stages.afterFrozenBase,
     affixes:first.equipmentEvidence.affixSources,
    });
    if(strategy==='generic')originalFreeze=freezing;
    else assert.equal(freezing,originalFreeze,
     'Targeted skills must not replace genuine original Forge copies');
    if(strategy==='targeted'){
     // Original Forge's 15 proposed set bonuses are NOT equipped or applied.
     // This compares their authored counterplay intents to the six canonical
     // persisted regional boss scripts AND genuine combat-engine events.
     const setStudy=reviewOriginalForgeSetBossOpportunitiesV2(
      bossBase,persisted,first.combat);
     assert.equal(setStudy.bossId,profile.id);
     assert.equal(setStudy.rows.length,15);
     assert.equal(setStudy.actualSetEffectsApplied,0);
     assert.equal(setStudy.canAuthorizeCombat,false);
     assert.equal(setStudy.canGrantRewards,false);
     assert.equal(setStudy.releaseApproved,false);
     assert.ok(setStudy.rows.every(row=>
      row.appliesInCombat===false&&
      row.effectImplementationVerified===false&&
      row.approvedForBalance===false));
     assert.equal(
      setStudy.mechanicNotAuthoredCount+
      setStudy.authoredNotObservedCount+
      setStudy.opportunityObservedCount,15);
     originalForgeSetBossMatrixCount+=setStudy.rows.length;
     sourceSetBossOpportunities+=setStudy.opportunityObservedCount;
     authoredButUnseen+=setStudy.authoredNotObservedCount;
     sourceSetBossMechanicAbsent+=setStudy.mechanicNotAuthoredCount;
     bossSetOpportunityProfiles.add(profile.id);
     if(classId==='IRONWARDEN'&&specIndex===0){
      assert.throws(()=>reviewOriginalForgeSetBossOpportunitiesV2(
       bossBase,{...persisted,preparedEnemyDigest:'a'.repeat(64)},
       first.combat),/stored_kit_digest_mismatch/);
      assert.throws(()=>reviewOriginalForgeSetBossOpportunitiesV2(
       {...bossBase,id:'FAKE_BOSS'},persisted,first.combat),
       /must_be_single_verified_authored_boss/);
     }
    }
    realForgeAuthoredBossThreats+=first.combat.events.filter(e=>
     e.actorId===profile.id&&
      (e.type==='cast_start'||e.type==='status_apply'||e.type==='phase')).length;
    realForgeAuthoredBossRuns++;
   }
   const actualThreeway=reviewOriginalForgeBossThreeWayV2(threeWay);
   assert.equal(actualThreeway.bossId,profile.id);
   assert.equal(actualThreeway.playerId,qa.actor.id);
   assert.equal(actualThreeway.originalEquippedCopies,1);
   assert.equal(actualThreeway.frozenStatsIdentical,true);
   assert.equal(actualThreeway.metrics.length,3);
   assert.equal(actualThreeway.balancePassApproved,false);
   assert.equal(actualThreeway.sourceIsLiveAuthenticated,false);
   assert.equal(actualThreeway.canAuthorizeCombat,false);
   assert.equal(actualThreeway.canGrantRewards,false);
   assert.equal(actualThreeway.releaseApproved,false);
   assert.deepEqual(actualThreeway.metrics.map(row=>row.strategy),
    ['generic','targeted','alternative']);
   assert.ok(actualThreeway.metrics.every(row=>
    row.durationMs>=0&&row.playerDamageDone>=0&&row.bossFinalHp>=0));
   realOriginalBossThreewayComparisons++;
   comparableThreewayTactics+=actualThreeway.metrics.filter(
    row=>row.skillSelectionDiffersFromGeneric).length;
   originalThreewayOutcomes.set(actualThreeway.outcome,
    (originalThreewayOutcomes.get(actualThreeway.outcome)??0)+1);
   if(classId==='IRONWARDEN'&&specIndex===0){
    assert.throws(()=>reviewOriginalForgeBossThreeWayV2(
     threeWay.slice(0,2)),/exactly_three_authored_strategies/);
    sourceThreewayGuards++;
    assert.throws(()=>reviewOriginalForgeBossThreeWayV2([
     threeWay[1],threeWay[0],threeWay[2],
    ]),/unknown_or_unauthorized_source/);
    sourceThreewayGuards++;
    const swapped={...threeWay[2],result:{...threeWay[2].result,
     equipmentEvidence:{...threeWay[2].result.equipmentEvidence,
      items:[{...threeWay[2].result.equipmentEvidence.items[0],
       pieceId:'EQ2_FORGED_LEGACY_COPY'}],
     },
    }};
    assert.throws(()=>reviewOriginalForgeBossThreeWayV2([
     threeWay[0],threeWay[1],swapped,
    ]),/changed_gear_base_enemy_or_invalid_ledger_digest/);
    sourceThreewayGuards++;
    const stale={...threeWay[1],result:{...threeWay[1].result,
     equipmentEvidence:{...threeWay[1].result.equipmentEvidence,
      receiptDigest:threeWay[0].result.equipmentEvidence.receiptDigest,
     },
    }};
    if(JSON.stringify(threeWay[0].choice.activeSkills)!==
       JSON.stringify(threeWay[1].choice.activeSkills)){
     assert.throws(()=>reviewOriginalForgeBossThreeWayV2([
      threeWay[0],stale,threeWay[2],
     ]),/changed_skill_using_stale_receipt_digest/);
     sourceThreewayGuards++;
    }
   }
   sameForgeBossGroups.add(group);
   if(classId==='IRONWARDEN'&&specIndex===0){
    assert.throws(()=>simulateOriginalForgeAuthoredBossReviewV2(
     input,qa.build,qa.source,{...kit,verifyPersisted:()=>false},true),
     /enemy_v2|authority|persist/i);
    forgedRegionalChecks++;
    assert.throws(()=>simulateOriginalForgeAuthoredBossReviewV2(
     {...input,seed:'WRONG_ENCOUNTER_SEED'},qa.build,qa.source,kit,true),
     /encounter_actor_seed_or_boss_mismatch/);
    forgedRegionalChecks++;
    assert.throws(()=>simulateOriginalForgeAuthoredBossReviewV2(
     input,qa.build,qa.source,{...kit,snapshot:{...persisted,
      preparedEnemyDigest:'a'.repeat(64)}},true),/stored_kit_digest_mismatch/);
    forgedRegionalChecks++;
    assert.throws(()=>simulateOriginalForgeAuthoredBossReviewV2(
     input,qa.build,{...qa.source,claims:[]},kit,true),
     /invalid_hidden_v2|missing_hidden_v2_receipt|missing_exact_copy|claim/i);
    forgedRegionalChecks++;
    assert.throws(()=>simulateOriginalForgeAuthoredBossReviewV2(
     {...input,players:[qa.actor,qa.actor]},qa.build,qa.source,kit,true),
     /source_only_complete_solo_boss_required/);
    forgedRegionalChecks++;
   }
  }
 }
}
assert.equal(originalForgeSetBossMatrixCount,108*15);
assert.equal(bossSetOpportunityProfiles.size,6);
assert.ok(sourceSetBossOpportunities>0,
 'At least some reviewed original Forge set concepts match observed boss windows');
assert.ok(sourceSetBossMechanicAbsent>0,
 'Unsupported or unmatched original sets must be clearly reported');
console.log('PASS: 1620 reviewed 15-original-Forge-set × six-authored-boss × '+
 '18-class/spec opportunity classifications; observed '+sourceSetBossOpportunities+
 ', authored but unseen '+authoredButUnseen+
 ', mechanic absent '+sourceSetBossMechanicAbsent+
 '; ZERO set modifiers, boss kit grants, CP approvals or market actions');
assert.equal(realOriginalBossThreewayComparisons,108);
assert.equal([...originalThreewayOutcomes.values()].reduce((a,b)=>a+b,0),108);
assert.equal(realForgeAuthoredBossRuns,324);
if(process.env.EQ2_V19_PERMANENT_SENSITIVITY_PATH){
 assert.equal(v19SensitivityRows.length,324);
 writeFileSync(process.env.EQ2_V19_PERMANENT_SENSITIVITY_PATH,JSON.stringify({
  scope:'QA_ORIGINAL_SOURCE_STATIC_STAT_COUNTERFACTUAL',actualOwnedCandidateCopies:false,
  conditionalEffectsApplied:false,releaseApproved:false,rows:v19SensitivityRows}));
}
if(process.env.EQ2_V18_TRACE_PATH){
 assert.equal(v18TraceRows.length,324);
 writeFileSync(process.env.EQ2_V18_TRACE_PATH,JSON.stringify({scope:'QA_ORIGINAL_FORGE_BASELINE_TRACE_ONLY',effectApplied:false,rows:v18TraceRows}));
}
assert.equal(sourceThreewayGuards>=18,true);
console.log('PASS: 108 genuine original Forge + persisted six regional boss '+
 'equal-source stat three-way Skills comparisons, '+comparableThreewayTactics+
 ' non-generic skill choices, '+sourceThreewayGuards+
 ' stale receipt/forged gear/strategy guard tests; outcomes '+
 JSON.stringify(Object.fromEntries(originalThreewayOutcomes))+
 '; NO final CP or class/boss balance approval');
assert.equal(sameForgeBossGroups.size,108);
assert.equal(forgedRegionalChecks,30);
assert.ok(realForgeAuthoredBossThreats>0,
 'Actual regional boss casts/status/phase events must occur');
console.log('PASS: 324 original minted Forge Skills × 6 authentic persisted regional '+
 'Enemy V2 boss engine runs (108 generic/targeted/alternative triplets); '+
 realForgeAuthoredBossThreats+' boss mechanics and '+forgedRegionalChecks+
 ' invalid-source tests, zero grants; NOT approved final balance');
// --------------------------------------------------------------
console.log(JSON.stringify({scope:'PINNED_EQ2_FORGE_DRAFT_ONLY_NOT_REAL_DB',
 frozenExactCopySpecs:checked+extendedTiers,sourceItems:V2_SERVER_PIECES.length,originalForgeSetPieces:existingSetCopies.length,
 proposedUnissuableMembers:PLANNED_T1_T4_MEMBERS_V2.length,
 recipeRoutes:V2_SERVER_RECIPES.length,
 confirmedFrozenBaseCopies:actualFrozenPositive+extendedTiers,mappedRealForgeAffixes:mappedAffixes,
 partyMembers:part.combat.players.length,partyReplayEvents:part.combat.events.length,
 inventoryLedger:'QA_VERIFIER_ONLY',liveReleased:false,
 unresolved:['unmapped_affixes','set_bonus_reconciliation','approved_caps',
  'privileged_DB_custody','persistent_party_state','final_CP_weights','full_10_slot_source_reconciliation']}));

// Run the same independent adapter tests using verified original Forge actors.
{
 const rv=make('RAVAGER',0,'supported',4),iw=make('IRONWARDEN',0,'supported',4);
 const ravager=compileRealFrozenForgeActorV2(rv.actor,rv.build,rv.source).actor;
 const ironwarden=compileRealFrozenForgeActorV2(iw.actor,iw.build,iw.source).actor;
 runPrivateConditionalBoundaries(ravager,ironwarden,boss);
 const dk=make('DAWNKEEPER',0,'supported',4),sc=make('STONECALLER',0,'supported',4);
 runPrivateSupportBoundaries(compileRealFrozenForgeActorV2(dk.actor,dk.build,dk.source).actor,
  compileRealFrozenForgeActorV2(sc.actor,sc.build,sc.source).actor,ironwarden,ravager,boss);
}

if(process.env.EQ2_V21_MULTISLOT_PATH){
 const rows:unknown[]=[];
 const v22Rows:unknown[]=[];
 const v23Rows:unknown[]=[];
 const v24Rows:unknown[]=[];
 const cache=new Map<string,ReturnType<typeof makeV21Loadout>>();
 const qa=(classId:ClassIdV2,specIndex:0|1,tier:1|2|3|4,level:number)=>{
  const key=[classId,specIndex,tier,level].join(':');
  let row=cache.get(key);
  if(!row){row=makeV21Loadout(classId,specIndex,tier,level);cache.set(key,row);}
  return row;
 };
 for(const profile of exactBossProfiles){
  for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
   for(const specIndex of [0,1] as const){
    const loadout=qa(classId,specIndex,profile.forgeTier,profile.level);
    const spec=SPECIALIZATIONS_V2.filter(s=>s.classId===classId)[specIndex];
    for(const strategy of ['generic','targeted','alternative'] as const){
     const choice=selectReviewSkillLoadoutV2(classId,spec.id,loadout.actor,profile.id,strategy);
     const build:VerifiedSkillBuildV2={...loadout.build,selected:{...loadout.build.selected,activeSkills:choice.activeSkills}};
     const compiled=compileRealFrozenForgeActorV2(loadout.actor,build,loadout.source);
     assert.deepEqual(new Set(compiled.evidence.equippedInstanceIds),new Set(loadout.ids));
     for(const band of ['accessible','pressure'] as const){
      // Fixed explicit QA stat bands, not actual dungeon balance, identical
      // between class tactics within a region. Real authored boss scripts.
      const hp=(band==='accessible'?20000:60000)*(profile.region==='asterfall'?1:profile.region==='sunscar'?2:3);
      const ap=(band==='accessible'?100:200)*(profile.region==='asterfall'?1:profile.region==='sunscar'?2:3);
      const names:Readonly<Record<typeof profile.id,string>>={BOSS_EXP_ROOT:'Asterfall Root',BOSS_EXP_BELL:'Asterfall Bell',BOSS_EXP_SOLAR:'The Buried Heliarch',BOSS_EXP_SPHINX:'The Veiled Sphinx',BOSS_EXP_BELLBEAST:'The Bellbeast of Shiverlake',BOSS_EXP_CANTOR:'The Frozen Cantor'};
      const enemy:CombatantDefinition={...boss,id:profile.id,name:names[profile.id],level:profile.level,abilities:[],phases:undefined,
       stats:{...boss.stats,maxHp:hp,attackPower:ap}};
      const seed=['V21',profile.id,classId,specIndex,band].join('_');
      const proposed=prepareSoloEnemyKitsV2([enemy],{ruleset:ENEMY_V2_RULESET,region:profile.region,
       equipmentTier:profile.tier,encounterId:seed,serverSeed:seed});
      const persisted={...proposed,source:'server-persisted-v2' as const,revision:6};
      const verified=verifyPersistedEnemyKitsV2([enemy],persisted);
      const baselineInput:CombatInput={seed,players:[compiled.actor],enemies:[...verified.enemies],maxDurationMs:120000};
      const scope={source:'server-persisted-v2' as const,version:2 as const,ruleset:persisted.ruleset,
       mode:'solo' as const,encounterId:persisted.encounterId,revision:persisted.revision,seed:persisted.seed,
       playerIds:[compiled.actor.id],enemyIds:persisted.enemyIds,bossIds:persisted.bossIds};
      const run=(i:CombatInput)=>simulateCombat(i,issueEnemyV2EngineAuthority(scope,i,
       (_s,d)=>/^[0-9a-f]{64}$/.test(d)));
      const before=run(baselineInput);
      const effect=v19PermanentEffects[profile.region][CLASS_ROLES_V2[classId]];
      const after=run({...baselineInput,players:[v19ApplyPermanentSensitivity(compiled.actor,effect)]});
      assert.deepEqual(run(baselineInput),before,'V21 candidate never mutates original compiled source');
      if(strategy==='targeted')assert.deepEqual(run({...baselineInput,players:[v19ApplyPermanentSensitivity(compiled.actor,effect)]}),after);
      const metrics=(r:typeof before)=>({victory:r.victory,reason:r.reason,durationMs:r.durationMs,damage:r.players[0].damageDone,
       healing:r.players[0].healingDone,damageTaken:r.players[0].damageTaken,hp:r.players[0].hp,maxHp:r.players[0].definition.stats.maxHp,
       interrupts:r.players[0].interrupts,enemyHp:r.enemies[0].hp,enemyMaxHp:r.enemies[0].definition.stats.maxHp});
      if(process.env.EQ2_V22_CONDITIONAL_PATH&&classId==='RAVAGER'){
       const winter:Eq2PrivateHitIdV22=profile.region==='asterfall'?'EQ2_DUNGEON_ROOTBOUND_T2_WEAPON_RAVAGER':
        profile.region==='sunscar'?'EQ2_DUNGEON_OBSERVATORY_T4_WEAPON_RAVAGER':'EQ2_DUNGEON_SHIVERLAKE_T5_WEAPON_RAVAGER';
       const scenarios:readonly (readonly Eq2PrivateHitIdV22[])[]=profile.region==='frostmarch'?[[winter],['eq2_t5_avalanche:6'],[winter,'eq2_t5_avalanche:6']]:[[winter]];
       for(const ids of scenarios){
        const token=issueEq2PrivateHitQaV22(baselineInput,compiled.actor.id,ids,d=>/^[0-9a-f]{64}$/.test(d));
        const runCandidate=()=>simulateCombat(baselineInput,issueEnemyV2EngineAuthority(scope,baselineInput,
         (_s,d)=>/^[0-9a-f]{64}$/.test(d)),undefined,undefined,token);
        const changed=runCandidate();
        assert.deepEqual(changed,runCandidate(),'V22 conditional replay must recreate cooldown state');
        const activations=changed.events.filter(e=>e.type==='equipment_trait_trigger'&&e.detail==='private_qa_current_hit_only');
        assert.ok(activations.every(e=>e.actorId===compiled.actor.id&&e.targetId===profile.id&&e.amount!==undefined&&e.amount>=0));
        assert.deepEqual(run(baselineInput),before,'V22 must not mutate the source fixture');
        v22Rows.push({bossId:profile.id,region:profile.region,classId,specIndex,strategy,band,ids,
         equippedCopies:loadout.ids.length,baseline:metrics(before),candidate:metrics(changed),activations:activations.length,
         extraHpDamage:activations.reduce((n,e)=>n+(e.amount??0),0)});
       }
      }
      if(process.env.EQ2_V23_CHARGE_PATH&&classId==='RAVAGER'&&(profile.region==='asterfall'||profile.region==='frostmarch')){
       const idsList:readonly (readonly Eq2PrivateHitIdV22[])[]=profile.region==='asterfall'?
        [['eq2_dungeon_rootbound_t2_thornstrider:4']]:
        [['eq2_t5_avalanche:4'],['eq2_combo_t5_glacier_talons:2'],['eq2_t5_avalanche:4','eq2_combo_t5_glacier_talons:2']];
       for(const ids of idsList){
        const token=issueEq2PrivateHitQaV22(baselineInput,compiled.actor.id,ids,d=>/^[0-9a-f]{64}$/.test(d));
        const runCandidate=()=>simulateCombat(baselineInput,issueEnemyV2EngineAuthority(scope,baselineInput,
         (_s,d)=>/^[0-9a-f]{64}$/.test(d)),undefined,undefined,token);
        const changed=runCandidate();
        assert.deepEqual(changed,runCandidate(),'V23 charge state must reset on replay');
        const earned=changed.events.filter(e=>e.type==='equipment_trait_trigger'&&e.detail==='private_qa_charge_earned');
        const consumed=changed.events.filter(e=>e.type==='equipment_trait_trigger'&&e.detail==='private_qa_current_hit_only');
        const perId=ids.map(id=>({id,earned:earned.filter(e=>e.abilityId==='V2_QA_CHARGE:'+id).length,
         consumed:consumed.filter(e=>e.abilityId?.slice('V2_QA_HIT:'.length).split('+').includes(id)).length}));
        assert.ok(perId.every(x=>x.earned>=x.consumed));
        assert.deepEqual(run(baselineInput),before,'V23 charge state cannot mutate the original fixture');
        v23Rows.push({bossId:profile.id,region:profile.region,classId,specIndex,strategy,band,ids,equippedCopies:loadout.ids.length,
         baseline:metrics(before),candidate:metrics(changed),perId,extraHpDamage:consumed.reduce((n,e)=>n+(e.amount??0),0)});
       }
      }
      if(process.env.EQ2_V24_DEFENSE_PATH&&classId==='IRONWARDEN'&&profile.region!=='asterfall'){
       const idsList:readonly (readonly Eq2PrivateHitIdV22[])[]=profile.region==='sunscar'?
        [['eq2_dungeon_observatory_t4_helioguard:4']]:
        [['eq2_combo_t5_stonewinter_frame:2'],['eq2_dungeon_shiverlake_t5_rimevanguard:4'],['eq2_combo_t5_stonewinter_frame:2','eq2_dungeon_shiverlake_t5_rimevanguard:4']];
       for(const ids of idsList){
        const token=issueEq2PrivateHitQaV22(baselineInput,compiled.actor.id,ids,d=>/^[0-9a-f]{64}$/.test(d));
        const runCandidate=()=>simulateCombat(baselineInput,issueEnemyV2EngineAuthority(scope,baselineInput,
         (_s,d)=>/^[0-9a-f]{64}$/.test(d)),undefined,undefined,token);
        const changed=runCandidate();
        assert.deepEqual(changed,runCandidate(),'V24 defensive state must reset on replay');
        const earned=changed.events.filter(e=>e.type==='equipment_trait_trigger'&&e.detail==='private_qa_defense_earned');
        const applied=changed.events.filter(e=>e.type==='equipment_trait_trigger'&&e.detail==='private_qa_incoming_reduction');
        const perId=ids.map(id=>({id,earned:earned.filter(e=>e.abilityId==='V2_QA_DEFENSE_EARN:'+id).length,
         applied:applied.filter(e=>e.abilityId==='V2_QA_DEFENSE:'+id).length}));
        assert.ok(perId.every(x=>x.id==='eq2_dungeon_shiverlake_t5_rimevanguard:4'||x.earned>=x.applied));
        assert.deepEqual(run(baselineInput),before,'V24 defense state cannot mutate original source');
        v24Rows.push({bossId:profile.id,region:profile.region,classId,specIndex,strategy,band,ids,equippedCopies:loadout.ids.length,
         baseline:metrics(before),candidate:metrics(changed),perId,preventedHpDamage:applied.reduce((n,e)=>n+(e.amount??0),0)});
       }
      }
      rows.push({bossId:profile.id,region:profile.region,classId,specIndex,strategy,band,seed,targetTier:profile.forgeTier,
       targetLevel:profile.level,equippedCopies:loadout.ids.length,missing:loadout.missing,tiers:loadout.tiers,downgraded:loadout.downgraded,
       channel:effect.channel,pct:effect.pct,baseline:metrics(before),candidate:metrics(after)});
     }
    }
   }
  }
 }
 assert.equal(rows.length,648);
 writeFileSync(process.env.EQ2_V21_MULTISLOT_PATH,JSON.stringify({scope:'QA_ORIGINAL_FORGE_MULTISLOT_FIXED_DIFFICULTY',actualOwnedCandidateCopies:false,
  conditionalEffectsApplied:false,releaseApproved:false,rows}));
 if(process.env.EQ2_V22_CONDITIONAL_PATH){
  assert.equal(v22Rows.length,120);
  writeFileSync(process.env.EQ2_V22_CONDITIONAL_PATH,JSON.stringify({scope:'QA_ORIGINAL_FORGE_CURRENT_HIT_COUNTERFACTUAL',
   actualOwnedCandidateCopies:false,releaseApproved:false,rows:v22Rows}));
 }
 if(process.env.EQ2_V23_CHARGE_PATH){
  assert.equal(v23Rows.length,96);
  writeFileSync(process.env.EQ2_V23_CHARGE_PATH,JSON.stringify({scope:'QA_ORIGINAL_FORGE_ONE_USE_CHARGE_COUNTERFACTUAL',
   actualOwnedCandidateCopies:false,releaseApproved:false,rows:v23Rows}));
 }
 if(process.env.EQ2_V24_DEFENSE_PATH){
  assert.equal(v24Rows.length,96);
  writeFileSync(process.env.EQ2_V24_DEFENSE_PATH,JSON.stringify({scope:'QA_ORIGINAL_FORGE_INCOMING_DEFENSE_COUNTERFACTUAL',
   actualOwnedCandidateCopies:false,releaseApproved:false,rows:v24Rows}));
 }
}

if(process.env.EQ2_V21_PARTY_PATH){
 const rows:unknown[]=[];
 const teams:readonly (readonly ClassIdV2[])[]=[
  ['IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER'],
  ['BASTION','HEXWEAVER','KNIFE_DANCER','STONECALLER'],
  ['DREADGUARD','RAVAGER','HEXWEAVER','DAWNKEEPER'],
 ];
 const regions=[{id:'asterfall',tier:2,level:25},{id:'sunscar',tier:3,level:40},{id:'frostmarch',tier:4,level:60}] as const;
 for(const region of regions)for(const [teamIndex,team] of teams.entries())for(const specIndex of [0,1] as const){
  const sources=team.map(c=>makeV21Loadout(c,specIndex,region.tier,region.level));
  const allIds=sources.flatMap(s=>s.ids);
  assert.equal(new Set(allIds).size,allIds.length,'party must not share source copy');
  const compiled=sources.map(s=>compileRealFrozenForgeActorV2(s.actor,s.build,s.source));
  for(const band of ['accessible','pressure'] as const){
   // Generic controlled party workload; NOT authored regional solo boss
   // authority, since that authority explicitly permits only one actor.
   const mult=region.tier-1;
   const enemy:CombatantDefinition={...boss,id:'QA_V21_PARTY_PRESSURE_'+region.id,boss:true,level:region.level,
    stats:{...boss.stats,maxHp:(band==='accessible'?50000:150000)*mult,attackPower:(band==='accessible'?220:440)*mult}};
   const seed=['V21_PARTY',region.id,teamIndex,specIndex,band].join('_');
   const raw:CombatInput={seed,players:sources.map(s=>s.actor),enemies:[enemy],maxDurationMs:120000};
   const initial=simulateRealFrozenForgeCombatV2(raw,sources.map(s=>s.build),sources.map(s=>s.source),true);
   const input:CombatInput={...raw,players:compiled.map(x=>x.actor),enemies:initial.combat.enemies.map(e=>e.definition)};
   const before=simulateCombat(input);
   assert.deepEqual(before,initial.combat,'party counterfactual must reproduce original source baseline');
   const metrics=(r:typeof before)=>({victory:r.victory,reason:r.reason,durationMs:r.durationMs,
    damage:r.players.reduce((n,p)=>n+p.damageDone,0),healing:r.players.reduce((n,p)=>n+p.healingDone,0),
    damageTaken:r.players.reduce((n,p)=>n+p.damageTaken,0),surviving:r.players.filter(p=>p.alive).length,
    enemyHp:r.enemies[0].hp,players:r.players.map(p=>({id:p.definition.id,role:p.definition.role,hp:p.hp,maxHp:p.definition.stats.maxHp,
     damage:p.damageDone,healing:p.healingDone,damageTaken:p.damageTaken,interrupts:p.interrupts}))});
   for(const role of ['tank','damage','support'] as const){
    // Both damage members remain present; perturb only the first member of
    // the named role so comparisons represent one hypothetical set bonus.
    const selected=compiled.findIndex(p=>p.actor.role===role);
    assert.ok(selected>=0);
    const effect=v19PermanentEffects[region.id][role];
    const after=simulateCombat({...input,players:compiled.map((x,i)=>i===selected?v19ApplyPermanentSensitivity(x.actor,effect):x.actor)});
    assert.deepEqual(simulateCombat(input),before,'party counterfactual cannot mutate baseline');
    rows.push({region:region.id,targetTier:region.tier,targetLevel:region.level,teamIndex,classes:team,specIndex,band,seed,role,
     selectedClass:team[selected],channel:effect.channel,pct:effect.pct,
     sourceCoverage:sources.map(s=>({equippedCopies:s.ids.length,missing:s.missing,downgraded:s.downgraded,tiers:s.tiers})),
     baseline:metrics(before),candidate:metrics(after)});
   }
  }
 }
 assert.equal(rows.length,108);
 writeFileSync(process.env.EQ2_V21_PARTY_PATH,JSON.stringify({scope:'QA_ORIGINAL_FORGE_PARTY_CONTROLLED_PRESSURE',
  actualOwnedCandidateCopies:false,conditionalEffectsApplied:false,releaseApproved:false,rows}));
}

