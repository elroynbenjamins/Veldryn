/** Server integration boundary, not imported by the public gameplay handler.
 * Derive a journal evidence packet from trusted command results and the existing
 * committed online revision. No client-supplied quantities, no extra DB writes.
 * A later atomic commit adapter must consume this packet INSIDE the save transaction.
 */
import type {GameCommandResult} from '../../apps/mobile/src/core/game-commands';
import type {GameState,RewardBundle} from '../../apps/mobile/src/core/types';
export const STORY_JOURNAL_SERVER_RELEASED=false;
type Source={id:string;itemId:string;skillId:string};
type Identity={accountId:string;characterId:string};
type Event=Identity&{receiptId:string;sequence:number;kind:'kill'|'gather';targetId:string;quantity:number;skillId?:string;status:'settled'};
type Packet=Identity&{requestId:string;previousRevision:number;nextRevision:number;events:Event[];legacyQuests:{id:string;status:string;progress:number}[];level:number;equippedCount:number;soloBossVictories:string[];legacyRoutes:string[];released:false;persisted:false;authorizesReward:false};
const valid=(s:unknown):s is string=>typeof s==='string'&&s.length>0&&s.length<=160;
const natural=(x:unknown):x is number=>Number.isSafeInteger(x)&&Number(x)>=0;
export function prepareJournalEvidenceReview(input:{identity:Identity;previousRevision:number;requestId:string;previous:GameState;result:GameCommandResult;gatheringSources:readonly Source[]}):Packet{
 const {identity,previousRevision,requestId,previous,result,gatheringSources}=input;
 const {accountId,characterId}=identity;
 if(!valid(accountId)||!valid(characterId)||!valid(requestId)||!natural(previousRevision)||!natural(previousRevision+1)||previous.character?.id!==characterId||result.state.character?.id!==characterId)throw Error('journal_scope_mismatch');
 const sourceMap=new Map(gatheringSources.map(s=>[s.id,s]));
 if(sourceMap.size!==gatheringSources.length)throw Error('journal_source_conflict');
 const events:Event[]=[];
 const push=(kind:Event['kind'],targetId:string,quantity:number,skillId?:string)=>{
  if(!valid(targetId)||!natural(quantity))throw Error('journal_invalid_quantity');
  if(quantity===0)return;
  events.push({...identity,receiptId:requestId+':'+events.length,sequence:previousRevision+1,kind,targetId,quantity,...(skillId?{skillId}:{}),status:'settled'});
 };
 // Combat contribution units are already produced by the canonical resolver.
 for(const e of result.contributions)if(e.kind==='combat')push('kill',e.contentId,e.units);
 // For gathering objectives count actual awarded resource units, not action count.
 // Queued segments must be examined separately, never combine aggregate + segments.
 const gather=(kind:string,targetId:string,reward:RewardBundle)=>{
  if(!['mining','woodcutting','fishing','herbalism'].includes(kind))return;
  const source=sourceMap.get(targetId);
  if(!source||source.skillId!==kind)throw Error('journal_unknown_gathering_source');
  let quantity=0;
  for(const stack of reward.items)if(stack.itemId===source.itemId){
   if(!natural(stack.quantity)||!natural(quantity+stack.quantity))throw Error('journal_invalid_quantity');
   quantity+=stack.quantity;
  }
  push('gather',source.itemId,quantity,source.skillId);
 };
 if(result.reward?.activityResults){for(const segment of result.reward.activityResults)gather(segment.activity.kind,segment.activity.targetId,segment.reward);}
 else if(result.reward&&previous.activity)gather(previous.activity.kind,previous.activity.targetId,result.reward);
 const state=result.state,character=state.character!;
 return {...identity,requestId,previousRevision,nextRevision:previousRevision+1,events,
  legacyQuests:state.quests.map(q=>({id:q.questId,status:q.status,progress:q.progress})),
  level:character.level,equippedCount:Object.values(character.equipment).filter(valid).length,
  soloBossVictories:[...new Set(state.defeatedBossIds)],legacyRoutes:[...new Set(state.exploredRouteIds??[])],
  released:false,persisted:false,authorizesReward:false};
}
/** In-memory review replay fence only. Durable receipt + revision must be committed with save. */
export function appendJournalEvidenceReview(ledger:{accountId:string;characterId:string;revision:number;requestIds:readonly string[];events:readonly Event[]},packet:Packet){
 if(ledger.accountId!==packet.accountId||ledger.characterId!==packet.characterId)throw Error('journal_scope_mismatch');
 if(ledger.requestIds.includes(packet.requestId))return {status:'replay' as const,ledger,persisted:false as const};
 if(ledger.revision!==packet.previousRevision||packet.nextRevision!==ledger.revision+1)throw Error('journal_revision_gap');
 return {status:'proposed' as const,ledger:{...ledger,revision:packet.nextRevision,requestIds:[...ledger.requestIds,packet.requestId],events:[...ledger.events,...packet.events]},persisted:false as const};
}
