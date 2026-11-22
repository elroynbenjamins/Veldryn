/**
 * HIDDEN / REVIEW ONLY: real Equipment 2.0 frozen Forge copy -> Combat 2.0.
 *
 * Exact Forge baseStats already include rarity and quality. Import them ONCE
 * after the class+Skills compiler; never route them through unscaled Combat
 * base definitions or multiply again. This module is not a public command,
 * payment/loot writer, production auth adapter, or final CP calculator.
 *
 * Until genuinely authenticated account-lock/custody reads exist, callers
 * must inject a private persistence verifier. A QA callback that returns true
 * is NOT a production authorization and must never be exposed as a route.
 */
import type {CombatInput,CombatantDefinition,CombatStats} from '../types';
import {simulateCombat} from '../engine';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import {compileEnemiesForCombatV2} from './enemy-bridge';
import {issueClassOnlyActorV2,type ApprovedClassBaselinePolicyV2} from './class-baseline';
import {compileServerSkillBuildV2,type VerifiedSkillBuildV2} from './skill-effects';
import {CLASS_NAMES_V2,serverBuildCatalogV2} from './skill-catalog';
import {CLASS_ROLES_V2,validateBuildV2,type ClassIdV2,type GearSlotV2} from './build-contract';
import {
 compileTrustedEquipmentAffixesV2,EQUIPMENT_AFFIXES_V2,
 type AppliedEquipmentAffixV2,type EquipmentAffixIdV2,
 type TrustedEquipmentItemAffixesV2,type ServerAffixPolicyV2,
} from './equipment-affixes';
import {
 v2ServerExactTemplateConsistent,v2ServerCreateExactTemplate,
 type V2ExactEquipmentTemplate,
} from '../../equipment/equipment-crafting-v2-instances';
import {v2ServerPiece,v2ServerRecipeAndPiece} from '../../equipment/equipment-crafting-v2-manifest';
import {
 V2_SERVER_AFFIX_RANGES,V2_SERVER_RARITY_BANDS,
 type V2Affix,
} from '../../equipment/equipment-crafting-v2-rolls';
import type {V2DraftItem,V2DraftReceipt} from '../../equipment/equipment-crafting-v2-transaction';
import type {V2CustodyCopy,V2CustodyState} from '../../equipment/equipment-crafting-v2-custody';

const map:Readonly<Partial<Record<V2Affix,EquipmentAffixIdV2>>>={
 armor:'defense_pct',maxHp:'max_hp_pct',ward:'ward_pp',
 critRate:'crit_rate_pp',critDamage:'crit_damage_pct',
 haste:'haste_pp',penetration:'penetration_pp',accuracy:'accuracy_pp',
};
// No false Potency->Hex, HealingPower->ClassHealing or AbilityDamage
// -> generic attack. Tenacity is not an executable V2 status-resistance yet.
const minLevel:Readonly<Record<V2ExactEquipmentTemplate['tier'],number>>={
 1:2,2:12,3:26,4:40,
};
export interface TrustedFrozenForgeCombatSourceV2{
 readonly actorId:string;
 readonly accountId:string;
 readonly characterId:string;
 readonly classBaselinePolicy:ApprovedClassBaselinePolicyV2;
 /** Actual hidden Forge minted-copy records, from privileged account state. */
 readonly items:readonly V2DraftItem[];
 /** The same account's exclusive EQ2 custody, not a client loadout. */
 readonly custody:V2CustodyState;
 /** Immutable claimed Forge receipts, one per selected copy. */
 readonly claims:readonly V2DraftReceipt[];
 /** Versioned Combat affix caps supplied by approved server policy only. */
 readonly affixPolicy:ServerAffixPolicyV2;
 /** Must independently validate locked, current server custody and claims. */
 readonly verifyPersisted:(digest:string)=>boolean;
}
export interface FrozenForgeEvidenceV2{
 readonly source:'EQ2_FROZEN_FORGE_PRE_SCALED_NO_DOUBLE_MULTIPLIER';
 readonly actorId:string;
 readonly receiptDigest:string;
 readonly equippedInstanceIds:readonly string[];
 readonly items:readonly {instanceId:string;pieceId:string;tier:number;
  rarity:string;quality:number;scaledBaseStats:{attack:number;defense:number;hp:number}}[];
 readonly stages:Readonly<{afterSkills:CombatStats;afterFrozenBase:CombatStats;
  afterForgeAffixes:CombatStats}>;
 readonly affixSources:readonly AppliedEquipmentAffixV2[];
 readonly setBonuses:'BLOCKED_PENDING_EXACT_EQ2_SET_RECONCILIATION';
 readonly unsupportedForgeAffixes:'REJECTED_NOT_IGNORED';
}
export interface FrozenForgeCombatResultV2{
 readonly combat:ReturnType<typeof simulateCombat>;
 readonly equipmentEvidence:readonly FrozenForgeEvidenceV2[];
 readonly enemyMechanicLabels:readonly string[];
}
const reject=(why:string):never=>{throw Error('combat_v2_frozen_forge_'+why);};
const same=(a:unknown,b:unknown)=>enemyV2SnapshotDigest(a)===enemyV2SnapshotDigest(b);
const round=(n:number)=>Math.round(n*1000000)/1000000;
const isId=(x:unknown):x is string=>typeof x==='string'&&
 x.length>0&&x.length<=128&&/^[A-Za-z0-9_:-]+$/.test(x);
