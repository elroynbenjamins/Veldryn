/**
 * Hidden 2.0 pre-commit server contract, not imported by the live gateway.
 *
 * Combines trustworthy reward projections from one authenticated
 * executeGameCommand() invocation. It does not grant XP or persist anything.
 * The final service-only PostgreSQL commit MUST verify every source and
 * atomically write state revision, action receipt, source rows, award rows
 * and character XP. Reject partial input rather than guessing a reward.
 */
import {
  projectPendingOnlineGameCareerProofsV2,
  type TrustedOnlineGameSettlementV2,
} from './online-game-proof-preview';
import {
  projectPendingCombatCareerProofsV2,
  type TrustedCombatProofContextV2,
} from './combat-proof-preview';
import {
  projectPendingInstantCraftCareerProofV2,
  type TrustedInstantCraftV2,
} from './instant-craft-proof-preview';
import type {ProfessionIdV2} from './character-progression';
import type {ValidSettlementSourceV2} from './settlement-journal-preview';

export interface TrustedCombinedGameCommandV2 {
  readonly accountId:string;
  readonly requestId:string;
  readonly requestHash:string;
  readonly expectedGameRevision:number;
  readonly commandType:string;
  readonly adminQa:boolean;
  readonly beforeCharacterId:string|null;
  readonly afterCharacterId:string|null;
  readonly gathering?:TrustedOnlineGameSettlementV2;
  readonly combat?:TrustedCombatProofContextV2;
  readonly instantCraft?:TrustedInstantCraftV2;
}
export interface PendingGameCareerProofV2 {
  readonly sourceKind:ValidSettlementSourceV2;
  readonly sourceId:string;
  readonly accountId:string;
  readonly requestId:string;
  readonly requestHash:string;
  readonly segmentIndex:number;
  readonly characterId:string;
  readonly professionId:ProfessionIdV2|null;
  readonly claimedElapsedSeconds:number;
  readonly baseEffortSeconds:number;
  readonly difficultyBasisPoints:2500|5000|10000;
  readonly expectedGameRevision:number;
  readonly sourceCompletedAtMs:null;
}
function sameIdentity(a:string|null,b:string|null):boolean {
  return a===null?b===null:typeof b==='string'&&a.toLowerCase()===b.toLowerCase();
}
/** Must not allow a forged nested projector to change source ownership. */
function assertNestedAuthority(
 top:TrustedCombinedGameCommandV2,
 nested:{
  accountId:string;requestId:string;requestHash:string;commandType:string;
  adminQa:boolean;beforeCharacterId:string|null;afterCharacterId:string|null;
  expectedGameRevision:number;
 },
):void{
 if(top.accountId.toLowerCase()!==nested.accountId.toLowerCase()||
    top.requestId!==nested.requestId||top.requestHash!==nested.requestHash||
    top.commandType!==nested.commandType||top.adminQa!==nested.adminQa||
    !sameIdentity(top.beforeCharacterId,nested.beforeCharacterId)||
    !sameIdentity(top.afterCharacterId,nested.afterCharacterId)||
    top.expectedGameRevision!==nested.expectedGameRevision)
   throw Error('career_game_v2_nested_source_mismatch');
}
/**
 * Both projectors must consume the exact same source-owned queue when one
 * claim contains gathering and combat. Validating only matching request hashes
 * is insufficient: an independently truncated or modified nested array could
 * describe a different activity at the same ordinal.
 *
 * Combat-only fields (kills and active effort) are intentionally excluded
 * because gathering projection does not read them. The common reward identity
 * MUST be identical at every original ordinal, even for excluded segments.
 * This is a hidden pre-commit consistency check, not DB authorization.
 */
function assertSharedClaimSegmentsV2(
 gathering:TrustedOnlineGameSettlementV2,
 combat:TrustedCombatProofContextV2,
):void {
 if(gathering.segments.length!==combat.segments.length)
   throw Error('career_game_v2_mixed_queue_mismatch');
 for(let index=0;index<gathering.segments.length;index++){
   const left=gathering.segments[index];
   const right=combat.segments[index];
   if(!left?.activity||!left.reward||!right?.activity||!right.reward||
     left.activity.kind!==right.activity.kind||
     left.activity.targetId!==right.activity.targetId||
     left.activity.lastClaimAtMs!==right.activity.lastClaimAtMs||
     left.reward.xp!==right.reward.xp||
     left.reward.elapsedSeconds!==right.reward.elapsedSeconds)
     throw Error('career_game_v2_mixed_queue_mismatch');
 }
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;
const HASH=/^[0-9a-f]{64}$/;
export async function projectCombinedGameCareerProofsV2(
 source:TrustedCombinedGameCommandV2,
):Promise<readonly PendingGameCareerProofV2[]> {
 if(!source||typeof source.accountId!=='string'||!UUID.test(source.accountId)||
   typeof source.requestId!=='string'||!REQUEST.test(source.requestId)||
   typeof source.requestHash!=='string'||!HASH.test(source.requestHash)||
   !Number.isSafeInteger(source.expectedGameRevision)||source.expectedGameRevision<1||
   typeof source.commandType!=='string'||typeof source.adminQa!=='boolean')
   throw Error('career_game_v2_invalid_game_command');
 if(source.adminQa)return [];
 if(source.gathering&&source.combat)
   assertSharedClaimSegmentsV2(source.gathering,source.combat);
 const output:PendingGameCareerProofV2[]=[];
 if(source.gathering){
   assertNestedAuthority(source,{
     ...source.gathering,
     expectedGameRevision:source.gathering.expectedVersion+1,
     beforeCharacterId:source.gathering.beforeCharacterId,
     afterCharacterId:source.gathering.afterCharacterId,
   });
   const projected=await projectPendingOnlineGameCareerProofsV2(source.gathering);
   output.push(...projected.proofs.map(proof=>({
     ...proof,claimedElapsedSeconds:proof.claimedElapsedSeconds,
   })));
 }
 if(source.combat){
   assertNestedAuthority(source,{
     ...source.combat,
     beforeCharacterId:source.combat.originalCharacterId,
     afterCharacterId:source.combat.committedCharacterId,
   });
   const projected=await projectPendingCombatCareerProofsV2(source.combat);
   output.push(...projected.map(proof=>({
     ...proof,claimedElapsedSeconds:0,
   })));
 }
 if(source.instantCraft){
   assertNestedAuthority(source,{
     ...source.instantCraft,
     beforeCharacterId:source.instantCraft.originalCharacterId,
     afterCharacterId:source.instantCraft.committedCharacterId,
   });
   const projected=await projectPendingInstantCraftCareerProofV2(source.instantCraft);
   if(projected)output.push({...projected,claimedElapsedSeconds:0});
 }
 const seen=new Set<string>();
 for(const proof of output){
   if(proof.accountId!==source.accountId.toLowerCase()||
     proof.requestId!==source.requestId||
     proof.requestHash!==source.requestHash||
     proof.characterId!==source.beforeCharacterId?.toLowerCase()||
     proof.expectedGameRevision!==source.expectedGameRevision)
     throw Error('career_game_v2_proof_identity_mismatch');
   const unique=proof.accountId+':'+proof.requestId+':'+proof.segmentIndex;
   if(seen.has(unique))throw Error('career_game_v2_double_segment');
   seen.add(unique);
 }
 return output.sort((a,b)=>a.segmentIndex-b.segmentIndex);
}
