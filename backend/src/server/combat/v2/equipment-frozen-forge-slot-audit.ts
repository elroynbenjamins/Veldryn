/**
 * HIDDEN 2.0 REVIEW ONLY: audit the ACTUAL 169-template Forge manifest
 * against the ten real Combat equipment slots and the original Forge RNG.
 *
 * This is source compatibility evidence, NOT a full 10-copy custody receipt,
 * authenticated inventory read, Combat Power policy or set-bonus authorizer.
 * Never import into a public/mobile/Edge handler or use to mint equipment.
 */
import {V2_SERVER_PIECES,V2_SERVER_RECIPES,v2ServerPiece}
 from '../../equipment/equipment-crafting-v2-manifest';
import {V2_SERVER_RARITY_BANDS,v2ServerAuthoredAffixChoices,
 type V2Tier,type V2Affix} from '../../equipment/equipment-crafting-v2-rolls';
import {CLASS_ROLES_V2,GEAR_SLOTS_V2,type ClassIdV2,type GearSlotV2}
 from './build-contract';
import {CLASS_NAMES_V2} from './skill-catalog';
import {EQ2_COMBAT_FROZEN_AFFIX_MAP_V2} from './equipment-frozen-forge-bridge';
import {EQUIPMENT_AFFIXES_V2} from './equipment-affixes';

export type ForgeSlotReadinessBlockerV2=
 'NO_CLASS_ELIGIBLE_FORGE_TEMPLATE'|'NO_COMPATIBLE_FORGE_AFFIX'|
 'FORGE_RARITY_ROLL_COUNT_EXCEEDS_ELIGIBLE_AFFIX_POOL'|
 'FORGE_ROLE_RNG_MAY_PRODUCE_UNSUPPORTED_OR_OFFSLOT_AFFIX';
