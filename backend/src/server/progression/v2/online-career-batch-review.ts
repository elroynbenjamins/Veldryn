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
export async function previewOnlineGameCareerBatchV2(
  command:TrustedCombinedGameCommandV2,
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
