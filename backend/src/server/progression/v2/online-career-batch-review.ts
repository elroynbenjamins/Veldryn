/**
 * Veldryn 2.0 HIDDEN: one online-game command -> many Career XP proofs.
 *
 * REVIEW-ONLY / NEVER MOUNT AS A PUBLIC ROUTE. This is a pre-commit policy
 * projection, NOT an authenticated service, DB adapter or a permission to
 * write XP. The real service must obtain command/results from its own
 * simulation and lock the online game row, account, source receipt and career
 * bank in the SAME PostgreSQL transaction.
 *
 * DB commit is all-or-nothing: either state revision, original action receipt,
 * each source proof, each unique award and the bank total all commit, or none
 * do. A mixed queue cannot be settled source-by-source asynchronously.
 */
import {
  projectCombinedGameCareerProofsV2,
  type PendingGameCareerProofV2,
  type TrustedCombinedGameCommandV2,
} from './combined-game-proofs-v2';
import {proposeTrustedActivityXpV2} from './character-progression';

export const ONLINE_CAREER_BATCH_REVIEW_V2='career-online-game-batch-review-v1' as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUEST=/^[a-zA-Z0-9_-]{8,128}$/;
const SHA=/^[0-9a-f]{64}$/;
const GATHER:ReadonlySet<string>=new Set(['mining','woodcutting','fishing','herbalism']);
const CRAFT:ReadonlySet<string>=new Set(['smithing','tailoring','cooking','alchemy','enchanting']);
const safe=(v:unknown,min:number,max:number):v is number=>
  typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;

/**
 * Service-owned original command result. It must be taken from the exact
 * executeGameCommand result BEFORE reward-specific projection; never accept
 * a client payload or independently synthesized duplicate of a nested view.
 */
