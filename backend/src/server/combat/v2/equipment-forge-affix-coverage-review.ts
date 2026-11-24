/**
 * HIDDEN EQ2 original Forge roll -> Combat slot capability reconciliation.
 *
 * Audits the EXACT pinned 169 templates and original generator role weights,
 * including its 70% preferred-slot / 30% full-role fallback. Reports which
 * original candidate stats have no executable Combat 2.0 mapping, and which
 * slots could not even support max-rarity roll counts under a strict filter.
 *
 * Review-only: DOES NOT alter the original draft RNG distribution, mint,
 * item copies, affix definitions, equip policy or approved balance.
 */
import {
 V2_SERVER_PIECES,V2_SERVER_MANIFEST_VERSION,
} from '../../equipment/equipment-crafting-v2-manifest';
import {
 EQUIPMENT_V2_SERVER_RULES_VERSION,V2_SERVER_RARITY_BANDS,
 v2OriginalForgeAffixSourcePoolV2,
 type V2Role,type V2Slot,type V2Affix,type V2Tier,type V2Rarity,
} from '../../equipment/equipment-crafting-v2-rolls';
import {EQ2_COMBAT_FROZEN_AFFIX_MAP_V2} from './equipment-frozen-forge-bridge';
import {EQUIPMENT_AFFIXES_V2,type EquipmentAffixIdV2} from './equipment-affixes';

