/**
 * HIDDEN: actual Equipment 2.0 Forge manifest/roll/exact-copy -> Combat 2.0.
 * Strictly QA mock custody verification; NOT real authenticated DB or live.
 */
import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../content/launch-combat';
import type {CombatantDefinition,CombatInput,CombatStats} from '../../types';
import {
 CLASS_NAMES_V2,SKILL_IDENTITIES_V2,SPECIALIZATIONS_V2,
} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {EQUIPMENT_AFFIXES_V2,type ServerAffixPolicyV2} from '../equipment-affixes';
import {
 compileRealFrozenForgeActorV2,simulateRealFrozenForgeCombatV2,
 EQ2_COMBAT_FROZEN_AFFIX_MAP_V2,type TrustedFrozenForgeCombatSourceV2,
} from '../equipment-frozen-forge-bridge';
import {
 V2_SERVER_PIECES,V2_SERVER_RECIPES,v2ServerPiece,v2ServerRecipeAndPiece,
} from '../../../equipment/equipment-crafting-v2-manifest';
import {
 draftEquipmentV2Outcome,V2_SERVER_RARITY_BANDS,
 type V2DraftRollOutcome,
} from '../../../equipment/equipment-crafting-v2-rolls';
import {
 v2ServerCreateExactTemplate,v2ServerExactTemplateConsistent,
 type V2ExactEquipmentTemplate,
} from '../../../equipment/equipment-crafting-v2-instances';
import type {V2DraftItem,V2DraftReceipt} from '../../../equipment/equipment-crafting-v2-transaction';
import type {V2CustodyCopy} from '../../../equipment/equipment-crafting-v2-custody';
import type {VerifiedSkillBuildV2} from '../skill-effects';
import {
 PLANNED_T1_T4_SETS_V2,PLANNED_T1_T4_MEMBERS_V2,
} from '../equipment-expanded-launch-registry';

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
  wardPp:1,shieldStrengthPct:1,hexPotencyPct:1},
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
 assert.ok(piece&&recipe,'exact canonical EQ2 item/recipe missing '+pieceId);
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
 assert.ok(piece);
 return (roll:V2DraftRollOutcome)=>roll.affixes.every(a=>{
  const id=EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[a.stat];
  return Boolean(id&&EQUIPMENT_AFFIXES_V2[id].slots.includes(piece.slot));
 });
}
const names:Readonly<Record<'tank'|'damage'|'support',string>>={
 tank:'EQ2_SOLO_FIELDBORN_STEEL_GREAVES',
 damage:'EQ2_EXP_T1_DAMAGE_RING',
 support:'EQ2_SOLO_FIELDBORN_PRAYER_HOOD',
};
function make(classId:ClassIdV2,specIndex:0|1,kind:'supported'|'unsupported'|'offslot'|'set'='supported'){
 const role=CLASS_ROLES_V2[classId];
 const pieceId=kind==='set'?'EQ2_FIELDBORN_GUARD_HELMET':
  role==='tank'?names.tank:role==='damage'?names.damage:names.support;
 const selection=generated(pieceId,kind==='supported'?eligible(pieceId):
  kind==='unsupported'?roll=>roll.affixes.length>0&&!EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[roll.affixes[0].stat]:
  kind==='offslot'?roll=>roll.affixes.length>0&&
   Boolean(EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[roll.affixes[0].stat])&&
   !EQUIPMENT_AFFIXES_V2[EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[roll.affixes[0].stat]!]
    .slots.includes(v2ServerPiece(pieceId)!.slot):()=>true);
 const {roll,exact,profession}=selection;
 const actor={...launchPlayer(CLASS_NAMES_V2[classId],35),
  id:'QA_EQ2_'+classId+'_'+specIndex};
 const copyId='QA_EQ2_COPY_'+classId+'_'+specIndex,
  accountId='QA_ACCOUNT_'+classId+'_'+specIndex,
  characterId='QA_CHARACTER_'+classId+'_'+specIndex;
 const claimRequestId='QA_CLAIM_'+classId+'_'+specIndex;
 const mint:V2DraftItem={id:copyId,accountId,ownerCharacterId:characterId,
  createdAtMs:3000,jobId:'QA_CRAFT_'+classId+'_'+specIndex,
  outcome:roll,exactItem:exact};
 const claim:V2DraftReceipt={requestId:claimRequestId,
  commandFingerprint:'QA_REVIEW_FIXTURE_NEVER_ACCEPTED_FOR_PAYMENT',
  response:{kind:'claimed',jobId:mint.jobId,instanceId:mint.id,
   exactItem:exact,outcome:roll,profession,xpAwarded:0,version:5}};
 const custody:V2CustodyCopy={instanceId:copyId,accountId,
  ownerCharacterId:characterId,location:'equipped',equippedSlot:exact.slot,
  item:exact,locked:false,favorite:false};
 const skill=SKILL_IDENTITIES_V2.filter(s=>s.classId===classId).slice(0,2);
 const spec=SPECIALIZATIONS_V2.filter(s=>s.classId===classId)[specIndex];
 const build:VerifiedSkillBuildV2={
  actor,verified:{classId,level:35,ownedInstanceIds:new Set([copyId])},
  selected:{specializationId:spec.id,equipment:{[exact.slot]:copyId},
   activeSkills:skill.map(s=>({skillId:s.id,variantId:s.variants[0].id})),
   talentRanks:{},signaturePassiveIds:[],capstoneId:null},
  ownedItemsById:{[copyId]:{instanceId:copyId,slot:exact.slot,
   tier:'T'+exact.tier,requiredLevel:2,eligibleRoles:[role]}},
  setsById:{},
 };
 const classStats={...actor.stats};
 const source:TrustedFrozenForgeCombatSourceV2={
  actorId:actor.id,accountId,characterId,
  items:[mint],claims:[claim],
  custody:{accountId,characters:[{id:characterId,classId,level:35}],copies:[custody]},
  classBaselinePolicy:{version:'QA_LEVEL_ONLY_REAL_EQ2_ITEMS',profiles:{
   [classId]:{classId,minLevel:1,maxLevel:75,statsAtLevel:()=>({...classStats}),
    abilities:actor.abilities,basicAttackMs:actor.basicAttackMs,
    basicAttackCoeff:actor.basicAttackCoeff},
  }},
  affixPolicy:qaCaps,
  verifyPersisted:(digest:string)=>/^[0-9a-f]{64}$/.test(digest),
 };
 return {actor,build,source,mint,exact,claim,custody};
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
const denied={...initial.source,verifyPersisted:()=>false};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,denied),/persisted_custody_not_verified/);
const banked={...initial.source,custody:{...initial.source.custody,
 copies:initial.source.custody.copies.map(x=>({...x,location:'bank' as const,
  equippedSlot:undefined,ownerCharacterId:null}))}};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,banked),/exact_copy_custody_claim_mismatch/);