export interface TrustedCareerBatchClaimSegmentV2 {
 readonly activity:{
  readonly kind:string;readonly targetId:string;readonly lastClaimAtMs:number;
 };
 readonly reward:{
  readonly xp:number;readonly elapsedSeconds:number;
  readonly kills?:number;
  readonly combatEffort?:{
   readonly startsAtMs:number;readonly endsAtMs:number;
  };
 };
}
export interface TrustedCareerBatchCraftCompletionV2 {
 readonly requestedRecipeId:string;
 readonly requestedQuantity:number;
 readonly owningSkillXpBefore:number;
 readonly owningSkillXpAfter:number;
 readonly contributions:readonly {
  readonly kind:string;readonly contentId:string;readonly units:number;
 }[];
}
export interface TrustedCareerBatchOriginalResultV2 {
 readonly originalClaimSegments:readonly TrustedCareerBatchClaimSegmentV2[]|null;
 readonly completedInstantCraft:TrustedCareerBatchCraftCompletionV2|null;
}
export interface OnlineCareerBatchAwardPreviewV2 {
  readonly sourceKind:'gathering_claim'|'combat_reward'|'craft_claim';
  readonly sourceId:string;
  readonly characterId:string;
  readonly segmentIndex:number;
  readonly professionId:string|null;
  readonly baseEffortSeconds:number;
  readonly difficultyBasisPoints:2500|5000|10000;
  readonly claimedElapsedSeconds:number;
  /** Not a legacy skill XP award; real skill XP remains with original gameplay. */
  readonly proposedOverallCharacterXp:number;
  /** One canonical row fingerprint BEFORE the database completion time is set. */
  readonly sourceFingerprint:string;
}
export interface OnlineCareerBatchPreviewV2 {
  readonly version:typeof ONLINE_CAREER_BATCH_REVIEW_V2;
  readonly accountId:string;
  readonly characterId:string;
  readonly requestId:string;
  readonly requestHash:string;
  readonly expectedGameRevision:number;
  readonly awards:readonly OnlineCareerBatchAwardPreviewV2[];
  readonly totalOverallCharacterXp:number;
  readonly wouldWriteProfessionXp:false;
  readonly canCommit:false;
  readonly requiresServiceOwnedAtomicTransaction:true;
  readonly releaseEnabled:false;
}
function error(reason:string):never{throw Error('career_batch_v2_'+reason);}
async function sha256(s:string):Promise<string>{
  const raw=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  return Array.from(raw,b=>b.toString(16).padStart(2,'0')).join('');
}
function verifyProofShape(command:TrustedCombinedGameCommandV2,p:PendingGameCareerProofV2):void{
  if(!p||!['gathering_claim','combat_reward','craft_claim'].includes(p.sourceKind)||
     typeof p.sourceId!=='string'||!SHA.test(p.sourceId)||
     p.accountId!==command.accountId.toLowerCase()||
     p.requestId!==command.requestId||p.requestHash!==command.requestHash||
     p.characterId!==command.beforeCharacterId?.toLowerCase()||
     p.expectedGameRevision!==command.expectedGameRevision||
     !safe(p.segmentIndex,0,63)||
     !safe(p.baseEffortSeconds,1,108000)||
     ![2500,5000,10000].includes(p.difficultyBasisPoints)||
     p.sourceCompletedAtMs!==null||
     !safe(p.claimedElapsedSeconds,0,86400))
      error('invalid_source_shape');
  if((p.sourceKind==='gathering_claim' &&
       (!p.professionId||!GATHER.has(p.professionId)||
       p.claimedElapsedSeconds<1||p.baseEffortSeconds>86400))||
     (p.sourceKind==='combat_reward' &&
       (p.professionId!==null||p.claimedElapsedSeconds!==0||
        p.baseEffortSeconds>86400))||
     (p.sourceKind==='craft_claim' &&
       (!p.professionId||!CRAFT.has(p.professionId)||
        p.segmentIndex!==0||p.claimedElapsedSeconds!==0||
        p.baseEffortSeconds>10800)))
    error('invalid_source_class');
}
function assertOriginalCommandResultV2(
 command:TrustedCombinedGameCommandV2,
 original:TrustedCareerBatchOriginalResultV2,
):void{
 if(!original||typeof original!=='object'||
   !Object.hasOwn(original,'originalClaimSegments')||
   !Object.hasOwn(original,'completedInstantCraft'))
   error('missing_original_result');
 const claim=original.originalClaimSegments;
 const craft=original.completedInstantCraft;
 if(command.commandType==='claim'){
   if(!Array.isArray(claim)||claim.length>64||craft!==null)
     error('invalid_original_claim');
   for(const segment of claim){
     if(!segment?.activity||!segment.reward||
       typeof segment.activity.kind!=='string'||
       typeof segment.activity.targetId!=='string'||
       !safe(segment.activity.lastClaimAtMs,0,Number.MAX_SAFE_INTEGER)||
       !safe(segment.reward.xp,0,Number.MAX_SAFE_INTEGER)||
       !safe(segment.reward.elapsedSeconds,0,86400)||
       (segment.reward.kills!==undefined&&
         !safe(segment.reward.kills,0,1000000)))
       error('invalid_original_segment');
     const interval=segment.reward.combatEffort;
     if(interval!==undefined&&(!interval||
        !safe(interval.startsAtMs,0,Number.MAX_SAFE_INTEGER)||
        !safe(interval.endsAtMs,0,Number.MAX_SAFE_INTEGER)||
        interval.endsAtMs<=interval.startsAtMs))
       error('invalid_original_segment');
   }
   // Compare each independent projector against the exact original result,
   // including the full combat effort and kill count where present.
   for(const nested of [command.gathering,command.combat]){
     if(!nested)continue;
     if(!Array.isArray(nested.segments)||
       nested.segments.length!==claim.length)
       error('original_queue_mismatch');
     for(let i=0;i<claim.length;i++){
       const a=claim[i],b=nested.segments[i];
       if(!b?.activity||!b.reward||
         a.activity.kind!==b.activity.kind||
         a.activity.targetId!==b.activity.targetId||
         a.activity.lastClaimAtMs!==b.activity.lastClaimAtMs||
         a.reward.xp!==b.reward.xp||
         a.reward.elapsedSeconds!==b.reward.elapsedSeconds)
         error('original_queue_mismatch');
       if(nested===command.combat){
         const fromCombat=b as TrustedCareerBatchClaimSegmentV2;
         const aEffort=a.reward.combatEffort;
         const bEffort=fromCombat.reward.combatEffort;
         if(a.reward.kills!==fromCombat.reward.kills||
            (aEffort===undefined)!==(bEffort===undefined)||
            (aEffort!==undefined&&bEffort!==undefined&&
             (aEffort.startsAtMs!==bEffort.startsAtMs||
              aEffort.endsAtMs!==bEffort.endsAtMs)))
           error('original_combat_mismatch');
       }
     }
   }
   const needsGathering=claim.some(s=>
     GATHER.has(s.activity.kind)&&s.reward.xp>0);
   const needsCombat=claim.some(s=>s.activity.kind==='combat'&&
     s.reward.xp>0);
   if((needsGathering&&!command.gathering)||(needsCombat&&!command.combat))
     error('missing_source_projector');
   if(command.instantCraft)error('craft_source_in_claim');
 }else if(command.commandType==='craft'){
   if(claim!==null||(!command.instantCraft&&craft!==null)||
     (command.instantCraft&&craft===null))
     error('invalid_original_craft');
   if(command.instantCraft&&craft){
     const current=command.instantCraft;
     if(craft.requestedRecipeId!==current.requestedRecipeId||
       craft.requestedQuantity!==current.requestedQuantity||
       craft.owningSkillXpBefore!==current.owningSkillXpBefore||
       craft.owningSkillXpAfter!==current.owningSkillXpAfter||
       !Array.isArray(craft.contributions)||
       !Array.isArray(current.contributions)||
       craft.contributions.length!==current.contributions.length||
       craft.contributions.some((c,i)=>{
         const expected=current.contributions[i];
         return !c||!expected||c.kind!==expected.kind||
           c.contentId!==expected.contentId||c.units!==expected.units;
       }))
       error('original_craft_mismatch');
   }
   if(command.gathering||command.combat)error('claim_source_in_craft');
 }else if(claim!==null||craft!==null||
          command.gathering||command.combat||command.instantCraft){
   error('invalid_nonreward_source');
 }
}
export async function previewOnlineGameCareerBatchV2(
  command:TrustedCombinedGameCommandV2,
  original:TrustedCareerBatchOriginalResultV2,
):Promise<OnlineCareerBatchPreviewV2>{
  if(!command||typeof command.accountId!=='string'||!UUID.test(command.accountId)||
     typeof command.requestId!=='string'||!REQUEST.test(command.requestId)||
     typeof command.requestHash!=='string'||!SHA.test(command.requestHash)||
     !safe(command.expectedGameRevision,1,Number.MAX_SAFE_INTEGER)||
     !command.beforeCharacterId||!UUID.test(command.beforeCharacterId)||
     !command.afterCharacterId||!UUID.test(command.afterCharacterId)||
     command.beforeCharacterId.toLowerCase()!==command.afterCharacterId.toLowerCase()||
     typeof command.adminQa!=='boolean'||typeof command.commandType!=='string')
    error('invalid_command');
  // Authenticity is the caller's responsibility; consistency with the
  // ORIGINAL simulated command is checked here, not just nested projections.
  assertOriginalCommandResultV2(command,original);
  const proofs=await projectCombinedGameCareerProofsV2(command);
  // Even if the calling service accidentally includes a QA simulation as a
  // reward candidate, it never becomes a Career XP settlement.
  if(command.adminQa&&proofs.length)error('qa_source_must_be_empty');
  if(proofs.length>64)error('too_many_sources');
  const seenIndices=new Set<number>();
  const seenSourceIds=new Set<string>();
  const awards:OnlineCareerBatchAwardPreviewV2[]=[];
  let total=0;
  for(const proof of proofs){
    verifyProofShape(command,proof);
    // The combined online-game preview does not issue processing proofs.
    // Keep this explicit narrow gate even when the broader source union grows.
    if(proof.sourceKind==='processing_claim')error('unsupported_source_class');
    if(seenIndices.has(proof.segmentIndex)||seenSourceIds.has(proof.sourceId))
      error('duplicate_source');
    seenIndices.add(proof.segmentIndex);
    seenSourceIds.add(proof.sourceId);
    const expectedSourceId=await sha256(
      'career-v2:'+command.accountId.toLowerCase()+':'+
      command.requestId+':'+command.requestHash+':'+proof.segmentIndex);
    if(proof.sourceId!==expectedSourceId)error('source_hash_mismatch');
    const activity=proposeTrustedActivityXpV2({
      settlementId:proof.sourceKind+':'+proof.sourceId,
      kind:proof.sourceKind==='combat_reward'?'combat':'profession',
      ...(proof.sourceKind==='combat_reward'?{}:{professionId:proof.professionId!}),
      baseEffortSeconds:proof.baseEffortSeconds,
      difficultyBasisPoints:proof.difficultyBasisPoints,
    });
    const delta=activity.overallCharacterXp;
    if(!safe(delta,0,1000000)||!safe(total+delta,0,Number.MAX_SAFE_INTEGER))
      error('award_overflow');
    total+=delta;
    const sourceFingerprint=await sha256(JSON.stringify([
      ONLINE_CAREER_BATCH_REVIEW_V2,command.accountId.toLowerCase(),
      command.requestId,command.requestHash,command.expectedGameRevision,
      command.beforeCharacterId.toLowerCase(),proof.sourceKind,proof.sourceId,
      proof.segmentIndex,proof.professionId,proof.claimedElapsedSeconds,
      proof.baseEffortSeconds,proof.difficultyBasisPoints,delta,
    ]));
    awards.push({
      sourceKind:proof.sourceKind,sourceId:proof.sourceId,
      characterId:proof.characterId,segmentIndex:proof.segmentIndex,
      professionId:proof.professionId,
      claimedElapsedSeconds:proof.claimedElapsedSeconds,
      baseEffortSeconds:proof.baseEffortSeconds,
      difficultyBasisPoints:proof.difficultyBasisPoints,
      proposedOverallCharacterXp:delta,sourceFingerprint,
    });
  }
  return {
    version:ONLINE_CAREER_BATCH_REVIEW_V2,accountId:command.accountId.toLowerCase(),
    characterId:command.beforeCharacterId.toLowerCase(),
    requestId:command.requestId,requestHash:command.requestHash,
    expectedGameRevision:command.expectedGameRevision,awards,
    totalOverallCharacterXp:total,wouldWriteProfessionXp:false,canCommit:false,
    requiresServiceOwnedAtomicTransaction:true,releaseEnabled:false,
  };
}