export const FORGE_COMBAT_AFFIX_COVERAGE_REVIEW_V2='eq2-original-forge-roll-slot-review-v1' as const;
export interface OriginalForgeRollExposureV2{
 readonly stat:V2Affix;
 readonly sourceWeight:number;
 readonly preferredSlot:boolean;
 readonly classification:'COMPATIBLE'|'AMBIGUOUS_SEMANTICS'|'COMBAT_SLOT_FORBIDDEN';
 readonly mappedCombatAffixId:EquipmentAffixIdV2|null;
}
export interface OriginalForgeAffixPieceCoverageV2{
 readonly pieceId:string;
 readonly name:string;
 readonly tier:V2Tier;
 readonly role:V2Role;
 readonly slot:V2Slot;
 readonly setId:string|null;
 readonly originalRoleChoices:number;
 readonly executableChoices:number;
 readonly incompatibleChoices:number;
 readonly ambiguousChoices:number;
 readonly slotForbiddenChoices:number;
 readonly originalMaxAffixes:number;
 readonly maximumAffixBudgetSupportable:boolean;
 readonly risks:readonly (
  'ORIGINAL_ROLL_CAN_BE_UNSUPPORTED'|
  'INSUFFICIENT_LEGAL_DISTINCT_AFFIXES_FOR_ORIGINAL_RARITY_BUDGET'
 )[];
 readonly exposure:readonly OriginalForgeRollExposureV2[];
}
export interface ForgeCombatAffixCoverageReportV2{
 readonly version:typeof FORGE_COMBAT_AFFIX_COVERAGE_REVIEW_V2;
 readonly scope:'NO_RNG_CHANGE_NO_MINT_AND_NO_COMBAT_AUTHORIZATION';
 readonly forgeManifestVersion:typeof V2_SERVER_MANIFEST_VERSION;
 readonly forgeRulesVersion:typeof EQUIPMENT_V2_SERVER_RULES_VERSION;
 readonly pinnedPieces:number;
 readonly setMemberPieces:number;
 readonly exposedToUnexecutableSourceRolls:number;
 readonly notFullyFillableAtMaxRarity:number;
 readonly piecesWithNoExecutableRolls:number;
 readonly unsupportedCandidateChannels:number;
 readonly slotForbiddenCandidateChannels:number;
 readonly highestOriginalAffixCount:number;
 readonly newMintRollPolicyApproved:false;
 readonly currentCopiesRerolled:false;
 readonly status:'RECONCILIATION_REQUIRED_BEFORE_MINT_AND_COMBAT_ACTIVATION';
 readonly pieces:readonly OriginalForgeAffixPieceCoverageV2[];
}
function fail(reason:string):never{throw Error('eq2_forge_affix_coverage_'+reason);}
export function reviewOriginalForgeAffixCoverageV2():ForgeCombatAffixCoverageReportV2{
 if(V2_SERVER_PIECES.length!==169||
    new Set(V2_SERVER_PIECES.map(p=>p.id)).size!==169||
    V2_SERVER_RARITY_BANDS.length!==6)
  fail('source_catalogue_drift');
 const maxRequired=(tier:V2Tier)=>
  Math.max(...V2_SERVER_RARITY_BANDS.map(b=>
   tier>=3?b.affixesHighTier:b.affixesLowTier));
 const pieces:OriginalForgeAffixPieceCoverageV2[]=V2_SERVER_PIECES.map(piece=>{
  const rows=v2OriginalForgeAffixSourcePoolV2(piece.role,piece.slot);
  if(rows.length===0||new Set(rows.map(x=>x.stat)).size!==rows.length||
     rows.some(x=>!Number.isSafeInteger(x.weight)||x.weight<=0))
   fail('invalid_original_role_pool');
  const exposure:OriginalForgeRollExposureV2[]=rows.map(row=>{
   const mapped=EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[row.stat]??null;
   const classification=(!mapped?'AMBIGUOUS_SEMANTICS':
    !EQUIPMENT_AFFIXES_V2[mapped].slots.includes(piece.slot)?
     'COMBAT_SLOT_FORBIDDEN':'COMPATIBLE') as
      OriginalForgeRollExposureV2['classification'];
   return Object.freeze({
    stat:row.stat,sourceWeight:row.weight,preferredSlot:row.slotPreferred,
    classification,mappedCombatAffixId:mapped,
   });
  });
  const executableChoices=exposure.filter(x=>x.classification==='COMPATIBLE').length;
  const ambiguousChoices=exposure.filter(x=>x.classification==='AMBIGUOUS_SEMANTICS').length;
  const slotForbiddenChoices=exposure.filter(x=>x.classification==='COMBAT_SLOT_FORBIDDEN').length;
  const incompatibleChoices=ambiguousChoices+slotForbiddenChoices;
  const originalMaxAffixes=maxRequired(piece.tier);
  const risks:OriginalForgeAffixPieceCoverageV2['risks'][number][]=[];
  if(incompatibleChoices>0)risks.push('ORIGINAL_ROLL_CAN_BE_UNSUPPORTED');
  if(executableChoices<originalMaxAffixes)
   risks.push('INSUFFICIENT_LEGAL_DISTINCT_AFFIXES_FOR_ORIGINAL_RARITY_BUDGET');
  return Object.freeze({
   pieceId:piece.id,name:piece.name,tier:piece.tier,slot:piece.slot,
   role:piece.role,setId:piece.setId??null,
   originalRoleChoices:rows.length,executableChoices,incompatibleChoices,
   ambiguousChoices,slotForbiddenChoices,originalMaxAffixes,
   maximumAffixBudgetSupportable:executableChoices>=originalMaxAffixes,
   risks:Object.freeze(risks),exposure:Object.freeze(exposure),
  });
 });
 return Object.freeze({
  version:FORGE_COMBAT_AFFIX_COVERAGE_REVIEW_V2,
  scope:'NO_RNG_CHANGE_NO_MINT_AND_NO_COMBAT_AUTHORIZATION',
  forgeManifestVersion:V2_SERVER_MANIFEST_VERSION,
  forgeRulesVersion:EQUIPMENT_V2_SERVER_RULES_VERSION,
  pinnedPieces:pieces.length,
  setMemberPieces:pieces.filter(x=>x.setId).length,
  exposedToUnexecutableSourceRolls:pieces.filter(x=>x.incompatibleChoices>0).length,
  notFullyFillableAtMaxRarity:pieces.filter(x=>!x.maximumAffixBudgetSupportable).length,
  piecesWithNoExecutableRolls:pieces.filter(x=>x.executableChoices===0).length,
  unsupportedCandidateChannels:pieces.reduce((n,x)=>n+x.ambiguousChoices,0),
  slotForbiddenCandidateChannels:pieces.reduce((n,x)=>n+x.slotForbiddenChoices,0),
  highestOriginalAffixCount:maxRequired(4),
  newMintRollPolicyApproved:false,currentCopiesRerolled:false,
  status:'RECONCILIATION_REQUIRED_BEFORE_MINT_AND_COMBAT_ACTIVATION',
  pieces:Object.freeze(pieces),
 });
}
/** This is NOT permission to roll a candidate with the original generator.
 * It only gives UX and economy design a source-backed set of legal options.
 * A future new-mint RNG must be separately versioned and approved. */
export function reviewOriginalForgeAffixPieceV2(pieceId:string):
 OriginalForgeAffixPieceCoverageV2|null{
 if(typeof pieceId!=='string'||pieceId.length>128)return null;
 return reviewOriginalForgeAffixCoverageV2().pieces.find(p=>p.pieceId===pieceId)??null;
}
