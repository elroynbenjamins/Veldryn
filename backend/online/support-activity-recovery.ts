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
export type SupportRecoveryResult={status:'committed'|'already_at_destination';version:number;plan:SupportActivityPlan};
export type PreparedSupportStep={step:SupportRecoveryStep;plan:SupportActivityPlan};
export type SupportCommitReadback={version:number;selectedCharacterId:string;regionId:string;activity?:{kind:string;targetId:string}|null};
export interface SupportRecoveryPorts{
 // Bind immutable job identity, verify current authorization and record audit.
 // Return previously prepared exact step (including the selected node), not a
 // fresh plan when a transport error leaves the commit outcome unknown.
 authorizeAndAudit(job:AuthorizedSupportJob):Promise<{replay?:SupportRecoveryResult;prepared?:PreparedSupportStep}>;
 read(accountId:string):Promise<SupportRecoverySnapshot>;
 // Persist before any side effect. Compare-and-set the immutable job, rejecting
 // a conflicting preparation; concurrent workers must get the same step.
 prepare(job:AuthorizedSupportJob,prepared:PreparedSupportStep):Promise<void>;
 // Only an exact server receipt for this account, ID and canonical command.
 // Never infer success from the current activity or a matching revision.
 recoverReceipt(step:SupportRecoveryStep):Promise<SupportCommitReadback|null>;
 // Use the ordinary server command engine, revision and wallet CAS; service
 // only. Support request IDs must be reserved from public player requests.
 dispatch(step:SupportRecoveryStep):Promise<SupportCommitReadback>;
 recordResult(job:AuthorizedSupportJob,result:SupportRecoveryResult):Promise<void>;
}

function validId(value:unknown):value is string{return typeof value==='string'&&value.length>0&&value.length<=128&&/^[a-zA-Z0-9_-]+$/.test(value);}
function validIntent(value:unknown):value is SupportActivityIntent{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const row=value as Record<string,unknown>,keys=Object.keys(row);
 if(row.kind==='claim'||row.kind==='highest_woodcutting')return keys.length===1;
 if(row.kind==='travel')return keys.length===2&&validId(row.regionId);
 if(row.kind==='start_gathering')return keys.length===2&&validId(row.nodeId);
 return false;
}
function validatePrepared(job:AuthorizedSupportJob,prepared:PreparedSupportStep){
 const {step,plan}=prepared;
 if(step.accountId!==job.accountId||step.characterId!==job.characterId||step.expectedVersion!==job.expectedVersion||step.requestId!==job.requestId||
 plan.selectedCharacterId!==job.characterId||plan.targetCharacterId!==job.characterId||plan.requiresSelectionApproval||
 !['claim','travel','start'].includes(step.command.type)||JSON.stringify(step.command)!==JSON.stringify(plan.steps[0]))throw new Error('support_prepared_scope_mismatch');
 const args=step.command.args??{},keys=Object.keys(args);
 if((step.command.type==='claim'&&(keys.length!==0||job.intent.kind!=='claim'))||
 (step.command.type==='travel'&&(keys.length!==1||!validId(args.id)||(job.intent.kind==='travel'?args.id!==job.intent.regionId:job.intent.kind==='claim'||args.id!==plan.destination?.regionId)))||
 (step.command.type==='start'&&(keys.length!==2||args.kind!=='gathering'||!validId(args.id)||args.id!==plan.destination?.id||
 (job.intent.kind==='start_gathering'?args.id!==job.intent.nodeId:job.intent.kind!=='highest_woodcutting'))))throw new Error('support_prepared_intent_mismatch');
}
export async function executeSupportActivityStep(ports:SupportRecoveryPorts,job:AuthorizedSupportJob):Promise<SupportRecoveryResult>{
 if(!validId(job.operatorAccountId)||!validId(job.accountId)||!validId(job.characterId)||typeof job.reason!=='string'||!job.reason.trim()||job.reason.length>500||
 typeof job.requestId!=='string'||!/^support_[a-zA-Z0-9_-]{8,100}$/.test(job.requestId)||!Number.isSafeInteger(job.expectedVersion)||job.expectedVersion<0||
 typeof job.approveSelection!=='boolean'||!validIntent(job.intent))throw new Error('support_invalid_job');
 const authorized=await ports.authorizeAndAudit(job);
 if(authorized.replay)return authorized.replay;
 let prepared=authorized.prepared;
 if(!prepared){
  const snapshot=await ports.read(job.accountId);
  if(snapshot.accountId!==job.accountId||snapshot.version!==job.expectedVersion)throw new Error('support_stale_scope');
  const plan=planSupportActivityRecovery(snapshot.state,job.characterId,job.intent,snapshot.serverNow);
  // Current ordinary roster switching settles the old selected character;
  // the current commit credits party contributions to the newly selected ID.
  // Approval alone cannot repair attribution. Fail closed even if approved.
  if(plan.requiresSelectionApproval)throw new Error('support_inactive_character_requires_isolated_settlement');
  const command=plan.steps[0];
  if(!command){const result={status:'already_at_destination' as const,version:snapshot.version,plan};await ports.recordResult(job,result);return result;}
  prepared={step:{accountId:job.accountId,characterId:job.characterId,expectedVersion:snapshot.version,requestId:job.requestId,command},plan};
  validatePrepared(job,prepared);
  await ports.prepare(job,prepared);
 }
 validatePrepared(job,prepared);
 // Receipt lookup comes BEFORE the current-state check: a lost response may
 // have already committed the exact command and advanced the account version.
 let result=await ports.recoverReceipt(prepared.step);
 if(!result){
  const current=await ports.read(job.accountId);
  if(current.accountId!==job.accountId||current.version!==job.expectedVersion||current.state.character?.id!==job.characterId){
   // A concurrent retry might have committed during the read.
   result=await ports.recoverReceipt(prepared.step);
   if(!result)throw new Error('support_stale_scope');
  }else result=await ports.dispatch(prepared.step);
 }
 const {step,plan}=prepared;
 if(result.version!==step.expectedVersion+1||result.selectedCharacterId!==job.characterId||
 (step.command.type==='travel'&&result.regionId!==step.command.args?.id)||
 (step.command.type==='start'&&result.activity?.targetId!==step.command.args?.id))throw new Error('support_unconfirmed_commit');
 const completed={status:'committed' as const,version:result.version,plan};
 await ports.recordResult(job,completed);
 return completed;
}
