import {canonicalUltraLuxeCollection,ULTRA_LUXE_FULL_SET_COMMAND,ULTRA_LUXE_REQUEST_PREFIX,ULTRA_LUXE_FULL_SET_DEFINITIONS} from '../../apps/mobile/src/core/ultra-luxe-full-set-command';
import {ultraLuxeGradient} from '../../apps/mobile/src/core/ultra-luxe-name-gradients';
import type {GameState} from '../../apps/mobile/src/core/types';


const object=(v:unknown):Record<string,unknown>|undefined=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:undefined;
export class FullSetCommandError extends Error{constructor(message:string,readonly status=400){super(message);}}
export interface FullSetCommandServices{
 /** Explicit server configuration, false until six-set schema and bundle are ready. */
 enabled:boolean;
 rpc<T>(name:string,args:Record<string,unknown>):Promise<T>;
 hash(value:string):Promise<string>;
}
type Load={state:GameState|null;version:number;walletGold:number|null;serverNow:number;ultraLuxeCollectionIds?:unknown};
const exactKeys=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));
/** Authenticated gameplay route candidate. accountId must come from verified
 * bearer session, never the request. The SQL owns revision, grant and replay checks.
 * No normal gameplay simulation or contribution is run for a cosmetic-only action. */
export async function executeUltraLuxeFullSetCommand(services:FullSetCommandServices,accountId:string,raw:unknown){
 if(!services.enabled)throw new FullSetCommandError('feature_not_released',403);
 if(!accountId)throw new FullSetCommandError('auth_required',401);
 const body=object(raw),cmd=object(body?.command),a=object(cmd?.args);
 if(!body||!cmd||!a||!exactKeys(body,['requestId','expectedVersion','command'])||
  !exactKeys(cmd,['type','args'])||!exactKeys(a,['collectionId','characterId','expectedNameId'])||
  cmd.type!==ULTRA_LUXE_FULL_SET_COMMAND||typeof body.requestId!=='string'||
  !body.requestId.startsWith(ULTRA_LUXE_REQUEST_PREFIX)||!/^luxe_full_set_[A-Za-z0-9_-]{16,80}$/.test(body.requestId)||
  typeof body.expectedVersion!=='number'||!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion<0||
  typeof a.characterId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.characterId)||
  !(a.expectedNameId===null||ultraLuxeGradient(a.expectedNameId)))throw new FullSetCommandError('invalid_full_set_request');
 const collection=canonicalUltraLuxeCollection(a.collectionId);
 const definition=ULTRA_LUXE_FULL_SET_DEFINITIONS.find(d=>d[0]===collection);
 if(!definition||a.collectionId!==collection)throw new FullSetCommandError('invalid_full_set_collection');
 const requestHash=await services.hash(JSON.stringify([ULTRA_LUXE_FULL_SET_COMMAND,body.expectedVersion,collection,a.characterId,a.expectedNameId]));
 const loaded=await services.rpc<Load>('load_online_game_ultra_luxe_v1',{p_account_id:accountId});
 if(!loaded||!Array.isArray(loaded.ultraLuxeCollectionIds)||!Number.isSafeInteger(loaded.walletGold)||!loaded.state)throw new FullSetCommandError('full_set_authority_unavailable',503);
 const state=structuredClone(loaded.state);
 // On a replay after character switch, SQL returns current authority before
 // inspecting this draft. On a new request its scope/revision checks reject it.
 if(state.character){
  state.character={...state.character,profileBackgroundId:definition[1],profileBorderId:definition[2],
   selectedCosmeticPetId:definition[3],profileTitle:definition[4],profileEffectId:undefined,gold:loaded.walletGold!};
 }
 const response={accountId,state,version:body.expectedVersion+1,serverNow:loaded.serverNow};
 const result=object(await services.rpc('commit_ultra_luxe_full_set_server_v1',{
  p_account_id:accountId,p_character_id:a.characterId,p_collection_id:collection,
  p_expected_version:body.expectedVersion,p_expected_gold:loaded.walletGold,p_expected_grants:loaded.ultraLuxeCollectionIds,
  p_expected_name_id:a.expectedNameId,p_request_id:body.requestId,p_request_hash:requestHash,p_response:response,
 }));
 const gameplay=object(result?.gameplay),names=object(result?.nameSelection);
 if(!result||!gameplay||!names||names.accountId!==accountId||
  (gameplay.accountId!==undefined&&gameplay.accountId!==accountId)||typeof result.replayed!=='boolean'||
  !Number.isSafeInteger(gameplay.version)||!object(gameplay.state))throw new FullSetCommandError('full_set_readback_invalid',503);
 // Normalize the existing load response's missing accountId on replay. The
 // authenticated session and service-owned name projection already match.
 return {replayed:result.replayed,gameplay:{...gameplay,accountId},nameSelection:names};
}