const valid=(x:unknown)=>typeof x==='number'&&Number.isFinite(x);
const statsKeys:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy',
 'evasion','critChance','critMultiplier','haste',
];
/** An entire party must have exclusive immutable item identities. */
export function compileRealFrozenForgeActorV2(
 actor:CombatantDefinition,
 build:VerifiedSkillBuildV2,
 source:TrustedFrozenForgeCombatSourceV2,
):{actor:CombatantDefinition;evidence:FrozenForgeEvidenceV2}{
 if(!source||!isId(source.accountId)||!isId(source.characterId)||
   source.actorId!==actor.id||build.actor!==actor||
   typeof source.verifyPersisted!=='function'||
   !Array.isArray(source.items)||!Array.isArray(source.claims)||
   !source.custody||source.custody.accountId!==source.accountId||
   !Array.isArray(source.custody.copies)||!Array.isArray(source.custody.characters))
  reject('trusted_scope_missing');
 if(actor.effectGems?.length||actor.alchemyModifiers||actor.combatV2)
  reject('legacy_or_already_compiled_actor');
 if(!source.custody.characters.some(c=>c.id===source.characterId&&
    c.level===build.verified.level&&
    (c.classId===build.verified.classId||
     c.classId===CLASS_NAMES_V2[build.verified.classId])))
  reject('current_character_identity_mismatch');
 const catalog=serverBuildCatalogV2(build.ownedItemsById,build.setsById);
 const checked=validateBuildV2(build.verified,build.selected,catalog);
 if(!checked.valid)reject('skill_or_equipment_build_invalid:'+checked.issues.map(i=>i.code).join(','));
 const selected=Object.entries(build.selected.equipment) as [GearSlotV2,string][];
 if(!selected.length||selected.length>10)reject('empty_or_oversize_forge_equipment');
 if(new Set(selected.map(([,id])=>id)).size!==selected.length)
  reject('duplicate_worn_copy');
 // Any copy duplicated across Bank, other characters or the account ledger
 // must fail, even when it is not selected by this particular actor.
 const allIds=source.custody.copies.map(x=>x.instanceId);
 if(new Set(allIds).size!==allIds.length||new Set(source.items.map(x=>x.id)).size!==source.items.length)
  reject('duplicate_account_copy');
 if(source.items.some(x=>x.accountId!==source.accountId)||
    source.custody.copies.some(x=>x.accountId!==source.accountId))
  reject('cross_account_copy');
 const resolved:{copy:V2CustodyCopy;mint:V2DraftItem}[]=[];
 for(const [slot,id] of selected){
  const copies=source.custody.copies.filter(x=>x.instanceId===id);
  const minted=source.items.filter(x=>x.id===id);
  const claims=source.claims.filter(x=>x.response.kind==='claimed'&&x.response.instanceId===id);
  if(copies.length!==1||minted.length!==1||claims.length!==1)reject('missing_exact_copy_or_claim');
  const copy=copies[0],mint=minted[0],claim=claims[0];
  const item=mint.exactItem;
  if(copy.ownerCharacterId!==source.characterId||copy.location!=='equipped'||
     copy.equippedSlot!==slot||mint.ownerCharacterId!==source.characterId||
     copy.instanceId!==mint.id||!same(copy.item,item)||
     claim.response.kind!=='claimed'||claim.response.jobId!==mint.jobId||
     !same(claim.response.exactItem,item)||!same(claim.response.outcome,mint.outcome))
    reject('exact_copy_custody_claim_mismatch');
  if(!v2ServerExactTemplateConsistent(item)||item.slot!==slot||
     item.pieceId!==mint.outcome.pieceId)
    reject('unverified_forge_template');
  const piece=v2ServerPiece(item.pieceId),
   recipe=v2ServerRecipeAndPiece(mint.outcome.recipeId);
  if(!piece||!recipe||recipe.piece!==piece||
     mint.outcome.tier!==item.tier||
     !same(v2ServerCreateExactTemplate(piece,mint.outcome),item))
    reject('forge_manifest_roll_source_mismatch');
  if(build.verified.level<minLevel[item.tier]||
     piece.role!==CLASS_ROLES_V2[build.verified.classId]||
     (piece.classRestriction&&piece.classRestriction!==build.verified.classId))
    reject('forge_equipment_role_or_level_locked');
  const owned=build.ownedItemsById[id];
  if(!owned||owned.slot!==slot||owned.instanceId!==id||
     owned.tier!=='T'+item.tier||owned.setFamilyId||
     owned.requiredLevel!==minLevel[item.tier]||
     !owned.eligibleRoles?.includes(CLASS_ROLES_V2[build.verified.classId]))
    reject('source_build_catalog_mismatch');
  // Forge's 15 real set IDs and the draft 48 Combat sets are NOT yet one
  // authoritative effect catalogue. Never issue an imaginary bonus.
  if(item.setId)reject('set_source_bonus_unreconciled');
  if(item.gemSlots.length||item.enhancementRank!==0)
    reject('socket_or_enhancement_not_ready');
  resolved.push({copy,mint});
 }
 // The verifier must be attached to a real locked account snapshot in a
 // future privileged adapter, not to input JSON. No such adapter is mounted.
 const digest=enemyV2SnapshotDigest({
  source:'EQ2_FROZEN_FORGE_COMBAT_QA',accountId:source.accountId,
  characterId:source.characterId,actorId:actor.id,
  copiedItems:resolved.map(x=>x.mint).sort((a,b)=>a.id.localeCompare(b.id)),
  custody:resolved.map(x=>x.copy).sort((a,b)=>a.instanceId.localeCompare(b.instanceId)),
  claims:source.claims.filter(x=>x.response.kind==='claimed'&&
   resolved.some(y=>y.mint.id===x.response.instanceId))
    .sort((a,b)=>a.requestId.localeCompare(b.requestId)),
  build:build.selected,
 });
 if(!source.verifyPersisted(digest))reject('persisted_custody_not_verified');
 const classOnly=issueClassOnlyActorV2(actor,build.verified,source.classBaselinePolicy);
 const skilled=compileServerSkillBuildV2(true,{...build,actor:classOnly});
 const sum={attack:0,defense:0,hp:0};
 for(const {mint} of resolved){
  const s=mint.exactItem.baseStats;
  for(const key of ['attack','defense','hp'] as const){
   if(!valid(s[key])||s[key]<0)reject('invalid_exact_frozen_stat');
   sum[key]+=s[key];
  }
 }
 const baseStats:CombatStats={...skilled.stats,
  maxHp:round(skilled.stats.maxHp+sum.hp),
  attackPower:round(skilled.stats.attackPower+sum.attack),
  defense:round(skilled.stats.defense+sum.defense),
 };
 if(statsKeys.some(k=>!valid(baseStats[k])||baseStats[k]<0))
  reject('nonfinite_frozen_stats');
 // The legacy resolver is intentionally NOT called here: that path requires
 // unscaled definitions and would multiply Forge rarity/quality a second time.
 const baseActor:CombatantDefinition={...skilled,stats:baseStats,
  tags:[...(skilled.tags??[]),'combat-v2-gear-base-resolved']};
 const affixRows:TrustedEquipmentItemAffixesV2[]=resolved.map(({mint})=>{
  const item=mint.exactItem;
  return {instanceId:mint.id,slot:item.slot,tier:'T'+item.tier,
   rarity:item.rarity,quality:item.quality,affixes:item.affixes.map(roll=>{
    const id=map[roll.stat];
    if(!id)reject('forge_affix_effect_unimplemented:'+roll.stat);
    if(!EQUIPMENT_AFFIXES_V2[id].slots.includes(item.slot))
     reject('forge_combat_affix_slot_policy_conflict:'+roll.stat+':'+item.slot);
    const range=V2_SERVER_AFFIX_RANGES[roll.stat][item.tier-1];
    if(!range||roll.percent<range[0]-1e-7||roll.percent>range[1]+1e-7)
     reject('forge_affix_range_mismatch');
    return {id,value:round(roll.percent/100)};
   })};
 });
 // No Combat re-roll, re-rarity, re-quality, Potency reinterpretation, or
 // unapproved proc is used. Forge's real locked percentage values win.
 const affixes=compileTrustedEquipmentAffixesV2(baseActor,affixRows,
  source.affixPolicy,true);
 const evidence:FrozenForgeEvidenceV2={
  source:'EQ2_FROZEN_FORGE_PRE_SCALED_NO_DOUBLE_MULTIPLIER',
  actorId:actor.id,receiptDigest:digest,
  equippedInstanceIds:resolved.map(x=>x.mint.id),
  items:resolved.map(x=>({
   instanceId:x.mint.id,pieceId:x.mint.exactItem.pieceId,
   tier:x.mint.exactItem.tier,rarity:x.mint.exactItem.rarity,
   quality:x.mint.exactItem.quality,
   scaledBaseStats:{...x.mint.exactItem.baseStats},
  })),
  stages:{afterSkills:{...skilled.stats},afterFrozenBase:{...baseStats},
   afterForgeAffixes:{...affixes.actor.stats}},
  affixSources:affixes.sources,
  setBonuses:'BLOCKED_PENDING_EXACT_EQ2_SET_RECONCILIATION',
  unsupportedForgeAffixes:'REJECTED_NOT_IGNORED',
 };
 return {actor:affixes.actor,evidence};
}
/** 1-4 individual Combat V2 actors, no traits/dungeon persistent state yet. */
export function simulateRealFrozenForgeCombatV2(
 input:CombatInput,builds:readonly VerifiedSkillBuildV2[],
 sources:readonly TrustedFrozenForgeCombatSourceV2[],
 serverEnabled=false,
):FrozenForgeCombatResultV2{
 if(!serverEnabled)reject('release_gate_off');
 if(!Array.isArray(input.players)||!input.players.length||
    input.players.length>4||builds.length!==input.players.length||
    sources.length!==input.players.length||
    (input.initialPlayerState&&Object.keys(input.initialPlayerState).length))
  reject('complete_new_encounter_required');
 const seenActors=new Set<string>(),seenIds=new Set<string>();
 const compiled=input.players.map(actor=>{
  if(seenActors.has(actor.id))reject('duplicate_party_actor');
  seenActors.add(actor.id);
  const matches=builds.filter(x=>x.actor===actor);
  const sourceMatches=sources.filter(s=>s.actorId===actor.id);
  if(matches.length!==1||sourceMatches.length!==1)
   reject('party_actor_source_mismatch');
  const source=sourceMatches[0];
  for(const id of Object.values(matches[0].selected.equipment)){
   if(seenIds.has(id))reject('cross_character_worn_copy');
   seenIds.add(id);
  }
  return compileRealFrozenForgeActorV2(actor,matches[0],source);
 });
 const enemies=compileEnemiesForCombatV2(input.enemies,true);
 return {
  combat:simulateCombat({...input,players:compiled.map(x=>x.actor),
   enemies:[...enemies.enemies]}),
  equipmentEvidence:compiled.map(x=>x.evidence),
  enemyMechanicLabels:enemies.mechanicLabels,
 };
}
