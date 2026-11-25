/**
 * Veldryn 2.0 hidden, read-only, fail-closed tool/blueprint cutover audit.
 *
 * Old Skills/tool policy has T2–T4 at 10/22/35. Independent careers
 * proposes 12/24/36. Never revoke a VERIFIED pre-cutover owned tool or
 * learned blueprint merely because those draft floors disagree.
 *
 * A level alone proves NO earned tool/blueprint entitlement: this audit
 * requires a persisted, source-linked grant for the exact character and
 * exact physical copy or recipe knowledge. Input must be loaded by a
 * service-owned authenticated, revision-consistent DB read.
 *
 * NO runtime imports, DB writes, grant/equip/craft authorization, replay,
 * market transfer, SQL migration or release enabled by this module.
 */
import {
  type TrustedCharacterProgressionV2,projectCharacterProgressionV2,
} from './character-progression';
import {reviewProfessionTierCompatibilityV2} from './profession-tier-reconciliation-review';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_:-]{8,128}$/;
const valid=(n:unknown,lo:number,hi:number):n is number=>
  typeof n==='number'&&Number.isSafeInteger(n)&&n>=lo&&n<=hi;
const fail=(reason:string):never=>{throw Error('tool_cutover_v2_'+reason);};
type Skill='mining'|'woodcutting'|'fishing'|'smithing';
type GatherSkill=Exclude<Skill,'smithing'>;
type Custody='inventory'|'bank'|'equipped'|'market_escrow';
export interface ToolReviewTemplateV2{
 readonly itemId:string;
 readonly tier:1|2|3|4;
 readonly gatheringSkill:GatherSkill;
 readonly learnedKnowledgeId:string|null;
}
/** Review snapshot ONLY; exact 12 tool identities from hidden #1615. */
export const TOOL_TEMPLATES_CUTOVER_REVIEW_V2:readonly ToolReviewTemplateV2[]=[
 {itemId:'COPPER_PICKAXE',tier:1,gatheringSkill:'mining',learnedKnowledgeId:null},
 {itemId:'GREENWOOD_HATCHET',tier:1,gatheringSkill:'woodcutting',learnedKnowledgeId:null},
 {itemId:'REEDLINE_ROD',tier:1,gatheringSkill:'fishing',learnedKnowledgeId:null},
 {itemId:'ASTER_IRON_PICKAXE',tier:2,gatheringSkill:'mining',learnedKnowledgeId:'tool_recipe:ASTER_IRON_PICKAXE'},
 {itemId:'ASTER_IRON_HATCHET',tier:2,gatheringSkill:'woodcutting',learnedKnowledgeId:'tool_recipe:ASTER_IRON_HATCHET'},
 {itemId:'IRONWOOD_ROD',tier:2,gatheringSkill:'fishing',learnedKnowledgeId:'tool_recipe:IRONWOOD_ROD'},
 {itemId:'OATHSTONE_PICKAXE',tier:3,gatheringSkill:'mining',learnedKnowledgeId:'tool_recipe:OATHSTONE_PICKAXE'},
 {itemId:'OATHSTONE_HATCHET',tier:3,gatheringSkill:'woodcutting',learnedKnowledgeId:'tool_recipe:OATHSTONE_HATCHET'},
 {itemId:'OATHSCALE_ROD',tier:3,gatheringSkill:'fishing',learnedKnowledgeId:'tool_recipe:OATHSCALE_ROD'},
 {itemId:'FROSTIRON_PICKAXE',tier:4,gatheringSkill:'mining',learnedKnowledgeId:'tool_recipe:FROSTIRON_PICKAXE'},
 {itemId:'FROSTIRON_HATCHET',tier:4,gatheringSkill:'woodcutting',learnedKnowledgeId:'tool_recipe:FROSTIRON_HATCHET'},
 {itemId:'RIMEGLASS_ROD',tier:4,gatheringSkill:'fishing',learnedKnowledgeId:'tool_recipe:RIMEGLASS_ROD'},
] as const;
const templates=new Map(TOOL_TEMPLATES_CUTOVER_REVIEW_V2.map(x=>[x.itemId,x]));
if(templates.size!==12)fail('invalid_template_catalogue');
export interface LegacyToolCopyV2{
 readonly instanceId:string;
 readonly itemId:string;
 readonly ownerCharacterId:string;
 readonly custody:Custody;
 readonly grantReceiptId:string;
}
export interface LegacyBlueprintKnowledgeV2{
 readonly knowledgeId:string;
 readonly ownerCharacterId:string;
 readonly grantReceiptId:string;
}
export interface PersistedToolGrantProofV2{
 readonly receiptId:string;
 readonly accountId:string;
 readonly characterId:string;
 readonly kind:'tool_copy'|'blueprint_knowledge';
 readonly itemId:string;
 readonly objectId:string;
 readonly committedAtMs:number;
 readonly gameRevision:number;
 readonly committed:true;
}
export interface TrustedToolCutoverSnapshotV2{
 readonly accountId:string;
 readonly characterId:string;
 readonly expectedGameRevision:number;
 /** Server/migration-selected immutable cutoff, NOT client clock. */
 readonly cutoverAtMs:number;
 readonly progression:TrustedCharacterProgressionV2;
 readonly copies:readonly LegacyToolCopyV2[];
 readonly learnedKnowledge:readonly LegacyBlueprintKnowledgeV2[];
 readonly sourceProofs:readonly PersistedToolGrantProofV2[];
}
export interface ProposedExactToolPreservationV2{
 readonly kind:'preserve_exact_copy'|'preserve_learned_knowledge';
 readonly itemId:string;
 readonly objectId:string;
 readonly profession:Skill;
 readonly tier:2|3|4;
 readonly oldFloor:number;
 readonly proposedFloor:number;
 readonly existingProfessionLevel:number;
 readonly sourceReceiptId:string;
 readonly sourceGameRevision:number;
 /** A bank or market escrow item MUST remain non-equippable until transferred. */
 readonly currentCustody:Custody|null;
 readonly grantsNewItem:false;
 readonly grantsGeneralTierAccess:false;
}
export interface ToolCutoverReviewResultV2{
 readonly accountId:string;
 readonly characterId:string;
 readonly expectedGameRevision:number;
 readonly proposals:readonly ProposedExactToolPreservationV2[];
 readonly evidenceMissingCount:number;
 readonly reviewedCopyCount:number;
 readonly reviewedKnowledgeCount:number;
 readonly observedConflictingTierCount:3;
 readonly canAuthorizeEquipOrCraft:false;
 readonly canWriteEntitlements:false;
 readonly releaseEnabled:false;
 readonly requiresOwnerApproval:true;
}
export function previewLegacyToolEntitlementCutoverV2(
 source:TrustedToolCutoverSnapshotV2,
):ToolCutoverReviewResultV2{
 if(!source||typeof source.accountId!=='string'||!UUID.test(source.accountId)||
   typeof source.characterId!=='string'||!UUID.test(source.characterId)||
   !valid(source.expectedGameRevision,0,Number.MAX_SAFE_INTEGER)||
   !valid(source.cutoverAtMs,1,Number.MAX_SAFE_INTEGER)||
   !Array.isArray(source.copies)||!Array.isArray(source.learnedKnowledge)||
   !Array.isArray(source.sourceProofs)||source.copies.length>2000||
   source.learnedKnowledge.length>500||source.sourceProofs.length>3000)
    fail('invalid_snapshot');
 const levels=projectCharacterProgressionV2(source.progression).professionLevels;
 const characterId=source.characterId.toLowerCase();
 const accountId=source.accountId.toLowerCase();
 const receipts=new Map<string,PersistedToolGrantProofV2>();
 for(const proof of source.sourceProofs){
   if(!proof||typeof proof.receiptId!=='string'||!TOKEN.test(proof.receiptId)||
     typeof proof.accountId!=='string'||!UUID.test(proof.accountId)||
     typeof proof.characterId!=='string'||!UUID.test(proof.characterId)||
     typeof proof.itemId!=='string'||!templates.has(proof.itemId)||
     typeof proof.objectId!=='string'||!TOKEN.test(proof.objectId)||
     !['tool_copy','blueprint_knowledge'].includes(proof.kind)||
     proof.committed!==true||
     !valid(proof.committedAtMs,1,Number.MAX_SAFE_INTEGER)||
     !valid(proof.gameRevision,0,Number.MAX_SAFE_INTEGER)||
     receipts.has(proof.receiptId))
     fail('invalid_or_duplicate_proof');
   if(proof.accountId.toLowerCase()!==accountId||
      proof.characterId.toLowerCase()!==characterId||
      proof.committedAtMs>source.cutoverAtMs||
      proof.gameRevision>source.expectedGameRevision)
     fail('untrusted_proof_provenance');
   const template=templates.get(proof.itemId)!;
   if(proof.kind==='blueprint_knowledge'&&
      template.learnedKnowledgeId!==proof.objectId)
     fail('invalid_knowledge_proof');
   receipts.set(proof.receiptId,proof);
 }
 const proposals:ProposedExactToolPreservationV2[]=[];
 let evidenceMissingCount=0;
 const seenCopies=new Set<string>(),seenKnowledge=new Set<string>();
 for(const copy of source.copies){
   if(!copy||typeof copy.instanceId!=='string'||!TOKEN.test(copy.instanceId)||
      typeof copy.itemId!=='string'||
      typeof copy.ownerCharacterId!=='string'||!UUID.test(copy.ownerCharacterId)||
      !['inventory','bank','equipped','market_escrow'].includes(copy.custody)||
      typeof copy.grantReceiptId!=='string'||!TOKEN.test(copy.grantReceiptId)||
      seenCopies.has(copy.instanceId))
     fail('invalid_copy_snapshot');
   seenCopies.add(copy.instanceId);
   if(copy.ownerCharacterId.toLowerCase()!==characterId)
     fail('copy_owner_mismatch');
   const template=templates.get(copy.itemId);
   // First validate physical identity against the receipt, even when a
   // character's skill would not qualify for a grandfathering candidate.
   const proof=receipts.get(copy.grantReceiptId);
   if(proof&&(proof.kind!=='tool_copy'||proof.itemId!==copy.itemId||
      proof.objectId!==copy.instanceId))
     fail('copy_proof_mismatch');
   if(!template)return fail('unsupported_tool_snapshot');
   if(template.tier===1)continue;
   const current=levels[template.gatheringSkill]??0;
   const audit=reviewProfessionTierCompatibilityV2(current,template.tier);
   if(!audit.existingAccessAtRisk)continue;
   if(!proof){evidenceMissingCount++;continue;}
   proposals.push({
     kind:'preserve_exact_copy',itemId:copy.itemId,objectId:copy.instanceId,
     profession:template.gatheringSkill,tier:template.tier,
     oldFloor:audit.oldToolFloor,proposedFloor:audit.proposedCareerFloor,
     existingProfessionLevel:current,sourceReceiptId:proof.receiptId,
     sourceGameRevision:proof.gameRevision,currentCustody:copy.custody,
     grantsNewItem:false,grantsGeneralTierAccess:false,
   });
 }
 for(const learned of source.learnedKnowledge){
   if(!learned||typeof learned.knowledgeId!=='string'||
      typeof learned.ownerCharacterId!=='string'||!UUID.test(learned.ownerCharacterId)||
      typeof learned.grantReceiptId!=='string'||!TOKEN.test(learned.grantReceiptId)||
      seenKnowledge.has(learned.knowledgeId))
     fail('invalid_knowledge_snapshot');
   seenKnowledge.add(learned.knowledgeId);
   if(learned.ownerCharacterId.toLowerCase()!==characterId)
     fail('knowledge_owner_mismatch');
   const template=TOOL_TEMPLATES_CUTOVER_REVIEW_V2.find(
     t=>t.learnedKnowledgeId===learned.knowledgeId);
   const proof=receipts.get(learned.grantReceiptId);
   if(proof&&(!template||proof.kind!=='blueprint_knowledge'||
      proof.itemId!==template.itemId||proof.objectId!==learned.knowledgeId))
     fail('knowledge_proof_mismatch');
   if(!template||template.tier===1)continue;
   const current=levels.smithing??0;
   const audit=reviewProfessionTierCompatibilityV2(current,template.tier);
   if(!audit.existingAccessAtRisk)continue;
   if(!proof){evidenceMissingCount++;continue;}
   proposals.push({
     kind:'preserve_learned_knowledge',itemId:template.itemId,
     objectId:learned.knowledgeId,profession:'smithing',tier:template.tier,
     oldFloor:audit.oldToolFloor,proposedFloor:audit.proposedCareerFloor,
     existingProfessionLevel:current,sourceReceiptId:proof.receiptId,
     sourceGameRevision:proof.gameRevision,currentCustody:null,
     grantsNewItem:false,grantsGeneralTierAccess:false,
   });
 }
 proposals.sort((a,b)=>a.kind.localeCompare(b.kind)||
   a.itemId.localeCompare(b.itemId)||a.objectId.localeCompare(b.objectId));
 return {
  accountId,characterId,expectedGameRevision:source.expectedGameRevision,
  proposals,evidenceMissingCount,reviewedCopyCount:source.copies.length,
  reviewedKnowledgeCount:source.learnedKnowledge.length,
  observedConflictingTierCount:3,
  canAuthorizeEquipOrCraft:false,canWriteEntitlements:false,
  releaseEnabled:false,requiresOwnerApproval:true,
 };
}