const duplicate={...initial.source,custody:{...initial.source.custody,
 copies:[...initial.source.custody.copies,...initial.source.custody.copies]}};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,duplicate),/duplicate_account_copy/);
const forged={...initial.source,items:initial.source.items.map(item=>({
 ...item,exactItem:{...item.exactItem,
  baseStats:{...item.exactItem.baseStats,attack:item.exactItem.baseStats.attack+2000}},
}))};
assert.throws(()=>compileRealFrozenForgeActorV2(
 initial.actor,initial.build,forged),/exact_copy_custody_claim_mismatch/);
const copiedGear={...qaTeam[1].build,
 selected:{...qaTeam[1].build.selected,equipment:{[qaTeam[1].exact.slot]:initial.mint.id}}};
assert.throws(()=>simulateRealFrozenForgeCombatV2(input,[
 qaTeam[0].build,copiedGear,...qaTeam.slice(2).map(x=>x.build)],
 qaTeam.map(x=>x.source),true),/cross_character_worn_copy/);
const setItem=make('IRONWARDEN',0,'set');
assert.throws(()=>compileRealFrozenForgeActorV2(
 setItem.actor,setItem.build,setItem.source),/set_source_bonus_unreconciled/,
 'never invent 48-set or preapproved Forge set bonuses');
const offslot=make('HEXWEAVER',1,'offslot');
assert.throws(()=>compileRealFrozenForgeActorV2(
 offslot.actor,offslot.build,offslot.source),
 /forge_combat_affix_slot_policy_conflict/,
 'Forge 30% off-slot roll must not violate Combat 2.0 slot eligibility');
const unsupported=make('HEXWEAVER',1,'unsupported');
assert.throws(()=>compileRealFrozenForgeActorV2(
 unsupported.actor,unsupported.build,unsupported.source),
 /forge_affix_effect_unimplemented/,'no generic Potency, Tenacity or Ability Damage reinterpretation');
console.log(JSON.stringify({scope:'PINNED_EQ2_FORGE_DRAFT_ONLY_NOT_REAL_DB',
 frozenExactCopySpecs:checked,sourceItems:V2_SERVER_PIECES.length,originalForgeSetPieces:existingSetCopies.length,
 proposedUnissuableMembers:PLANNED_T1_T4_MEMBERS_V2.length,
 recipeRoutes:V2_SERVER_RECIPES.length,
 confirmedFrozenBaseCopies:actualFrozenPositive,mappedRealForgeAffixes:mappedAffixes,
 partyMembers:part.combat.players.length,partyReplayEvents:part.combat.events.length,
 inventoryLedger:'QA_VERIFIER_ONLY',liveReleased:false,
 unresolved:['unmapped_affixes','set_bonus_reconciliation','approved_caps',
  'privileged_DB_custody','persistent_party_state','final_CP_weights']}));