export interface ForgeSlotSourceCellV2{
 readonly classId:ClassIdV2;
 readonly tier:V2Tier;
 readonly slot:GearSlotV2;
 /** A 2H or paired weapon occupies the offhand budget without another copy. */
 readonly reservedByTwoHandOrPairedWeapon:boolean;
 readonly requiredPhysicalCopy:boolean;
 readonly sourceCoverage:'present'|'reserved_offhand'|'missing_required';
 /** Proposed policy action only: not a permission to mint or rewrite old rolls. */
 readonly compatibilityAction:'none_reserved'|'missing_source'|
  'author_role_slot_affixes'|'reconcile_max_rarity_rolls'|
  'restrict_unapproved_rng_candidates'|'await_signed_provenance';
 readonly eligibleSourcePieceIds:readonly string[];
 readonly exactForgeCompatibleAffixes:readonly V2Affix[];
 readonly blockedOrOffSlotForgeAffixes:readonly V2Affix[];
 readonly maximumAuthoredAffixRolls:number;
 readonly possibleAtMaximumRollCount:boolean;
 readonly blockers:readonly ForgeSlotReadinessBlockerV2[];
 readonly itemCustodyVerified:false;
 readonly combatEffectsActivated:false;
}
export interface ForgeTenSlotAuditV2{
 readonly scope:'EQ2_TEN_SLOT_SOURCE_AUDIT_NO_ITEM_AUTHORITY';
 readonly releaseReady:false;
 readonly slotCount:10;
 readonly authoredForgeTemplates:169;
 readonly authoredForgeRoutes:338;
 readonly classTierSlotCells:360;
 readonly setBonusesActivated:0;
 readonly actualPersistedCopiesExamined:0;
 readonly cells:readonly ForgeSlotSourceCellV2[];
 readonly cellsMissingTemplates:number;
 readonly cellsReservedByTwoHandOrPairedWeapon:number;
 readonly cellsMissingRequiredTemplates:number;
 readonly cellsWithNoCompatibleAffixOnPhysicalSlots:number;
 readonly cellsWithUnsafeRngCandidateOnPhysicalSlots:number;
 readonly cellsWithInsufficientMaximumRollPoolOnPhysicalSlots:number;
 readonly cellsWithNoCompatibleAffix:number;
 readonly cellsWithUnsafeRngCandidate:number;
 readonly cellsWithInsufficientMaximumRollPool:number;
}
const tiers=[1,2,3,4] as const;
function fail(why:string):never{throw Error('eq2_ten_slot_source_audit_'+why);}
export function auditRealForgeTenSlotsV2():ForgeTenSlotAuditV2{
 if(V2_SERVER_PIECES.length!==169||V2_SERVER_RECIPES.length!==338||
    GEAR_SLOTS_V2.length!==10||
    V2_SERVER_RARITY_BANDS.length!==6||
    new Set(V2_SERVER_PIECES.map(p=>p.id)).size!==169)
  fail('canonical_forge_catalogue_changed');
 // Every source inventory template needs both real canonical recipe routes;
 // this does not make those routes live or their inputs available.
 for(const piece of V2_SERVER_PIECES){
  if(v2ServerPiece(piece.id)!==piece||
     V2_SERVER_RECIPES.filter(r=>r.pieceId===piece.id&&
      r.tier===piece.tier&&r.route==='foundation').length!==1||
     V2_SERVER_RECIPES.filter(r=>r.pieceId===piece.id&&
      r.tier===piece.tier&&r.route==='alternate').length!==1)
   fail('piece_without_exact_route_pair');
 }
 const cells:ForgeSlotSourceCellV2[]=[];
 for(const classId of Object.keys(CLASS_ROLES_V2) as ClassIdV2[]){
  const role=CLASS_ROLES_V2[classId];
  for(const tier of tiers){
   const classWeapons=V2_SERVER_PIECES.filter(p=>p.tier===tier&&
    p.role===role&&p.slot==='weapon'&&
    (p.classRestriction===classId||
     p.classRestriction===CLASS_NAMES_V2[classId]));
   if(classWeapons.length!==1||
      !['one','two','dual'].includes(classWeapons[0].hands??''))
    fail('class_weapon_grip_unverifiable');
   const occupiesOffhand=classWeapons[0].hands!=='one';
   const maxRolls=Math.max(...V2_SERVER_RARITY_BANDS.map(b=>
    tier>=3?b.affixesHighTier:b.affixesLowTier));
   for(const slot of GEAR_SLOTS_V2){
    const sources=V2_SERVER_PIECES.filter(p=>
     p.tier===tier&&p.role===role&&p.slot===slot&&
     (!p.classRestriction||p.classRestriction===classId||
      p.classRestriction===CLASS_NAMES_V2[classId]));
    const reservedByTwoHandOrPairedWeapon=slot==='offhand'&&occupiesOffhand;
    if(reservedByTwoHandOrPairedWeapon&&sources.length)
     fail('conflicting_offhand_source_for_two_hand');
    const authored=v2ServerAuthoredAffixChoices(role,slot);
    const compatible=authored.filter(source=>{
     const mapped=EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[source];
     return Boolean(mapped&&EQUIPMENT_AFFIXES_V2[mapped].slots.includes(slot));
    });
    const excluded=authored.filter(source=>!compatible.includes(source));
    const blockers:ForgeSlotReadinessBlockerV2[]=[];
    if(sources.length===0&&!reservedByTwoHandOrPairedWeapon)
     blockers.push('NO_CLASS_ELIGIBLE_FORGE_TEMPLATE');
    if(compatible.length===0)blockers.push('NO_COMPATIBLE_FORGE_AFFIX');
    if(compatible.length<maxRolls)
     blockers.push('FORGE_RARITY_ROLL_COUNT_EXCEEDS_ELIGIBLE_AFFIX_POOL');
    if(excluded.length)
     blockers.push('FORGE_ROLE_RNG_MAY_PRODUCE_UNSUPPORTED_OR_OFFSLOT_AFFIX');
    const sourceCoverage=sources.length?'present':
     reservedByTwoHandOrPairedWeapon?'reserved_offhand':'missing_required';
    const compatibilityAction:ForgeSlotSourceCellV2['compatibilityAction']=
     sourceCoverage==='reserved_offhand'?'none_reserved':
     sourceCoverage==='missing_required'?'missing_source':
     !compatible.length?'author_role_slot_affixes':
     compatible.length<maxRolls?'reconcile_max_rarity_rolls':
     excluded.length?'restrict_unapproved_rng_candidates':
     'await_signed_provenance';
    cells.push({classId,tier,slot,
     reservedByTwoHandOrPairedWeapon,
     requiredPhysicalCopy:!reservedByTwoHandOrPairedWeapon,
     sourceCoverage,compatibilityAction,
     eligibleSourcePieceIds:sources.map(s=>s.id).sort(),
     exactForgeCompatibleAffixes:compatible,
     blockedOrOffSlotForgeAffixes:excluded,
     maximumAuthoredAffixRolls:maxRolls,
     possibleAtMaximumRollCount:sources.length>0&&compatible.length>=maxRolls,
     blockers,itemCustodyVerified:false,combatEffectsActivated:false});
   }
  }
 }
 if(cells.length!==360)fail('ten_slot_matrix_incomplete');
 return {
  scope:'EQ2_TEN_SLOT_SOURCE_AUDIT_NO_ITEM_AUTHORITY',
  releaseReady:false,slotCount:10,authoredForgeTemplates:169,
  authoredForgeRoutes:338,classTierSlotCells:360,
  setBonusesActivated:0,actualPersistedCopiesExamined:0,cells,
  cellsMissingTemplates:cells.filter(c=>!c.eligibleSourcePieceIds.length).length,
  cellsReservedByTwoHandOrPairedWeapon:cells.filter(c=>
   c.sourceCoverage==='reserved_offhand').length,
  cellsMissingRequiredTemplates:cells.filter(c=>
   c.sourceCoverage==='missing_required').length,
  cellsWithNoCompatibleAffixOnPhysicalSlots:cells.filter(c=>
   c.sourceCoverage==='present'&&!c.exactForgeCompatibleAffixes.length).length,
  cellsWithUnsafeRngCandidateOnPhysicalSlots:cells.filter(c=>
   c.sourceCoverage==='present'&&c.blockedOrOffSlotForgeAffixes.length>0).length,
  cellsWithInsufficientMaximumRollPoolOnPhysicalSlots:cells.filter(c=>
   c.sourceCoverage==='present'&&
   c.exactForgeCompatibleAffixes.length<c.maximumAuthoredAffixRolls).length,
  cellsWithNoCompatibleAffix:cells.filter(c=>!c.exactForgeCompatibleAffixes.length).length,
  cellsWithUnsafeRngCandidate:cells.filter(c=>c.blockedOrOffSlotForgeAffixes.length>0).length,
  cellsWithInsufficientMaximumRollPool:cells.filter(c=>
   c.exactForgeCompatibleAffixes.length<c.maximumAuthoredAffixRolls).length,
 };
}
