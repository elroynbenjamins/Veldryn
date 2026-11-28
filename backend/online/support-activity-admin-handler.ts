import type {AdminCommandHandler,AdminCommandRow} from '../../control-center/backend_integration/admin-command-worker-v17_3';
import {executeSupportActivityStep,type AuthorizedSupportJob,type SupportActivityIntent,type SupportRecoveryPorts} from './support-activity-recovery';

export const SUPPORT_ACTIVITY_KEYS=['progression.claim_activity','progression.travel_activity','progression.start_gathering','progression.highest_woodcutting'] as const;
type SupportKey=typeof SUPPORT_ACTIVITY_KEYS[number];
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const contentId=(value:unknown):value is string=>typeof value==='string'&&/^[A-Z0-9_]{1,100}$/.test(value);
export interface ClaimedSupportAuthority{
 // Implement with an authoritative service-only DB read of the claimed row,
 // live role/registry checks and approval binding. Do not trust worker payload
 // or browser-supplied actor metadata.
 verifyClaimedCommand(commandId:string):Promise<{row:AdminCommandRow;operatorAccountId:string}>;
}
export function buildSupportActivityHandlers(authority:ClaimedSupportAuthority,ports:SupportRecoveryPorts):Record<SupportKey,AdminCommandHandler>{
 const handler:AdminCommandHandler=async(row,context)=>{
  if(row.id!==context.commandId||!uuid(row.id))throw new Error('invalid_support_command_id');
  const verified=await authority.verifyClaimedCommand(row.id),command=verified.row;
  if(command.id!==row.id||command.command_key!==row.command_key||command.status!=='processing'||command.risk_tier!=='high'||
  !uuid(command.target_account_id)||!uuid(command.target_character_id)||!uuid(verified.operatorAccountId)||
  typeof command.reason!=='string'||!command.reason.trim()||command.reason!==context.auditReason)throw new Error('invalid_support_authority');
  const p=command.parameters_json;
  if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.expectedVersion!=='number'||!Number.isSafeInteger(p.expectedVersion)||p.expectedVersion<0)throw new Error('invalid_support_parameters');
  let intent:SupportActivityIntent;
  switch(command.command_key){
   case 'progression.claim_activity':intent={kind:'claim'};break;
   case 'progression.highest_woodcutting':intent={kind:'highest_woodcutting'};break;
   case 'progression.travel_activity':if(!contentId(p.regionId))throw new Error('invalid_support_region');intent={kind:'travel',regionId:p.regionId};break;
   case 'progression.start_gathering':if(!contentId(p.nodeId))throw new Error('invalid_support_node');intent={kind:'start_gathering',nodeId:p.nodeId};break;
   default:throw new Error('invalid_support_command_key');
  }
  const allowed=['expectedVersion',...(intent.kind==='travel'?['regionId']:intent.kind==='start_gathering'?['nodeId']:[])];
  if(Object.keys(p).some(key=>!allowed.includes(key)))throw new Error('invalid_support_parameters');
  const job:AuthorizedSupportJob={operatorAccountId:verified.operatorAccountId,accountId:command.target_account_id,characterId:command.target_character_id,reason:command.reason,
   requestId:'support_'+command.id.replace(/-/g,''),expectedVersion:p.expectedVersion,intent,approveSelection:false};
  try{
   const result=await executeSupportActivityStep(ports,job);
   return {summary:result.status==='committed'?'Activity recovery step committed':'Already at destination',
    detail:{status:result.status,version:result.version,targetCharacterId:job.characterId,completedStep:result.status==='committed'?result.plan.steps[0]:null,
    remainingSteps:result.plan.steps.slice(result.status==='committed'?1:0),destination:result.plan.destination??null}};
  }catch(error){
   // The existing worker treats invalid_* as terminal. Do not retry stale
   // scope or other permanent denials with a refreshed revision/target.
   const message=error instanceof Error?error.message:'support_unknown_error';
   if(/^(support_(invalid|stale|inactive|prepared|character|region_locked|gathering_locked|receipt_hash_conflict|receipt_scope_conflict))/.test(message))throw new Error('invalid_'+message);
   throw error;
  }
 };
 return Object.fromEntries(SUPPORT_ACTIVITY_KEYS.map(key=>[key,handler])) as Record<SupportKey,AdminCommandHandler>;
}
