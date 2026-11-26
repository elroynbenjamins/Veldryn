import {validateGameCommand} from '../../apps/mobile/src/core/game-commands';
import type {SupportRecoveryStep,SupportCommitReadback} from './support-activity-recovery';

// Match gameplay.ts canonical validation and request hashing. Keep the receipt
// read service-only; this is not an endpoint or a credential impersonation path.
function canonical(value:unknown):string{
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 const row=value as Record<string,unknown>;
 return '{'+Object.keys(row).sort().map(key=>JSON.stringify(key)+':'+canonical(row[key])).join(',')+'}';
}
export async function supportCommandHash(command:SupportRecoveryStep['command']){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(validateGameCommand(command))));
 return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
type Rpc=<T>(name:string,args:Record<string,unknown>)=>Promise<T>;
type Receipt={requestHash:unknown;response:unknown};
function row(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('support_invalid_receipt');
 return value as Record<string,unknown>;
}
export function supportReceiptReader(rpc:Rpc,grantAware:boolean){
 const name=grantAware?'read_online_game_receipt_ultra_luxe_v1':'read_online_game_receipt_server_v1';
 return async(step:SupportRecoveryStep):Promise<SupportCommitReadback|null>=>{
  if(!/^support_[a-zA-Z0-9_-]{8,100}$/.test(step.requestId))throw new Error('support_invalid_receipt_id');
  const receipt=await rpc<Receipt|null>(name,{p_account_id:step.accountId,p_request_id:step.requestId});
  if(receipt===null)return null;
  if(receipt.requestHash!==await supportCommandHash(step.command))throw new Error('support_receipt_hash_conflict');
  const response=row(receipt.response),state=row(response.state),character=row(state.character);
  if(response.accountId!==step.accountId||response.version!==step.expectedVersion+1||character.id!==step.characterId||
  typeof state.currentRegionId!=='string')throw new Error('support_receipt_scope_conflict');
  const activity=state.activity===null?null:row(state.activity);
  if(activity&&(typeof activity.kind!=='string'||typeof activity.targetId!=='string'))throw new Error('support_invalid_receipt_activity');
  return {version:response.version as number,selectedCharacterId:step.characterId,regionId:state.currentRegionId,
   activity:activity?{kind:activity.kind as string,targetId:activity.targetId as string}:null};
 };
}
