/**
 * Hidden Veldryn 2.0 combat Career XP proof projector.
 * Never hooked into live gameplay or runtime combat. The caller must obtain
 * all fields from the authenticated server-side executeGameCommand result.
 *
 * Only ordinary combat intervals with confirmed kills, positive earned combat
 * XP and verified active fight duration are projected. Boss/story/dungeon
 * outcomes require their own settlement proof and are NOT inferred here.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH=/^[0-9a-f]{64}$/;
const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;
const CONTENT=/^[A-Z0-9_:-]{3,100}$/;
export interface CombatProofMonsterV2 {
  readonly id:string;
  readonly level:number;
  readonly boss?:boolean;
}
export interface CombatProofSegmentV2 {
  readonly activity:{readonly kind:string;readonly targetId:string;readonly lastClaimAtMs:number};
  readonly reward:{
    readonly xp:number;
    readonly kills:number;
    readonly elapsedSeconds:number;
    readonly combatEffort?:{readonly startsAtMs:number;readonly endsAtMs:number};
  };
}
export interface TrustedCombatProofContextV2 {
  readonly accountId:string;
  readonly requestId:string;
  readonly requestHash:string;
  readonly commandType:string;
  readonly expectedGameRevision:number;
  readonly adminQa:boolean;
  readonly originalCharacterId:string|null;
  readonly committedCharacterId:string|null;
  readonly combatLevel:number;
  readonly monsters:readonly CombatProofMonsterV2[];
  readonly segments:readonly CombatProofSegmentV2[];
}
export interface PendingCombatCareerProofV2 {
  readonly sourceKind:'combat_reward';
  readonly sourceId:string;
  readonly accountId:string;
  readonly requestId:string;
  readonly requestHash:string;
  readonly segmentIndex:number;
  readonly characterId:string;
  readonly professionId:null;
  readonly baseEffortSeconds:number;
  readonly difficultyBasisPoints:2500|5000|10000;
  readonly expectedGameRevision:number;
  readonly sourceCompletedAtMs:null;
}
const safeInt=(value:unknown,lo:number,hi:number):value is number=>
  typeof value==='number'&&Number.isSafeInteger(value)&&value>=lo&&value<=hi;
async function digest(input:string):Promise<string>{
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input)));
  return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
export async function projectPendingCombatCareerProofsV2(
 source:TrustedCombatProofContextV2,
):Promise<readonly PendingCombatCareerProofV2[]>{
  if(!source||!UUID.test(source.accountId)||!REQUEST.test(source.requestId)||
    !HASH.test(source.requestHash)||!safeInt(source.expectedGameRevision,1,Number.MAX_SAFE_INTEGER)||
    !safeInt(source.combatLevel,1,100)||!Array.isArray(source.monsters)||
    source.monsters.length>600||!Array.isArray(source.segments)||source.segments.length>64||
    typeof source.adminQa!=='boolean'||typeof source.commandType!=='string')
    throw Error('combat_proof_v2_invalid_context');
  if(source.adminQa||source.commandType!=='claim')return [];
  if(!source.originalCharacterId||!UUID.test(source.originalCharacterId)||
    !source.committedCharacterId||!UUID.test(source.committedCharacterId)||
    source.originalCharacterId.toLowerCase()!==source.committedCharacterId.toLowerCase())
    throw Error('combat_proof_v2_character_switch');
  const catalogue=new Map<string,CombatProofMonsterV2>();
  for(const monster of source.monsters){
    if(!monster||!CONTENT.test(monster.id)||!safeInt(monster.level,1,100)||
      (monster.boss!==undefined&&typeof monster.boss!=='boolean')||
      catalogue.has(monster.id))
      throw Error('combat_proof_v2_invalid_catalogue');
    catalogue.set(monster.id,monster);
  }
  const proof:PendingCombatCareerProofV2[]=[];
  // One claim's ordinary fight windows must be non-overlapping and bounded
  // by their server-authored elapsed window, not just have the right length.
  let priorCreditedCombatEndMs:number|null=null;
  for(let index=0;index<source.segments.length;index++){
    const segment=source.segments[index];
    if(!segment?.activity||!segment.reward)throw Error('combat_proof_v2_invalid_segment');
    const {activity,reward}=segment;
    if(activity.kind!=='combat')continue;
    if(!CONTENT.test(activity.targetId)||!safeInt(activity.lastClaimAtMs,0,Number.MAX_SAFE_INTEGER)||
      !safeInt(reward.xp,0,Number.MAX_SAFE_INTEGER)||
      !safeInt(reward.kills,0,1000000)||
      !safeInt(reward.elapsedSeconds,0,86400))
      throw Error('combat_proof_v2_invalid_reward');
    if(reward.kills===0||reward.xp===0)continue;
    const monster=catalogue.get(activity.targetId);
    if(!monster)throw Error('combat_proof_v2_unknown_monster');
    if(monster.boss)continue; // separate boss settlement must own boss XP
    const interval=reward.combatEffort;
    if(!interval||!safeInt(interval.startsAtMs,0,Number.MAX_SAFE_INTEGER)||
      !safeInt(interval.endsAtMs,0,Number.MAX_SAFE_INTEGER)||
      interval.endsAtMs<=interval.startsAtMs||
      interval.startsAtMs<activity.lastClaimAtMs)
      throw Error('combat_proof_v2_unverified_combat_effort');
    const ms=interval.endsAtMs-interval.startsAtMs;
    const claimWindowEndMs=activity.lastClaimAtMs+reward.elapsedSeconds*1000;
    if(!Number.isSafeInteger(ms)||ms>86400000||
      ms>reward.elapsedSeconds*1000||
      !Number.isSafeInteger(claimWindowEndMs)||
      interval.endsAtMs>claimWindowEndMs)
      throw Error('combat_proof_v2_invalid_combat_duration');
    // The same seconds of simulated combat cannot earn XP in two segments.
    if(priorCreditedCombatEndMs!==null&&
       interval.startsAtMs<priorCreditedCombatEndMs)
      throw Error('combat_proof_v2_overlapping_effort');
    priorCreditedCombatEndMs=interval.endsAtMs;
    const seconds=Math.floor(ms/1000);
    if(seconds<1)continue; // no subsecond farming credit
    const overlevel=source.combatLevel-monster.level;
    const difficultyBasisPoints:2500|5000|10000=overlevel>=40?2500:overlevel>=20?5000:10000;
    const sourceId=await digest(
      'career-v2:'+source.accountId.toLowerCase()+':'+source.requestId+':'+source.requestHash+':'+index,
    );
    proof.push({
      sourceKind:'combat_reward',sourceId,
      accountId:source.accountId.toLowerCase(),requestId:source.requestId,
      requestHash:source.requestHash,segmentIndex:index,
      characterId:source.originalCharacterId.toLowerCase(),
      professionId:null,baseEffortSeconds:seconds,difficultyBasisPoints,
      expectedGameRevision:source.expectedGameRevision,sourceCompletedAtMs:null,
    });
  }
  return proof;
}
