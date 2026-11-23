/**
 * HIDDEN V2 SOURCE REVIEW ONLY — proposed new-mint Forge role/slot affix pool.
 *
 * This module NEVER samples RNG, changes the original Forge draft generator,
 * rebalances stat magnitudes, creates receipts or authorizes combat. The
 * source-authoritative mint policy must be versioned, signed/approved and
 * implemented separately; legacy copies retain their original roll bytes.
 */
import {V2_SERVER_PIECES,V2_SERVER_RECIPES}
 from '../../equipment/equipment-crafting-v2-manifest';
import {V2_SERVER_AFFIX_RANGES,V2_SERVER_RARITY_BANDS,
 v2ServerAuthoredAffixChoices,
 type V2Affix,type V2Role,type V2Slot}
 from '../../equipment/equipment-crafting-v2-rolls';
import {EQ2_COMBAT_FROZEN_AFFIX_MAP_V2}
 from './equipment-frozen-forge-bridge';
import {EQUIPMENT_AFFIXES_V2}
 from './equipment-affixes';
import {CLASS_ROLES_V2} from './build-contract';
import {auditRealForgeTenSlotsV2}
 from './equipment-frozen-forge-slot-audit';

export const FORGE_AFFIX_POOL_RECONCILIATION_REVIEW_VERSION_V2=
 'eq2-new-mint-affix-pool-review-20261123-unreleased' as const;

/**
 * Role-themed tie-breaks for possible new eligibility, NOT RNG weights.
 * Existing Forge role candidates that are legal in the Combat slot take
 * precedence. This is design evidence, not final approval of cross-role rolls.
 */
const ROLE_REVIEW_PRIORITY:Readonly<Record<V2Role,readonly V2Affix[]>>={
 tank:['armor','maxHp','ward','tenacity','haste','accuracy','abilityDamage',
  'critRate','penetration','healingPower','critDamage'],
 damage:['critRate','critDamage','haste','penetration','abilityDamage',
  'accuracy','maxHp','armor','ward','tenacity','healingPower'],
 support:['healingPower','ward','maxHp','tenacity','haste','armor','accuracy',
  'abilityDamage','critRate','penetration','critDamage'],
};

