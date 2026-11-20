/**
 * Veldryn Party Events V44 — hidden canonical source PREPARATION policy.
 *
 * Runs only after executeGameCommand on the trusted server, before the
 * existing atomic online-game commit. This is not a DB write or API.
 *
 * It MUST NOT be called on user JSON, an unverified save, a replay response or
 * a QA command. Future integration must persist this packet in the SAME
 * transaction as the successful online-game command, never as a best-effort
 * post-commit reward claim.
 */
import type {GameCommandResult} from '../../apps/mobile/src/core/game-commands';
import type {ActiveActivity,RewardBundle} from '../../apps/mobile/src/core/types';
import {GATHERING} from '../../apps/mobile/src/content/skills';
import {HERB_NODES} from '../../apps/mobile/src/content/herbalism';

export const PARTY_EVENT_SOURCE_PACKET_V44_RELEASED=false;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST=/^[a-zA-Z0-9_-]{8,128}$/;
const APPROVED_SCOUTS=Object.freeze([
 'GREENWOOD_TREE','GREENFIELDS_COPPER_OUTCROP','DEWLEAF_PATCH',
] as const);
const GATHERING_KINDS=new Set(['mining','woodcutting','fishing','herbalism']);
type PreparedCraft=Readonly<{
 kind:'craft';idempotencyKey:string;recipeId:string;quantity:number;
}>;
type PreparedIdle=Readonly<{
 kind:'idle';idempotencyKey:string;activityId:string;elapsedSec:number;
 resourceAmount:number;xpAmount:number;
}>;
export interface CanonicalPartySourcePacketV44 {
 readonly kind:'party-event-canonical-source-packet-v44';
 readonly accountId:string;
 readonly characterId:string;
 readonly requestId:string;
 readonly craft:readonly PreparedCraft[];
 readonly idle:readonly PreparedIdle[];
 readonly writesAuthorized:false;
 readonly eventPointsGranted:0;
 readonly rewardsGranted:false;
}
function invalid(reason:string):never{throw Error('party_event_v44_'+reason);}
const whole=(value:unknown,min:number,max:number):value is number=>typeof value==='number'
 &&Number.isSafeInteger(value)&&value>=min&&value<=max;

/** Prevent content drift from silently widening the Level 1 scout sources. */
function verifiedScoutContent(){
 const result=new Map<string,{itemId:string;skillId:string}>();
 const sources=[...GATHERING,...HERB_NODES];
 for(const id of APPROVED_SCOUTS){
  const matches=sources.filter(node=>node.id===id);
  if(matches.length!==1)invalid('missing_or_duplicate_scout_content:'+id);
  const node=matches[0]!;
  if(node.unlockLevel!==1||node.zoneId!=='GREENFIELDS'
    ||!GATHERING_KINDS.has(node.skillId)
    ||!whole(node.min,1,10000)||!whole(node.max,node.min,10000)
    ||!Number.isFinite(node.seconds)||node.seconds<1
    ||typeof node.itemId!=='string'||node.itemId.length<3)
    invalid('invalid_scout_content:'+id);
  result.set(id,{itemId:node.itemId,skillId:node.skillId});
 }
 return result;
}

/**
 * Only the result of an actual authoritative game command is eligible.
 *
 * For first-launch safety we deliberately omit queue/multi-activity gathering:
 * its per-segment commit/end timestamps are not yet persisted, and treating a
 * long queued window as ending "now" could credit pre-enrollment AFK time.
 */
export function preparePartySourcePacketV44(input:{
 readonly accountId:string;
 readonly characterId:string;
 readonly requestId:string;
 readonly trustedServerNowMs:number;
 readonly adminQa:boolean;
 readonly previousActivity:ActiveActivity|null;
 readonly result:GameCommandResult;
}):CanonicalPartySourcePacketV44{
 const {accountId,characterId,requestId,trustedServerNowMs,adminQa,previousActivity,result}=input;
 if(!UUID.test(accountId)||!UUID.test(characterId)||!REQUEST.test(requestId)
  ||!whole(trustedServerNowMs,1,Number.MAX_SAFE_INTEGER)
  ||result?.state?.character?.id!==characterId
  ||!Array.isArray(result.contributions)||result.contributions.length>4)
  invalid('untrusted_committed_context');
 const base={
  kind:'party-event-canonical-source-packet-v44' as const,
  accountId,characterId,requestId,
  writesAuthorized:false as const,eventPointsGranted:0 as const,rewardsGranted:false as const,
 };
 if(adminQa)return {...base,craft:[],idle:[]};
 const scouts=verifiedScoutContent();
 const craft:PreparedCraft[]=[];
 for(const [index,source] of result.contributions.entries()){
  if(source.kind!=='crafting')continue;
  if(!whole(source.units,1,100000)
   ||typeof source.contentId!=='string'
   ||source.contentId.length<3||source.contentId.length>120
   ||source.contentId.trim()!==source.contentId)
   invalid('invalid_server_craft_source');
  craft.push({
   kind:'craft',idempotencyKey:'pe44:'+requestId+':craft:'+index,
   recipeId:source.contentId,quantity:source.units,
  });
 }
 const idle:PreparedIdle[]=[];
 const reward:RewardBundle|undefined=result.reward;
 if(previousActivity&&reward
  &&!reward.activityResults?.length
  &&GATHERING_KINDS.has(previousActivity.kind)){
  const source=scouts.get(previousActivity.targetId);
  // Unapproved/mid-level activity is ignored until its real gameplay
  // content and SQL allowlist have separately been reviewed.
  if(source){
   const elapsedSec=Math.floor(reward.elapsedSeconds);
   const amount=reward.items
    .filter(item=>item.itemId===source.itemId)
    .reduce((sum,item)=>sum+item.quantity,0);
   if(whole(elapsedSec,60,86400)
    &&whole(reward.xp,0,Number.MAX_SAFE_INTEGER)
    &&whole(amount,1,Number.MAX_SAFE_INTEGER)
    &&whole(reward.kills,1,1000000)
    &&whole(previousActivity.lastClaimAtMs,0,trustedServerNowMs)
    &&previousActivity.lastClaimAtMs+elapsedSec*1000<=trustedServerNowMs){
    idle.push({
     kind:'idle',idempotencyKey:'pe44:'+requestId+':idle:0',
     activityId:previousActivity.targetId,elapsedSec,
     resourceAmount:amount,xpAmount:reward.xp,
    });
   }
  }
 }
 return {...base,craft,idle};
}
