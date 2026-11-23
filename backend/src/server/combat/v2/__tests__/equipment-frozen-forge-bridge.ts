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
import {prepareSoloEnemyKitsV2} from '../enemy-kit-composer';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';
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
 originalPieceId?:string,uniqueTag?:string,forcedLevel?:number){
 const role=CLASS_ROLES_V2[classId];
 const pieceId=originalPieceId??(kind==='set'?
  (specIndex===0?'EQ2_FIELDBORN_GUARD_HELMET':'EQ2_FIELDBORN_GUARD_CHEST'):
  tierItems[tier][role]);
 const selection=generated(pieceId,kind==='supported'?eligible(pieceId):
  kind==='unsupported'?roll=>roll.affixes.length>0&&!EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[roll.affixes[0].stat]:
  kind==='offslot'?roll=>roll.affixes.length>0&&
   Boolean(EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[roll.affixes[0].stat])&&
   !EQUIPMENT_AFFIXES_V2[EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[roll.affixes[0].stat]!]
    .slots.includes(v2ServerPiece(pieceId)!.slot):()=>true);
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
let realForgeAuthoredBossRuns=0,realForgeAuthoredBossThreats=0;
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
   for(const strategy of ['generic','targeted'] as const){
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
    const freezing=JSON.stringify({
     items:first.equipmentEvidence.items,
     stages:first.equipmentEvidence.stages.afterFrozenBase,
     affixes:first.equipmentEvidence.affixSources,
    });
    if(strategy==='generic')originalFreeze=freezing;
    else assert.equal(freezing,originalFreeze,
     'Targeted skills must not replace genuine original Forge copies');
    realForgeAuthoredBossThreats+=first.combat.events.filter(e=>
     e.actorId===profile.id&&
      (e.type==='cast_start'||e.type==='status_apply'||e.type==='phase')).length;
    realForgeAuthoredBossRuns++;
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
assert.equal(realForgeAuthoredBossRuns,216);
assert.equal(sameForgeBossGroups.size,108);
assert.equal(forgedRegionalChecks,30);
assert.ok(realForgeAuthoredBossThreats>0,
 'Actual regional boss casts/status/phase events must occur');
console.log('PASS: 216 original minted Forge Skills × 6 authentic persisted regional '+
 'Enemy V2 boss engine runs (108 generic/targeted pairs); '+
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