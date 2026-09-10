import type { CoopChatCommand, CoopDecisionCommand, CoopMode, CoopReadyCommand, CoopRunRequest } from '../../shared/coop-types';

function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('invalid_request_body');return value as Record<string,unknown>;}
function text(row:Record<string,unknown>,key:string,min=1,max=128):string{const value=row[key];if(typeof value!=='string'||value.length<min||value.length>max)throw new Error(`invalid_${key}`);return value;}
function integer(row:Record<string,unknown>,key:string,min:number,max:number):number{const value=row[key];if(typeof value!=='number'||!Number.isInteger(value)||value<min||value>max)throw new Error(`invalid_${key}`);return value;}
function rejectClientAuthority(row:Record<string,unknown>):void{for(const key of ['role','stats','statSnapshot','loadoutSnapshot','normalizedReadiness'])if(key in row)throw new Error(`client_${key}_forbidden`);}

export function parseCoopRunRequest(value:unknown,mode:CoopMode):CoopRunRequest{
  const row=object(value);rejectClientAuthority(row);
  return {requestId:text(row,'requestId',8),mode,dungeonId:text(row,'dungeonId'),tier:integer(row,'tier',1,5) as CoopRunRequest['tier'],characterId:text(row,'characterId'),loadoutId:text(row,'loadoutId'),loadoutRevision:integer(row,'loadoutRevision',1,Number.MAX_SAFE_INTEGER)};
}
export function parseCoopDecisionCommand(value:unknown):CoopDecisionCommand{
  const row=object(value);rejectClientAuthority(row);
  return {requestId:text(row,'requestId',8),decisionId:text(row,'decisionId'),decisionRevision:integer(row,'decisionRevision',1,Number.MAX_SAFE_INTEGER),optionId:text(row,'optionId')};
}
export function parseCoopReadyCommand(value:unknown):CoopReadyCommand{
  const row=object(value);rejectClientAuthority(row);if(typeof row.accept!=='boolean')throw new Error('invalid_accept');
  return {requestId:text(row,'requestId',8),rosterRevision:integer(row,'rosterRevision',1,Number.MAX_SAFE_INTEGER),accept:row.accept};
}
export function parseCoopChatCommand(value:unknown):CoopChatCommand{
  const row=object(value);return {requestId:text(row,'requestId',8),text:text(row,'text',1,300)};
}
