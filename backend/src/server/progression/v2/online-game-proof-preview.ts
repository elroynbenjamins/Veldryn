/**
 * Hidden Veldryn 2.0 pending Career XP source proofs for online_game_v1.
 * No runtime import, database access, or XP minting.
 *
 * Call only after executeGameCommand settles a trusted 'claim', before
 * commit_online_game_guild_pve_v1. The future DB adapter must insert proofs
 * into the SAME transaction as state revision + online receipt + XP award,
 * and use DB clock_timestamp() for completion. No best-effort async grants.
 *
 * Gathering only: combat, processing and instant crafting remain UNPROVEN.
 */
import type {ProfessionIdV2} from './character-progression';
import type {ValidSettlementSourceV2} from './settlement-journal-preview';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;
const HASH=/^[0-9a-f]{64}$/;
const TARGET=/^[A-Za-z0-9_:-]{3,100}$/;
const GATHERING:ReadonlySet<string>=new Set(['mining','woodcutting','fishing','herbalism']);
type GatheringSkillV2='mining'|'woodcutting'|'fishing'|'herbalism';
interface ServerGatherNodeV2 {
  readonly nodeId:string;
  readonly skillId:GatheringSkillV2;
  readonly unlockLevel:number;
}
interface ServerSegmentV2{
  readonly activity:{
    readonly kind:string;
    readonly targetId:string;
    readonly lastClaimAtMs:number;
  };
  readonly reward:{
    readonly elapsedSeconds:number;
    readonly xp:number;
  };
}
export interface TrustedOnlineGameSettlementV2 {
  readonly accountId:string;
  readonly requestId:string;
  readonly requestHash:string;
  readonly expectedVersion:number;
  readonly commandType:string;
  /** Actual pre-command active character, never post-switch alternative. */
  readonly beforeCharacterId:string|null;
  readonly afterCharacterId:string|null;
  readonly adminQa:boolean;
  /** Server-simulated activityResults or validated pre-command fallback. */
  readonly segments:readonly ServerSegmentV2[];
  readonly nodeCatalogue:readonly ServerGatherNodeV2[];
  readonly ownerSkillLevels:Readonly<Partial<Record<GatheringSkillV2,number>>>;
}
export interface PendingCareerProofV2{
  readonly sourceKind:ValidSettlementSourceV2;
  readonly sourceId:string;
  readonly accountId:string;
  readonly requestId:string;
  readonly requestHash:string;
  readonly segmentIndex:number;
  readonly characterId:string;
  readonly professionId:ProfessionIdV2;
  readonly claimedElapsedSeconds:number;
  readonly baseEffortSeconds:number;
  readonly difficultyBasisPoints:2500|5000|10000;
  readonly expectedGameRevision:number;
  /** The database commit assigns completion, not the device/gateway. */
  readonly sourceCompletedAtMs:null;
}
export interface PendingCareerProofProjectionV2 {
  readonly proofs:readonly PendingCareerProofV2[];
  readonly excludedSegments:number;
  readonly noncombatOnly:true;
}
const validLevel=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=1&&n<=100;
const validSec=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>0&&n<=86400;
async function hex(data:string):Promise<string>{
  const raw=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data));
  return Array.from(new Uint8Array(raw),byte=>byte.toString(16).padStart(2,'0')).join('');
}
function relativeDifficulty(ownerLevel:number,unlockLevel:number):2500|5000|10000{
  const delta=ownerLevel-unlockLevel;
  return delta>=40?2500:delta>=20?5000:10000;
}
export async function projectPendingOnlineGameCareerProofsV2(
  source:TrustedOnlineGameSettlementV2,
):Promise<PendingCareerProofProjectionV2>{
  if(!source||!UUID.test(source.accountId)||!REQUEST.test(source.requestId)||
     !HASH.test(source.requestHash)||!Number.isSafeInteger(source.expectedVersion)||
     source.expectedVersion<0||typeof source.commandType!=='string'||
     typeof source.adminQa!=='boolean'||!Array.isArray(source.segments)||
     source.segments.length>64||!Array.isArray(source.nodeCatalogue)||
     source.nodeCatalogue.length>500||!source.ownerSkillLevels||
     typeof source.ownerSkillLevels!=='object')
    throw Error('career_proof_v2_invalid_command_evidence');
  if(source.adminQa||source.commandType!=='claim'){
    return {proofs:[],excludedSegments:source.segments.length,noncombatOnly:true};
  }
  if(!source.beforeCharacterId||!UUID.test(source.beforeCharacterId)||
     !source.afterCharacterId||!UUID.test(source.afterCharacterId)||
     source.beforeCharacterId.toLowerCase()!==source.afterCharacterId.toLowerCase())
    throw Error('career_proof_v2_character_switch_or_missing');
  const nodes=new Map<string,ServerGatherNodeV2>();
  for(const node of source.nodeCatalogue){
    if(!node||!TARGET.test(node.nodeId)||!GATHERING.has(node.skillId)||
       !validLevel(node.unlockLevel)||nodes.has(node.nodeId))
      throw Error('career_proof_v2_invalid_node_catalogue');
    nodes.set(node.nodeId,node);
  }
  const proofs:PendingCareerProofV2[]=[];
  let excludedSegments=0;
  for(let i=0;i<source.segments.length;i++){
    const segment=source.segments[i];
    if(!segment||!segment.activity||!segment.reward)
      throw Error('career_proof_v2_invalid_segment');
    const {activity,reward}=segment;
    if(!GATHERING.has(activity.kind)){
      excludedSegments++;
      continue; // requires separate verified award authority
    }
    if(typeof activity.targetId!=='string'||!TARGET.test(activity.targetId)||
       !Number.isSafeInteger(activity.lastClaimAtMs)||activity.lastClaimAtMs<0||
       !validSec(reward.elapsedSeconds)||typeof reward.xp!=='number'||
       !Number.isSafeInteger(reward.xp)||reward.xp<0)
      throw Error('career_proof_v2_invalid_gathering_reward');
    if(reward.xp===0){excludedSegments++;continue;}
    const node=nodes.get(activity.targetId);
    if(!node||node.skillId!==activity.kind)
      throw Error('career_proof_v2_unknown_or_wrong_node');
    const level=source.ownerSkillLevels[node.skillId];
    if(!validLevel(level)||level<node.unlockLevel)
      throw Error('career_proof_v2_skill_not_authorized');
    const sourceId=await hex('career-v2:'+source.accountId.toLowerCase()+':'+
      source.requestId+':'+source.requestHash+':'+i);
    proofs.push({
      sourceKind:'gathering_claim',sourceId,
      accountId:source.accountId.toLowerCase(),requestId:source.requestId,requestHash:source.requestHash,segmentIndex:i,
      characterId:source.beforeCharacterId.toLowerCase(),
      professionId:node.skillId,
      claimedElapsedSeconds:reward.elapsedSeconds,
      baseEffortSeconds:reward.elapsedSeconds,
      difficultyBasisPoints:relativeDifficulty(level,node.unlockLevel),
      expectedGameRevision:source.expectedVersion+1,
      sourceCompletedAtMs:null,
    });
  }
  return {proofs,excludedSegments,noncombatOnly:true};
}