export interface ForgeProposedRoleSlotAffixesV2{
 readonly role:V2Role;
 readonly slot:V2Slot;
 readonly originalRoleCandidates:readonly V2Affix[];
 readonly originallyCombatCompatible:readonly V2Affix[];
 readonly originalRejectedOrOffSlot:readonly V2Affix[];
 /** Candidate identities, without numeric weights or permission to roll. */
 readonly proposedCombatCompatible:readonly V2Affix[];
 readonly proposedNewRoleCandidates:readonly V2Affix[];
 /** The existing original highest authored rarity count, not a new count. */
 readonly highestCurrentRarityRollCount:number;
 readonly requiresRolePoolAuthoring:boolean;
 readonly requiresMintRulesVersionChange:true;
 readonly weightsApproved:false;
 readonly eligibleForActualMint:false;
 readonly executableCombatAuthorized:false;
}
export interface ForgeProposedAffixPolicyReportV2{
 readonly scope:'EQ2_NEW_MINT_AFFIX_POOL_REVIEW_NOT_A_GENERATOR';
 readonly version:typeof FORGE_AFFIX_POOL_RECONCILIATION_REVIEW_VERSION_V2;
 readonly actualForgeTemplates:169;
 readonly actualForgeRecipes:338;
 readonly physicalClassTierSlotCells:340;
 readonly originalEmptyOffhandReservations:20;
 readonly originalPhysicalCellsWithoutCompatibleAffix:number;
 readonly originalPhysicalCellsWithUnsafeRng:number;
 readonly originalPhysicalCellsWithMaxRarityShortage:number;
 /** Count if each candidate were separately approved and authoritatively weighted. */
 readonly proposedPhysicalCellsWithoutCandidateCoverage:0;
 readonly uniqueRoleSlotPolicies:30;
 readonly uniqueRoleSlotPoliciesNeedingNewRoleCandidates:number;
 readonly sourceTemplatesThatWouldNeedNewMintPolicy:number;
 readonly roleSlots:readonly ForgeProposedRoleSlotAffixesV2[];
 readonly originalRngUnchanged:true;
 readonly originalPotencyQuarantined:true;
 readonly ownerApprovalRequired:true;
 readonly newRulesVersionRequired:true;
 readonly executableNewMintPolicy:false;
 readonly authorizedProductionRolls:0;
 readonly actualPersistedItemsRewritten:0;
}
function fail(code:string):never{throw Error('eq2_affix_pool_review_'+code);}
function isRole(value:unknown):value is V2Role{
 return value==='tank'||value==='damage'||value==='support';
}
function isSlot(value:unknown):value is V2Slot{
 return value==='helmet'||value==='chest'||value==='gloves'||
  value==='legs'||value==='boots'||value==='cape'||
  value==='weapon'||value==='offhand'||value==='amulet'||value==='ring';
}
function usable(stat:V2Affix,slot:V2Slot):boolean{
 const mapped=EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[stat];
 return Boolean(mapped&&
  Object.prototype.hasOwnProperty.call(V2_SERVER_AFFIX_RANGES,stat)&&
  EQUIPMENT_AFFIXES_V2[mapped].runtime==='supported'&&
  EQUIPMENT_AFFIXES_V2[mapped].slots.includes(slot));
}
export function reviewProposedForgeRoleSlotAffixesV2(
 role:V2Role,slot:V2Slot,
):ForgeProposedRoleSlotAffixesV2{
 if(!isRole(role)||!isSlot(slot))fail('unknown_role_or_slot');
 const original=[...v2ServerAuthoredAffixChoices(role,slot)];
 const existing=original.filter(stat=>usable(stat,slot));
 const rejected=original.filter(stat=>!usable(stat,slot));
 // A 3-affix Mythic T3–T4 roll needs at least three distinct stat IDs.
 // Four choices wherever mechanically legal avoids making every highest
 // rarity item identical; do not invent a fifth stat, roll count or weight.
 const rollCount=Math.max(...V2_SERVER_RARITY_BANDS.map(b=>
  Math.max(b.affixesLowTier,b.affixesHighTier)));
 const allowed=[...new Set([...existing,...ROLE_REVIEW_PRIORITY[role]])]
  .filter(stat=>usable(stat,slot));
 if(allowed.length<rollCount)fail('insufficient_supported_original_forge_stats');
 const candidates=allowed.slice(0,Math.min(4,allowed.length));
 if(candidates.length<rollCount||new Set(candidates).size!==candidates.length||
    candidates.some(stat=>stat==='potency'||!usable(stat,slot)))
  fail('unreviewable_candidate_pool');
 return {
  role,slot,originalRoleCandidates:original,
  originallyCombatCompatible:existing,
  originalRejectedOrOffSlot:rejected,
  proposedCombatCompatible:candidates,
  proposedNewRoleCandidates:candidates.filter(stat=>!original.includes(stat)),
  highestCurrentRarityRollCount:rollCount,
  requiresRolePoolAuthoring:candidates.some(stat=>!original.includes(stat))||
   rejected.length>0,
  requiresMintRulesVersionChange:true,weightsApproved:false,
  eligibleForActualMint:false,executableCombatAuthorized:false,
 };
}
/** Read-only report over the exact current 169 Forge templates, not 2.0 items. */
export function reviewForgeNewMintAffixPolicyV2():ForgeProposedAffixPolicyReportV2{
 if(V2_SERVER_PIECES.length!==169||V2_SERVER_RECIPES.length!==338)
  fail('source_manifest_changed');
 const audit=auditRealForgeTenSlotsV2();
 if(audit.cells.length!==360||audit.cellsReservedByTwoHandOrPairedWeapon!==20||
  audit.cellsMissingRequiredTemplates!==0||
  audit.cells.filter(c=>c.sourceCoverage==='present').length!==340)
  fail('physical_source_scope_changed');
 const roles:['tank','damage','support']=['tank','damage','support'];
 const slots:V2Slot[]=[
  'helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring',
 ];
 const policies=roles.flatMap(role=>slots.map(slot=>
  reviewProposedForgeRoleSlotAffixesV2(role,slot)));
 if(policies.length!==30)fail('role_slot_matrix_missing');
 const covered=audit.cells.filter(c=>c.sourceCoverage==='present').filter(c=>{
  const plan=policies.find(p=>p.role===
   CLASS_ROLES_V2[c.classId]&&p.slot===c.slot);
  return plan&&plan.proposedCombatCompatible.length>=c.maximumAuthoredAffixRolls;
 }).length;
 if(covered!==340)fail('proposed_physical_source_uncovered');
 const impacted=V2_SERVER_PIECES.filter(piece=>{
  const plan=policies.find(p=>p.role===piece.role&&p.slot===piece.slot);
  if(!plan)fail('missing_piece_role_slot');
  return plan.requiresRolePoolAuthoring;
 }).length;
 return {
  scope:'EQ2_NEW_MINT_AFFIX_POOL_REVIEW_NOT_A_GENERATOR',
  version:FORGE_AFFIX_POOL_RECONCILIATION_REVIEW_VERSION_V2,
  actualForgeTemplates:169,actualForgeRecipes:338,
  physicalClassTierSlotCells:340,originalEmptyOffhandReservations:20,
  originalPhysicalCellsWithoutCompatibleAffix:
   audit.cellsWithNoCompatibleAffixOnPhysicalSlots,
  originalPhysicalCellsWithUnsafeRng:
   audit.cellsWithUnsafeRngCandidateOnPhysicalSlots,
  originalPhysicalCellsWithMaxRarityShortage:
   audit.cellsWithInsufficientMaximumRollPoolOnPhysicalSlots,
  proposedPhysicalCellsWithoutCandidateCoverage:0,
  uniqueRoleSlotPolicies:30,
  uniqueRoleSlotPoliciesNeedingNewRoleCandidates:policies.filter(p=>
   p.proposedNewRoleCandidates.length>0).length,
  sourceTemplatesThatWouldNeedNewMintPolicy:impacted,
  roleSlots:policies,originalRngUnchanged:true,
  originalPotencyQuarantined:true,ownerApprovalRequired:true,
  newRulesVersionRequired:true,executableNewMintPolicy:false,
  authorizedProductionRolls:0,actualPersistedItemsRewritten:0,
 };
}
