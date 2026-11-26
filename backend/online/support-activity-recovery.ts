import type {GameState} from '../../apps/mobile/src/core/types';
import type {GameCommand} from '../../apps/mobile/src/core/game-commands';
import {switchAccountCharacter} from '../../apps/mobile/src/core/account-actions';
import {GATHERING} from '../../apps/mobile/src/content/skills';
import {HERB_NODES} from '../../apps/mobile/src/content/herbalism';
import {WORLD_ZONES} from '../../apps/mobile/src/content/world-map';
import {regionTravelAvailability} from '../../apps/mobile/src/core/world-navigation';

// Server-side support planning only. Never accept a player-provided save, clock,
// reward, role, or gold amount. A worker must authorize the operator separately.
export type SupportActivityIntent =
 | {kind:'claim'}
 | {kind:'travel';regionId:string}
 | {kind:'start_gathering';nodeId:string}
 | {kind:'highest_woodcutting'};
export type SupportActivityPlan = {
 targetCharacterId:string;
 selectedCharacterId:string;
 destination?:{id:string;name:string;regionId:string;unlockLevel:number};
 steps:GameCommand[];
 requiresSelectionApproval:boolean;
 // The ordinary roster switch settles the previously selected character.
 // An operator must not interpret this as an isolated background-char action.
 previouslySelectedActivity?:{kind:string;targetId:string};
};

export function planSupportActivityRecovery(state:GameState,characterId:string,intent:SupportActivityIntent,serverNow:number):SupportActivityPlan{
 if(!state.character)throw new Error('support_character_missing');
 if(!Number.isSafeInteger(serverNow)||serverNow<state.createdAtMs)throw new Error('support_invalid_clock');
 const selectedCharacterId=state.character.id;
 const inactive=selectedCharacterId!==characterId;
 if(inactive&&!state.otherCharacters?.some(row=>row.character.id===characterId))throw new Error('support_character_not_owned');
 // Only a preview: no mutation to the authoritative state, no reward simulation,
 // and no persistence of the temporarily selected view.
 const view=inactive?switchAccountCharacter(structuredClone(state),characterId,serverNow):state;
 if(view.character?.id!==characterId)throw new Error('support_character_scope_mismatch');
 const steps:GameCommand[]=inactive?[{type:'roster_switch',args:{id:characterId}}]:[];
 const plan:SupportActivityPlan={targetCharacterId:characterId,selectedCharacterId,steps,requiresSelectionApproval:inactive,
  ...(inactive&&state.activity?{previouslySelectedActivity:{kind:state.activity.kind,targetId:state.activity.targetId}}:{})};
 const level=(skillId:string)=>view.skills.find(row=>row.skillId===skillId)?.level??0;
 const travelAllowed=(regionId:string)=>{const zone=WORLD_ZONES.find(row=>row.id===regionId);return !!zone&&regionTravelAvailability(view,zone)==='available';};
 if(intent.kind==='claim'){steps.push({type:'claim'});return plan;}
 if(intent.kind==='travel'){
  if(!travelAllowed(intent.regionId))throw new Error('support_region_locked');
  if(view.currentRegionId!==intent.regionId)steps.push({type:'travel',args:{id:intent.regionId}});
  return plan;
 }
 const canGather=(node:{skillId:string;unlockLevel:number;zoneId:string})=>level(node.skillId)>=node.unlockLevel&&travelAllowed(node.zoneId);
 const node=intent.kind==='highest_woodcutting'
  ?GATHERING.filter(row=>row.skillId==='woodcutting'&&canGather(row)).sort((a,b)=>b.unlockLevel-a.unlockLevel||Number(b.zoneId===view.currentRegionId)-Number(a.zoneId===view.currentRegionId)||a.id.localeCompare(b.id))[0]
  :intent.kind==='start_gathering'?[...GATHERING,...HERB_NODES].find(row=>row.id===intent.nodeId):undefined;
 if(!node||!canGather(node))throw new Error('support_gathering_locked');
 plan.destination={id:node.id,name:node.name,regionId:node.zoneId,unlockLevel:node.unlockLevel};
 if(view.currentRegionId!==node.zoneId)steps.push({type:'travel',args:{id:node.zoneId}});
 // The normal start command settles and stops the previous activity itself.
 // Do not issue a redundant claim in the same region.
 steps.push({type:'start',args:{kind:'gathering',id:node.id}});
 return plan;
}

export type SupportRecoverySnapshot={accountId:string;version:number;serverNow:number;state:GameState};
export type SupportRecoveryStep={accountId:string;characterId:string;expectedVersion:number;requestId:string;command:GameCommand};
export type AuthorizedSupportJob={
 operatorAccountId:string;accountId:string;characterId:string;reason:string;requestId:string;expectedVersion:number;
 intent:SupportActivityIntent;approveSelection:boolean;
};
// A service-only worker implements these ports. dispatch must use the existing
// authoritative gameplay gateway, normal idempotent commit and target-account
// revision CAS. Audit authorization MUST be durable before dispatch; replay
// must be checked before fresh execution. Never connect this to a public route.
export type SupportRecoveryResult={status:'committed'|'already_at_destination';version:number;plan:SupportActivityPlan};
export interface SupportRecoveryPorts{
 // Must bind actor, account, character, intent, approval and revision to the
 // immutable job ID, and return a durable prior result for an exact replay.
 authorizeAndAudit(job:AuthorizedSupportJob):Promise<{replay?:SupportRecoveryResult}>;
 read(accountId:string):Promise<SupportRecoverySnapshot>;
 dispatch(step:SupportRecoveryStep):Promise<{version:number;selectedCharacterId:string;regionId:string;activity?:{kind:string;targetId:string}|null}>;
 recordResult(job:AuthorizedSupportJob,result:SupportRecoveryResult):Promise<void>;
}
export async function executeSupportActivityStep(ports:SupportRecoveryPorts,job:AuthorizedSupportJob){
 if(!job.operatorAccountId||!job.accountId||!job.characterId||!job.reason.trim()||job.reason.length>500||
 !/^support_[a-zA-Z0-9_-]{8,100}$/.test(job.requestId)||!Number.isSafeInteger(job.expectedVersion)||job.expectedVersion<0)throw new Error('support_invalid_job');
 const authorized=await ports.authorizeAndAudit(job);
 if(authorized.replay)return authorized.replay;
 const snapshot=await ports.read(job.accountId);
 if(snapshot.accountId!==job.accountId||snapshot.version!==job.expectedVersion)throw new Error('support_stale_scope');
 const plan=planSupportActivityRecovery(snapshot.state,job.characterId,job.intent,snapshot.serverNow);
 if(plan.requiresSelectionApproval&&!job.approveSelection)throw new Error('support_selection_approval_required');
 const command=plan.steps[0];
 if(!command){const result={status:'already_at_destination' as const,version:snapshot.version,plan};await ports.recordResult(job,result);return result;}
 // One command per operator-approved step; do not silently retry or proceed
 // after a conflict. Re-read and explicitly approve the next step (if any).
 const result=await ports.dispatch({accountId:job.accountId,characterId:job.characterId,expectedVersion:snapshot.version,requestId:job.requestId,command});
 if(result.version!==snapshot.version+1||result.selectedCharacterId!==job.characterId||
 (command.type==='travel'&&result.regionId!==command.args?.id)||
 (command.type==='start'&&result.activity?.targetId!==command.args?.id))throw new Error('support_unconfirmed_commit');
 const completed={status:'committed' as const,version:result.version,plan};
 await ports.recordResult(job,completed);
 return completed;
}
