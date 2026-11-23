/**
 * Equipment/Crafting 2.0 — HIDDEN, SERVER-ONLY source authoring (not loot).
 *
 * This is a strict reconciliation against the 746-route v3 design. These
 * proposals do not register a material, alter a drop table, authorize a
 * market transfer or create an item. All sources are unverified and closed.
 *
 * NEVER import from public online/Edge or mobile entrypoints. Actual source
 * proof requires a locked server-owned item registry, grants and receipts.
 */
export const EQ2_MATERIAL_SOURCE_REVIEW_V4='eq2-t1-t4-material-source-review-v4' as const;
export const EQ2_REVIEW_SOURCE_GRANTS_ENABLED=false as const;

export type Eq2SourceKind='monster'|'gathering'|'either';
export type Eq2SourceDecision='proposed'|'missing_source';
export type Eq2SourceTier=1|2|3|4;
export interface Eq2DraftMaterialSource {
 readonly itemId:string;
 readonly tier:Eq2SourceTier;
 readonly kind:Eq2SourceKind;
 /** Exact existing monster IDs only, never invented live gathering-node IDs. */
 readonly candidateMonsterIds:readonly string[];
 /** A missing node/species means the source is NOT currently obtainable. */
 readonly candidateGatheringKind?:'mining'|'fishing'|'woodcutting'|'herbalism'|'fiber_gathering';
 readonly decision:Eq2SourceDecision;
 readonly entryLevel:number;
 readonly candidateMinimumMonsterLevel?:number;
 /** An actual player market/commission receipt is not yet implemented. */
 readonly proposedTradeable:true;
 readonly grantVerified:false;
 readonly isRegistered:false;
 readonly mintAuthorized:false;
 readonly releaseEnabled:false;
 readonly note:string;
}
const draft=(itemId:string,tier:Eq2SourceTier,kind:Eq2SourceKind,
 entryLevel:number,candidates:readonly string[],decision:Eq2SourceDecision,note:string,
 gathering?:Eq2DraftMaterialSource['candidateGatheringKind'],
 minMonsterLevel?:number):Eq2DraftMaterialSource=>Object.freeze({
 itemId,tier,kind,entryLevel,candidateMonsterIds:Object.freeze([...candidates]),
 decision,candidateGatheringKind:gathering,candidateMinimumMonsterLevel:minMonsterLevel,
 proposedTradeable:true as const,grantVerified:false as const,
 isRegistered:false as const,mintAuthorized:false as const,releaseEnabled:false as const,note,
});
/** 14 genuinely required unregistered material inputs. No optional T1 rare. */
export const EQ2_REQUIRED_MATERIAL_SOURCE_DRAFTS:readonly Eq2DraftMaterialSource[]=Object.freeze([
 draft('EQ2_BOAR_TUSK',1,'monster',2,['ROADSIDE_BOAR'],'proposed',
  'Boar unlock 3 > T1 wear candidate 2. No live drop; trading is future-only.',undefined,3),
 draft('EQ2_RIVERSTONE',1,'gathering',2,[],'missing_source',
  'Choose registered fishing/mining find and prove rate/region before release.','fishing'),
 draft('EQ2_TROLL_SINEW',2,'monster',12,['FOREST_TROLL'],'proposed',
  'Provisional scarce roll; do not duplicate existing troll rewards.',undefined,11),
 draft('EQ2_THORNSTONE',2,'gathering',12,[],'missing_source',
  'Needs registered gathering reward, independent profession progression.','mining'),
 draft('EQ2_THORN_FIBRE',2,'gathering',12,[],'missing_source',
  'Needs registered fibre-gathering node and player market custody.','fiber_gathering'),
 draft('EQ2_SUNSCAR_SCALE',3,'monster',26,['SUNSCAR_SCORPION'],'proposed',
  'Chitin/scale item separate from botanical SUNSCALE; candidate source not a payout.',undefined,26),
 draft('EQ2_MIRAGEFANG_CORE',3,'monster',26,['SUNSCAR_SCORPION','MIRAGE_SHADE'],'proposed',
  'Early level-26 Scorpion bridge candidate; Shade starts later at 38.',undefined,26),
 draft('EQ2_SUNSCAR_HIDE',3,'monster',26,[],'missing_source',
  'Do NOT invent a scorpion hide drop; find real hide-bearing fauna or suitable verified equivalent.'),
 draft('EQ2_DUNE_FIBRE',3,'gathering',26,[],'missing_source',
  'Independent tradeable fibre source; no forced combat profession.','fiber_gathering'),
 draft('EQ2_GLASSBOUND_PLATE',4,'monster',40,['SANDPLATE_JUGGERNAUT','GLASSBOUND_SENTINEL'],'proposed',
  'Juggernaut at 38 can bridge T4; final server-side eligible roll required.',undefined,38),
 draft('EQ2_GLASSHEART_FRAGMENT',4,'monster',40,['SANDPLATE_JUGGERNAUT','GLASSBOUND_SENTINEL'],'proposed',
  'Very scarce, no asserted percent before actual payout normalization.',undefined,38),
 draft('EQ2_GLASSBOUND_DUST',4,'either',40,['SANDPLATE_JUGGERNAUT'],'missing_source',
  'A profession-accessible gathering/trade route is required; battle-only Dust blocks crafters.','mining',38),
 draft('EQ2_GLASSBOUND_SHARD',4,'gathering',40,[],'missing_source',
  'Needs registered mining find and source identity.','mining'),
 draft('EQ2_SOUL_FIBRE',4,'gathering',40,[],'missing_source',
  'Needs registered fibre source independent of combat.','fiber_gathering'),
]);
const byId=new Map(EQ2_REQUIRED_MATERIAL_SOURCE_DRAFTS.map(row=>[row.itemId,row]));
export function eq2RequiredMaterialSourceDraft(itemId:string):Eq2DraftMaterialSource|undefined{
 return byId.get(itemId);
}
export type Eq2SourceDenial=
 'source_unknown'|'draft_not_registered'|'receipt_unverified'|
 'wrong_item'|'source_mismatch'|'invalid_quantity'|'grants_disabled';
export interface Eq2SourcePreflight {
 readonly canGrant:false;
 readonly reason:Eq2SourceDenial;
 readonly itemId:string;
 readonly sourceCandidate?:Eq2DraftMaterialSource;
}
/**
 * Validate the SHAPE of a hypothetical receipt, then unconditionally reject.
 * Client-provided "verified" flags are intentionally ignored; only the
 * eventual live server owner can add an independently proven grant adapter.
 */
export function preflightEq2MaterialGrant(review:{
 itemId:string;sourceId:string;quantity:number;claimedVerified?:boolean;
}):Eq2SourcePreflight{
 const source=eq2RequiredMaterialSourceDraft(review?.itemId);
 if(!source)return {canGrant:false,reason:'source_unknown',itemId:review?.itemId??''};
 if(!Number.isSafeInteger(review.quantity)||review.quantity<1)
  return {canGrant:false,reason:'invalid_quantity',itemId:review.itemId,sourceCandidate:source};
 if(review.sourceId&&source.candidateMonsterIds.length&&
   review.sourceId.startsWith('MONSTER:')&&
   !source.candidateMonsterIds.includes(review.sourceId.slice(8)))
  return {canGrant:false,reason:'source_mismatch',itemId:review.itemId,sourceCandidate:source};
 return {canGrant:false,reason:'draft_not_registered',itemId:review.itemId,sourceCandidate:source};
}
